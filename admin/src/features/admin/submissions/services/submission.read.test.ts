import { afterEach, describe, expect, it, vi } from "vitest";

import { stubFetch } from "@/test/fetch-mock";

vi.mock("@/lib/admin/appwrite", () => ({
  functions: { createExecution: vi.fn() },
  FUNCTION_IDS: { reviewSubmission: "review-submission" },
}));

const { getCampaignSubmissions, AdminSubmissionReadError } = await import("./submission.service");

const item = {
  id: "sub-1", campaignId: "campaign-1", status: "pending", submittedAt: "2026-01-01T00:00:00.000Z",
  creator: { id: "creator-1", name: "Creator", username: "@creator" },
  campaign: { id: "campaign-1", title: "Campaign", rewardPer1000Views: 10000, platform: "tiktok" },
  umkm: { id: "umkm-1", name: "UMKM" }, platform: "tiktok", postUrl: "https://example.test/post",
};

describe("getCampaignSubmissions secure read", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("maps successful queue and preserves real empty result", async () => {
    const api = stubFetch().respond(200, { items: [item], total: 1 }).respond(200, { items: [], total: 0 });
    await expect(getCampaignSubmissions("pending")).resolves.toEqual([item]);
    await expect(getCampaignSubmissions("pending")).resolves.toEqual([]);
    expect(api.calls[0]).toEqual({ url: "/api/admin/submission-queue?status=pending&limit=50", method: "GET" });
  });

  it("filters by search query on the client", async () => {
    stubFetch().respond(200, { items: [item, { ...item, id: "sub-2", creator: { id: "c2", name: "Lain", username: "@lain" }, campaign: { ...item.campaign, title: "X" }, umkm: { id: "u", name: "Y" } }], total: 2 });
    await expect(getCampaignSubmissions("all", "creator")).resolves.toEqual([item]);
  });

  it.each([401, 403, 500])("throws route HTTP %i without fixture fallback", async (statusCode) => {
    stubFetch().respond(statusCode, { error: "denied" });
    await expect(getCampaignSubmissions("pending")).rejects.toMatchObject({ name: "AdminSubmissionReadError", statusCode, message: "denied" });
  });

  it("rejects malformed route response", async () => {
    stubFetch().respond(200, "not-json");
    await expect(getCampaignSubmissions("pending")).rejects.toBeInstanceOf(AdminSubmissionReadError);
    stubFetch().respond(200, { items: [{ id: 1 }], total: 1 });
    await expect(getCampaignSubmissions("pending")).rejects.toMatchObject({ statusCode: 502 });
  });
});
