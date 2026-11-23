import "server-only";

import { HttpError } from "@/server/http";
import type { CreatorProfile, PaginatedCreators } from "@/types/umkm-dashboard.types";

import {
  isUuid,
  loadSocialAccounts,
  loadStartingPrices,
  normalizeNiche,
  num,
  pickPrimarySocialAccounts,
  str,
  throwIf,
  type ReadDb,
  type Row,
} from "./shared";

/**
 * Port `get-creator-directory` — direktori kreator untuk UMKM.
 *
 *   { creatorId }       → satu CreatorProfile (tanpa syarat profil lengkap)
 *   { limit?, cursor? } → { items, total, nextCursor }
 *
 * Halaman: profil lengkap, rating desc. Appwrite memakai `cursorAfter($id)`;
 * di sini keyset (rating desc, id asc) lewat RPC `creator_directory_page`,
 * dengan cursor tetap = id baris `creator_profiles` terakhir (bentuk respons
 * sama).
 *
 * Kuirk lama yang dipertahankan: satu halaman maksimal 100 baris, dan
 * `nextCursor` hanya terisi bila jumlah baris = `limit` yang diminta (jadi
 * limit > 100 tidak pernah menghasilkan nextCursor).
 *
 * Field sensitif (WhatsApp, saldo, bank) tidak pernah ikut.
 */

const PAGE_SIZE = 100;
const DEFAULT_LIMIT = 100;
const MAX_LIMIT = 5000;

export function clampLimit(value: number | undefined): number {
  if (value === undefined || !Number.isFinite(value) || value <= 0) return DEFAULT_LIMIT;
  return Math.min(Math.floor(value), MAX_LIMIT);
}

async function toDirectoryItems(db: ReadDb, profiles: readonly Row[]): Promise<CreatorProfile[]> {
  const creatorIds = profiles.map((p) => str(p.user_id)).filter(Boolean);
  const [socialAccounts, startingPrices] = await Promise.all([
    loadSocialAccounts(db, creatorIds),
    loadStartingPrices(db, creatorIds),
  ]);
  const socialByCreator = pickPrimarySocialAccounts(socialAccounts);

  return profiles.map((profile) => {
    const id = str(profile.user_id);
    const social = socialByCreator.get(id);
    return {
      id,
      name: str(profile.display_name),
      username: str(social?.username),
      avatarUrl: str(profile.avatar_url),
      bannerUrl: str(profile.banner_url),
      niche: normalizeNiche(profile.niche),
      bio: str(profile.bio),
      location: str(profile.city),
      startingPrice: startingPrices.get(id) ?? 0,
      rating: num(profile.rating),
      completedJobs: num(profile.total_orders),
      engagementRate: num(social?.engagement_rate),
      isVerified: profile.is_profile_completed === true,
    };
  });
}

export async function getCreatorDirectoryEntry({ db, creatorId }: { db: ReadDb; creatorId: string }): Promise<CreatorProfile> {
  // ID kreator sekarang UUID Auth Supabase; ID lain pasti tidak ada.
  if (!isUuid(creatorId)) throw new HttpError(404, "Kreator tidak ditemukan.");
  const { data, error } = await db.from("creator_profiles").select("*").eq("user_id", creatorId).limit(1);
  throwIf(error);
  const profiles = (data ?? []) as Row[];
  if (profiles.length === 0) throw new HttpError(404, "Kreator tidak ditemukan.");
  const [item] = await toDirectoryItems(db, profiles);
  return item;
}

export async function getCreatorDirectoryPage({
  db,
  limit: rawLimit,
  cursor,
}: {
  db: ReadDb;
  limit?: number;
  cursor?: string | null;
}): Promise<PaginatedCreators> {
  const limit = clampLimit(rawLimit);
  const { data, error } = await db.rpc("creator_directory_page", {
    p_limit: Math.min(PAGE_SIZE, limit),
    p_cursor: cursor || null,
  });
  if (error?.code === "22023") throw new HttpError(400, "Cursor direktori tidak valid. Muat ulang halaman.");
  throwIf(error);

  const page = (data ?? {}) as { items?: Row[]; total?: unknown };
  const profiles = Array.isArray(page.items) ? page.items : [];
  const items = await toDirectoryItems(db, profiles);
  const nextCursor = profiles.length === limit ? str(profiles[profiles.length - 1]?.id) || null : null;

  return { items, total: num(page.total), nextCursor };
}
