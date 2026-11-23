import "server-only";

import { HttpError, throwIfDbError } from "@/server/http";

import { SIGNED_URL_TTL_SECONDS, type FilesContext, type UserFileRow } from "./shared";

/**
 * Signed URL baca untuk file privat setelah cek akses:
 *   - pemilik file;
 *   - pihak order yang dibagikan (`shared_with_order_id` → umkm_id/creator_id);
 *   - admin efektif.
 * File `deleted` / tidak ada → 404. Tanpa hak → 403.
 */
export async function getUserFileSignedUrl(
  ctx: FilesContext,
  fileId: string,
): Promise<{ url: string; expiresIn: number; fileName: string; mimeType: string }> {
  const { data, error } = await ctx.db
    .from("user_files")
    .select("id, user_id, storage_file_id, bucket_id, file_name, mime_type, status, shared_with_order_id")
    .eq("id", fileId)
    .maybeSingle();
  throwIfDbError(error);
  const file = data as unknown as UserFileRow | null;
  if (!file || file.status !== "active") throw new HttpError(404, "File tidak ditemukan.");

  let allowed = file.user_id === ctx.userId || ctx.isAdmin === true;
  if (!allowed && file.shared_with_order_id) {
    const { data: order, error: orderError } = await ctx.db
      .from("orders")
      .select("umkm_id, creator_id")
      .eq("id", file.shared_with_order_id)
      .maybeSingle();
    throwIfDbError(orderError);
    allowed = !!order && (order.umkm_id === ctx.userId || order.creator_id === ctx.userId);
  }
  if (!allowed) throw new HttpError(403, "Akses ditolak.");

  const { data: signed, error: signError } = await ctx.db.storage
    .from(file.bucket_id)
    .createSignedUrl(file.storage_file_id, SIGNED_URL_TTL_SECONDS);
  if (signError || !signed?.signedUrl) {
    throw new Error(`[storage] createSignedUrl gagal: ${signError?.message ?? "tanpa data"}`);
  }
  return {
    url: signed.signedUrl,
    expiresIn: SIGNED_URL_TTL_SECONDS,
    fileName: file.file_name,
    mimeType: file.mime_type,
  };
}
