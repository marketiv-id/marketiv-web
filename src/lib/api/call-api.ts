import { FunctionExecutionError, statusToCode } from "./errors";

export { FunctionExecutionError } from "./errors";

/**
 * Pengganti `executeFunction<T>()` untuk Route Handler Next.js (`/api/**`).
 *
 * Kontraknya sengaja sama: `(name, body) → Promise<T>`, gagal → lempar
 * `FunctionExecutionError` (statusCode, code, responseCode). Service cukup
 * mengganti import + nama endpoint; logika pemanggil tidak berubah.
 *
 * Route GET menerima `body` sebagai query string (hanya nilai primitif;
 * `undefined`/`null`/string kosong dilewati). Route POST menerima JSON.
 *
 * Route selalu membalas error sebagai `{ error, code? }` — lihat
 * `src/server/http.ts`.
 */
export const API_ROUTES = {
  // ── Fase 5: 13 function baca-saja (9 di app user) ────────────────────────
  umkmDashboardSummary: { method: "GET", path: "/api/umkm/dashboard-summary" },
  umkmFinanceSummary: { method: "GET", path: "/api/umkm/finance-summary" },
  umkmProfile: { method: "GET", path: "/api/umkm/profile" },
  umkmNegotiations: { method: "GET", path: "/api/umkm/negotiations" },
  umkmRatecardReviews: { method: "GET", path: "/api/umkm/ratecard-reviews" },
  creatorDashboardSummary: { method: "GET", path: "/api/creator/dashboard-summary" },
  creatorProfile: { method: "GET", path: "/api/creator/profile" },
  creatorNegotiations: { method: "GET", path: "/api/creator/negotiations" },
  creatorDirectory: { method: "GET", path: "/api/creator/directory" },
} as const satisfies Record<string, { method: "GET" | "POST"; path: string }>;

export type ApiName = keyof typeof API_ROUTES;

type Primitive = string | number | boolean;

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
  const route = API_ROUTES[name];
  const isGet = route.method === "GET";
  const url = isGet ? `${route.path}${toQuery(body)}` : route.path;

  let response: Response;
  try {
    response = await fetch(url, {
      method: route.method,
      credentials: "same-origin",
      cache: "no-store",
      headers: isGet ? { Accept: "application/json" } : { "Content-Type": "application/json", Accept: "application/json" },
      ...(isGet ? {} : { body: JSON.stringify(body ?? {}) }),
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
