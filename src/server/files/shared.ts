import "server-only";

import type { AdminSupabaseClient } from "@/lib/supabase/admin";
import { HttpError, throwIfDbError, type DbErrorLike } from "@/server/http";

/**
 * Aturan file privat (bucket `user-files`).
 *
 * = aturan Function lama `validate-and-upload` (image/*, video/*, PDF, Word,
 *   Excel, PowerPoint OOXML; ≤ 20 MiB; ≤ 100 file aktif)
 * ∩ `allowed_mime_types` bucket user-files (0012).
 * Daftar yang SAMA ada di SQL `private.user_file_mime_allowed` (0021).
 */
export const USER_FILES_BUCKET = "user-files";
export const MAX_USER_FILE_BYTES = 20 * 1024 * 1024;
export const MAX_ACTIVE_FILES = 100;
/** Masa berlaku signed URL baca (detik). */
export const SIGNED_URL_TTL_SECONDS = 300;

export const USER_FILE_MIME_TYPES: readonly string[] = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/svg+xml",
  "video/mp4",
  "video/quicktime",
  "video/x-msvideo",
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
];

export function isAllowedUserFileMime(mime: string): boolean {
  return USER_FILE_MIME_TYPES.includes(mime);
}

/** Client service role yang dipakai modul file (bisa di-stub di test). */
export type FilesDb = Pick<AdminSupabaseClient, "from" | "rpc" | "storage">;

export interface FilesContext {
  db: FilesDb;
  userId: string;
  /** Admin efektif (app_metadata + users.role) — boleh membaca semua file. */
  isAdmin?: boolean;
}

/** Baris `public.user_files` (subset yang dipakai). */
export interface UserFileRow {
  id: string;
  user_id: string;
  storage_file_id: string;
  bucket_id: string;
  file_name: string;
  mime_type: string;
  size_bytes: number;
  status: string;
  shared_with_order_id: string | null;
  created_at: string;
  deleted_at?: string | null;
}

/** DTO file untuk respons route (bentuk mirip dokumen Function lama). */
export interface UserFileDto {
  $id: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  bucketId: string;
  storageFileId: string;
  status: string;
  sharedWithOrderId: string | null;
  createdAt: string;
}

export function toUserFileDto(row: UserFileRow): UserFileDto {
  return {
    $id: row.id,
    fileName: row.file_name,
    mimeType: row.mime_type,
    sizeBytes: Number(row.size_bytes),
    bucketId: row.bucket_id,
    storageFileId: row.storage_file_id,
    status: row.status,
    sharedWithOrderId: row.shared_with_order_id ?? null,
    createdAt: row.created_at,
  };
}

const HINT_STATUS: Record<string, number> = {
  not_found: 404,
  forbidden: 403,
  quota_exceeded: 409,
  file_limit: 409,
  invalid_file: 400,
};

/**
 * Error RPC 0021 (`P0001` + hint) → HttpError dengan pesan dari SQL.
 * Error lain diteruskan ke `throwIfDbError` (pemetaan umum).
 */
export function throwFileRpcError(error: (DbErrorLike & { hint?: string | null }) | null | undefined): void {
  if (!error) return;
  const status = error.code === "P0001" && error.hint ? HINT_STATUS[error.hint] : undefined;
  if (status) throw new HttpError(status, error.message || "Permintaan ditolak.");
  throwIfDbError(error);
}

/** Hint error RPC (dipakai confirm untuk memutuskan apakah objek dihapus). */
export function rpcHint(error: { code?: string; hint?: string | null } | null | undefined): string | null {
  return error?.code === "P0001" ? (error.hint ?? null) : null;
}

const SAFE_EXT = /^[a-z0-9]{1,10}$/;

/** Ekstensi dari nama file (hanya [a-z0-9], maks 10) — aman dipakai di path. */
export function safeExtension(fileName: string): string {
  const dot = fileName.lastIndexOf(".");
  if (dot < 0) return "";
  const ext = fileName.slice(dot + 1).toLowerCase();
  return SAFE_EXT.test(ext) ? ext : "";
}

type RpcResult = { data: unknown; error: (DbErrorLike & { hint?: string | null }) | null };

/**
 * Panggil RPC 0021. Tipe RPC baru belum ada di `src/types/supabase.ts` sampai
 * `npm run db:types` dijalankan setelah semua migration Fase 6 masuk, jadi
 * nama + argumen di-cast di sini. `.bind(db)`: rpc() memakai `this`.
 */
export function callFileRpc(db: FilesDb, name: "confirm_user_file" | "delete_user_file", args: Record<string, unknown>): PromiseLike<RpcResult> {
  const rpc = db.rpc.bind(db) as unknown as (fn: string, params: Record<string, unknown>) => PromiseLike<RpcResult>;
  return rpc(name, args);
}
