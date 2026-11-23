import "server-only";

import type { AdminSupabaseClient } from "@/lib/supabase/admin";
import { HttpError, throwIfDbError, type DbErrorLike } from "@/server/http";

/**
 * Panggil RPC tulis Fase 6 (0018_account_chat_writes.sql) dan petakan error-nya.
 *
 * RPC menaikkan pesan Indonesia yang memang untuk pengguna, dengan SQLSTATE:
 *   P0002 → 404, 42501 → 403, 22023 → 400, P0001 → 409
 * Pesannya diteruskan apa adanya (`throwIfDbError` umum memakai pesan generik
 * untuk 22023, dan tidak mengenal P0002). Error lain → `throwIfDbError`.
 *
 * Dipakai route profil, ToS, banding, notifikasi, dan chat.
 *
 * Tipe RPC belum ada di `src/types/supabase.ts` (regenerasi setelah semua
 * migration Fase 6 masuk), jadi nama + argumen di-cast di sini. `db.rpc(...)`
 * dipanggil sebagai method (butuh `this`).
 */
export type WriteDb = Pick<AdminSupabaseClient, "rpc">;

const STATUS_BY_CODE: Record<string, number> = {
  P0002: 404,
  "42501": 403,
  "22023": 400,
  P0001: 409,
};

export function rpcErrorToHttp(error: DbErrorLike): HttpError | null {
  const status = error.code ? STATUS_BY_CODE[error.code] : undefined;
  if (!status) return null;
  return new HttpError(status, error.message || "Permintaan ditolak.");
}

export async function callWriteRpc<T>(db: WriteDb, name: string, args: Record<string, unknown>): Promise<T> {
  const rpc = db.rpc as unknown as (
    this: WriteDb,
    fn: string,
    params: Record<string, unknown>,
  ) => PromiseLike<{ data: unknown; error: DbErrorLike | null }>;
  const { data, error } = await rpc.call(db, name, args);
  if (error) {
    const mapped = rpcErrorToHttp(error);
    if (mapped) throw mapped;
    throwIfDbError(error);
  }
  return data as T;
}
