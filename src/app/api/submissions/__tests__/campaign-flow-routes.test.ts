import { beforeEach, describe, expect, it, vi } from "vitest";

import { HttpError } from "@/server/http";
import { createFakeSupabase, type FakeSupabase } from "@/test/fake-supabase";

const mocks = vi.hoisted(() => ({
  requireUser: vi.fn(),
  db: null as unknown as FakeSupabase,
  after: vi.fn(),
  precheck: vi.fn(),
}));

vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: () => mocks.db }));
vi.mock("@/server/auth/require-user", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/server/auth/require-user")>()),
  requireUser: mocks.requireUser,
}));
vi.mock("next/server", async (importOriginal) => ({
  ...(await importOriginal<typeof import("next/server")>()),
  after: mocks.after,
}));
vi.mock("@/server/campaign-flow/fraud", () => ({ runFraudPrecheck: mocks.precheck }));

import { POST as briefPost } from "@/app/api/ai/brief/route";
import { DELETE as unclaimDelete, POST as claimPost } from "@/app/api/campaigns/[campaignId]/claim/route";
import { POST as submitPost } from "@/app/api/campaigns/[campaignId]/submissions/route";
import { POST as reviewPost } from "@/app/api/submissions/[submissionId]/review/route";

const CREATOR = "c1111111-1111-4111-8111-111111111111";
const ADMIN = "d4444444-4444-4444-8444-444444444444";

const req = (method: string, body?: unknown, url = "http://localhost/api/x") =>
  new Request(url, {
    method,
    headers: { "content-type": "application/json" },
    ...(body === undefined ? {} : { body: typeof body === "string" ? body : JSON.stringify(body) }),
  });
const params = <T extends Record<string, string>>(value: T) => ({ params: Promise.resolve(value) });
const rpcError = (code: string, message: string) => Object.assign(new Error(message), { code });

