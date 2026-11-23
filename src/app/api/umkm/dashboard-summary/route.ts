import { createAdminClient } from "@/lib/supabase/admin";
import { requireUser } from "@/server/auth/require-user";
import { apiRoute } from "@/server/http";
import { getUmkmDashboardSummary } from "@/server/umkm/dashboard-summary";

export const dynamic = "force-dynamic";

/** GET /api/umkm/dashboard-summary — pengganti Function get-umkm-dashboard-summary. */
export const GET = apiRoute("umkm.dashboard-summary", async () => {
  const { user } = await requireUser({ role: "umkm" });
  return getUmkmDashboardSummary({ db: createAdminClient(), userId: user.id });
});
