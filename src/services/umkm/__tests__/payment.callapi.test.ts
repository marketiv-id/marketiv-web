import { beforeEach, describe, expect, it, vi } from "vitest";

import { FunctionExecutionError } from "@/lib/api/errors";

/** Fase 8 — pembayaran UMKM lewat Route Handler (`/api/payments`), bukan Function Appwrite. */

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
vi.mock("@/lib/appwrite/functions", async () => {
  const actual = await vi.importActual<typeof import("@/lib/appwrite/functions")>("@/lib/appwrite/functions");
  return { ...actual, executeFunction: mocks.appwrite };
});

import {
  cancelPaymentInAppwrite,
  createCampaignPaymentInAppwrite,
  createOrderPaymentInAppwrite,
} from "@/services/umkm/umkm-appwrite.service";

const intent = { paymentId: "p1", gateway: "midtrans", snapToken: "tok", redirectUrl: "https://r", status: "pending" };

beforeEach(() => {
  mocks.callApi.mockReset();
  mocks.appwrite.mockReset();
  mocks.getCurrentUserId.mockResolvedValue("u1");
});

describe("pembayaran UMKM", () => {
  it("top-up campaign → callApi createPayment purpose campaign", async () => {
    mocks.callApi.mockResolvedValue(intent);
    const res = await createCampaignPaymentInAppwrite({ campaignId: "c1", budget: 100000 });
    expect(res).toEqual({ success: true, data: intent });
    expect(mocks.callApi).toHaveBeenCalledWith("createPayment", { purpose: "campaign", amount: 100000, campaignId: "c1" });
  });

  it("order → callApi createPayment purpose order + finishUrl", async () => {
    mocks.callApi.mockResolvedValue(intent);
    await createOrderPaymentInAppwrite({ orderId: "o1", amount: 150000, finishUrl: "https://app/f" });
    expect(mocks.callApi).toHaveBeenCalledWith("createPayment", {
      purpose: "order", amount: 150000, orderId: "o1", finishUrl: "https://app/f",
    });
  });

  it("reason route (payment_preparing) diteruskan ke UI", async () => {
    mocks.callApi.mockRejectedValue(new FunctionExecutionError("Payment sedang dipersiapkan.", 409, "validation", "payment_preparing"));
    const res = await createOrderPaymentInAppwrite({ orderId: "o1", amount: 150000 });
    expect(res).toMatchObject({ success: false, code: "validation", reason: "payment_preparing", error: "Payment sedang dipersiapkan." });
  });

  it("batalkan payment → callApi cancelPayment", async () => {
    mocks.callApi.mockResolvedValue({ ok: true });
    expect(await cancelPaymentInAppwrite("p1")).toEqual({ success: true, data: null });
    expect(mocks.callApi).toHaveBeenCalledWith("cancelPayment", { paymentId: "p1" });
  });

  it("tanpa sesi → auth, tidak ada panggilan", async () => {
    mocks.getCurrentUserId.mockResolvedValue(null);
    expect(await cancelPaymentInAppwrite("p1")).toMatchObject({ success: false, code: "auth" });
    expect(mocks.callApi).not.toHaveBeenCalled();
  });

  it("tidak ada panggilan Appwrite", async () => {
    mocks.callApi.mockResolvedValue(intent);
    await createCampaignPaymentInAppwrite({ campaignId: "c1", budget: 1 });
    await createOrderPaymentInAppwrite({ orderId: "o1", amount: 1 });
    await cancelPaymentInAppwrite("p1");
    expect(mocks.appwrite).not.toHaveBeenCalled();
  });
});
