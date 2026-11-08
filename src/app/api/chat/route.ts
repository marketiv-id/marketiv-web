import { NextRequest, NextResponse } from "next/server";
import { VertexAI } from "@google-cloud/vertexai";
import type { ChatMessage, ChatRequest } from "@/types/chat";
import { DATA_SOURCE_CONFIG } from "@/config/data-source.config";
import { authenticateChatRole } from "@/services/chatbot/chatbot-auth";
import {
  buildSystemPrompt,
  CHATBOT_GENERATION_CONFIG,
  getChatbotSuggestions,
  isTruncatedFinishReason,
  joinContinuation,
  resolveChatAudience,
  validateChatMessages,
} from "@/services/chatbot/chatbot-guardrails";
import type { UserRole } from "@/types/domain";

const CONTINUATION_PROMPT =
  "Lanjutkan tepat dari bagian terakhir tanpa mengulang isi sebelumnya. Selesaikan jawaban dan jangan berhenti di tengah kalimat.";

function cleanResponse(content: string): string {
  // Step 1: Remove <think>...</think> blocks
  let cleaned = content.replace(/<think[\s\S]*?<\/think>/gi, "");
  cleaned = cleaned.replace(/<\/?think>/gi, "");

  // Step 2: Remove thinking/reasoning sections before the actual answer
  // Match everything from start up to a double newline followed by a non-analysis line
  const thinkingPrefixPattern = /^[\s\S]*?(?:Thinking Process|Reasoning|Analysis|Internal Thought)[\s\S]*?\n\n/i;
  if (thinkingPrefixPattern.test(cleaned)) {
    cleaned = cleaned.replace(thinkingPrefixPattern, "");
  }

  // Step 3: Strip markdown formatting from response
  // Bold: **text** or __text__ → text
  cleaned = cleaned.replace(/\*\*(.+?)\*\*/g, "$1");
  cleaned = cleaned.replace(/__(.+?)__/g, "$1");
  // Italic: *text* or _text_ → text
  cleaned = cleaned.replace(/(?<!\w)\*(.+?)\*(?!\w)/g, "$1");
  cleaned = cleaned.replace(/(?<!\w)_(.+?)_(?!\w)/g, "$1");
  // Headers: ### text → text
  cleaned = cleaned.replace(/^#{1,6}\s+/gm, "");
  // Backtick code: `text` → text
  cleaned = cleaned.replace(/`([^`]+)`/g, "$1");
  // Code blocks: ```...``` → content
  cleaned = cleaned.replace(/```[\s\S]*?```/g, "");

  // Step 4: Clean up excessive whitespace
  cleaned = cleaned.replace(/\n{3,}/g, "\n\n");

  cleaned = cleaned.trim();

  // Safety fallback: if stripping removed everything, return original
  if (!cleaned) {
    return content.trim();
  }

  return cleaned;
}

// --- PRIMARY PROVIDER: Google Vertex AI ---
async function callVertexAI(systemPrompt: string, messages: ChatMessage[]): Promise<string> {
  const projectId = process.env.VERTEX_AI_PROJECT_ID;
  const clientEmail = process.env.VERTEX_AI_CLIENT_EMAIL;
  const privateKeyRaw = process.env.VERTEX_AI_PRIVATE_KEY;
  const location = process.env.VERTEX_AI_LOCATION || "us-central1";
  const model = process.env.VERTEX_AI_MODEL || "gemini-1.5-flash";

  if (!projectId || !clientEmail || !privateKeyRaw) {
    throw new Error("Vertex AI credentials are not fully configured in environment variables.");
  }

  // Handle escaped newlines that can occur when reading from .env files
  const privateKey = privateKeyRaw.replace(/\\n/g, "\n");

  const vertexAI = new VertexAI({
    project: projectId,
    location,
    googleAuthOptions: {
      credentials: {
        client_email: clientEmail,
        private_key: privateKey,
      },
    },
  });

  const generativeModel = vertexAI.getGenerativeModel({
    model,
    generationConfig: {
      ...CHATBOT_GENERATION_CONFIG,
    },
    systemInstruction: {
      role: "system",
      parts: [{ text: systemPrompt }],
    },
  });

  // Build chat history (all messages except the last user message)
  const history = messages.slice(0, -1).map((msg) => ({
    role: msg.role === "assistant" ? "model" : "user",
    parts: [{ text: msg.content }],
  }));

  // The last message is the current user input
  const lastMessage = messages[messages.length - 1];

  const chat = generativeModel.startChat({ history });
  const result = await chat.sendMessage(lastMessage.content);
  const response = result.response;
  const candidate = response.candidates?.[0];
  let text = candidate?.content?.parts?.[0]?.text;

  if (!text) {
    throw new Error("Vertex AI returned an empty response.");
  }

  if (isTruncatedFinishReason(candidate?.finishReason)) {
    console.warn("[Chat API] Vertex AI answer reached token limit; requesting one continuation.");
    const continuationResult = await chat.sendMessage(CONTINUATION_PROMPT);
    const continuation = continuationResult.response.candidates?.[0]?.content?.parts?.[0]?.text;
    if (continuation) {
      text = joinContinuation(text, continuation);
    }
  }

  return text;
}

// --- BACKUP PROVIDER: OpenRouter ---
async function callOpenRouter(systemPrompt: string, messages: ChatMessage[]): Promise<string> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  const baseUrl = "https://openrouter.ai/api/v1";
  const model = process.env.OPENROUTER_MODEL || "qwen/qwen3-30b-a3b:free";

  if (!apiKey) {
    throw new Error("OPENROUTER_API_KEY is not configured.");
  }

  type OpenRouterMessage = {
    role: "system" | ChatMessage["role"];
    content: string;
  };
  const apiMessages: OpenRouterMessage[] = [
    { role: "system", content: systemPrompt },
    ...messages,
  ];

  async function requestCompletion(requestMessages: OpenRouterMessage[]) {
    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
        "HTTP-Referer": "https://marketiv.id",
        "X-Title": "Marketiv Chatbot",
      },
      body: JSON.stringify({
        model,
        messages: requestMessages,
        temperature: CHATBOT_GENERATION_CONFIG.temperature,
        max_tokens: CHATBOT_GENERATION_CONFIG.maxOutputTokens,
        reasoning: { effort: "none" },
      }),
    });

    if (!response.ok) {
      const errorData = await response.text();
      throw new Error(`OpenRouter API error (${response.status}): ${errorData}`);
    }

    return response.json();
  }

  const data = await requestCompletion(apiMessages);
  let text = data.choices?.[0]?.message?.content;

  if (!text) {
    throw new Error("OpenRouter returned an empty response.");
  }

  if (isTruncatedFinishReason(data.choices?.[0]?.finish_reason)) {
    console.warn("[Chat API] OpenRouter answer reached token limit; requesting one continuation.");
    const continuationData = await requestCompletion([
      ...apiMessages,
      { role: "assistant", content: text },
      { role: "user", content: CONTINUATION_PROMPT },
    ]);
    const continuation = continuationData.choices?.[0]?.message?.content;
    if (continuation) {
      text = joinContinuation(text, continuation);
    }
  }

  return text;
}

// --- MAIN HANDLER ---
export async function POST(request: NextRequest) {
  try {
    const body: ChatRequest = await request.json();
    const currentPath = typeof body.currentPath === "string" ? body.currentPath : "/";
    const validation = validateChatMessages(body.messages);
    if (!validation.ok) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    let authenticatedRole: UserRole | null = null;
    if (DATA_SOURCE_CONFIG.useMockData && currentPath.startsWith("/dashboard/")) {
      authenticatedRole = currentPath.startsWith("/dashboard/kreator") ? "creator" : "umkm";
    } else {
      // Sesi dibaca dari cookie Supabase (bukan header dari browser).
      try {
        authenticatedRole = await authenticateChatRole();
      } catch (authError) {
        console.warn("[Chat API] Supabase session validation failed:", authError);
        return NextResponse.json({ error: "Sesi Tivvy tidak valid." }, { status: 401 });
      }
    }

    const audienceResult = resolveChatAudience(currentPath, authenticatedRole);
    if (!audienceResult.ok) {
      return NextResponse.json(
        { error: audienceResult.error },
        { status: audienceResult.status },
      );
    }

    const messages = validation.messages;
    const systemPrompt = buildSystemPrompt(audienceResult.audience, currentPath);

    let rawContent: string;

    // Step 1: Try Primary Provider (Vertex AI)
    try {
      rawContent = await callVertexAI(systemPrompt, messages);
      console.log("[Chat API] Responding via Vertex AI (Primary)");
    } catch (vertexError) {
      // Step 2: Vertex AI failed — fallback to OpenRouter
      console.warn("[Chat API] Vertex AI failed, falling back to OpenRouter:", vertexError);
      rawContent = await callOpenRouter(systemPrompt, messages);
      console.log("[Chat API] Responding via OpenRouter (Fallback)");
    }

    // Strip any remaining thinking/reasoning content as safety net
    const assistantMessage = cleanResponse(rawContent);
    const suggestions = getChatbotSuggestions(
      audienceResult.audience,
      currentPath,
      messages,
      3,
    );

    return NextResponse.json({ message: assistantMessage, suggestions });
  } catch (error) {
    console.error("[Chat API] All providers failed:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
