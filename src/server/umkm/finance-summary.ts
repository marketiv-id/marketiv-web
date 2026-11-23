import "server-only";

import type { EscrowOverview, UmkmFinanceSummary } from "@/types/umkm-dashboard.types";

import { callReadRpc, type UmkmReadContext } from "./shared";

export interface UmkmFinanceSummaryResponse {
  finance: UmkmFinanceSummary;
  escrow: EscrowOverview;
}

/**
 * Port `get-umkm-finance-summary`. Agregasi di RPC `umkm_finance_summary`
 * (0015). Bentuk `{ finance, escrow }` sama dengan Function lama.
 */
export async function getUmkmFinanceSummary({ db, userId }: UmkmReadContext): Promise<UmkmFinanceSummaryResponse> {
  return callReadRpc<UmkmFinanceSummaryResponse>(db, "umkm_finance_summary", { p_umkm_id: userId });
}
