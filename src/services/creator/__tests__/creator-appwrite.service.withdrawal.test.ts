import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  callApi: vi.fn(),
  userId: "creator-1" as string | null,
}));

vi.mock("@/lib/api/call-api", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/api/call-api")>()),
  callApi: mocks.callApi,
}));
vi.mock("@/services/auth/session.service", () => ({
  getSession: vi.fn(),
  getCurrentUserId: async () => mocks.userId,
}));

import { FunctionExecutionError } from "@/lib/api/call-api";

import { requestWithdrawalInAppwrite } from "../creator-appwrite.service";

const input = { amount: 60000, payoutMethod: "bank" as const, providerName: "BCA", accountNumber: "1234567890", accountName: "K", requestKey: "key-aaaa-0001" };

describe("requestWithdrawalInAppwrite (Fase 8 — route)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.userId = "creator-1";
  });

  it("lewat callApi('requestWithdrawal') dengan body apa adanya", async () => {
    mocks.callApi.mockResolvedValue({ withdrawalId: "wd1", amount: 60000, status: "requested", requestedAt: "t", balanceAfter: 1, transactionId: "tx" });
    const res = await requestWithdrawalInAppwrite(input);
    expect(res).toMatchObject({ success: true, data: { withdrawalId: "wd1" } });
    expect(mocks.callApi).toHaveBeenCalledWith("requestWithdrawal", input);
  });

  it("409 → pesan route diteruskan", async () => {
    mocks.callApi.mockRejectedValue(new FunctionExecutionError("Saldo tidak mencukupi", 409, "validation"));
    const res = await requestWithdrawalInAppwrite(input);
    expect(res).toMatchObject({ success: false, code: "validation", error: "Saldo tidak mencukupi" });
  });

  it("tanpa sesi → auth, tanpa request", async () => {
    mocks.userId = null;
    const res = await requestWithdrawalInAppwrite(input);
    expect(res).toMatchObject({ success: false, code: "auth" });
    expect(mocks.callApi).not.toHaveBeenCalled();
  });
});
