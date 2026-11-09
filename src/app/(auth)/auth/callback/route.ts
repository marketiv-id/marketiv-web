import { NextResponse, type NextRequest } from "next/server";

import { createClient } from "@/lib/supabase/server";

/**
 * GET /auth/callback — pendaratan OAuth Google (PKCE).
 *
 * Menukar `code` jadi sesi (cookie), lalu meneruskan `role` & `next` ke
 * /auth/complete yang menjalankan keputusan OAuthCallback (akun lama →
 * dashboard, akun baru → provision → onboarding).
 *
 * `role`/`next` hanya diteruskan; validasinya tetap di halaman tujuan
 * (whitelist role, `next` relatif saja) dan di /api/auth/provision.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get("code");

  if (!code || searchParams.get("error")) {
    return NextResponse.redirect(new URL("/login?error=oauth", origin));
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    console.warn("[auth.callback] exchangeCodeForSession gagal", error.code ?? error.status);
    return NextResponse.redirect(new URL("/login?error=oauth", origin));
  }

  const target = new URL("/auth/complete", origin);
  const role = searchParams.get("role");
  const next = searchParams.get("next");
  if (role === "umkm" || role === "creator") target.searchParams.set("role", role);
  if (next) target.searchParams.set("next", next);
  return NextResponse.redirect(target);
}
