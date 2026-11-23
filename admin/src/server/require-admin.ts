import "server-only";

import type { User } from "@supabase/supabase-js";

import { createAdminClient, type AdminSupabaseClient } from "@/lib/supabase/admin";
import { createClient, type ServerSupabaseClient } from "@/lib/supabase/server";

import { HttpError } from "./http-error";

/**
 * Guard SEMUA Route Handler `/api/admin/**`.
 *
 * Admin efektif = tiga syarat, sama dengan `private.is_admin()` (0010) dan
 * `resolveAdminSession()` di browser:
 *   - `app_metadata.role = 'admin'` (hanya service role yang bisa menulis)
 *   - `public.users.role = 'admin'`
 *   - `public.users.status = 'active'`
 * `user_metadata` / prefs / label Appwrite TIDAK pernah dibaca (celah #5).
 *
 * Identitas dari `auth.getUser()` (memverifikasi JWT ke Supabase Auth), bukan
 * `getSession()` dan bukan body request.
 *
 *   tanpa sesi valid → 401 "Unauthorized" (sama dengan Function lama)
 *   bukan admin aktif → 403 "Akses Admin ditolak."
 */

export const ADMIN_FORBIDDEN_MESSAGE = "Akses Admin ditolak.";
export const ADMIN_UNAUTHORIZED_MESSAGE = "Unauthorized";

type UserRoleRow = { role: string | null; status: string | null };

export interface AdminContext {
  user: User;
  /** Client service role — dipakai SETELAH guard lolos. */
  db: AdminSupabaseClient;
}

export interface RequireAdminOptions {
  clients?: { server?: Pick<ServerSupabaseClient, "auth">; admin?: AdminSupabaseClient };
}

export function isActiveAdmin(user: Pick<User, "app_metadata">, row: UserRoleRow | null): boolean {
  const metaRole = typeof user.app_metadata?.role === "string" ? user.app_metadata.role.toLowerCase() : "";
  const dbRole = typeof row?.role === "string" ? row.role.toLowerCase() : "";
  const status = typeof row?.status === "string" ? row.status.toLowerCase() : "";
  return metaRole === "admin" && dbRole === "admin" && status === "active";
}

export async function requireAdmin(options: RequireAdminOptions = {}): Promise<AdminContext> {
  const server = options.clients?.server ?? (await createClient());
  const { data, error } = await server.auth.getUser();
  if (error || !data?.user) {
    throw new HttpError(401, ADMIN_UNAUTHORIZED_MESSAGE);
  }

  // Cek murah dulu: tanpa app_metadata admin tidak perlu baca database.
  if (!isActiveAdmin(data.user, { role: "admin", status: "active" })) {
    throw new HttpError(403, ADMIN_FORBIDDEN_MESSAGE);
  }

  const db = options.clients?.admin ?? createAdminClient();
  const { data: row, error: rowError } = await db
    .from("users")
    .select("role, status")
    .eq("id", data.user.id)
    .maybeSingle();
  if (rowError) throw rowError;

  if (!isActiveAdmin(data.user, row)) {
    throw new HttpError(403, ADMIN_FORBIDDEN_MESSAGE);
  }
  return { user: data.user, db };
}
