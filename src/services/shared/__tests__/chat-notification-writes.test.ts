import { beforeEach, describe, expect, it, vi } from "vitest";

import { FunctionExecutionError } from "@/lib/api/errors";

/**
 * Jalur TULIS chat & notifikasi (Fase 6): semua lewat `callApi` → Route
 * Handler. Browser tidak memanggil Appwrite maupun `.insert/.update/.delete`
 * supabase.
 */
const mocks = vi.hoisted(() => ({
  callApi: vi.fn(),
  userId: "11111111-1111-4111-8111-111111111111" as string | null,
  supabaseFrom: vi.fn(),
}));

vi.mock("@/lib/api/call-api", () => ({ callApi: mocks.callApi }));
vi.mock("@/lib/supabase/client", () => ({ createClient: () => ({ from: mocks.supabaseFrom }) }));
vi.mock("@/services/auth/session.service", () => ({
  getSession: vi.fn(),
  getCurrentUserId: async () => mocks.userId,
}));

import {
  createConversationInAppwrite,
  markConversationReadInAppwrite,
  sendMessageInAppwrite,
  setConversationArchivedInAppwrite,
} from "../conversation-appwrite.service";
import {
  deleteNotificationInAppwrite,
  markAllNotificationsReadInAppwrite,
  markNotificationReadInAppwrite,
} from "../notification-appwrite.service";

const CREATOR = "22222222-2222-4222-8222-222222222222";

beforeEach(() => {
  vi.clearAllMocks();
  mocks.userId = "11111111-1111-4111-8111-111111111111";
  mocks.callApi.mockResolvedValue({ ok: true });
});

itHasNoBrowserWrites();

function itHasNoBrowserWrites() {
  // Tidak satu pun fungsi tulis menyentuh supabase-js dari browser.
  it("tidak ada akses supabase-js langsung di jalur tulis", async () => {
    await setConversationArchivedInAppwrite("conv-1", true);
    await markConversationReadInAppwrite("conv-1");
    await markNotificationReadInAppwrite("n1");
    await deleteNotificationInAppwrite("n1");
    expect(mocks.supabaseFrom).not.toHaveBeenCalled();
  });
}

describe("setConversationArchivedInAppwrite", () => {
  it("arsip & batal arsip lewat route", async () => {
    await expect(setConversationArchivedInAppwrite("conv-1", true)).resolves.toEqual({ success: true, data: null });
    await expect(setConversationArchivedInAppwrite("conv-1", false)).resolves.toEqual({ success: true, data: null });
    expect(mocks.callApi.mock.calls).toEqual([
      ["patchConversationArchive", { conversationId: "conv-1", isArchived: true }],
      ["patchConversationArchive", { conversationId: "conv-1", isArchived: false }],
    ]);
  });

  it("penolakan bukan-peserta (404) diteruskan", async () => {
    mocks.callApi.mockRejectedValue(new FunctionExecutionError("Percakapan tidak ditemukan.", 404, "not_found"));
    await expect(setConversationArchivedInAppwrite("conv-private", true)).resolves.toMatchObject({
      success: false,
      code: "not_found",
      error: "Percakapan tidak ditemukan.",
    });
  });
});

describe("createConversationInAppwrite", () => {
  it("UUID kreator → route, kembalikan conversationId", async () => {
    mocks.callApi.mockResolvedValue({ conversationId: "conv-9" });
    await expect(createConversationInAppwrite(CREATOR)).resolves.toEqual({ success: true, data: "conv-9" });
    expect(mocks.callApi).toHaveBeenCalledWith("createConversation", { creatorId: CREATOR });
  });

  it("validasi awal: diri sendiri / ID lama non-UUID ditolak tanpa request", async () => {
    await expect(createConversationInAppwrite(mocks.userId!)).resolves.toMatchObject({ code: "validation" });
    await expect(createConversationInAppwrite("6a1234appwriteid")).resolves.toMatchObject({
      code: "validation",
      error: "Profil kreator ini belum tertaut ke akun yang sah.",
    });
    expect(mocks.callApi).not.toHaveBeenCalled();
  });

  it("tanpa sesi → auth", async () => {
    mocks.userId = null;
    await expect(createConversationInAppwrite(CREATOR)).resolves.toMatchObject({ success: false, code: "auth" });
  });
});

describe("sendMessageInAppwrite", () => {
  it("teks di-trim lalu dikirim ke route; DTO diteruskan", async () => {
    const msg = { id: "m1", conversationId: "conv-1", senderId: "x", senderRole: "umkm", type: "text", content: "hai", isRead: false, createdAt: "t" };
    mocks.callApi.mockResolvedValue(msg);
    await expect(sendMessageInAppwrite("conv-1", "  hai  ")).resolves.toEqual({ success: true, data: msg });
    expect(mocks.callApi).toHaveBeenCalledWith("sendMessage", { conversationId: "conv-1", content: "hai" });
  });

  it("kosong / > 2000 karakter ditolak tanpa request", async () => {
    await expect(sendMessageInAppwrite("conv-1", "   ")).resolves.toMatchObject({ code: "validation" });
    await expect(sendMessageInAppwrite("conv-1", "x".repeat(2001))).resolves.toMatchObject({ code: "validation" });
    expect(mocks.callApi).not.toHaveBeenCalled();
  });

  it("pesan error route diteruskan (write error)", async () => {
    mocks.callApi.mockRejectedValue(new FunctionExecutionError("Percakapan tidak ditemukan.", 404, "not_found"));
    await expect(sendMessageInAppwrite("conv-x", "hai")).resolves.toMatchObject({
      success: false,
      code: "not_found",
      error: "Percakapan tidak ditemukan.",
    });
  });
});

describe("markConversationReadInAppwrite", () => {
  it("satu request → jumlah yang ditandai", async () => {
    mocks.callApi.mockResolvedValue({ ok: true, updated: 3 });
    await expect(markConversationReadInAppwrite("conv-1")).resolves.toEqual({ success: true, data: 3 });
    expect(mocks.callApi).toHaveBeenCalledWith("markConversationRead", { conversationId: "conv-1" });
  });
});

describe("notifikasi", () => {
  it("tandai dibaca / tandai semua / hapus lewat route", async () => {
    await markNotificationReadInAppwrite("n1");
    await markAllNotificationsReadInAppwrite(["n1", "n2"]);
    await deleteNotificationInAppwrite("n1");
    expect(mocks.callApi.mock.calls).toEqual([
      ["updateNotification", { id: "n1", isRead: true }],
      ["markNotificationsRead", { ids: ["n1", "n2"] }],
      ["deleteNotification", { id: "n1" }],
    ]);
  });

  it("tandai semua dengan daftar kosong → no-op", async () => {
    await expect(markAllNotificationsReadInAppwrite([])).resolves.toEqual({ success: true, data: null });
    expect(mocks.callApi).not.toHaveBeenCalled();
  });

  it("404 dari route diteruskan sebagai not_found", async () => {
    mocks.callApi.mockRejectedValue(new FunctionExecutionError("Notifikasi tidak ditemukan.", 404, "not_found"));
    await expect(deleteNotificationInAppwrite("nB")).resolves.toMatchObject({ success: false, code: "not_found" });
  });
});
