import { beforeEach, describe, expect, it, vi } from "vitest";

import { createMutableFake, type MutableFake } from "@/server/campaigns/__tests__/mutable-fake";
import { HttpError } from "@/server/http";

const mocks = vi.hoisted(() => ({
  requireUser: vi.fn(),
  db: null as unknown as MutableFake,
}));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => mocks.db,
}));
vi.mock("@/server/auth/require-user", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/server/auth/require-user")>()),
  requireUser: mocks.requireUser,
}));

import { DELETE as deleteAsset } from "../[campaignId]/assets/[assetId]/route";
import { POST as createAsset } from "../[campaignId]/assets/route";
import { PUT as putBrief } from "../[campaignId]/brief/route";
import { PATCH as patchDraft } from "../[campaignId]/draft/route";
import { DELETE as deleteCampaign } from "../[campaignId]/route";
import { PATCH as patchStatus } from "../[campaignId]/status/route";
import { POST as createCampaign } from "../route";

const UMKM = "a1111111-1111-4111-8111-111111111111";

const req = (method: string, body?: unknown) =>
  new Request("http://localhost/api/campaigns", {
    method,
    headers: { "content-type": "application/json" },
    ...(body === undefined ? {} : { body: typeof body === "string" ? body : JSON.stringify(body) }),
  });
const params = <T extends Record<string, string>>(value: T) => ({ params: Promise.resolve(value) });

function signedIn() {
  mocks.requireUser.mockResolvedValue({
    user: { id: UMKM, app_metadata: {}, user_metadata: {} },
    userRow: { id: UMKM, role: "umkm", status: "active" },
  });
}

const draft = {
  id: "c1", umkm_id: UMKM, title: "Promo", category: "kuliner", type: "ugc", status: "draft",
  budget: 100000, reward_per_1000_views: 5000, claim_limit: 10, remaining_budget: 0, thumbnail_url: "",
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://proj.supabase.test");
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "anon");
  mocks.db = createMutableFake({
    campaigns: [draft, { ...draft, id: "c_active", status: "active" }],
    campaign_assets: [],
    campaign_briefs: [],
  });
  mocks.db.rpcImpl.create_campaign_draft = () => ({ ...draft, id: "c_new" });
});

const validCreate = {
  title: "Promo",
  category: "kuliner",
  type: "ugc",
  description: "desk",
  budget: 100000,
  rewardPer1000Views: 5000,
  claimLimit: 10,
};

const calls = [
  ["POST /api/campaigns", () => createCampaign(req("POST", validCreate))],
  ["DELETE /api/campaigns/c1", () => deleteCampaign(req("DELETE"), params({ campaignId: "c1" }))],
  ["PATCH draft", () => patchDraft(req("PATCH", { title: "x" }), params({ campaignId: "c1" }))],
  ["PUT brief", () => putBrief(req("PUT", { briefDetail: "d" }), params({ campaignId: "c1" }))],
  ["POST assets", () => createAsset(req("POST", { fileUrl: "https://x" }), params({ campaignId: "c1" }))],
  ["DELETE asset", () => deleteAsset(req("DELETE"), params({ campaignId: "c1", assetId: "a1" }))],
  ["PATCH status", () => patchStatus(req("PATCH", { action: "pause" }), params({ campaignId: "c1" }))],
] as const;

describe("/api/campaigns/**", () => {
  it.each(calls)("%s: tanpa sesi → 401 tanpa menyentuh database", async (_name, call) => {
    mocks.requireUser.mockRejectedValue(new HttpError(401, "Sesi tidak ditemukan. Silakan login."));
    const res = await call();
    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: "Sesi tidak ditemukan. Silakan login.", code: "auth" });
    expect(mocks.db.ops).toHaveLength(0);
    expect(mocks.db.rpc).not.toHaveBeenCalled();
  });

  it.each(calls)("%s: wajib role umkm", async (_name, call) => {
    mocks.requireUser.mockRejectedValue(new HttpError(403, "Akun ini tidak punya akses untuk aksi tersebut."));
    expect((await call()).status).toBe(403);
    expect(mocks.requireUser).toHaveBeenCalledWith({ role: "umkm" });
  });

  it("POST: 201 + baris campaign; body rusak / tidak valid → 400", async () => {
    signedIn();
    const res = await createCampaign(req("POST", validCreate));
    expect(res.status).toBe(201);
    expect(await res.json()).toEqual({ campaign: expect.objectContaining({ id: "c_new", status: "draft" }) });

    expect((await createCampaign(req("POST", "{rusak"))).status).toBe(400);
    const invalid = await createCampaign(req("POST", { ...validCreate, budget: 10 }));
    expect(invalid.status).toBe(400);
    expect(await invalid.json()).toMatchObject({ code: "validation", fieldErrors: { budget: expect.any(String) } });
  });

  it("PATCH draft milik orang lain / tidak ada → 404", async () => {
    signedIn();
    const res = await patchDraft(req("PATCH", { title: "x" }), params({ campaignId: "nope" }));
    expect(res.status).toBe(404);
  });

  it("PATCH status: transisi salah → 409; aksi asing → 400", async () => {
    signedIn();
    expect((await patchStatus(req("PATCH", { action: "pause" }), params({ campaignId: "c1" }))).status).toBe(409);
    expect((await patchStatus(req("PATCH", { action: "hapus" }), params({ campaignId: "c1" }))).status).toBe(400);
    const ok = await patchStatus(req("PATCH", { action: "pause" }), params({ campaignId: "c_active" }));
    expect(ok.status).toBe(200);
    expect((await ok.json()).campaign.status).toBe("paused");
  });

  it("DELETE bukan draft → 409; draft → 200 + thumbnailUrl", async () => {
    signedIn();
    expect((await deleteCampaign(req("DELETE"), params({ campaignId: "c_active" }))).status).toBe(409);
    const res = await deleteCampaign(req("DELETE"), params({ campaignId: "c1" }));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true, thumbnailUrl: "" });
  });

  it("POST aset → 201", async () => {
    signedIn();
    const res = await createAsset(req("POST", { fileUrl: "https://drive.google.com/x" }), params({ campaignId: "c1" }));
    expect(res.status).toBe(201);
  });
});
