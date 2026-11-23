import "server-only";

import { createHash } from "node:crypto";

import type { AdminSupabaseClient } from "@/lib/supabase/admin";

/**
 * Notifikasi in-app idempoten (pengganti event trigger Appwrite seperti
 * `notify-order-activity`, `campaign-claimed`).
 *
 * ID deterministik `ntf` + 29 hex pertama sha256("<sourceId>:<kind>") —
 * rumus SAMA dengan Function lama dan dengan `private.notification_id()` di
 * SQL (0018). Memanggil ulang untuk event yang sama tidak menggandakan
 * notifikasi (`on conflict (id) do nothing`).
 *
 * Notifikasi yang harus atomik dengan perubahan data sebaiknya ditulis DI
 * DALAM RPC (pakai `private.notification_id`). Helper ini untuk notifikasi
 * yang dikirim route setelah RPC sukses (gagal kirim tidak membatalkan aksi).
 */

export function notificationId(sourceId: string, kind: string): string {
  const digest = createHash("sha256").update(`${sourceId}:${kind}`).digest("hex");
  return `ntf${digest.slice(0, 29)}`;
}

export interface NotifyInput {
  userId: string;
  title: string;
  message: string;
  /** Nilai kolom `notifications.type`. */
  type: string;
  /** Sumber event (mis. id order/claim) + jenis event → ID deterministik. */
  sourceId: string;
  kind: string;
}

const clamp = (value: string, max: number): string => (value.length <= max ? value : `${value.slice(0, max - 1)}…`);

type NotifyDb = Pick<AdminSupabaseClient, "from">;

/** Tulis satu/lebih notifikasi. Tidak pernah melempar: kegagalan hanya di-log. */
export async function notify(db: NotifyDb, input: NotifyInput | NotifyInput[]): Promise<void> {
  const list = (Array.isArray(input) ? input : [input]).filter((n) => n.userId);
  if (list.length === 0) return;
  const rows = list.map((n) => ({
    id: notificationId(n.sourceId, n.kind),
    user_id: n.userId,
    title: clamp(n.title, 255),
    message: clamp(n.message, 1000),
    type: n.type,
    is_read: false,
  }));
  try {
    const { error } = await db.from("notifications").upsert(rows, { onConflict: "id", ignoreDuplicates: true });
    if (error) console.error("[notify] gagal menulis notifikasi", error.code, error.message);
  } catch (err) {
    console.error("[notify] gagal menulis notifikasi", err);
  }
}
