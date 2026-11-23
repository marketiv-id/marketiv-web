import { beforeEach, describe, expect, it } from "vitest";

import { HttpError } from "@/server/http";
import { createAppeal } from "@/server/appeals/create-appeal";
import {
  createConversation,
  markConversationRead,
  sendMessage,
  setConversationArchived,
} from "@/server/conversations/conversations";
import { rpcErrorToHttp } from "@/server/conversations/write-rpc";
import { deleteNotification, markNotificationsRead, setNotificationRead } from "@/server/notifications/notifications";
import { updateProfile } from "@/server/profile/update-profile";
import { handleTos } from "@/server/tos/accept-tos";
import { createFakeSupabase, type FakeSupabase } from "@/test/fake-supabase";

/**
 * Lapisan TS route tulis Fase 6: validasi body, argumen RPC (userId SELALU
 * dari sesi, bukan body), dan pemetaan error RPC → HTTP. Logika SQL-nya diuji
 * pgTAP (supabase/tests/account_chat_writes.test.sql).
 */

const ME = "11111111-1111-4111-8111-111111111111";
const CREATOR = "22222222-2222-4222-8222-222222222222";

let db: FakeSupabase;
const ctx = () => ({ db: db as never, userId: ME });

function rpcArgs(name: string) {
  return db.rpc.mock.calls.filter(([fn]) => fn === name).map(([, args]) => args);
}

async function httpError(promise: Promise<unknown>) {
  const err = await promise.catch((e: unknown) => e);
  expect(err).toBeInstanceOf(HttpError);
  return err as HttpError;
}

beforeEach(() => {
  db = createFakeSupabase({
    users: [{ id: ME, tos_version: "v1", tos_accepted_at: "2026-01-01T00:00:00+00:00" }],
  });
});

describe("rpcErrorToHttp", () => {
  it.each([
    ["P0002", 404],
    ["42501", 403],
    ["22023", 400],
    ["P0001", 409],
  ])("%s → %i dengan pesan RPC", (code, status) => {
    const err = rpcErrorToHttp({ code, message: "Pesan RPC." });
    expect(err).toMatchObject({ status, message: "Pesan RPC." });
  });

  it("kode lain → null (diteruskan ke throwIfDbError)", () => {
    expect(rpcErrorToHttp({ code: "XX000", message: "x" })).toBeNull();
  });
});

describe("updateProfile", () => {
  it("UMKM: hanya field whitelist + userId sesi; isProfileCompleted dibuang", async () => {
    db.setRpc("update_profile", () => ({ success: true, role: "umkm", isProfileCompleted: false }));
    await updateProfile(
      { ...ctx(), role: "umkm" },
      { city: "Bandung", logoUrl: "https://cdn/logo.png", isProfileCompleted: true, role: "admin", userId: CREATOR },
    );
    expect(rpcArgs("update_profile")).toEqual([
      { p_user_id: ME, p_patch: { city: "Bandung", logoUrl: "https://cdn/logo.png" } },
    ]);
  });

  it("kreator: field kreator saja (businessName UMKM dibuang)", async () => {
    db.setRpc("update_profile", () => ({ success: true, role: "creator", isProfileCompleted: true }));
    await updateProfile({ ...ctx(), role: "creator" }, { niche: "kuliner", avatarUrl: "", businessName: "X" });
    expect(rpcArgs("update_profile")[0]).toEqual({ p_user_id: ME, p_patch: { niche: "kuliner", avatarUrl: "" } });
  });

  it("validasi memakai aturan form: deskripsi < 20, telepon salah, niche asing, URL javascript: → 400", async () => {
    for (const [role, body] of [
      ["umkm", { description: "pendek" }],
      ["umkm", { phone: "123" }],
      ["creator", { niche: "otomotif" }],
      ["creator", { avatarUrl: "javascript:alert(1)" }],
    ] as const) {
      const err = await httpError(updateProfile({ ...ctx(), role }, body));
      expect(err.status).toBe(400);
    }
    expect(db.rpc).not.toHaveBeenCalled();
  });

  it("role admin → 400 (sama dengan Function)", async () => {
    const err = await httpError(updateProfile({ ...ctx(), role: "admin" }, { city: "X" }));
    expect(err).toMatchObject({ status: 400, message: "Role tidak didukung untuk update profil." });
  });

  it("profil hilang di RPC → 404 dengan pesan RPC", async () => {
    db.setRpc("update_profile", () => {
      throw Object.assign(new Error("Profil UMKM tidak ditemukan."), { code: "P0002" });
    });
    const err = await httpError(updateProfile({ ...ctx(), role: "umkm" }, { city: "X" }));
    expect(err).toMatchObject({ status: 404, message: "Profil UMKM tidak ditemukan." });
  });
});

