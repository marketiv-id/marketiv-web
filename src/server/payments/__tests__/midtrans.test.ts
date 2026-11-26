import { createHash } from "node:crypto";

import { describe, expect, it, vi } from "vitest";

import {
  cancelTransaction,
  createSnapTransaction,
  getMidtransConfig,
  isValidSignature,
  MidtransError,
} from "@/server/payments/midtrans";

const KEY = "SB-Mid-server-TESTKEY";
const config = { serverKey: KEY, isProduction: false };

const sign = (orderId: string, statusCode: string, gross: string, key = KEY) =>
  createHash("sha512").update(`${orderId}${statusCode}${gross}${key}`).digest("hex");

describe("getMidtransConfig", () => {
  it("tanpa server key → null", () => {
    expect(getMidtransConfig({} as NodeJS.ProcessEnv)).toBeNull();
    expect(getMidtransConfig({ MIDTRANS_SERVER_KEY: "  " } as NodeJS.ProcessEnv)).toBeNull();
  });
  it("sandbox default, production lewat MIDTRANS_IS_PRODUCTION atau MIDTRANS_ENV lama", () => {
    expect(getMidtransConfig({ MIDTRANS_SERVER_KEY: "k" } as NodeJS.ProcessEnv)).toEqual({ serverKey: "k", isProduction: false });
    expect(getMidtransConfig({ MIDTRANS_SERVER_KEY: "k", MIDTRANS_IS_PRODUCTION: "true" } as NodeJS.ProcessEnv)?.isProduction).toBe(true);
    expect(getMidtransConfig({ MIDTRANS_SERVER_KEY: "k", MIDTRANS_ENV: "production" } as NodeJS.ProcessEnv)?.isProduction).toBe(true);
    expect(
      getMidtransConfig({ MIDTRANS_SERVER_KEY: "k", MIDTRANS_IS_PRODUCTION: "false", MIDTRANS_ENV: "production" } as NodeJS.ProcessEnv)
        ?.isProduction,
    ).toBe(false);
  });
});

describe("isValidSignature", () => {
  const n = { order_id: "ord-1", status_code: "200", gross_amount: "150000.00" };
  it("signature benar diterima", () => {
    expect(isValidSignature({ ...n, signature_key: sign(n.order_id, n.status_code, n.gross_amount) }, KEY)).toBe(true);
  });
  it("kunci lain, field diubah, bukan hex, atau panjang beda → ditolak", () => {
    expect(isValidSignature({ ...n, signature_key: sign(n.order_id, n.status_code, n.gross_amount, "lain") }, KEY)).toBe(false);
    expect(isValidSignature({ ...n, gross_amount: "1.00", signature_key: sign(n.order_id, n.status_code, n.gross_amount) }, KEY)).toBe(false);
    expect(isValidSignature({ ...n, signature_key: "zz" }, KEY)).toBe(false);
    expect(isValidSignature({ ...n, signature_key: "abcd" }, KEY)).toBe(false);
    expect(isValidSignature({ ...n, signature_key: "" }, KEY)).toBe(false);
  });
});

describe("createSnapTransaction", () => {
  it("POST ke Snap sandbox dengan Basic auth server key", async () => {
    const fetchImpl = vi.fn(async () => new Response(JSON.stringify({ token: "tok", redirect_url: "https://r" }), { status: 201 }));
    const res = await createSnapTransaction(
      config,
      { orderId: "ord-abc", grossAmount: 150000, itemName: "Marketiv Order Payment", customerUserId: "u1", referenceId: "o1", finishUrl: "https://app/x" },
      fetchImpl as unknown as typeof fetch,
    );
    expect(res).toEqual({ token: "tok", redirect_url: "https://r" });
    const [url, init] = fetchImpl.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("https://app.sandbox.midtrans.com/snap/v1/transactions");
    expect((init.headers as Record<string, string>).authorization).toBe(`Basic ${Buffer.from(`${KEY}:`).toString("base64")}`);
    const body = JSON.parse(String(init.body));
    expect(body.transaction_details).toEqual({ order_id: "ord-abc", gross_amount: 150000 });
    expect(body.callbacks.finish).toBe("https://app/x");
  });

  it("production memakai app.midtrans.com; error Midtrans → MidtransError", async () => {
    const fetchImpl = vi.fn(async () => new Response(JSON.stringify({ error_messages: ["bad"] }), { status: 400 }));
    await expect(
      createSnapTransaction({ ...config, isProduction: true }, { orderId: "x", grossAmount: 1, itemName: "n", customerUserId: "u" }, fetchImpl as unknown as typeof fetch),
    ).rejects.toBeInstanceOf(MidtransError);
    expect((fetchImpl.mock.calls[0] as unknown as [string])[0]).toBe("https://app.midtrans.com/snap/v1/transactions");
  });

  it("order_id > 50 karakter ditolak sebelum request", async () => {
    const fetchImpl = vi.fn();
    await expect(
      createSnapTransaction(config, { orderId: "x".repeat(51), grossAmount: 1, itemName: "n", customerUserId: "u" }, fetchImpl as unknown as typeof fetch),
    ).rejects.toThrow(/50/);
    expect(fetchImpl).not.toHaveBeenCalled();
  });
});

describe("cancelTransaction", () => {
  it("200 → cancelled; 404 (belum ada di gateway) → bukan konfirmasi", async () => {
    const ok = vi.fn(async () => new Response(JSON.stringify({ status_code: "200", transaction_status: "cancel" }), { status: 200 }));
    expect(await cancelTransaction(config, "ord-1", ok as unknown as typeof fetch)).toMatchObject({ cancelled: true, statusCode: "200" });
    expect((ok.mock.calls[0] as unknown as [string])[0]).toBe("https://api.sandbox.midtrans.com/v2/ord-1/cancel");
    const notFound = vi.fn(async () => new Response(JSON.stringify({ status_code: "404", status_message: "not found" }), { status: 200 }));
    expect(await cancelTransaction(config, "ord-1", notFound as unknown as typeof fetch)).toMatchObject({ cancelled: false, statusCode: "404" });
  });
});
