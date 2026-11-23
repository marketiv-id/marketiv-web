import "server-only";

import { randomUUID } from "node:crypto";

import { HttpError, throwIfDbError } from "@/server/http";

import {
  MAX_ACTIVE_FILES,
  MAX_USER_FILE_BYTES,
  USER_FILES_BUCKET,
  isAllowedUserFileMime,
  safeExtension,
  type FilesContext,
} from "./shared";

export interface CreateUploadUrlInput {
  fileName: string;
  mimeType: string;
  sizeBytes: number;
}

export interface CreateUploadUrlResult {
  bucketId: string;
  path: string;
  token: string;
}

/**
 * Langkah 1 unggah file privat: validasi + cek kuota awal → signed upload URL.
 *
 * Berkas TIDAK lewat route (batas body function Netlify); browser mengunggah
 * langsung ke Storage memakai `token`. Cek kuota di sini hanya pra-cek untuk
 * pesan cepat — penentu akhirnya `confirm_user_file()` (row lock) di langkah 2,
 * karena ukuran sebenarnya baru diketahui setelah unggah.
 */
export async function createUserFileUploadUrl(
  ctx: FilesContext,
  input: CreateUploadUrlInput,
): Promise<CreateUploadUrlResult> {
  if (!isAllowedUserFileMime(input.mimeType)) {
    throw new HttpError(400, "Tipe file tidak diizinkan.");
  }
  if (!Number.isFinite(input.sizeBytes) || input.sizeBytes <= 0) {
    throw new HttpError(400, "Ukuran file tidak valid.");
  }
  if (input.sizeBytes > MAX_USER_FILE_BYTES) {
    throw new HttpError(400, "Ukuran file maksimal 20 MB.");
  }

  const { data: usage, error } = await ctx.db
    .from("user_storage_usage")
    .select("used_bytes, quota_bytes, file_count")
    .eq("user_id", ctx.userId)
    .maybeSingle();
  throwIfDbError(error);
  if (!usage) throw new HttpError(404, "Kuota penyimpanan tidak ditemukan.");
  if (Number(usage.file_count) >= MAX_ACTIVE_FILES) {
    throw new HttpError(409, "Batas jumlah file aktif tercapai.");
  }
  if (Number(usage.used_bytes) + input.sizeBytes > Number(usage.quota_bytes)) {
    throw new HttpError(409, "Kuota penyimpanan penuh.");
  }

  const ext = safeExtension(input.fileName);
  const path = `${ctx.userId}/${randomUUID()}${ext ? `.${ext}` : ""}`;
  const { data, error: signError } = await ctx.db.storage
    .from(USER_FILES_BUCKET)
    .createSignedUploadUrl(path);
  if (signError || !data) {
    throw new Error(`[storage] createSignedUploadUrl gagal: ${signError?.message ?? "tanpa data"}`);
  }
  return { bucketId: USER_FILES_BUCKET, path: data.path ?? path, token: data.token };
}
