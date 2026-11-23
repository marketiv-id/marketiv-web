import { putBriefSchema, putCampaignBrief } from "@/server/campaigns/brief";
import { pathId, readBody, umkmWriteContext } from "@/server/campaigns/route-helpers";
import { apiRoute } from "@/server/http";

export const dynamic = "force-dynamic";

type Context = { params: Promise<{ campaignId: string }> };

/** PUT /api/campaigns/[campaignId]/brief — upsert brief campaign draft. */
export function PUT(request: Request, context: Context) {
  return apiRoute("campaigns.brief", async (req) => {
    const ctx = await umkmWriteContext();
    const { campaignId } = await context.params;
    const body = await readBody(req, putBriefSchema);
    return putCampaignBrief(ctx, pathId(campaignId, "Campaign ID"), body);
  })(request);
}
