import "server-only";

import type { User } from "@supabase/supabase-js";

import type { AdminSupabaseClient } from "@/lib/supabase/admin";

import { HttpError } from "./http-error";
import type { UserRow } from "./require-user";

/** Role yang boleh dibuat sendiri. `admin` hanya lewat allowlist (bukan jalur ini). */
export type RegistrableRole = "umkm" | "creator";

export function isRegistrableRole(value: unknown): value is RegistrableRole {
  return value === "umkm" || value === "creator";
}

const metaString = (meta: Record<string, unknown> | undefined, key: string): string | undefined => {
  const value = meta?.[key];
  return typeof value === "string" && value.trim() !== "" ? value.trim() : undefined;
};

/** Nama tampilan dari metadata pendaftaran / provider OAuth (Google: full_name, name). */
export function displayNameFromUser(user: Pick<User, "user_metadata">): string | undefined {
  const meta = user.user_metadata as Record<string, unknown> | undefined;
  return metaString(meta, "display_name") ?? metaString(meta, "full_name") ?? metaString(meta, "name");
}

/**
 * Email dianggap terverifikasi tanpa OTP hanya bila datang dari provider OAuth
 * yang memverifikasi email (Google). Akun email+password wajib OTP.
 */
export function isEmailVerifiedByProvider(user: Pick<User, "app_metadata" | "identities">): boolean {
  if (user.app_metadata?.provider === "google") return true;
  return (user.identities ?? []).some(
    (identity) => identity.provider === "google" && identity.identity_data?.email_verified !== false,
  );
}

/**
 * Panggil RPC `provision_user` (idempoten, satu transaksi): users + profil +
 * wallet + kuota storage. Pengganti event users.*.create Appwrite.
 */
export async function provisionUser(
  admin: AdminSupabaseClient,
  user: User,
  role: RegistrableRole,
  extra: { phone?: string; displayName?: string } = {},
): Promise<UserRow> {
  if (!user.email) {
    throw new HttpError(400, "Akun ini belum punya email, profil tidak bisa dibuat.");
  }

  const meta = user.user_metadata as Record<string, unknown> | undefined;
  const { data, error } = await admin.rpc("provision_user", {
    p_user_id: user.id,
    p_role: role,
    p_email: user.email,
    p_phone: extra.phone ?? metaString(meta, "phone"),
    p_display_name: extra.displayName ?? displayNameFromUser(user),
    p_email_verified: isEmailVerifiedByProvider(user),
  });

  if (error) {
    // 23505 = unique_violation: email sudah dipakai baris users lain.
    if (error.code === "23505") {
      throw new HttpError(409, "Email ini sudah terdaftar di akun lain. Hubungi admin Marketiv.");
    }
    throw error;
  }
  return data as UserRow;
}
