import { beforeEach, describe, expect, it, vi } from "vitest";

import { FunctionExecutionError } from "@/lib/api/errors";
import { createFakeSupabase, type FakeSupabase } from "@/test/fake-supabase";

/**
 * Fase 6 — tulis campaign/profil/file UMKM lewat Route Handler + Supabase
 * Storage. Tidak ada satu pun panggilan Appwrite untuk fungsi-fungsi ini.
 */

const UMKM = "11111111-1111-4111-8111-111111111111";
const THUMB = "https://proj.supabase.test/storage/v1/object/public/campaign-assets/u/old.png";

const mocks = vi.hoisted(() => ({
  db: null as unknown as FakeSupabase,
  callApi: vi.fn(),
  getCurrentUserId: vi.fn(),
  uploadPublicFile: vi.fn(),
  uploadCampaignThumbnail: vi.fn(),
  deleteCampaignThumbnailByUrl: vi.fn(),
  copyCampaignThumbnail: vi.fn(),
  appwrite: vi.fn(),
}));

vi.mock("@/lib/supabase/client", () => ({ createClient: () => mocks.db }));
vi.mock("@/lib/api/call-api", async () => {
  const errors = await vi.importActual<typeof import("@/lib/api/errors")>("@/lib/api/errors");
  return { callApi: mocks.callApi, FunctionExecutionError: errors.FunctionExecutionError };
});
vi.mock("@/services/auth/session.service", () => ({ getCurrentUserId: mocks.getCurrentUserId }));
vi.mock("@/lib/supabase/storage", async () => {
  const actual = await vi.importActual<typeof import("@/lib/supabase/storage")>("@/lib/supabase/storage");
  return { ...actual, uploadPublicFile: mocks.uploadPublicFile };
});
vi.mock("@/lib/supabase/campaign-thumbnail", () => ({
  uploadCampaignThumbnail: mocks.uploadCampaignThumbnail,
  deleteCampaignThumbnailByUrl: mocks.deleteCampaignThumbnailByUrl,
  copyCampaignThumbnail: mocks.copyCampaignThumbnail,
}));
// Fungsi Fase 6 TIDAK boleh menyentuh Appwrite.
vi.mock("@/lib/appwrite/databases", () => ({
  databases: new Proxy({}, { get: () => mocks.appwrite }),
}));
vi.mock("@/lib/appwrite/functions", async () => {
  const actual = await vi.importActual<typeof import("@/lib/appwrite/functions")>("@/lib/appwrite/functions");
  return { ...actual, executeFunction: mocks.appwrite };
});

import {
  createCampaignDraftInAppwrite,
  deleteCampaignDraftInAppwrite,
  duplicateCampaignInAppwrite,
  removeCampaignAssetInAppwrite,
  updateCampaignDraftInAppwrite,
  updateUmkmProfileInAppwrite,
  uploadUmkmLogoInAppwrite,
  type CreateCampaignDraftInput,
} from "../umkm-appwrite.service";

const row = (over: Record<string, unknown> = {}) => ({
  id: "c1",
  umkm_id: UMKM,
  title: "Promo",
  category: "kuliner",
  type: "ugc",
  platforms: ["tiktok"],
  description: "desk",
  budget: 100000,
  reward_per_1000_views: 5000,
  status: "draft",
  claim_limit: 10,
  submission_days: 7,
  total_claims: 0,
  spent_amount: 0,
  remaining_budget: 0,
  published_at: null,
  thumbnail_url: THUMB,
  created_at: "2026-11-01T00:00:00+00:00",
  updated_at: "2026-11-01T00:00:00+00:00",
  ...over,
});

const input: CreateCampaignDraftInput = {
  title: " Promo ",
  thumbnailUrl: THUMB,
  category: "kuliner",
  type: "ugc",
  description: " desk ",
  budget: 100000,
  rewardPer1000Views: 5000,
  claimLimit: 10,
  brief: { briefDetail: "d", contentAngle: "a", cta: "c", doAndDont: '{"do":[],"dont":[]}' },
  asset: { fileUrl: "https://drive.google.com/x", fileName: "Drive" },
};

beforeEach(() => {
  vi.clearAllMocks();
  mocks.getCurrentUserId.mockResolvedValue(UMKM);
  mocks.db = createFakeSupabase({
    campaigns: [row(), row({ id: "c_other", umkm_id: "someone-else" })],
    campaign_briefs: [
      { id: "b1", campaign_id: "c1", objective: "o", content_angle: "a", cta: "c", brief_detail: "d", do_and_dont: { do: ["x"], dont: [] }, generated_by_ai: true },
    ],
    campaign_assets: [
      { id: "a2", campaign_id: "c1", source: "external", type: "link", file_url: "https://x/2", file_name: "B", created_at: "2026-11-02" },
      { id: "a1", campaign_id: "c1", source: "external", type: "link", file_url: "https://x/1", file_name: "A", created_at: "2026-11-01" },
    ],
  });
});

