import "server-only";

import type { AdminSupabaseClient } from "@/lib/supabase/admin";
import { HttpError, throwIfDbError } from "@/server/http";

import { isValidSignature, type MidtransConfig } from "./midtrans";
import { callPaymentRpc } from "./payments";

/**
 * Notifikasi HTTP Midtrans (pengganti Function `midtrans-webhook`).
 *
 * Tanpa sesi — kepercayaan dari signature SHA512 (timing-safe) + cek nominal
 * terhadap DB. Selalu idempoten: Midtrans mengirim ulang sampai menerima 2xx.
 *
 * transaction_status                   → aksi
 *   settlement / capture+accept        → RPC apply_payment_paid (0026; idempoten)
 *                                         ↳ bila payment sudah expired/cancelled/failed:
 *                                           event `late_settlement` + alert (dana masuk
 *                                           tanpa efek → refund manual), TIDAK diabaikan
 *   pending / capture+challenge        → no-op
 *   capture (fraud lain), deny, failure → mark_payment_status failed
 *   expire                             → mark_payment_status expired
 *   cancel                             → mark_payment_status cancelled
 *   refund / partial_refund            → paid: event `refund` + alert; selain paid: cancelled
 *   chargeback / partial_chargeback    → event `chargeback` + alert
 *   lainnya                            → event `unknown_status` + alert, 200
 */

export interface MidtransNotification {
  order_id: string;
  status_code: string;
  gross_amount: string;
  signature_key: string;
  transaction_status: string;
  fraud_status?: string;
  transaction_id?: string;
  payment_type?: string;
  settlement_time?: string;
  transaction_time?: string;
}

type WebhookDb = Pick<AdminSupabaseClient, "rpc" | "from">;

export interface WebhookContext {
  db: WebhookDb;
  midtrans: MidtransConfig;
}

export interface WebhookResult {
  status: "ok" | "ignored";
  paymentId?: string;
  paymentStatus?: string;
  action?: string;
  test?: boolean;
}

const REQUIRED = ["order_id", "status_code", "gross_amount", "signature_key", "transaction_status"] as const;

export function parseNotification(body: unknown): MidtransNotification {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    throw new HttpError(400, "Payload notifikasi tidak valid.");
  }
  const raw = body as Record<string, unknown>;
  const missing = REQUIRED.filter((key) => typeof raw[key] !== "string" || !(raw[key] as string).trim());
  if (missing.length) throw new HttpError(400, `Field wajib tidak ada: ${missing.join(", ")}`);
  return raw as unknown as MidtransNotification;
}

const isAmountEqual = (local: unknown, gross: string): boolean => {
  const a = Number(local);
  const b = Number(gross);
  return Number.isFinite(a) && Number.isFinite(b) && Math.round(a) === Math.round(b);
};

interface PaymentRow {
  id: string;
  status: string;
  purpose: string;
  total_amount: number | null;
  amount: number;
}

async function recordEvent(
  ctx: WebhookContext,
  n: MidtransNotification,
  kind: "refund" | "chargeback" | "late_settlement" | "amount_mismatch" | "unknown_status",
): Promise<void> {
  console.error(`[midtrans-webhook] ALERT ${kind} order_id=${n.order_id} status=${n.transaction_status}`);
  await callPaymentRpc(ctx.db, "record_payment_event", {
    p_gateway_reference: n.order_id,
    p_kind: kind,
    p_transaction_status: n.transaction_status,
    p_status_code: n.status_code,
    p_gross_amount: Number.isFinite(Number(n.gross_amount)) ? Math.round(Number(n.gross_amount)) : null,
    p_fraud_status: n.fraud_status ?? null,
    p_payload: {
      transaction_id: n.transaction_id ?? null,
      payment_type: n.payment_type ?? null,
      settlement_time: n.settlement_time ?? null,
      transaction_time: n.transaction_time ?? null,
    },
  });
}

async function markStatus(ctx: WebhookContext, payment: PaymentRow, status: "failed" | "expired" | "cancelled") {
  const res = await callPaymentRpc<{ changed: boolean; status: string }>(ctx.db, "mark_payment_status", {
    p_payment_id: payment.id,
    p_status: status,
  });
  return { status: "ok" as const, paymentId: payment.id, paymentStatus: res.status, action: `mark_${status}` };
}

export async function handleMidtransNotification(ctx: WebhookContext, body: unknown): Promise<WebhookResult> {
  const n = parseNotification(body);

  if (!isValidSignature(n, ctx.midtrans.serverKey)) {
    console.error("[midtrans-webhook] signature tidak valid", n.order_id);
    throw new HttpError(401, "Invalid signature");
  }

  // Notifikasi uji dari dashboard Midtrans: lolos signature, tanpa payment.
  if (n.order_id.startsWith("payment_notif_test_")) {
    return { status: "ok", test: true };
  }

  const { data, error } = await ctx.db
    .from("payments")
    .select("id, status, purpose, total_amount, amount")
    .eq("gateway_reference", n.order_id)
    .maybeSingle();
  throwIfDbError(error);
  const payment = data as PaymentRow | null;
  if (!payment) throw new HttpError(404, "Payment not found");

  // Midtrans menagih total_amount (budget + fee campaign).
  if (!isAmountEqual(payment.total_amount ?? payment.amount, n.gross_amount)) {
    await recordEvent(ctx, n, "amount_mismatch");
    throw new HttpError(409, "Amount mismatch");
  }

  const tx = n.transaction_status;
  const fraud = n.fraud_status;

  if (tx === "settlement" || (tx === "capture" && fraud === "accept")) {
    if (payment.status === "pending" || payment.status === "paid") {
      const res = await callPaymentRpc<Record<string, unknown> | null>(ctx.db, "apply_payment_paid", {
        p_payment_id: payment.id,
        p_gateway_reference: n.order_id,
        p_gross_amount: Math.round(Number(n.gross_amount)),
      });
      return { status: "ok", paymentId: payment.id, paymentStatus: String(res?.status ?? "paid"), action: "apply_paid" };
    }
    await recordEvent(ctx, n, "late_settlement");
    return { status: "ok", paymentId: payment.id, paymentStatus: payment.status, action: "late_settlement" };
  }

  if (tx === "pending" || (tx === "capture" && fraud === "challenge")) {
    return { status: "ok", paymentId: payment.id, paymentStatus: payment.status, action: "noop" };
  }
  if (tx === "capture" || tx === "deny" || tx === "failure") return markStatus(ctx, payment, "failed");
  if (tx === "expire") return markStatus(ctx, payment, "expired");
  if (tx === "cancel") return markStatus(ctx, payment, "cancelled");

  if (tx === "refund" || tx === "partial_refund") {
    if (payment.status === "paid") {
      await recordEvent(ctx, n, "refund");
      return { status: "ok", paymentId: payment.id, paymentStatus: payment.status, action: "refund_recorded" };
    }
    return markStatus(ctx, payment, "cancelled");
  }
  if (tx === "chargeback" || tx === "partial_chargeback") {
    await recordEvent(ctx, n, "chargeback");
    return { status: "ok", paymentId: payment.id, paymentStatus: payment.status, action: "chargeback_recorded" };
  }

  await recordEvent(ctx, n, "unknown_status");
  return { status: "ignored", paymentId: payment.id, paymentStatus: payment.status };
}
