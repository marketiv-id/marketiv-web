import "server-only";

import { createSign } from "node:crypto";

/**
 * Penyedia LLM untuk fitur AI (brief campaign, analisis caption fraud).
 *
 * Urutan sama dengan Function `ai-brief` lama, ditambah Gemini API key yang
 * dipakai `ai-fraud-precheck`:
 *   1. Vertex AI (service account: VERTEX_AI_PROJECT_ID, VERTEX_AI_CLIENT_EMAIL,
 *      VERTEX_AI_PRIVATE_KEY; opsional VERTEX_AI_LOCATION, VERTEX_AI_MODEL)
 *   2. Gemini API (GEMINI_API_KEY; opsional GEMINI_MODEL)
 *   3. OpenRouter (OPENROUTER_API_KEY; opsional OPENROUTER_MODEL)
 * Penyedia tanpa kredensial dilewati. Tidak ada satu pun → `AiNotConfiguredError`.
 *
 * Dipanggil lewat REST (`fetch`, bisa disuntik untuk test) — tanpa SDK, supaya
 * bundle Route Handler tetap kecil.
 */

export type AiEnv = Record<string, string | undefined>;
export type FetchLike = (input: string, init?: RequestInit) => Promise<Response>;

export interface AiDeps {
  env?: AiEnv;
  fetch?: FetchLike;
  /** Dipakai untuk log; tidak pernah berisi prompt/kunci. */
  log?: (message: string) => void;
}

export class AiNotConfiguredError extends Error {
  constructor() {
    super("Fitur AI belum dikonfigurasi.");
    this.name = "AiNotConfiguredError";
  }
}

export class AiProviderError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AiProviderError";
  }
}

export interface GenerateOptions {
  /** Minta respons JSON (responseMimeType / response_format). */
  json?: boolean;
  temperature?: number;
  maxOutputTokens?: number;
}

const base64url = (input: Buffer | string): string =>
  Buffer.from(input).toString("base64").replace(/=+$/, "").replace(/\+/g, "-").replace(/\//g, "_");

/** OAuth token service account Google (JWT bearer grant, RS256). */
async function vertexAccessToken(env: AiEnv, doFetch: FetchLike): Promise<string> {
  const clientEmail = env.VERTEX_AI_CLIENT_EMAIL!;
  const privateKey = env.VERTEX_AI_PRIVATE_KEY!.replace(/\\n/g, "\n");
  const now = Math.floor(Date.now() / 1000);
  const header = base64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const claims = base64url(
    JSON.stringify({
      iss: clientEmail,
      scope: "https://www.googleapis.com/auth/cloud-platform",
      aud: "https://oauth2.googleapis.com/token",
      iat: now,
      exp: now + 3600,
    }),
  );
  const signer = createSign("RSA-SHA256");
  signer.update(`${header}.${claims}`);
  const signature = base64url(signer.sign(privateKey));
  const res = await doFetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: `${header}.${claims}.${signature}`,
    }).toString(),
  });
  if (!res.ok) throw new AiProviderError(`Vertex token ${res.status}`);
  const data = (await res.json()) as { access_token?: string };
  if (!data.access_token) throw new AiProviderError("Vertex token kosong");
  return data.access_token;
}

function geminiBody(prompt: string, options: GenerateOptions) {
  return {
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    generationConfig: {
      temperature: options.temperature ?? 0.7,
      maxOutputTokens: options.maxOutputTokens ?? 2048,
      ...(options.json ? { responseMimeType: "application/json" } : {}),
    },
  };
}

function geminiText(data: unknown): string {
  const text = (data as { candidates?: { content?: { parts?: { text?: string }[] } }[] })?.candidates?.[0]?.content
    ?.parts?.[0]?.text;
  if (!text) throw new AiProviderError("Respons AI kosong");
  return text;
}

type Provider = {
  name: string;
  configured: (env: AiEnv) => boolean;
  call: (prompt: string, options: GenerateOptions, env: AiEnv, doFetch: FetchLike) => Promise<string>;
};

