import "server-only";

import { createClient as createSupabaseClient, type SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/types/supabase";

import { getSupabasePublicEnv } from "./env";

export type StatelessSupabaseClient = SupabaseClient<Database>;

/**
 * Client anon TANPA cookie dan tanpa penyimpanan sesi, untuk Route Handler.
 *
 * Dipakai untuk operasi Auth yang tidak boleh menyentuh sesi browser:
 * mengirim OTP (`signInWithOtp`, `resetPasswordForEmail`) dan memverifikasi OTP
 * (`verifyOtp`) atas nama email tertentu. Sesi yang dihasilkan `verifyOtp`
 * hanya hidup di memori request ini lalu dibuang.
 *
 * Buat baru per request.
 */
export function createStatelessClient(): StatelessSupabaseClient {
  const { url, anonKey } = getSupabasePublicEnv();
  return createSupabaseClient<Database>(url, anonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
}
