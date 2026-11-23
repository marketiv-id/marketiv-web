import { getAdminWithdrawalQueue } from "@/server/admin/withdrawal-queue";
import { apiRoute, queryInt, readQuery } from "@/server/http";
import { requireAdmin } from "@/server/require-admin";

/** GET /api/admin/withdrawal-queue?status=&limit=&offset= — port `get-admin-withdrawal-queue`. */
export const dynamic = "force-dynamic";

export const GET = apiRoute("admin.withdrawal-queue", async (request) => {
  const { db } = await requireAdmin();
  const query = readQuery(request);
  return getAdminWithdrawalQueue(db, {
    status: query.status || undefined,
    limit: queryInt(query.limit, 50),
    offset: queryInt(query.offset, 0),
  });
});
