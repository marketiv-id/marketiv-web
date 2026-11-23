import { after } from "next/server";

import { createAdminClient } from "@/lib/supabase/admin";
import { requireUser } from "@/server/auth/require-user";
import { runFraudPrecheck } from "@/server/campaign-flow/fraud";
import { flowId } from "@/server/campaign-flow/shared";
import { submitCampaignProof, submitProofSchema } from "@/server/campaign-flow/submissions";
import { apiRoute, json, parseBody, readJsonBody } from "@/server/http";

export const dynamic = "force-dynamic";

type Context = { params: Promise<{ campaignId: string }> };

/**
 * POST /api/campaigns/[campaignId]/submissions — kirim bukti tayang.
 * Setelah respons terkirim, `after()` menjalankan fraud precheck (port
 * `ai-fraud-precheck`); kegagalannya tidak memengaruhi respons.
 */
export function POST(request: Request, context: Context) {
  return apiRoute("campaigns.submissions", async (req) => {
    const { user } = await requireUser({
      role: "creator",
      messages: { inactive: "Akun Anda sedang tidak aktif.", wrongRole: "Akses kreator aktif diperlukan." },
    });
    const { campaignId } = await context.params;
    const body = parseBody(submitProofSchema, await readJsonBody(req), "Data bukti tidak valid.");
    const db = createAdminClient();
    const result = await submitCampaignProof({ db, userId: user.id }, flowId(campaignId, "Campaign"), body);
    after(async () => {
      await runFraudPrecheck(result.submissionId, { db });
    });
    return json(result, 201);
  })(request);
}
