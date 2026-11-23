import { beforeEach, describe, expect, it, vi } from "vitest";

import { FunctionExecutionError } from "@/lib/api/errors";
import { createFakeSupabase, type FakeSupabase } from "@/test/fake-supabase";

/**
 * Fase 5 — jalur baca UMKM dari Supabase.
 *
 * Fixture memakai bentuk row Postgres (snake_case, uuid user) dan memastikan:
 *  1. filter kepemilikan (`umkm_id` / `user_id` = sesi) tetap dipasang walau
 *     RLS juga menjaganya;
 *  2. DTO hasil `rowToDoc()` + mapper lama identik dengan bentuk DTO Appwrite;
 *  3. agregasi komposit lewat `callApi()` (route GET), bukan Appwrite.
 */

const UMKM = "11111111-1111-4111-8111-111111111111";
const OTHER_UMKM = "22222222-2222-4222-8222-222222222222";
const CREATOR = "33333333-3333-4333-8333-333333333333";

const mocks = vi.hoisted(() => ({
  db: null as unknown as FakeSupabase,
  callApi: vi.fn(),
  getCurrentUserId: vi.fn(),
  listDocuments: vi.fn(),
  executeFunction: vi.fn(),
}));

vi.mock("@/lib/supabase/client", () => ({ createClient: () => mocks.db }));
vi.mock("@/lib/api/call-api", async () => {
  const errors = await vi.importActual<typeof import("@/lib/api/errors")>("@/lib/api/errors");
  return { callApi: mocks.callApi, FunctionExecutionError: errors.FunctionExecutionError };
});
vi.mock("@/services/auth/session.service", () => ({ getCurrentUserId: mocks.getCurrentUserId }));
// Jalur baca TIDAK boleh menyentuh Appwrite lagi.
vi.mock("@/lib/appwrite/databases", () => ({ databases: { listDocuments: mocks.listDocuments } }));
vi.mock("@/lib/appwrite/functions", async () => {
  const actual = await vi.importActual<typeof import("@/lib/appwrite/functions")>("@/lib/appwrite/functions");
  return { ...actual, executeFunction: mocks.executeFunction };
});
vi.mock("@/services/shared/notification-appwrite.service", () => ({
  getNotificationsFromAppwrite: vi.fn(async () => ({ success: true, data: [] })),
}));

import {
  getCampaignByIdFromAppwrite,
  getCampaignDraftForEditFromAppwrite,
  getCampaignsFromAppwrite,
  getCampaignSubmissionsFromAppwrite,
  getCreatorByIdFromAppwrite,
  getCreatorPortfolioFromAppwrite,
  getCreatorRateCardsFromAppwrite,
  getCreatorSocialAccountsFromAppwrite,
  getCreatorsFromAppwrite,
  getEscrowOverviewFromAppwrite,
  getNegotiationByIdFromAppwrite,
  getPendingSubmissionsFromAppwrite,
  getSubmissionCountsFromAppwrite,
  getTransactionByIdFromAppwrite,
  getTransactionsFromAppwrite,
  getUmkmProfileFromAppwrite,
  getUmkmSettingsProfileFromAppwrite,
} from "../umkm-appwrite.service";

const campaignRow = (over: Record<string, unknown> = {}) => ({
  id: "camp-1",
  umkm_id: UMKM,
  title: "Kopi Susu",
  category: "kuliner",
  type: "ugc",
  platforms: ["tiktok"],
  description: "Promosi kopi",
  budget: 1_000_000,
  reward_per_1000_views: 5_000,
  status: "active",
  claim_limit: 10,
  submission_days: 7,
  total_claims: 3,
  spent_amount: 200_000,
  remaining_budget: 800_000,
  published_at: "2026-11-01T00:00:00+00:00",
  thumbnail_url: "https://cdn.example.test/t.png",
  created_at: "2026-11-01T00:00:00+00:00",
  updated_at: "2026-11-02T00:00:00+00:00",
  ...over,
});