const PROVIDERS: Provider[] = [
  {
    name: "vertex",
    configured: (env) => Boolean(env.VERTEX_AI_PROJECT_ID && env.VERTEX_AI_CLIENT_EMAIL && env.VERTEX_AI_PRIVATE_KEY),
    async call(prompt, options, env, doFetch) {
      const token = await vertexAccessToken(env, doFetch);
      const location = env.VERTEX_AI_LOCATION || "us-central1";
      const model = env.VERTEX_AI_MODEL || "gemini-2.5-flash";
      const url = `https://${location}-aiplatform.googleapis.com/v1/projects/${env.VERTEX_AI_PROJECT_ID}/locations/${location}/publishers/google/models/${model}:generateContent`;
      const res = await doFetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(geminiBody(prompt, options)),
      });
      if (!res.ok) throw new AiProviderError(`Vertex ${res.status}`);
      return geminiText(await res.json());
    },
  },
  {
    name: "gemini",
    configured: (env) => Boolean(env.GEMINI_API_KEY),
    async call(prompt, options, env, doFetch) {
      const model = env.GEMINI_MODEL || "gemini-2.5-flash";
      const res = await doFetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-goog-api-key": env.GEMINI_API_KEY! },
        body: JSON.stringify(geminiBody(prompt, options)),
      });
      if (!res.ok) throw new AiProviderError(`Gemini ${res.status}`);
      return geminiText(await res.json());
    },
  },
  {
    name: "openrouter",
    configured: (env) => Boolean(env.OPENROUTER_API_KEY),
    async call(prompt, options, env, doFetch) {
      const res = await doFetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${env.OPENROUTER_API_KEY}` },
        body: JSON.stringify({
          model: env.OPENROUTER_MODEL || "qwen/qwen3.5-35b-a3b",
          messages: [{ role: "user", content: prompt }],
          temperature: options.temperature ?? 0.7,
          max_tokens: options.maxOutputTokens ?? 2048,
          ...(options.json ? { response_format: { type: "json_object" } } : {}),
          reasoning: { effort: "none" },
        }),
      });
      if (!res.ok) throw new AiProviderError(`OpenRouter ${res.status}`);
      const data = (await res.json()) as { choices?: { message?: { content?: string } }[] };
      const text = data.choices?.[0]?.message?.content;
      if (!text) throw new AiProviderError("Respons AI kosong");
      return text;
    },
  },
];

export function isAiConfigured(env: AiEnv = process.env): boolean {
  return PROVIDERS.some((p) => p.configured(env));
}

/** Teks dari penyedia pertama yang berhasil. @throws AiNotConfiguredError | AiProviderError */
export async function generateText(prompt: string, options: GenerateOptions = {}, deps: AiDeps = {}): Promise<string> {
  const env = deps.env ?? process.env;
  const doFetch = deps.fetch ?? ((input, init) => fetch(input, init));
  const available = PROVIDERS.filter((p) => p.configured(env));
  if (available.length === 0) throw new AiNotConfiguredError();
  const failures: string[] = [];
  for (const provider of available) {
    try {
      return await provider.call(prompt, options, env, doFetch);
    } catch (err) {
      failures.push(`${provider.name}: ${err instanceof Error ? err.message : String(err)}`);
      deps.log?.(`[ai] ${provider.name} gagal, mencoba penyedia berikutnya`);
    }
  }
  throw new AiProviderError(`Semua penyedia AI gagal (${failures.join("; ")})`);
}

/** Bersihkan blok <think> dan pagar markdown (port `cleanResponse` ai-brief). */
export function cleanAiText(content: string): string {
  let cleaned = content.replace(/<think[\s\S]*?<\/think>/gi, "").replace(/<\/?think>/gi, "");
  const thinkingPrefix = /^[\s\S]*?(?:Thinking Process|Reasoning|Analysis|Internal Thought)[\s\S]*?\n\n/i;
  if (thinkingPrefix.test(cleaned)) cleaned = cleaned.replace(thinkingPrefix, "");
  return cleaned.replace(/```json\s*/gi, "").replace(/```\s*/g, "").trim();
}
