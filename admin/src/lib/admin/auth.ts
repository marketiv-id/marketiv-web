import type { BrowserSupabaseClient } from "@/lib/supabase/client";
import { createClient } from "@/lib/supabase/client";

export interface AdminUserSession {
  userId: string;
  email: string;
  role: string;
  isAdmin: boolean;
  status: string;
}

export type AdminAuthFailureKind =
  | "unauthenticated"
  | "forbidden"
  | "suspended"
  | "error";

export class AdminAuthError extends Error {
  constructor(
    public readonly kind: AdminAuthFailureKind,
    message: string,
  ) {
    super(message);
    this.name = "AdminAuthError";
  }
}

/** Bagian client Supabase yang dipakai modul ini (bisa di-mock di test). */
type AdminAuthDependencies = {
  supabase: {
    auth: Pick<BrowserSupabaseClient["auth"], "getUser" | "signInWithPassword" | "signOut">;
    from: BrowserSupabaseClient["from"];
  };
};

const defaultDependencies = (): AdminAuthDependencies => ({ supabase: createClient() });

const NO_SESSION = "Sesi Admin tidak ditemukan atau sudah berakhir.";

function isSessionMissing(error: { name?: string; status?: number } | null | undefined): boolean {
  return error?.name === "AuthSessionMissingError" || error?.status === 400 || error?.status === 401;
}

/**
 * Verifikasi sesi Supabase sebagai Admin Marketiv yang aktif.
 *
 * Admin hanya dikenali dari data yang TIDAK bisa diubah pemilik akun:
 *   - `public.users.role = 'admin'` (browser tidak punya hak tulis sejak Fase 3)
 *   - `app_metadata.role = 'admin'` (hanya service role yang bisa menulis)
 * Keduanya wajib, sama dengan `private.is_admin()` di RLS. Fallback lama
 * (label Appwrite, `prefs.role`) dihapus — celah #5.
 *
 * Ini guard UX. Batas keamanan sebenarnya: RLS + Route Handler.
 */
export async function resolveAdminSession(
  dependencies: AdminAuthDependencies = defaultDependencies(),
): Promise<AdminUserSession> {
  try {
    const { data, error } = await dependencies.supabase.auth.getUser();
    if (error || !data?.user) {
      if (!error || isSessionMissing(error)) {
        throw new AdminAuthError("unauthenticated", NO_SESSION);
      }
      throw new AdminAuthError("error", "Gagal memverifikasi sesi Admin. Coba lagi.");
    }
    const user = data.user;

    const { data: row, error: rowError } = await dependencies.supabase
      .from("users")
      .select("role, status")
      .eq("id", user.id)
      .maybeSingle();
    if (rowError) {
      throw new AdminAuthError("error", "Gagal memverifikasi sesi Admin. Coba lagi.");
    }

    const dbRole = typeof row?.role === "string" ? row.role.toLowerCase() : undefined;
    const metaRole =
      typeof user.app_metadata?.role === "string" ? user.app_metadata.role.toLowerCase() : undefined;
    if (dbRole !== "admin" || metaRole !== "admin") {
      throw new AdminAuthError("forbidden", "Akun ini tidak memiliki akses Admin Marketiv.");
    }

    const dbStatus = typeof row?.status === "string" ? row.status.toLowerCase() : undefined;
    if (dbStatus !== "active") {
      throw new AdminAuthError("suspended", "Akun Admin ini tidak aktif. Hubungi Marketiv untuk bantuan.");
    }

    return {
      userId: user.id,
      email: user.email ?? "",
      role: "admin",
      isAdmin: true,
      status: dbStatus,
    };
  } catch (error) {
    if (error instanceof AdminAuthError) throw error;
    throw new AdminAuthError("error", "Gagal memverifikasi sesi Admin. Coba lagi.");
  }
}

export const getCurrentAdminSession = resolveAdminSession;

/**
 * Masuk dengan email/password Supabase, lalu validasi sebagai Admin aktif.
 * Sesi non-admin / nonaktif yang baru dibuat langsung diakhiri.
 */
export async function signInAdminSession(
  email: string,
  password: string,
  dependencies: AdminAuthDependencies = defaultDependencies(),
): Promise<AdminUserSession> {
  const normalizedEmail = email.trim();
  if (!normalizedEmail || !password) {
    throw new AdminAuthError("error", "Email dan kata sandi wajib diisi.");
  }

  let signInError: { status?: number } | null = null;
  try {
    const { error } = await dependencies.supabase.auth.signInWithPassword({
      email: normalizedEmail,
      password,
    });
    signInError = error;
  } catch {
    throw new AdminAuthError("error", "Masuk Admin gagal. Coba lagi.");
  }
  if (signInError) {
    const status = signInError.status;
    if (status === 400 || status === 401 || status === 403 || status === 422) {
      throw new AdminAuthError("unauthenticated", "Email atau kata sandi salah, atau akun tidak dapat masuk.");
    }
    throw new AdminAuthError("error", "Masuk Admin gagal. Coba lagi.");
  }

  try {
    return await resolveAdminSession(dependencies);
  } catch (error) {
    try {
      await dependencies.supabase.auth.signOut({ scope: "local" });
    } catch {
      // Pertahankan error otorisasi aslinya. Bootstrap berikutnya tetap fail-closed.
    }
    throw error;
  }
}

export async function logoutAdminSession(
  dependencies: Pick<AdminAuthDependencies, "supabase"> = defaultDependencies(),
): Promise<void> {
  const { error } = await dependencies.supabase.auth.signOut({ scope: "local" });
  if (error) {
    throw new AdminAuthError("error", "Gagal keluar dari sesi Admin. Coba lagi.");
  }
}
