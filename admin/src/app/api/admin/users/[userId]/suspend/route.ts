import { parseSuspendBody, suspendUser } from "@/server/admin/user-actions";
import { readJsonBody } from "@/server/body";
import { apiRoute } from "@/server/http";
import { requireAdmin } from "@/server/require-admin";

type Params = { params: Promise<{ userId: string }> };

export const dynamic = "force-dynamic";

/** POST /api/admin/users/[userId]/suspend — `{ status?: suspended|terminated, reason }` (port `suspend-user`). */
export function POST(request: Request, { params }: Params) {
  return apiRoute("admin.users.suspend", async () => {
    const { user, db } = await requireAdmin();
    const input = parseSuspendBody(await readJsonBody(request));
    const { userId } = await params;
    return suspendUser(db, user.id, userId, input);
  })(request);
}
