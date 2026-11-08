import "server-only";

import { createServerClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

import type { Database } from "@/types/supabase";

import { getSupabasePublicEnv } from "./env";

export type ServerSupabaseClient = SupabaseClient<Database>;

/**
 * Client Supabase untuk Server Component, Route Handler, dan Server Action.
 *
 * Memakai anon key + cookie sesi request, jadi query tetap dibatasi RLS atas
 * nama user yang login. Untuk otorisasi selalu pakai `auth.getUser()` (atau
 * `auth.getClaims()`), jangan `auth.getSession()`, karena isi cookie bisa
 * dipalsukan.
 *
 * Buat client baru per request; jangan simpan di variabel modul.
 */
export async function createClient(): Promise<ServerSupabaseClient> {
  const { url, anonKey } = getSupabasePublicEnv();
  const cookieStore = await cookies();

  return createServerClient<Database>(url, anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // Dipanggil dari Server Component: cookie tidak bisa ditulis di sana.
          // Aman diabaikan selama refresh sesi ditangani middleware/proxy (Fase 4).
        }
      },
    },
  });
}
