import "server-only";

import type { User } from "@supabase/supabase-js";

import type { AdminSupabaseClient } from "@/lib/supabase/admin";
import { throwIfDbError, type DbErrorLike } from "@/server/http";
import type { CreatorNiche } from "@/types/creator-dashboard";

/**
 * Helper bersama port 4 Function baca kreator (Fase 5).
 *
 * `ReadDb` = bagian client service role yang dipakai modul ini. `rpc` diketik
 * longgar karena RPC 0016 belum ada di `src/types/supabase.ts` (regenerasi tipe
 * dilakukan setelah semua migration Fase 5 digabung). Bentuk hasil RPC diketik
 * manual di masing-masing modul.
 */
export interface ReadDb {
  from: AdminSupabaseClient["from"];
  rpc: (fn: string, args?: Record<string, unknown>) => PromiseLike<{ data: unknown; error: DbErrorLike | null }>;
}

export function asReadDb(client: AdminSupabaseClient): ReadDb {
  return client as unknown as ReadDb;
}

export type Row = Record<string, unknown>;

export const str = (value: unknown): string => (typeof value === "string" ? value : "");

/** `number()` di main.js lama: Number() lalu 0 bila tidak finite. */
export const num = (value: unknown): number => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

/** Harus sinkron dengan CreatorNiche di src/types/creator-dashboard.ts. */
const NICHES = new Set<CreatorNiche>(["kuliner", "fashion", "pariwisata", "edukasi", "kecantikan", "lainnya"]);

export function normalizeNiche(value: unknown): CreatorNiche {
  const niche = str(value).toLowerCase() as CreatorNiche;
  return NICHES.has(niche) ? niche : "lainnya";
}

/** Platform MVP — akun TikTok mewakili kreator. */
const PRIMARY_PLATFORM = "tiktok";

/**
 * Satu kreator bisa punya beberapa akun sosial; pilih satu wakil supaya
 * username dan engagementRate merujuk akun yang sama. TikTok dulu, lalu
 * follower terbanyak; seri → akun yang lebih dulu dibuat (urutan input).
 */
export function isBetterSocialAccount(candidate: Row, current: Row): boolean {
  const candidateIsPrimary = str(candidate.platform) === PRIMARY_PLATFORM;
  const currentIsPrimary = str(current.platform) === PRIMARY_PLATFORM;
  if (candidateIsPrimary !== currentIsPrimary) return candidateIsPrimary;
  return num(candidate.followers) > num(current.followers);
}

export function pickPrimarySocialAccounts(accounts: readonly Row[]): Map<string, Row> {
  const byCreator = new Map<string, Row>();
  for (const account of accounts) {
    const creatorId = str(account.creator_id);
    const current = byCreator.get(creatorId);
    if (!current || isBetterSocialAccount(account, current)) byCreator.set(creatorId, account);
  }
  return byCreator;
}

/** URL profil deterministik dari username — tidak ada kolom URL. */
export function socialUrl(accounts: readonly Row[], platform: "tiktok" | "instagram"): string | undefined {
  const account = accounts.find((a) => str(a.platform) === platform);
  const username = str(account?.username).replace(/^@/, "");
  if (!username) return undefined;
  return platform === "tiktok" ? `https://www.tiktok.com/@${username}` : `https://www.instagram.com/${username}`;
}

/**
 * Padanan "nama akun Appwrite Auth": nama di `user_metadata` Supabase, urutan
 * sama dengan `session.service.ts` (display_name → full_name → name).
 */
export function authDisplayName(user: Pick<User, "user_metadata"> | null | undefined): string {
  const meta = (user?.user_metadata ?? {}) as Record<string, unknown>;
  for (const key of ["display_name", "full_name", "name"]) {
    const value = meta[key];
    if (typeof value === "string" && value.trim()) return value;
  }
  return "";
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const isUuid = (value: string): boolean => UUID_RE.test(value);

/** Harga mulai per kreator (RPC `creator_starting_prices`). Tanpa harga → tidak ada di map. */
export async function loadStartingPrices(db: ReadDb, creatorIds: readonly string[]): Promise<Map<string, number>> {
  if (creatorIds.length === 0) return new Map();
  const { data, error } = await db.rpc("creator_starting_prices", { p_creator_ids: creatorIds });
  throwIf(error);
  const rows = (data ?? []) as { creator_id: string; starting_price: number | string }[];
  return new Map(rows.map((r) => [str(r.creator_id), num(r.starting_price)]));
}

/** Akun sosial semua kreator di `creatorIds`, urut pembuatan (penentu seri). */
export async function loadSocialAccounts(db: ReadDb, creatorIds: readonly string[]): Promise<Row[]> {
  if (creatorIds.length === 0) return [];
  const { data, error } = await db
    .from("creator_social_accounts")
    .select("*")
    .in("creator_id", [...creatorIds])
    .order("created_at", { ascending: true })
    .order("id", { ascending: true });
  throwIf(error);
  return (data ?? []) as Row[];
}


export const throwIf = (error: DbErrorLike | null | undefined): void => throwIfDbError(error);
