import "server-only";

import type { UmkmDashboardSummary } from "@/types/umkm-dashboard.types";

import { callReadRpc, type UmkmReadContext } from "./shared";

/**
 * Port `get-umkm-dashboard-summary`. Seluruh agregasi di RPC
 * `umkm_dashboard_summary` (0015) — satu round-trip, tanpa batas 5000 dokumen,
 * jadi `isTruncated` selalu false.
 */
export async function getUmkmDashboardSummary({ db, userId }: UmkmReadContext): Promise<UmkmDashboardSummary> {
  return callReadRpc<UmkmDashboardSummary>(db, "umkm_dashboard_summary", { p_umkm_id: userId });
}
