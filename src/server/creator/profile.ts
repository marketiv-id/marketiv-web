import "server-only";

import type { User } from "@supabase/supabase-js";

import { HttpError } from "@/server/http";
import type { CreatorProfile } from "@/types/creator-dashboard";

import {
  authDisplayName,
  loadSocialAccounts,
  loadStartingPrices,
  normalizeNiche,
  num,
  pickPrimarySocialAccounts,
  socialUrl,
  str,
  throwIf,
  type ReadDb,
  type Row,
} from "./shared";

/**
 * Port `get-creator-profile` — profil kreator versi PEMILIK.
 *
 * Identitas dari sesi (route), tidak pernah dari parameter. Role kreator
 * dipastikan `requireUser({ role: "creator" })` di route (dulu: cek
 * `users.role` di sini → 403).
 *
 * Field tanpa sumber data (averageViews, responseTime, completionRate,
 * portfolioUrl) tetap tidak dikirim, sama dengan versi lama.
 */
export async function getCreatorProfile({
  db,
  user,
}: {
  db: ReadDb;
  user: Pick<User, "id" | "user_metadata">;
}): Promise<CreatorProfile> {
  const userId = user.id;

  const [profileRes, socialAccounts, startingPrices] = await Promise.all([
    db.from("creator_profiles").select("*").eq("user_id", userId).limit(1).maybeSingle(),
    loadSocialAccounts(db, [userId]),
    loadStartingPrices(db, [userId]),
  ]);
  throwIf(profileRes.error);
  const profile = profileRes.data as Row | null;
  if (!profile) throw new HttpError(404, "Profil kreator tidak ditemukan.");

  const primarySocial = pickPrimarySocialAccounts(socialAccounts).get(userId);
  const displayName = str(profile.display_name);

  const dto: CreatorProfile = {
    // userId, bukan id baris profil — orders/rate_cards/wallets memakai userId.
    id: userId,
    name: authDisplayName(user) || displayName,
    username: str(primarySocial?.username),
    avatarUrl: str(profile.avatar_url),
    bannerUrl: str(profile.banner_url),
    niche: normalizeNiche(profile.niche),
    bio: str(profile.bio),
    location: str(profile.city),
    followers: num(profile.total_followers),
    startingPrice: startingPrices.get(userId) ?? 0,
    rating: num(profile.rating),
    completedJobs: num(profile.total_orders),
    engagementRate: num(primarySocial?.engagement_rate),
    instagramUrl: socialUrl(socialAccounts, "instagram"),
    tiktokUrl: socialUrl(socialAccounts, "tiktok"),
    isVerified: profile.is_profile_completed === true,
    isOnboarded: profile.is_profile_completed === true,
  };
  return dto;
}
