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

import { getMessagesByConversationId } from "../creator-dashboard.service";
import { mockCreatorNegotiations } from "@/mocks/creator-dashboard.mock";
import { mockCreatorMessages } from "@/mocks/creator-messages.mock";

describe("chat kreator di mode mock", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("mengembalikan riwayat pesan untuk ruang yang dimiliki kreator", async () => {
    const res = await getMessagesByConversationId("conv_001");

    expect(res.success).toBe(true);
    expect(res.data?.length).toBeGreaterThan(0);
    expect(res.data?.[0].conversationId).toBe("conv_001");
  });

  it("mengembalikan daftar kosong (bukan error) untuk ruang tanpa pesan", async () => {
    const res = await getMessagesByConversationId("conv_tidak_ada");

    expect(res.success).toBe(true);
    expect(res.data).toEqual([]);
  });

  it("setiap ruang negosiasi kreator punya pesan dengan conversationId yang cocok", () => {
    for (const negotiation of mockCreatorNegotiations) {
      const messages = mockCreatorMessages[negotiation.conversationId] ?? [];
      expect(messages.length).toBeGreaterThan(0);
      for (const message of messages) {
        expect(message.conversationId).toBe(negotiation.conversationId);
      }
    }
  });
});
