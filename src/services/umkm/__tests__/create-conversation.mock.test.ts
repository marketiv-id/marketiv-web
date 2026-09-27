import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/config/data-source.config", () => ({ DATA_SOURCE_CONFIG: { useMockData: true } }));
vi.mock("@/lib/appwrite/databases", () => ({
  databases: {
    listDocuments: vi.fn(),
    createDocument: vi.fn(),
    updateDocument: vi.fn(),
    deleteDocument: vi.fn(),
  },
}));
vi.mock("@/lib/appwrite/functions", async () => {
  const actual = await vi.importActual<typeof import("@/lib/appwrite/functions")>(
    "@/lib/appwrite/functions"
  );
  return { ...actual, executeFunction: vi.fn() };
});
vi.mock("@/lib/appwrite/storage", () => ({
  uploadPublicFile: vi.fn(),
  FileRuleError: class FileRuleError extends Error {},
}));
vi.mock("@/services/shared/conversation-appwrite.service", () => ({
  sendMessageInAppwrite: vi.fn(),
  getMessagesByConversationIdInAppwrite: vi.fn(),
}));
vi.mock("@/services/shared/notification-appwrite.service", () => ({
  getNotificationsFromAppwrite: vi.fn(),
}));

import { createConversation } from "../umkm-dashboard.service";

describe("createConversation di mode mock", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("mengembalikan ruang milik kreator yang memang punya percakapan", async () => {
    const res = await createConversation("creator_001");

    expect(res.success).toBe(true);
    expect(res.data).toBe("conv_001");
  });

  it("gagal-tertutup (bukan mengarahkan ke ruang kreator lain) bila ruangnya tidak ada", async () => {
    const res = await createConversation("creator_016");

    expect(res.success).toBe(false);
    expect(res.data).not.toBe("conv_000");
    expect(res.code).toBe("not_found");
    expect(res.error).toContain("belum tersedia");
  });
});
