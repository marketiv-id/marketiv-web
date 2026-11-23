import { afterEach, describe, expect, it, vi } from "vitest";

import { getCreatorDashboardSummary } from "@/server/creator/dashboard-summary";
import { clampLimit, getCreatorDirectoryEntry, getCreatorDirectoryPage } from "@/server/creator/directory";
import { getCreatorNegotiation, listCreatorNegotiations, type NegotiationRow } from "@/server/creator/negotiations";
import { getCreatorProfile } from "@/server/creator/profile";
import type { ReadDb } from "@/server/creator/shared";
import { createFakeSupabase, type FakeSupabase } from "@/test/fake-supabase";

/**
 * "Snapshot" DTO: nilai yang diharapkan dihitung manual dari logika
 * 00_BACKEND/functions/get-creator-* /src/main.js untuk fixture yang sama.
 */

const K = "11111111-1111-4111-8111-111111111111";
const K2 = "22222222-2222-4222-8222-222222222222";
const K3 = "33333333-3333-4333-8333-333333333333";

const asDb = (fake: FakeSupabase) => fake as unknown as ReadDb;

/** Implementasi JS RPC 0016 untuk fake (perilaku SQL diuji pgTAP). */
function registerPriceRpc(fake: FakeSupabase) {
  fake.setRpc("creator_starting_prices", (args) => {
    const ids = args.p_creator_ids as string[];
    const cards = fake.tables.rate_cards.filter((c) => ids.includes(String(c.creator_id)) && c.status === "published");
    const out = new Map<string, number>();
    for (const pkg of fake.tables.rate_card_packages) {
      const card = cards.find((c) => c.id === pkg.rate_card_id);
      const price = Number(pkg.price);
      if (!card || price <= 0) continue;
      const cur = out.get(String(card.creator_id));
      if (cur === undefined || price < cur) out.set(String(card.creator_id), price);
    }
    return [...out].map(([creator_id, starting_price]) => ({ creator_id, starting_price }));
  });
}

function seed() {
  const fake = createFakeSupabase({
    creator_profiles: [
      { id: "cp-k", user_id: K, display_name: "Kreator Satu", avatar_url: "https://a/k.png", banner_url: null, niche: "Kuliner", bio: "Bio K", city: "Bandung", total_followers: 1200, total_orders: 7, rating: 4.5, is_profile_completed: true },
      { id: "cp-k2", user_id: K2, display_name: "Kreator Dua", avatar_url: null, banner_url: "https://b/k2.png", niche: null, bio: null, city: null, total_followers: 0, total_orders: 0, rating: 4.5, is_profile_completed: true },
      { id: "cp-k3", user_id: K3, display_name: "Top", niche: "travel", rating: 4.9, total_orders: 3, is_profile_completed: true },
      { id: "cp-x", user_id: "44444444-4444-4444-8444-444444444444", display_name: "Belum", rating: 5, is_profile_completed: false },
    ],
    creator_social_accounts: [
      { id: "s1", creator_id: K, platform: "instagram", username: "@k.ig", followers: 9000, engagement_rate: 2.5, created_at: "2026-01-01" },
      { id: "s2", creator_id: K, platform: "tiktok", username: "k.tt", followers: 100, engagement_rate: 7.25, created_at: "2026-01-02" },
      { id: "s3", creator_id: K2, platform: "instagram", username: "k2a", followers: 50, engagement_rate: 1, created_at: "2026-01-01" },
      { id: "s4", creator_id: K2, platform: "youtube", username: "k2b", followers: 80, engagement_rate: 3, created_at: "2026-01-02" },
    ],
    rate_cards: [
      { id: "rc1", creator_id: K, status: "published" },
      { id: "rc2", creator_id: K, status: "draft" },
      { id: "rc3", creator_id: K3, status: "published" },
    ],
    rate_card_packages: [
      { id: "p1", rate_card_id: "rc1", price: 75000 },
      { id: "p2", rate_card_id: "rc1", price: 0 },
      { id: "p3", rate_card_id: "rc1", price: 50000 },
      { id: "p4", rate_card_id: "rc2", price: 10000 },
      { id: "p5", rate_card_id: "rc3", price: 120000 },
    ],
  });
  registerPriceRpc(fake);
  fake.setRpc("creator_directory_page", (args) => {
    const limit = Number(args.p_limit);
    const cursor = args.p_cursor as string | null;
    const sorted = fake.tables.creator_profiles
      .filter((p) => p.is_profile_completed === true)
      .sort((a, b) => Number(b.rating) - Number(a.rating) || String(a.id).localeCompare(String(b.id)));
    const start = cursor ? sorted.findIndex((p) => p.id === cursor) + 1 : 0;
    if (cursor && start === 0) throw Object.assign(new Error("cursor tidak dikenal"), { code: "22023" });
    return { items: sorted.slice(start, start + limit), total: sorted.length };
  });
  return fake;
}

