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
 * Route GET menerima `payload` sebagai query string (nilai primitif saja);
 * POST mengirim JSON. `:param` di path diisi dari key `payload` yang sama lalu
 * dihapus dari body.
 */
export const ADMIN_API_ROUTES = {
  getAdminDashboardSummary: { method: "GET", path: "/api/admin/dashboard-summary" },
  getAdminSubmissionQueue: { method: "GET", path: "/api/admin/submission-queue" },
  getAdminWithdrawalQueue: { method: "GET", path: "/api/admin/withdrawal-queue" },
  getAdminRatecardDeliverableQueue: { method: "GET", path: "/api/admin/ratecard-deliverable-queue" },
  // Fase 7 — tulis review
  reviewSubmission: { method: "POST", path: "/api/admin/submissions/:submissionId/review" },
  reviewRatecardDeliverable: { method: "POST", path: "/api/admin/ratecard-deliverables/:deliverableId/review" },
  // Fase 8 — withdrawal + aksi admin terhadap user (audit `admin_actions`)
  reviewWithdrawal: { method: "POST", path: "/api/admin/withdrawals/:withdrawalId/review" },
  suspendUser: { method: "POST", path: "/api/admin/users/:userId/suspend" },
  unsuspendUser: { method: "POST", path: "/api/admin/users/:userId/unsuspend" },
  verifyUserKyc: { method: "POST", path: "/api/admin/users/:userId/verify-kyc" },
  reviewAppeal: { method: "POST", path: "/api/admin/appeals/:appealId/review" },
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

/** Isi `:param` dari payload; key yang dipakai dihapus dari body. */
function resolvePath(template: string, payload: unknown): { path: string; rest: unknown } {
  if (!template.includes(":")) return { path: template, rest: payload };
  const rest: Record<string, unknown> =
    payload && typeof payload === "object" && !Array.isArray(payload) ? { ...(payload as Record<string, unknown>) } : {};
  const path = template.replace(/:([A-Za-z0-9_]+)/g, (_, key: string) => {
    const value = rest[key];
    if ((typeof value !== "string" && typeof value !== "number") || String(value) === "") {
      throw new AdminFunctionExecutionError(400, `Parameter "${key}" wajib diisi.`);
    }
    delete rest[key];
    return encodeURIComponent(String(value));
  });
  return { path, rest };
}

export async function callAdminApi<T>(
  name: AdminApiName,
  payload: unknown,
  isValid: (value: unknown) => value is T,
  fallbackMessage: string,
): Promise<T> {
  const route: { method: "GET" | "POST"; path: string } = ADMIN_API_ROUTES[name];
  const isGet = route.method === "GET";
  const { path, rest } = resolvePath(route.path, payload);
  const url = isGet ? `${path}${toQuery(rest)}` : path;

  let response: Response;
  try {
    response = await fetch(url, {
      method: route.method,
      credentials: "same-origin",
      cache: "no-store",
      headers: isGet ? { Accept: "application/json" } : { "Content-Type": "application/json", Accept: "application/json" },
      ...(isGet ? {} : { body: JSON.stringify(rest ?? {}) }),
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
