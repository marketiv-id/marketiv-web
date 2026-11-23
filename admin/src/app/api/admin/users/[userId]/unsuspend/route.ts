import { unsuspendUser } from "@/server/admin/user-actions";
import { readJsonBody } from "@/server/body";
import { apiRoute } from "@/server/http";
import { requireAdmin } from "@/server/require-admin";

type Params = { params: Promise<{ userId: string }> };

export const dynamic = "force-dynamic";

/** POST /api/admin/users/[userId]/unsuspend — `{ note? }` (port `unsuspend-user`). */
export function POST(request: Request, { params }: Params) {
  return apiRoute("admin.users.unsuspend", async () => {
    const { user, db } = await requireAdmin();
    const body = await readJsonBody(request).catch(() => ({}));
    const { userId } = await params;
    return unsuspendUser(db, user.id, userId, body);
  })(request);
}
