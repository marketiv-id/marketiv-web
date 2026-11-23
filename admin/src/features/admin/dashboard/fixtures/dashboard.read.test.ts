import { afterEach, describe, expect, it, vi } from "vitest";

import { stubFetch } from "@/test/fetch-mock";

const { fetchDashboardMetrics, AdminReadError } = await import("./dashboard.fixtures");
const valid = { pendingSubmissionsCount: 0, reviewedSubmissionsCount: 0, activeCampaignsCount: 3 };

describe("fetchDashboardMetrics secure read", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("maps zero counts and reviewedSubmissionsCount via GET /api/admin/dashboard-summary", async () => {
    const api = stubFetch().respond(200, valid);
    await expect(fetchDashboardMetrics()).resolves.toEqual(valid);
    expect(api.calls).toEqual([{ url: "/api/admin/dashboard-summary", method: "GET" }]);
  });

  it.each([401, 403, 500])("throws route HTTP %i instead of fabricated metrics", async (statusCode) => {
    stubFetch().respond(statusCode, { error: "failed" });
    await expect(fetchDashboardMetrics()).rejects.toMatchObject({ name: "AdminReadError", statusCode, message: "failed" });
  });

  it("rejects malformed summary", async () => {
    stubFetch().respond(200, { pendingSubmissionsCount: 0 });
    await expect(fetchDashboardMetrics()).rejects.toBeInstanceOf(AdminReadError);
  });
});
