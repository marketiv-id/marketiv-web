import "server-only";

import { HttpError } from "@/server/http";

import { getMidtransConfig, type MidtransConfig } from "./midtrans";

/** Konfigurasi Midtrans wajib ada; tanpa server key → 503 (bukan crash). */
export function requireMidtransConfig(): MidtransConfig {
  const config = getMidtransConfig();
  if (!config) throw new HttpError(503, "Pembayaran belum dikonfigurasi.", "server");
  return config;
}
