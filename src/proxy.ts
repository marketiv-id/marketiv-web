import type { NextRequest } from "next/server";

import { redirectWithCookies, updateSession } from "@/lib/supabase/proxy";

/**
 * Proxy (Next 16) app user.
 *
 * - Refresh sesi Supabase di setiap halaman yang dilindungi.
 * - Tanpa sesi: /dashboard/* dan /onboarding → /login?next=<path>.
 *
 * Ini guard sesi saja. Role salah, akun suspended, dan profil belum lengkap
 * tetap ditangani RoleGuard (UX); otorisasi data dijaga RLS + Route Handler.
 *
 * Matcher sengaja sempit: halaman publik tidak perlu proxy (hemat eksekusi
 * function di Netlify Free). Route Handler me-refresh sesinya sendiri.
 */
export async function proxy(request: NextRequest) {
  if (process.env.NEXT_PUBLIC_USE_MOCK_DATA === "true") return;

  const { response, hasSession } = await updateSession(request);
  if (hasSession === false) {
    const { pathname, search } = request.nextUrl;
    const login = new URL("/login", request.url);
    login.searchParams.set("next", `${pathname}${search}`);
    return redirectWithCookies(login, response);
  }
  return response;
}

export const config = {
  matcher: ["/dashboard/:path*", "/onboarding", "/onboarding/:path*"],
};
