import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import type { Database } from "@/types/supabase";

/**
 * Refresh sesi @supabase/ssr di proxy (Next 16, pengganti middleware) dan
 * laporkan apakah request punya sesi valid.
 *
 * Pola resmi Supabase: cookie hasil refresh ditulis ke request (untuk Server
 * Component di belakangnya) DAN ke response (untuk browser). Jangan menyisipkan
 * kode apa pun di antara pembuatan client dan `getClaims()`.
 *
 * Bila env Supabase belum diisi (mis. build Appwrite lama), proxy tidak
 * melakukan apa-apa — `hasSession: null` berarti "tidak diketahui".
 */
export async function updateSession(
  request: NextRequest,
): Promise<{ response: NextResponse; hasSession: boolean | null }> {
  let response = NextResponse.next({ request });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) return { response, hasSession: null };

  const supabase = createServerClient<Database>(url, anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet, headers) {
        for (const { name, value } of cookiesToSet) request.cookies.set(name, value);
        response = NextResponse.next({ request });
        for (const { name, value, options } of cookiesToSet) {
          response.cookies.set(name, value, options);
        }
        for (const [key, value] of Object.entries(headers ?? {})) {
          response.headers.set(key, value);
        }
      },
    },
  });

  // getClaims memverifikasi JWT (lokal bila project memakai kunci asimetris,
  // selain itu lewat Auth server) dan me-refresh token yang kedaluwarsa.
  const { data } = await supabase.auth.getClaims();
  return { response, hasSession: Boolean(data?.claims?.sub) };
}

/** Redirect yang membawa cookie hasil refresh (supaya sesi tidak hilang). */
export function redirectWithCookies(target: URL, from: NextResponse): NextResponse {
  const redirect = NextResponse.redirect(target);
  for (const cookie of from.cookies.getAll()) redirect.cookies.set(cookie);
  return redirect;
}
