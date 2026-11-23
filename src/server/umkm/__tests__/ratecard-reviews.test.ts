import { describe, expect, it } from "vitest";

import { HttpError } from "@/server/http";
import { getUmkmRatecardReviews } from "@/server/umkm/ratecard-reviews";
import { createFakeSupabase } from "@/test/fake-supabase";

const UMKM = "11111111-1111-4111-8111-111111111111";
const CR1 = "22222222-2222-4222-8222-222222222222";

/** Keluaran RPC `umkm_ratecard_review_context` (orders sudah created_at desc). */
const CONTEXT = {
  orders: [
    {
      id: "ord2", offer_id: null, package_id: "pk1", package_name_snapshot: null, package_price_snapshot: null,
      creator_id: CR1, amount: 250000, status: "pending_payment", revision_limit: 0, created_at: "2026-11-09T00:00:00+00:00",
    },
    {
      id: "ord1", offer_id: "off1", package_id: "pk1", package_name_snapshot: "Paket Basic", package_price_snapshot: 240000,
      creator_id: CR1, amount: 300000, status: "revision", revision_limit: 0, created_at: "2026-11-08T00:00:00+00:00",
    },
  ],
  offers: [{ id: "off1", conversation_id: "conv1", title: "Video Review", description: "1 video 60 detik", revision_limit: 2 }],
  creators: [{ user_id: CR1, display_name: "Budi Kreator", avatar_url: "https://cdn/budi.png" }],
  packages: [{ id: "pk1", name: "Paket Basic Live", description: "desk paket", output: "1 video", delivery_days: 5, price: 250000, revision_limit: 3 }],
  escrows: [{ order_id: "ord1", status: "held" }],
  deliverables: [
    { id: "dlv1", order_id: "ord1", version: 1, status: "revision_requested", source: "external_url", file_url: "https://t/1", notes: null, created_at: "2026-11-10T00:00:00+00:00" },
    { id: "dlv2", order_id: "ord1", version: 2, status: "submitted", source: "storage", file_url: "https://t/2", notes: "revisi", created_at: "2026-11-12T00:00:00+00:00" },
  ],
  revisions: [
    { id: "rev1", order_id: "ord1", message: "Tolong ganti musik", status: "resolved", created_at: "2026-11-11T00:00:00+00:00" },
  ],
  validations: [
    { deliverable_id: "dlv1", status: "invalid", review_notes: "Link mati", reviewed_at: "2026-11-10T05:00:00+00:00", created_at: "2026-11-10T05:00:00+00:00" },
  ],
};

const DLV2 = { id: "dlv2", version: 2, status: "submitted", source: "storage", fileUrl: "https://t/2", notes: "revisi", createdAt: "2026-11-12T00:00:00+00:00" };
const DLV1 = { id: "dlv1", version: 1, status: "revision_requested", source: "external_url", fileUrl: "https://t/1", notes: "", createdAt: "2026-11-10T00:00:00+00:00" };

const EXPECTED_ORD1 = {
  orderId: "ord1",
  conversationId: "conv1",
  creatorId: CR1,
  creatorName: "Budi Kreator",
  creatorAvatarUrl: "https://cdn/budi.png",
  projectTitle: "Video Review",
  scope: "1 video 60 detik",
  packageContext: { id: "pk1", name: "Paket Basic", description: "desk paket", output: "1 video", deliveryDays: 5, basePrice: 240000 },
  amount: 300000,
  orderStatus: "revision",
  escrowStatus: "held",
  revisionCount: 1,
  revisionLimit: 2,
  latestDeliverable: DLV2,
  // Validasi hanya untuk deliverable terbaru (dlv2 belum divalidasi).
  validation: { status: "pending" },
  deliverableHistory: [DLV2, DLV1],
  revisionHistory: [{ id: "rev1", message: "Tolong ganti musik", status: "resolved", createdAt: "2026-11-11T00:00:00+00:00" }],
  createdAt: "2026-11-08T00:00:00+00:00",
};

const EXPECTED_ORD2 = {
  orderId: "ord2",
  conversationId: "",
  creatorId: CR1,
  creatorName: "Budi Kreator",
  creatorAvatarUrl: "https://cdn/budi.png",
  projectTitle: "Paket Basic Live",
  scope: "desk paket",
  packageContext: { id: "pk1", name: "Paket Basic Live", description: "desk paket", output: "1 video", deliveryDays: 5, basePrice: 250000 },
  amount: 250000,
  orderStatus: "pending_payment",
  escrowStatus: "",
  revisionCount: 0,
  revisionLimit: 3,
  latestDeliverable: null,
  validation: { status: "pending" },
  deliverableHistory: [],
  revisionHistory: [],
  createdAt: "2026-11-09T00:00:00+00:00",
};

function dbWith(context: unknown) {
  const db = createFakeSupabase();
  db.setRpc("umkm_ratecard_review_context", () => context);
  return db;
}

describe("getUmkmRatecardReviews (snapshot get-umkm-ratecard-reviews)", () => {
  it("daftar: DTO lengkap mengikuti urutan RPC", async () => {
    const db = dbWith(CONTEXT);
    await expect(getUmkmRatecardReviews({ db: db as never, userId: UMKM })).resolves.toEqual([EXPECTED_ORD2, EXPECTED_ORD1]);
    expect(db.rpc).toHaveBeenCalledWith("umkm_ratecard_review_context", { p_umkm_id: UMKM, p_order_id: null });
  });

  it("validasi deliverable terbaru dipetakan; status asing → pending", async () => {
    const db = dbWith({
      ...CONTEXT,
      orders: [CONTEXT.orders[1]],
      validations: [{ deliverable_id: "dlv2", status: "valid", review_notes: "", reviewed_at: "2026-11-13T00:00:00+00:00", created_at: "2026-11-13T00:00:00+00:00" }],
    });
    const review = await getUmkmRatecardReviews({ db: db as never, userId: UMKM }, "ord1");
    expect(review).toEqual({ ...EXPECTED_ORD1, validation: { status: "valid", reviewNotes: undefined, reviewedAt: "2026-11-13T00:00:00+00:00" } });
    expect(db.rpc).toHaveBeenCalledWith("umkm_ratecard_review_context", { p_umkm_id: UMKM, p_order_id: "ord1" });
  });

  it("orderId format salah → 400 tanpa query", async () => {
    const db = dbWith(CONTEXT);
    const err = await getUmkmRatecardReviews({ db: db as never, userId: UMKM }, "../etc").catch((e: unknown) => e);
    expect(err).toBeInstanceOf(HttpError);
    expect(err).toMatchObject({ status: 400, message: "Order ID tidak valid." });
    expect(db.rpc).not.toHaveBeenCalled();
  });

  it("UUID lolos validasi format", async () => {
    const db = dbWith({ ...CONTEXT, orders: [] });
    const err = await getUmkmRatecardReviews({ db: db as never, userId: UMKM }, "9b2f1c3e-0a4d-4e5f-8a6b-7c8d9e0f1a2b").catch((e: unknown) => e);
    expect(err).toMatchObject({ status: 404, message: "Review pekerjaan tidak ditemukan." });
  });

  it("tanpa order → []", async () => {
    const db = dbWith({ ...CONTEXT, orders: [] });
    await expect(getUmkmRatecardReviews({ db: db as never, userId: UMKM })).resolves.toEqual([]);
  });
});
