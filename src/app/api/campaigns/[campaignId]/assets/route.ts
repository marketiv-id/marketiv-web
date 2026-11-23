import { createAssetSchema, createCampaignAsset } from "@/server/campaigns/assets";
import { pathId, readBody, umkmWriteContext } from "@/server/campaigns/route-helpers";
import { apiRoute, json } from "@/server/http";

export const dynamic = "force-dynamic";

type Context = { params: Promise<{ campaignId: string }> };

/** POST /api/campaigns/[campaignId]/assets — tambah/ganti tautan aset (draft saja). */
export function POST(request: Request, context: Context) {
  return apiRoute("campaigns.assets.create", async (req) => {
    const ctx = await umkmWriteContext();
    const { campaignId } = await context.params;
    const body = await readBody(req, createAssetSchema);
    return json(await createCampaignAsset(ctx, pathId(campaignId, "Campaign ID"), body), 201);
  })(request);
}
