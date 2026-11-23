import "server-only";

import { z } from "zod";

import { createOfferSchema } from "@/lib/validations/offer.schema";
import { CURRENT_TOS_VERSION } from "@/services/auth/tos.service";
import { callWriteRpc, type WriteDb } from "@/server/conversations/write-rpc";
import { HttpError, parseBody } from "@/server/http";

/**
 * Offer rate card — pengganti Function `create-offer`, update offer langsung
 * dari browser + event `create-order`, dan delete offer dari browser.
 *
 * Semua aturan bisnis (peserta percakapan, offer pending ganda, deal paralel,
 * paket acuan, ToS kreator) ditegakkan RPC 0023 di dalam transaksi dengan row
 * lock. Route hanya memvalidasi bentuk input dan memetakan error.
 */

export interface OfferWriteContext {
  db: WriteDb;
  userId: string;
}

/** Batas harga dari skema Appwrite lama (`price` integer ≤ 999.999.999). */
export const MAX_OFFER_PRICE = 999_999_999;

const offerBodySchema = createOfferSchema.extend({
  price: createOfferSchema.shape.price.max(MAX_OFFER_PRICE, "Harga tidak valid."),
});

const idSchema = z.string().trim().min(1).max(255);

function routeId(raw: string, notFound: string): string {
  const parsed = idSchema.safeParse(raw);
  if (!parsed.success) throw new HttpError(404, notFound);
  return parsed.data;
}

/** POST /api/offers → `{ offerId }`. UMKM pemilik percakapan. */
export async function createOffer(ctx: OfferWriteContext, body: unknown): Promise<{ offerId: string }> {
  const input = parseBody(offerBodySchema, body, "Data offer tidak valid.");
  const result = await callWriteRpc<{ offerId?: string } | null>(ctx.db, "create_offer", {
    p_umkm_id: ctx.userId,
    p_conversation_id: input.conversationId,
    p_title: input.title.trim(),
    p_description: (input.description ?? "").trim(),
    p_price: input.price,
    p_deadline: new Date(input.deadline).toISOString(),
    p_revision_limit: input.revisionLimit,
    p_package_id: input.packageId?.trim() || null,
    // Hanya dicocokkan dengan percakapan (bukan dipercaya); non-UUID → abaikan,
    // RPC tetap memakai creator dari percakapan.
    p_creator_id: z.string().uuid().safeParse(input.creatorId).success ? input.creatorId : null,
  });
  if (!result?.offerId) throw new HttpError(500, "Penawaran gagal dikirim.", "server");
  return { offerId: result.offerId };
}

export interface AcceptOfferResult {
  offerId: string;
  orderId: string;
  status: string;
  alreadyAccepted: boolean;
}

/**
 * POST /api/offers/[offerId]/accept. Kreator penerima.
 * Order `pending_payment` dibuat di transaksi yang sama (tidak ada lagi jeda
 * asinkron event `create-order`).
 */
export async function acceptOffer(ctx: OfferWriteContext, rawOfferId: string): Promise<AcceptOfferResult> {
  const offerId = routeId(rawOfferId, "Penawaran tidak ditemukan.");
  const result = await callWriteRpc<AcceptOfferResult | null>(ctx.db, "accept_offer", {
    p_offer_id: offerId,
    p_creator_id: ctx.userId,
    p_tos_version: CURRENT_TOS_VERSION,
  });
  if (!result?.orderId) throw new HttpError(500, "Pesanan gagal dibuat.", "server");
  return result;
}

/** POST /api/offers/[offerId]/reject. Kreator penerima. */
export async function rejectOffer(
  ctx: OfferWriteContext,
  rawOfferId: string,
): Promise<{ offerId: string; status: string; alreadyRejected: boolean }> {
  const offerId = routeId(rawOfferId, "Penawaran tidak ditemukan.");
  return callWriteRpc(ctx.db, "reject_offer", { p_offer_id: offerId, p_creator_id: ctx.userId });
}

/** DELETE /api/offers/[offerId]. UMKM pemilik, hanya offer pending. */
export async function deleteOffer(ctx: OfferWriteContext, rawOfferId: string): Promise<{ ok: true }> {
  const offerId = routeId(rawOfferId, "Penawaran tidak ditemukan.");
  await callWriteRpc<boolean>(ctx.db, "delete_offer", { p_offer_id: offerId, p_umkm_id: ctx.userId });
  return { ok: true };
}
