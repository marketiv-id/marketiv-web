import "server-only";

import { NextResponse } from "next/server";
import type { z } from "zod";

import { parseOrErrors } from "@/lib/validations/to-field-errors";

import { errorResponse, HttpError } from "./auth/http-error";

/**
 * Helper bersama Route Handler `/api/**` (Fase 5+).
 *
 * Pola route:
 *
 *   export const GET = apiRoute("umkm.profile", async (request) => {
 *     const { user, userRow } = await requireUser({ role: "umkm" });
 *     return getUmkmProfile({ db: createAdminClient(), userId: user.id, userRow });
 *   });
 *
 * - Nilai biasa yang dikembalikan handler → `200` JSON.
 * - `Response` yang dikembalikan handler → diteruskan apa adanya.
 * - `HttpError` → `{ error, code, ...extra }` dengan status-nya.
 * - Error Postgres/PostgREST → dipetakan lewat `throwIfDbError()` (lihat bawah).
 * - Error lain → 500 generik (detail hanya di log server).
 */

export { errorResponse, HttpError, readJsonBody } from "./auth/http-error";
export { parseBody } from "./auth/validate";

export function json<T>(data: T, status = 200): NextResponse {
  return NextResponse.json(data, { status });
}

type Handler = (request: Request) => Promise<unknown>;

export function apiRoute(scope: string, handler: Handler): (request: Request) => Promise<Response> {
  return async (request: Request) => {
    try {
      const result = await handler(request);
      if (result instanceof Response) return result;
      return json(result ?? null);
    } catch (err) {
      return errorResponse(err, scope);
    }
  };
}

/** Query string → objek lalu divalidasi Zod. Gagal → 400 + pesan pertama. */
export function parseQuery<S extends z.ZodType>(
  schema: S,
  request: Request,
  fallback = "Parameter permintaan tidak valid.",
): z.infer<S> {
  const raw: Record<string, string> = {};
  for (const [key, value] of new URL(request.url).searchParams) raw[key] = value;
  const parsed = parseOrErrors(schema, raw);
  if (!parsed.ok) {
    throw new HttpError(400, Object.values(parsed.errors)[0] ?? fallback, "validation", {
      fieldErrors: parsed.errors,
    });
  }
  return parsed.data;
}

/** Bentuk minimal error PostgREST / Postgres dari supabase-js. */
export interface DbErrorLike {
  code?: string;
  message?: string;
  details?: string | null;
  hint?: string | null;
}

/**
 * Pemetaan error database → status HTTP:
 *   PGRST116 (single() tanpa baris)        → 404
 *   22P02 (format uuid/angka salah)        → 400
 *   23505 (unique) / 23503 (FK) / P0001*   → 409
 *   42501 (permission denied / RLS)        → 403
 *   PGRST301/PGRST303 (JWT)                → 401
 *   lainnya                                → 500 (error asli di-log)
 *
 * *P0001 = `raise exception` dari RPC tanpa errcode khusus: dianggap konflik
 *  aturan bisnis, pesannya diteruskan.
 */
export function dbErrorToHttp(error: DbErrorLike, notFoundMessage = "Data tidak ditemukan."): HttpError | null {
  switch (error.code) {
    case "PGRST116":
      return new HttpError(404, notFoundMessage);
    case "22P02":
    case "22023":
      return new HttpError(400, "Parameter permintaan tidak valid.");
    case "23505":
    case "23503":
      return new HttpError(409, "Data bentrok dengan data lain. Muat ulang lalu coba lagi.");
    case "P0001":
      return new HttpError(409, error.message || "Permintaan ditolak.");
    case "42501":
      return new HttpError(403, "Akses ditolak.");
    case "PGRST301":
    case "PGRST303":
      return new HttpError(401, "Sesi tidak ditemukan. Silakan login.");
    default:
      return null;
  }
}

/** Lempar bila supabase-js mengembalikan error. Dipakai: `throwIfDbError(error)`. */
export function throwIfDbError(error: DbErrorLike | null | undefined, notFoundMessage?: string): void {
  if (!error) return;
  const mapped = dbErrorToHttp(error, notFoundMessage);
  if (mapped) throw mapped;
  const wrapped = new Error(`[db] ${error.code ?? "?"}: ${error.message ?? "unknown"}`);
  (wrapped as Error & { cause?: unknown }).cause = error;
  throw wrapped;
}

/** `{ data, error }` → `data`, atau lempar. */
export function unwrap<T>(result: { data: T; error: DbErrorLike | null }, notFoundMessage?: string): T {
  throwIfDbError(result.error, notFoundMessage);
  return result.data;
}
