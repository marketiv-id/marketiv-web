import type { ServiceErrorCode, ServiceResult } from "@/types/domain";

/**
 * Pemanggil Route Handler `/api/auth/*` dari browser.
 *
 * Route selalu menjawab `{ error, code }` saat gagal (lihat
 * `src/server/auth/http-error.ts`), jadi hasilnya bisa diteruskan apa adanya ke
 * bentuk ServiceResult yang dipakai form.
 */

const KNOWN_CODES: readonly ServiceErrorCode[] = [
  "validation",
  "auth",
  "not_found",
  "forbidden",
  "server",
  "unknown",
];

function codeFromStatus(status: number): ServiceErrorCode {
  if (status === 400 || status === 409 || status === 422 || status === 429) return "validation";
  if (status === 401) return "auth";
  if (status === 403) return "forbidden";
  if (status === 404) return "not_found";
  if (status >= 500) return "server";
  return "unknown";
}

export async function postAuthApi<T>(
  path: string,
  body: unknown,
  fallbackError: string,
): Promise<ServiceResult<T>> {
  let response: Response;
  try {
    response = await fetch(path, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify(body ?? {}),
    });
  } catch {
    return {
      success: false,
      data: null as unknown as T,
      error: "Tidak dapat terhubung ke server. Periksa koneksi internet lalu coba lagi.",
      code: "server",
    };
  }

  let payload: Record<string, unknown> = {};
  try {
    payload = (await response.json()) as Record<string, unknown>;
  } catch {
    // respons tanpa JSON — pakai fallback di bawah
  }

  if (!response.ok) {
    const code = KNOWN_CODES.includes(payload.code as ServiceErrorCode)
      ? (payload.code as ServiceErrorCode)
      : codeFromStatus(response.status);
    return {
      success: false,
      data: null as unknown as T,
      error: typeof payload.error === "string" && payload.error ? payload.error : fallbackError,
      code,
    };
  }

  return { success: true, data: payload as T };
}
