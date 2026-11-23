import { describe, expect, it } from "vitest";

import { getAdminDashboardSummary } from "@/server/admin/dashboard-summary";
import { getAdminRatecardDeliverableQueue } from "@/server/admin/ratecard-deliverable-queue";
import { getAdminSubmissionQueue } from "@/server/admin/submission-queue";
import { getAdminWithdrawalQueue } from "@/server/admin/withdrawal-queue";
import { HttpError } from "@/server/http-error";
import { createFakeSupabase } from "@/test/fake-supabase";

/**
 * Snapshot DTO: nilai yang diharapkan dihitung dengan aturan Function lama
 * (00_BACKEND/functions/get-admin-*). Bentuknya harus lolos validator service
 * (isQueueResponse / isAdminWithdrawalQueue / isMetrics).
 */

const UMKM = "11111111-1111-1111-1111-111111111111";
const CREATOR = "22222222-2222-2222-2222-222222222222";
const CREATOR_NO_PROFILE = "44444444-4444-4444-4444-444444444444";

const fixtures = () =>
  createFakeSupabase({
    campaigns: [
      { id: "camp-1", umkm_id: UMKM, title: "Promo Kopi", reward_per_1000_views: 15000, status: "active" },
      { id: "camp-2", umkm_id: UMKM, title: "Draft", reward_per_1000_views: 0, status: "draft" },
    ],
    umkm_profiles: [{ id: "up-1", user_id: UMKM, business_name: "Kopi Senja" }],
    creator_profiles: [{ id: "cp-1", user_id: CREATOR, display_name: "Rina", avatar_url: "https://cdn.test/rina.png" }],
    campaign_submissions: [
      {
        id: "sub-1", campaign_id: "camp-1", creator_id: CREATOR, platform: "instagram", post_url: "https://ig.test/p/1",
        caption: "Caption", views: 2500, views_count: 12345, views_final: true, views_captured_at: "2026-02-02T00:00:00+00:00",
        views_source: "manual_admin", status: "approved", review_notes: null, created_at: "2026-02-01T00:00:00+00:00",
      },
      {
        id: "sub-2", campaign_id: "camp-1", creator_id: CREATOR_NO_PROFILE, platform: "tiktok", post_url: "https://tt.test/v/2",
        caption: null, views: 999, views_count: null, views_final: false, views_captured_at: null,
        views_source: null, status: "pending", review_notes: null, created_at: "2026-02-03T00:00:00+00:00",
      },
      {
        id: "sub-3", campaign_id: "camp-missing", creator_id: CREATOR, platform: "youtube", post_url: "https://yt.test/3",
        caption: "", views: 4000, views_count: 9000, views_final: false, views_captured_at: null,
        views_source: null, status: "rejected", review_notes: "Tidak sesuai brief", created_at: "2026-01-30T00:00:00+00:00",
      },
    ],
    withdrawals: [
      {
        id: "wd-1", user_id: CREATOR, amount: 250000, payout_method: "bank", provider_name: "BCA", account_number: "123",
        account_name: "RINA", status: "requested", created_at: "2026-03-01T00:00:00+00:00", processing_at: null,
        processed_at: null, failure_reason: null, transfer_reference: null, admin_note: null, processed_by: null,
      },
      {
        id: "wd-2", user_id: CREATOR_NO_PROFILE, amount: 50000, payout_method: "ewallet", provider_name: "OVO",
        account_number: "0812", account_name: "X", status: "succeeded", created_at: "2026-03-02T00:00:00+00:00",
        processing_at: "2026-03-02T01:00:00+00:00", processed_at: "2026-03-02T02:00:00+00:00", failure_reason: null,
        transfer_reference: "TRX-1", admin_note: "ok", processed_by: "33333333-3333-3333-3333-333333333333",
      },
    ],
  });

describe("getAdminDashboardSummary", () => {
  it("menghitung pending, reviewed (≠ pending), dan campaign aktif", async () => {
    const db = fixtures();
    await expect(getAdminDashboardSummary(db as never)).resolves.toEqual({
      pendingSubmissionsCount: 1,
      reviewedSubmissionsCount: 2,
      activeCampaignsCount: 1,
    });
    // count head:true, bukan memuat baris
    expect(db.calls.every((c) => c.count === "exact")).toBe(true);
  });

  it("nol tetap nol (bukan fixture palsu)", async () => {
    await expect(getAdminDashboardSummary(createFakeSupabase() as never)).resolves.toEqual({
      pendingSubmissionsCount: 0,
      reviewedSubmissionsCount: 0,
      activeCampaignsCount: 0,
    });
  });

  it("error database → dilempar", async () => {
    const db = fixtures();
    db.failTable("campaigns", { code: "XX000", message: "boom" });
    await expect(getAdminDashboardSummary(db as never)).rejects.toThrow("[db] XX000");
  });
});

