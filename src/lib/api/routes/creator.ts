import type { ApiRoute } from "./types";

/** Fase 6: rate card + paket, portfolio, akun sosial. */
export const CREATOR_ROUTES = {
  createRateCard: { method: "POST", path: "/api/rate-cards" },
  updateRateCard: { method: "PATCH", path: "/api/rate-cards/:rateCardId" },
  deleteRateCard: { method: "DELETE", path: "/api/rate-cards/:rateCardId" },
  createRateCardPackage: { method: "POST", path: "/api/rate-cards/:rateCardId/packages" },
  updateRateCardPackage: { method: "PATCH", path: "/api/rate-cards/:rateCardId/packages/:packageId" },
  deleteRateCardPackage: { method: "DELETE", path: "/api/rate-cards/:rateCardId/packages/:packageId" },
  createPortfolio: { method: "POST", path: "/api/creator/portfolios" },
  updatePortfolio: { method: "PATCH", path: "/api/creator/portfolios/:portfolioId" },
  deletePortfolio: { method: "DELETE", path: "/api/creator/portfolios/:portfolioId" },
  upsertSocialAccount: { method: "PUT", path: "/api/creator/social-accounts" },
  deleteSocialAccount: { method: "DELETE", path: "/api/creator/social-accounts/:accountId" },
} as const satisfies Record<string, ApiRoute>;
