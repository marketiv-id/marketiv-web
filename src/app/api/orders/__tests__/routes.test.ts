import { beforeEach, describe, expect, it, vi } from "vitest";

import { HttpError } from "@/server/http";
import { createFakeSupabase, type FakeSupabase } from "@/test/fake-supabase";

/**
 * Route order rate card (Fase 7): guard peran (401/403), body rusak (400),
 * error RPC (404/409), status sukses (200/201).
 */
const mocks = vi.hoisted(() => ({
  requireUser: vi.fn(),
  db: null as unknown as FakeSupabase,
}));

vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: () => mocks.db }));
vi.mock("@/server/auth/require-user", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/server/auth/require-user")>()),
  requireUser: mocks.requireUser,
}));

import { POST as approve } from "../../deliverables/[deliverableId]/approve/route";
import { POST as accept } from "../../offers/[offerId]/accept/route";
import { POST as reject } from "../../offers/[offerId]/reject/route";
import { DELETE as deleteOffer } from "../../offers/[offerId]/route";
import { POST as createOffer } from "../../offers/route";
import { POST as cancel } from "../[orderId]/cancel/route";
import { POST as deliverables } from "../[orderId]/deliverables/route";
import { POST as revisions } from "../[orderId]/revisions/route";

const ME = "11111111-1111-4111-8111-111111111111";

const req = (method: string, body?: unknown, raw?: string) =>
  new Request("http://localhost/api/x", {
    method,
    headers: { "content-type": "application/json" },
    ...(raw !== undefined ? { body: raw } : body !== undefined ? { body: JSON.stringify(body) } : {}),
  });
const params = <T extends Record<string, string>>(value: T) => ({ params: Promise.resolve(value) });

const offerBody = {
  conversationId: "conv-1",
  creatorId: "22222222-2222-4222-8222-222222222222",
  title: "Video",
  price: 100_000,
  deadline: new Date(Date.now() + 86_400_000 * 3).toISOString(),
  revisionLimit: 1,
};

type Case = { name: string; role: "umkm" | "creator"; call: () => Promise<Response>; rpc: string; status: number };
const cases: Case[] = [
  { name: "POST /api/offers", role: "umkm", call: () => createOffer(req("POST", offerBody)), rpc: "create_offer", status: 201 },
  { name: "DELETE /api/offers/[id]", role: "umkm", call: () => deleteOffer(req("DELETE"), params({ offerId: "o1" })), rpc: "delete_offer", status: 200 },
  { name: "POST …/accept", role: "creator", call: () => accept(req("POST"), params({ offerId: "o1" })), rpc: "accept_offer", status: 200 },
  { name: "POST …/reject", role: "creator", call: () => reject(req("POST"), params({ offerId: "o1" })), rpc: "reject_offer", status: 200 },
  { name: "POST /api/orders/[id]/cancel", role: "umkm", call: () => cancel(req("POST"), params({ orderId: "ord-1" })), rpc: "cancel_order", status: 200 },
  {
    name: "POST …/deliverables",
    role: "creator",
    call: () => deliverables(req("POST", { source: "external_url", fileUrl: "https://x.test/v" }), params({ orderId: "ord-1" })),
    rpc: "submit_deliverable",
    status: 201,
  },
  {
    name: "POST …/revisions",
    role: "umkm",
    call: () => revisions(req("POST", { message: "Ganti" }), params({ orderId: "ord-1" })),
    rpc: "request_revision",
    status: 201,
  },
  { name: "POST /api/deliverables/[id]/approve", role: "umkm", call: () => approve(req("POST"), params({ deliverableId: "d1" })), rpc: "approve_deliverable", status: 200 },
];

