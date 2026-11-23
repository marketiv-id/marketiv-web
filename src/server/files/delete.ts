import "server-only";

import { callFileRpc, throwFileRpcError, toUserFileDto, type FilesContext, type UserFileDto, type UserFileRow } from "./shared";

/**
 * Hapus file privat milik sendiri (port `delete-file`).
 *
 * Urutan: RPC dulu (cek pemilik + soft delete + kembalikan kuota, atomik),
 * lalu objek Storage. Bila penghapusan objek gagal, file tetap tercatat
 * `deleted` dan kuota sudah dikembalikan — sisa objek hanya sampah yang
 * dicatat di log, bukan kebocoran akses (signed URL hanya untuk file aktif).
 */
export async function deleteUserFile(
  ctx: FilesContext,
  fileId: string,
): Promise<{ status: "ok"; file: UserFileDto }> {
  const { data, error } = await callFileRpc(ctx.db, "delete_user_file", { p_user_id: ctx.userId, p_file_id: fileId });
  throwFileRpcError(error);
  const row = data as unknown as UserFileRow;

  const { error: removeError } = await ctx.db.storage.from(row.bucket_id).remove([row.storage_file_id]);
  if (removeError) console.error("[api.files.delete] objek storage gagal dihapus", removeError);

  return { status: "ok", file: toUserFileDto(row) };
}
