import { createAdminClient } from "@/lib/supabase/admin";
import { requireUser } from "@/server/auth/require-user";
import { claimCampaign, unclaimCampaign } from "@/server/campaign-flow/claims";
import { flowId } from "@/server/campaign-flow/shared";
import { apiRoute, json } from "@/server/http";

export const dynamic = "force-dynamic";

type Context = { params: Promise<{ campaignId: string }> };

const MESSAGES = { wrongRole: "Akses kreator aktif diperlukan.", inactive: "Akses kreator aktif diperlukan." };

/** POST /api/campaigns/[campaignId]/claim — kreator mengambil campaign. */
export function POST(request: Request, context: Context) {
  return apiRoute("campaigns.claim", async () => {
    const { user } = await requireUser({ role: "creator", messages: MESSAGES });
    const { campaignId } = await context.params;
    const result = await claimCampaign({ db: createAdminClient(), userId: user.id }, flowId(campaignId, "Campaign ID"));
    return json(result, 201);
  })(request);
}

/** DELETE /api/campaigns/[campaignId]/claim?claimId=… — batalkan klaim `claimed`. */
export function DELETE(request: Request, context: Context) {
  return apiRoute("campaigns.unclaim", async (req) => {
    const { user } = await requireUser({ role: "creator", messages: MESSAGES });
    const { campaignId } = await context.params;
    const claimId = flowId(new URL(req.url).searchParams.get("claimId"), "Claim ID");
    return unclaimCampaign({ db: createAdminClient(), userId: user.id }, flowId(campaignId, "Campaign ID"), claimId);
  })(request);
}
