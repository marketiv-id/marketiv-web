import "server-only";

import { z } from "zod";

import { callWriteRpc, type WriteDb } from "@/server/conversations/write-rpc";
import { HttpError, parseBody } from "@/server/http";

/**
 * Tulis notifikasi — hanya milik sendiri (filter `user_id` di dalam RPC).
 *   PATCH  /api/notifications/read  { ids: string[] } → { ok, updated }
 *   PATCH  /api/notifications/[id]  { isRead: boolean } → { ok, id, isRead }
 *   DELETE /api/notifications/[id]                    → { ok, id }
 */

const idSchema = z.string().trim().min(1).max(255);

const markReadSchema = z.object({
  ids: z
    .array(idSchema, { error: "Daftar ID notifikasi wajib diisi." })
    .min(1, "Daftar ID notifikasi wajib diisi.")
    .max(500, "Maksimal 500 notifikasi sekali tandai."),
});

const patchSchema = z.object({
  isRead: z.boolean({ error: "isRead wajib boolean." }),
});

function notificationId(raw: string): string {
  const parsed = idSchema.safeParse(raw);
  if (!parsed.success) throw new HttpError(404, "Notifikasi tidak ditemukan.");
  return parsed.data;
}

export async function markNotificationsRead(ctx: { db: WriteDb; userId: string }, body: unknown) {
  const { ids } = parseBody(markReadSchema, body, "Daftar ID notifikasi wajib diisi.");
  const updated = await callWriteRpc<number>(ctx.db, "mark_notifications_read", {
    p_user_id: ctx.userId,
    p_ids: [...new Set(ids)],
  });
  return { ok: true as const, updated: Number(updated) || 0 };
}

export async function setNotificationRead(ctx: { db: WriteDb; userId: string }, rawId: string, body: unknown) {
  const id = notificationId(rawId);
  const { isRead } = parseBody(patchSchema, body, "isRead wajib boolean.");
  await callWriteRpc<boolean>(ctx.db, "set_notification_read", {
    p_user_id: ctx.userId,
    p_id: id,
    p_is_read: isRead,
  });
  return { ok: true as const, id, isRead };
}

export async function deleteNotification(ctx: { db: WriteDb; userId: string }, rawId: string) {
  const id = notificationId(rawId);
  await callWriteRpc<boolean>(ctx.db, "delete_notification", { p_user_id: ctx.userId, p_id: id });
  return { ok: true as const, id };
}
