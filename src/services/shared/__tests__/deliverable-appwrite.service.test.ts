import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  createDocumentMock,
  executeFunctionMock,
  getDocumentMock,
  getSessionMock,
  listDocumentsMock,
} = vi.hoisted(() => ({
  createDocumentMock: vi.fn(),
  executeFunctionMock: vi.fn(),
  getDocumentMock: vi.fn(),
  getSessionMock: vi.fn(),
  listDocumentsMock: vi.fn(),
}));

vi.mock("@/lib/appwrite/databases", () => ({
  databases: {
    createDocument: createDocumentMock,
    getDocument: getDocumentMock,
    listDocuments: listDocumentsMock,
    updateDocument: vi.fn(),
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
      submitRatecardDeliverable: "submit-ratecard-deliverable",
      requestRatecardRevision: "request-ratecard-revision",
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

import { FunctionExecutionError } from "@/lib/appwrite/functions";
import {
  requestRevisionInAppwrite,
  uploadDeliverableInAppwrite,
} from "../deliverable-appwrite.service";

const input = {
  orderId: "order_1",
  source: "external_url" as const,
  fileUrl: "https://drive.example.test/deliverable",
  notes: "Versi final",
};

const response = {
  id: "deliverable_1",
  orderId: "order_1",
  source: "external_url" as const,
  fileUrl: "https://drive.example.test/deliverable",
  notes: "Versi final",
  version: 2,
  status: "submitted" as const,
  createdAt: "2026-09-02T03:00:00.000Z",
};

describe("uploadDeliverableInAppwrite", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getSessionMock.mockResolvedValue({ success: true, data: { userId: "creator_1" } });
  });

  it("submits through trusted Function without browser database writes", async () => {
    executeFunctionMock.mockResolvedValue(response);

    const result = await uploadDeliverableInAppwrite(input);

    expect(result).toEqual({ success: true, data: response });
    expect(executeFunctionMock).toHaveBeenCalledWith("submit-ratecard-deliverable", input);
    expect(getDocumentMock).not.toHaveBeenCalled();
    expect(listDocumentsMock).not.toHaveBeenCalled();
    expect(createDocumentMock).not.toHaveBeenCalled();
  });

  it("preserves Function authorization errors in ServiceResult", async () => {
    executeFunctionMock.mockRejectedValue(
      new FunctionExecutionError(
        "Hanya kreator pengerja yang dapat mengirim deliverable.",
        403,
        "forbidden"
      )
    );

    const result = await uploadDeliverableInAppwrite(input);

    expect(result).toMatchObject({
      success: false,
      code: "forbidden",
      error: "Hanya kreator pengerja yang dapat mengirim deliverable.",
    });
    expect(createDocumentMock).not.toHaveBeenCalled();
  });
});

describe("requestRevisionInAppwrite", () => {
  const revisionInput = {
    orderId: "order_1",
    message: "Perbaiki hook pembuka.",
  };
  const revisionResponse = {
    id: "revision_1",
    orderId: "order_1",
    requestedBy: "umkm_1",
    message: revisionInput.message,
    status: "open" as const,
    createdAt: "2026-09-04T03:00:00.000Z",
  };

  it("delegates complete mutation to trusted Function", async () => {
    executeFunctionMock.mockResolvedValue(revisionResponse);

    const result = await requestRevisionInAppwrite({
      ...revisionInput,
      umkmId: "forged_umkm",
      creatorId: "forged_creator",
      role: "creator",
    } as typeof revisionInput);

    expect(result).toEqual({ success: true, data: revisionResponse });
    expect(executeFunctionMock).toHaveBeenCalledWith(
      "request-ratecard-revision",
      revisionInput
    );
    expect(getDocumentMock).not.toHaveBeenCalled();
    expect(listDocumentsMock).not.toHaveBeenCalled();
    expect(createDocumentMock).not.toHaveBeenCalled();
  });

  it("preserves Function authorization errors and performs no browser writes", async () => {
    executeFunctionMock.mockRejectedValue(
      new FunctionExecutionError(
        "Pesanan tidak ditemukan.",
        404,
        "not_found"
      )
    );

    const result = await requestRevisionInAppwrite(revisionInput);

    expect(result).toMatchObject({
      success: false,
      code: "not_found",
      error: "Pesanan tidak ditemukan.",
    });
    expect(createDocumentMock).not.toHaveBeenCalled();
    expect(getDocumentMock).not.toHaveBeenCalled();
    expect(listDocumentsMock).not.toHaveBeenCalled();
  });
});