describe("getAdminSubmissionQueue", () => {
  it("status=all: DTO identik Function lama, terbaru dulu, round-trip konstan", async () => {
    const db = fixtures();
    const result = await getAdminSubmissionQueue(db as never, { status: "all", limit: 50 });
    expect(result).toEqual({
      total: 3,
      items: [
        {
          id: "sub-2",
          campaignId: "camp-1",
          creator: { id: CREATOR_NO_PROFILE, name: "Content Creator", username: "@creator", avatarUrl: undefined, tiktokHandle: undefined },
          campaign: { id: "camp-1", title: "Promo Kopi", rewardPer1000Views: 15000, platform: "tiktok" },
          umkm: { id: UMKM, name: "Kopi Senja", ownerName: undefined },
          platform: "tiktok",
          postUrl: "https://tt.test/v/2",
          note: undefined,
          status: "pending",
          submittedAt: "2026-02-03T00:00:00+00:00",
          verifiedViews: 999,
          verifiedAt: undefined,
          verifiedBy: undefined,
          estimatedReward: 0,
          finalReward: 0,
          rejectionReason: undefined,
        },
        {
          id: "sub-1",
          campaignId: "camp-1",
          creator: { id: CREATOR, name: "Rina", username: "@creator", avatarUrl: "https://cdn.test/rina.png", tiktokHandle: undefined },
          campaign: { id: "camp-1", title: "Promo Kopi", rewardPer1000Views: 15000, platform: "instagram" },
          umkm: { id: UMKM, name: "Kopi Senja", ownerName: undefined },
          platform: "instagram",
          postUrl: "https://ig.test/p/1",
          note: "Caption",
          status: "approved",
          submittedAt: "2026-02-01T00:00:00+00:00",
          // views_final → views_count dipakai; floor(12345/1000)*15000
          verifiedViews: 12345,
          verifiedAt: "2026-02-02T00:00:00+00:00",
          verifiedBy: "manual_admin",
          estimatedReward: 180000,
          finalReward: 180000,
          rejectionReason: undefined,
        },
        {
          id: "sub-3",
          campaignId: "camp-missing",
          creator: { id: CREATOR, name: "Rina", username: "@creator", avatarUrl: "https://cdn.test/rina.png", tiktokHandle: undefined },
          campaign: { id: "camp-missing", title: "Campaign Pay-Per-View", rewardPer1000Views: 0, platform: "youtube" },
          umkm: { id: "", name: "UMKM Client", ownerName: undefined },
          platform: "youtube",
          postUrl: "https://yt.test/3",
          note: undefined,
          status: "rejected",
          submittedAt: "2026-01-30T00:00:00+00:00",
          // views_final false → views
          verifiedViews: 4000,
          verifiedAt: undefined,
          verifiedBy: undefined,
          estimatedReward: 0,
          finalReward: 0,
          rejectionReason: "Tidak sesuai brief",
        },
      ],
    });
    expect(db.calls.map((c) => c.table)).toEqual(["campaign_submissions", "campaigns", "creator_profiles", "umkm_profiles"]);
  });

  it("default status pending + limit + total dari count", async () => {
    const db = fixtures();
    const result = await getAdminSubmissionQueue(db as never, {});
    expect(result.items.map((i) => i.id)).toEqual(["sub-2"]);
    expect(result.total).toBe(1);
    expect(db.calls[0].filters).toContain("status.eq.pending");
    const limited = await getAdminSubmissionQueue(fixtures() as never, { status: "all", limit: 1 });
    expect(limited).toMatchObject({ total: 3, items: [{ id: "sub-2" }] });
  });

  it("kosong → { items: [], total: 0 } tanpa query lanjutan", async () => {
    const db = createFakeSupabase();
    await expect(getAdminSubmissionQueue(db as never, { status: "pending" })).resolves.toEqual({ items: [], total: 0 });
    expect(db.calls).toHaveLength(1);
  });

  it.each([
    [{ status: "weird" }, "Status submission tidak valid."],
    [{ limit: 0 }, "Limit harus antara 1 dan 100."],
    [{ limit: 101 }, "Limit harus antara 1 dan 100."],
    [{ limit: Number.NaN }, "Limit harus antara 1 dan 100."],
  ])("input %j → 400", async (input, message) => {
    const err = await getAdminSubmissionQueue(fixtures() as never, input).catch((e: unknown) => e);
    expect(err).toBeInstanceOf(HttpError);
    expect(err).toMatchObject({ status: 400, message });
  });
});

