import { getAdminDashboardSummary } from "@/server/admin/dashboard-summary";
import { apiRoute } from "@/server/http";
import { requireAdmin } from "@/server/require-admin";

/** GET /api/admin/dashboard-summary — port `get-admin-dashboard-summary`. */
export const dynamic = "force-dynamic";

export const GET = apiRoute("admin.dashboard-summary", async () => {
  const { db } = await requireAdmin();
  return getAdminDashboardSummary(db);
});
