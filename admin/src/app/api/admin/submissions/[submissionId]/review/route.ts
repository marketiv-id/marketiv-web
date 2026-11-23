import { parseReviewSubmissionBody, reviewSubmissionAsAdmin } from "@/server/admin/review-submission";
import { readJsonBody } from "@/server/body";
import { apiRoute } from "@/server/http";
import { requireAdmin } from "@/server/require-admin";

type Params = { params: Promise<{ submissionId: string }> };

export const dynamic = "force-dynamic";

/**
 * POST /api/admin/submissions/[submissionId]/review
 * Body `{ status: "approved" | "rejected", views?, notes? }` → `{ success, campaignId, status }`.
 * Port jalur Admin `review-submission` (RPC `review_submission`, p_as_admin).
 */
export function POST(request: Request, { params }: Params) {
  return apiRoute("admin.submissions.review", async () => {
    const { user, db } = await requireAdmin();
    const input = parseReviewSubmissionBody(await readJsonBody(request));
    const { submissionId } = await params;
    return reviewSubmissionAsAdmin(db, user.id, submissionId, input);
  })(request);
}
