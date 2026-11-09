import type { ServiceErrorCode } from "@/types/domain";

/**
 * Pemetaan error Supabase Auth → pesan Indonesia + ServiceErrorCode.
 *
 * Dipakai di browser (login) dan di Route Handler (register, OTP, reset).
 * Yang dispesialisasi hanya TEKS; UI tetap bercabang di `code`.
 *
 * Supabase Auth mengisi `code` (string, mis. `invalid_credentials`) dan
 * `status` (HTTP). Kode lengkap: https://supabase.com/docs/guides/auth/debugging/error-codes
 */

export interface AuthErrorLike {
  code?: string;
  status?: number;
  message?: string;
  name?: string;
}

export function readAuthError(err: unknown): AuthErrorLike {
  if (typeof err !== "object" || err === null) {
    return typeof err === "string" ? { message: err } : {};
  }
  const e = err as Record<string, unknown>;
  return {
    code: typeof e.code === "string" ? e.code : undefined,
    status: typeof e.status === "number" ? e.status : undefined,
    message: typeof e.message === "string" ? e.message : undefined,
    name: typeof e.name === "string" ? e.name : undefined,
  };
}

export function authErrorCode(err: unknown): ServiceErrorCode {
  const { status, name } = readAuthError(err);
  if (name === "AuthRetryableFetchError" || status === 0) return "server";
  if (status === 400 || status === 409 || status === 422 || status === 429) return "validation";
  if (status === 401) return "auth";
  if (status === 403) return "forbidden";
  if (status === 404) return "not_found";
  if (typeof status === "number" && status >= 500) return "server";
  return "unknown";
}

export function authErrorMessage(err: unknown, fallback: string): string {
  const { code, status, message, name } = readAuthError(err);

  if (
    name === "AuthRetryableFetchError" ||
    status === 0 ||
    (message && /failed to fetch|network/i.test(message))
  ) {
    return "Tidak dapat terhubung ke server. Periksa koneksi internet lalu coba lagi.";
  }

  switch (code) {
    case "user_already_exists":
    case "email_exists":
      return "Email ini sudah terdaftar. Silakan masuk atau gunakan email lain.";
    case "invalid_credentials":
      return "Email atau password yang kamu masukkan tidak cocok.";
    case "user_banned":
      return "Akun kamu sedang ditangguhkan. Hubungi admin Marketiv.";
    case "same_password":
      return "Password baru tidak boleh sama dengan password lama.";
    case "weak_password":
      return "Password terlalu lemah. Gunakan minimal 8 karakter.";
    case "otp_expired":
    case "otp_disabled":
      return "Kode OTP salah atau kedaluwarsa. Minta kode baru.";
    case "over_email_send_rate_limit":
    case "over_request_rate_limit":
    case "over_sms_send_rate_limit":
      return "Terlalu banyak percobaan. Tunggu sebentar lalu coba lagi.";
    case "email_address_invalid":
      return "Alamat email tidak valid.";
    case "email_not_confirmed":
      return "Email belum dikonfirmasi. Cek kotak masuk kamu.";
    case "signup_disabled":
      return "Pendaftaran sedang ditutup. Coba lagi nanti.";
    case "session_not_found":
    case "session_expired":
    case "refresh_token_not_found":
      return "Sesi berakhir. Silakan masuk lagi.";
    default:
      return fallback;
  }
}
