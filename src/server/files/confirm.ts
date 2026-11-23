import "server-only";

import {
  USER_FILES_BUCKET,
  callFileRpc,
  rpcHint,
  throwFileRpcError,
  toUserFileDto,
  type FilesContext,
  type UserFileDto,
  type UserFileRow,
} from "./shared";

export interface ConfirmUploadInput {
  path: string;
  fileName: string;
  shareWithOrderId?: string;
}

/** Hint error yang berarti objek yang terunggah tidak akan pernah dipakai. */
const DISCARD_ON = new Set(["quota_exceeded", "file_limit", "invalid_file"]);

/**
 * Langkah 2 unggah file privat: catat `user_files` + debit kuota (RPC atomik,
 * idempoten per path). Ukuran/MIME dibaca SQL dari metadata objek Storage.
 *
 * Bila ditolak karena kuota/aturan file, objeknya dihapus supaya tidak menjadi
 * sampah di bucket. Penolakan `forbidden`/`not_found` TIDAK menghapus apa pun
 * (path bisa milik orang lain / memang tidak ada).
 */
export async function confirmUserFileUpload(
  ctx: FilesContext,
  input: ConfirmUploadInput,
): Promise<{ status: "ok"; file: UserFileDto }> {
  const { data, error } = await callFileRpc(ctx.db, "confirm_user_file", {
    p_user_id: ctx.userId,
    p_path: input.path,
    p_file_name: input.fileName,
    ...(input.shareWithOrderId ? { p_shared_with_order_id: input.shareWithOrderId } : {}),
  });

  if (error) {
    const hint = rpcHint(error);
    if (hint && DISCARD_ON.has(hint) && input.path.startsWith(`${ctx.userId}/`)) {
      const { error: removeError } = await ctx.db.storage.from(USER_FILES_BUCKET).remove([input.path]);
      if (removeError) console.error("[api.files.confirm] gagal menghapus objek yang ditolak", removeError);
    }
    throwFileRpcError(error);
  }

  return { status: "ok", file: toUserFileDto(data as unknown as UserFileRow) };
}
