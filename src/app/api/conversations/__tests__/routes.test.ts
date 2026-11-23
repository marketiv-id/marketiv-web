import { beforeEach, describe, expect, it, vi } from "vitest";

import { HttpError } from "@/server/http";
import { createFakeSupabase, type FakeSupabase } from "@/test/fake-supabase";

/**
 * Route tulis Fase 6: profil, ToS, banding, notifikasi, chat.
 * Guard (401/403), body rusak (400), error RPC (404), status sukses.
 */
const mocks = vi.hoisted(() => ({
  requireUser: vi.fn(),
  db: null as unknown as FakeSupabase,
}));

vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: () => mocks.db }));
vi.mock("@/server/auth/require-user", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/server/auth/require-user")>()),
  requireUser: mocks.requireUser,
}));

import { POST as appeals } from "../../appeals/route";
import { DELETE as deleteNotification, PATCH as patchNotification } from "../../notifications/[id]/route";
import { PATCH as markNotificationsRead } from "../../notifications/read/route";
import { PATCH as profile } from "../../profile/route";
import { POST as tos } from "../../tos/route";
import { PATCH as archive } from "../[conversationId]/archive/route";
import { POST as messages } from "../[conversationId]/messages/route";
import { POST as read } from "../[conversationId]/read/route";
import { POST as createConversation } from "../route";

const ME = "11111111-1111-4111-8111-111111111111";
const CREATOR = "22222222-2222-4222-8222-222222222222";

const req = (method: string, body?: unknown, raw?: string) =>
  new Request("http://localhost/api/x", {
    method,
    headers: { "content-type": "application/json" },
    ...(raw !== undefined ? { body: raw } : body !== undefined ? { body: JSON.stringify(body) } : {}),
  });
const params = <T extends Record<string, string>>(value: T) => ({ params: Promise.resolve(value) });

function signedIn(role = "umkm") {
  mocks.requireUser.mockResolvedValue({
    user: { id: ME, app_metadata: {}, user_metadata: {} },
    userRow: { id: ME, role, status: "active" },
  });
}

type Call = () => Promise<Response>;
const calls: [string, Call][] = [
  ["PATCH /api/profile", () => profile(req("PATCH", { city: "X" }))],
  ["POST /api/tos", () => tos(req("POST", { action: "status" }))],
  ["POST /api/appeals", () => appeals(req("POST", { reason: "x" }))],
  ["PATCH /api/notifications/read", () => markNotificationsRead(req("PATCH", { ids: ["n1"] }))],
  ["PATCH /api/notifications/[id]", () => patchNotification(req("PATCH", { isRead: true }), params({ id: "n1" }))],
  ["DELETE /api/notifications/[id]", () => deleteNotification(req("DELETE"), params({ id: "n1" }))],
  ["POST /api/conversations", () => createConversation(req("POST", { creatorId: CREATOR }))],
  ["POST …/messages", () => messages(req("POST", { content: "hai" }), params({ conversationId: "c1" }))],
  ["POST …/read", () => read(req("POST"), params({ conversationId: "c1" }))],
  ["PATCH …/archive", () => archive(req("PATCH", { isArchived: true }), params({ conversationId: "c1" }))],
];

beforeEach(() => {
  vi.clearAllMocks();
  mocks.db = createFakeSupabase({ users: [{ id: ME, tos_version: "v3.1", tos_accepted_at: "2026-01-01T00:00:00+00:00" }] });
});

