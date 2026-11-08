import "server-only";

import { createClient } from "@/lib/supabase/server";
import type { UserRole } from "@/types/domain";

/**
 * Role Tivvy dari sesi cookie Supabase (Fase 4).
 *
 * Dulu browser membuat JWT Appwrite (`account.createJWT`) lalu mengirimnya di
 * header Authorization. Sekarang `/api/chat` membaca sesi langsung dari cookie
 * request, jadi tidak ada token yang dikirim/dipalsukan dari browser.
 */

/** Validasi nilai role dari baris `users`; nilai lain = sesi tidak valid. */
export function parseChatRole(role: unknown): UserRole {
  if (role !== "umkm" && role !== "creator" && role !== "admin") {
    throw new Error("Role akun Tivvy tidak valid.");
  }
  return role;
}

/**
 * `null` bila tidak ada sesi (pengunjung publik). Melempar bila sesi ada tapi
 * baris `users`-nya tidak valid / akun tidak aktif.
 */
export async function authenticateChatRole(): Promise<UserRole | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return null;

  const { data: row, error: rowError } = await supabase
    .from("users")
    .select("role, status")
    .eq("id", data.user.id)
    .maybeSingle();
  if (rowError) throw rowError;
  if (!row || row.status !== "active") {
    throw new Error("Akun Tivvy tidak aktif atau belum punya profil.");
  }
  return parseChatRole(row.role);
}
