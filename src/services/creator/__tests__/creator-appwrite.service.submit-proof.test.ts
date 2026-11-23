import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  callApi: vi.fn(),
  userId: "user_1" as string | null,
  appwrite: { listDocuments: vi.fn(), createDocument: vi.fn(), updateDocument: vi.fn() },
  executeFunction: vi.fn(),
}));

vi.mock("@/lib/api/call-api", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/api/call-api")>()),
  callApi: mocks.callApi,
}));
vi.mock("@/lib/appwrite/databases", () => ({ databases: mocks.appwrite }));
vi.mock("@/lib/appwrite/functions", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/appwrite/functions")>()),
  executeFunction: mocks.executeFunction,
}));
vi.mock("@/services/auth/session.service", () => ({
  getSession: vi.fn(),
  getCurrentUserId: async () => mocks.userId,
}));

import { FunctionExecutionError } from "@/lib/api/call-api";

import { submitProofInAppwrite, type SubmitProofInput } from "../creator-appwrite.service";

describe("submitProofInAppwrite (Fase 7 — Route Handler)", () => {
  const validInput: SubmitProofInput = {
    claimId: "claim_1",
    campaignId: "campaign_1",
    platform: "tiktok",
    postUrl: "https://www.tiktok.com/@creator/video/123",
    caption: "proof",
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mocks.userId = "user_1";
  });

  it("kirim lewat callApi submitCampaignProof, tanpa Appwrite", async () => {
    mocks.callApi.mockResolvedValueOnce({ success: true, submissionId: "s1", status: "pending" });
    await expect(submitProofInAppwrite(validInput)).resolves.toEqual({ success: true, data: null });
    expect(mocks.callApi).toHaveBeenCalledWith("submitCampaignProof", validInput);
    expect(mocks.executeFunction).not.toHaveBeenCalled();
    for (const fn of Object.values(mocks.appwrite)) expect(fn).not.toHaveBeenCalled();
  });

  it("caption kosong tidak dikirim", async () => {
    mocks.callApi.mockResolvedValueOnce({ success: true });
    await submitProofInAppwrite({ ...validInput, caption: "" });
    expect(mocks.callApi.mock.calls[0][1]).not.toHaveProperty("caption");
  });

  it("409 (bukti sudah dikirim) → validation dengan pesan route", async () => {
    mocks.callApi.mockRejectedValueOnce(
      new FunctionExecutionError("Bukti untuk pekerjaan ini sudah pernah dikirim.", 409, "validation"),
    );
    await expect(submitProofInAppwrite(validInput)).resolves.toMatchObject({
      success: false,
      code: "validation",
      error: "Bukti untuk pekerjaan ini sudah pernah dikirim.",
    });
  });

  it("404 pekerjaan tidak ditemukan → not_found", async () => {
    mocks.callApi.mockRejectedValueOnce(new FunctionExecutionError("Pekerjaan tidak ditemukan.", 404, "not_found"));
    await expect(submitProofInAppwrite(validInput)).resolves.toMatchObject({ success: false, code: "not_found" });
  });
});
