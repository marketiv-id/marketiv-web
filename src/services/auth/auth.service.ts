import { DATA_SOURCE_CONFIG } from "@/config/data-source.config";
import { AUTH_CONFIG } from "@/config/auth.config";
import { mockDelay } from "@/lib/mock-delay";
import { createClient } from "@/lib/supabase/client";
import { authErrorCode, authErrorMessage } from "@/lib/auth/auth-error";
import { parseOrErrors } from "@/lib/validations/to-field-errors";
import {
  loginSchema,
  registerUmkmSchema,
  registerCreatorSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  type LoginInput,
  type RegisterUmkmInput,
  type RegisterCreatorInput,
  type ForgotPasswordInput,
  type ResetPasswordInput,
} from "@/lib/validations/auth.schema";
import {
  ok,
  fail,
  failValidation,
  noData,
} from "@/services/shared/service-result";
import {
  getSession,
  getMockSessionUser,
  setMockRole,
  type SessionUser,
} from "./session.service";
import { postAuthApi } from "./auth-api";
import { clearOnboardingSkip } from "@/lib/onboarding-skip";
import type { ServiceResult, ServiceErrorCode, UserRole } from "@/types/domain";

/**
 * Auth facade — register, login, pemulihan password, OAuth.
 *
 * Pasangan session.service.ts, yang hanya menjawab "siapa yang login sekarang".
 * Arah import satu arah (auth → session), jadi tidak ada siklus lewat
 * service-result.ts:requireUserId yang mengimpor session.service.
 *
 * Fase 4 migrasi Supabase:
 *   - login / logout / OAuth  → Supabase Auth langsung dari browser (cookie @supabase/ssr)
 *   - register, provisioning, OTP, reset password → Route Handler `/api/auth/*`
 *     (role di-whitelist & semua tulis DB di server, service role)
 *
 * Komponen TIDAK boleh memanggil client Supabase langsung (R1).
 */

export interface RegisterOutcome {
  user: SessionUser;
  /**
   * false ⇒ akun Auth dan sesi SUDAH terbentuk, tapi baris `users`/profil belum
   * (RPC provision_user gagal). UI menawarkan "coba lagi" (provisionUserProfile).
   */
  profileProvisioned: boolean;
  provisionErrorCode?: ServiceErrorCode;
}

export interface PasswordOtpRequestOutcome {
  /** Dipertahankan demi kompatibilitas tipe; Supabase tidak butuh userId untuk OTP. */
  userId: string | null;
}

const mockRoleFromEmail = (email: string): UserRole => {
  const e = email.toLowerCase();
  if (e.includes("creator") || e.includes("kreator")) return "creator";
  if (e.includes("admin")) return "admin";
  return "umkm";
};

// ---------------------------------------------------------------------------
// Provisioning profil
// ---------------------------------------------------------------------------

/**
 * Buat (atau lengkapi) users + profil + wallet + kuota untuk akun yang login,
 * lewat `POST /api/auth/provision` (RPC `provision_user`, idempoten).
 *
 * Satu implementasi melayani: akhir register, tombol "coba lagi" di UI,
 * self-heal saat login, dan akun baru dari Google OAuth (dengan `role`).
 * Tanpa `role`, server memakai role yang tercatat saat register.
 */
export async function provisionUserProfile(
  role?: "umkm" | "creator"
): Promise<ServiceResult<null>> {
  if (DATA_SOURCE_CONFIG.useMockData) {
    await mockDelay(200);
    return ok(null);
  }

  const res = await postAuthApi<unknown>(
    "/api/auth/provision",
    role ? { role } : {},
    "Gagal membuat profil pengguna. Coba lagi."
  );
  return res.success ? ok(null) : fail(res.error ?? "Gagal membuat profil pengguna. Coba lagi.", res.code ?? "unknown", noData<null>());
}

// ---------------------------------------------------------------------------
// Register
// ---------------------------------------------------------------------------

interface RegisterApiResponse {
  userId: string;
  sessionCreated: boolean;
  profileProvisioned: boolean;
  provisionErrorCode?: ServiceErrorCode;
  provisionError?: string;
}

/**
 * Register lewat `POST /api/auth/register`: server me-whitelist role, membuat
 * akun (sesi langsung di cookie), lalu RPC `provision_user`.
 *
 * Kegagalan provisioning dikembalikan sebagai SUKSES dengan
 * profileProvisioned:false, bukan sebagai fail. Akun dan sesi sudah nyata ada;
 * melaporkannya sebagai gagal membuat user mencoba ulang dengan email yang sama
 * lalu kena "email sudah terdaftar" — jalan buntu tanpa pemulihan.
 */
