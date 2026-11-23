import "server-only";

import { z } from "zod";

import { HttpError } from "@/server/http";

import {
  assetSchema,
  briefColumns,
  briefSchema,
  callWriteRpc,
  campaignFieldShape,
  isOwnCampaignThumbnailUrl,
  type CampaignRow,
  type CampaignWriteContext,
} from "./shared";

/**
 * Body `POST /api/campaigns` — sama dengan `CreateCampaignDraftInput` service.
 * Key lain (status, remainingBudget, umkmId, spentAmount, …) DI-STRIP Zod,
 * dan RPC tidak membacanya sama sekali (celah #2).
 */
export const createCampaignSchema = z.object({
  title: campaignFieldShape.title,
  thumbnailUrl: campaignFieldShape.thumbnailUrl.optional(),
  category: campaignFieldShape.category,
  type: campaignFieldShape.type,
  platforms: campaignFieldShape.platforms.optional(),
  description: campaignFieldShape.description,
  budget: campaignFieldShape.budget,
  rewardPer1000Views: campaignFieldShape.rewardPer1000Views,
  claimLimit: campaignFieldShape.claimLimit,
  submissionDays: campaignFieldShape.submissionDays.optional(),
  brief: briefSchema.optional(),
  asset: assetSchema.optional(),
});
export type CreateCampaignBody = z.infer<typeof createCampaignSchema>;

/** Campaign draft + brief + aset dalam satu transaksi (RPC create_campaign_draft). */
export async function createCampaignDraft(
  ctx: CampaignWriteContext,
  body: CreateCampaignBody,
): Promise<{ campaign: CampaignRow }> {
  const thumbnailUrl = body.thumbnailUrl ?? "";
  if (thumbnailUrl && !isOwnCampaignThumbnailUrl(thumbnailUrl, ctx.userId)) {
    throw new HttpError(400, "URL gambar produk tidak valid.");
  }

  const campaign = await callWriteRpc<CampaignRow>(ctx.db, "create_campaign_draft", {
    p_umkm_id: ctx.userId,
    p_campaign: {
      title: body.title,
      thumbnail_url: thumbnailUrl,
      category: body.category,
      type: body.type,
      ...(body.platforms ? { platforms: body.platforms } : {}),
      description: body.description,
      budget: body.budget,
      reward_per_1000_views: body.rewardPer1000Views,
      claim_limit: body.claimLimit,
      submission_days: body.submissionDays ?? 7,
    },
    p_brief: body.brief ? briefColumns(body.brief) : null,
    p_asset: body.asset ? { file_url: body.asset.fileUrl, file_name: body.asset.fileName ?? "" } : null,
  });
  return { campaign };
}
