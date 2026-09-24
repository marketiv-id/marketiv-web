import { VertexAI } from "@google-cloud/vertexai";
import { Client, Databases } from "node-appwrite";

function cleanResponse(content) {
  let cleaned = content.replace(/<think[\s\S]*?<\/think>/gi, "");
  cleaned = cleaned.replace(/<\/?think>/gi, "");
  const thinkingPrefixPattern = /^[\s\S]*?(?:Thinking Process|Reasoning|Analysis|Internal Thought)[\s\S]*?\n\n/i;
  if (thinkingPrefixPattern.test(cleaned)) {
    cleaned = cleaned.replace(thinkingPrefixPattern, "");
  }
  // Strip markdown formatting from JSON response
  cleaned = cleaned.replace(/```json\s*/gi, "");
  cleaned = cleaned.replace(/```\s*/g, "");
  return cleaned.trim();
}

async function callVertexAI(prompt, env) {
  const projectId = env.VERTEX_AI_PROJECT_ID;
  const clientEmail = env.VERTEX_AI_CLIENT_EMAIL;
  const privateKeyRaw = env.VERTEX_AI_PRIVATE_KEY;
  const location = env.VERTEX_AI_LOCATION || "us-central1";
  const model = env.VERTEX_AI_MODEL || "gemini-2.5-flash";

  if (!projectId || !clientEmail || !privateKeyRaw) {
    throw new Error("Vertex AI credentials missing");
  }

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
      temperature: 0.7,
      maxOutputTokens: 2048,
      responseMimeType: "application/json",
    },
  });

  const chat = generativeModel.startChat({ history: [] });
  const result = await chat.sendMessage(prompt);
  const response = result.response;
  const text = response.candidates?.[0]?.content?.parts?.[0]?.text;

  if (!text) {
    throw new Error("Empty Vertex AI response");
  }
  return text;
}

async function callOpenRouter(prompt, env) {
  const apiKey = env.OPENROUTER_API_KEY;
  const baseUrl = "https://openrouter.ai/api/v1";
  const model = env.OPENROUTER_MODEL || "qwen/qwen3.5-35b-a3b";

  if (!apiKey) {
    throw new Error("OPENROUTER_API_KEY missing");
  }

  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: [{ role: "user", content: prompt }],
      temperature: 0.7,
      max_tokens: 2048,
      response_format: { type: "json_object" },
      reasoning: { effort: "none" }
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`OpenRouter API error: ${errText}`);
  }
  const data = await response.json();
  const text = data.choices?.[0]?.message?.content;
  if (!text) {
    throw new Error("Empty OpenRouter response");
  }
  return text;
}

