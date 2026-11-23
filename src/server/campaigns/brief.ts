import "server-only";

import { throwIfDbError } from "@/server/http";

import {
  briefColumns,
  loadOwnedDraft,
  type BriefInput,
  type CampaignBriefRow,
  type CampaignWriteContext,
} from "./shared";

export { briefSchema as putBriefSchema } from "./shared";

/**
 * `PUT /api/campaigns/[id]/brief` — upsert brief (satu per campaign, unique
 * campaign_id). Hanya selama draft: setelah tayang brief dibaca kreator dan
 * Appwrite lama mencabut hak update pemilik saat publish.
 */
export async function putCampaignBrief(
  ctx: CampaignWriteContext,
  campaignId: string,
  body: BriefInput,
): Promise<{ brief: CampaignBriefRow }> {
  await loadOwnedDraft(ctx, campaignId, "Brief hanya bisa diubah selama campaign masih draft.");
  const { data, error } = await ctx.db
    .from("campaign_briefs")
    .upsert({ campaign_id: campaignId, ...briefColumns(body) }, { onConflict: "campaign_id" })
    .select("*")
    .single();
  throwIfDbError(error);
  return { brief: data as CampaignBriefRow };
}