describe("createCampaignDraftInAppwrite", () => {
  it("satu POST /api/campaigns, hasil dipetakan ke DTO Campaign", async () => {
    mocks.callApi.mockResolvedValueOnce({ campaign: row({ id: "c_new" }) });
    const res = await createCampaignDraftInAppwrite(input);
    expect(mocks.callApi).toHaveBeenCalledWith("createCampaign", {
      title: "Promo",
      thumbnailUrl: THUMB,
      category: "kuliner",
      type: "ugc",
      description: "desk",
      budget: 100000,
      rewardPer1000Views: 5000,
      claimLimit: 10,
      submissionDays: 7,
      brief: input.brief,
      asset: input.asset,
    });
    expect(res.success).toBe(true);
    expect(res.data.complete).toBe(true);
    expect(res.data.warnings).toEqual([]);
    expect(res.data.campaign).toMatchObject({ id: "c_new", status: "draft", thumbnailUrl: THUMB });
    expect(mocks.appwrite).not.toHaveBeenCalled();
  });

  it("pesan validasi route diteruskan", async () => {
    mocks.callApi.mockRejectedValueOnce(new FunctionExecutionError("Budget tidak valid. Minimal Rp50.000.", 400, "validation"));
    const res = await createCampaignDraftInAppwrite(input);
    expect(res).toMatchObject({ success: false, code: "validation", error: "Budget tidak valid. Minimal Rp50.000." });
  });
});

describe("updateCampaignDraftInAppwrite", () => {
  it("PATCH draft → PUT brief → POST aset (replace)", async () => {
    mocks.callApi.mockResolvedValueOnce({ campaign: row() }).mockResolvedValue({});
    const res = await updateCampaignDraftInAppwrite("c1", input);
    expect(res.success).toBe(true);
    expect(res.data.complete).toBe(true);
    expect(mocks.callApi.mock.calls.map((c) => c[0])).toEqual(["patchCampaignDraft", "putCampaignBrief", "createCampaignAsset"]);
    expect(mocks.callApi.mock.calls[0][1]).toMatchObject({ campaignId: "c1", title: "Promo", thumbnailUrl: THUMB });
    expect(mocks.callApi.mock.calls[0][1]).not.toHaveProperty("remainingBudget");
    expect(mocks.callApi.mock.calls[1][1]).toEqual({ campaignId: "c1", ...input.brief });
    expect(mocks.callApi.mock.calls[2][1]).toEqual({ campaignId: "c1", fileUrl: "https://drive.google.com/x", fileName: "Drive", replace: true });
  });

  it("brief/aset gagal → warning, campaign tetap tersimpan", async () => {
    mocks.callApi
      .mockResolvedValueOnce({ campaign: row() })
      .mockRejectedValueOnce(new Error("brief"))
      .mockRejectedValueOnce(new Error("asset"));
    const res = await updateCampaignDraftInAppwrite("c1", input);
    expect(res.success).toBe(true);
    expect(res.data.complete).toBe(false);
    expect(res.data.warnings).toHaveLength(2);
  });

  it("thumbnail tidak tersimpan → gagal (Model B cleanup di pemanggil)", async () => {
    mocks.callApi.mockResolvedValueOnce({ campaign: row({ thumbnail_url: "" }) });
    const res = await updateCampaignDraftInAppwrite("c1", input);
    expect(res).toMatchObject({ success: false, code: "validation" });
  });
});

describe("deleteCampaignDraftInAppwrite", () => {
  it("DELETE route lalu bersihkan thumbnail lama (best-effort)", async () => {
    mocks.callApi.mockResolvedValueOnce({ ok: true, thumbnailUrl: THUMB });
    mocks.deleteCampaignThumbnailByUrl.mockRejectedValueOnce(new Error("storage"));
    const res = await deleteCampaignDraftInAppwrite("c1");
    expect(mocks.callApi).toHaveBeenCalledWith("deleteCampaign", { campaignId: "c1" });
    expect(mocks.deleteCampaignThumbnailByUrl).toHaveBeenCalledWith(THUMB);
    expect(res).toEqual({ success: true, data: null });
  });

  it("409 bukan draft → pesan route", async () => {
    mocks.callApi.mockRejectedValueOnce(new FunctionExecutionError("Hanya campaign draft yang bisa dihapus.", 409, "validation"));
    const res = await deleteCampaignDraftInAppwrite("c_active");
    expect(res).toMatchObject({ success: false, error: "Hanya campaign draft yang bisa dihapus." });
    expect(mocks.deleteCampaignThumbnailByUrl).not.toHaveBeenCalled();
  });
});

