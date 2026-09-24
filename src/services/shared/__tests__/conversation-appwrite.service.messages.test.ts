import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getDocument: vi.fn(),
  getSession: vi.fn(),
  listDocuments: vi.fn(),
}));

vi.mock("@/lib/appwrite/databases", () => ({
  databases: {
    getDocument: mocks.getDocument,
    listDocuments: mocks.listDocuments,
  },
}));

vi.mock("@/services/auth/session.service", () => ({ getSession: mocks.getSession }));

import { getMessagesByConversationIdInAppwrite } from "../conversation-appwrite.service";

describe("getMessagesByConversationIdInAppwrite [UAT-09]", () => {
  const conversationId = "conv-1";
  const userId = "umkm-1";

  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getSession.mockResolvedValue({
      success: true,
      data: { userId },
    });
    mocks.getDocument.mockResolvedValue({
      $id: conversationId,
      umkm_id: "umkm-1",
      creator_id: "creator-1",
    });
  });

  it("returns title in offerData when offer title exists", async () => {
    mocks.listDocuments.mockImplementation((_db: string, collection: string) => {
      if (collection === "messages") {
        return Promise.resolve({
          documents: [
            {
              $id: "msg-1",
              conversation_id: conversationId,
              sender_id: userId,
              message_type: "offer",
              content: "Penawaran Khusus: Video Reels",
              offer_id: "offer-1",
              read_at: "2026-09-24T01:00:00.000Z",
              $createdAt: "2026-09-24T01:00:00.000Z",
            },
          ],
        });
      }
      if (collection === "offers") {
        return Promise.resolve({
          documents: [
            {
              $id: "offer-1",
              title: "Video Reels Spesial UMKM",
              packageNameSnapshot: "Paket Standard",
              price: 1500000,
              description: "2 Video Reels durasi 60 detik",
              deadline: "2026-10-01",
              revisionLimit: 2,
            },
          ],
        });
      }
      return Promise.resolve({ documents: [] });
    });

    const result = await getMessagesByConversationIdInAppwrite(conversationId);

    expect(result.success).toBe(true);
    expect(result.data).toHaveLength(1);
    expect(result.data[0].offerData).toEqual({
      offerId: "offer-1",
      title: "Video Reels Spesial UMKM",
      finalPrice: 1500000,
      scope: "2 Video Reels durasi 60 detik",
      deadline: "2026-10-01",
      revisionCount: 2,
    });
  });

  it("falls back to packageNameSnapshot when title is empty or missing", async () => {
    mocks.listDocuments.mockImplementation((_db: string, collection: string) => {
      if (collection === "messages") {
        return Promise.resolve({
          documents: [
            {
              $id: "msg-2",
              conversation_id: conversationId,
              sender_id: userId,
              message_type: "offer",
              content: "Penawaran Khusus: Paket Standard",
              offer_id: "offer-2",
              read_at: "",
              $createdAt: "2026-09-24T02:00:00.000Z",
            },
          ],
        });
      }
      if (collection === "offers") {
        return Promise.resolve({
          documents: [
            {
              $id: "offer-2",
              title: "",
              packageNameSnapshot: "Paket Standard TikTok",
              price: 2000000,
              description: "3 Video TikTok",
              deadline: "2026-10-10",
              revisionLimit: 1,
            },
          ],
        });
      }
      return Promise.resolve({ documents: [] });
    });

    const result = await getMessagesByConversationIdInAppwrite(conversationId);

    expect(result.success).toBe(true);
    expect(result.data).toHaveLength(1);
    expect(result.data[0].offerData?.title).toBe("Paket Standard TikTok");
  });

  it("handles message with offer_id when matching offer document is not found", async () => {
    mocks.listDocuments.mockImplementation((_db: string, collection: string) => {
      if (collection === "messages") {
        return Promise.resolve({
          documents: [
            {
              $id: "msg-3",
              conversation_id: conversationId,
              sender_id: userId,
              message_type: "offer",
              content: "Penawaran Khusus",
              offer_id: "offer-non-existent",
              read_at: "",
              $createdAt: "2026-09-24T03:00:00.000Z",
            },
          ],
        });
      }
      if (collection === "offers") {
        return Promise.resolve({ documents: [] });
      }
      return Promise.resolve({ documents: [] });
    });

    const result = await getMessagesByConversationIdInAppwrite(conversationId);

    expect(result.success).toBe(true);
    expect(result.data).toHaveLength(1);
    expect(result.data[0].offerData).toBeUndefined();
  });
});
