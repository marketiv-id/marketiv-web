import { Query } from "appwrite";
import { DATA_SOURCE_CONFIG } from "@/config/data-source.config";
import { mockDelay } from "@/lib/mock-delay";
import { account } from "@/lib/appwrite/account";
import { databases } from "@/lib/appwrite/databases";
import { appwriteConfig } from "@/lib/appwrite/config";
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
 * Komponen TIDAK boleh memanggil `account`/`databases` langsung (R1).
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
   * Dibaca dari `authUser.emailVerification` (Appwrite Auth). Digunakan oleh
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

/** Koleksi profil per role — sumber `isProfileCompleted`. */
const PROFILE_COLLECTION: Record<UserRole, string | null> = {
  umkm: "umkm_profiles",
  creator: "creator_profiles",
  admin: null,
};

/**
 * Collection `users` — mirror Appwrite Auth, berisi role & status.
 *
 * Barisnya di-key `ID.unique()`, BUKAN id akun Auth: `create-user-profile`
 * menyimpan id Auth di kolom `userId` dan mencarinya lewat kolom itu juga
 * (`findByUserId`). Mencari lewat `$id` tidak akan pernah cocok, dan gejalanya
 * menyesatkan — login berhasil tapi berakhir `not_found` lalu ditendang guard.
 */
const USERS_COLLECTION = "users";

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

const mapErrorCode = (err: unknown): ServiceErrorCode => {
  const code = (err as { code?: number })?.code;
  if (code === 401) return "auth";
  if (code === 403) return "forbidden";
  if (code === 404) return "not_found";
  if (typeof code === "number" && code >= 500) return "server";
  return "unknown";
};

/**
 * Baca `isProfileCompleted` dari koleksi profil sesuai role.
 *
 * Gagal-terbuka dengan sengaja: kalau bacaannya error, kembalikan `true` supaya
 * gangguan sesaat tidak mengurung pengguna yang profilnya sudah lengkap di
 * halaman onboarding. Gerbang yang sesungguhnya tetap dijaga server —
 * `get-creator-directory` dan klaim campaign memeriksa kolom yang sama.
 *
 * `admin` tidak punya koleksi profil, jadi selalu dianggap lengkap.
 */
async function readProfileCompleted(userId: string, role: UserRole): Promise<boolean> {
  const collection = PROFILE_COLLECTION[role];
  if (!collection) return true;

  try {
    const res = await databases.listDocuments(appwriteConfig.databaseId, collection, [
      Query.equal("userId", userId),
      Query.limit(1),
    ]);
    const profile = res.documents[0] as Record<string, unknown> | undefined;
    // Profil belum ada = jelas belum lengkap; jangan gagal-terbuka di sini,
    // karena onboarding-lah yang akan membuat kolomnya terisi.
    if (!profile) return false;
    return profile.isProfileCompleted === true;
  } catch {
    return true;
  }
}

/**
 * Mengambil sesi aktif.
 *
 * Mock ON  → identitas sintetis sesuai getMockRole().
 * Mock OFF → account.get() lalu baca dokumen `users` untuk role & status.
 */
export async function getSession(): Promise<ServiceResult<SessionUser>> {
  if (DATA_SOURCE_CONFIG.useMockData) {
    await mockDelay(150);
    return { success: true, data: MOCK_USERS[getMockRole()] };
  }

  try {
    const authUser = await account.get();

    const userDocs = await databases.listDocuments(
      appwriteConfig.databaseId,
      USERS_COLLECTION,
      [Query.equal("userId", authUser.$id), Query.limit(1)]
    );

    const doc = userDocs.documents[0] as Record<string, unknown> | undefined;
    if (!doc) {
      return {
        success: false,
        data: null,
        error: "Profil pengguna belum tersedia. Hubungi admin.",
        code: "not_found",
      };
    }

    const role = doc.role as UserRole;
    const tosVersion = doc.tos_version ? String(doc.tos_version) : undefined;
    const tosAcceptedAt = doc.tos_accepted_at ? String(doc.tos_accepted_at) : undefined;

    // `users` hanya menyimpan userId/role/status/email/phone/createdAt — tidak
    // ada `name` maupun `avatarUrl` di sana. Nama tampilan datang dari akun Auth;
    // avatar tinggal di umkm_profiles/creator_profiles dan dibaca service profil.
    return {
      success: true,
      data: {
        userId: authUser.$id,
        email: authUser.email,
        role,
        status: doc.status as UserStatus,
        name: authUser.name || undefined,
        phone: (doc.phone as string) || undefined,
        emailVerified: authUser.emailVerification,
        ...(tosVersion ? { tosVersion } : {}),
        ...(tosAcceptedAt ? { tosAcceptedAt } : {}),
        isProfileCompleted: await readProfileCompleted(authUser.$id, role),
      },
    };
  } catch (err) {
    const code = mapErrorCode(err);
    return {
      success: false,
      data: null,
      error:
        code === "auth"
          ? "Sesi tidak ditemukan. Silakan login."
          : "Gagal memuat sesi. Coba lagi.",
      code,
    };
  }
}

/** Mengakhiri sesi Appwrite. No-op di mode mock. */
export async function logout(): Promise<ServiceResult<null>> {
  if (DATA_SOURCE_CONFIG.useMockData) {
    clearMockRole();
    return { success: true, data: null };
  }

  try {
    await account.deleteSession({ sessionId: "current" });
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
