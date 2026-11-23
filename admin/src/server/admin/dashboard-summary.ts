import "server-only";

import type { AdminSupabaseClient } from "@/lib/supabase/admin";

import { throwIfDbError } from "../http";

/** Port `get-admin-dashboard-summary`. DTO: `DashboardMetrics`. */
export interface AdminDashboardSummary {
  pendingSubmissionsCount: number;
  reviewedSubmissionsCount: number;
  activeCampaignsCount: number;
}

/** Tiga hitungan `head: true` paralel — satu round-trip, tanpa baris dikirim. */
export async function getAdminDashboardSummary(db: AdminSupabaseClient): Promise<AdminDashboardSummary> {
  const [pending, reviewed, active] = await Promise.all([
    db.from("campaign_submissions").select("id", { count: "exact", head: true }).eq("status", "pending"),
    db.from("campaign_submissions").select("id", { count: "exact", head: true }).neq("status", "pending"),
    db.from("campaigns").select("id", { count: "exact", head: true }).eq("status", "active"),
  ]);
  throwIfDbError(pending.error);
  throwIfDbError(reviewed.error);
  throwIfDbError(active.error);
  return {
    pendingSubmissionsCount: pending.count ?? 0,
    reviewedSubmissionsCount: reviewed.count ?? 0,
    activeCampaignsCount: active.count ?? 0,
  };
}
