import type { NextRequest } from "next/server";

import { redirectWithCookies, updateSession } from "@/lib/supabase/proxy";

/**
 * Proxy (Next 16) app admin.
 *
 * - Refresh sesi Supabase.
 * - Tanpa sesi: semua halaman kecuali /login → /login?next=<path>.
 * - `/api/**` TIDAK di-redirect: Route Handler menjawab 401 JSON sendiri
 *   (`requireAdmin()`), supaya `fetch` di browser tidak menerima HTML login.
 *
 * Pemeriksaan role admin (users.role + app_metadata.role, status aktif)
 * tetap di AdminAuthBoundary untuk UX; data admin dijaga RLS
 * (`private.is_admin()`) dan Route Handler.
 */
export async function proxy(request: NextRequest) {
  const { response, hasSession } = await updateSession(request);
  const isApi = request.nextUrl.pathname.startsWith("/api/");
  if (hasSession === false && request.nextUrl.pathname !== "/login" && !isApi) {
    const { pathname, search } = request.nextUrl;
    const login = new URL("/login", request.url);
    if (pathname !== "/") login.searchParams.set("next", `${pathname}${search}`);
    return redirectWithCookies(login, response);
  }
  return response;
}

export const config = {
  // Semua halaman kecuali aset statis Next & file publik (gambar/ikon).
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|icon.png|apple-icon.png|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
