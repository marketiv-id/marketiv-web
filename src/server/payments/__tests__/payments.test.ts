import { describe, expect, it, vi } from "vitest";

import { HttpError } from "@/server/http";
import { cancelPayment, createPayment } from "@/server/payments/payments";
import { createFakeSupabase } from "@/test/fake-supabase";

const ME = "11111111-1111-4111-8111-111111111111";
const midtrans = { serverKey: "k", isProduction: false };

const row = (over: Record<string, unknown> = {}) => ({
  paymentId: "p1",
  purpose: "order",
  status: "pending",
  gatewayReference: "ord-p1",
  totalAmount: 150000,
  orderId: "o1",
  campaignId: null,
  snapToken: null,
  redirectUrl: null,
  reused: false,
  ...over,
});

const snapOk = () => vi.fn(async () => new Response(JSON.stringify({ token: "tok", redirect_url: "https://snap/r" }), { status: 201 }));

function setup(createRow: Record<string, unknown> | Error) {
  const db = createFakeSupabase();
  db.setRpc("create_payment", () => {
    if (createRow instanceof Error) throw createRow;
    return createRow;
  });
  db.setRpc("attach_payment_gateway", () => true);
  db.setRpc("mark_payment_status", (a) => ({ changed: true, status: a.p_status }));
  return db;
}

const err = (message: string, code: string, hint?: string) => Object.assign(new Error(message), { code, hint });