describe("removeCampaignAssetInAppwrite", () => {
  it("cari campaign induk lewat RLS lalu DELETE route", async () => {
    mocks.callApi.mockResolvedValueOnce({ ok: true });
    const res = await removeCampaignAssetInAppwrite("a1");
    expect(res.success).toBe(true);
    expect(mocks.callApi).toHaveBeenCalledWith("deleteCampaignAsset", { campaignId: "c1", assetId: "a1" });
  });

  it("aset tak terbaca → not_found tanpa route", async () => {
    const res = await removeCampaignAssetInAppwrite("nope");
    expect(res).toMatchObject({ success: false, code: "not_found" });
    expect(mocks.callApi).not.toHaveBeenCalled();
  });
});

describe("duplicateCampaignInAppwrite", () => {
  it("baca sumber milik sendiri, salin thumbnail, buat lewat route dengan brief & aset terlama", async () => {
    mocks.copyCampaignThumbnail.mockResolvedValueOnce({ url: "https://new/thumb.png" });
    mocks.callApi.mockResolvedValueOnce({ campaign: row({ id: "c_dup", title: "Salinan" }) });
    const res = await duplicateCampaignInAppwrite("c1", "Salinan", { copyBrief: true, copyBudget: false, copyAssets: true });

    expect(res.success).toBe(true);
    expect(mocks.copyCampaignThumbnail).toHaveBeenCalledWith(THUMB, UMKM);
    const [name, body] = mocks.callApi.mock.calls[0];
    expect(name).toBe("createCampaign");
    expect(body).toMatchObject({
      title: "Salinan",
      thumbnailUrl: "https://new/thumb.png",
      budget: 50000,
      brief: { briefDetail: "d", contentAngle: "a", cta: "c", objective: "o", doAndDont: '{"do":["x"],"dont":[]}', generatedByAi: true },
      asset: { fileUrl: "https://x/1", fileName: "A" },
    });
    expect(mocks.db.calls[0]).toEqual({ table: "campaigns", filters: ["id.eq.c1", `umkm_id.eq.${UMKM}`], count: undefined });
  });

  it("sumber milik orang lain → not_found; salin thumbnail gagal → batal", async () => {
    expect(await duplicateCampaignInAppwrite("c_other", "x", { copyBrief: false, copyBudget: true, copyAssets: false })).toMatchObject({ success: false, code: "not_found" });
    mocks.copyCampaignThumbnail.mockRejectedValueOnce(new Error("copy"));
    expect(await duplicateCampaignInAppwrite("c1", "x", { copyBrief: false, copyBudget: true, copyAssets: false })).toMatchObject({ success: false });
    expect(mocks.callApi).not.toHaveBeenCalled();
  });

  it("buat gagal setelah salin → salinan thumbnail dibersihkan", async () => {
    mocks.copyCampaignThumbnail.mockResolvedValueOnce({ url: "https://new/thumb.png" });
    mocks.callApi.mockRejectedValueOnce(new FunctionExecutionError("x", 500, "server"));
    await duplicateCampaignInAppwrite("c1", "x", { copyBrief: false, copyBudget: true, copyAssets: false });
    expect(mocks.deleteCampaignThumbnailByUrl).toHaveBeenCalledWith("https://new/thumb.png");
  });
});

describe("profil & logo", () => {
  it("updateUmkmProfile → PATCH /api/profile dengan allowlist lama, lalu baca ulang", async () => {
    mocks.db.tables.umkm_profiles = [{ id: "p1", user_id: UMKM, business_name: "Kopi Baru", city: "Bdg", is_profile_completed: true }];
    mocks.db.tables.users = [{ id: UMKM, address: "Jl. A" }];
    mocks.callApi.mockResolvedValueOnce({});
    const res = await updateUmkmProfileInAppwrite({ businessName: "Kopi Baru", phone: "0812" });
    expect(mocks.callApi).toHaveBeenCalledWith("updateProfile", { businessName: "Kopi Baru", phone: "0812" });
    expect(res.data).toMatchObject({ businessName: "Kopi Baru", address: "Jl. A" });
  });

  it("logo → Supabase Storage bucket logos di folder sesi", async () => {
    mocks.uploadPublicFile.mockResolvedValueOnce({ url: "https://proj/logo.png" });
    const file = new File(["x"], "logo.png", { type: "image/png" });
    expect(await uploadUmkmLogoInAppwrite(file)).toEqual({ success: true, data: "https://proj/logo.png" });
    expect(mocks.uploadPublicFile).toHaveBeenCalledWith("logos", file, UMKM);
  });
});
