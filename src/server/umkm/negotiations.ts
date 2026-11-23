import "server-only";

import { HttpError } from "@/server/http";
import type { NegotiationOrder } from "@/types/umkm-dashboard.types";

import { byKey, callReadRpc, str, strictNumber as number, type Row, type UmkmReadContext } from "./shared";

/**
 * Port `get-umkm-negotiations` (cermin `get-creator-negotiations`).
 *
 * Semua join dikumpulkan RPC `umkm_negotiation_context` (0015) dalam satu
 * round-trip; pemetaan per percakapan + derivasi `stage` di sini, setia pada
 * Function lama. Kunci ruang = conversationId.
 *
 * FEE: Rate Card Order seller-side (ADR-008) → `platformFee` 0 dan
 * `totalAmount` = `finalPrice` untuk UMKM.
 */

interface NegotiationContextRows {
  conversations: Row[];
  unread: { conversation_id: string; count: number }[];
  offers: Row[];
  creators: Row[];
  orders: Row[];
  packages: Row[];
  escrows: Row[];
  deliverables: Row[];
  validations: Row[];
}

interface NegotiationContext {
  offerByConversationId: Map<string, Row>;
  orderByOfferId: Map<string, Row>;
  packageById: Map<string, Row>;
  creatorByUserId: Map<string, Row>;
  escrowByOrderId: Map<string, Row>;
  latestDeliverableByOrderId: Map<string, Row>;
  validationByDeliverableId: Map<string, Row>;
  unreadByConversationId: Map<string, number>;
}

export async function getUmkmNegotiations(
  ctx: UmkmReadContext,
  conversationId?: string | null,
): Promise<NegotiationOrder[] | NegotiationOrder> {
  const rows = await callReadRpc<NegotiationContextRows>(ctx.db, "umkm_negotiation_context", {
    p_umkm_id: ctx.userId,
    p_conversation_id: conversationId ?? null,
  });

  if (conversationId && rows.conversations.length === 0) {
    // 404, bukan 403 — tidak membocorkan keberadaan percakapan UMKM lain.
    throw new HttpError(404, "Negotiation not found");
  }
  if (rows.conversations.length === 0) return [];

  const context = buildContext(rows);
  const negotiations = rows.conversations
    .map((conversation) => toNegotiation(conversation, context))
    .sort((a, b) => (b.lastMessageAt || "").localeCompare(a.lastMessageAt || ""));

  return conversationId ? negotiations[0] : negotiations;
}

function buildContext(rows: NegotiationContextRows): NegotiationContext {
  return {
    // RPC sudah memilih offer TERBARU per percakapan dan deliverable versi
    // TERTINGGI per order.
    offerByConversationId: byKey(rows.offers, (o) => str(o.conversation_id)),
    orderByOfferId: byKey(rows.orders, (o) => str(o.offer_id)),
    packageById: byKey(rows.packages, (p) => str(p.id)),
    creatorByUserId: byKey(rows.creators, (p) => str(p.user_id)),
    escrowByOrderId: byKey(rows.escrows, (e) => str(e.order_id)),
    latestDeliverableByOrderId: byKey(rows.deliverables, (d) => str(d.order_id)),
    validationByDeliverableId: byKey(rows.validations, (v) => str(v.deliverable_id)),
    unreadByConversationId: new Map(rows.unread.map((u) => [u.conversation_id, Number(u.count) || 0])),
  };
}

function toNegotiation(conversation: Row, ctx: NegotiationContext): NegotiationOrder {
  const conversationId = str(conversation.id);
  const offer = ctx.offerByConversationId.get(conversationId) ?? null;
  const order = offer ? (ctx.orderByOfferId.get(str(offer.id)) ?? null) : null;
  const pkg = order ? ctx.packageById.get(str(order.package_id)) : undefined;
  const packageId = str(order?.package_id) || str(offer?.package_id);
  const packageNameSnapshot = str(order?.package_name_snapshot) || str(offer?.package_name_snapshot);
  const packagePriceSnapshot = number(order?.package_price_snapshot ?? offer?.package_price_snapshot);
  const creator = ctx.creatorByUserId.get(str(conversation.creator_id));
  const escrow = order ? ctx.escrowByOrderId.get(str(order.id)) : undefined;
  const deliverable = order ? ctx.latestDeliverableByOrderId.get(str(order.id)) : undefined;
  const validation = deliverable ? ctx.validationByDeliverableId.get(str(deliverable.id)) : undefined;

  // Nominal mengikuti order kalau sudah ada, kalau belum harga offer.
  const finalPrice = order ? number(order.amount) : number(offer?.price);

  return {
    id: conversationId,
    conversationId,
    stage: deriveStage(offer, order) as NegotiationOrder["stage"],

    creatorId: str(conversation.creator_id),
    creatorName: str(creator?.display_name),
    creatorAvatarUrl: str(creator?.avatar_url),

    lastMessage: str(conversation.last_message),
    lastMessageAt: str(conversation.last_message_at),
    unreadCount: ctx.unreadByConversationId.get(conversationId) ?? 0,
    isArchived: Boolean(conversation.umkm_archived),

    offerId: str(offer?.id) || undefined,
    offerStatus: offer ? (str(offer.status) as NegotiationOrder["offerStatus"]) : undefined,
    projectTitle: str(offer?.title) || str(pkg?.name),
    scope: str(offer?.description) || str(pkg?.description),
    deadline: str(offer?.deadline),
    revisionCount: (offer?.revision_limit ?? pkg?.revision_limit ?? undefined) as number | undefined,
    packageContext:
      packageId && packageNameSnapshot
        ? { id: packageId, name: packageNameSnapshot, basePrice: packagePriceSnapshot }
        : undefined,

    orderId: str(order?.id) || undefined,
    orderStatus: order ? (str(order.status) as NegotiationOrder["orderStatus"]) : undefined,
    escrowStatus: escrow ? (str(escrow.status) as NegotiationOrder["escrowStatus"]) : undefined,
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
    platformFee: 0,
    totalAmount: finalPrice,
  };
}

/** Sama persis dengan deriveStage di get-umkm/creator-negotiations. */
function deriveStage(offer: Row | null, order: Row | null): string {
  if (order) return str(order.status);
  if (!offer) return "chatting";
  const status = str(offer.status);
  if (status === "accepted") return "awaiting_order";
  if (status === "rejected") return "offer_rejected";
  return "offer_pending";
}
