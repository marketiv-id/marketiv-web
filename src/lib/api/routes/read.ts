import type { ApiRoute } from "./types";

/** Fase 5: 13 function baca-saja (9 di app user). */
export const READ_ROUTES = {
  umkmDashboardSummary: { method: "GET", path: "/api/umkm/dashboard-summary" },
  umkmFinanceSummary: { method: "GET", path: "/api/umkm/finance-summary" },
  umkmProfile: { method: "GET", path: "/api/umkm/profile" },
  umkmNegotiations: { method: "GET", path: "/api/umkm/negotiations" },
  umkmRatecardReviews: { method: "GET", path: "/api/umkm/ratecard-reviews" },
  creatorDashboardSummary: { method: "GET", path: "/api/creator/dashboard-summary" },
  creatorProfile: { method: "GET", path: "/api/creator/profile" },
  creatorNegotiations: { method: "GET", path: "/api/creator/negotiations" },
  creatorDirectory: { method: "GET", path: "/api/creator/directory" },
} as const satisfies Record<string, ApiRoute>;
