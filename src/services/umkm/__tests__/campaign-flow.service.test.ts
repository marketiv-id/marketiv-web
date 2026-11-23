import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  callApi: vi.fn(),
  executeFunction: vi.fn(),
  userId: "umkm-1" as string | null,
}));

vi.mock("@/lib/api/call-api", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/api/call-api")>()),
  callApi: mocks.callApi,
}));
vi.mock("@/lib/appwrite/functions", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/appwrite/functions")>()),
  executeFunction: mocks.executeFunction,
}));
vi.mock("@/services/auth/session.service", () => ({
  getSession: vi.fn(),
  getCurrentUserId: async () => mocks.userId,
}));

import { FunctionExecutionError } from "@/lib/api/call-api";

import { generateCampaignBriefFromAppwrite, reviewSubmissionInAppwrite } from "../umkm-appwrite.service";

const brief = {
  objective: "Awareness",
  contentAngle: "Review",
  cta: "Beli",
  briefDetail: "Detail",
  doAndDont: { do: ["a"], dont: ["b"] },
};

describe("UMKM — AI brief & review submission (Fase 7)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.userId = "umkm-1";
  });

  it("brief → callApi generateCampaignBrief dengan default lama, tanpa userId/campaignId", async () => {
    mocks.callApi.mockResolvedValueOnce({ success: true, brief });
    await expect(generateCampaignBriefFromAppwrite({ description: "Bakso", type: "ugc" })).resolves.toEqual({
      success: true,
      data: brief,
    });
    expect(mocks.callApi).toHaveBeenCalledWith("generateCampaignBrief", {
      description: "Bakso",
      type: "ugc",
      productName: "Not specified",
      targetMarket: "General",
      goal: "Brand awareness",
      materials: [],
    });
    expect(mocks.executeFunction).not.toHaveBeenCalled();
  });

  it("brief: AI belum dikonfigurasi (503) → server dengan pesan route", async () => {
    mocks.callApi.mockRejectedValueOnce(new FunctionExecutionError("Fitur AI belum dikonfigurasi.", 503, "server"));
    await expect(generateCampaignBriefFromAppwrite({ description: "x", type: "clipping" })).resolves.toMatchObject({
      success: false,
      code: "server",
      error: "Fitur AI belum dikonfigurasi.",
    });
  });

  it("review approve → views ikut, notes opsional", async () => {
    mocks.callApi.mockResolvedValueOnce({ success: true, campaignId: "c1", status: "approved" });
    await expect(
      reviewSubmissionInAppwrite({ submissionId: "s1", status: "approved", views: 1200 }),
    ).resolves.toEqual({ success: true, data: null });
    expect(mocks.callApi).toHaveBeenCalledWith("reviewSubmission", { submissionId: "s1", status: "approved", views: 1200 });
  });

  it("review reject → tanpa views, notes dikirim", async () => {
    mocks.callApi.mockResolvedValueOnce({ success: true });
    await reviewSubmissionInAppwrite({ submissionId: "s1", status: "rejected", views: 99, notes: "tidak sesuai" });
    expect(mocks.callApi).toHaveBeenCalledWith("reviewSubmission", { submissionId: "s1", status: "rejected", notes: "tidak sesuai" });
  });

  it("review oleh non-admin → forbidden dengan pesan RPC", async () => {
    const message = "Akses ditolak: Hanya Admin Marketiv yang dapat memvalidasi submission.";
    mocks.callApi.mockRejectedValueOnce(new FunctionExecutionError(message, 403, "forbidden"));
    await expect(
      reviewSubmissionInAppwrite({ submissionId: "s1", status: "rejected", views: 0 }),
    ).resolves.toMatchObject({ success: false, code: "forbidden", error: message });
  });
});
