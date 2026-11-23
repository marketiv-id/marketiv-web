import "server-only";

import type { AdminSupabaseClient } from "@/lib/supabase/admin";
import { HttpError, throwIfDbError } from "@/server/http";

/** Konteks baca UMKM: client service role + userId sesi yang sudah diverifikasi. */
export interface UmkmReadContext {
  db: Pick<AdminSupabaseClient, "from" | "rpc">;
  userId: string;
}

export type Row = Record<string, unknown>;

/** Sama dengan `str()` di Function lama: hanya string yang dihitung. */
export const str = (value: unknown): string => (typeof value === "string" ? value : "");

/** `number()` versi get-umkm-negotiations: hanya tipe number. */
export const strictNumber = (value: unknown): number => (typeof value === "number" ? value : 0);

/** `number()` versi get-umkm-ratecard-reviews: Number() yang finite. */
export const looseNumber = (value: unknown): number => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

export function byKey(rows: readonly Row[], pick: (row: Row) => string): Map<string, Row> {
  return new Map(rows.map((row) => [pick(row), row]));
}

export function groupBy(rows: readonly Row[], pick: (row: Row) => string): Map<string, Row[]> {
  const groups = new Map<string, Row[]>();
  for (const row of rows) {
    const key = pick(row);
    const group = groups.get(key) ?? [];
    group.push(row);
    groups.set(key, group);
  }
  return groups;
}

/**
 * Panggil RPC baca (0015_read_umkm.sql). Tipe RPC belum ada di
 * `src/types/supabase.ts` (regenerasi menunggu semua migration Fase 5), jadi
 * nama + argumen di-cast di satu tempat ini.
 */
export async function callReadRpc<T>(
  db: UmkmReadContext["db"],
  name: string,
  args: Record<string, unknown>,
): Promise<T> {
  // `.bind(db)`: rpc() memakai `this` (PostgrestClient); tanpa bind → TypeError di runtime.
  const rpc = db.rpc.bind(db) as unknown as (
    fn: string,
    params: Record<string, unknown>,
  ) => PromiseLike<{ data: unknown; error: { code?: string; message?: string } | null }>;
  const { data, error } = await rpc(name, args);
  throwIfDbError(error);
  if (data === null || data === undefined) {
    throw new HttpError(500, "Terjadi kesalahan di server. Coba lagi.", "server");
  }
  return data as T;
}
