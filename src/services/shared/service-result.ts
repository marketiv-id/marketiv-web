import type { ServiceResult, ServiceErrorCode } from "@/types/domain";
import { FunctionExecutionError } from "@/lib/api/errors";
import { getCurrentUserId } from "@/services/auth/session.service";

/**
 * Helper ServiceResult bersama untuk lapisan Appwrite (baca & tulis).
 *
 * Sebelumnya `Doc`/`str`/`num`/`mapErrorCode`/`failFromError`/`requireUserId`
 * diduplikasi persis di umkm-appwrite.service.ts dan creator-appwrite.service.ts.
 * Sprint 3 menambah jalur tulis (fail write, validasi klien) yang HARUS identik
 * di kedua domain, jadi satu sumber kebenaran di sini.
 *
 * Aturan pesan (jangan diubah tanpa alasan):
 * - Baca gagal  → "Gagal memuat data. Coba lagi."   (perilaku Sprint 1/2)
 * - Tulis gagal → "Gagal menyimpan data. Coba lagi." (kecuali validation/Function)
 * UI bercabang di `code`, TIDAK pernah mem-parse teks `error`.
 */

export type Doc = Record<string, unknown>;

/**
 * Error mentah Appwrite ke console, HANYA di luar production.
 *
 * Alasannya bukan kenyamanan: pesan yang dikembalikan helper di bawah sengaja
 * generik, jadi 400, 403, 404, dan 409 tampil identik di UI. Tanpa log ini
 * satu-satunya cara membedakannya adalah menebak. Yang dicetak `code`/`type`/
 * `message` bawaan Appwrite — bukan payload, supaya tidak ada data pengguna
 * yang bocor ke console.
 */
const logRawError = (scope: string | undefined, err: unknown): void => {
  if (process.env.NODE_ENV === "production") return;
  const e = err as { code?: unknown; type?: unknown; message?: unknown };
  console.error(
    `[data] ${scope ?? "unknown"} gagal — code=${String(e?.code)} type=${String(
      e?.type
    )} message=${String(e?.message)}`,
    err
  );
};

export const str = (v: unknown): string => (typeof v === "string" ? v : "");
export const num = (v: unknown): number => (typeof v === "number" ? v : 0);

/** `null as unknown as T` di satu tempat, bukan tersebar di 20 pemanggil. */
export const noData = <T>(): T => null as unknown as T;

/**
 * Error supabase-js (PostgrestError / AuthError) membawa `code` STRING, bukan
 * status HTTP seperti AppwriteException. Dipetakan di sini supaya UI tetap
 * menerima ServiceErrorCode yang sama.
 */
const postgrestCode = (err: unknown, write = false): ServiceErrorCode | null => {
  const e = err as { code?: unknown; status?: unknown; name?: unknown } | null;
  if (typeof e?.code !== "string") return null;
  const code = e.code;
  if (code === "PGRST301" || code === "PGRST303" || e.name === "AuthSessionMissingError") return "auth";
  if (code === "42501") return "forbidden";
  if (code === "PGRST116") return "not_found";
  if (write && (code === "23505" || code === "23503" || code === "22P02" || code === "23514")) {
    return "validation";
  }
  if (/^(08|53|57|58|XX)/.test(code) || code.startsWith("PGRST0")) return "server";
  return "unknown";
};

/**
 * BACA. Tidak pernah menghasilkan "validation" — perilaku identik Sprint 1/2.
 * Function DTO sudah memetakan HTTP status → ServiceErrorCode sendiri.
 */
export const mapErrorCode = (err: unknown): ServiceErrorCode => {
  if (err instanceof FunctionExecutionError) return err.code;
  const pg = postgrestCode(err);
  if (pg) return pg;

  const code = (err as { code?: number })?.code;
  if (code === 401) return "auth";
  if (code === 403) return "forbidden";
  if (code === 404) return "not_found";
  if (typeof code === "number" && code >= 500) return "server";
  return "unknown";
};

