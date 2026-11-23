import { deleteCampaignAsset } from "@/server/campaigns/assets";
import { pathId, umkmWriteContext } from "@/server/campaigns/route-helpers";
import { apiRoute } from "@/server/http";

export const dynamic = "force-dynamic";

type Context = { params: Promise<{ campaignId: string; assetId: string }> };

/** DELETE /api/campaigns/[campaignId]/assets/[assetId] — hapus aset (draft saja). */
export function DELETE(request: Request, context: Context) {
  return apiRoute("campaigns.assets.delete", async () => {
    const ctx = await umkmWriteContext();
    const { campaignId, assetId } = await context.params;
    return deleteCampaignAsset(ctx, pathId(campaignId, "Campaign ID"), pathId(assetId, "Asset ID"));
  })(request);
}