function signedIn(id: string, role: string, appRole?: string) {
  mocks.requireUser.mockResolvedValue({
    user: { id, app_metadata: appRole ? { role: appRole } : {}, user_metadata: {} },
    userRow: { id, role, status: "active" },
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.db = createFakeSupabase({ campaigns: [{ id: "c1", umkm_id: "u-umkm" }], campaign_briefs: [], ai_requests: [] });
  signedIn(CREATOR, "creator");
});

describe("POST/DELETE /api/campaigns/[campaignId]/claim", () => {
  it("201 + role creator diminta", async () => {
    mocks.db.setRpc("claim_campaign", () => ({ claimId: "k1", campaignId: "c1", status: "claimed" }));
    const res = await claimPost(req("POST"), params({ campaignId: "c1" }));
    expect(res.status).toBe(201);
    await expect(res.json()).resolves.toMatchObject({ claimId: "k1" });
    expect(mocks.requireUser).toHaveBeenCalledWith(expect.objectContaining({ role: "creator" }));
  });

  it("401 tanpa sesi / 403 bukan kreator (dari guard)", async () => {
    mocks.requireUser.mockRejectedValueOnce(new HttpError(401, "Sesi tidak ditemukan. Silakan login."));
    expect((await claimPost(req("POST"), params({ campaignId: "c1" }))).status).toBe(401);
    mocks.requireUser.mockRejectedValueOnce(new HttpError(403, "Akses kreator aktif diperlukan."));
    expect((await claimPost(req("POST"), params({ campaignId: "c1" }))).status).toBe(403);
  });

  it("409 kuota penuh dengan pesan RPC", async () => {
    mocks.db.setRpc("claim_campaign", () => {
      throw rpcError("P0001", "Kuota kreator untuk campaign ini sudah penuh.");
    });
    const res = await claimPost(req("POST"), params({ campaignId: "c1" }));
    expect(res.status).toBe(409);
    await expect(res.json()).resolves.toMatchObject({ error: "Kuota kreator untuk campaign ini sudah penuh.", code: "validation" });
  });

  it("DELETE: claimId dari query; tanpa claimId → 400", async () => {
    mocks.db.setRpc("unclaim_campaign", (a) => ({ success: true, claimId: a.p_claim_id }));
    const ok = await unclaimDelete(req("DELETE", undefined, "http://localhost/api/campaigns/c1/claim?claimId=k1"), params({ campaignId: "c1" }));
    expect(ok.status).toBe(200);
    expect(mocks.db.rpc).toHaveBeenCalledWith("unclaim_campaign", { p_claim_id: "k1", p_creator_id: CREATOR, p_campaign_id: "c1" });
    const bad = await unclaimDelete(req("DELETE"), params({ campaignId: "c1" }));
    expect(bad.status).toBe(400);
  });

  it("DELETE klaim orang lain → 403", async () => {
    mocks.db.setRpc("unclaim_campaign", () => {
      throw rpcError("42501", "Claim bukan milik Anda.");
    });
    const res = await unclaimDelete(req("DELETE", undefined, "http://localhost/x?claimId=k9"), params({ campaignId: "c1" }));
    expect(res.status).toBe(403);
  });
});

describe("POST /api/campaigns/[campaignId]/submissions", () => {
  const body = { claimId: "k1", platform: "tiktok", postUrl: "https://www.tiktok.com/@a/video/1", caption: "c" };

  it("201 lalu fraud precheck dijadwalkan lewat after()", async () => {
    mocks.db.setRpc("submit_campaign_proof", () => ({ success: true, submissionId: "s1", claimId: "k1", campaignId: "c1", status: "pending" }));
    const res = await submitPost(req("POST", body), params({ campaignId: "c1" }));
    expect(res.status).toBe(201);
    await expect(res.json()).resolves.toMatchObject({ submissionId: "s1", status: "pending" });
    expect(mocks.after).toHaveBeenCalledTimes(1);
    expect(mocks.precheck).not.toHaveBeenCalled();
    await (mocks.after.mock.calls[0][0] as () => Promise<void>)();
    expect(mocks.precheck).toHaveBeenCalledWith("s1", { db: mocks.db });
  });

  it("400 URL tidak cocok platform — RPC & after tidak dipanggil", async () => {
    const res = await submitPost(req("POST", { ...body, postUrl: "https://evil.com/x" }), params({ campaignId: "c1" }));
    expect(res.status).toBe(400);
    await expect(res.json()).resolves.toMatchObject({ error: "URL bukti tayang tidak valid untuk platform yang dipilih." });
    expect(mocks.db.rpc).not.toHaveBeenCalled();
    expect(mocks.after).not.toHaveBeenCalled();
  });

  it("404 pekerjaan bukan milik kreator / 409 sudah dikirim", async () => {
    mocks.db.setRpc("submit_campaign_proof", () => {
      throw rpcError("P0002", "Pekerjaan tidak ditemukan.");
    });
    expect((await submitPost(req("POST", body), params({ campaignId: "c1" }))).status).toBe(404);
    mocks.db.setRpc("submit_campaign_proof", () => {
      throw rpcError("P0001", "Bukti untuk pekerjaan ini sudah pernah dikirim.");
    });
    expect((await submitPost(req("POST", body), params({ campaignId: "c1" }))).status).toBe(409);
    expect(mocks.after).not.toHaveBeenCalled();
  });

  it("400 body rusak", async () => {
    expect((await submitPost(req("POST", "{rusak"), params({ campaignId: "c1" }))).status).toBe(400);
  });
});

describe("POST /api/submissions/[submissionId]/review", () => {
  it("admin (app_metadata + users.role) → p_as_admin true", async () => {
    signedIn(ADMIN, "admin", "admin");
    mocks.db.setRpc("review_submission", (a) => ({ success: true, campaignId: "c1", status: a.p_decision }));
    const res = await reviewPost(req("POST", { status: "approved", views: 1500 }), params({ submissionId: "s1" }));
    expect(res.status).toBe(200);
    expect(mocks.db.rpc.mock.calls[0][1]).toMatchObject({ p_reviewer_id: ADMIN, p_as_admin: true, p_views: 1500 });
  });

  it("UMKM / admin tanpa app_metadata → p_as_admin false → 403 dari RPC", async () => {
    signedIn("u-umkm", "umkm");
    mocks.db.setRpc("review_submission", (a) => {
      if (!a.p_as_admin) throw rpcError("42501", "Akses ditolak: Hanya Admin Marketiv yang dapat memvalidasi submission.");
      return { success: true };
    });
    expect((await reviewPost(req("POST", { status: "rejected" }), params({ submissionId: "s1" }))).status).toBe(403);
    signedIn(ADMIN, "admin"); // tanpa app_metadata.role
    expect((await reviewPost(req("POST", { status: "rejected" }), params({ submissionId: "s1" }))).status).toBe(403);
  });

  it("400 approve tanpa views", async () => {
    signedIn(ADMIN, "admin", "admin");
    expect((await reviewPost(req("POST", { status: "approved" }), params({ submissionId: "s1" }))).status).toBe(400);
    expect(mocks.db.rpc).not.toHaveBeenCalled();
  });

  it("404 submission tidak ada / 409 sudah direview", async () => {
    signedIn(ADMIN, "admin", "admin");
    mocks.db.setRpc("review_submission", () => {
      throw rpcError("P0002", "Submission tidak ditemukan.");
    });
    expect((await reviewPost(req("POST", { status: "rejected" }), params({ submissionId: "s1" }))).status).toBe(404);
    mocks.db.setRpc("review_submission", () => {
      throw rpcError("P0001", "Submission ini sudah pernah direview.");
    });
    expect((await reviewPost(req("POST", { status: "rejected" }), params({ submissionId: "s1" }))).status).toBe(409);
  });
});

describe("POST /api/ai/brief", () => {
  it("role umkm diminta; tanpa kredensial AI → 503", async () => {
    vi.stubEnv("GEMINI_API_KEY", "");
    vi.stubEnv("OPENROUTER_API_KEY", "");
    vi.stubEnv("VERTEX_AI_PROJECT_ID", "");
    signedIn("u-umkm", "umkm");
    const res = await briefPost(req("POST", { description: "Bakso", type: "ugc" }));
    expect(res.status).toBe(503);
    await expect(res.json()).resolves.toMatchObject({ error: "Fitur AI belum dikonfigurasi.", code: "server" });
    expect(mocks.requireUser).toHaveBeenCalledWith({ role: "umkm" });
    vi.unstubAllEnvs();
  });

  it("400 tipe tidak valid / 403 bukan UMKM", async () => {
    signedIn("u-umkm", "umkm");
    expect((await briefPost(req("POST", { description: "x", type: "video" }))).status).toBe(400);
    mocks.requireUser.mockRejectedValueOnce(new HttpError(403, "Akun ini tidak punya akses untuk aksi tersebut."));
    expect((await briefPost(req("POST", { description: "x", type: "ugc" }))).status).toBe(403);
  });
});
