import "server-only";

import { z } from "zod";

import type { AdminSupabaseClient } from "@/lib/supabase/admin";
import { rpcErrorToHttp } from "@/server/conversations/write-rpc";
import { HttpError, parseBody, throwIfDbError, type DbErrorLike } from "@/server/http";

import {
  cancelTransaction,
  createSnapTransaction,
  type MidtransConfig,
} from "./midtrans";

/**
 * Pembayaran Midtrans (pengganti Function `create-payment` + `cancel-payment`).
 *
 * Urutan create:
 *   1. RPC `create_payment` (validasi kepemilikan/status/nominal + baris
 *      payment `pending`; payment pending yang ada dipakai ulang)
 *   2. Snap `create transaction` (gross = total_amount)
 *   3. RPC `attach_payment_gateway` (snap_token + redirect_url)
 * Kegagalan Snap: campaign → payment `failed`; order → tetap `pending`
 * (Snap mungkin sudah terbuat walau respons hilang; retry mendapat
 * `payment_preparing`, bukan jalur bayar kedua — perilaku lama).
 */

export type PaymentDb = Pick<AdminSupabaseClient, "rpc">;

export interface PaymentContext {
  db: PaymentDb;
  userId: string;
  midtrans: MidtransConfig;
  /** Fee platform campaign (env FEE_RATE, default 0.02). */
  feeRate: number;
  fetchImpl?: typeof fetch;
}

/** Respons yang dipakai UI (`PaymentIntent` di umkm-appwrite.service.ts). */
export interface PaymentIntent {
  paymentId: string;
  gateway: "midtrans";
  snapToken?: string;
  redirectUrl?: string;
  status: "pending";
  reused?: boolean;
}

interface PaymentRow {
  paymentId: string;
  purpose: "order" | "campaign";
  status: string;
  gatewayReference: string;
  totalAmount: number;
  orderId: string | null;
  campaignId: string | null;
  snapToken: string | null;
  redirectUrl: string | null;
  reused: boolean;
}

export function feeRateFromEnv(env: NodeJS.ProcessEnv = process.env): number {
  const raw = Number(env.FEE_RATE ?? 0.02);
  return Number.isFinite(raw) && raw >= 0 && raw <= 1 ? raw : 0.02;
}

/** Peta error RPC: SQLSTATE → HTTP, dengan `hint` dibawa sebagai `reason` untuk UI. */
function paymentRpcError(error: DbErrorLike & { hint?: string | null }): never {
  const hint = typeof error.hint === "string" ? error.hint : "";
  if (hint.startsWith("payment_already_paid")) {
    throw new HttpError(409, error.message || "Order ini sudah dibayar.", "validation", {
      reason: "payment_already_paid",
      paymentId: hint.split(":")[1] ?? undefined,
      status: "paid",
    });
  }
  if (hint === "gateway_cancellation_required") {
    throw new HttpError(409, error.message || "Payment masih aktif di gateway.", "validation", {
      reason: "gateway_cancellation_required",
    });
  }
  const mapped = rpcErrorToHttp(error);
  if (mapped) throw mapped;
  throwIfDbError(error);
  throw new HttpError(500, "Terjadi kesalahan di server. Coba lagi.", "server");
}

export async function callPaymentRpc<T>(db: PaymentDb, name: string, args: Record<string, unknown>): Promise<T> {
  const rpc = db.rpc as unknown as (
    this: PaymentDb,
    fn: string,
    params: Record<string, unknown>,
  ) => PromiseLike<{ data: unknown; error: (DbErrorLike & { hint?: string | null }) | null }>;
  const { data, error } = await rpc.call(db, name, args);
  if (error) paymentRpcError(error);
  return data as T;
}

