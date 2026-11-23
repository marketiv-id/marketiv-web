import "server-only";

import type { User } from "@supabase/supabase-js";

import { HttpError, throwIfDbError } from "@/server/http";
import type { UserRow } from "@/server/auth/require-user";
import type { UmkmProfile } from "@/types/umkm-dashboard.types";

import { str, type UmkmReadContext } from "./shared";

/** Nama akun Auth (pengganti `users.get(userId).name` Appwrite). */
function authName(user: Pick<User, "user_metadata"> | null): string {
  const meta = (user?.user_metadata ?? {}) as Record<string, unknown>;
  return str(meta.display_name) || str(meta.full_name) || str(meta.name);
}

/**
 * Port `get-umkm-profile`: `users` + `umkm_profiles` + akun Auth.
 *
 * - ownerName      → nama akun Auth, fallback businessName.
 * - whatsappNumber → `users.phone`, fallback phone akun Auth.
 * `user` dan `userRow` sudah dibaca `requireUser()`; di sini cukup satu query.
 */
export async function getUmkmProfile(
  { db, userId }: UmkmReadContext,
  user: Pick<User, "user_metadata" | "email" | "phone"> | null,
  userRow: Pick<UserRow, "email" | "phone"> | null,
): Promise<UmkmProfile> {
  const { data: profile, error } = await db
    .from("umkm_profiles")
    .select("business_name, city, logo_url, is_profile_completed")
    .eq("user_id", userId)
    .maybeSingle();
  throwIfDbError(error);
  if (!profile) throw new HttpError(404, "UMKM profile not found");

  const businessName = str(profile.business_name);
  return {
    id: userId,
    businessName,
    ownerName: authName(user) || businessName,
    email: str(userRow?.email) || str(user?.email),
    whatsappNumber: str(userRow?.phone) || str(user?.phone),
    location: str(profile.city),
    avatarUrl: str(profile.logo_url),
    isVerified: profile.is_profile_completed === true,
  };
}
