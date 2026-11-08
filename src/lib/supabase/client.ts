import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/types/supabase";

import { getSupabasePublicEnv } from "./env";

export type BrowserSupabaseClient = SupabaseClient<Database>;

/**
 * Client Supabase untuk komponen browser ("use client").
 *
 * Memakai anon key + sesi user dari cookie, jadi semua query dibatasi RLS.
 * Sesuai arsitektur target, browser hanya MEMBACA; semua tulis lewat
 * Route Handler (`src/app/api/**`).
 *
 * `createBrowserClient` sudah singleton di browser, jadi aman dipanggil
 * berulang kali.
 */
export function createClient(): BrowserSupabaseClient {
  const { url, anonKey } = getSupabasePublicEnv();
  return createBrowserClient<Database>(url, anonKey);
}
