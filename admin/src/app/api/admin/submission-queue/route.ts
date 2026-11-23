import { getAdminSubmissionQueue } from "@/server/admin/submission-queue";
import { apiRoute, queryInt, readQuery } from "@/server/http";
import { requireAdmin } from "@/server/require-admin";

/** GET /api/admin/submission-queue?status=&limit= — port `get-admin-submission-queue`. */
export const dynamic = "force-dynamic";

export const GET = apiRoute("admin.submission-queue", async (request) => {
  const { db } = await requireAdmin();
  const query = readQuery(request);
  return getAdminSubmissionQueue(db, {
    status: query.status || undefined,
    limit: queryInt(query.limit, 50),
  });
});
