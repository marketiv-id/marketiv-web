import { pathId, readBody, umkmWriteContext } from "@/server/campaigns/route-helpers";
import { patchCampaignStatus, patchStatusSchema } from "@/server/campaigns/status";
import { apiRoute } from "@/server/http";

export const dynamic = "force-dynamic";

type Context = { params: Promise<{ campaignId: string }> };

/** PATCH /api/campaigns/[campaignId]/status — pause / resume / publish. */
export function PATCH(request: Request, context: Context) {
  return apiRoute("campaigns.status", async (req) => {
    const ctx = await umkmWriteContext();
    const { campaignId } = await context.params;
    const body = await readBody(req, patchStatusSchema);
    return patchCampaignStatus(ctx, pathId(campaignId, "Campaign ID"), body);
  })(request);
}
