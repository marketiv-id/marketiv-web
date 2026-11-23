import { createAdminClient } from "@/lib/supabase/admin";
import { isAdminUser, requireUser } from "@/server/auth/require-user";
import { reviewSubmission, reviewSubmissionSchema } from "@/server/campaign-flow/review";
import { flowId } from "@/server/campaign-flow/shared";
import { apiRoute, parseBody, readJsonBody } from "@/server/http";

export const dynamic = "force-dynamic";

type Context = { params: Promise<{ submissionId: string }> };

/**
 * POST /api/submissions/[submissionId]/review — `{ status, views?, notes? }`.
 *
 * Sama dengan Function `review-submission`: hanya Admin Marketiv yang boleh
 * memvalidasi. Status admin dari `isAdminUser()` (app_metadata + users.role),
 * diteruskan ke RPC sebagai `p_as_admin`; non-admin mendapat 403 dari RPC.
 * App admin memanggil RPC yang sama lewat route-nya sendiri.
 */
export function POST(request: Request, context: Context) {
  return apiRoute("submissions.review", async (req) => {
    const { user, userRow } = await requireUser({ messages: { inactive: "Akun Anda sedang tidak aktif." } });
    const { submissionId } = await context.params;
    const body = parseBody(reviewSubmissionSchema, await readJsonBody(req), "Data review tidak valid.");
    return reviewSubmission(
      { db: createAdminClient(), userId: user.id, isAdmin: isAdminUser(user, userRow) },
      flowId(submissionId, "Submission"),
      body,
    );
  })(request);
}