describe("route tulis Fase 6", () => {
  it.each(calls)("%s: tanpa sesi → 401 tanpa menyentuh database", async (_name, call) => {
    mocks.requireUser.mockRejectedValue(new HttpError(401, "Sesi tidak ditemukan. Silakan login."));
    const res = await call();
    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: "Sesi tidak ditemukan. Silakan login.", code: "auth" });
    expect(mocks.db.rpc).not.toHaveBeenCalled();
    expect(mocks.db.calls).toEqual([]);
  });

  it("body JSON rusak → 400 (setelah sesi valid)", async () => {
    signedIn();
    const res = await profile(req("PATCH", undefined, "{rusak"));
    expect(res.status).toBe(400);
    expect(await res.json()).toMatchObject({ code: "validation" });
  });

  it("guard role/status diteruskan ke requireUser", async () => {
    signedIn();
    await createConversation(req("POST", { creatorId: CREATOR }));
    expect(mocks.requireUser.mock.calls[0][0]).toMatchObject({ role: "umkm" });
    await messages(req("POST", { content: "hai" }), params({ conversationId: "c1" }));
    expect(mocks.requireUser.mock.calls[1][0]).toMatchObject({ role: ["umkm", "creator"] });
    await appeals(req("POST", { reason: "x" }));
    expect(mocks.requireUser.mock.calls[2][0]).toMatchObject({ allowInactive: true });
  });

  it("kreator membuka percakapan → 403 dari guard", async () => {
    mocks.requireUser.mockRejectedValue(new HttpError(403, "Hanya UMKM yang dapat memulai percakapan."));
    const res = await createConversation(req("POST", { creatorId: CREATOR }));
    expect(res.status).toBe(403);
    expect(await res.json()).toEqual({ error: "Hanya UMKM yang dapat memulai percakapan.", code: "forbidden" });
  });

  it("kirim pesan → 201 + DTO; bukan peserta → 404", async () => {
    signedIn();
    const msg = { id: "m1", conversationId: "c1", senderId: ME, senderRole: "umkm", type: "text", content: "hai", isRead: false, createdAt: "t" };
    mocks.db.setRpc("send_message", () => msg);
    let res = await messages(req("POST", { content: "hai" }), params({ conversationId: "c1" }));
    expect(res.status).toBe(201);
    expect(await res.json()).toEqual(msg);
    expect(mocks.db.rpc).toHaveBeenCalledWith("send_message", { p_sender_id: ME, p_conversation_id: "c1", p_content: "hai" });

    mocks.db.setRpc("send_message", () => {
      throw Object.assign(new Error("Percakapan tidak ditemukan."), { code: "P0002" });
    });
    res = await messages(req("POST", { content: "hai" }), params({ conversationId: "orang-lain" }));
    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ error: "Percakapan tidak ditemukan.", code: "not_found" });
  });

  it("profil, ToS, notifikasi, baca, arsip: 200 dengan userId sesi", async () => {
    signedIn("creator");
    mocks.db.setRpc("update_profile", () => ({ success: true, role: "creator", isProfileCompleted: false }));
    mocks.db.setRpc("mark_notifications_read", () => 1);
    mocks.db.setRpc("set_notification_read", () => true);
    mocks.db.setRpc("delete_notification", () => true);
    mocks.db.setRpc("mark_conversation_read", () => 0);
    mocks.db.setRpc("set_conversation_archived", () => ({ ok: true, conversationId: "c1", isArchived: true }));

    const results = await Promise.all([
      profile(req("PATCH", { city: "X" })),
      tos(req("POST", { action: "status" })),
      markNotificationsRead(req("PATCH", { ids: ["n1"] })),
      patchNotification(req("PATCH", { isRead: true }), params({ id: "n1" })),
      deleteNotification(req("DELETE"), params({ id: "n1" })),
      read(req("POST"), params({ conversationId: "c1" })),
      archive(req("PATCH", { isArchived: true }), params({ conversationId: "c1" })),
    ]);
    expect(results.map((r) => r.status)).toEqual([200, 200, 200, 200, 200, 200, 200]);
    expect(await results[1].json()).toEqual({
      currentVersion: "v3.1",
      acceptedVersion: "v3.1",
      acceptedAt: "2026-01-01T00:00:00+00:00",
      needsConsent: false,
    });
    for (const [, args] of mocks.db.rpc.mock.calls) {
      const owner = (args as Record<string, unknown>).p_user_id ?? (args as Record<string, unknown>).p_sender_id;
      expect(owner).toBe(ME);
    }
  });

  it("banding → 201", async () => {
    signedIn();
    mocks.db.setRpc("create_appeal", () => ({ appealId: "a1", status: "submitted", slaDecidedAt: "t", notificationId: "n" }));
    const res = await appeals(req("POST", { reason: "Mohon ditinjau" }));
    expect(res.status).toBe(201);
  });
});
