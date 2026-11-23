import { getAdminRatecardDeliverableQueue } from "@/server/admin/ratecard-deliverable-queue";
import { apiRoute } from "@/server/http";
import { requireAdmin } from "@/server/require-admin";

/** GET /api/admin/ratecard-deliverable-queue — port `get-admin-ratecard-deliverable-queue`. */
export const dynamic = "force-dynamic";

export const GET = apiRoute("admin.ratecard-deliverable-queue", async () => {
  const { db } = await requireAdmin();
  return getAdminRatecardDeliverableQueue(db);
});
