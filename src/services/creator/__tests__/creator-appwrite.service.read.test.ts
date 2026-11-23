/**
 * Fase 5 — jalur baca kreator dari Supabase.
 *
 * Memastikan (1) filter kepemilikan dipasang dengan kolom Postgres, dan
 * (2) DTO hasil row Postgres identik dengan DTO versi Appwrite (mapper lama
 * dipakai ulang lewat rowToDoc).
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

import { createFakeSupabase, type FakeSupabase } from "@/test/fake-supabase";

const mocks = vi.hoisted(() => ({
  db: null as unknown as FakeSupabase,
  userId: "creator-1" as string | null,
  callApi: vi.fn(),
  databases: { listDocuments: vi.fn(), getDocument: vi.fn() },
}));

vi.mock("@/lib/supabase/client", () => ({ createClient: () => mocks.db }));
vi.mock("@/services/auth/session.service", () => ({
  getSession: vi.fn(),
  getCurrentUserId: async () => mocks.userId,
}));
vi.mock("@/lib/api/call-api", async () => {
  const errors = await import("@/lib/api/errors");
  return { callApi: mocks.callApi, FunctionExecutionError: errors.FunctionExecutionError };
});
// Jalur tulis masih Appwrite — dibuat inert supaya test baca tidak menyentuhnya.
vi.mock("@/lib/appwrite/databases", () => ({ databases: mocks.databases }));
vi.mock("@/lib/appwrite/config", () => ({ appwriteConfig: { databaseId: "db" } }));
vi.mock("@/lib/supabase/storage", () => ({ uploadPublicFile: vi.fn(), FileRuleError: class extends Error {} }));
vi.mock("@/lib/appwrite/functions", () => ({ executeFunction: vi.fn(), FUNCTION_IDS: {} }));

import { FunctionExecutionError } from "@/lib/api/errors";
import {
  getCreatorActiveWorkByIdFromAppwrite,
  getCreatorActiveWorksFromAppwrite,
  getCreatorActivitiesFromAppwrite,
  getCreatorJobByIdFromAppwrite,
  getCreatorJobsFromAppwrite,
  getCreatorMetricsFromAppwrite,
  getCreatorNegotiationByIdFromAppwrite,
  getCreatorNegotiationsFromAppwrite,
  getCreatorPortfolioFromAppwrite,
  getCreatorProfileFromAppwrite,
  getCreatorRateCardPackagesFromAppwrite,
  getCreatorSubmissionsFromAppwrite,
  getCreatorTransactionsFromAppwrite,
} from "../creator-appwrite.service";

const ME = "creator-1";

const campaigns = [
  {
    id: "camp-1",
    umkm_id: "umkm-1",
    title: "Promo Kopi",
    description: "Buat video kopi",
    category: "Kuliner",
    claim_limit: 10,
    total_claims: 3,
    reward_per_1000_views: 5000,
    status: "active",
    budget: 1_000_000,
    type: "ugc",
    platforms: ["tiktok", "instagram"],
    thumbnail_url: "https://img/kopi.png",
    submission_days: 7,
    created_at: "2026-11-01T00:00:00+00:00",
    updated_at: "2026-11-01T00:00:00+00:00",
  },
  {
    id: "camp-2",
    umkm_id: "umkm-2",
    title: "Draft",
    status: "draft",
    platforms: [],
    created_at: "2026-11-02T00:00:00+00:00",
  },
  {
    id: "camp-3",
    umkm_id: "umkm-2",
    title: "Baju",
    description: "",
    category: "aneh",
    claim_limit: 5,
    total_claims: 0,
    reward_per_1000_views: 1000,
    status: "active",
    budget: 0,
    type: null,
    platforms: null,
    thumbnail_url: null,
    created_at: "2026-11-03T00:00:00+00:00",
  },
];

function seed() {
  mocks.db = createFakeSupabase({
    campaigns,
    umkm_profiles: [
      { id: "p1", user_id: "umkm-1", business_name: "Kopi Kita", logo_url: "https://img/logo.png" },
      { id: "p2", user_id: "umkm-2", business_name: "Baju Kita", logo_url: "" },
    ],
    campaign_briefs: [
      {
        id: "b1",
        campaign_id: "camp-1",
        brief_detail: "Detail",
        cta: "Beli",
        objective: "Gen Z",
        do_and_dont: { do: ["senyum"], dont: ["kasar", 3] },
        materials: [],
      },
    ],
    campaign_assets: [
      { id: "a1", campaign_id: "camp-1", type: "link", file_url: "https://drive.example/x", file_name: "" },
      { id: "a2", campaign_id: "camp-1", type: "file", file_url: "https://f/y.pdf", file_name: "brief.pdf" },
    ],
    campaign_claims: [
      { id: "cl-1", campaign_id: "camp-1", creator_id: ME, status: "submitted", claimed_at: "2026-11-05T00:00:00.000Z", created_at: "2026-11-05T00:00:00+00:00" },
      { id: "cl-2", campaign_id: "camp-3", creator_id: ME, status: "claimed", claimed_at: null, created_at: "2026-11-06T00:00:00+00:00" },
      { id: "cl-x", campaign_id: "camp-1", creator_id: "creator-lain", status: "claimed", created_at: "2026-11-07T00:00:00+00:00" },
    ],
    campaign_submissions: [
      {
        id: "s-1",
        claim_id: "cl-1",
        campaign_id: "camp-1",
        creator_id: ME,
        platform: "instagram",
        post_url: "https://ig/p/1",
        caption: "cap",
        views: 1200,
        views_count: 1500,
        views_final: true,
        views_captured_at: "2026-11-10T00:00:00+00:00",
        views_source: "manual",
        status: "approved",
        fraud_status: "clean",
        review_notes: "",
        created_at: "2026-11-06T00:00:00+00:00",
        updated_at: "2026-11-08T00:00:00+00:00",
      },
      { id: "s-x", claim_id: "cl-x", campaign_id: "camp-1", creator_id: "creator-lain", status: "pending", created_at: "2026-11-07T00:00:00+00:00" },
    ],
    rate_cards: [
      { id: "rc-1", creator_id: ME, status: "published", created_at: "2026-10-01T00:00:00+00:00" },
      { id: "rc-2", creator_id: ME, status: "draft", created_at: "2026-10-02T00:00:00+00:00" },
      { id: "rc-x", creator_id: "creator-lain", status: "published" },
    ],
    rate_card_packages: [
      { id: "pkg-1", rate_card_id: "rc-1", name: "Basic", description: "1 video", price: 100000, output: "1 TikTok", delivery_days: 3, revision_limit: 1 },
      { id: "pkg-2", rate_card_id: "rc-2", name: "Pro", description: "3 video", price: 300000, output: "3 TikTok", delivery_days: 7, revision_limit: 2 },
      { id: "pkg-x", rate_card_id: "rc-x", name: "Lain", price: 1 },
    ],
    creator_portfolios: [
      { id: "pf-1", creator_id: ME, title: "Video A", portfolio_url: "https://t/a", description: "desc", thumbnail_url: "", created_at: "2026-10-01T00:00:00+00:00" },
      { id: "pf-x", creator_id: "creator-lain", title: "X", created_at: "2026-10-02T00:00:00+00:00" },
    ],
    transactions: [
      { id: "t-1", user_id: ME, type: "release", amount: 7500, status: "completed", reference_type: "campaign_submission", reference_id: "s-1", created_at: "2026-11-09T00:00:00+00:00" },
      { id: "t-2", user_id: ME, type: "withdrawal_reversal", amount: 5000, status: "completed", reference_type: "withdrawal", reference_id: "w-1", created_at: "2026-11-10T00:00:00+00:00" },
      { id: "t-x", user_id: "creator-lain", type: "release", amount: 1, status: "completed", created_at: "2026-11-11T00:00:00+00:00" },
    ],
    notifications: [
      { id: "n-1", user_id: ME, type: "reward", title: "Reward", message: "Rp7.500", is_read: false, created_at: "2026-11-09T00:00:00+00:00" },
      { id: "n-2", user_id: ME, type: "campaign_published", title: "Baru", message: "Campaign baru", is_read: true, created_at: "2026-11-10T00:00:00+00:00" },
      { id: "n-x", user_id: "creator-lain", type: "reward", title: "x", message: "x", created_at: "2026-11-11T00:00:00+00:00" },
    ],
  });
}

const filtersOf = (table: string) => mocks.db.calls.filter((c) => c.table === table).map((c) => c.filters);

beforeEach(() => {
  mocks.userId = ME;
  mocks.callApi.mockReset();
  seed();
});

describe("Job Pool", () => {
  it("hanya campaign active, terbaru dulu, dengan brand dari umkm_profiles", async () => {
    const result = await getCreatorJobsFromAppwrite();
    expect(result.success).toBe(true);
    expect(result.data).toEqual([
      {
        id: "camp-3",
        title: "Baju",
        brandName: "Baju Kita",
        brandAvatar: "",
        brief: "",
        niche: "lainnya",
        quota: 5,
        usedQuota: 0,
        ratePerThousandViews: 1000,
        status: "active",
        totalBudget: 0,
        createdAt: "2026-11-03T00:00:00+00:00",
        type: undefined,
        platforms: [],
        thumbnailUrl: undefined,
      },
      {
        id: "camp-1",
        title: "Promo Kopi",
        brandName: "Kopi Kita",
        brandAvatar: "https://img/logo.png",
        brief: "Buat video kopi",
        niche: "kuliner",
        quota: 10,
        usedQuota: 3,
        ratePerThousandViews: 5000,
        status: "active",
        totalBudget: 1_000_000,
        createdAt: "2026-11-01T00:00:00+00:00",
        type: "ugc",
        platforms: ["tiktok", "instagram"],
        thumbnailUrl: "https://img/kopi.png",
      },
    ]);
    expect(filtersOf("campaigns")).toEqual([["status.eq.active"]]);
    expect(filtersOf("umkm_profiles")).toEqual([["user_id.in.(umkm-2,umkm-1)"]]);
  });

  it("detail job: brief jsonb (doAndDont) + materi", async () => {
    const result = await getCreatorJobByIdFromAppwrite("camp-1");
    expect(result.data).toMatchObject({
      id: "camp-1",
      contentInstruction: "Detail",
      ctaInstruction: "Beli",
      targetAudience: "Gen Z",
      doAndDont: { do: ["senyum"], dont: ["kasar"] },
      externalAssetUrl: "https://drive.example/x",
      materials: [
        { id: "a1", label: "drive.example", url: "https://drive.example/x", kind: "link" },
        { id: "a2", label: "brief.pdf", url: "https://f/y.pdf", kind: "file" },
      ],
    });
  });

  it("detail job draft / tidak ada → not_found", async () => {
    expect(await getCreatorJobByIdFromAppwrite("camp-2")).toMatchObject({ success: false, code: "not_found" });
    expect(await getCreatorJobByIdFromAppwrite("nope")).toMatchObject({ success: false, code: "not_found" });
  });
});

describe("Pekerjaan aktif (claims)", () => {
  it("hanya klaim milik sendiri, gabung campaign/submission/aset", async () => {
    const result = await getCreatorActiveWorksFromAppwrite();
    expect(result.data.map((w) => w.id)).toEqual(["cl-2", "cl-1"]);
    expect(filtersOf("campaign_claims")).toEqual([[`creator_id.eq.${ME}`]]);
    const done = result.data[1];
    expect(done).toEqual({
      id: "cl-1",
      campaignId: "camp-1",
      title: "Promo Kopi",
      brandName: "Kopi Kita",
      brandAvatar: "https://img/logo.png",
      brief: "Buat video kopi",
      ratePerThousandViews: 5000,
      status: "submitted",
      claimedAt: "2026-11-05T00:00:00.000Z",
      deadline: "2026-11-12T00:00:00.000Z",
      submissionId: "s-1",
      submissionStatus: "approved",
      fraudStatus: "clean",
      contentUrl: "https://ig/p/1",
      actualViews: 1500,
      platform: "instagram",
      notes: "cap",
      submittedAt: "2026-11-06T00:00:00+00:00",
      validatedAt: "2026-11-08T00:00:00+00:00",
      rejectedReason: undefined,
      assetUrl: "https://drive.example/x",
      thumbnailUrl: "https://img/kopi.png",
      viewsCount: 1500,
      viewsCapturedAt: "2026-11-10T00:00:00+00:00",
      viewsSource: "manual",
      viewsFinal: true,
    });
    // klaim tanpa claimed_at → pakai created_at
    expect(result.data[0]).toMatchObject({ claimedAt: "2026-11-06T00:00:00+00:00", submissionId: undefined, platform: "tiktok" });
  });

  it("detail klaim orang lain → not_found (filter creator_id)", async () => {
    expect(await getCreatorActiveWorkByIdFromAppwrite("cl-x")).toMatchObject({ success: false, code: "not_found" });
    expect(filtersOf("campaign_claims")).toEqual([["id.eq.cl-x", `creator_id.eq.${ME}`]]);
    expect(await getCreatorActiveWorkByIdFromAppwrite("cl-1")).toMatchObject({ success: true, data: { id: "cl-1" } });
  });
});

describe("Daftar milik sendiri", () => {
  it("submissions", async () => {
    const result = await getCreatorSubmissionsFromAppwrite();
    expect(result.data).toEqual([
      {
        id: "s-1",
        campaignId: "camp-1",
        claimId: "cl-1",
        platform: "instagram",
        contentUrl: "https://ig/p/1",
        actualViews: 1200,
        status: "approved",
        fraudStatus: "clean",
        submittedAt: "2026-11-06T00:00:00+00:00",
        validatedAt: "2026-11-08T00:00:00+00:00",
        earnings: 0,
      },
    ]);
    expect(filtersOf("campaign_submissions")).toEqual([[`creator_id.eq.${ME}`]]);
  });

  it("rate card packages: status dari parent, hanya milik sendiri", async () => {
    const result = await getCreatorRateCardPackagesFromAppwrite();
    expect(result.data).toEqual([
      { id: "pkg-1", rateCardId: "rc-1", name: "Basic", description: "1 video", price: 100000, deliverable: "1 TikTok", estimatedDays: 3, status: "published", revisionCount: 1 },
      { id: "pkg-2", rateCardId: "rc-2", name: "Pro", description: "3 video", price: 300000, deliverable: "3 TikTok", estimatedDays: 7, status: "draft", revisionCount: 2 },
    ]);
    expect(filtersOf("rate_cards")).toEqual([[`creator_id.eq.${ME}`]]);
    expect(filtersOf("rate_card_packages")).toEqual([["rate_card_id.in.(rc-1,rc-2)"]]);
  });

  it("portfolio", async () => {
    const result = await getCreatorPortfolioFromAppwrite();
    expect(result.data).toEqual([{ id: "pf-1", title: "Video A", url: "https://t/a", description: "desc", thumbnailUrl: undefined }]);
  });

  it("transaksi (ledger) terbaru dulu", async () => {
    const result = await getCreatorTransactionsFromAppwrite();
    expect(result.data).toEqual([
      { id: "t-2", type: "withdrawal_reversal", amount: 5000, status: "completed", description: "Pengembalian saldo penarikan", createdAt: "2026-11-10T00:00:00+00:00", referenceId: "w-1", source: "Withdrawal" },
      { id: "t-1", type: "release", amount: 7500, status: "completed", description: "Reward campaign", createdAt: "2026-11-09T00:00:00+00:00", referenceId: "s-1", source: "Campaign" },
    ]);
    expect(filtersOf("transactions")).toEqual([[`user_id.eq.${ME}`]]);
  });

  it("aktivitas dari notifications", async () => {
    const result = await getCreatorActivitiesFromAppwrite();
    expect(result.data).toEqual([
      { id: "n-2", type: "campaign_published", title: "Baru", description: "Campaign baru", createdAt: "2026-11-10T00:00:00+00:00" },
      { id: "n-1", type: "payout", title: "Reward", description: "Rp7.500", createdAt: "2026-11-09T00:00:00+00:00" },
    ]);
  });

  it("error DB → ServiceResult gagal baca, tanpa sesi → auth", async () => {
    mocks.db.failTable("transactions", { code: "PGRST000", message: "down" });
    expect(await getCreatorTransactionsFromAppwrite()).toMatchObject({
      success: false,
      error: "Gagal memuat data. Coba lagi.",
      code: "server",
      data: [],
    });
    mocks.userId = null;
    expect(await getCreatorSubmissionsFromAppwrite()).toMatchObject({ success: false, code: "auth" });
  });
});

describe("Route Handler (callApi)", () => {
  it("profil, metrik, negosiasi lewat callApi", async () => {
    mocks.callApi.mockResolvedValue({ ok: 1 });
    await getCreatorProfileFromAppwrite();
    await getCreatorMetricsFromAppwrite();
    await getCreatorNegotiationsFromAppwrite();
    await getCreatorNegotiationByIdFromAppwrite("conv-1");
    expect(mocks.callApi.mock.calls).toEqual([
      ["creatorProfile"],
      ["creatorDashboardSummary"],
      ["creatorNegotiations"],
      ["creatorNegotiations", { conversationId: "conv-1" }],
    ]);
  });

  it("negosiasi 404 → pesan not_found khusus", async () => {
    mocks.callApi.mockRejectedValue(new FunctionExecutionError("x", 404, "not_found"));
    expect(await getCreatorNegotiationByIdFromAppwrite("conv-1")).toEqual({
      success: false,
      data: null,
      error: "Negosiasi tidak ditemukan",
      code: "not_found",
    });
  });

  it("profil 404 di-retry sekali", async () => {
    mocks.callApi
      .mockRejectedValueOnce(new FunctionExecutionError("x", 404, "not_found"))
      .mockResolvedValueOnce({ id: ME });
    expect(await getCreatorProfileFromAppwrite()).toEqual({ success: true, data: { id: ME } });
    expect(mocks.callApi).toHaveBeenCalledTimes(2);
  });
});
