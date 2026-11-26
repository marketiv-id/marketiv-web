import { beforeEach, describe, expect, it, vi } from "vitest";

import { acceptOffer, createOffer, deleteOffer, rejectOffer } from "@/server/offers/offers";
import {
  approveDeliverable,
  cancelOrder,
  mapDeliverableRow,
  privateFileUrl,
  requestRevision,
  submitDeliverable,
} from "@/server/orders/orders";
import { HttpError } from "@/server/http";
import { CURRENT_TOS_VERSION } from "@/services/auth/tos.service";
import { createFakeSupabase, type FakeSupabase } from "@/test/fake-supabase";

/**
 * Logika route order rate card (Fase 7). RPC 0023 disimulasikan fake;
 * aturan SQL-nya diuji pgTAP `supabase/tests/order_flow.test.sql`. Di sini:
 * argumen RPC (identitas SELALU dari sesi, bukan body), validasi input, dan
 * pemetaan error SQLSTATE → HTTP.
 */

const UMKM = "11111111-1111-4111-8111-111111111111";
const CREATOR = "22222222-2222-4222-8222-222222222222";
let db: FakeSupabase;

const deadline = () => new Date(Date.now() + 5 * 86_400_000).toISOString();
const offerBody = (extra: Record<string, unknown> = {}) => ({
  conversationId: "conv-1",
  creatorId: CREATOR,
  title: "Video Promo",
  description: "Lingkup kerja",
  price: 250_000,
  deadline: deadline(),
  revisionLimit: 2,
  ...extra,
});

const sqlError = (code: string, message: string) => Object.assign(new Error(message), { code });

beforeEach(() => {
  db = createFakeSupabase();
});

async function httpError(promise: Promise<unknown>): Promise<HttpError> {
  const err = await promise.then(
    () => null,
    (e: unknown) => e,
  );
  expect(err).toBeInstanceOf(HttpError);
  return err as HttpError;
}

describe("createOffer", () => {
  it("memanggil create_offer dengan UMKM dari sesi + body ternormalisasi", async () => {
    db.setRpc("create_offer", () => ({ offerId: "offer-1" }));
    const body = offerBody({ packageId: " pk-1 ", umkmId: "palsu", status: "accepted" });
    await expect(createOffer({ db: db as never, userId: UMKM }, body)).resolves.toEqual({ offerId: "offer-1" });
    expect(db.rpc).toHaveBeenCalledWith("create_offer", {
      p_umkm_id: UMKM,
      p_conversation_id: "conv-1",
      p_title: "Video Promo",
      p_description: "Lingkup kerja",
      p_price: 250_000,
      p_deadline: new Date(body.deadline).toISOString(),
      p_revision_limit: 2,
      p_package_id: "pk-1",
      p_creator_id: CREATOR,
    });
  });

  it("creatorId non-UUID (ID Appwrite lama) tidak dikirim, RPC memakai kreator percakapan", async () => {
    db.setRpc("create_offer", () => ({ offerId: "offer-1" }));
    await createOffer({ db: db as never, userId: UMKM }, offerBody({ creatorId: "appwrite_id_lama" }));
    expect(db.rpc.mock.calls[0][1]).toMatchObject({ p_creator_id: null, p_package_id: null });
  });

  it.each([
    [{ price: 1_000 }, "minimal"],
    [{ price: 1_000_000_000 }, "Harga tidak valid."],
    [{ deadline: "2020-01-01" }, "Batas Waktu"],
    [{ revisionLimit: 11 }, "maksimal 10"],
    [{ title: "" }, "Judul"],
  ])("validasi %o → 400 tanpa RPC", async (patch, message) => {
    const err = await httpError(createOffer({ db: db as never, userId: UMKM }, offerBody(patch)));
    expect(err.status).toBe(400);
    expect(err.message).toContain(message);
    expect(db.rpc).not.toHaveBeenCalled();
  });

  it.each([
    ["P0002", 404],
    ["42501", 403],
    ["22023", 400],
    ["P0001", 409],
  ])("SQLSTATE %s → %i dengan pesan RPC", async (code, status) => {
    db.setRpc("create_offer", () => {
      throw sqlError(code, "Masih ada penawaran yang menunggu jawaban kreator.");
    });
    const err = await httpError(createOffer({ db: db as never, userId: UMKM }, offerBody()));
    expect(err.status).toBe(status);
    expect(err.message).toBe("Masih ada penawaran yang menunggu jawaban kreator.");
  });
});

