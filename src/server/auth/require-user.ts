import "server-only";

import type { User } from "@supabase/supabase-js";

import { createAdminClient, type AdminSupabaseClient } from "@/lib/supabase/admin";
import { createClient, type ServerSupabaseClient } from "@/lib/supabase/server";
import type { Database } from "@/types/supabase";
import type { UserRole } from "@/types/domain";

import { HttpError } from "./http-error";

/**
 * Guard server untuk SEMUA Route Handler yang butuh login.
 *
 * Port dari `00_BACKEND/functions/_shared/require-active-role.js`:
 *   - tanpa sesi valid              → 401
 *   - sesi ada, baris `users` belum → 404 (kecuali `allowMissingProfile`)
 *   - status ≠ active               → 403
 *   - role tidak sesuai             → 403
 *
 * Identitas SELALU dari `auth.getUser()` (memverifikasi JWT ke Supabase Auth),
 * tidak pernah dari body request (celah #4) dan bukan dari `getSession()` yang
 * hanya membaca cookie.
 *
 * Role admin wajib `users.role = 'admin'` DAN `app_metadata.role = 'admin'`
 * (sama dengan `private.is_admin()` di 0010). `user_metadata` / prefs tidak
 * pernah dibaca untuk otorisasi (celah #5).
 */

export type UserRow = Database["public"]["Tables"]["users"]["Row"];

export interface RequireUserMessages {
  unauthenticated?: string;
  notFound?: string;
  inactive?: string;
  wrongRole?: string;
}

export interface RequireUserOptions {
  /** Role yang diizinkan. Kosong = semua role. */
  role?: UserRole | readonly UserRole[];
  /** Izinkan status selain `active` (mis. alur banding akun suspended). */
  allowInactive?: boolean;
  messages?: RequireUserMessages;
  /** Untuk test / pemanggil yang sudah punya client. */
  clients?: { server?: ServerSupabaseClient; admin?: AdminSupabaseClient };
}

export interface RequiredUser {
  user: User;
  userRow: UserRow;
}

export interface MaybeProvisionedUser {
  user: User;
  userRow: UserRow | null;
}

const DEFAULT_MESSAGES: Required<RequireUserMessages> = {
  unauthenticated: "Sesi tidak ditemukan. Silakan login.",
  notFound: "Profil pengguna belum tersedia.",
  inactive: "Akun kamu sedang ditangguhkan. Hubungi admin Marketiv.",
  wrongRole: "Akun ini tidak punya akses untuk aksi tersebut.",
};

/** `app_metadata` hanya bisa diubah service role, jadi aman untuk otorisasi. */
export function hasAdminAppMetadata(user: Pick<User, "app_metadata">): boolean {
  return user.app_metadata?.role === "admin";
}

/** Admin efektif: dua sumber harus setuju (lihat komentar modul). */
export function isAdminUser(user: Pick<User, "app_metadata">, row: Pick<UserRow, "role"> | null): boolean {
  return row?.role === "admin" && hasAdminAppMetadata(user);
}

/** Pengguna terautentikasi tanpa syarat baris `users` (register/provision/OTP). */
export async function requireAuthUser(
  options: Pick<RequireUserOptions, "messages" | "clients"> = {},
): Promise<MaybeProvisionedUser> {
  const messages = { ...DEFAULT_MESSAGES, ...options.messages };
  const server = options.clients?.server ?? (await createClient());

  const { data, error } = await server.auth.getUser();
  if (error || !data.user) {
    throw new HttpError(401, messages.unauthenticated);
  }

  const admin = options.clients?.admin ?? createAdminClient();
  const { data: row, error: rowError } = await admin
    .from("users")
    .select("*")
    .eq("id", data.user.id)
    .maybeSingle();
  if (rowError) throw rowError;

  return { user: data.user, userRow: row };
}

/** Pengguna terautentikasi + baris `users` aktif + role sesuai. */
export async function requireUser(options: RequireUserOptions = {}): Promise<RequiredUser> {
  const messages = { ...DEFAULT_MESSAGES, ...options.messages };
  const { user, userRow } = await requireAuthUser(options);

  if (!userRow) {
    throw new HttpError(404, messages.notFound);
  }
  if (!options.allowInactive && userRow.status !== "active") {
    throw new HttpError(403, messages.inactive);
  }

  if (options.role) {
    const allowed: readonly UserRole[] =
      typeof options.role === "string" ? [options.role] : options.role;
    const role = userRow.role as UserRole;
    const roleOk = allowed.includes(role) && (role !== "admin" || isAdminUser(user, userRow));
    if (!roleOk) {
      throw new HttpError(403, messages.wrongRole);
    }
  }

  return { user, userRow };
}