async function registerViaApi(
  role: "umkm" | "creator",
  payload: Record<string, string>,
  email: string,
  name: string | undefined
): Promise<ServiceResult<RegisterOutcome>> {
  const res = await postAuthApi<RegisterApiResponse>(
    "/api/auth/register",
    { role, ...payload },
    "Gagal membuat akun. Coba lagi."
  );
  if (!res.success || !res.data) {
    return fail(res.error ?? "Gagal membuat akun. Coba lagi.", res.code ?? "unknown", noData<RegisterOutcome>());
  }
  const created = res.data;

  // Sesi sudah hidup (cookie dari respons route), jadi getSession() adalah
  // sumber kebenaran. Kalau baris `users` belum ada, susun SessionUser minimal
  // supaya UI tetap punya identitas untuk ditampilkan.
  const session = await getSession();
  const user: SessionUser = session.success && session.data
    ? session.data
    : {
        userId: created.userId,
        email,
        role,
        status: "active",
        ...(name ? { name } : {}),
        emailVerified: false,
        isProfileCompleted: false,
      };

  return ok({
    user,
    profileProvisioned: created.profileProvisioned,
    provisionErrorCode: created.profileProvisioned ? undefined : created.provisionErrorCode ?? "server",
  });
}

export async function registerUmkm(
  input: RegisterUmkmInput
): Promise<ServiceResult<RegisterOutcome>> {
  const parsed = parseOrErrors(registerUmkmSchema, input);
  if (!parsed.ok) {
    return failValidation(
      Object.values(parsed.errors)[0] ?? "Data pendaftaran belum lengkap.",
      noData<RegisterOutcome>()
    );
  }
  const { email, phone, password } = parsed.data;

  if (DATA_SOURCE_CONFIG.useMockData) {
    await mockDelay(500);
    setMockRole("umkm");
    return ok({ user: getMockSessionUser("umkm"), profileProvisioned: true });
  }

  return registerViaApi("umkm", { email, phone, password }, email, undefined);
}

export async function registerCreator(
  input: RegisterCreatorInput
): Promise<ServiceResult<RegisterOutcome>> {
  const parsed = parseOrErrors(registerCreatorSchema, input);
  if (!parsed.ok) {
    return failValidation(
      Object.values(parsed.errors)[0] ?? "Data pendaftaran belum lengkap.",
      noData<RegisterOutcome>()
    );
  }
  const { displayName, email, password } = parsed.data;

  if (DATA_SOURCE_CONFIG.useMockData) {
    await mockDelay(500);
    setMockRole("creator");
    return ok({ user: getMockSessionUser("creator"), profileProvisioned: true });
  }

  return registerViaApi("creator", { displayName, email, password }, email, displayName);
}

// ---------------------------------------------------------------------------
// Login
// ---------------------------------------------------------------------------

/** Login email + password (Supabase Auth, sesi di cookie). */
export async function login(
  input: LoginInput
): Promise<ServiceResult<SessionUser>> {
  const parsed = parseOrErrors(loginSchema, input);
  if (!parsed.ok) {
    return failValidation(
      Object.values(parsed.errors)[0] ?? "Email dan password wajib diisi.",
      noData<SessionUser>()
    );
  }
  const { email, password } = parsed.data;

  // Melewati onboarding berlaku untuk satu sesi. Tab yang sama dipakai login
  // ulang harus menawarkan wizardnya lagi — profil yang belum lengkap membuat
  // kreator tidak pernah terlihat oleh UMKM.
  clearOnboardingSkip();

  if (DATA_SOURCE_CONFIG.useMockData) {
    await mockDelay(400);
    const role = mockRoleFromEmail(email);
    setMockRole(role);
    return ok(getMockSessionUser(role));
  }

  const supabase = createClient();
  const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
  if (signInError) {
    return fail(
      authErrorMessage(signInError, "Gagal masuk. Coba lagi."),
      authErrorCode(signInError),
      noData<SessionUser>()
    );
  }

  let session = await getSession();

  // Self-heal: akun ada tapi baris `users` belum terbentuk — sisa register yang
  // provisioning-nya gagal. RPC-nya idempoten, jadi mencoba sekali di sini
  // tidak pernah merugikan.
  if (!session.success && session.code === "not_found") {
    const provision = await provisionUserProfile();
    if (provision.success) session = await getSession();
  }

  if (!session.success || !session.data) {
    // Teruskan apa adanya — session.service sudah menulis pesan yang tepat.
    return fail(
      session.error ?? "Gagal memuat sesi. Coba lagi.",
      session.code ?? "unknown",
      noData<SessionUser>()
    );
  }

  if (session.data.status === "suspended") {
    // Sesi harus benar-benar diakhiri. Membiarkannya hidup berarti kartu
    // "Akun Ditangguhkan" di RoleGuard jadi satu-satunya penghalang ke dashboard.
    try {
      await supabase.auth.signOut({ scope: "local" });
    } catch {
      // Sesi gagal dihapus tidak boleh mengubah keputusan menolak login.
    }
    return fail(
      "Akun kamu ditangguhkan sehingga tidak bisa masuk. Hubungi admin Marketiv.",
      "forbidden",
      noData<SessionUser>()
    );
  }

  return ok(session.data);
}