describe("handleTos", () => {
  it("status: dibaca dari baris users sendiri", async () => {
    await expect(handleTos(ctx(), { action: "status" })).resolves.toEqual({
      currentVersion: "v3.1",
      acceptedVersion: "v1",
      acceptedAt: "2026-01-01T00:00:00+00:00",
      needsConsent: true,
    });
    expect(db.calls).toEqual([{ table: "users", filters: [`id.eq.${ME}`], count: undefined }]);
  });

  it("accept (default action): versi aktif → RPC", async () => {
    db.setRpc("accept_tos", () => ({ success: true, alreadyAccepted: false, tos_version: "v3.1" }));
    await expect(handleTos(ctx(), { tos_version: "v3.1" })).resolves.toEqual({
      success: true,
      alreadyAccepted: false,
      tos_version: "v3.1",
    });
    expect(rpcArgs("accept_tos")).toEqual([{ p_user_id: ME, p_version: "v3.1" }]);
  });

  it("versi kosong / beda / action asing → 400", async () => {
    expect((await httpError(handleTos(ctx(), { action: "accept" }))).message).toBe("tos_version wajib diisi.");
    expect((await httpError(handleTos(ctx(), { tos_version: "v2" }))).message).toBe(
      "Versi T&C tidak sesuai dengan versi aktif.",
    );
    expect((await httpError(handleTos(ctx(), { action: "hapus" }))).status).toBe(400);
    expect(db.rpc).not.toHaveBeenCalled();
  });

  it("status tanpa baris users → 404", async () => {
    db = createFakeSupabase({ users: [] });
    expect((await httpError(handleTos(ctx(), { action: "status" }))).status).toBe(404);
  });
});

describe("createAppeal", () => {
  it("argumen RPC + respons diteruskan", async () => {
    const res = { appealId: "ap1", status: "submitted", slaDecidedAt: "t", notificationId: "ntf1" };
    db.setRpc("create_appeal", () => res);
    await expect(createAppeal(ctx(), { reason: " Saya tidak curang ", evidence: "" })).resolves.toEqual(res);
    expect(rpcArgs("create_appeal")).toEqual([
      { p_user_id: ME, p_reason: "Saya tidak curang", p_evidence: null, p_action_ref: null },
    ]);
  });

  it("alasan kosong → 400; banding terbuka (P0001) → 409; akun aktif (42501) → 403", async () => {
    expect((await httpError(createAppeal(ctx(), { reason: "  " }))).status).toBe(400);
    db.setRpc("create_appeal", () => {
      throw Object.assign(new Error("Anda sudah memiliki banding yang sedang diproses."), { code: "P0001" });
    });
    expect((await httpError(createAppeal(ctx(), { reason: "x" }))).status).toBe(409);
    db.setRpc("create_appeal", () => {
      throw Object.assign(new Error("Akun Anda berstatus aktif, tidak bisa banding."), { code: "42501" });
    });
    expect(await httpError(createAppeal(ctx(), { reason: "x" }))).toMatchObject({
      status: 403,
      message: "Akun Anda berstatus aktif, tidak bisa banding.",
    });
  });
});

