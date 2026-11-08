import "server-only";

import { createClient as createSupabaseClient, type SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/types/supabase";

import { getSupabasePublicEnv } from "./env";

export type AdminSupabaseClient = SupabaseClient<Database>;

/**
 * Client Supabase dengan service role. MELEWATI RLS.
 *
 * Hanya untuk Route Handler / kode server, dan hanya SETELAH sesi user
 * diverifikasi (`getUser()` → cek role/status). Jangan pernah meneruskan
 * client ini, atau hasil query mentahnya, ke browser.
 *
 * `import "server-only"` membuat build gagal bila modul ini ikut ter-bundle
 * ke client.
 */
export function createAdminClient(): AdminSupabaseClient {
  const { url } = getSupabasePublicEnv();
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceRoleKey) {
    throw new Error("Env Supabase belum diset: SUPABASE_SERVICE_ROLE_KEY");
  }
  return createSupabaseClient<Database>(url, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
}