describe("createPayment", () => {
  it("payment baru: RPC → Snap → attach → PaymentIntent lama", async () => {
    const db = setup(row());
    const fetchImpl = snapOk();
    const res = await createPayment(
      { db: db as never, userId: ME, midtrans, feeRate: 0.02, fetchImpl: fetchImpl as unknown as typeof fetch },
      { purpose: "order", orderId: "o1", amount: 150000, finishUrl: "https://app/finish" },
    );
    expect(res).toEqual({ paymentId: "p1", gateway: "midtrans", snapToken: "tok", redirectUrl: "https://snap/r", status: "pending" });
    expect(db.rpc).toHaveBeenCalledWith("create_payment", {
      p_user_id: ME, p_purpose: "order", p_amount: 150000, p_order_id: "o1", p_campaign_id: null, p_fee_rate: 0.02,
    });
    expect(db.rpc).toHaveBeenCalledWith("attach_payment_gateway", { p_payment_id: "p1", p_snap_token: "tok", p_redirect_url: "https://snap/r" });
    expect(JSON.parse(String((fetchImpl.mock.calls[0] as unknown as [string, RequestInit])[1].body)).transaction_details)
      .toEqual({ order_id: "ord-p1", gross_amount: 150000 });
  });

  it("payment pending dipakai ulang tanpa Snap baru", async () => {
    const db = setup(row({ reused: true, snapToken: "old", redirectUrl: "https://old" }));
    const fetchImpl = snapOk();
    const res = await createPayment({ db: db as never, userId: ME, midtrans, feeRate: 0.02, fetchImpl: fetchImpl as unknown as typeof fetch },
      { purpose: "order", orderId: "o1", amount: 150000 });
    expect(res).toMatchObject({ paymentId: "p1", snapToken: "old", reused: true });
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("payment pending tanpa token → 409 payment_preparing", async () => {
    const db = setup(row({ reused: true }));
    await expect(createPayment({ db: db as never, userId: ME, midtrans, feeRate: 0.02 }, { purpose: "order", orderId: "o1", amount: 150000 }))
      .rejects.toMatchObject({ status: 409, extra: { reason: "payment_preparing", paymentId: "p1" } });
  });

  it("sudah dibayar → 409 reason payment_already_paid", async () => {
    const db = setup(err("Order ini sudah dibayar.", "P0001", "payment_already_paid:p9"));
    await expect(createPayment({ db: db as never, userId: ME, midtrans, feeRate: 0.02 }, { purpose: "order", orderId: "o1", amount: 150000 }))
      .rejects.toMatchObject({ status: 409, extra: { reason: "payment_already_paid", paymentId: "p9", status: "paid" } });
  });

  it("kepemilikan/validasi RPC → 403/404/400", async () => {
    for (const [code, status] of [["42501", 403], ["P0002", 404], ["22023", 400]] as const) {
      const db = setup(err("x", code));
      await expect(createPayment({ db: db as never, userId: ME, midtrans, feeRate: 0.02 }, { purpose: "order", orderId: "o1", amount: 150000 }))
        .rejects.toMatchObject({ status });
    }
  });

  it("body tidak valid → 400 tanpa RPC", async () => {
    const db = setup(row());
    for (const body of [{ purpose: "topup", amount: 1 }, { purpose: "order", amount: 0, orderId: "o1" }, { purpose: "campaign", amount: 100 },
      { purpose: "order", amount: 1, orderId: "o1", finishUrl: "javascript:alert(1)" }]) {
      await expect(createPayment({ db: db as never, userId: ME, midtrans, feeRate: 0.02 }, body)).rejects.toMatchObject({ status: 400 });
    }
    expect(db.rpc).not.toHaveBeenCalled();
  });

  it("Snap gagal: campaign → payment failed; order → tetap pending; keduanya 502", async () => {
    const failing = vi.fn(async () => new Response("{}", { status: 500 }));
    const dbC = setup(row({ purpose: "campaign", orderId: null, campaignId: "c1", gatewayReference: "cmp-p1" }));
    await expect(createPayment({ db: dbC as never, userId: ME, midtrans, feeRate: 0.02, fetchImpl: failing as unknown as typeof fetch },
      { purpose: "campaign", campaignId: "c1", amount: 100000 })).rejects.toMatchObject({ status: 502 });
    expect(dbC.rpc).toHaveBeenCalledWith("mark_payment_status", { p_payment_id: "p1", p_status: "failed" });
    const dbO = setup(row());
    await expect(createPayment({ db: dbO as never, userId: ME, midtrans, feeRate: 0.02, fetchImpl: failing as unknown as typeof fetch },
      { purpose: "order", orderId: "o1", amount: 150000 })).rejects.toBeInstanceOf(HttpError);
    expect(dbO.rpc).not.toHaveBeenCalledWith("mark_payment_status", expect.anything());
  });
});

describe("cancelPayment", () => {
  const payments = (over: Record<string, unknown> = {}) => [
    { id: "p1", user_id: ME, purpose: "order", status: "pending", gateway_reference: "ord-p1", ...over },
  ];
  const cancelRpc = (db: ReturnType<typeof createFakeSupabase>) =>
    db.setRpc("cancel_payment", (a) => {
      if (!a.p_gateway_confirmed && db.tables.payments[0].purpose === "order") {
        throw err("Payment order masih aktif di gateway.", "P0001", "gateway_cancellation_required");
      }
      return { ok: true, paymentId: a.p_payment_id, status: "cancelled", alreadyCancelled: false };
    });

  it("404 / 403", async () => {
    const db = createFakeSupabase({ payments: payments() });
    await expect(cancelPayment({ db: db as never, userId: ME, midtrans }, "nope")).rejects.toMatchObject({ status: 404 });
    await expect(cancelPayment({ db: db as never, userId: "lain", midtrans }, "p1")).rejects.toMatchObject({ status: 403 });
  });

  it("order: Midtrans mengonfirmasi → batal", async () => {
    const db = createFakeSupabase({ payments: payments() });
    cancelRpc(db);
    const fetchImpl = vi.fn(async () => new Response(JSON.stringify({ status_code: "200" }), { status: 200 }));
    await expect(cancelPayment({ db: db as never, userId: ME, midtrans, fetchImpl: fetchImpl as unknown as typeof fetch }, "p1"))
      .resolves.toEqual({ ok: true, paymentId: "p1", status: "cancelled" });
    expect(db.rpc).toHaveBeenCalledWith("cancel_payment", { p_payment_id: "p1", p_user_id: ME, p_gateway_confirmed: true });
  });

  it("order: Midtrans 404 → 409 gateway_cancellation_required", async () => {
    const db = createFakeSupabase({ payments: payments() });
    cancelRpc(db);
    const fetchImpl = vi.fn(async () => new Response(JSON.stringify({ status_code: "404" }), { status: 200 }));
    await expect(cancelPayment({ db: db as never, userId: ME, midtrans, fetchImpl: fetchImpl as unknown as typeof fetch }, "p1"))
      .rejects.toMatchObject({ status: 409, extra: { reason: "gateway_cancellation_required" } });
  });

  it("campaign: DB dulu, cancel gateway gagal → payment_events cancel_failed", async () => {
    const db = createFakeSupabase({ payments: payments({ purpose: "campaign", gateway_reference: "cmp-p1" }) });
    cancelRpc(db);
    const events: unknown[] = [];
    db.setRpc("record_payment_event", (a) => { events.push(a); return { recorded: true }; });
    const fetchImpl = vi.fn(async () => new Response(JSON.stringify({ status_code: "500" }), { status: 500 }));
    await expect(cancelPayment({ db: db as never, userId: ME, midtrans, fetchImpl: fetchImpl as unknown as typeof fetch }, "p1"))
      .resolves.toMatchObject({ status: "cancelled" });
    expect(events).toEqual([expect.objectContaining({ p_kind: "cancel_failed", p_gateway_reference: "cmp-p1" })]);
  });

  it("campaign: gateway 404 (Snap belum dipakai) tidak dianggap anomali", async () => {
    const db = createFakeSupabase({ payments: payments({ purpose: "campaign" }) });
    cancelRpc(db);
    const fetchImpl = vi.fn(async () => new Response(JSON.stringify({ status_code: "404" }), { status: 200 }));
    await cancelPayment({ db: db as never, userId: ME, midtrans, fetchImpl: fetchImpl as unknown as typeof fetch }, "p1");
    expect(db.rpc).not.toHaveBeenCalledWith("record_payment_event", expect.anything());
  });
});
