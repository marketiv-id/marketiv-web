import { beforeEach, describe, expect, it, vi } from "vitest";

import { createFakeSupabase, type FakeSupabase } from "@/test/fake-supabase";

const mocks = vi.hoisted(() => ({
  db: null as unknown as FakeSupabase,
  userId: "umkm-1" as string | null,
}));

vi.mock("@/lib/supabase/client", () => ({ createClient: () => mocks.db }));
vi.mock("@/services/auth/session.service", () => ({
  getSession: vi.fn(),
  getCurrentUserId: async () => mocks.userId,
}));

import {
  getMessagesByConversationIdInAppwrite,
  getMyConversationsFromAppwrite,
} from "../conversation-appwrite.service";

const conversationId = "conv-1";
const userId = "umkm-1";

const conversation = {
  id: conversationId,
  umkm_id: "umkm-1",
  creator_id: "creator-1",
  is_archived: false,
  created_at: "2026-09-24T00:00:00+00:00",
};

function seed(messages: Record<string, unknown>[], offers: Record<string, unknown>[] = []) {
  mocks.db = createFakeSupabase({ conversations: [conversation], messages, offers });
}

describe("getMessagesByConversationIdInAppwrite [UAT-09] — Supabase", () => {
  beforeEach(() => {
    mocks.userId = userId;
  });

  it("returns title in offerData when offer title exists (DTO identik)", async () => {
    seed(
      [
        {
          id: "msg-1",
          conversation_id: conversationId,
          sender_id: userId,
          message_type: "offer",
          content: "Penawaran Khusus: Video Reels",
          offer_id: "offer-1",
          read_at: "2026-09-24T01:00:00+00:00",
          created_at: "2026-09-24T01:00:00+00:00",
        },
        {
          id: "msg-0",
          conversation_id: conversationId,
          sender_id: "creator-1",
          message_type: "text",
          content: "Halo",
          offer_id: null,
          read_at: null,
          created_at: "2026-09-24T00:30:00+00:00",
        },
      ],
      [
        {
          id: "offer-1",
          conversation_id: conversationId,
          title: "Video Reels Spesial UMKM",
          package_name_snapshot: "Paket Standard",
          price: 1500000,
          description: "2 Video Reels durasi 60 detik",
          deadline: "2026-10-01T00:00:00+00:00",
          revision_limit: 2,
        },
      ],
    );

    const result = await getMessagesByConversationIdInAppwrite(conversationId);

    expect(result.success).toBe(true);
    // urut created_at naik, peran dari peserta percakapan
    expect(result.data).toEqual([
      {
        id: "msg-0",
        conversationId,
        senderId: "creator-1",
        senderRole: "creator",
        type: "text",
        content: "Halo",
        offerData: undefined,
        isRead: false,
        createdAt: "2026-09-24T00:30:00+00:00",
      },
      {
        id: "msg-1",
        conversationId,
        senderId: userId,
        senderRole: "umkm",
        type: "offer",
        content: "Penawaran Khusus: Video Reels",
        offerData: {
          offerId: "offer-1",
          title: "Video Reels Spesial UMKM",
          finalPrice: 1500000,
          scope: "2 Video Reels durasi 60 detik",
          deadline: "2026-10-01T00:00:00+00:00",
          revisionCount: 2,
        },
        isRead: true,
        createdAt: "2026-09-24T01:00:00+00:00",
      },
    ]);
    const tables = mocks.db.calls.map((c) => `${c.table}:${c.filters.join("&")}`);
    expect(tables).toContain(`messages:conversation_id.eq.${conversationId}`);
    expect(tables).toContain(`offers:conversation_id.eq.${conversationId}`);
  });

  it("falls back to packageNameSnapshot when title is empty or missing", async () => {
    seed(
      [
        {
          id: "msg-2",
          conversation_id: conversationId,
          sender_id: userId,
          message_type: "offer",
          content: "Penawaran Khusus: Paket Standard",
          offer_id: "offer-2",
          read_at: null,
          created_at: "2026-09-24T02:00:00+00:00",
        },
      ],
      [
        {
          id: "offer-2",
          conversation_id: conversationId,
          title: "",
          package_name_snapshot: "Paket Standard TikTok",
          price: 2000000,
          description: "3 Video TikTok",
          deadline: "2026-10-10T00:00:00+00:00",
          revision_limit: 1,
        },
      ],
    );

    const result = await getMessagesByConversationIdInAppwrite(conversationId);

    expect(result.success).toBe(true);
    expect(result.data).toHaveLength(1);
    expect(result.data[0].offerData?.title).toBe("Paket Standard TikTok");
  });

  it("handles message with offer_id when matching offer row is not found", async () => {
    seed([
      {
        id: "msg-3",
        conversation_id: conversationId,
        sender_id: userId,
        message_type: "offer",
        content: "Penawaran Khusus",
        offer_id: "offer-non-existent",
        read_at: null,
        created_at: "2026-09-24T03:00:00+00:00",
      },
    ]);

    const result = await getMessagesByConversationIdInAppwrite(conversationId);

    expect(result.success).toBe(true);
    expect(result.data).toHaveLength(1);
    expect(result.data[0].offerData).toBeUndefined();
  });

  it("bukan peserta → not_found, pesan tidak dibaca", async () => {
    seed([]);
    mocks.userId = "orang-lain";
    const result = await getMessagesByConversationIdInAppwrite(conversationId);
    expect(result).toMatchObject({ success: false, code: "not_found", data: [] });
    expect(mocks.db.calls.some((c) => c.table === "messages")).toBe(false);
  });

  it("percakapan tidak terbaca (RLS) → not_found", async () => {
    mocks.db = createFakeSupabase({ conversations: [] });
    const result = await getMessagesByConversationIdInAppwrite(conversationId);
    expect(result).toMatchObject({ success: false, code: "not_found" });
  });

  it("tanpa sesi → auth", async () => {
    seed([]);
    mocks.userId = null;
    const result = await getMessagesByConversationIdInAppwrite(conversationId);
    expect(result).toMatchObject({ success: false, code: "auth" });
  });
});

describe("getMyConversationsFromAppwrite — Supabase", () => {
  it("gabungkan percakapan sebagai UMKM dan kreator, filter per peran", async () => {
    mocks.userId = "u-1";
    mocks.db = createFakeSupabase({
      conversations: [
        { id: "c1", umkm_id: "u-1", creator_id: "k-1", is_archived: true },
        { id: "c2", umkm_id: "u-9", creator_id: "u-1", is_archived: false },
        { id: "c3", umkm_id: "u-9", creator_id: "k-2", is_archived: false },
      ],
    });
    const result = await getMyConversationsFromAppwrite();
    expect(result.data).toEqual([
      { id: "c1", umkmId: "u-1", creatorId: "k-1", isArchived: true },
      { id: "c2", umkmId: "u-9", creatorId: "u-1", isArchived: false },
    ]);
    expect(mocks.db.calls.map((c) => c.filters)).toEqual([["umkm_id.eq.u-1"], ["creator_id.eq.u-1"]]);
  });

  it("error RLS/DB → gagal baca generik", async () => {
    mocks.userId = "u-1";
    mocks.db = createFakeSupabase({});
    mocks.db.failTable("conversations", { code: "42501", message: "permission denied" });
    const result = await getMyConversationsFromAppwrite();
    expect(result).toMatchObject({ success: false, code: "forbidden", data: [] });
  });
});