const submissionRow = (over: Record<string, unknown> = {}) => ({
  id: "sub-1",
  claim_id: "claim-1",
  campaign_id: "camp-1",
  creator_id: CREATOR,
  platform: "tiktok",
  post_url: "https://tiktok.example.test/v/1",
  caption: null,
  views: 4_200,
  views_count: null,
  views_captured_at: null,
  views_source: null,
  views_final: false,
  engagement: null,
  fraud_score: null,
  fraud_status: "safe",
  status: "approved",
  review_notes: null,
  creator_credit: null,
  ai_generated: false,
  ai_disclosed: false,
  created_at: "2026-11-03T00:00:00+00:00",
  updated_at: "2026-11-03T00:00:00+00:00",
  ...over,
});

function seed() {
  return createFakeSupabase({
    campaigns: [
      campaignRow(),
      campaignRow({ id: "camp-2", status: "draft", updated_at: "2026-11-05T00:00:00+00:00", thumbnail_url: "" }),
      campaignRow({ id: "camp-x", umkm_id: OTHER_UMKM }),
    ],
    campaign_submissions: [
      submissionRow(),
      submissionRow({ id: "sub-2", claim_id: "claim-2", status: "pending", fraud_status: "review", created_at: "2026-11-04T00:00:00+00:00" }),
      submissionRow({ id: "sub-3", claim_id: "claim-3", campaign_id: "camp-2", status: "pending", fraud_status: null }),
      submissionRow({ id: "sub-x", claim_id: "claim-x", campaign_id: "camp-x", status: "pending" }),
    ],
    creator_profiles: [
      { id: "cp-1", user_id: CREATOR, display_name: "Rina", avatar_url: "https://cdn.example.test/a.png" },
    ],
    campaign_briefs: [
      {
        id: "brief-1",
        campaign_id: "camp-2",
        objective: "Awareness",
        content_angle: "Pagi hari",
        cta: "Beli sekarang",
        brief_detail: "Detail",
        do_and_dont: { do: ["senyum"], dont: ["kasar"] },
        materials: [],
        generated_by_ai: true,
        created_at: "2026-11-05T00:00:00+00:00",
        updated_at: "2026-11-05T00:00:00+00:00",
      },
    ],
    campaign_assets: [
      { id: "asset-2", campaign_id: "camp-2", source: "external", type: "link", file_url: "https://drive.example.test/2", file_name: "Kedua", created_at: "2026-11-06T00:00:00+00:00" },
      { id: "asset-1", campaign_id: "camp-2", source: "external", type: "link", file_url: "https://drive.example.test/1", file_name: "Pertama", created_at: "2026-11-05T00:00:00+00:00" },
    ],
    payments: [
      {
        id: "pay-1",
        user_id: UMKM,
        order_id: null,
        order_payment_key: null,
        campaign_id: "camp-1",
        amount: 1_000_000,
        total_amount: 1_020_000,
        fee_amount: 20_000,
        purpose: "campaign",
        gateway: "midtrans",
        gateway_reference: "MKT-1",
        snap_token: "snap",
        redirect_url: "https://pay.example.test/1",
        status: "paid",
        paid_at: "2026-11-01T01:00:00+00:00",
        created_at: "2026-11-01T00:00:00+00:00",
        updated_at: "2026-11-01T01:00:00+00:00",
      },
      {
        id: "pay-x",
        user_id: OTHER_UMKM,
        campaign_id: null,
        order_id: "ord-1",
        amount: 1,
        fee_amount: 0,
        purpose: "order",
        gateway: "midtrans",
        gateway_reference: "MKT-X",
        status: "pending",
        created_at: "2026-11-01T00:00:00+00:00",
      },
    ],
    umkm_profiles: [
      {
        id: "up-1",
        user_id: UMKM,
        business_name: "Kopi Kita",
        category: "kuliner",
        description: "Kedai kopi",
        city: "Bandung",
        tiktok: "@kopikita",
        logo_url: "https://cdn.example.test/logo.png",
        is_profile_completed: true,
      },
    ],
    users: [{ id: UMKM, role: "umkm", status: "active", email: "u@example.test", address: "Jl. Braga 1" }],
    rate_cards: [
      { id: "rc-1", creator_id: CREATOR, status: "published" },
      { id: "rc-2", creator_id: CREATOR, status: "draft" },
    ],
    rate_card_packages: [
      { id: "pkg-1", rate_card_id: "rc-1", name: "Basic", description: "1 video", price: 150_000, output: "1 video TikTok", delivery_days: 3, revision_limit: 2 },
      { id: "pkg-2", rate_card_id: "rc-2", name: "Draft", description: "", price: 1, output: "", delivery_days: 1, revision_limit: 0 },
    ],
    creator_portfolios: [
      { id: "pf-1", creator_id: CREATOR, title: "Review", portfolio_url: "https://x.example.test", description: "Isi", thumbnail_url: "", created_at: "2026-10-01T00:00:00+00:00" },
    ],
    creator_social_accounts: [
      { id: "sa-1", creator_id: CREATOR, platform: "tiktok", username: "rina", followers: 12_000, engagement_rate: 4.5, created_at: "2026-10-01T00:00:00+00:00" },
    ],
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.db = seed();
  mocks.getCurrentUserId.mockResolvedValue(UMKM);
});

describe("getCampaignsFromAppwrite", () => {
  it("hanya campaign milik sesi, urut updated_at desc, DTO sama dengan bentuk lama", async () => {
    const res = await getCampaignsFromAppwrite();
    expect(res.success).toBe(true);
    expect(res.data.map((c) => c.id)).toEqual(["camp-2", "camp-1"]);
    expect(res.data[1]).toEqual({
      id: "camp-1",
      umkmId: UMKM,
      title: "Kopi Susu",
      brief: "Promosi kopi",
      externalAssetUrl: "",
      thumbnailUrl: "https://cdn.example.test/t.png",
      niche: "kuliner",
      type: "ugc",
      status: "active",
      creatorQuota: 10,
      usedQuota: 3,
      pricePerThousandViews: 5_000,
      totalBudgetEscrow: 1_000_000,
      usedBudget: 200_000,
      remainingBudget: 800_000,
      totalViews: undefined,
      createdAt: "2026-11-01T00:00:00+00:00",
      updatedAt: "2026-11-02T00:00:00+00:00",
    });
    expect(mocks.db.calls[0]).toEqual({ table: "campaigns", filters: [`umkm_id.eq.${UMKM}`], count: undefined });
    expect(mocks.listDocuments).not.toHaveBeenCalled();
  });

  it("tanpa sesi → auth, tanpa query", async () => {
    mocks.getCurrentUserId.mockResolvedValue(null);
    const res = await getCampaignsFromAppwrite();
    expect(res).toMatchObject({ success: false, code: "auth", data: [] });
    expect(mocks.db.calls).toHaveLength(0);
  });

  it("error RLS/PostgREST → ServiceResult gagal dengan code terpetakan", async () => {
    mocks.db.failTable("campaigns", { code: "42501", message: "permission denied" });
    const res = await getCampaignsFromAppwrite();
    expect(res).toMatchObject({ success: false, code: "forbidden", error: "Gagal memuat data. Coba lagi." });
  });
});

describe("getCampaignByIdFromAppwrite", () => {
  it("campaign pihak lain → not_found (filter umkm_id)", async () => {
    const res = await getCampaignByIdFromAppwrite("camp-x");
    expect(res).toMatchObject({ success: false, code: "not_found", error: "Campaign tidak ditemukan" });
    expect(mocks.db.calls[0].filters).toEqual(["id.eq.camp-x", `umkm_id.eq.${UMKM}`]);
  });

  it("milik sendiri → DTO", async () => {
    const res = await getCampaignByIdFromAppwrite("camp-2");
    expect(res.data).toMatchObject({ id: "camp-2", status: "draft", thumbnailUrl: "" });
  });
});

describe("submission UMKM", () => {
  it("getCampaignSubmissions: guard kepemilikan + join profil kreator + reward approved", async () => {
    const res = await getCampaignSubmissionsFromAppwrite("camp-1");
    expect(res.success).toBe(true);
    expect(res.data).toEqual([
      {
        id: "sub-2",
        campaignId: "camp-1",
        creatorId: CREATOR,
        creatorName: "Rina",
        creatorAvatarUrl: "https://cdn.example.test/a.png",
        platform: "tiktok",
        contentUrl: "https://tiktok.example.test/v/1",
        actualViews: 4_200,
        targetViews: 0,
        releasedFund: 0,
        validationStatus: "pending",
        fraudStatus: "review",
        rejectedReason: undefined,
        submittedAt: "2026-11-04T00:00:00+00:00",
      },
      expect.objectContaining({ id: "sub-1", validationStatus: "approved", releasedFund: 4 * 5_000 }),
    ]);
    expect(mocks.db.calls.map((c) => c.table)).toEqual(["campaigns", "campaign_submissions", "creator_profiles"]);
  });

  it("getCampaignSubmissions: campaign pihak lain → not_found tanpa membaca submission", async () => {
    const res = await getCampaignSubmissionsFromAppwrite("camp-x");
    expect(res).toMatchObject({ success: false, code: "not_found", data: [] });
    expect(mocks.db.calls.map((c) => c.table)).toEqual(["campaigns"]);
  });

  it("getSubmissionCounts: satu query batch, hitung pending/valid/dispute", async () => {
    const res = await getSubmissionCountsFromAppwrite(["camp-1", "camp-2"]);
    expect(res.data).toEqual({
      "camp-1": { pending: 1, valid: 1, dispute: 1 },
      "camp-2": { pending: 1, valid: 0, dispute: 0 },
    });
    expect(mocks.db.calls).toHaveLength(1);
  });

  it("getPendingSubmissions: hanya dari campaign milik sesi", async () => {
    const res = await getPendingSubmissionsFromAppwrite();
    expect(res.data.map((s) => s.id).sort()).toEqual(["sub-2", "sub-3"]);
    expect(mocks.db.calls[0].filters).toEqual([`umkm_id.eq.${UMKM}`]);
  });
});

describe("transaksi (payments)", () => {
  it("getTransactions: filter user_id + DTO lama", async () => {
    const res = await getTransactionsFromAppwrite();
    expect(res.data).toEqual([
      {
        id: "pay-1",
        userId: UMKM,
        referenceId: "camp-1",
        referenceType: "campaign",
        amount: 1_000_000,
        baseAmount: 1_000_000,
        feeAmount: 20_000,
        totalAmount: 1_020_000,
        purpose: "campaign",
        type: "deposit",
        status: "paid",
        description: "Deposit budget campaign via Midtrans",
        midtransOrderId: "MKT-1",
        redirectUrl: "https://pay.example.test/1",
        createdAt: "2026-11-01T01:00:00+00:00",
      },
    ]);
    expect(mocks.db.calls[0].filters).toEqual([`user_id.eq.${UMKM}`]);
  });

  it("getTransactionById milik orang lain → not_found", async () => {
    const res = await getTransactionByIdFromAppwrite("pay-x");
    expect(res).toMatchObject({ success: false, code: "not_found" });
  });
});

describe("profil & edit draft", () => {
  it("getUmkmSettingsProfile: umkm_profiles + users.address", async () => {
    const res = await getUmkmSettingsProfileFromAppwrite();
    expect(res.data).toEqual({
      docId: "up-1",
      userId: UMKM,
      businessName: "Kopi Kita",
      category: "kuliner",
      description: "Kedai kopi",
      city: "Bandung",
      address: "Jl. Braga 1",
      tiktok: "@kopikita",
      logoUrl: "https://cdn.example.test/logo.png",
      isProfileCompleted: true,
    });
  });

  it("getUmkmSettingsProfile: profil belum ada → not_found", async () => {
    mocks.db.tables.umkm_profiles = [];
    const res = await getUmkmSettingsProfileFromAppwrite();
    expect(res).toMatchObject({ success: false, code: "not_found" });
  });

  it("getCampaignDraftForEdit: brief (doAndDont kembali string JSON) + aset pertama", async () => {
    const res = await getCampaignDraftForEditFromAppwrite("camp-2");
    expect(res.success).toBe(true);
    expect(res.data.brief).toEqual({
      id: "brief-1",
      briefDetail: "Detail",
      contentAngle: "Pagi hari",
      cta: "Beli sekarang",
      objective: "Awareness",
      doAndDont: JSON.stringify({ do: ["senyum"], dont: ["kasar"] }),
    });
    expect(res.data.asset).toEqual({ id: "asset-1", fileUrl: "https://drive.example.test/1", fileName: "Pertama" });
    expect(res.data.warnings).toEqual([]);
  });

  it("getCampaignDraftForEdit: campaign non-draft → not_found", async () => {
    const res = await getCampaignDraftForEditFromAppwrite("camp-1");
    expect(res).toMatchObject({ success: false, code: "not_found" });
  });
});

describe("data kreator publik", () => {
  it("getCreatorRateCards: hanya paket dari rate card published", async () => {
    const res = await getCreatorRateCardsFromAppwrite(CREATOR);
    expect(res.data).toEqual([
      {
        id: "pkg-1",
        creatorId: CREATOR,
        name: "Basic",
        description: "1 video",
        price: 150_000,
        deliverable: "1 video TikTok",
        estimatedDays: 3,
        revisionLimit: 2,
        status: "published",
      },
    ]);
  });

  it("portfolio & akun sosial", async () => {
    const [portfolio, social] = await Promise.all([
      getCreatorPortfolioFromAppwrite(CREATOR),
      getCreatorSocialAccountsFromAppwrite(CREATOR),
    ]);
    expect(portfolio.data).toEqual([
      { id: "pf-1", title: "Review", url: "https://x.example.test", description: "Isi", thumbnailUrl: undefined },
    ]);
    expect(social.data).toEqual([
      { id: "sa-1", platform: "tiktok", username: "rina", followers: 12_000, engagementRate: 4.5 },
    ]);
  });
});

describe("komposit lewat Route Handler (callApi)", () => {
  it("profil, escrow, direktori, negosiasi memanggil endpoint dengan body yang sama", async () => {
    mocks.callApi.mockImplementation(async (name: string) => {
      if (name === "umkmFinanceSummary") return { finance: { totalSpent: 1 }, escrow: { held: 2 } };
      return { name };
    });
    await getUmkmProfileFromAppwrite();
    const escrow = await getEscrowOverviewFromAppwrite();
    await getCreatorsFromAppwrite(12, "cur");
    await getNegotiationByIdFromAppwrite("conv-1");

    expect(escrow.data).toEqual({ held: 2 });
    expect(mocks.callApi.mock.calls).toEqual([
      ["umkmProfile"],
      ["umkmFinanceSummary"],
      ["creatorDirectory", { limit: 12, cursor: "cur" }],
      ["umkmNegotiations", { conversationId: "conv-1" }],
    ]);
    expect(mocks.executeFunction).not.toHaveBeenCalled();
  });

  it("getCreatorById 404 → pesan not_found yang sama dengan versi Appwrite", async () => {
    mocks.callApi.mockRejectedValue(new FunctionExecutionError("Creator not found", 404, "not_found"));
    const res = await getCreatorByIdFromAppwrite(CREATOR);
    expect(res).toEqual({ success: false, data: null, error: "Kreator tidak ditemukan", code: "not_found" });
  });
});
