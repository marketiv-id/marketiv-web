import { deleteCampaignDraft } from "@/server/campaigns/delete";
import { pathId, umkmWriteContext } from "@/server/campaigns/route-helpers";
import { apiRoute } from "@/server/http";

export const dynamic = "force-dynamic";

type Context = { params: Promise<{ campaignId: string }> };

/** DELETE /api/campaigns/[campaignId] — hapus campaign draft milik sendiri. */
export function DELETE(request: Request, context: Context) {
  return apiRoute("campaigns.delete", async () => {
    const ctx = await umkmWriteContext();
    const { campaignId } = await context.params;
    return deleteCampaignDraft(ctx, pathId(campaignId, "Campaign ID"));
  })(request);
}