const RPC_RESULT: Record<string, unknown> = {
  create_offer: { offerId: "o1" },
  delete_offer: true,
  accept_offer: { offerId: "o1", orderId: "ord-1", status: "pending_payment", alreadyAccepted: false },
  reject_offer: { offerId: "o1", status: "rejected", alreadyRejected: false },
  cancel_order: { ok: true, status: "cancelled" },
  submit_deliverable: { id: "d1", order_id: "ord-1", source: "external_url", file_url: "https://x.test/v", version: 1, status: "submitted", created_at: "t" },
  request_revision: { id: "r1", order_id: "ord-1", requested_by: ME, message: "Ganti", status: "open", created_at: "t" },
  approve_deliverable: { ok: true, deliverableId: "d1", orderId: "ord-1", status: "approved" },
};

beforeEach(() => {
  vi.clearAllMocks();
  mocks.db = createFakeSupabase();
  for (const [name, value] of Object.entries(RPC_RESULT)) mocks.db.setRpc(name, () => value);
});

describe.each(cases)("$name", ({ role, call, rpc, status }) => {
  it("tanpa sesi → 401, RPC tidak dipanggil", async () => {
    mocks.requireUser.mockRejectedValue(new HttpError(401, "Sesi tidak ditemukan. Silakan login."));
    const res = await call();
    expect(res.status).toBe(401);
    expect(mocks.db.rpc).not.toHaveBeenCalled();
  });

  it(`guard peran ${role}`, async () => {
    mocks.requireUser.mockRejectedValue(new HttpError(403, "Akun ini tidak punya akses untuk aksi tersebut."));
    expect((await call()).status).toBe(403);
    mocks.requireUser.mockResolvedValue({ user: { id: ME }, userRow: { id: ME, role, status: "active" } });
    mocks.requireUser.mockClear();
    await call();
    expect(mocks.requireUser).toHaveBeenCalledWith(expect.objectContaining({ role }));
  });

  it(`sukses → ${status}, RPC ${rpc} dengan id sesi`, async () => {
    mocks.requireUser.mockResolvedValue({ user: { id: ME }, userRow: { id: ME, role, status: "active" } });
    const res = await call();
    expect(res.status).toBe(status);
    expect(mocks.db.rpc.mock.calls[0][0]).toBe(rpc);
    expect(Object.values(mocks.db.rpc.mock.calls[0][1] as object)).toContain(ME);
  });

  it("RPC P0002 → 404 dengan pesan RPC", async () => {
    mocks.requireUser.mockResolvedValue({ user: { id: ME }, userRow: { id: ME, role, status: "active" } });
    mocks.db.setRpc(rpc, () => {
      throw Object.assign(new Error("Pesanan tidak ditemukan."), { code: "P0002" });
    });
    const res = await call();
    expect(res.status).toBe(404);
    expect(await res.json()).toMatchObject({ error: "Pesanan tidak ditemukan.", code: "not_found" });
  });
});

describe("body rusak", () => {
  beforeEach(() => {
    mocks.requireUser.mockResolvedValue({ user: { id: ME }, userRow: { id: ME, role: "umkm", status: "active" } });
  });

  it("JSON rusak → 400", async () => {
    expect((await createOffer(req("POST", undefined, "{x"))).status).toBe(400);
    expect((await revisions(req("POST", undefined, "{x"), params({ orderId: "o" }))).status).toBe(400);
  });

  it("offer tanpa judul → 400 + fieldErrors", async () => {
    const res = await createOffer(req("POST", { ...offerBody, title: "" }));
    expect(res.status).toBe(400);
    expect(await res.json()).toMatchObject({ code: "validation", fieldErrors: { title: expect.any(String) } });
  });

  it("approve tanpa body tetap jalan (orderId opsional)", async () => {
    expect((await approve(req("POST"), params({ deliverableId: "d1" }))).status).toBe(200);
  });

  it("accept offer: konflik ToS → 409", async () => {
    mocks.db.setRpc("accept_offer", () => {
      throw Object.assign(new Error("Setujui Syarat & Ketentuan terbaru dulu sebelum menerima penawaran."), { code: "P0001" });
    });
    const res = await accept(req("POST"), params({ offerId: "o1" }));
    expect(res.status).toBe(409);
    expect((await res.json()).error).toContain("Syarat & Ketentuan");
  });
});