export default async ({ req, res, log, error }) => {
  if (req.method !== "POST") {
    return res.json({ success: false, error: "Method not allowed" }, 405);
  }

  const env = { ...process.env, ...(req.variables || {}) };
  const databaseId =
    env.NEXT_PUBLIC_DB_ID ||
    env.APPWRITE_DATABASE_ID;

  try {
    const {
      campaignId,
      description,
      type,
      materials = [],
      productName,
      targetMarket,
      goal
    } = req.body;

    if (!description || !type) {
      return res.json({ success: false, error: "Missing required fields: description, type" }, 400);
    }

    if (!["ugc", "clipping"].includes(type)) {
      return res.json({ success: false, error: "Invalid type. Must be 'ugc' or 'clipping'" }, 400);
    }

    const materialsText = materials.length
      ? materials.map((m, i) => `${i + 1}. ${m}`).join("\n")
      : "No specific materials provided.";

    const typeInstructions = type === "ugc"
      ? `This is a UGC (User Generated Content) campaign. Direct the creator to create an original TikTok video from scratch using the provided product assets (photos/videos). Suggest approaches: Green Screen effect, Voiceover, or Slideshow Montage.`
      : `This is a CLIPPING campaign. Direct the creator to cut/re-edit an existing long video from the provided source link. Include dynamic subtitles and a strong hook in the first 3 seconds.`;

    const prompt = `Generate a structured campaign brief for a TikTok content campaign.
IMPORTANT: ALL output values in the JSON MUST be in Indonesian language (Bahasa Indonesia).

Product Name: ${productName || "Not specified"}
Description: ${description}
Target Market: ${targetMarket || "General"}
Campaign Goal: ${goal || "Brand awareness"}
Campaign Type: ${type}

${typeInstructions}

Assets/Materials provided:
${materialsText}

Return a JSON object with this exact structure (no markdown, no code fences, raw JSON only):
{
  "objective": "string - campaign objective",
  "contentAngle": "string - content angle/approach",
  "cta": "string - call to action",
  "briefDetail": "string - detailed creative direction, visuals, key messages, asset usage instructions",
  "doAndDont": {
    "do": ["array of do's"],
    "dont": ["array of don'ts"]
  }
}`;

    let rawContent;
    try {
      rawContent = await callVertexAI(prompt, env);
      log("Responding via Vertex AI (Primary)");
    } catch (vertexError) {
      log(`Vertex AI failed: ${vertexError.message}. Falling back to OpenRouter...`);
      try {
        rawContent = await callOpenRouter(prompt, env);
        log("Responding via OpenRouter (Fallback)");
      } catch (orError) {
        throw new Error(`All providers failed. OpenRouter err: ${orError.message}`);
      }
    }

    let brief;
    try {
      const cleaned = cleanResponse(rawContent);
      brief = JSON.parse(cleaned);
    } catch (parseError) {
      log("Failed to parse AI response as JSON, returning raw text as briefDetail");
      brief = {
        objective: "",
        contentAngle: "",
        cta: "",
        briefDetail: cleanResponse(rawContent),
        doAndDont: { do: [], dont: [] }
      };
    }

    try {
      const appwriteApiKey =
        req.headers?.["x-appwrite-key"] ||
        process.env.APPWRITE_API_KEY;
      const client = new Client()
        .setEndpoint(
          env.APPWRITE_FUNCTION_API_ENDPOINT ||
            env.APPWRITE_ENDPOINT ||
            env.APPWRITE_FUNCTION_ENDPOINT,
        )
        .setProject(
          env.APPWRITE_FUNCTION_PROJECT_ID || env.APPWRITE_PROJECT_ID,
        )
        .setKey(appwriteApiKey);

      const databases = new Databases(client);

      await databases.createDocument(
        databaseId,
        "ai_requests",
        "unique()",
        {
          userId: env.APPWRITE_FUNCTION_USER_ID || req.body.userId || "",
          feature: "brief",
          prompt: prompt,
          response: JSON.stringify(brief)
        }
      );

      if (campaignId) {
        const briefCollectionId = env.CAMPAIGN_BRIEFS_COLLECTION_ID || "6ab530d00018edb50097";
        try {
          const existing = await databases.listDocuments(databaseId, briefCollectionId, [
            (await import("node-appwrite")).Query.equal("campaignId", campaignId),
            (await import("node-appwrite")).Query.limit(1)
          ]);
          if (existing.documents.length === 0) {
            await databases.createDocument(
              databaseId, briefCollectionId, "unique()",
              {
                campaignId,
                objective: brief.objective || "",
                contentAngle: brief.contentAngle || "",
                cta: brief.cta || "",
                briefDetail: brief.briefDetail || "",
                doAndDont: JSON.stringify(brief.doAndDont || { do: [], dont: [] }),
                generatedByAi: true
              }
            );
            log(`Campaign brief saved for campaign ${campaignId}`);
          }
        } catch (briefErr) {
          error("Failed to save campaign brief:", briefErr.message);
        }
      }
    } catch (logError) {
      error("Failed to log to ai_requests:", logError.message);
    }

    return res.json({
      success: true,
      brief: {
        objective: brief.objective || "",
        contentAngle: brief.contentAngle || "",
        cta: brief.cta || "",
        briefDetail: brief.briefDetail || "",
        doAndDont: brief.doAndDont || { do: [], dont: [] }
      }
    });

  } catch (err) {
    error("AI Brief generation failed:", err.message);
    return res.json({ success: false, error: "Failed to generate brief" }, 500);
  }
};