describe("getCreatorProfile (get-creator-profile)", () => {
  it("DTO pemilik: nama Auth, akun TikTok sebagai wakil, harga mulai published termurah", async () => {
    const fake = seed();
    const dto = await getCreatorProfile({ db: asDb(fake), user: { id: K, user_metadata: { display_name: "Nama Akun" } } });
    expect(dto).toEqual({
      id: K,
      name: "Nama Akun",
      username: "k.tt",
      avatarUrl: "https://a/k.png",
      bannerUrl: "",
      niche: "kuliner",
      bio: "Bio K",
      location: "Bandung",
      followers: 1200,
      startingPrice: 50000,
      rating: 4.5,
      completedJobs: 7,
      engagementRate: 7.25,
      instagramUrl: "https://www.instagram.com/k.ig",
      tiktokUrl: "https://www.tiktok.com/@k.tt",
      isVerified: true,
      isOnboarded: true,
    });
    // filter kepemilikan dipasang
    expect(fake.calls).toContainEqual(expect.objectContaining({ table: "creator_profiles", filters: [`user_id.eq.${K}`] }));
  });

  it("tanpa nama Auth → displayName; tanpa TikTok → follower terbanyak; tanpa harga → 0", async () => {
    const dto = await getCreatorProfile({ db: asDb(seed()), user: { id: K2, user_metadata: {} } });
    expect(dto).toEqual({
      id: K2,
      name: "Kreator Dua",
      username: "k2b",
      avatarUrl: "",
      bannerUrl: "https://b/k2.png",
      niche: "lainnya",
      bio: "",
      location: "",
      followers: 0,
      startingPrice: 0,
      rating: 4.5,
      completedJobs: 0,
      engagementRate: 3,
      instagramUrl: "https://www.instagram.com/k2a",
      tiktokUrl: undefined,
      isVerified: true,
      isOnboarded: true,
    });
  });

  it("profil tidak ada → 404", async () => {
    await expect(
      getCreatorProfile({ db: asDb(seed()), user: { id: "55555555-5555-4555-8555-555555555555", user_metadata: {} } }),
    ).rejects.toMatchObject({ status: 404 });
  });

  it("error DB → dilempar (route menjadikannya 500)", async () => {
    const fake = seed();
    fake.failTable("creator_profiles", { code: "XX000", message: "boom" });
    await expect(getCreatorProfile({ db: asDb(fake), user: { id: K, user_metadata: {} } })).rejects.toThrow(/XX000/);
  });
});

describe("get-creator-directory", () => {
  const k3Item = {
    id: K3, name: "Top", username: "", avatarUrl: "", bannerUrl: "", niche: "lainnya", bio: "", location: "",
    startingPrice: 120000, rating: 4.9, completedJobs: 3, engagementRate: 0, isVerified: true,
  };
  const kItem = {
    id: K, name: "Kreator Satu", username: "k.tt", avatarUrl: "https://a/k.png", bannerUrl: "", niche: "kuliner",
    bio: "Bio K", location: "Bandung", startingPrice: 50000, rating: 4.5, completedJobs: 7, engagementRate: 7.25, isVerified: true,
  };

  it("halaman: profil lengkap, rating desc, nextCursor = id profil terakhir bila penuh", async () => {
    const fake = seed();
    const page = await getCreatorDirectoryPage({ db: asDb(fake), limit: 2 });
    expect(page).toEqual({ items: [k3Item, kItem], total: 3, nextCursor: "cp-k" });
    expect(fake.rpc).toHaveBeenCalledWith("creator_directory_page", { p_limit: 2, p_cursor: null });

    const next = await getCreatorDirectoryPage({ db: asDb(fake), limit: 2, cursor: "cp-k" });
    expect(next.items.map((i) => i.id)).toEqual([K2]);
    expect(next.nextCursor).toBeNull();
  });

  it("limit default 100 & kuirk lama: limit > 100 → halaman 100, tanpa nextCursor", async () => {
    const pageCall = async (limit?: number) => {
      const fake = seed();
      const page = await getCreatorDirectoryPage({ db: asDb(fake), limit });
      return { page, call: fake.rpc.mock.calls.find((c) => c[0] === "creator_directory_page") };
    };
    const byDefault = await pageCall();
    expect(byDefault.call).toEqual(["creator_directory_page", { p_limit: 100, p_cursor: null }]);
    const big = await pageCall(300);
    expect(big.call).toEqual(["creator_directory_page", { p_limit: 100, p_cursor: null }]);
    expect(big.page.nextCursor).toBeNull();
    expect(clampLimit(-1)).toBe(100);
    expect(clampLimit(2.7)).toBe(2);
    expect(clampLimit(99999)).toBe(5000);
  });

  it("cursor tidak dikenal → 400", async () => {
    await expect(getCreatorDirectoryPage({ db: asDb(seed()), cursor: "zzz" })).rejects.toMatchObject({ status: 400 });
  });

  it("creatorId → satu profil (tanpa syarat profil lengkap)", async () => {
    expect(await getCreatorDirectoryEntry({ db: asDb(seed()), creatorId: K })).toEqual(kItem);
    const incomplete = await getCreatorDirectoryEntry({ db: asDb(seed()), creatorId: "44444444-4444-4444-8444-444444444444" });
    expect(incomplete).toMatchObject({ name: "Belum", isVerified: false, rating: 5 });
  });

  it("creatorId tidak ada / bukan UUID → 404 tanpa query rusak", async () => {
    const fake = seed();
    await expect(getCreatorDirectoryEntry({ db: asDb(fake), creatorId: "55555555-5555-4555-8555-555555555555" })).rejects.toMatchObject({ status: 404 });
    await expect(getCreatorDirectoryEntry({ db: asDb(fake), creatorId: "appwrite-id-lama" })).rejects.toMatchObject({ status: 404 });
  });
});