describe("getAdminWithdrawalQueue", () => {
  it("status=all: DTO identik Function lama", async () => {
    await expect(getAdminWithdrawalQueue(fixtures() as never, { status: "all", limit: 100, offset: 0 })).resolves.toEqual({
      total: 2,
      limit: 100,
      offset: 0,
      items: [
        {
          id: "wd-2",
          userId: CREATOR_NO_PROFILE,
          creator: { name: "Content Creator", username: null, avatarUrl: null },
          amount: 50000,
          payoutMethod: "ewallet",
          providerName: "OVO",
          accountNumber: "0812",
          accountName: "X",
          status: "succeeded",
          requestedAt: "2026-03-02T00:00:00+00:00",
          processingAt: "2026-03-02T01:00:00+00:00",
          processedAt: "2026-03-02T02:00:00+00:00",
          failureReason: null,
          transferReference: "TRX-1",
          adminNote: "ok",
          processedBy: "33333333-3333-3333-3333-333333333333",
        },
        {
          id: "wd-1",
          userId: CREATOR,
          creator: { name: "Rina", username: null, avatarUrl: "https://cdn.test/rina.png" },
          amount: 250000,
          payoutMethod: "bank",
          providerName: "BCA",
          accountNumber: "123",
          accountName: "RINA",
          status: "requested",
          requestedAt: "2026-03-01T00:00:00+00:00",
          processingAt: null,
          processedAt: null,
          failureReason: null,
          transferReference: null,
          adminNote: null,
          processedBy: null,
        },
      ],
    });
  });

  it("default status requested; offset → range", async () => {
    await expect(getAdminWithdrawalQueue(fixtures() as never, {})).resolves.toMatchObject({
      total: 1,
      limit: 50,
      offset: 0,
      items: [{ id: "wd-1" }],
    });
    const page2 = await getAdminWithdrawalQueue(fixtures() as never, { status: "all", limit: 1, offset: 1 });
    expect(page2).toMatchObject({ total: 2, limit: 1, offset: 1, items: [{ id: "wd-1" }] });
  });

  it("halaman kosong tetap membawa total", async () => {
    await expect(getAdminWithdrawalQueue(fixtures() as never, { status: "all", offset: 50 })).resolves.toEqual({
      items: [],
      total: 2,
      limit: 50,
      offset: 50,
    });
  });

  it.each([
    [{ status: "all-ish" }, "Status withdrawal tidak valid."],
    [{ limit: 101 }, "Limit harus antara 1 dan 100."],
    [{ offset: -1 }, "Offset harus antara 0 dan 10000."],
    [{ offset: 10001 }, "Offset harus antara 0 dan 10000."],
  ])("input %j → 400", async (input, message) => {
    await expect(getAdminWithdrawalQueue(fixtures() as never, input)).rejects.toMatchObject({ status: 400, message });
  });
});

describe("getAdminRatecardDeliverableQueue", () => {
  it("memetakan baris RPC ke DTO Function lama (satu panggilan RPC, tanpa N+1)", async () => {
    const db = createFakeSupabase();
    db.setRpc("admin_ratecard_deliverable_queue", (args) => {
      expect(args).toEqual({ p_limit: 100 });
      return [
        {
          deliverable_id: "d-2", order_id: "o-1", version: 2, source: "storage", file_url: "https://x.test/2",
          notes: "revisi", submitted_at: "2026-01-03T00:00:00+00:00", creator_id: CREATOR, creator_display_name: "Rina",
          umkm_id: UMKM, umkm_business_name: "Kopi Senja", package_name_snapshot: "Paket A", amount: 150000,
        },
        {
          deliverable_id: "d-9", order_id: "o-2", version: 1, source: "external_url", file_url: "https://x.test/9",
          notes: null, submitted_at: "2026-01-02T00:00:00+00:00", creator_id: CREATOR_NO_PROFILE, creator_display_name: null,
          umkm_id: UMKM, umkm_business_name: null, package_name_snapshot: null, amount: null,
        },
      ];
    });
    await expect(getAdminRatecardDeliverableQueue(db as never)).resolves.toEqual({
      total: 2,
      items: [
        {
          id: "d-2", orderId: "o-1", version: 2, source: "storage", evidenceUrl: "https://x.test/2", notes: "revisi",
          submittedAt: "2026-01-03T00:00:00+00:00", status: "pending", isLatest: true,
          creator: { id: CREATOR, name: "Rina" }, umkm: { id: UMKM, businessName: "Kopi Senja" },
          projectTitle: "Paket A", finalAmount: 150000,
        },
        {
          id: "d-9", orderId: "o-2", version: 1, source: "external_url", evidenceUrl: "https://x.test/9", notes: undefined,
          submittedAt: "2026-01-02T00:00:00+00:00", status: "pending", isLatest: true,
          creator: { id: CREATOR_NO_PROFILE, name: "Content Creator" }, umkm: { id: UMKM, businessName: "UMKM" },
          projectTitle: "Rate Card Order", finalAmount: 0,
        },
      ],
    });
    expect(db.rpc).toHaveBeenCalledTimes(1);
    expect(db.calls).toEqual([]);
  });

  it("error RPC → dilempar", async () => {
    const db = createFakeSupabase();
    await expect(getAdminRatecardDeliverableQueue(db as never)).rejects.toThrow("[db] PGRST202");
  });
});