const finishUrl = z
  .string()
  .trim()
  .max(2048)
  .refine((v) => /^https?:\/\//i.test(v), "finishUrl harus URL http(s).")
  .optional();

const createPaymentSchema = z.discriminatedUnion("purpose", [
  z.object({
    purpose: z.literal("order"),
    amount: z.coerce.number().int().positive("Nominal pembayaran tidak valid."),
    orderId: z.string().trim().min(1, "orderId wajib untuk pembayaran order.").max(255),
    finishUrl,
  }),
  z.object({
    purpose: z.literal("campaign"),
    amount: z.coerce.number().int().positive("Nominal pembayaran tidak valid."),
    campaignId: z.string().trim().min(1, "campaignId wajib untuk pembayaran campaign.").max(255),
    finishUrl,
  }),
]);

function intentFrom(row: PaymentRow, reused: boolean): PaymentIntent {
  return {
    paymentId: row.paymentId,
    gateway: "midtrans",
    ...(row.snapToken ? { snapToken: row.snapToken } : {}),
    ...(row.redirectUrl ? { redirectUrl: row.redirectUrl } : {}),
    status: "pending",
    ...(reused ? { reused: true } : {}),
  };
}

export async function createPayment(ctx: PaymentContext, body: unknown): Promise<PaymentIntent> {
  const input = parseBody(createPaymentSchema, body, "Data pembayaran tidak valid.");

  const row = await callPaymentRpc<PaymentRow>(ctx.db, "create_payment", {
    p_user_id: ctx.userId,
    p_purpose: input.purpose,
    p_amount: input.amount,
    p_order_id: input.purpose === "order" ? input.orderId : null,
    p_campaign_id: input.purpose === "campaign" ? input.campaignId : null,
    p_fee_rate: ctx.feeRate,
  });

  if (row.reused) {
    if (!row.snapToken && !row.redirectUrl) {
      throw new HttpError(409, "Payment sedang dipersiapkan. Coba lagi setelah beberapa saat.", "validation", {
        reason: "payment_preparing",
        paymentId: row.paymentId,
        status: row.status,
      });
    }
    return intentFrom(row, true);
  }

  let snap: { token: string; redirect_url: string };
  try {
    snap = await createSnapTransaction(
      ctx.midtrans,
      {
        orderId: row.gatewayReference,
        grossAmount: row.totalAmount,
        itemName: row.purpose === "campaign" ? "Marketiv Campaign Escrow" : "Marketiv Order Payment",
        customerUserId: ctx.userId,
        referenceId: row.orderId ?? row.campaignId ?? "",
        finishUrl: input.finishUrl,
      },
      ctx.fetchImpl,
    );
  } catch (err) {
    if (row.purpose === "campaign") {
      await callPaymentRpc(ctx.db, "mark_payment_status", { p_payment_id: row.paymentId, p_status: "failed" }).catch(
        (e) => console.error("[payments] gagal menandai payment campaign failed", row.paymentId, e),
      );
    } else {
      console.error(`[payments] payment-reconciliation-required order=${row.orderId} payment=${row.paymentId}`);
    }
    console.error("[payments] Snap gagal", err);
    throw new HttpError(502, "Gagal membuat transaksi pembayaran. Coba lagi.", "server");
  }

  await callPaymentRpc<boolean>(ctx.db, "attach_payment_gateway", {
    p_payment_id: row.paymentId,
    p_snap_token: snap.token,
    p_redirect_url: snap.redirect_url,
  });

  return intentFrom({ ...row, snapToken: snap.token, redirectUrl: snap.redirect_url }, false);
}

interface PaymentLookup {
  id: string;
  user_id: string;
  purpose: string;
  status: string;
  gateway_reference: string;
}

type LookupDb = Pick<AdminSupabaseClient, "rpc" | "from">;

/**
 * Batalkan payment pending milik user.
 *
 * Campaign: DB dibatalkan dulu (perilaku lama), lalu cancel ke Midtrans
 *   best-effort — gagal → `payment_events` `cancel_failed` + alert admin.
 *   Settlement yang tetap masuk nanti dicatat webhook sebagai `late_settlement`.
 * Order: Midtrans dulu; DB hanya dibatalkan bila gateway MENGONFIRMASI
 *   (Snap lama bisa dibayar sementara kunci order sudah dilepas).
 */
export async function cancelPayment(
  ctx: Omit<PaymentContext, "db" | "feeRate"> & { db: LookupDb },
  rawPaymentId: string,
): Promise<{ ok: true; paymentId: string; status: string }> {
  const paymentId = rawPaymentId.trim();
  if (!paymentId || paymentId.length > 255) throw new HttpError(404, "Payment tidak ditemukan.");

  const { data, error } = await ctx.db
    .from("payments")
    .select("id, user_id, purpose, status, gateway_reference")
    .eq("id", paymentId)
    .maybeSingle();
  throwIfDbError(error);
  const payment = data as PaymentLookup | null;
  if (!payment) throw new HttpError(404, "Payment tidak ditemukan.");
  if (payment.user_id !== ctx.userId) throw new HttpError(403, "Payment bukan milik akun ini.");

  let gatewayConfirmed = false;
  if (payment.status === "pending" && payment.purpose === "order") {
    const result = await cancelTransaction(ctx.midtrans, payment.gateway_reference, ctx.fetchImpl).catch((err) => {
      console.error("[payments] cancel Midtrans gagal", payment.id, err);
      return null;
    });
    gatewayConfirmed = result?.cancelled === true;
  }

  const res = await callPaymentRpc<{ ok: true; paymentId: string; status: string; alreadyCancelled?: boolean }>(
    ctx.db,
    "cancel_payment",
    { p_payment_id: payment.id, p_user_id: ctx.userId, p_gateway_confirmed: gatewayConfirmed },
  );

  if (payment.purpose === "campaign" && !res.alreadyCancelled) {
    const result = await cancelTransaction(ctx.midtrans, payment.gateway_reference, ctx.fetchImpl).catch(() => null);
    // 404 = transaksi belum pernah dibuat di gateway (Snap belum dipakai): wajar.
    if (!result || (!result.cancelled && result.statusCode !== "404")) {
      await callPaymentRpc(ctx.db, "record_payment_event", {
        p_gateway_reference: payment.gateway_reference,
        p_kind: "cancel_failed",
        p_transaction_status: "cancel",
        p_status_code: result?.statusCode ?? null,
        p_payload: { message: result?.message ?? "request gagal" },
      }).catch((e) => console.error("[payments] gagal mencatat cancel_failed", payment.id, e));
    }
  }

  return { ok: true, paymentId: res.paymentId, status: res.status };
}
