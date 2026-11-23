import { describe, expect, it } from "vitest";

import { HttpError } from "@/server/http";
import { getUmkmNegotiations } from "@/server/umkm/negotiations";
import { createFakeSupabase } from "@/test/fake-supabase";

const UMKM = "11111111-1111-4111-8111-111111111111";
const CR1 = "22222222-2222-4222-8222-222222222222";
const CR2 = "33333333-3333-4333-8333-333333333333";

/**
 * Keluaran RPC `umkm_negotiation_context` untuk fixture kecil (offer TERBARU
 * per percakapan dan deliverable versi TERTINGGI sudah dipilih SQL — diuji di
 * supabase/tests/read_umkm.test.sql). Urutan conversations = created_at desc.
 */
const CONTEXT = {
  conversations: [
    { id: "conv3", umkm_id: UMKM, creator_id: CR2, last_message: null, last_message_at: null, umkm_archived: true, created_at: "2026-11-03T00:00:00+00:00" },
    { id: "conv2", umkm_id: UMKM, creator_id: CR2, last_message: "Gimana?", last_message_at: "2026-11-10T09:00:00+00:00", umkm_archived: false, created_at: "2026-11-02T00:00:00+00:00" },
    { id: "conv1", umkm_id: UMKM, creator_id: CR1, last_message: "Sudah kirim", last_message_at: "2026-11-12T09:00:00+00:00", umkm_archived: false, created_at: "2026-11-01T00:00:00+00:00" },
  ],
  unread: [{ conversation_id: "conv1", count: 2 }],
  offers: [
    {
      id: "off1b", conversation_id: "conv1", title: "Video Review", description: "1 video 60 detik", price: 300000,
      deadline: "2026-11-20T00:00:00+00:00", revision_limit: 2, package_id: "pk1", package_name_snapshot: "Paket Basic",
      package_price_snapshot: 250000, status: "accepted", created_at: "2026-11-05T00:00:00+00:00",
    },
    {
      id: "off2", conversation_id: "conv2", title: "", description: null, price: 150000,
      deadline: "2026-11-25T00:00:00+00:00", revision_limit: 1, package_id: null, package_name_snapshot: null,
      package_price_snapshot: null, status: "pending", created_at: "2026-11-06T00:00:00+00:00",
    },
  ],
  creators: [
    { user_id: CR1, display_name: "Budi Kreator", avatar_url: "https://cdn/budi.png" },
    { user_id: CR2, display_name: "Sari", avatar_url: null },
  ],
  orders: [
    {
      id: "ord1", offer_id: "off1b", package_id: "pk1", package_name_snapshot: "Paket Basic (order)",
      package_price_snapshot: 250000, amount: 300000, status: "in_progress",
    },
  ],
  packages: [{ id: "pk1", name: "Paket Basic", description: "desk paket", output: "1 video TikTok", revision_limit: 3 }],
  escrows: [{ order_id: "ord1", status: "held" }],
  deliverables: [{ id: "dlv2", order_id: "ord1", version: 2, file_url: "https://tiktok.com/v/2" }],
  validations: [{ deliverable_id: "dlv2", status: "valid", reviewed_at: "2026-11-13T00:00:00+00:00", review_notes: null }],
};

const EXPECTED_CONV1 = {
  id: "conv1",
  conversationId: "conv1",
  stage: "in_progress",
  creatorId: CR1,
  creatorName: "Budi Kreator",
  creatorAvatarUrl: "https://cdn/budi.png",
  lastMessage: "Sudah kirim",
  lastMessageAt: "2026-11-12T09:00:00+00:00",
  unreadCount: 2,
  isArchived: false,
  offerId: "off1b",
  offerStatus: "accepted",
  projectTitle: "Video Review",
  scope: "1 video 60 detik",
  deadline: "2026-11-20T00:00:00+00:00",
  revisionCount: 2,
  packageContext: { id: "pk1", name: "Paket Basic (order)", basePrice: 250000 },
  orderId: "ord1",
  orderStatus: "in_progress",
  escrowStatus: "held",
  deliverables: "1 video TikTok",
  submittedCollabUrl: "https://tiktok.com/v/2",
  deliverableValidation: { status: "valid", reviewedAt: "2026-11-13T00:00:00+00:00", reviewNotes: undefined },
  finalPrice: 300000,
  platformFee: 0,
  totalAmount: 300000,
};

