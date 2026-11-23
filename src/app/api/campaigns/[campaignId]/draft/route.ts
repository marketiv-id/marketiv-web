import { patchCampaignDraft, patchDraftSchema } from "@/server/campaigns/draft";
import { pathId, readBody, umkmWriteContext } from "@/server/campaigns/route-helpers";
import { apiRoute } from "@/server/http";

export const dynamic = "force-dynamic";

type Context = { params: Promise<{ campaignId: string }> };

/** PATCH /api/campaigns/[campaignId]/draft — pengganti Function patch-campaign-draft. */
export function PATCH(request: Request, context: Context) {
  return apiRoute("campaigns.draft", async (req) => {
    const ctx = await umkmWriteContext();
    const { campaignId } = await context.params;
    const body = await readBody(req, patchDraftSchema);
    return patchCampaignDraft(ctx, pathId(campaignId, "Campaign ID"), body);
  })(request);
}
