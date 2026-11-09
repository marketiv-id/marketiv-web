import { DATA_SOURCE_CONFIG } from "@/config/data-source.config";
import { mockDelay } from "@/lib/mock-delay";
import { createClient } from "@/lib/supabase/client";
import type {
  ServiceResult,
  ServiceErrorCode,
  UserRole,
  UserStatus,
} from "@/types/domain";

/**
 * Session facade — satu-satunya jalur frontend untuk mengetahui siapa yang login.
 *
 * Pola sama dengan service lain: branch DATA_SOURCE_CONFIG.useMockData.
 * Komponen TIDAK boleh memanggil client Supabase langsung (R1).
 *
 * Sumber identitas (Fase 4 migrasi Supabase):
 *   - akun  : `supabase.auth.getUser()` (JWT diverifikasi ke Supabase Auth)
 *   - role, status, phone, T&C, verifikasi email : baris `public.users`
 *     (RLS: hanya baris milik sendiri yang terbaca)
 *   - isProfileCompleted : `umkm_profiles` / `creator_profiles`
 */

export interface SessionUser {
  userId: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  /** Nama tampilan; dari users.name atau profil terkait. */
  name?: string;
  avatarUrl?: string;
  /** Nomor WhatsApp dari kolom users.phone. Kosong bila belum pernah diisi. */
  phone?: string;
  /**
   * Email terverifikasi via OTP atau OAuth.
   *
   * Dibaca dari `users.email_verified_at` (diisi /api/auth/verify-email atau
   * provisioning akun Google). Digunakan oleh
   * RedirectIfAuthenticated untuk menahan user di layar OTP sampai email
   * terkonfirmasi, dan oleh RoleGuard sebagai precedence guard sebelum
   * onboarding.
   */
  emailVerified: boolean;
  /** Versi T&C yang tercatat pada baris users; absen bila belum menyetujui. */
  tosVersion?: string;
  /** Waktu persetujuan T&C; absen bila belum menyetujui. */
  tosAcceptedAt?: string;
  /**
   * Onboarding sudah diselesaikan.
   *
   * Kolomnya ada di `creator_profiles`/`umkm_profiles`, BUKAN di `users`, jadi
   * nilainya butuh satu bacaan tambahan. Ikut ke sini karena RoleGuard harus
   * memutuskan pemantulan ke /onboarding sebelum dashboard dirender, dan tanpa
   * itu setiap halaman harus memuat profil lengkapnya sendiri lebih dulu.
   *
   * Gerbang ini bukan kosmetik: `get-creator-directory`, `campaign-published`,
   * dan klaim campaign semuanya menolak profil yang belum lengkap.
   */
  isProfileCompleted: boolean;
}

/** Tabel profil per role — sumber `isProfileCompleted`. */
const PROFILE_TABLE: Record<UserRole, "umkm_profiles" | "creator_profiles" | null> = {
  umkm: "umkm_profiles",
  creator: "creator_profiles",
  admin: null,
};

/** Identitas sintetis untuk mode mock. Role ditentukan oleh RoleGuard terdekat. */
const MOCK_USERS: Record<UserRole, SessionUser> = {
  umkm: {
    userId: "umkm_001",
    email: "owner@dapur-sehat.id",
    role: "umkm",
    status: "active",
    name: "Dapur Sehat Sukabumi",
    emailVerified: true,
    isProfileCompleted: true,
  },
  creator: {
    userId: "creator_002",
    email: "dimas.visuals@example.com",
    role: "creator",
    status: "active",
    name: "Dimas Visuals",
    emailVerified: true,
    isProfileCompleted: true,
  },
  admin: {
    userId: "admin_001",
    email: "admin@marketiv.id",
    role: "admin",
    status: "active",
    name: "Admin Marketiv",
    emailVerified: true,
    isProfileCompleted: true,
  },
};

export function getMockSessionUser(role: UserRole): SessionUser {
  return MOCK_USERS[role];
}

/**
 * Role efektif mode mock.
 *
 * Sebelum Sprint 6, getSession() mock selalu mengembalikan identitas UMKM dan
 * RoleGuard mem-bypass dirinya sendiri, jadi role tidak pernah berarti apa-apa.
 * Setelah bypass dicabut (s6-guard-redirect), role mock harus benar-benar ada —
 * kalau tidak, dashboard Kreator tidak bisa dibuka sama sekali di mode mock.
 *
 * Prioritas: pilihan saat login mock (localStorage) > env > "umkm".
 */
const MOCK_ROLE_KEY = "marketiv.mock.role";

const isRole = (v: unknown): v is UserRole =>
  v === "umkm" || v === "creator" || v === "admin";

/**
 * Guard `typeof window` wajib: getSession() terjangkau dari
 * service-result.ts:requireUserId yang bisa dipanggil di server.
 */
export function getMockRole(): UserRole {
  if (typeof window !== "undefined") {
    // Mode mock: otomatis sesuaikan role dengan rute dashboard yang dituju
    const path = window.location.pathname;
    if (path.startsWith("/dashboard/kreator")) {
      window.localStorage.setItem(MOCK_ROLE_KEY, "creator");
      return "creator";
    }
    if (path.startsWith("/dashboard/umkm")) {
      window.localStorage.setItem(MOCK_ROLE_KEY, "umkm");
      return "umkm";
    }
    if (path.startsWith("/admin")) {
      window.localStorage.setItem(MOCK_ROLE_KEY, "admin");
      return "admin";
    }

    const stored = window.localStorage.getItem(MOCK_ROLE_KEY);
    if (stored === "creator" || stored === "kreator") return "creator";
    if (isRole(stored)) return stored;
  }
  const fromEnv = process.env.NEXT_PUBLIC_MOCK_ROLE;
  return isRole(fromEnv) ? fromEnv : "umkm";
}

