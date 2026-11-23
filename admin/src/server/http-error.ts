import { NextResponse } from "next/server";

/**
 * Error dengan status HTTP untuk Route Handler admin (`/api/admin/**`).
 * Padanan `src/server/auth/http-error.ts` di app user. Bentuk respons error:
 * `{ error, code }` — service admin membaca `error` sebagai pesan.
 */
export type AdminErrorCode = "validation" | "auth" | "forbidden" | "not_found" | "server" | "unknown";

export function codeForStatus(status: number): AdminErrorCode {
  if (status === 400 || status === 409 || status === 422 || status === 429) return "validation";
  if (status === 401) return "auth";
  if (status === 403) return "forbidden";
  if (status === 404) return "not_found";
  if (status >= 500) return "server";
  return "unknown";
}

export class HttpError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly code: AdminErrorCode = codeForStatus(status),
  ) {
    super(message);
    this.name = "HttpError";
  }
}

export function errorResponse(err: unknown, scope?: string): NextResponse {
  if (err instanceof HttpError) {
    return NextResponse.json({ error: err.message, code: err.code }, { status: err.status });
  }
  console.error(`[admin-api${scope ? `.${scope}` : ""}]`, err);
  return NextResponse.json(
    { error: "Terjadi kesalahan di server. Coba lagi.", code: "server" satisfies AdminErrorCode },
    { status: 500 },
  );
}