describe("accept / reject / delete offer", () => {
  it("accept: kreator dari sesi + versi ToS berjalan; hasil idempoten diteruskan", async () => {
    db.setRpc("accept_offer", () => ({ offerId: "o1", orderId: "ord-1", status: "pending_payment", alreadyAccepted: true }));
    await expect(acceptOffer({ db: db as never, userId: CREATOR }, "o1")).resolves.toEqual({
      offerId: "o1",
      orderId: "ord-1",
      status: "pending_payment",
      alreadyAccepted: true,
    });
    expect(db.rpc).toHaveBeenCalledWith("accept_offer", {
      p_offer_id: "o1",
      p_creator_id: CREATOR,
      p_tos_version: CURRENT_TOS_VERSION,
    });
  });

  it("accept: offer milik kreator lain → 403", async () => {
    db.setRpc("accept_offer", () => {
      throw sqlError("42501", "Hanya kreator penerima yang dapat menjawab penawaran ini.");
    });
    expect((await httpError(acceptOffer({ db: db as never, userId: CREATOR }, "o1"))).status).toBe(403);
  });

  it("id kosong → 404 tanpa RPC", async () => {
    expect((await httpError(rejectOffer({ db: db as never, userId: CREATOR }, " "))).status).toBe(404);
    expect(db.rpc).not.toHaveBeenCalled();
  });

  it("reject & delete memakai identitas sesi", async () => {
    db.setRpc("reject_offer", () => ({ offerId: "o1", status: "rejected", alreadyRejected: false }));
    db.setRpc("delete_offer", () => true);
    await rejectOffer({ db: db as never, userId: CREATOR }, "o1");
    await expect(deleteOffer({ db: db as never, userId: UMKM }, "o1")).resolves.toEqual({ ok: true });
    expect(db.rpc).toHaveBeenNthCalledWith(1, "reject_offer", { p_offer_id: "o1", p_creator_id: CREATOR });
    expect(db.rpc).toHaveBeenNthCalledWith(2, "delete_offer", { p_offer_id: "o1", p_umkm_id: UMKM });
  });
});

describe("cancel order", () => {
  it("status non-pending_payment → 409 dengan pesan lama", async () => {
    db.setRpc("cancel_order", () => {
      throw sqlError("P0001", "Order status tidak dapat dibatalkan: in_progress");
    });
    const err = await httpError(cancelOrder({ db: db as never, userId: UMKM }, "ord-1"));
    expect(err).toMatchObject({ status: 409, message: "Order status tidak dapat dibatalkan: in_progress" });
    expect(db.rpc).toHaveBeenCalledWith("cancel_order", { p_order_id: "ord-1", p_umkm_id: UMKM });
  });

  const midtrans = { serverKey: "SB-test", isProduction: false } as never;
  const cancelResponse = (status: number, body: unknown) =>
    vi.fn(async () => new Response(JSON.stringify(body), { status }));

  it("payment pending ikut dibatalkan di Midtrans (best-effort)", async () => {
    db.setRpc("cancel_order", () => ({ ok: true, status: "cancelled", cancelledPayments: ["ord-abc"] }));
    const fetchImpl = cancelResponse(200, { status_code: "200", transaction_status: "cancel" });
    const res = await cancelOrder({ db: db as never, userId: UMKM }, "ord-1", { midtrans, fetchImpl: fetchImpl as never });
    expect(res).toEqual({ ok: true, status: "cancelled" });
    expect(String((fetchImpl.mock.calls[0] as unknown[])[0])).toContain("/v2/ord-abc/cancel");
    expect(db.rpc).not.toHaveBeenCalledWith("record_payment_event", expect.anything());
  });

  it("Midtrans gagal → payment_events cancel_failed, order tetap batal", async () => {
    db.setRpc("cancel_order", () => ({ ok: true, status: "cancelled", cancelledPayments: ["ord-abc"] }));
    db.setRpc("record_payment_event", () => ({ ok: true }));
    const fetchImpl = cancelResponse(412, { status_code: "412", status_message: "cannot be updated" });
    const res = await cancelOrder({ db: db as never, userId: UMKM }, "ord-1", { midtrans, fetchImpl: fetchImpl as never });
    expect(res.status).toBe("cancelled");
    expect(db.rpc).toHaveBeenCalledWith(
      "record_payment_event",
      expect.objectContaining({ p_gateway_reference: "ord-abc", p_kind: "cancel_failed", p_status_code: "412" }),
    );
  });

  it("tanpa konfigurasi Midtrans → hanya DB", async () => {
    db.setRpc("cancel_order", () => ({ ok: true, status: "cancelled", cancelledPayments: ["ord-abc"] }));
    const res = await cancelOrder({ db: db as never, userId: UMKM }, "ord-1", { midtrans: null });
    expect(res.status).toBe("cancelled");
    expect(db.rpc).toHaveBeenCalledTimes(1);
  });
});