export function setMockRole(role: UserRole): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(MOCK_ROLE_KEY, role);
}

export function clearMockRole(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(MOCK_ROLE_KEY);
}

/**
 * Status DB → status UI. `terminated` (dan nilai tak dikenal) diperlakukan
 * seperti `suspended` supaya guard UI tetap memblokir.
 */
const toUserStatus = (status: unknown): UserStatus => (status === "active" ? "active" : "suspended");

const metaString = (meta: Record<string, unknown> | undefined, key: string): string | undefined => {
  const value = meta?.[key];
  return typeof value === "string" && value.trim() !== "" ? value.trim() : undefined;
};

/** Error Supabase Auth/PostgREST → ServiceErrorCode. */
const mapErrorCode = (err: unknown): ServiceErrorCode => {
  const e = err as { status?: number; name?: string } | null;
  if (e?.name === "AuthSessionMissingError") return "auth";
  if (e?.name === "AuthRetryableFetchError") return "server";
  const status = e?.status;
  if (status === 400 || status === 401) return "auth";
  if (status === 403) return "forbidden";
  if (status === 404) return "not_found";
  if (typeof status === "number" && status >= 500) return "server";
  return "unknown";
};

const SESSION_MISSING_MESSAGE = "Sesi tidak ditemukan. Silakan login.";

/**
 * Baca `is_profile_completed` dari tabel profil sesuai role.
 *
 * Gagal-terbuka dengan sengaja: kalau bacaannya error, kembalikan `true` supaya
 * gangguan sesaat tidak mengurung pengguna yang profilnya sudah lengkap di
 * halaman onboarding. Gerbang yang sesungguhnya tetap dijaga server.
 *
 * `admin` tidak punya tabel profil, jadi selalu dianggap lengkap.
 */
async function readProfileCompleted(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  role: UserRole
): Promise<boolean> {
  const table = PROFILE_TABLE[role];
  if (!table) return true;

  const { data, error } = await supabase
    .from(table)
    .select("is_profile_completed")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) return true;
  // Profil belum ada = jelas belum lengkap; onboarding yang akan mengisinya.
  if (!data) return false;
  return data.is_profile_completed === true;
}

/**
 * Mengambil sesi aktif.
 *
 * Mock ON  → identitas sintetis sesuai getMockRole().
 * Mock OFF → auth.getUser() lalu baca baris `users` untuk role & status.
 */
export async function getSession(): Promise<ServiceResult<SessionUser>> {
  if (DATA_SOURCE_CONFIG.useMockData) {
    await mockDelay(150);
    return { success: true, data: MOCK_USERS[getMockRole()] };
  }

  try {
    const supabase = createClient();
    const { data: auth, error: authError } = await supabase.auth.getUser();
    if (authError || !auth.user) {
      const code = authError ? mapErrorCode(authError) : "auth";
      return {
        success: false,
        data: null,
        error: code === "server" ? "Gagal memuat sesi. Coba lagi." : SESSION_MISSING_MESSAGE,
        code: code === "server" ? "server" : "auth",
      };
    }
    const authUser = auth.user;

    const { data: row, error: rowError } = await supabase
      .from("users")
      .select("role, status, phone, email_verified_at, tos_version, tos_accepted_at")
      .eq("id", authUser.id)
      .maybeSingle();
    if (rowError) throw rowError;

    if (!row || !isRole(row.role)) {
      return {
        success: false,
        data: null,
        error: "Profil pengguna belum tersedia. Hubungi admin.",
        code: "not_found",
      };
    }

    const role = row.role;
    const meta = authUser.user_metadata as Record<string, unknown> | undefined;
    const name = metaString(meta, "display_name") ?? metaString(meta, "full_name") ?? metaString(meta, "name");
    const tosVersion = row.tos_version ? String(row.tos_version) : undefined;
    const tosAcceptedAt = row.tos_accepted_at ? String(row.tos_accepted_at) : undefined;

    return {
      success: true,
      data: {
        userId: authUser.id,
        email: authUser.email ?? "",
        role,
        status: toUserStatus(row.status),
        ...(name ? { name } : {}),
        phone: row.phone || undefined,
        emailVerified: row.email_verified_at != null,
        ...(tosVersion ? { tosVersion } : {}),
        ...(tosAcceptedAt ? { tosAcceptedAt } : {}),
        isProfileCompleted: await readProfileCompleted(supabase, authUser.id, role),
      },
    };
  } catch (err) {
    const code = mapErrorCode(err);
    return {
      success: false,
      data: null,
      error: code === "auth" ? SESSION_MISSING_MESSAGE : "Gagal memuat sesi. Coba lagi.",
      code,
    };
  }
}

/** Mengakhiri sesi di perangkat ini (scope local). No-op di mode mock. */
export async function logout(): Promise<ServiceResult<null>> {
  if (DATA_SOURCE_CONFIG.useMockData) {
    clearMockRole();
    return { success: true, data: null };
  }

  try {
    const { error } = await createClient().auth.signOut({ scope: "local" });
    if (error) throw error;
    return { success: true, data: null };
  } catch (err) {
    return {
      success: false,
      data: null,
      error: "Gagal keluar dari sesi.",
      code: mapErrorCode(err),
    };
  }
}
