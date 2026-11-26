import { parseAppealReviewBody, reviewAppeal } from "@/server/admin/user-actions";
import { readJsonBody } from "@/server/body";
import { apiRoute } from "@/server/http";
import { requireAdmin } from "@/server/require-admin";

type Params = { params: Promise<{ appealId: string }> };

export const dynamic = "force-dynamic";

/**
 * POST /api/admin/appeals/[appealId]/review — `{ decision: approved|rejected, note? }`
 * (port `review-appeal`; approved memulihkan akun). Di bawah `appeals/` karena
 * yang diputus adalah baris banding, bukan user.
 */
export function POST(request: Request, { params }: Params) {
  return apiRoute("admin.appeals.review", async () => {
    const { user, db } = await requireAdmin();
    const input = parseAppealReviewBody(await readJsonBody(request));
    const { appealId } = await params;
    return reviewAppeal(db, user.id, appealId, input);
  })(request);
}
