import "server-only";

import { z } from "zod";

import { HttpError, throwIfDbError } from "@/server/http";

import {
  assetSchema,
  loadOwnedDraft,
  type CampaignAssetRow,
  type CampaignWriteContext,
} from "./shared";

/** `replace: true` = ganti aset TERLAMA campaign (perilaku edit draft lama). */
export const createAssetSchema = assetSchema.extend({
  replace: z.boolean().optional(),
});
export type CreateAssetBody = z.infer<typeof createAssetSchema>;

const NOT_DRAFT = "Aset hanya bisa diubah selama campaign masih draft.";

/** `POST /api/campaigns/[id]/assets` — tambah (atau ganti) tautan aset eksternal. */
export async function createCampaignAsset(
  ctx: CampaignWriteContext,
  campaignId: string,
  body: CreateAssetBody,
): Promise<{ asset: CampaignAssetRow }> {
  await loadOwnedDraft(ctx, campaignId, NOT_DRAFT);
  const values = {
    source: "external",
    type: "link",
    file_url: body.fileUrl,
    file_name: body.fileName || "Folder Aset Eksternal",
  };

  if (body.replace) {
    const { data: existing, error: readError } = await ctx.db
      .from("campaign_assets")
      .select("id")
      .eq("campaign_id", campaignId)
      .order("created_at", { ascending: true })
      .order("id", { ascending: true })
      .limit(1)
      .maybeSingle();
    throwIfDbError(readError);
    if (existing) {
      const { data, error } = await ctx.db
        .from("campaign_assets")
        .update(values)
        .eq("id", (existing as { id: string }).id)
        .eq("campaign_id", campaignId)
        .select("*")
        .single();
      throwIfDbError(error);
      return { asset: data as CampaignAssetRow };
    }
  }

  const { data, error } = await ctx.db
    .from("campaign_assets")
    .insert({ campaign_id: campaignId, ...values })
    .select("*")
    .single();
  throwIfDbError(error);
  return { asset: data as CampaignAssetRow };
}

/** `DELETE /api/campaigns/[id]/assets/[assetId]` — hanya selama draft. */
export async function deleteCampaignAsset(
  ctx: CampaignWriteContext,
  campaignId: string,
  assetId: string,
): Promise<{ ok: true }> {
  await loadOwnedDraft(ctx, campaignId, NOT_DRAFT);
  const { data, error } = await ctx.db
    .from("campaign_assets")
    .delete()
    .eq("id", assetId)
    .eq("campaign_id", campaignId)
    .select("id");
  throwIfDbError(error);
  if (!data || (data as unknown[]).length === 0) throw new HttpError(404, "Aset tidak ditemukan.");
  return { ok: true };
}
