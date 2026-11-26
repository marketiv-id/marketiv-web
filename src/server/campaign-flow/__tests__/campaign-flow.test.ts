import { beforeEach, describe, expect, it, vi } from "vitest";

import { claimCampaign, unclaimCampaign } from "@/server/campaign-flow/claims";
import { mapFraudStatus, runFraudPrecheck } from "@/server/campaign-flow/fraud";
import { observationHours, reviewSubmission, reviewSubmissionSchema } from "@/server/campaign-flow/review";
import { isValidProofUrl, submitCampaignProof, submitProofSchema } from "@/server/campaign-flow/submissions";
import { HttpError } from "@/server/http";
import { createFakeSupabase, type FakeSupabase } from "@/test/fake-supabase";

const CREATOR = "c1111111-1111-4111-8111-111111111111";

let db: FakeSupabase;
beforeEach(() => {
  db = createFakeSupabase();
  vi.restoreAllMocks();
});

const ctx = () => ({ db: db as never, userId: CREATOR });
const rpcError = (code: string, message: string, hint?: string) =>
  Object.assign(new Error(message), { code, hint });

describe("klaim", () => {
  it("claimCampaign meneruskan userId sesi sebagai p_creator_id", async () => {
    db.setRpc("claim_campaign", (args) => ({ claimId: "k1", campaignId: args.p_campaign_id, status: "claimed" }));
    await expect(claimCampaign(ctx(), "c1")).resolves.toMatchObject({ claimId: "k1", campaignId: "c1" });
    expect(db.rpc).toHaveBeenCalledWith("claim_campaign", { p_campaign_id: "c1", p_creator_id: CREATOR });
  });

  it.each([
    ["P0001", "Kuota kreator untuk campaign ini sudah penuh.", 409],
    ["P0002", "Campaign tidak ditemukan.", 404],
    ["42501", "Claim bukan milik Anda.", 403],
    ["22023", "Campaign tidak valid.", 400],
  ])("error RPC %s → HTTP %i dengan pesan RPC", async (code, message, status) => {
    db.setRpc("claim_campaign", () => {
      throw rpcError(code, message);
    });
    const err = await claimCampaign(ctx(), "c1").catch((e: unknown) => e);
    expect(err).toBeInstanceOf(HttpError);
    expect(err).toMatchObject({ status, message });
  });

  it("unique violation (race klaim ganda) → 409", async () => {
    db.setRpc("claim_campaign", () => {
      throw rpcError("23505", "duplicate key");
    });
    await expect(claimCampaign(ctx(), "c1")).rejects.toMatchObject({ status: 409 });
  });

  it("unclaim meneruskan campaign path + claimId + userId sesi", async () => {
    db.setRpc("unclaim_campaign", (args) => ({ success: true, claimId: args.p_claim_id }));
    await unclaimCampaign(ctx(), "c1", "k1");
    expect(db.rpc).toHaveBeenCalledWith("unclaim_campaign", { p_claim_id: "k1", p_creator_id: CREATOR, p_campaign_id: "c1" });
  });
});

describe("kirim bukti", () => {
  it.each([
    ["https://www.tiktok.com/@a/video/1", "tiktok", true],
    ["https://vt.tiktok.com/x", "tiktok", true],
    ["https://instagram.com/p/x", "instagram", true],
    ["https://eviltiktok.com/x", "tiktok", false],
    ["https://www.tiktok.com/@a", "instagram", false],
    ["ftp://tiktok.com/x", "tiktok", false],
    ["bukan url", "tiktok", false],
  ])("isValidProofUrl(%s, %s) = %s", (url, platform, expected) => {
    expect(isValidProofUrl(url, platform)).toBe(expected);
  });

  it("skema: platform di-lowercase, URL harus cocok platform", () => {
    expect(submitProofSchema.safeParse({ claimId: "k", platform: "TikTok", postUrl: "https://tiktok.com/v/1" }).success).toBe(true);
    const bad = submitProofSchema.safeParse({ claimId: "k", platform: "instagram", postUrl: "https://tiktok.com/v/1" });
    expect(bad.success).toBe(false);
    expect(submitProofSchema.safeParse({ claimId: "k", platform: "youtube", postUrl: "https://youtube.com/x" }).success).toBe(false);
  });

  it("RPC menerima caption di-trim & dipotong 1000", async () => {
    db.setRpc("submit_campaign_proof", () => ({ success: true, submissionId: "s1" }));
    await submitCampaignProof(ctx(), "c1", {
      claimId: "k1",
      platform: "tiktok",
      postUrl: "https://tiktok.com/v/1",
      caption: `  ${"x".repeat(1200)}`,
    });
    const args = db.rpc.mock.calls[0][1] as Record<string, unknown>;
    expect(args).toMatchObject({ p_creator_id: CREATOR, p_campaign_id: "c1", p_claim_id: "k1", p_platform: "tiktok" });
    expect(String(args.p_caption)).toHaveLength(1000);
  });
});