describe("getCreatorDashboardSummary (get-creator-dashboard-summary)", () => {
  it("meneruskan agregasi RPC sebagai CreatorMetric lengkap", async () => {
    const fake = createFakeSupabase();
    fake.setRpc("creator_dashboard_summary", () => ({
      availableJobsCount: 2, activeJobsCount: 1, pendingSubmissionsCount: 1, balance: 150000, pendingPayouts: 20000,
      validatedViewsCount: 1200, activeRateCardsCount: 1, negotiationOrdersCount: 1, escrowBalance: 50000,
      totalEarnings: 79000, thisMonthEarnings: 30000, campaignEarnings: 30000, rateCardEarnings: 49000,
    }));
    expect(await getCreatorDashboardSummary({ db: asDb(fake), userId: K })).toEqual({
      availableJobsCount: 2, activeJobsCount: 1, pendingSubmissionsCount: 1, balance: 150000, pendingPayouts: 20000,
      validatedViewsCount: 1200, activeRateCardsCount: 1, negotiationOrdersCount: 1, escrowBalance: 50000,
      totalEarnings: 79000, thisMonthEarnings: 30000, campaignEarnings: 30000, rateCardEarnings: 49000,
    });
    expect(fake.rpc).toHaveBeenCalledWith("creator_dashboard_summary", { p_user_id: K });
  });

  it("nilai kosong/aneh → 0", async () => {
    const fake = createFakeSupabase();
    fake.setRpc("creator_dashboard_summary", () => ({ balance: null, escrowBalance: "12" }));
    const m = await getCreatorDashboardSummary({ db: asDb(fake), userId: K });
    expect(m.balance).toBe(0);
    expect(m.escrowBalance).toBe(12);
    expect(m.availableJobsCount).toBe(0);
  });
});

