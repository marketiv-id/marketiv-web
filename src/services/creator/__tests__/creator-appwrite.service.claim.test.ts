import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getDocument: vi.fn(), listDocuments: vi.fn(), createDocument: vi.fn(), deleteDocument: vi.fn(),
  incrementDocumentAttribute: vi.fn(), decrementDocumentAttribute: vi.fn(), executeFunction: vi.fn(), getSession: vi.fn(),
}));

vi.mock("@/lib/appwrite/databases", () => ({ databases: mocks }));
vi.mock("@/lib/appwrite/functions", async () => {
  const actual = await vi.importActual<typeof import("@/lib/appwrite/functions")>("@/lib/appwrite/functions");
  return { ...actual, executeFunction: mocks.executeFunction, FUNCTION_IDS: { ...actual.FUNCTION_IDS, unclaimCampaign: "unclaim-campaign" } };
});
vi.mock("@/services/auth/session.service", () => ({
  getSession: mocks.getSession,
  // requireUserId (Fase 5) membaca userId lewat getCurrentUserId.
  getCurrentUserId: async () => {
    const session = await mocks.getSession();
    return session?.success ? session.data.userId : null;
  },
}));

import { claimCampaignInAppwrite, unclaimCampaignInAppwrite } from "../creator-appwrite.service";
import { FunctionExecutionError } from "@/lib/appwrite/functions";

const campaign = { $id: "campaign-1", status: "active", totalClaims: 0, claimLimit: 2, submissionDays: 7 };
const profile = { $id: "profile-1", userId: "creator-1", isProfileCompleted: true };

describe("P5 creator claim/unclaim Appwrite service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getSession.mockResolvedValue({ success: true, data: { userId: "creator-1" } });
    mocks.getDocument.mockResolvedValue(campaign);
    mocks.createDocument.mockResolvedValue({ $id: "claim-1" });
  });

  it("creates valid claim without browser counter increment", async () => {
    mocks.listDocuments.mockResolvedValueOnce({ documents: [profile] }).mockResolvedValueOnce({ documents: [] });
    const result = await claimCampaignInAppwrite("campaign-1");
    expect(result).toMatchObject({ success: true, data: "claim-1" });
    expect(mocks.createDocument).toHaveBeenCalledTimes(1);
    expect(mocks.incrementDocumentAttribute).not.toHaveBeenCalled();
  });

  it("blocks non-expired duplicate but allows expired history query", async () => {
    mocks.listDocuments.mockResolvedValueOnce({ documents: [profile] }).mockResolvedValueOnce({ documents: [{ status: "claimed" }] });
    await expect(claimCampaignInAppwrite("campaign-1")).resolves.toMatchObject({ success: false, code: "validation" });
    mocks.listDocuments.mockReset();
    mocks.listDocuments.mockResolvedValueOnce({ documents: [profile] }).mockResolvedValueOnce({ documents: [] });
    await expect(claimCampaignInAppwrite("campaign-1")).resolves.toMatchObject({ success: true });
    expect(mocks.listDocuments.mock.calls[1][2]).toContainEqual(expect.stringContaining("notEqual"));
  });

  it("blocks inactive campaign, incomplete profile, and obvious full quota", async () => {
    mocks.getDocument.mockResolvedValueOnce({ ...campaign, status: "paused" });
    await expect(claimCampaignInAppwrite("campaign-1")).resolves.toMatchObject({ success: false });
    mocks.getDocument.mockResolvedValueOnce(campaign);
    mocks.listDocuments.mockResolvedValueOnce({ documents: [{ ...profile, isProfileCompleted: false }] });
    await expect(claimCampaignInAppwrite("campaign-1")).resolves.toMatchObject({ success: false });
    mocks.getDocument.mockResolvedValueOnce({ ...campaign, totalClaims: 2 });
    await expect(claimCampaignInAppwrite("campaign-1")).resolves.toMatchObject({ success: false });
  });

  it("uses trusted unclaim Function and rejects malformed response without browser deletion", async () => {
    mocks.executeFunction.mockResolvedValueOnce({ success: true, claimId: "claim-1" });
    await expect(unclaimCampaignInAppwrite("claim-1")).resolves.toMatchObject({ success: true });
    expect(mocks.executeFunction).toHaveBeenCalledWith("unclaim-campaign", { claimId: "claim-1" });
    expect(mocks.deleteDocument).not.toHaveBeenCalled();
    expect(mocks.decrementDocumentAttribute).not.toHaveBeenCalled();
    mocks.executeFunction.mockResolvedValueOnce({ success: true });
    await expect(unclaimCampaignInAppwrite("claim-1")).resolves.toMatchObject({ success: false, code: "server" });
  });

  it.each([[401, "auth"], [403, "forbidden"], [404, "not_found"], [409, "validation"], [500, "server"]] as const)(
    "propagates unclaim Function HTTP %i as %s",
    async (statusCode, code) => {
      mocks.executeFunction.mockRejectedValueOnce(new FunctionExecutionError("backend error", statusCode, code));
      await expect(unclaimCampaignInAppwrite("claim-1")).resolves.toMatchObject({ success: false, code, error: "backend error" });
      expect(mocks.deleteDocument).not.toHaveBeenCalled();
      expect(mocks.decrementDocumentAttribute).not.toHaveBeenCalled();
    },
  );

  it("propagates failed Function execution without browser mutation", async () => {
    mocks.executeFunction.mockRejectedValueOnce(new FunctionExecutionError("execution failed", 500, "server"));
    await expect(unclaimCampaignInAppwrite("claim-1")).resolves.toMatchObject({ success: false, code: "server" });
    expect(mocks.deleteDocument).not.toHaveBeenCalled();
  });
});
