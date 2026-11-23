import { createAdminClient } from "@/lib/supabase/admin";
import { requireUser } from "@/server/auth/require-user";
import { getCreatorDashboardSummary } from "@/server/creator/dashboard-summary";
import { asReadDb } from "@/server/creator/shared";
import { apiRoute } from "@/server/http";

/** GET /api/creator/dashboard-summary — `CreatorMetric` kreator yang login. */
export const GET = apiRoute("creator.dashboard-summary", async () => {
  const { user } = await requireUser({ role: "creator" });
  return getCreatorDashboardSummary({ db: asReadDb(createAdminClient()), userId: user.id });
});
