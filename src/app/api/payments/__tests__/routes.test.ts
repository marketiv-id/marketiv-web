import { createHash } from "node:crypto";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { HttpError } from "@/server/http";
import { createFakeSupabase, type FakeSupabase } from "@/test/fake-supabase";

const mocks = vi.hoisted(() => ({
  requireUser: vi.fn(),
  db: null as unknown as FakeSupabase,
}));

vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: () => mocks.db }));
vi.mock("@/server/auth/require-user", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/server/auth/require-user")>()),
  requireUser: mocks.requireUser,
}));

import { POST as webhook } from "../../webhooks/midtrans/route";
import { POST as cancel } from "../[paymentId]/cancel/route";
import { POST as create } from "../route";

const ME = "11111111-1111-4111-8111-111111111111";
const KEY = "SB-Mid-server-ROUTE";
const req = (body?: unknown, raw?: string) =>
  new Request("http://localhost/api/x", {
    method: "POST",
    headers: { "content-type": "application/json" },
    ...(raw !== undefined ? { body: raw } : body !== undefined ? { body: JSON.stringify(body) } : {}),
  });

beforeEach(() => {
  mocks.db = createFakeSupabase({ payments: [] });
  mocks.requireUser.mockReset();
  mocks.requireUser.mockResolvedValue({ user: { id: ME }, userRow: { id: ME, role: "umkm", status: "active" } });
  vi.stubEnv("MIDTRANS_SERVER_KEY", KEY);
});
afterEach(() => vi.unstubAllEnvs());

describe("POST /api/payments", () => {
  it("401 tanpa sesi, 403 role salah", async () => {
    mocks.requireUser.mockRejectedValueOnce(new HttpError(401, "Sesi tidak ditemukan."));
    expect((await create(req({}))).status).toBe(401);
    mocks.requireUser.mockRejectedValueOnce(new HttpError(403, "Bukan UMKM"));
    expect((await create(req({}))).status).toBe(403);
    expect(mocks.requireUser).toHaveBeenCalledWith({ role: "umkm" });
  });

  it("503 bila server key belum diset (tanpa RPC)", async () => {
    vi.stubEnv("MIDTRANS_SERVER_KEY", "");
    const res = await create(req({ purpose: "order", orderId: "o1", amount: 1 }));
    expect(res.status).toBe(503);
    expect(await res.json()).toMatchObject({ error: "Pembayaran belum dikonfigurasi." });
    expect(mocks.db.rpc).not.toHaveBeenCalled();
  });

  it("400 body rusak / tidak valid", async () => {
    expect((await create(req(undefined, "{bad"))).status).toBe(400);
    expect((await create(req({ purpose: "order", amount: 1 }))).status).toBe(400);
  });

  it("409 sudah dibayar membawa reason untuk UI", async () => {
    mocks.db.setRpc("create_payment", () => {
      throw Object.assign(new Error("Order ini sudah dibayar."), { code: "P0001", hint: "payment_already_paid:p9" });
    });
    const res = await create(req({ purpose: "order", orderId: "o1", amount: 150000 }));
    expect(res.status).toBe(409);
    expect(await res.json()).toMatchObject({ reason: "payment_already_paid", paymentId: "p9" });
  });
});

describe("POST /api/payments/[paymentId]/cancel", () => {
  const ctx = { params: Promise.resolve({ paymentId: "p1" }) };
  it("404 payment tidak ada, 403 milik orang lain", async () => {
    expect((await cancel(req(), ctx)).status).toBe(404);
    mocks.db = createFakeSupabase({ payments: [{ id: "p1", user_id: "lain", purpose: "campaign", status: "pending", gateway_reference: "cmp-p1" }] });
    expect((await cancel(req(), { params: Promise.resolve({ paymentId: "p1" }) })).status).toBe(403);
  });
});

describe("POST /api/webhooks/midtrans", () => {
  const signed = (over: Record<string, string> = {}) => {
    const n = { order_id: "ord-p1", status_code: "200", gross_amount: "150000.00", transaction_status: "settlement", ...over };
    return { ...n, signature_key: createHash("sha512").update(`${n.order_id}${n.status_code}${n.gross_amount}${KEY}`).digest("hex") };
  };

  it("tanpa sesi: 503 tanpa key, 400 JSON rusak, 401 signature salah", async () => {
    vi.stubEnv("MIDTRANS_SERVER_KEY", "");
    expect((await webhook(req(signed()))).status).toBe(503);
    vi.stubEnv("MIDTRANS_SERVER_KEY", KEY);
    expect((await webhook(req(undefined, "nope"))).status).toBe(400);
    expect((await webhook(req({ ...signed(), signature_key: "ab".repeat(64) }))).status).toBe(401);
    expect(mocks.requireUser).not.toHaveBeenCalled();
  });

  it("settlement valid → 200 dan apply_payment_paid", async () => {
    mocks.db = createFakeSupabase({
      payments: [{ id: "p1", status: "pending", purpose: "order", total_amount: 150000, amount: 150000, gateway_reference: "ord-p1" }],
    });
    mocks.db.setRpc("apply_payment_paid", () => ({ status: "paid" }));
    const res = await webhook(req(signed()));
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ status: "ok", paymentId: "p1", action: "apply_paid" });
  });
});
