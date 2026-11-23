import "server-only";

import { NextResponse } from "next/server";

import { errorResponse, HttpError } from "./http-error";

/**
 * Helper Route Handler admin (padanan `src/server/http.ts` app user).
 *
 *   export const GET = apiRoute("admin.dashboard-summary", async () => {
 *     const { db } = await requireAdmin();
 *     return getAdminDashboardSummary(db);
 *   });
 *
 * Nilai biasa → 200 JSON; `Response` diteruskan; `HttpError` → status-nya;
 * error lain → 500 generik (detail hanya di log server).
 */

export { errorResponse, HttpError } from "./http-error";

export function json<T>(data: T, status = 200): NextResponse {
  return NextResponse.json(data, { status });
}

export function apiRoute(scope: string, handler: (request: Request) => Promise<unknown>) {
  return async (request: Request): Promise<Response> => {
    try {
      const result = await handler(request);
      if (result instanceof Response) return result;
      return json(result ?? null);
    } catch (err) {
      return errorResponse(err, scope);
    }
  };
}

/** Query string mentah (`?a=1&b=x`) → objek string. */
export function readQuery(request: Request): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [key, value] of new URL(request.url).searchParams) out[key] = value;
  return out;
}

/** Angka bulat dari query; kosong → `fallback`, bukan angka bulat → NaN (ditolak validator). */
export function queryInt(raw: string | undefined, fallback: number): number {
  if (raw === undefined || raw === "") return fallback;
  return /^-?\d+$/.test(raw.trim()) ? Number(raw.trim()) : Number.NaN;
}

export interface DbErrorLike {
  code?: string;
  message?: string;
}

/** Lempar bila supabase-js mengembalikan error (diubah jadi 500 generik oleh apiRoute). */
export function throwIfDbError(error: DbErrorLike | null | undefined): void {
  if (!error) return;
  if (error.code === "42501") throw new HttpError(403, "Akses Admin ditolak.");
  const wrapped = new Error(`[db] ${error.code ?? "?"}: ${error.message ?? "unknown"}`);
  (wrapped as Error & { cause?: unknown }).cause = error;
  throw wrapped;
}
