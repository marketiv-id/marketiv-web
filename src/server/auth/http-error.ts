import { NextResponse } from "next/server";

import type { ServiceErrorCode } from "@/types/domain";

/**
 * Error yang membawa status HTTP untuk Route Handler.
 *
 * `code` mengikuti `ServiceErrorCode` supaya service di browser bisa meneruskan
 * kode yang sama ke UI (UI bercabang di `code`, bukan di teks pesan).
 */
export class HttpError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly code: ServiceErrorCode = codeForStatus(status),
    public readonly extra?: Record<string, unknown>,
  ) {
    super(message);
    this.name = "HttpError";
  }
}

export function codeForStatus(status: number): ServiceErrorCode {
  if (status === 400 || status === 409 || status === 422) return "validation";
  if (status === 401) return "auth";
  if (status === 403) return "forbidden";
  if (status === 404) return "not_found";
  if (status === 429) return "validation";
  if (status >= 500) return "server";
  return "unknown";
}

/** Bentuk respons error semua route `/api/**`: `{ error, code, ...extra }`. */
export function errorResponse(err: unknown, scope?: string): NextResponse {
  if (err instanceof HttpError) {
    return NextResponse.json(
      { error: err.message, code: err.code, ...(err.extra ?? {}) },
      { status: err.status },
    );
  }
  console.error(`[api${scope ? `.${scope}` : ""}]`, err);
  return NextResponse.json(
    { error: "Terjadi kesalahan di server. Coba lagi.", code: "server" satisfies ServiceErrorCode },
    { status: 500 },
  );
}

/** Baca body JSON; body rusak → 400, bukan 500. */
export async function readJsonBody(request: Request): Promise<Record<string, unknown>> {
  try {
    const body: unknown = await request.json();
    if (body && typeof body === "object" && !Array.isArray(body)) {
      return body as Record<string, unknown>;
    }
  } catch {
    // jatuh ke error di bawah
  }
  throw new HttpError(400, "Format permintaan tidak valid.");
}
