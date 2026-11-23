import { AdminFunctionExecutionError } from "./errors";

export { AdminFunctionExecutionError } from "./errors";

/**
 * Pengganti `executeAdminFunction()` untuk Route Handler admin (`/api/admin/**`).
 *
 * Kontrak sengaja sama: `(name, payload, isValid, fallbackMessage) → T`.
 *   - non-2xx           → AdminFunctionExecutionError(status, pesan `error` route | fallback)
 *   - body bukan JSON   → AdminFunctionExecutionError(status || 502, …)
 *   - body tidak valid  → AdminFunctionExecutionError(502, "Respons … tidak valid.")
 *   - gagal jaringan    → AdminFunctionExecutionError(0, …)
 * Route GET menerima `payload` sebagai query string (nilai primitif saja).
 */
export const ADMIN_API_ROUTES = {
  getAdminDashboardSummary: { method: "GET", path: "/api/admin/dashboard-summary" },
  getAdminSubmissionQueue: { method: "GET", path: "/api/admin/submission-queue" },
  getAdminWithdrawalQueue: { method: "GET", path: "/api/admin/withdrawal-queue" },
  getAdminRatecardDeliverableQueue: { method: "GET", path: "/api/admin/ratecard-deliverable-queue" },
} as const satisfies Record<string, { method: "GET" | "POST"; path: string }>;

export type AdminApiName = keyof typeof ADMIN_API_ROUTES;

function toQuery(payload: unknown): string {
  if (!payload || typeof payload !== "object") return "";
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(payload as Record<string, unknown>)) {
    if (value === undefined || value === null || value === "") continue;
    if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
      params.set(key, String(value));
    }
  }
  const query = params.toString();
  return query ? `?${query}` : "";
}

export async function callAdminApi<T>(
  name: AdminApiName,
  payload: unknown,
  isValid: (value: unknown) => value is T,
  fallbackMessage: string,
): Promise<T> {
  const route = ADMIN_API_ROUTES[name];
  const isGet = route.method === "GET";
  const url = isGet ? `${route.path}${toQuery(payload)}` : route.path;

  let response: Response;
  try {
    response = await fetch(url, {
      method: route.method,
      credentials: "same-origin",
      cache: "no-store",
      headers: isGet ? { Accept: "application/json" } : { "Content-Type": "application/json", Accept: "application/json" },
      ...(isGet ? {} : { body: JSON.stringify(payload ?? {}) }),
    });
  } catch {
    throw new AdminFunctionExecutionError(0, "Tidak dapat terhubung ke server. Periksa koneksi lalu coba lagi.");
  }

  const text = await response.text().catch(() => "");
  let body: unknown = {};
  if (text) {
    try {
      body = JSON.parse(text);
    } catch {
      throw new AdminFunctionExecutionError(response.status || 502, "Respons server Admin bukan JSON valid.");
    }
  }

  if (!response.ok) {
    throw new AdminFunctionExecutionError(response.status || 500, responseError(body) || fallbackMessage);
  }
  if (!isValid(body)) throw new AdminFunctionExecutionError(502, "Respons server Admin tidak valid.");
  return body;
}

function responseError(value: unknown): string | undefined {
  return value && typeof value === "object" && typeof (value as Record<string, unknown>).error === "string"
    ? (value as Record<string, string>).error
    : undefined;
}
