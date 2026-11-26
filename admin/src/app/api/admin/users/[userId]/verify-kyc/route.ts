import { verifyKyc } from "@/server/admin/user-actions";
import { apiRoute } from "@/server/http";
import { requireAdmin } from "@/server/require-admin";

type Params = { params: Promise<{ userId: string }> };

export const dynamic = "force-dynamic";

/** POST /api/admin/users/[userId]/verify-kyc — tandai KYC verified (port `verify-kyc`, idempoten). */
export function POST(request: Request, { params }: Params) {
  return apiRoute("admin.users.verify-kyc", async () => {
    const { user, db } = await requireAdmin();
    const { userId } = await params;
    return verifyKyc(db, user.id, userId);
  })(request);
}
