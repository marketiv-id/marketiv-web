import "server-only";

import type { CreatorMetric } from "@/types/creator-dashboard";

import { num, throwIf, type ReadDb } from "./shared";

/**
 * Port `get-creator-dashboard-summary`. Seluruh agregasi (Job Pool, klaim,
 * submission, escrow tertahan, wallet, pendapatan) dihitung RPC
 * `creator_dashboard_summary` dalam satu round-trip — lihat 0016_read_creator.sql.
 */
export async function getCreatorDashboardSummary({ db, userId }: { db: ReadDb; userId: string }): Promise<CreatorMetric> {
  const { data, error } = await db.rpc("creator_dashboard_summary", { p_user_id: userId });
  throwIf(error);
  const m = (data ?? {}) as Record<string, unknown>;
  return {
    availableJobsCount: num(m.availableJobsCount),
    activeJobsCount: num(m.activeJobsCount),
    pendingSubmissionsCount: num(m.pendingSubmissionsCount),
    balance: num(m.balance),
    pendingPayouts: num(m.pendingPayouts),
    validatedViewsCount: num(m.validatedViewsCount),
    activeRateCardsCount: num(m.activeRateCardsCount),
    negotiationOrdersCount: num(m.negotiationOrdersCount),
    escrowBalance: num(m.escrowBalance),
    totalEarnings: num(m.totalEarnings),
    thisMonthEarnings: num(m.thisMonthEarnings),
    campaignEarnings: num(m.campaignEarnings),
    rateCardEarnings: num(m.rateCardEarnings),
  };
}
