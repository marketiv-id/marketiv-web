import { describe, expect, it } from "vitest";

import { getUmkmDashboardSummary } from "@/server/umkm/dashboard-summary";
import { getUmkmFinanceSummary } from "@/server/umkm/finance-summary";
import { getUmkmProfile } from "@/server/umkm/profile";
import { HttpError } from "@/server/http";
import { createFakeSupabase } from "@/test/fake-supabase";

const UMKM = "11111111-1111-4111-8111-111111111111";

// Bentuk respons RPC 0015 (diverifikasi terhadap Postgres di
// supabase/tests/read_umkm.test.sql dengan fixture yang sama).
const DASHBOARD = {
  activeCampaigns: 1,
  completedCampaigns: 1,
  totalViews: 1500,
  totalSpent: 350000,
  escrowBalance: 450000,
  pendingSubmissions: 1,
  activeNegotiations: 3,
  pendingPayments: 1,
  isTruncated: false,
};

const FINANCE = {
  finance: {
    totalExpenses: 515000,
    escrowBalance: 450000,
    pendingPayments: 102000,
    refundsReceived: 25000,
    platformFees: 15000,
    successfulTransactionsCount: 2,
    isTruncated: false,
  },
  escrow: {
    activeEscrow: 450000,
    pendingRelease: 150000,
    refundEligible: 20000,
    campaignEscrow: 200000,
    rateCardEscrow: 250000,
    isTruncated: false,
  },
};

describe("getUmkmDashboardSummary", () => {
  it("meneruskan DTO dari RPC umkm_dashboard_summary dengan userId sesi", async () => {
    const db = createFakeSupabase();
    db.setRpc("umkm_dashboard_summary", () => DASHBOARD);
    await expect(getUmkmDashboardSummary({ db: db as never, userId: UMKM })).resolves.toEqual(DASHBOARD);
    expect(db.rpc).toHaveBeenCalledWith("umkm_dashboard_summary", { p_umkm_id: UMKM });
  });

  it("error RPC → dilempar (route menjawab 500 generik)", async () => {
    const db = createFakeSupabase();
    db.setRpc("umkm_dashboard_summary", () => {
      throw Object.assign(new Error("boom"), { code: "XX000" });
    });
    await expect(getUmkmDashboardSummary({ db: db as never, userId: UMKM })).rejects.toThrow("[db] XX000");
  });
});

describe("getUmkmFinanceSummary", () => {
  it("bentuk { finance, escrow } dari RPC umkm_finance_summary", async () => {
    const db = createFakeSupabase();
    db.setRpc("umkm_finance_summary", () => FINANCE);
    await expect(getUmkmFinanceSummary({ db: db as never, userId: UMKM })).resolves.toEqual(FINANCE);
    expect(db.rpc).toHaveBeenCalledWith("umkm_finance_summary", { p_umkm_id: UMKM });
  });
});

describe("getUmkmProfile", () => {
  const seed = {
    umkm_profiles: [
      { id: "p1", user_id: UMKM, business_name: "Kopi Senja", city: "Bandung", logo_url: "https://cdn/logo.png", is_profile_completed: true },
      { id: "p2", user_id: "other", business_name: "Lain", city: "X", logo_url: null, is_profile_completed: false },
    ],
  };

  it("menggabungkan users + umkm_profiles + akun Auth (snapshot get-umkm-profile)", async () => {
    const db = createFakeSupabase(seed);
    const profile = await getUmkmProfile(
      { db: db as never, userId: UMKM },
      { user_metadata: { display_name: "Rina" }, email: "auth@example.test", phone: "62811" },
      { email: "rina@example.test", phone: "08123" },
    );
    expect(profile).toEqual({
      id: UMKM,
      businessName: "Kopi Senja",
      ownerName: "Rina",
      email: "rina@example.test",
      whatsappNumber: "08123",
      location: "Bandung",
      avatarUrl: "https://cdn/logo.png",
      isVerified: true,
    });
    expect(db.calls).toEqual([{ table: "umkm_profiles", filters: [`user_id.eq.${UMKM}`], count: undefined }]);
  });

  it("fallback: ownerName → businessName, email/phone → akun Auth, kolom null → ''", async () => {
    const db = createFakeSupabase({
      umkm_profiles: [{ id: "p1", user_id: UMKM, business_name: "Kopi Senja", city: null, logo_url: null, is_profile_completed: false }],
    });
    const profile = await getUmkmProfile(
      { db: db as never, userId: UMKM },
      { user_metadata: {}, email: "auth@example.test", phone: "62811" },
      { email: "", phone: null },
    );
    expect(profile).toEqual({
      id: UMKM,
      businessName: "Kopi Senja",
      ownerName: "Kopi Senja",
      email: "auth@example.test",
      whatsappNumber: "62811",
      location: "",
      avatarUrl: "",
      isVerified: false,
    });
  });

  it("profil belum ada → 404 'UMKM profile not found'", async () => {
    const db = createFakeSupabase({ umkm_profiles: [] });
    const err = await getUmkmProfile({ db: db as never, userId: UMKM }, null, null).catch((e: unknown) => e);
    expect(err).toBeInstanceOf(HttpError);
    expect(err).toMatchObject({ status: 404, message: "UMKM profile not found" });
  });
});
