import { createAdminClient } from "@/lib/supabase/admin";
import { requireUser } from "@/server/auth/require-user";
import { apiRoute } from "@/server/http";
import { getUmkmFinanceSummary } from "@/server/umkm/finance-summary";

export const dynamic = "force-dynamic";

/** GET /api/umkm/finance-summary — pengganti Function get-umkm-finance-summary. */
export const GET = apiRoute("umkm.finance-summary", async () => {
  const { user } = await requireUser({ role: "umkm" });
  return getUmkmFinanceSummary({ db: createAdminClient(), userId: user.id });
});
