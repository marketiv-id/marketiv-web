import { beforeEach, describe, expect, it, vi } from "vitest";
import { FunctionExecutionError } from "@/lib/appwrite/functions";

const {
  listDocumentsMock,
  executeFunctionMock,
  getCurrentUserIdMock,
} = vi.hoisted(() => ({
  listDocumentsMock: vi.fn(),
  executeFunctionMock: vi.fn(),
  getCurrentUserIdMock: vi.fn(),
}));

vi.mock("@/lib/appwrite/databases", () => ({
  databases: {
    listDocuments: listDocumentsMock,
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
      patchCampaignStatus: "patch-campaign-status",
    },
  };
});

vi.mock("@/services/auth/session.service", () => ({
  getCurrentUserId: getCurrentUserIdMock,
}));

import { updateCampaignStatusInAppwrite } from "../umkm-appwrite.service";

describe("updateCampaignStatusInAppwrite", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getCurrentUserIdMock.mockResolvedValue("umkm-1");
  });

  it("preserves backend FunctionExecutionError message for mutation failure", async () => {
    executeFunctionMock.mockRejectedValueOnce(
      new FunctionExecutionError(
        "Transisi status active -> paused saja yang diizinkan.",
        422,
        "validation"
      )
    );

    const result = await updateCampaignStatusInAppwrite("campaign-1", "paused");

    expect(result.success).toBe(false);
    expect(result.code).toBe("validation");
    expect(result.error).toBe("Transisi status active -> paused saja yang diizinkan.");
    expect(listDocumentsMock).not.toHaveBeenCalled();
  });
});
