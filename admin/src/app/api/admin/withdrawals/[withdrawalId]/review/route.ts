import { parseReviewWithdrawalBody, reviewWithdrawal } from "@/server/admin/review-withdrawal";
import { readJsonBody } from "@/server/body";
import { apiRoute } from "@/server/http";
import { requireAdmin } from "@/server/require-admin";

type Params = { params: Promise<{ withdrawalId: string }> };

export const dynamic = "force-dynamic";

/**
 * POST /api/admin/withdrawals/[withdrawalId]/review
 * Body `{ action: start_processing | mark_succeeded | fail, transferReference?,
 * failureReason?, adminNote? }` → `{ success, withdrawalId, status }`.
 * Port `review-withdrawal` (RPC `transition_withdrawal`).
 */
export function POST(request: Request, { params }: Params) {
  return apiRoute("admin.withdrawals.review", async () => {
    const { user, db } = await requireAdmin();
    const input = parseReviewWithdrawalBody(await readJsonBody(request));
    const { withdrawalId } = await params;
    return reviewWithdrawal(db, user.id, withdrawalId, input);
  })(request);
}