describe("notifikasi", () => {
  it("tandai dibaca: ID unik + userId sesi", async () => {
    db.setRpc("mark_notifications_read", () => 2);
    await expect(markNotificationsRead(ctx(), { ids: ["n1", "n2", "n1"] })).resolves.toEqual({ ok: true, updated: 2 });
    expect(rpcArgs("mark_notifications_read")).toEqual([{ p_user_id: ME, p_ids: ["n1", "n2"] }]);
  });

  it("ids kosong / bukan array → 400", async () => {
    expect((await httpError(markNotificationsRead(ctx(), { ids: [] }))).message).toBe(
      "Daftar ID notifikasi wajib diisi.",
    );
    expect((await httpError(markNotificationsRead(ctx(), {}))).status).toBe(400);
  });

  it("PATCH/DELETE satu notifikasi; milik orang lain (P0002) → 404", async () => {
    db.setRpc("set_notification_read", () => true);
    db.setRpc("delete_notification", () => true);
    await expect(setNotificationRead(ctx(), "n1", { isRead: true })).resolves.toEqual({ ok: true, id: "n1", isRead: true });
    await expect(deleteNotification(ctx(), "n1")).resolves.toEqual({ ok: true, id: "n1" });
    expect(rpcArgs("set_notification_read")).toEqual([{ p_user_id: ME, p_id: "n1", p_is_read: true }]);
    expect(rpcArgs("delete_notification")).toEqual([{ p_user_id: ME, p_id: "n1" }]);

    db.setRpc("delete_notification", () => {
      throw Object.assign(new Error("Notifikasi tidak ditemukan."), { code: "P0002" });
    });
    expect((await httpError(deleteNotification(ctx(), "nB"))).status).toBe(404);
    expect((await httpError(setNotificationRead(ctx(), "n1", { isRead: "ya" }))).status).toBe(400);
  });
});

describe("chat", () => {
  it("buat percakapan: pemanggil = umkm_id, creatorId harus UUID & bukan diri sendiri", async () => {
    db.setRpc("create_conversation", () => "conv-1");
    await expect(createConversation(ctx(), { creatorId: CREATOR })).resolves.toEqual({ conversationId: "conv-1" });
    expect(rpcArgs("create_conversation")).toEqual([{ p_umkm_id: ME, p_creator_id: CREATOR }]);

    expect((await httpError(createConversation(ctx(), { creatorId: "6a12appwrite" }))).message).toBe(
      "Profil kreator ini belum tertaut ke akun yang sah.",
    );
    expect((await httpError(createConversation(ctx(), { creatorId: ME }))).status).toBe(400);
    expect((await httpError(createConversation(ctx(), {}))).message).toBe("Kreator tidak valid.");
  });

  it("kirim pesan: trim, batas 2000, pengirim = sesi", async () => {
    const msg = { id: "m1", conversationId: "conv-1", senderId: ME, senderRole: "umkm", type: "text", content: "hai", isRead: false, createdAt: "t" };
    db.setRpc("send_message", () => msg);
    await expect(sendMessage(ctx(), "conv-1", { content: "  hai " })).resolves.toEqual(msg);
    expect(rpcArgs("send_message")).toEqual([{ p_sender_id: ME, p_conversation_id: "conv-1", p_content: "hai" }]);

    expect((await httpError(sendMessage(ctx(), "conv-1", { content: "  " }))).message).toBe("Pesan tidak boleh kosong.");
    expect((await httpError(sendMessage(ctx(), "conv-1", { content: "x".repeat(2001) }))).message).toBe(
      "Pesan maksimal 2000 karakter.",
    );
  });

  it("bukan peserta (P0002) → 404 'Percakapan tidak ditemukan.'", async () => {
    db.setRpc("send_message", () => {
      throw Object.assign(new Error("Percakapan tidak ditemukan."), { code: "P0002" });
    });
    expect(await httpError(sendMessage(ctx(), "conv-x", { content: "hai" }))).toMatchObject({
      status: 404,
      message: "Percakapan tidak ditemukan.",
    });
  });

  it("tandai dibaca & arsip: satu RPC dengan userId sesi", async () => {
    db.setRpc("mark_conversation_read", () => 4);
    db.setRpc("set_conversation_archived", (args) => ({ ok: true, conversationId: args.p_conversation_id, isArchived: args.p_archived }));
    await expect(markConversationRead(ctx(), "conv-1")).resolves.toEqual({ ok: true, updated: 4 });
    await expect(setConversationArchived(ctx(), "conv-1", { isArchived: true })).resolves.toEqual({
      ok: true,
      conversationId: "conv-1",
      isArchived: true,
    });
    expect(rpcArgs("mark_conversation_read")).toEqual([{ p_user_id: ME, p_conversation_id: "conv-1" }]);
    expect(rpcArgs("set_conversation_archived")).toEqual([{ p_user_id: ME, p_conversation_id: "conv-1", p_archived: true }]);
    expect((await httpError(setConversationArchived(ctx(), "conv-1", { isArchived: "true" }))).message).toBe(
      "isArchived wajib boolean.",
    );
  });
});
