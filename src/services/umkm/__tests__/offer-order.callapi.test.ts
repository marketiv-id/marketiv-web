import { beforeEach, describe, expect, it, vi } from "vitest";

import { FunctionExecutionError } from "@/lib/api/errors";

/**
 * Fase 7 — offer & order rate card lewat Route Handler (UMKM + kreator).
 * Tidak ada satu pun panggilan Appwrite untuk fungsi-fungsi ini.
 */

const mocks = vi.hoisted(() => ({
  callApi: vi.fn(),
  getCurrentUserId: vi.fn(),
  appwrite: vi.fn(),
}));

vi.mock("@/lib/api/call-api", async () => {
  const errors = await vi.importActual<typeof import("@/lib/api/errors")>("@/lib/api/errors");
  return { callApi: mocks.callApi, FunctionExecutionError: errors.FunctionExecutionError };
});
vi.mock("@/services/auth/session.service", () => ({ getCurrentUserId: mocks.getCurrentUserId }));
vi.mock("@/lib/appwrite/databases", () => ({
  databases: new Proxy({}, { get: () => mocks.appwrite }),
}));
vi.mock("@/lib/appwrite/functions", async () => {
  const actual = await vi.importActual<typeof import("@/lib/appwrite/functions")>("@/lib/appwrite/functions");
  return { ...actual, executeFunction: mocks.appwrite };
});

import { acceptOfferInAppwrite, rejectOfferInAppwrite } from "@/services/creator/creator-appwrite.service";
import {
  cancelOrderInAppwrite,
  createOfferInAppwrite,
  deleteOfferInAppwrite,
} from "@/services/umkm/umkm-appwrite.service";

const offerInput = {
  conversationId: "conv-1",
  creatorId: "22222222-2222-4222-8222-222222222222",
  title: "Video Promo",
  description: "",
  price: 250_000,
  deadline: new Date(Date.now() + 5 * 86_400_000).toISOString(),
  revisionLimit: 2,
};

beforeEach(() => {
  vi.clearAllMocks();
  mocks.getCurrentUserId.mockResolvedValue("11111111-1111-4111-8111-111111111111");
});

describe("UMKM: offer & order", () => {
  it("createOffer → callApi('createOffer') dan mengembalikan offerId", async () => {
    mocks.callApi.mockResolvedValue({ offerId: "o1" });
    await expect(createOfferInAppwrite(offerInput)).resolves.toEqual({ success: true, data: "o1" });
    expect(mocks.callApi).toHaveBeenCalledWith("createOffer", {
      conversationId: "conv-1",
      creatorId: offerInput.creatorId,
      title: "Video Promo",
      description: "",
      price: 250_000,
      deadline: offerInput.deadline,
      revisionLimit: 2,
    });
    expect(mocks.appwrite).not.toHaveBeenCalled();
  });

  it("createOffer: 409 dari route diteruskan dengan pesannya", async () => {
    mocks.callApi.mockRejectedValue(
      new FunctionExecutionError("Masih ada penawaran yang menunggu jawaban kreator.", 409, "validation"),
    );
    await expect(createOfferInAppwrite(offerInput)).resolves.toMatchObject({
      success: false,
      code: "validation",
      error: "Masih ada penawaran yang menunggu jawaban kreator.",
    });
  });

  it("deleteOffer & cancelOrder → route dengan id di path", async () => {
    mocks.callApi.mockResolvedValue({ ok: true });
    await expect(deleteOfferInAppwrite("o1")).resolves.toEqual({ success: true, data: null });
    await expect(cancelOrderInAppwrite("ord-1")).resolves.toEqual({ success: true, data: null });
    expect(mocks.callApi).toHaveBeenNthCalledWith(1, "deleteOffer", { offerId: "o1" });
    expect(mocks.callApi).toHaveBeenNthCalledWith(2, "cancelOrder", { orderId: "ord-1" });
    expect(mocks.appwrite).not.toHaveBeenCalled();
  });

  it("deleteOffer bukan milik → not_found dari route", async () => {
    mocks.callApi.mockRejectedValue(new FunctionExecutionError("Penawaran tidak ditemukan.", 404, "not_found"));
    await expect(deleteOfferInAppwrite("o1")).resolves.toMatchObject({ success: false, code: "not_found" });
  });

  it("tanpa sesi → auth, route tidak dipanggil", async () => {
    mocks.getCurrentUserId.mockResolvedValue(null);
    await expect(cancelOrderInAppwrite("ord-1")).resolves.toMatchObject({ success: false, code: "auth" });
    expect(mocks.callApi).not.toHaveBeenCalled();
  });
});

describe("Kreator: terima / tolak offer", () => {
  it("accept → acceptOffer, reject → rejectOffer", async () => {
    mocks.callApi.mockResolvedValue({ ok: true });
    await expect(acceptOfferInAppwrite("o1")).resolves.toEqual({ success: true, data: null });
    await expect(rejectOfferInAppwrite("o2")).resolves.toEqual({ success: true, data: null });
    expect(mocks.callApi).toHaveBeenNthCalledWith(1, "acceptOffer", { offerId: "o1" });
    expect(mocks.callApi).toHaveBeenNthCalledWith(2, "rejectOffer", { offerId: "o2" });
    expect(mocks.appwrite).not.toHaveBeenCalled();
  });

  it("accept: ToS belum disetujui (409) → pesan route", async () => {
    mocks.callApi.mockRejectedValue(
      new FunctionExecutionError("Setujui Syarat & Ketentuan terbaru dulu sebelum menerima penawaran.", 409, "validation"),
    );
    await expect(acceptOfferInAppwrite("o1")).resolves.toMatchObject({
      success: false,
      error: "Setujui Syarat & Ketentuan terbaru dulu sebelum menerima penawaran.",
    });
  });
});
