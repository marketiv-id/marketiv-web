import { parseReviewDeliverableBody, reviewRatecardDeliverable } from "@/server/admin/review-ratecard-deliverable";
import { readJsonBody } from "@/server/body";
import { apiRoute } from "@/server/http";
import { requireAdmin } from "@/server/require-admin";

type Params = { params: Promise<{ deliverableId: string }> };

export const dynamic = "force-dynamic";

/**
 * POST /api/admin/ratecard-deliverables/[deliverableId]/review
 * Body `{ decision: "valid" | "invalid", notes? }` (notes wajib untuk invalid)
 * → `{ success, deliverableId, decision, reviewedAt }`. Port `review-ratecard-deliverable`.
 */
export function POST(request: Request, { params }: Params) {
  return apiRoute("admin.ratecard-deliverables.review", async () => {
    const { user, db } = await requireAdmin();
    const input = parseReviewDeliverableBody(await readJsonBody(request));
    const { deliverableId } = await params;
    return reviewRatecardDeliverable(db, user.id, deliverableId, input);
  })(request);
}