// ---------------------------------------------------------------------------
// Pemulihan password
// ---------------------------------------------------------------------------

/**
 * Kirim kode OTP pemulihan (`POST /api/auth/password-otp`, rate limit 3×/10
 * menit per email+IP).
 *
 * Catatan privasi: server sengaja tidak membedakan email terdaftar dan tidak,
 * jadi pemanggil HARUS menampilkan layar "cek email" pada setiap sukses.
 */
export async function requestPasswordRecovery(
  input: ForgotPasswordInput
): Promise<ServiceResult<null>> {
  const parsed = parseOrErrors(forgotPasswordSchema, input);
  if (!parsed.ok) {
    return failValidation(
      Object.values(parsed.errors)[0] ?? "Email wajib diisi.",
      noData<null>()
    );
  }

  if (DATA_SOURCE_CONFIG.useMockData) {
    await mockDelay(400);
    return ok(null);
  }

  const res = await postAuthApi<unknown>(
    "/api/auth/password-otp",
    { email: parsed.data.email },
    "Email pemulihan belum bisa dikirim. Tunggu beberapa menit lalu coba lagi."
  );
  return res.success
    ? ok(null)
    : fail(res.error ?? "Email pemulihan belum bisa dikirim.", res.code ?? "unknown", noData<null>());
}

/**
 * Tautan pemulihan lama (Appwrite `userId` + `secret`) tidak berlaku lagi
 * setelah pindah ke Supabase. Dipertahankan supaya halaman lama tetap
 * memberi arahan, bukan error mentah.
 */
export async function completePasswordRecovery(
  args: { userId: string; secret: string } & ResetPasswordInput
): Promise<ServiceResult<null>> {
  const parsed = parseOrErrors(resetPasswordSchema, {
    password: args.password,
    passwordConfirm: args.passwordConfirm,
  });
  if (!parsed.ok) {
    return failValidation(
      Object.values(parsed.errors)[0] ?? "Password baru belum valid.",
      noData<null>()
    );
  }

  if (DATA_SOURCE_CONFIG.useMockData) {
    await mockDelay(400);
    return ok(null);
  }

  return failValidation(
    "Tautan pemulihan ini sudah tidak berlaku. Minta kode OTP baru dari halaman lupa password.",
    noData<null>()
  );
}

/** Selesaikan pemulihan password dengan email & kode OTP 6-digit. */
export async function completePasswordRecoveryWithOtp(
  args: { email: string; otpCode: string } & ResetPasswordInput
): Promise<ServiceResult<null>> {
  const parsed = parseOrErrors(resetPasswordSchema, {
    password: args.password,
    passwordConfirm: args.passwordConfirm,
  });
  if (!parsed.ok) {
    return failValidation(
      Object.values(parsed.errors)[0] ?? "Password baru belum valid.",
      noData<null>()
    );
  }

  const email = args.email.trim();
  const otpCode = args.otpCode.trim();
  if (!email || !/^\d{6}$/.test(otpCode)) {
    return failValidation(
      "Email atau kode OTP 6 digit belum valid. Minta kode baru.",
      noData<null>()
    );
  }

  if (DATA_SOURCE_CONFIG.useMockData) {
    await mockDelay(400);
    return ok(null);
  }

  const res = await postAuthApi<unknown>(
    "/api/auth/password-reset",
    { email, otpCode, ...parsed.data },
    "Kode OTP salah atau kedaluwarsa. Minta kode baru."
  );
  return res.success
    ? ok(null)
    : fail(res.error ?? "Gagal mengatur ulang password. Coba lagi.", res.code ?? "unknown", noData<null>());
}