describe("get-creator-negotiations", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  const conv = (id: string, extra: Record<string, unknown> = {}) => ({
    id, umkm_id: "u-1", creator_id: K, last_message: "halo", last_message_at: "2026-11-20T10:00:00+00:00",
    creator_archived: false, umkm_archived: true, ...extra,
  });

  const rowWithOrder: NegotiationRow = {
    conversation: conv("conv-1"),
    offer: { id: "off-new", status: "accepted", title: "Video promo", description: "2 video", price: 50000, deadline: "2026-12-05T00:00:00+00:00", revision_limit: 2, package_id: "pkg-a", package_name_snapshot: "Paket A", package_price_snapshot: 45000 },
    order: { id: "ord-1", status: "in_progress", amount: 50000, package_id: "pkg-a", package_name_snapshot: null, package_price_snapshot: null },
    package: { id: "pkg-a", name: "Paket A", description: "desc A", output: "1 video 60 detik", revision_limit: 3 },
    umkm: { business_name: "Toko U", logo_url: "https://x/logo.png" },
    escrow: { status: "held" },
    deliverable: { id: "dlv-2", file_url: "https://v/2", version: 2 },
    validation: { status: "invalid", reviewed_at: "2026-11-21T00:00:00+00:00", review_notes: "Link mati" },
    unread_count: 2,
  };
  const rowChatOnly: NegotiationRow = {
    conversation: conv("conv-2", { last_message: null, last_message_at: null, creator_archived: true }),
    offer: null, order: null, package: null, umkm: null, escrow: null, deliverable: null, validation: null, unread_count: 0,
  };

  function negotiationsDb(rows: NegotiationRow[]) {
    const fake = createFakeSupabase();
    fake.setRpc("creator_negotiation_rows", (args) =>
      rows.filter((r) => !args.p_conversation_id || r.conversation.id === args.p_conversation_id),
    );
    return fake;
  }

  it("DTO lengkap per percakapan (fee seller-side 2%)", async () => {
    const fake = negotiationsDb([rowWithOrder, rowChatOnly]);
    const list = await listCreatorNegotiations({ db: asDb(fake), userId: K });
    expect(fake.rpc).toHaveBeenCalledWith("creator_negotiation_rows", { p_user_id: K, p_conversation_id: null });
    expect(list).toEqual([
      {
        id: "conv-1", conversationId: "conv-1", stage: "in_progress",
        umkmId: "u-1", umkmName: "Toko U", umkmAvatarUrl: "https://x/logo.png",
        lastMessage: "halo", lastMessageAt: "2026-11-20T10:00:00+00:00", unreadCount: 2, isArchived: false,
        offerId: "off-new", offerStatus: "accepted", projectTitle: "Video promo", scope: "2 video",
        deadline: "2026-12-05T00:00:00+00:00", revisionCount: 2,
        // order.package_name_snapshot null → snapshot offer; harga: order null → offer
        packageContext: { id: "pkg-a", name: "Paket A", basePrice: 45000 },
        orderId: "ord-1", orderStatus: "in_progress", escrowStatus: "held",
        deliverables: "1 video 60 detik", submittedCollabUrl: "https://v/2",
        deliverableValidation: { status: "invalid", reviewedAt: "2026-11-21T00:00:00+00:00", reviewNotes: "Link mati" },
        finalPrice: 50000, platformFee: 1000, totalAmount: 49000,
      },
      {
        id: "conv-2", conversationId: "conv-2", stage: "chatting",
        umkmId: "u-1", umkmName: "", umkmAvatarUrl: "",
        lastMessage: "", lastMessageAt: "", unreadCount: 0, isArchived: true,
        offerId: undefined, offerStatus: undefined, projectTitle: "", scope: "", deadline: "", revisionCount: undefined,
        packageContext: undefined, orderId: undefined, orderStatus: undefined, escrowStatus: undefined,
        deliverables: undefined, submittedCollabUrl: undefined, deliverableValidation: { status: "pending" },
        finalPrice: 0, platformFee: 0, totalAmount: 0,
      },
    ]);
  });

  it("tahap offer & FEE_RATE dari env; fee dibulatkan ke bawah", async () => {
    vi.stubEnv("FEE_RATE", "0.05");
    const pending: NegotiationRow = { ...rowChatOnly, conversation: conv("c-p"), offer: { id: "o", status: "pending", price: 33333 } };
    const rejected: NegotiationRow = { ...rowChatOnly, conversation: conv("c-r"), offer: { id: "o2", status: "rejected", price: 0 } };
    const accepted: NegotiationRow = { ...rowChatOnly, conversation: conv("c-a"), offer: { id: "o3", status: "accepted", price: 100 } };
    const list = await listCreatorNegotiations({ db: asDb(negotiationsDb([pending, rejected, accepted])), userId: K });
    expect(list.map((n) => n.stage)).toEqual(["offer_pending", "offer_rejected", "awaiting_order"]);
    expect(list[0]).toMatchObject({ finalPrice: 33333, platformFee: 1666, totalAmount: 31667 });
  });

  it("conversationId → satu objek; bukan milik kreator → 404", async () => {
    const fake = negotiationsDb([rowWithOrder]);
    const one = await getCreatorNegotiation({ db: asDb(fake), userId: K, conversationId: "conv-1" });
    expect(one.id).toBe("conv-1");
    expect(fake.rpc).toHaveBeenLastCalledWith("creator_negotiation_rows", { p_user_id: K, p_conversation_id: "conv-1" });
    await expect(getCreatorNegotiation({ db: asDb(fake), userId: K, conversationId: "conv-lain" })).rejects.toMatchObject({ status: 404 });
  });
});