const EXPECTED_CONV2 = {
  id: "conv2",
  conversationId: "conv2",
  stage: "offer_pending",
  creatorId: CR2,
  creatorName: "Sari",
  creatorAvatarUrl: "",
  lastMessage: "Gimana?",
  lastMessageAt: "2026-11-10T09:00:00+00:00",
  unreadCount: 0,
  isArchived: false,
  offerId: "off2",
  offerStatus: "pending",
  projectTitle: "",
  scope: "",
  deadline: "2026-11-25T00:00:00+00:00",
  revisionCount: 1,
  packageContext: undefined,
  orderId: undefined,
  orderStatus: undefined,
  escrowStatus: undefined,
  deliverables: undefined,
  submittedCollabUrl: undefined,
  deliverableValidation: { status: "pending" },
  finalPrice: 150000,
  platformFee: 0,
  totalAmount: 150000,
};

const EXPECTED_CONV3 = {
  id: "conv3",
  conversationId: "conv3",
  stage: "chatting",
  creatorId: CR2,
  creatorName: "Sari",
  creatorAvatarUrl: "",
  lastMessage: "",
  lastMessageAt: "",
  unreadCount: 0,
  isArchived: true,
  offerId: undefined,
  offerStatus: undefined,
  projectTitle: "",
  scope: "",
  deadline: "",
  revisionCount: undefined,
  packageContext: undefined,
  orderId: undefined,
  orderStatus: undefined,
  escrowStatus: undefined,
  deliverables: undefined,
  submittedCollabUrl: undefined,
  deliverableValidation: { status: "pending" },
  finalPrice: 0,
  platformFee: 0,
  totalAmount: 0,
};

function dbWith(context: unknown) {
  const db = createFakeSupabase();
  db.setRpc("umkm_negotiation_context", () => context);
  return db;
}

describe("getUmkmNegotiations (snapshot get-umkm-negotiations)", () => {
  it("daftar: DTO lengkap, diurutkan lastMessageAt desc (kosong di akhir)", async () => {
    const db = dbWith(CONTEXT);
    const result = await getUmkmNegotiations({ db: db as never, userId: UMKM });
    expect(result).toEqual([EXPECTED_CONV1, EXPECTED_CONV2, EXPECTED_CONV3]);
    // JSON route: field undefined hilang, sama seperti res.json Appwrite.
    expect(Object.keys(JSON.parse(JSON.stringify((result as unknown[])[2])))).not.toContain("offerId");
    expect(db.rpc).toHaveBeenCalledWith("umkm_negotiation_context", { p_umkm_id: UMKM, p_conversation_id: null });
  });

  it("stage dari status offer: accepted → awaiting_order, rejected → offer_rejected", async () => {
    const base = { ...CONTEXT, conversations: [CONTEXT.conversations[1]], orders: [], unread: [] };
    const accepted = await getUmkmNegotiations({ db: dbWith({ ...base, offers: [{ ...CONTEXT.offers[1], status: "accepted" }] }) as never, userId: UMKM });
    const rejected = await getUmkmNegotiations({ db: dbWith({ ...base, offers: [{ ...CONTEXT.offers[1], status: "rejected" }] }) as never, userId: UMKM });
    expect((accepted as { stage: string }[])[0].stage).toBe("awaiting_order");
    expect((rejected as { stage: string }[])[0].stage).toBe("offer_rejected");
  });

  it("conversationId: satu objek, RPC menerima filter", async () => {
    const db = dbWith({ ...CONTEXT, conversations: [CONTEXT.conversations[2]] });
    const result = await getUmkmNegotiations({ db: db as never, userId: UMKM }, "conv1");
    expect(result).toEqual(EXPECTED_CONV1);
    expect(db.rpc).toHaveBeenCalledWith("umkm_negotiation_context", { p_umkm_id: UMKM, p_conversation_id: "conv1" });
  });

  it("conversationId tidak ditemukan / milik UMKM lain → 404 'Negotiation not found'", async () => {
    const db = dbWith({ ...CONTEXT, conversations: [] });
    const err = await getUmkmNegotiations({ db: db as never, userId: UMKM }, "foreign").catch((e: unknown) => e);
    expect(err).toBeInstanceOf(HttpError);
    expect(err).toMatchObject({ status: 404, message: "Negotiation not found" });
  });

  it("tanpa percakapan → []", async () => {
    const db = dbWith({ ...CONTEXT, conversations: [] });
    await expect(getUmkmNegotiations({ db: db as never, userId: UMKM })).resolves.toEqual([]);
  });
});