describe("submitDeliverable", () => {
  const row = {
    id: "dlv-1",
    order_id: "ord-1",
    source: "external_url",
    file_url: "https://drive.test/x",
    file_id: null,
    notes: null,
    version: 2,
    status: "submitted",
    created_at: "2026-11-23T10:00:00+00:00",
  };

  it("external_url: link https wajib, DTO sama dengan Function lama", async () => {
    db.setRpc("submit_deliverable", () => row);
    const dto = await submitDeliverable({ db: db as never, userId: CREATOR }, "ord-1", {
      source: "external_url",
      fileUrl: "https://drive.test/x",
    });
    expect(dto).toEqual({
      id: "dlv-1",
      orderId: "ord-1",
      source: "external_url",
      fileUrl: "https://drive.test/x",
      version: 2,
      status: "submitted",
      createdAt: "2026-11-23T10:00:00+00:00",
    });
    expect(db.rpc).toHaveBeenCalledWith("submit_deliverable", {
      p_order_id: "ord-1",
      p_creator_id: CREATOR,
      p_source: "external_url",
      p_file_url: "https://drive.test/x",
      p_file_id: null,
      p_notes: null,
    });
  });

  it("storage: file_url = route stabil server (URL dari klien diabaikan)", async () => {
    db.setRpc("submit_deliverable", () => ({ ...row, source: "storage", file_id: "f1", file_url: privateFileUrl("f1") }));
    const dto = await submitDeliverable({ db: db as never, userId: CREATOR }, "ord-1", {
      source: "storage",
      fileId: "f1",
      fileUrl: "https://evil.test/x",
      notes: " catatan ",
    });
    expect(db.rpc.mock.calls[0][1]).toMatchObject({
      p_source: "storage",
      p_file_id: "f1",
      p_file_url: "/api/files/f1/url?redirect=1",
      p_notes: "catatan",
    });
    expect(dto).toMatchObject({ fileId: "f1", fileUrl: "/api/files/f1/url?redirect=1" });
  });

  it.each([
    [{ source: "external_url", fileUrl: "http://drive.test/x" }, "https://"],
    [{ source: "storage" }, "Berkas belum terunggah."],
    [{ source: "ftp", fileUrl: "https://x.test" }, "Sumber deliverable tidak valid."],
  ])("validasi %o → 400", async (body, message) => {
    const err = await httpError(submitDeliverable({ db: db as never, userId: CREATOR }, "ord-1", body));
    expect(err.status).toBe(400);
    expect(err.message).toContain(message);
    expect(db.rpc).not.toHaveBeenCalled();
  });

  it("mapDeliverableRow menyertakan fileId/notes hanya bila terisi", () => {
    expect(mapDeliverableRow({ ...row, file_id: "f9", notes: "n" })).toMatchObject({ fileId: "f9", notes: "n" });
    expect(mapDeliverableRow(row)).not.toHaveProperty("fileId");
  });
});

describe("requestRevision & approveDeliverable", () => {
  it("revisi: UMKM dari sesi, pesan di-trim, DTO Revision", async () => {
    db.setRpc("request_revision", () => ({
      id: "rev-1",
      order_id: "ord-1",
      requested_by: UMKM,
      message: "Ganti musik",
      status: "open",
      created_at: "2026-11-23T11:00:00+00:00",
    }));
    const dto = await requestRevision({ db: db as never, userId: UMKM }, "ord-1", { message: "  Ganti musik  " });
    expect(dto).toEqual({
      id: "rev-1",
      orderId: "ord-1",
      requestedBy: UMKM,
      message: "Ganti musik",
      status: "open",
      createdAt: "2026-11-23T11:00:00+00:00",
    });
    expect(db.rpc).toHaveBeenCalledWith("request_revision", { p_order_id: "ord-1", p_umkm_id: UMKM, p_message: "Ganti musik" });
  });

  it("revisi: batas tercapai → 409 dengan pesan RPC", async () => {
    db.setRpc("request_revision", () => {
      throw sqlError("P0001", "Batas revisi (2) sudah tercapai. Setujui apa adanya atau buka sengketa.");
    });
    const err = await httpError(requestRevision({ db: db as never, userId: UMKM }, "ord-1", { message: "x" }));
    expect(err).toMatchObject({ status: 409, message: "Batas revisi (2) sudah tercapai. Setujui apa adanya atau buka sengketa." });
  });

  it("revisi: pesan kosong → 400 tanpa RPC", async () => {
    expect((await httpError(requestRevision({ db: db as never, userId: UMKM }, "ord-1", { message: "  " }))).status).toBe(400);
    expect(db.rpc).not.toHaveBeenCalled();
  });

  it("approve: UMKM dari sesi, orderId opsional dicocokkan, hasil release diteruskan", async () => {
    db.setRpc("approve_deliverable", () => ({ ok: true, deliverableId: "dlv-1", orderId: "ord-1", status: "approved", release: "released" }));
    expect(await approveDeliverable({ db: db as never, userId: UMKM }, "dlv-1", { orderId: "ord-1" })).toEqual({
      ok: true,
      deliverableId: "dlv-1",
      orderId: "ord-1",
      status: "approved",
      release: "released",
    });
    await approveDeliverable({ db: db as never, userId: UMKM }, "dlv-1", {});
    expect(db.rpc).toHaveBeenNthCalledWith(1, "approve_deliverable", { p_deliverable_id: "dlv-1", p_umkm_id: UMKM, p_order_id: "ord-1" });
    expect(db.rpc).toHaveBeenNthCalledWith(2, "approve_deliverable", { p_deliverable_id: "dlv-1", p_umkm_id: UMKM, p_order_id: null });
  });
});
