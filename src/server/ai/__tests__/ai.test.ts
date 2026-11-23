import { generateKeyPairSync } from "node:crypto";

import { beforeEach, describe, expect, it, vi } from "vitest";

import { buildBriefPrompt, generateCampaignBrief, parseBrief } from "@/server/ai/brief";
import { AiNotConfiguredError, cleanAiText, generateText, isAiConfigured } from "@/server/ai/providers";
import { HttpError } from "@/server/http";
import { createFakeSupabase, type FakeSupabase } from "@/test/fake-supabase";

const UMKM = "a1111111-1111-4111-8111-111111111111";
const briefJson = { objective: "O", contentAngle: "A", cta: "C", briefDetail: "D", doAndDont: { do: ["x"], dont: ["y"] } };
const geminiResponse = (text: string) => Response.json({ candidates: [{ content: { parts: [{ text }] } }] });

describe("providers", () => {
  it("tanpa kredensial → AiNotConfiguredError, tanpa request", async () => {
    const f = vi.fn();
    expect(isAiConfigured({})).toBe(false);
    await expect(generateText("p", {}, { env: {}, fetch: f })).rejects.toBeInstanceOf(AiNotConfiguredError);
    expect(f).not.toHaveBeenCalled();
  });

  it("Gemini gagal → fallback OpenRouter", async () => {
    const f = vi.fn(async (url: string) =>
      url.includes("openrouter")
        ? Response.json({ choices: [{ message: { content: "hasil" } }] })
        : new Response("x", { status: 500 }),
    );
    await expect(generateText("p", { json: true }, { env: { GEMINI_API_KEY: "g", OPENROUTER_API_KEY: "o" }, fetch: f })).resolves.toBe("hasil");
    expect(f).toHaveBeenCalledTimes(2);
    const orBody = JSON.parse(String((f.mock.calls[1] as unknown as [string, RequestInit])[1].body));
    expect(orBody.response_format).toEqual({ type: "json_object" });
  });

  it("Vertex: tukar JWT service account lalu generateContent", async () => {
    const { privateKey } = generateKeyPairSync("rsa", { modulusLength: 2048 });
    const pem = privateKey.export({ type: "pkcs8", format: "pem" }).toString().replace(/\n/g, "\\n");
    const f = vi.fn(async (url: string) =>
      url.startsWith("https://oauth2") ? Response.json({ access_token: "tok" }) : geminiResponse("vertex-ok"),
    );
    const env = { VERTEX_AI_PROJECT_ID: "p1", VERTEX_AI_CLIENT_EMAIL: "sa@x.iam", VERTEX_AI_PRIVATE_KEY: pem };
    await expect(generateText("p", {}, { env, fetch: f })).resolves.toBe("vertex-ok");
    expect(String(f.mock.calls[1][0])).toContain("us-central1-aiplatform.googleapis.com/v1/projects/p1/");
    expect((f.mock.calls[1] as unknown as [string, RequestInit])[1].headers).toMatchObject({ Authorization: "Bearer tok" });
  });

  it("semua gagal → AiProviderError", async () => {
    await expect(
      generateText("p", {}, { env: { GEMINI_API_KEY: "g" }, fetch: vi.fn(async () => new Response("", { status: 429 })) }),
    ).rejects.toThrow(/Semua penyedia AI gagal/);
  });

  it("cleanAiText membuang think & pagar markdown", () => {
    expect(cleanAiText("<think>hmm</think>```json\n{\"a\":1}\n```")).toBe('{"a":1}');
  });
});

describe("brief", () => {
  let db: FakeSupabase;
  beforeEach(() => {
    db = createFakeSupabase({
      campaigns: [
        { id: "c1", umkm_id: UMKM },
        { id: "c2", umkm_id: "b2222222-2222-4222-8222-222222222222" },
      ],
      campaign_briefs: [],
      ai_requests: [],
    });
  });
  const ctx = () => ({ db: db as never, userId: UMKM });

  it("prompt memuat default lama", () => {
    const p = buildBriefPrompt({ description: "Bakso", type: "clipping" });
    expect(p).toContain("Product Name: Not specified");
    expect(p).toContain("CLIPPING campaign");
    expect(p).toContain("No specific materials provided.");
  });

  it("parseBrief: JSON → DTO; teks bukan JSON → briefDetail", () => {
    expect(parseBrief(JSON.stringify(briefJson))).toEqual(briefJson);
    expect(parseBrief("teks bebas")).toEqual({ objective: "", contentAngle: "", cta: "", briefDetail: "teks bebas", doAndDont: { do: [], dont: [] } });
  });

  it("tanpa kredensial → 503", async () => {
    const err = await generateCampaignBrief(ctx(), { description: "x", type: "ugc" }, { env: {} }).catch((e: unknown) => e);
    expect(err).toBeInstanceOf(HttpError);
    expect(err).toMatchObject({ status: 503, message: "Fitur AI belum dikonfigurasi." });
  });

  it("campaign milik UMKM lain → 404 sebelum memanggil AI (celah #4)", async () => {
    const f = vi.fn();
    await expect(
      generateCampaignBrief(ctx(), { description: "x", type: "ugc", campaignId: "c2" }, { env: { GEMINI_API_KEY: "k" }, fetch: f }),
    ).rejects.toMatchObject({ status: 404 });
    expect(f).not.toHaveBeenCalled();
  });

  it("sukses: audit ai_requests dari sesi + brief disimpan sekali", async () => {
    const f = vi.fn(async () => geminiResponse(JSON.stringify(briefJson)));
    const deps = { env: { GEMINI_API_KEY: "k" }, fetch: f };
    await expect(generateCampaignBrief(ctx(), { description: "x", type: "ugc", campaignId: "c1" }, deps)).resolves.toEqual({
      success: true,
      brief: briefJson,
    });
    expect(db.tables.ai_requests[0]).toMatchObject({ user_id: UMKM, feature: "brief" });
    expect(db.tables.campaign_briefs[0]).toMatchObject({ campaign_id: "c1", objective: "O", generated_by_ai: true });
    // brief yang sudah ada tidak ditimpa
    f.mockImplementationOnce(async () => geminiResponse(JSON.stringify({ ...briefJson, objective: "BARU" })));
    await generateCampaignBrief(ctx(), { description: "x", type: "ugc", campaignId: "c1" }, deps);
    expect(db.tables.campaign_briefs).toHaveLength(1);
    expect(db.tables.campaign_briefs[0].objective).toBe("O");
  });

  it("penyedia gagal → 502", async () => {
    await expect(
      generateCampaignBrief(ctx(), { description: "x", type: "ugc" }, { env: { GEMINI_API_KEY: "k" }, fetch: vi.fn(async () => new Response("", { status: 500 })) }),
    ).rejects.toMatchObject({ status: 502 });
  });
});