// ---------------------------------------------------------------------------
// Verifikasi email lewat OTP
// ---------------------------------------------------------------------------
//
// Supabase mengirim kode 6 digit (template Magic Link, {{ .Token }}).
// Verifikasinya di server (`/api/auth/verify-email`) dengan client tanpa
// cookie, jadi sesi login di browser tidak pernah dihapus/dibuat ulang, lalu
// server mencatat `users.email_verified_at`.

/**
 * Kirim kode OTP verifikasi ke email akun yang sedang login.
 *
 * `userId`/`email` dipertahankan di signature demi kompatibilitas pemanggil;
 * server memakai email dari sesi, bukan dari argumen.
 */
export async function requestEmailOtp(args: {
  userId: string;
  email: string;
}): Promise<ServiceResult<null>> {
  void args;
  if (DATA_SOURCE_CONFIG.useMockData) {
    await mockDelay(300);
    return ok(null);
  }

  const res = await postAuthApi<unknown>(
    "/api/auth/email-otp",
    {},
    "Gagal mengirim kode verifikasi. Coba lagi."
  );
  return res.success
    ? ok(null)
    : fail(res.error ?? "Gagal mengirim kode verifikasi. Coba lagi.", res.code ?? "unknown", noData<null>());
}

/**
 * Verifikasi kode OTP email untuk akun yang sedang login.
 *
 * `password` tidak lagi dipakai (dulu untuk memulihkan sesi Appwrite yang
 * terpaksa dihapus); tetap di signature supaya form tidak berubah.
 */
export async function confirmEmailOtp(args: {
  userId: string;
  email: string;
  password: string;
  code: string;
}): Promise<ServiceResult<null>> {
  const code = args.code.trim();
  if (!args.userId || !code) {
    return failValidation("Masukkan kode 6 digit dari email kamu.", noData<null>());
  }

  if (DATA_SOURCE_CONFIG.useMockData) {
    await mockDelay(300);
    return ok(null);
  }

  const res = await postAuthApi<unknown>(
    "/api/auth/verify-email",
    { code },
    "Kode OTP salah atau kedaluwarsa. Minta kode baru."
  );
  return res.success
    ? ok(null)
    : fail(res.error ?? "Kode OTP salah atau kedaluwarsa. Minta kode baru.", res.code ?? "unknown", noData<null>());
}

// ---------------------------------------------------------------------------
// Google OAuth (di balik flag NEXT_PUBLIC_ENABLE_GOOGLE_OAUTH)
// ---------------------------------------------------------------------------

export function isGoogleOAuthEnabled(): boolean {
  return AUTH_CONFIG.googleOAuthEnabled;
}

/**
 * Mulai alur OAuth Google. Memanggilnya meninggalkan halaman ini.
 *
 * `role` & `next` diteruskan via query string ke /auth/callback (Route
 * Handler yang menukar `code` jadi sesi), lalu ke /auth/complete supaya
 * OAuthCallback tahu apakah ini pendaftaran baru UMKM/Kreator.
 *
 * Gagal tertutup — kalau flag mati, tidak melakukan apa pun.
 */
export function startGoogleOAuth(role?: string, next?: string): void {
  if (!AUTH_CONFIG.googleOAuthEnabled) {
    console.warn(
      "[auth] Google OAuth dimatikan (NEXT_PUBLIC_ENABLE_GOOGLE_OAUTH). Provider belum dikonfigurasi di Supabase."
    );
    return;
  }
  if (typeof window === "undefined") return;

  const origin = window.location.origin;
  const params = new URLSearchParams();
  if (next) params.set("next", next);
  if (role) params.set("role", role);
  const qs = params.toString();
  const redirectTo = `${origin}${AUTH_CONFIG.oauthSuccessPath}${qs ? `?${qs}` : ""}`;

  void createClient()
    .auth.signInWithOAuth({ provider: "google", options: { redirectTo } })
    .then(({ error }) => {
      if (error) {
        console.warn("[auth.oauth]", error.code ?? error.status);
        window.location.assign(`${origin}${AUTH_CONFIG.oauthFailurePath}`);
      }
    });
}
