import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { stubFetch } from "@/test/fetch-mock";

// Tulis (review-submission) masih Function Appwrite sampai Fase 7; baca antrean
// lewat GET /api/admin/submission-queue (fetch).
const createExecution = vi.fn();
vi.mock("@/lib/admin/appwrite", () => ({
  functions: { createExecution },
  FUNCTION_IDS: { reviewSubmission: "review-submission" },
}));

const { approveCampaignSubmission, rejectCampaignSubmission } = await import("../services/submission.service");
const queueItem = {
  id: "submission-1", campaignId: "campaign-1", status: "approved", submittedAt: "2026-08-15T00:00:00.000Z",
  creator: { id: "creator-1", name: "Creator", username: "@creator" },
  campaign: { id: "campaign-1", title: "Campaign", rewardPer1000Views: 10000, platform: "tiktok" },
  umkm: { id: "umkm-1", name: "UMKM" }, platform: "tiktok", postUrl: "https://example.test/post",
};
const reviewSuccess = (status: "approved" | "rejected") => ({ status: "completed", responseStatusCode: 200, responseBody: JSON.stringify({ success: true, campaignId: "campaign-1", status }) });
const queueBody = { items: [queueItem], total: 1 };
let api: ReturnType<typeof stubFetch>;

describe("P4 authoritative Admin submission review", () => {
  beforeEach(() => {
    createExecution.mockReset();
    api = stubFetch();
  });
  afterEach(() => vi.unstubAllGlobals());

  it("approves only after Function success and refreshes authoritative queue", async () => {
    createExecution.mockResolvedValueOnce(reviewSuccess("approved"));
    api.respond(200, queueBody);
    const result = await approveCampaignSubmission({ submissionId: "submission-1", verifiedViews: 20000 });
    expect(result.refresh).toMatchObject({ status: "refreshed", submissions: [queueItem] });
    expect(createExecution).toHaveBeenCalledTimes(1);
    expect(api.calls).toEqual([{ url: "/api/admin/submission-queue?status=all&limit=50", method: "GET" }]);
    expect(JSON.parse(createExecution.mock.calls[0][1])).toEqual({ submissionId: "submission-1", status: "approved", views: 20000 });
  });

  it("rejects through Function and refreshes authoritative queue", async () => {
    createExecution.mockResolvedValueOnce(reviewSuccess("rejected"));
    api.respond(200, queueBody);
    await expect(rejectCampaignSubmission({ submissionId: "submission-1", rejectionReason: "Konten tidak sesuai brief" })).resolves.toMatchObject({ success: true, refresh: { status: "refreshed" } });
    expect(JSON.parse(createExecution.mock.calls[0][1])).toEqual({ submissionId: "submission-1", status: "rejected", notes: "Konten tidak sesuai brief" });
  });

  it("rejects invalid views without Function call", async () => {
    await expect(approveCampaignSubmission({ submissionId: "submission-1", verifiedViews: 1.5 })).rejects.toThrow("bilangan bulat");
    expect(createExecution).not.toHaveBeenCalled();
  });

  it("rejects unsafe views without Function call", async () => {
    await expect(approveCampaignSubmission({ submissionId: "submission-1", verifiedViews: Number.MAX_SAFE_INTEGER + 1 })).rejects.toThrow("bilangan bulat");
    expect(createExecution).not.toHaveBeenCalled();
  });

  it("rejects empty rejection reason without Function call", async () => {
    await expect(rejectCampaignSubmission({ submissionId: "submission-1", rejectionReason: "  " })).rejects.toThrow("wajib");
    expect(createExecution).not.toHaveBeenCalled();
  });

  it.each([401, 403, 409, 500])("propagates Function HTTP %i without false success", async (statusCode) => {
    createExecution.mockResolvedValueOnce({ status: "completed", responseStatusCode: statusCode, responseBody: JSON.stringify({ error: "backend denied" }) });
    await expect(approveCampaignSubmission({ submissionId: "submission-1", verifiedViews: 0 })).rejects.toMatchObject({ statusCode, message: "backend denied" });
    expect(createExecution).toHaveBeenCalledTimes(1);
    expect(api.calls).toHaveLength(0);
  });

  it("propagates failed execution", async () => {
    createExecution.mockResolvedValueOnce({ status: "failed", responseStatusCode: 200, responseBody: JSON.stringify({ error: "execution failed" }) });
    await expect(rejectCampaignSubmission({ submissionId: "submission-1", rejectionReason: "invalid" })).rejects.toMatchObject({ statusCode: 200 });
  });

  it("fails closed on malformed Function response", async () => {
    createExecution.mockResolvedValueOnce({ status: "completed", responseStatusCode: 200, responseBody: "not-json" });
    await expect(approveCampaignSubmission({ submissionId: "submission-1", verifiedViews: 0 })).rejects.toMatchObject({ statusCode: 200 });
  });

  it("keeps successful mutation successful when read refresh fails and does not retry it", async () => {
    createExecution.mockResolvedValueOnce(reviewSuccess("approved"));
    api.respond(500, { error: "read failed" });
    const result = await approveCampaignSubmission({ submissionId: "submission-1", verifiedViews: 0 });
    expect(result).toMatchObject({ success: true, refresh: { status: "failed", error: { statusCode: 500, message: "read failed" } } });
    expect(createExecution).toHaveBeenCalledTimes(1);
    expect(createExecution.mock.calls.filter(([id]) => id === "review-submission")).toHaveLength(1);
    expect(api.calls).toHaveLength(1);
  });
});