/**
 * TULIS. Sama dengan mapErrorCode, PLUS 400/409 → "validation" untuk error SDK
 * langsung (createDocument/updateDocument menolak payload / konflik) supaya UI
 * bisa menampilkannya sebagai kesalahan input, bukan "server error".
 */
export const mapWriteErrorCode = (err: unknown): ServiceErrorCode => {
  if (err instanceof FunctionExecutionError) return err.code;
  const pg = postgrestCode(err, true);
  if (pg) return pg;

  const code = (err as { code?: number })?.code;
  if (code === 400 || code === 409 || code === 422) return "validation";
  if (code === 401) return "auth";
  if (code === 403) return "forbidden";
  if (code === 404) return "not_found";
  if (typeof code === "number" && code >= 500) return "server";
  return "unknown";
};

export const ok = <T>(data: T): ServiceResult<T> => ({ success: true, data });

export const fail = <T>(
  message: string,
  code: ServiceErrorCode,
  empty: T
): ServiceResult<T> => ({ success: false, data: empty, error: message, code });

/**
 * Hasil validasi klien (Zod) — dipanggil SEBELUM SDK. Satu-satunya sumber
 * "validation" yang andal di sisi klien karena error SDK baca tidak memetakannya.
 */
export const failValidation = <T>(message: string, empty: T): ServiceResult<T> =>
  fail(message, "validation", empty);

/** BACA gagal — pesan generik Sprint 1/2. */
export const failFromError = <T>(err: unknown, empty: T, scope?: string): ServiceResult<T> => {
  logRawError(scope, err);
  return {
    success: false,
    data: empty,
    error: "Gagal memuat data. Coba lagi.",
    code: mapErrorCode(err),
  };
};

/**
 * TULIS gagal. Untuk error validation, pakai `validationMessage` bila diberikan;
 * bila `err` adalah FunctionExecutionError, teruskan pesan Function (sudah ditulis
 * manusia di backend). Selain itu pesan generik "Gagal menyimpan data.".
 *
 * 409 dipisahkan dari validasi walaupun `mapWriteErrorCode` menyatukan keduanya
 * ke `"validation"`: konflik unique index BUKAN kesalahan input pengguna, dan
 * menyuruh mereka memperbaiki isian yang sudah benar hanya menyesatkan.
 */
export const failFromWriteError = <T>(
  err: unknown,
  empty: T,
  validationMessage?: string,
  scope?: string
): ServiceResult<T> => {
  logRawError(scope, err);
  const code = mapWriteErrorCode(err);
  const isConflict = (err as { code?: number })?.code === 409;
  let error = "Gagal menyimpan data. Coba lagi.";
  if (err instanceof FunctionExecutionError && err.message) {
    error = err.message;
  } else if (isConflict) {
    error = "Data ini sudah ada. Muat ulang halaman lalu coba lagi.";
  } else if (code === "validation" && validationMessage) {
    error = validationMessage;
  }
  return {
    success: false,
    data: empty,
    error,
    code,
    ...(err instanceof FunctionExecutionError && err.responseCode
      ? { reason: err.responseCode }
      : {}),
  };
};

/**
 * Ambil userId sesi aktif, atau ServiceResult error yang siap dikembalikan.
 *
 * Fase 5: tidak lagi memanggil `getSession()` penuh (3 read). userId diambil
 * dari cache AuthProvider / cookie sesi lewat `getCurrentUserId()`.
 */
export async function requireUserId<T>(
  empty: T
): Promise<{ ok: true; userId: string } | { ok: false; result: ServiceResult<T> }> {
  let userId: string | null = null;
  try {
    userId = await getCurrentUserId();
  } catch {
    return {
      ok: false,
      result: { success: false, data: empty, error: "Gagal memuat sesi. Coba lagi.", code: "server" },
    };
  }
  if (!userId) {
    return {
      ok: false,
      result: {
        success: false,
        data: empty,
        error: "Sesi tidak ditemukan. Silakan login.",
        code: "auth",
      },
    };
  }
  return { ok: true, userId };
}
