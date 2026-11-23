import type { ApiRoute } from "./types";

/** Fase 8: pembayaran (Midtrans) dan penarikan saldo. Pemilik domain boleh menambah entri. */
export const FINANCE_ROUTES = {
  createPayment: { method: "POST", path: "/api/payments" },
  cancelPayment: { method: "POST", path: "/api/payments/:paymentId/cancel" },
  requestWithdrawal: { method: "POST", path: "/api/withdrawals" },
} as const satisfies Record<string, ApiRoute>;
