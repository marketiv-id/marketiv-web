import "server-only";

import { HttpError } from "@/server/http";
import type { CreatorNegotiation } from "@/types/creator-dashboard";

import { str, throwIf, type ReadDb, type Row } from "./shared";

/**
 * Port `get-creator-negotiations` — ruang negosiasi Rate Card dari sisi kreator,
 * di-key oleh conversation (chat → offer → accept → order).
 *
 * Join 9 tabel (conversations, offers terbaru, orders, rate_card_packages,
 * umkm_profiles, escrows, deliverables versi tertinggi, validasi, unread)
 * dilakukan RPC `creator_negotiation_rows` dalam satu round-trip, sudah
 * terurut (pesan terbaru di atas, tanpa pesan di bawah). Kepemilikan
 * (`creator_id = userId`) ada di dalam query: percakapan kreator lain tidak
 * pernah terbaca walau id-nya ditebak → 404, bukan 403.
 *
 * FEE seller-side (ADR-008): `totalAmount` = nominal BERSIH yang diterima
 * kreator. Fee rate dari env FEE_RATE (default 0.02), sama dengan versi lama.
 */

export interface NegotiationRow {
  conversation: Row;
  offer: Row | null;
  order: Row | null;
  package: Row | null;
  umkm: Row | null;
  escrow: Row | null;
  deliverable: Row | null;
  validation: Row | null;
  unread_count: number | null;
}

/** `number()` di main.js lama: hanya tipe number, selain itu 0. */
const number = (value: unknown): number => (typeof value === "number" ? value : 0);

export function feeRateFromEnv(): number {
  return Number(process.env.FEE_RATE || 0.02);
}

/**
 * Satu tahap yang bisa di-switch UI. Begitu order ada, status order yang
 * menentukan.
 */
function deriveStage(offer: Row | null, order: Row | null): CreatorNegotiation["stage"] {
  if (order) return str(order.status) as CreatorNegotiation["stage"];
  if (!offer) return "chatting";
  const status = str(offer.status);
  if (status === "accepted") return "awaiting_order";
  if (status === "rejected") return "offer_rejected";
  return "offer_pending";
}

export function toCreatorNegotiation(row: NegotiationRow, feeRate: number): CreatorNegotiation {
  const { conversation, offer, order, package: pkg, umkm, escrow, deliverable, validation } = row;

  const packageId = str(order?.package_id) || str(offer?.package_id);
  const packageNameSnapshot = str(order?.package_name_snapshot) || str(offer?.package_name_snapshot);
  const packagePriceSnapshot = number(order?.package_price_snapshot ?? offer?.package_price_snapshot);

  // Nominal mengikuti order bila ada (yang mengikat), kalau belum harga offer.
  const finalPrice = order ? number(order.amount) : number(offer?.price);
  const platformFee = Math.floor(finalPrice * feeRate);

  return {
    id: str(conversation.id),
    conversationId: str(conversation.id),
    stage: deriveStage(offer, order),

    umkmId: str(conversation.umkm_id),
    umkmName: str(umkm?.business_name),
    umkmAvatarUrl: str(umkm?.logo_url),

    lastMessage: str(conversation.last_message),
    lastMessageAt: str(conversation.last_message_at),
    unreadCount: row.unread_count ?? 0,
    isArchived: Boolean(conversation.creator_archived),

    offerId: str(offer?.id) || undefined,
    offerStatus: offer ? (str(offer.status) as CreatorNegotiation["offerStatus"]) : undefined,
    projectTitle: str(offer?.title) || str(pkg?.name),
    scope: str(offer?.description) || str(pkg?.description),
    deadline: str(offer?.deadline),
    revisionCount: (offer?.revision_limit ?? pkg?.revision_limit ?? undefined) as number | undefined,
    packageContext:
      packageId && packageNameSnapshot
        ? { id: packageId, name: packageNameSnapshot, basePrice: packagePriceSnapshot }
        : undefined,

    orderId: str(order?.id) || undefined,
    orderStatus: order ? (str(order.status) as CreatorNegotiation["orderStatus"]) : undefined,
    escrowStatus: escrow ? (str(escrow.status) as CreatorNegotiation["escrowStatus"]) : undefined,
    deliverables: str(pkg?.output) || undefined,
    submittedCollabUrl: str(deliverable?.file_url) || undefined,
    deliverableValidation: validation
      ? {
          status: str(validation.status) as "valid" | "invalid",
          reviewedAt: str(validation.reviewed_at) || undefined,
          reviewNotes: str(validation.review_notes) || undefined,
        }
      : { status: "pending" },

    finalPrice,
    platformFee,
    totalAmount: finalPrice - platformFee,
  };
}

async function loadRows(db: ReadDb, userId: string, conversationId: string | null): Promise<NegotiationRow[]> {
  const { data, error } = await db.rpc("creator_negotiation_rows", {
    p_user_id: userId,
    p_conversation_id: conversationId,
  });
  throwIf(error);
  return (data ?? []) as NegotiationRow[];
}

export async function listCreatorNegotiations({ db, userId }: { db: ReadDb; userId: string }): Promise<CreatorNegotiation[]> {
  const feeRate = feeRateFromEnv();
  return (await loadRows(db, userId, null)).map((row) => toCreatorNegotiation(row, feeRate));
}

export async function getCreatorNegotiation({
  db,
  userId,
  conversationId,
}: {
  db: ReadDb;
  userId: string;
  conversationId: string;
}): Promise<CreatorNegotiation> {
  const rows = await loadRows(db, userId, conversationId);
  if (rows.length === 0) throw new HttpError(404, "Negosiasi tidak ditemukan.");
  return toCreatorNegotiation(rows[0], feeRateFromEnv());
}