describe("review", () => {
  it("skema: approve wajib views; status asing ditolak", () => {
    expect(reviewSubmissionSchema.safeParse({ status: "approved" }).success).toBe(false);
    expect(reviewSubmissionSchema.safeParse({ status: "approved", views: 10 }).success).toBe(true);
    expect(reviewSubmissionSchema.safeParse({ status: "rejected" }).success).toBe(true);
    expect(reviewSubmissionSchema.safeParse({ status: "pending" }).success).toBe(false);
    expect(reviewSubmissionSchema.safeParse({ status: "approved", views: -1 }).success).toBe(false);
  });

  it("isAdmin dari konteks (bukan body) → p_as_admin; reject tidak mengirim views", async () => {
    db.setRpc("review_submission", () => ({ success: true, campaignId: "c1", status: "rejected" }));
    await reviewSubmission({ ...ctx(), isAdmin: false }, "s1", { status: "rejected", views: 5, notes: " jelek " });
    expect(db.rpc).toHaveBeenCalledWith("review_submission", {
      p_reviewer_id: CREATOR,
      p_submission_id: "s1",
      p_decision: "rejected",
      p_note: "jelek",
      p_as_admin: false,
      p_views: null,
      p_observation_hours: 72,
    });
  });

  it("review approve meneruskan reward yang dikredit RPC (Fase 8)", async () => {
    db.setRpc("review_submission", () => ({ success: true, campaignId: "c1", status: "approved", reward: 6000 }));
    expect(await reviewSubmission({ ...ctx(), isAdmin: true }, "s1", { status: "approved", views: 2000 })).toMatchObject({
      status: "approved",
      reward: 6000,
    });
  });

  it("observationHours dari env, fallback 72", () => {
    expect(observationHours({})).toBe(72);
    expect(observationHours({ VIEW_VALIDATION_DELAY_HOURS: "0" })).toBe(0);
    expect(observationHours({ VIEW_VALIDATION_DELAY_HOURS: "abc" })).toBe(72);
    expect(observationHours({ VIEW_VALIDATION_DELAY_HOURS: "-1" })).toBe(72);
  });
});

describe("fraud precheck", () => {
  const submission = {
    id: "s1",
    campaign_id: "c1",
    creator_id: CREATOR,
    platform: "tiktok",
    post_url: "https://www.tiktok.com/@a/video/1",
    caption: "Enak banget #bakso",
  };

  function seed(extra: Record<string, unknown>[] = []) {
    db = createFakeSupabase({
      campaign_submissions: [submission, ...extra],
      campaign_briefs: [{ campaign_id: "c1", objective: "Awareness", do_and_dont: { do: [], dont: [] } }],
      ai_requests: [],
    });
    db.setRpc("record_fraud_check", () => null);
  }
  const okFetch = vi.fn(async () => new Response("ok", { status: 200 }));

  it.each([
    [0, "safe"],
    [30, "safe"],
    [31, "review"],
    [70, "review"],
    [71, "rejected"],
  ] as const)("mapFraudStatus(%i) = %s", (score, status) => {
    expect(mapFraudStatus(score)).toBe(status);
  });

  it("tanpa kredensial AI: analisis caption dilewati, skor dari cek lain (safe)", async () => {
    seed();
    const aiFetch = vi.fn();
    await expect(runFraudPrecheck("s1", { db: db as never, env: {}, urlFetch: okFetch, fetch: aiFetch })).resolves.toEqual({
      score: 0,
      status: "safe",
    });
    expect(aiFetch).not.toHaveBeenCalled();
    expect(db.rpc).toHaveBeenCalledWith("record_fraud_check", {
      p_submission_id: "s1",
      p_score: 0,
      p_result: "safe",
      p_reason: "Content analysis dilewati (AI tidak dikonfigurasi)",
    });
  });

  it("URL tidak bisa diakses + duplikat → 50 review", async () => {
    seed([{ ...submission, id: "s0" }]);
    const result = await runFraudPrecheck("s1", {
      db: db as never,
      env: {},
      urlFetch: vi.fn(async () => new Response("", { status: 404 })),
    });
    expect(result).toEqual({ score: 50, status: "review" });
    const reason = (db.rpc.mock.calls[0][1] as { p_reason: string }).p_reason;
    expect(reason).toContain("URL tidak dapat diakses (status 404)");
    expect(reason).toContain("URL duplikat dengan submission lain");
  });

  it("dengan Gemini: skor konten 0–20 + audit ai_requests", async () => {
    seed();
    const aiFetch = vi.fn(async () =>
      Response.json({
        candidates: [{ content: { parts: [{ text: '```json\n{"overallScore":75,"fraudSignal":"bot","reason":"tidak relevan"}\n```' }] } }],
      }),
    );
    const result = await runFraudPrecheck("s1", { db: db as never, env: { GEMINI_API_KEY: "k" }, urlFetch: okFetch, fetch: aiFetch });
    expect(result).toEqual({ score: 15, status: "safe" });
    expect(String(aiFetch.mock.calls[0][0])).toContain("generativelanguage.googleapis.com");
    expect(db.tables.ai_requests).toHaveLength(1);
    expect(db.tables.ai_requests[0]).toMatchObject({ user_id: CREATOR, feature: "fraud" });
    expect((db.rpc.mock.calls[0][1] as { p_reason: string }).p_reason).toContain("Indikasi fraud: bot");
  });

  it("AI gagal tidak menggagalkan precheck", async () => {
    seed();
    const result = await runFraudPrecheck("s1", {
      db: db as never,
      env: { GEMINI_API_KEY: "k" },
      urlFetch: okFetch,
      fetch: vi.fn(async () => new Response("err", { status: 500 })),
    });
    expect(result).toEqual({ score: 0, status: "safe" });
    expect((db.rpc.mock.calls[0][1] as { p_reason: string }).p_reason).toContain("Content analysis gagal");
  });

  it("submission tidak ada / RPC gagal → null, tidak melempar", async () => {
    seed();
    vi.spyOn(console, "error").mockImplementation(() => {});
    await expect(runFraudPrecheck("nope", { db: db as never, env: {}, urlFetch: okFetch })).resolves.toBeNull();
    db.setRpc("record_fraud_check", () => {
      throw rpcError("P0002", "Submission tidak ditemukan.");
    });
    await expect(runFraudPrecheck("s1", { db: db as never, env: {}, urlFetch: okFetch })).resolves.toBeNull();
  });
});
