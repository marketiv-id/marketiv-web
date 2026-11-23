import { createHash } from "node:crypto";

import { describe, expect, it } from "vitest";

import { handleMidtransNotification } from "@/server/payments/webhook";
import { createFakeSupabase } from "@/test/fake-supabase";

const KEY = "SB-Mid-server-TESTKEY";
const midtrans = { serverKey: KEY, isProduction: false };

function notif(over: Record<string, string> = {}) {
  const base = { order_id: "ord-p1", status_code: "200", gross_amount: "150000.00", transaction_status: "settlement", ...over };
  const signature_key = createHash("sha512")
    .update(`${base.order_id}${base.status_code}${base.gross_amount}${KEY}`)
    .digest("hex");
  return { signature_key, ...base, ...(over.signature_key ? { signature_key: over.signature_key } : {}) };
}

function setup(status = "pending", total = 150000) {
  const db = createFakeSupabase({
    payments: [{ id: "p1", status, purpose: "order", total_amount: total, amount: total, gateway_reference: "ord-p1" }],
  });
  const calls: { name: string; args: Record<string, unknown> }[] = [];
  for (const name of ["apply_payment_paid", "mark_payment_status", "record_payment_event"]) {
    db.setRpc(name, (args) => {
      calls.push({ name, args });
      if (name === "mark_payment_status") return { changed: status === "pending", status: status === "pending" ? args.p_status : status };
      if (name === "apply_payment_paid") return { status: "paid", applied: status === "pending" };
      return { recorded: true };
    });
  }
  return { db, calls, ctx: { db: db as never, midtrans } };
}

describe("handleMidtransNotification", () => {
  it("payload tidak lengkap → 400; signature salah → 401 (tanpa sentuh DB)", async () => {
    const { ctx, calls } = setup();
    await expect(handleMidtransNotification(ctx, { order_id: "ord-p1" })).rejects.toMatchObject({ status: 400 });
    await expect(handleMidtransNotification(ctx, "x")).rejects.toMatchObject({ status: 400 });
    await expect(handleMidtransNotification(ctx, notif({ signature_key: "00".repeat(64) }))).rejects.toMatchObject({ status: 401 });
    const tampered = { ...notif(), gross_amount: "1.00" };
    await expect(handleMidtransNotification(ctx, tampered)).rejects.toMatchObject({ status: 401 });
    expect(calls).toEqual([]);
  });

  it("notifikasi uji dashboard → 200 test", async () => {
    const { ctx } = setup();
    await expect(handleMidtransNotification(ctx, notif({ order_id: "payment_notif_test_123" }))).resolves.toEqual({ status: "ok", test: true });
  });

  it("payment tidak dikenal → 404", async () => {
    const { ctx } = setup();
    await expect(handleMidtransNotification(ctx, notif({ order_id: "ord-x" }))).rejects.toMatchObject({ status: 404 });
  });

  it("nominal tidak cocok → event amount_mismatch + 409", async () => {
    const { ctx, calls } = setup("pending", 999);
    await expect(handleMidtransNotification(ctx, notif())).rejects.toMatchObject({ status: 409 });
    expect(calls).toEqual([expect.objectContaining({ name: "record_payment_event", args: expect.objectContaining({ p_kind: "amount_mismatch" }) })]);
  });

  it("settlement → apply_payment_paid; notifikasi ganda tetap 200 (RPC idempoten)", async () => {
    const { ctx, calls } = setup();
    const r1 = await handleMidtransNotification(ctx, notif());
    const r2 = await handleMidtransNotification(ctx, notif());
    expect(r1).toMatchObject({ status: "ok", paymentId: "p1", action: "apply_paid" });
    expect(r2).toMatchObject({ status: "ok", action: "apply_paid" });
    expect(calls.map((c) => c.name)).toEqual(["apply_payment_paid", "apply_payment_paid"]);
    expect(calls[0].args).toEqual({ p_payment_id: "p1", p_gateway_reference: "ord-p1", p_gross_amount: 150000 });
  });

  it("capture: accept → paid, challenge → no-op, lainnya → failed", async () => {
    let s = setup();
    await expect(handleMidtransNotification(s.ctx, notif({ transaction_status: "capture", fraud_status: "accept" }))).resolves.toMatchObject({ action: "apply_paid" });
    s = setup();
    await expect(handleMidtransNotification(s.ctx, notif({ transaction_status: "capture", fraud_status: "challenge" }))).resolves.toMatchObject({ action: "noop" });
    expect(s.calls).toEqual([]);
    s = setup();
    await expect(handleMidtransNotification(s.ctx, notif({ transaction_status: "capture", fraud_status: "deny" }))).resolves.toMatchObject({ action: "mark_failed" });
  });

  it.each([
    ["pending", "noop"],
    ["expire", "mark_expired"],
    ["cancel", "mark_cancelled"],
    ["deny", "mark_failed"],
    ["failure", "mark_failed"],
  ])("%s → %s", async (tx, action) => {
    const { ctx } = setup();
    await expect(handleMidtransNotification(ctx, notif({ transaction_status: tx, status_code: "201" }))).resolves.toMatchObject({ action });
  });

  it("settlement untuk payment yang sudah expired → late_settlement + alert, bukan diabaikan", async () => {
    const { ctx, calls } = setup("expired");
    await expect(handleMidtransNotification(ctx, notif())).resolves.toMatchObject({ status: "ok", action: "late_settlement" });
    expect(calls).toEqual([expect.objectContaining({ name: "record_payment_event", args: expect.objectContaining({ p_kind: "late_settlement" }) })]);
  });

  it("refund setelah paid → event refund; refund sebelum paid → cancelled; chargeback → event", async () => {
    let s = setup("paid");
    await expect(handleMidtransNotification(s.ctx, notif({ transaction_status: "refund" }))).resolves.toMatchObject({ action: "refund_recorded" });
    expect(s.calls[0].args).toMatchObject({ p_kind: "refund", p_transaction_status: "refund", p_gross_amount: 150000 });
    s = setup("pending");
    await expect(handleMidtransNotification(s.ctx, notif({ transaction_status: "partial_refund" }))).resolves.toMatchObject({ action: "mark_cancelled" });
    s = setup("paid");
    await expect(handleMidtransNotification(s.ctx, notif({ transaction_status: "chargeback" }))).resolves.toMatchObject({ action: "chargeback_recorded" });
  });

  it("status tidak dikenal → event unknown_status, 200 ignored", async () => {
    const { ctx, calls } = setup();
    await expect(handleMidtransNotification(ctx, notif({ transaction_status: "authorize" }))).resolves.toMatchObject({ status: "ignored" });
    expect(calls[0].args).toMatchObject({ p_kind: "unknown_status" });
  });
});
