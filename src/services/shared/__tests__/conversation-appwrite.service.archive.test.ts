import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  executeFunction: vi.fn(),
  getDocument: vi.fn(),
  getSession: vi.fn(),
  listDocuments: vi.fn(),
  updateDocument: vi.fn(),
}));

vi.mock("@/lib/appwrite/databases", () => ({
  databases: {
    getDocument: mocks.getDocument,
    listDocuments: mocks.listDocuments,
    updateDocument: mocks.updateDocument,
  },
}));

vi.mock("@/lib/appwrite/functions", async () => {
  const actual = await vi.importActual<typeof import("@/lib/appwrite/functions")>(
    "@/lib/appwrite/functions"
  );
  return {
    ...actual,
    executeFunction: mocks.executeFunction,
    FUNCTION_IDS: {
      ...actual.FUNCTION_IDS,
      patchConversationArchive: "patch-conversation-archive",
    },
  };
});

vi.mock("@/services/auth/session.service", () => ({
  getSession: mocks.getSession,
  // requireUserId (Fase 5) membaca userId lewat getCurrentUserId.
  getCurrentUserId: async () => {
    const session = await mocks.getSession();
    return session?.success ? session.data.userId : null;
  },
}));

import { FunctionExecutionError } from "@/lib/appwrite/functions";
import { setConversationArchivedInAppwrite } from "../conversation-appwrite.service";

describe("setConversationArchivedInAppwrite", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getSession.mockResolvedValue({ success: true, data: { userId: "umkm-1" } });
    mocks.getDocument.mockResolvedValue({
      $id: "conv-1",
      umkm_id: "umkm-1",
      creator_id: "creator-1",
    });
    mocks.executeFunction.mockResolvedValue({ ok: true });
    mocks.updateDocument.mockResolvedValue({ $id: "conv-1" });
  });

  it("delegates archive and unarchive to trusted Function without browser conversation update", async () => {
    await expect(setConversationArchivedInAppwrite("conv-1", true)).resolves.toEqual({
      success: true,
      data: null,
    });
    await expect(setConversationArchivedInAppwrite("conv-1", false)).resolves.toEqual({
      success: true,
      data: null,
    });

    expect(mocks.executeFunction.mock.calls).toEqual([
      ["patch-conversation-archive", { conversationId: "conv-1", isArchived: true }],
      ["patch-conversation-archive", { conversationId: "conv-1", isArchived: false }],
    ]);
    expect(mocks.updateDocument).not.toHaveBeenCalled();
  });

  it("preserves backend non-participant rejection without browser mutation", async () => {
    mocks.executeFunction.mockRejectedValue(
      new FunctionExecutionError("Percakapan tidak ditemukan.", 404, "not_found")
    );

    const result = await setConversationArchivedInAppwrite("conv-private", true);

    expect(result).toMatchObject({
      success: false,
      code: "not_found",
      error: "Percakapan tidak ditemukan.",
    });
    expect(mocks.updateDocument).not.toHaveBeenCalled();
  });
});
