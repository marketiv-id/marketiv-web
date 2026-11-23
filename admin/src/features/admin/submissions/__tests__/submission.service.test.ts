import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { stubFetch } from "@/test/fetch-mock";

// Fase 7: review lewat POST /api/admin/submissions/[id]/review, antrean lewat
// GET /api/admin/submission-queue — keduanya `fetch` (callAdminApi).
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
const reviewSuccess = (status: "approved" | "rejected") => ({ success: true, campaignId: "campaign-1", status });
const queueBody = { items: [queueItem], total: 1 };
let api: ReturnType<typeof stubFetch>;

function reviewBody(index = 0) {
  const init = api.fn.mock.calls[index]?.[1] as RequestInit | undefined;
  return JSON.parse(String(init?.body));
}

describe("Admin submission review (route)", () => {
  beforeEach(() => {
    createExecution.mockReset();
    api = stubFetch();
  });
  afterEach(() => vi.unstubAllGlobals());

  it("approve → POST route lalu muat ulang antrean; Appwrite tidak dipanggil", async () => {
    api.respond(200, reviewSuccess("approved")).respond(200, queueBody);
    const result = await approveCampaignSubmission({ submissionId: "submission-1", verifiedViews: 20000 });
    expect(result.refresh).toMatchObject({ status: "refreshed", submissions: [queueItem] });
    expect(api.calls).toEqual([
      { url: "/api/admin/submissions/submission-1/review", method: "POST" },
      { url: "/api/admin/submission-queue?status=all&limit=50", method: "GET" },
    ]);
    expect(reviewBody()).toEqual({ status: "approved", views: 20000 });
    expect(createExecution).not.toHaveBeenCalled();
  });

  it("reject → body berisi notes", async () => {
    api.respond(200, reviewSuccess("rejected")).respond(200, queueBody);
    await expect(rejectCampaignSubmission({ submissionId: "submission-1", rejectionReason: "Konten tidak sesuai brief" }))
      .resolves.toMatchObject({ success: true, refresh: { status: "refreshed" } });
    expect(reviewBody()).toEqual({ status: "rejected", notes: "Konten tidak sesuai brief" });
  });

  it("views tidak valid ditolak tanpa request", async () => {
    await expect(approveCampaignSubmission({ submissionId: "submission-1", verifiedViews: 1.5 })).rejects.toThrow("bilangan bulat");
    await expect(approveCampaignSubmission({ submissionId: "submission-1", verifiedViews: Number.MAX_SAFE_INTEGER + 1 })).rejects.toThrow("bilangan bulat");
    expect(api.calls).toHaveLength(0);
  });

  it("alasan penolakan kosong ditolak tanpa request", async () => {
    await expect(rejectCampaignSubmission({ submissionId: "submission-1", rejectionReason: "  " })).rejects.toThrow("wajib");
    expect(api.calls).toHaveLength(0);
  });

  it.each([400, 401, 403, 404, 409, 500])("HTTP %i diteruskan tanpa sukses palsu", async (statusCode) => {
    api.respond(statusCode, { error: "backend denied" });
    await expect(approveCampaignSubmission({ submissionId: "submission-1", verifiedViews: 0 }))
      .rejects.toMatchObject({ statusCode, message: "backend denied" });
    expect(api.calls).toHaveLength(1);
  });

  it("respons review tidak valid → gagal tertutup", async () => {
    api.respond(200, "not-json");
    await expect(approveCampaignSubmission({ submissionId: "submission-1", verifiedViews: 0 })).rejects.toMatchObject({ statusCode: 200 });
    api.reset();
    api.respond(200, { success: true });
    await expect(approveCampaignSubmission({ submissionId: "submission-1", verifiedViews: 0 })).rejects.toMatchObject({ statusCode: 502 });
  });

  it("review sukses tetap sukses walau muat ulang antrean gagal (tanpa retry review)", async () => {
    api.respond(200, reviewSuccess("approved")).respond(500, { error: "read failed" });
    const result = await approveCampaignSubmission({ submissionId: "submission-1", verifiedViews: 0 });
    expect(result).toMatchObject({ success: true, refresh: { status: "failed", error: { statusCode: 500, message: "read failed" } } });
    expect(api.calls.filter((c) => c.method === "POST")).toHaveLength(1);
  });
});
