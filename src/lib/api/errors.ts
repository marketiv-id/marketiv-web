import type { ServiceErrorCode } from "@/types/domain";

/**
 * Error panggilan backend dengan `code` siap dipetakan ke ServiceResult.
 *
 * Dulu tinggal di `src/lib/appwrite/functions.ts`. Dipindah ke sini supaya
 * `callApi()` (Route Handler Supabase) dan `executeFunction()` (Appwrite, yang
 * masih dipakai jalur tulis sampai Fase 6–8) melempar KELAS YANG SAMA —
 * `instanceof FunctionExecutionError` di `service-result.ts` berlaku untuk
 * keduanya. `functions.ts` me-re-export kelas ini.
 */
export class FunctionExecutionError extends Error {
  readonly code: ServiceErrorCode;
  readonly statusCode: number;
  readonly responseCode?: string;

  constructor(message: string, statusCode: number, code: ServiceErrorCode, responseCode?: string) {
    super(message);
    this.name = "FunctionExecutionError";
    this.statusCode = statusCode;
    this.code = code;
    this.responseCode = responseCode;
  }
}

export const statusToCode = (statusCode: number): ServiceErrorCode => {
  if (statusCode === 401) return "auth";
  if (statusCode === 403) return "forbidden";
  if (statusCode === 404) return "not_found";
  // 409 = konflik yang bisa diperbaiki user (amount mismatch, kuota penuh,
  // permintaan duplikat). 429 = rate limit (pesan route sudah manusiawi).
  if (statusCode === 400 || statusCode === 409 || statusCode === 422 || statusCode === 429) {
    return "validation";
  }
  if (statusCode >= 500) return "server";
  return "unknown";
};
