import { beforeEach, describe, expect, it, vi } from "vitest";

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

import { POST } from "../route";

const ME = "11111111-1111-4111-8111-111111111111";
const body = { amount: 60000, payoutMethod: "bank", providerName: "BCA", accountNumber: "1234567890", accountName: "K", requestKey: "key-aaaa-0001" };
const req = (b?: unknown, raw?: string) =>
  new Request("http://localhost/api/withdrawals", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: raw ?? JSON.stringify(b ?? body),
  });

describe("POST /api/withdrawals", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.db = createFakeSupabase();
    mocks.requireUser.mockResolvedValue({ user: { id: ME }, userRow: { id: ME, role: "creator", status: "active" } });
    mocks.db.setRpc("request_withdrawal", () => ({ withdrawalId: "wd1", amount: 60000, status: "requested", requestedAt: "t", balanceAfter: 1, transactionId: "tx" }));
  });

  it("200 + receipt; guard role creator/umkm", async () => {
    const res = await POST(req());
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ withdrawalId: "wd1", status: "requested" });
    expect(mocks.requireUser).toHaveBeenCalledWith(expect.objectContaining({ role: ["creator", "umkm"] }));
  });

  it("401 tanpa sesi / 403 role salah", async () => {
    mocks.requireUser.mockRejectedValueOnce(new HttpError(401, "Sesi tidak ditemukan."));
    expect((await POST(req())).status).toBe(401);
    mocks.requireUser.mockRejectedValueOnce(new HttpError(403, "Hanya kreator yang dapat menarik saldo."));
    expect((await POST(req())).status).toBe(403);
  });

  it("400 body rusak / invalid", async () => {
    expect((await POST(req(undefined, "{"))).status).toBe(400);
    expect((await POST(req({ ...body, amount: "x" }))).status).toBe(400);
  });

  it("409 saldo kurang, 429 limit", async () => {
    mocks.db.setRpc("request_withdrawal", () => {
      throw Object.assign(new Error("Saldo tidak mencukupi"), { code: "P0001" });
    });
    const res = await POST(req());
    expect(res.status).toBe(409);
    expect(await res.json()).toMatchObject({ error: "Saldo tidak mencukupi" });
    mocks.db.setRpc("request_withdrawal", () => {
      throw Object.assign(new Error("Batas penarikan harian tercapai (3/hari)."), { code: "P0001", hint: "rate_limited" });
    });
    expect((await POST(req())).status).toBe(429);
  });
});
