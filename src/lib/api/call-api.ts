import { FunctionExecutionError, statusToCode } from "./errors";
import { ACCOUNT_ROUTES } from "./routes/account";
import { CAMPAIGN_ROUTES } from "./routes/campaign";
import { CREATOR_ROUTES } from "./routes/creator";
import { FILE_ROUTES } from "./routes/files";
import { FLOW_ROUTES } from "./routes/flow";
import { READ_ROUTES } from "./routes/read";
import type { ApiRoute } from "./routes/types";

export { FunctionExecutionError } from "./errors";

/**
 * Pengganti `executeFunction<T>()` untuk Route Handler Next.js (`/api/**`).
 *
 * Kontraknya sengaja sama: `(name, body) → Promise<T>`, gagal → lempar
 * `FunctionExecutionError` (statusCode, code, responseCode). Service cukup
 * mengganti import + nama endpoint; logika pemanggil tidak berubah.
 *
 * `:param` di path diisi dari key `body` yang sama (lalu dihapus dari body).
 * GET/DELETE mengirim sisa body sebagai query string (hanya nilai primitif;
 * `undefined`/`null`/string kosong dilewati); POST/PATCH/PUT sebagai JSON.
 *
 * Route selalu membalas error sebagai `{ error, code? }` — lihat
 * `src/server/http.ts`.
 */
/**
 * Peta nama → endpoint. Satu file per domain di `routes/` supaya tiap pemilik
 * domain menambah entri tanpa menyentuh file lain.
 */
export const API_ROUTES = {
  ...READ_ROUTES,
  ...ACCOUNT_ROUTES,
  ...CAMPAIGN_ROUTES,
  ...CREATOR_ROUTES,
  ...FILE_ROUTES,
  ...FLOW_ROUTES,
} as const satisfies Record<string, ApiRoute>;

export type ApiName = keyof typeof API_ROUTES;

type Primitive = string | number | boolean;

/** Isi `:param` dari body; key yang dipakai dihapus dari body. */
export function resolvePath(
  template: string,
  body: unknown,
): { path: string; rest: Record<string, unknown> | undefined } {
  const rest =
    body && typeof body === "object" && !Array.isArray(body)
      ? { ...(body as Record<string, unknown>) }
      : undefined;
  const path = template.replace(/:([A-Za-z0-9_]+)/g, (_, key: string) => {
    const value = rest?.[key];
    if (typeof value !== "string" && typeof value !== "number") {
      throw new FunctionExecutionError(`Parameter "${key}" wajib diisi.`, 400, "validation");
    }
    const text = String(value);
    if (!text) throw new FunctionExecutionError(`Parameter "${key}" wajib diisi.`, 400, "validation");
    if (rest) delete rest[key];
    return encodeURIComponent(text);
  });
  return { path, rest: rest ?? (body as Record<string, unknown> | undefined) };
}

function toQuery(body: unknown): string {
  if (!body || typeof body !== "object") return "";
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(body as Record<string, unknown>)) {
    if (value === undefined || value === null || value === "") continue;
    if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
      params.set(key, String(value as Primitive));
    }
  }
  const query = params.toString();
  return query ? `?${query}` : "";
}

export async function callApi<T>(name: ApiName, body?: unknown): Promise<T> {
  const route: ApiRoute = API_ROUTES[name];
  const { path, rest } = resolvePath(route.path, body);
  const inQuery = route.method === "GET" || route.method === "DELETE";
  const url = inQuery ? `${path}${toQuery(rest)}` : path;

  let response: Response;
  try {
    response = await fetch(url, {
      method: route.method,
      credentials: "same-origin",
      cache: "no-store",
      headers: inQuery
        ? { Accept: "application/json" }
        : { "Content-Type": "application/json", Accept: "application/json" },
      ...(inQuery ? {} : { body: JSON.stringify(rest ?? {}) }),
    });
  } catch {
    throw new FunctionExecutionError(
      "Tidak dapat terhubung ke server. Periksa koneksi internet lalu coba lagi.",
      0,
      "server",
    );
  }

  const text = await response.text().catch(() => "");
  let payload: unknown = null;
  if (text) {
    try {
      payload = JSON.parse(text);
    } catch {
      throw new FunctionExecutionError(
        `Endpoint ${name} mengembalikan respons non-JSON`,
        response.status || 502,
        response.ok ? "server" : statusToCode(response.status),
      );
    }
  }

  if (!response.ok) {
    const p = payload as { error?: unknown; code?: unknown; reason?: unknown } | null;
    const message = typeof p?.error === "string" && p.error ? p.error : `Endpoint ${name} mengembalikan ${response.status}`;
    const responseCode = typeof p?.reason === "string" ? p.reason : undefined;
    throw new FunctionExecutionError(message, response.status, statusToCode(response.status), responseCode);
  }

  return payload as T;
}
