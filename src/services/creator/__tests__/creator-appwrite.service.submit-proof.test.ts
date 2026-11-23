import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  listDocumentsMock,
  createDocumentMock,
  updateDocumentMock,
  executeFunctionMock,
  getSessionMock,
} = vi.hoisted(() => ({
  listDocumentsMock: vi.fn(),
  createDocumentMock: vi.fn(),
  updateDocumentMock: vi.fn(),
  executeFunctionMock: vi.fn(),
  getSessionMock: vi.fn(),
}));

vi.mock("@/lib/appwrite/databases", () => ({
  databases: {
    listDocuments: listDocumentsMock,
    createDocument: createDocumentMock,
    updateDocument: updateDocumentMock,
  },
}));

vi.mock("@/lib/appwrite/functions", async () => {
  const actual = await vi.importActual<typeof import("@/lib/appwrite/functions")>(
    "@/lib/appwrite/functions"
  );
  return {
    ...actual,
    executeFunction: executeFunctionMock,
    FUNCTION_IDS: {
      ...actual.FUNCTION_IDS,
      submitCampaignProof: "submit-campaign-proof",
    },
  };
});

vi.mock("@/services/auth/session.service", () => ({
  getSession: getSessionMock,
  getCurrentUserId: async () => {
    const session = await getSessionMock();
    return session?.success ? session.data.userId : null;
  },
}));

import { submitProofInAppwrite, type SubmitProofInput } from "../creator-appwrite.service";

describe("submitProofInAppwrite", () => {
  const validInput: SubmitProofInput = {
    claimId: "claim_1",
    campaignId: "campaign_1",
    platform: "tiktok",
    postUrl: "https://www.tiktok.com/@creator/video/123",
    caption: "proof",
  };

  beforeEach(() => {
    vi.clearAllMocks();
    getSessionMock.mockResolvedValue({
      success: true,
      data: { userId: "user_1" },
    });
  });

  it("calls submit-campaign-proof for valid owned claim", async () => {
    listDocumentsMock.mockResolvedValueOnce({
      documents: [{ $id: "claim_1", campaignId: "campaign_1", creatorId: "user_1", status: "claimed" }],
    });
    executeFunctionMock.mockResolvedValueOnce({ success: true });

    const result = await submitProofInAppwrite(validInput);

    expect(result.success).toBe(true);
    expect(executeFunctionMock).toHaveBeenCalledWith("submit-campaign-proof", validInput);
    expect(createDocumentMock).not.toHaveBeenCalled();
    expect(updateDocumentMock).not.toHaveBeenCalled();
  });

  it("rejects when claim campaign does not match payload", async () => {
    listDocumentsMock.mockResolvedValueOnce({
      documents: [{ $id: "claim_1", campaignId: "campaign_other", creatorId: "user_1", status: "claimed" }],
    });

    const result = await submitProofInAppwrite(validInput);

    expect(result.success).toBe(false);
    expect(result.code).toBe("validation");
    expect(result.error).toMatch(/campaign/i);
    expect(executeFunctionMock).not.toHaveBeenCalled();
    expect(createDocumentMock).not.toHaveBeenCalled();
  });
});
