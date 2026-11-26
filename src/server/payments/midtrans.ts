import "server-only";

import { createHash, timingSafeEqual } from "node:crypto";

/**
 * Client REST Midtrans (Snap + Core API) tanpa SDK — `fetch` bisa di-mock.
 *
 * Env (server saja; JANGAN pernah ke browser):
 *   MIDTRANS_SERVER_KEY       wajib; tanpa ini fitur bayar 503
 *   MIDTRANS_IS_PRODUCTION    "true" → production; selain itu sandbox
 *   MIDTRANS_ENV              fallback lama ("production" | "sandbox")
 */

export interface MidtransConfig {
  serverKey: string;
  isProduction: boolean;
}

export function getMidtransConfig(env: NodeJS.ProcessEnv = process.env): MidtransConfig | null {
  const serverKey = env.MIDTRANS_SERVER_KEY?.trim();
  if (!serverKey) return null;
  const isProduction =
    env.MIDTRANS_IS_PRODUCTION !== undefined
      ? env.MIDTRANS_IS_PRODUCTION === "true"
      : env.MIDTRANS_ENV === "production";
  return { serverKey, isProduction };
}

const snapBase = (c: MidtransConfig) =>
  c.isProduction ? "https://app.midtrans.com" : "https://app.sandbox.midtrans.com";
const coreBase = (c: MidtransConfig) =>
  c.isProduction ? "https://api.midtrans.com" : "https://api.sandbox.midtrans.com";

const authHeader = (c: MidtransConfig) => `Basic ${Buffer.from(`${c.serverKey}:`).toString("base64")}`;

/** Midtrans membatasi `transaction_details.order_id` 50 karakter. */
export const MIDTRANS_ORDER_ID_MAX = 50;

export class MidtransError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
    this.name = "MidtransError";
  }
}

export interface SnapTransactionInput {
  orderId: string;
  grossAmount: number;
  itemName: string;
  customerUserId: string;
  referenceId?: string;
  finishUrl?: string;
}

export interface SnapTransaction {
  token: string;
  redirect_url: string;
}

export async function createSnapTransaction(
  config: MidtransConfig,
  input: SnapTransactionInput,
  fetchImpl: typeof fetch = fetch,
): Promise<SnapTransaction> {
  if (input.orderId.length > MIDTRANS_ORDER_ID_MAX) {
    throw new MidtransError(`order_id melebihi ${MIDTRANS_ORDER_ID_MAX} karakter`, 400);
  }
  const res = await fetchImpl(`${snapBase(config)}/snap/v1/transactions`, {
    method: "POST",
    headers: { "content-type": "application/json", accept: "application/json", authorization: authHeader(config) },
    body: JSON.stringify({
      transaction_details: { order_id: input.orderId, gross_amount: input.grossAmount },
      item_details: [
        { id: input.orderId.slice(0, 50), price: input.grossAmount, quantity: 1, name: input.itemName.slice(0, 50) },
      ],
      custom_field1: input.customerUserId,
      custom_field2: input.referenceId ?? "",
      ...(input.finishUrl && {
        callbacks: { finish: input.finishUrl, unfinish: input.finishUrl, error: input.finishUrl },
      }),
    }),
  });
  const body = (await res.json().catch(() => ({}))) as {
    token?: string;
    redirect_url?: string;
    error_messages?: string[];
  };
  if (!res.ok || !body.token) {
    throw new MidtransError(body.error_messages?.join(", ") || "Gagal membuat transaksi Midtrans.", res.status || 502);
  }
  return { token: body.token, redirect_url: body.redirect_url ?? "" };
}

export interface MidtransCancelResult {
  /** true bila Midtrans mengonfirmasi transaksi dibatalkan. */
  cancelled: boolean;
  /** status_code dari body Midtrans (mis. "200", "404", "412"). */
  statusCode: string;
  message: string;
}

/**
 * `POST /v2/{order_id}/cancel`. 404 = transaksi belum ada di gateway (Snap
 * belum dipilih metodenya) — BUKAN konfirmasi batal, karena token Snap lama
 * masih bisa dipakai.
 */
export async function cancelTransaction(
  config: MidtransConfig,
  orderId: string,
  fetchImpl: typeof fetch = fetch,
): Promise<MidtransCancelResult> {
  const res = await fetchImpl(`${coreBase(config)}/v2/${encodeURIComponent(orderId)}/cancel`, {
    method: "POST",
    headers: { accept: "application/json", authorization: authHeader(config) },
  });
  const body = (await res.json().catch(() => ({}))) as { status_code?: string; status_message?: string; transaction_status?: string };
  const statusCode = String(body.status_code ?? res.status);
  const cancelled = res.ok && (statusCode === "200" || body.transaction_status === "cancel");
  return { cancelled, statusCode, message: body.status_message ?? "" };
}

/** SHA512(order_id + status_code + gross_amount + server_key), dibandingkan timing-safe. */
export function isValidSignature(
  notification: { order_id: string; status_code: string; gross_amount: string; signature_key: string },
  serverKey: string,
): boolean {
  const expected = createHash("sha512")
    .update(`${notification.order_id}${notification.status_code}${notification.gross_amount}${serverKey}`)
    .digest();
  const actualHex = String(notification.signature_key ?? "");
  if (!/^[0-9a-f]+$/i.test(actualHex)) return false;
  const actual = Buffer.from(actualHex, "hex");
  if (actual.length !== expected.length) return false;
  return timingSafeEqual(expected, actual);
}
