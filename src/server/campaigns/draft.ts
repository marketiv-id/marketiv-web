import "server-only";

import { z } from "zod";

import { HttpError, throwIfDbError } from "@/server/http";

import {
  campaignFieldShape,
  isOwnCampaignThumbnailUrl,
  loadOwnedDraft,
  NOT_FOUND_DRAFT,
  type CampaignRow,
  type CampaignWriteContext,
} from "./shared";

/**
 * Body `PATCH /api/campaigns/[id]/draft` — port allowlist `patch-campaign-draft`.
 * TIDAK ada remainingBudget/spentAmount/status/totalClaims/publishedAt di sini;
 * key itu di-strip Zod (celah #2).
 */
export const patchDraftSchema = z.object({
  title: campaignFieldShape.title.optional(),
  category: campaignFieldShape.category.optional(),
  type: campaignFieldShape.type.optional(),
  platforms: campaignFieldShape.platforms.optional(),
  description: campaignFieldShape.description.optional(),
  budget: campaignFieldShape.budget.optional(),
  rewardPer1000Views: campaignFieldShape.rewardPer1000Views.optional(),
  claimLimit: campaignFieldShape.claimLimit.optional(),
  submissionDays: campaignFieldShape.submissionDays.optional(),
  thumbnailUrl: campaignFieldShape.thumbnailUrl.optional(),
});
export type PatchDraftBody = z.infer<typeof patchDraftSchema>;

type CampaignPatch = Partial<
  Pick<
    CampaignRow,
    | "title"
    | "category"
    | "type"
    | "platforms"
    | "description"
    | "budget"
    | "reward_per_1000_views"
    | "claim_limit"
    | "submission_days"
    | "thumbnail_url"
  >
>;

/**
 * Perbarui konten campaign draft milik user. Aturan lama dipertahankan:
 *   - hanya status `draft` milik user (selain itu 404, pesan lama);
 *   - setelah dana masuk (remaining_budget > 0): budget, reward, kuota, dan
 *     thumbnail tidak boleh BERUBAH (nilai sama tetap boleh dikirim).
 *
 * Update memakai filter optimistik (status='draft' dan remaining_budget sama
 * dengan yang dibaca): bila webhook pembayaran mendanai campaign di antara baca
 * dan tulis, update tidak mengenai baris → 409, bukan menimpa aturan di atas.
 */
export async function patchCampaignDraft(
  ctx: CampaignWriteContext,
  campaignId: string,
  body: PatchDraftBody,
): Promise<{ campaign: CampaignRow }> {
  const campaign = await loadOwnedDraft(ctx, campaignId, NOT_FOUND_DRAFT).catch((err: unknown) => {
    // Pesan lama: draft yang sudah bukan draft juga "tidak ditemukan" (404).
    if (err instanceof HttpError && err.status === 409) throw new HttpError(404, NOT_FOUND_DRAFT);
    throw err;
  });
  const isFunded = campaign.remaining_budget > 0;
  const patch: CampaignPatch = {};

  if (body.title !== undefined) patch.title = body.title;
  if (body.category !== undefined) patch.category = body.category;
  if (body.type !== undefined) patch.type = body.type;
  if (body.platforms !== undefined) patch.platforms = body.platforms;
  if (body.description !== undefined) patch.description = body.description;

  if (body.budget !== undefined) {
    if (isFunded && body.budget !== campaign.budget) {
      throw new HttpError(400, "Tidak dapat mengubah budget setelah pendanaan masuk.");
    }
    patch.budget = body.budget;
  }
  if (body.rewardPer1000Views !== undefined) {
    if (isFunded && body.rewardPer1000Views !== campaign.reward_per_1000_views) {
      throw new HttpError(400, "Tidak dapat mengubah reward setelah pendanaan masuk.");
    }
    patch.reward_per_1000_views = body.rewardPer1000Views;
  }
  if (body.claimLimit !== undefined) {
    if (isFunded && body.claimLimit !== campaign.claim_limit) {
      throw new HttpError(400, "Tidak dapat mengubah kuota kreator setelah pendanaan masuk.");
    }
    patch.claim_limit = body.claimLimit;
  }
  if (body.submissionDays !== undefined) patch.submission_days = body.submissionDays;

  if (body.thumbnailUrl !== undefined) {
    const next = body.thumbnailUrl;
    const current = (campaign.thumbnail_url ?? "").trim();
    // Nilai lama (mis. URL Appwrite campaign legacy) boleh dikirim ulang apa adanya.
    if (next && next !== current && !isOwnCampaignThumbnailUrl(next, ctx.userId)) {
      throw new HttpError(400, "URL gambar produk tidak valid.");
    }
    if (isFunded && next !== current) {
      throw new HttpError(400, "Tidak dapat mengubah gambar campaign setelah pendanaan masuk.");
    }
    patch.thumbnail_url = next;
  }

  if (Object.keys(patch).length === 0) {
    throw new HttpError(400, "Tidak ada field yang diperbarui.");
  }

  const { data, error } = await ctx.db
    .from("campaigns")
    .update(patch)
    .eq("id", campaignId)
    .eq("umkm_id", ctx.userId)
    .eq("status", "draft")
    .eq("remaining_budget", campaign.remaining_budget)
    .select("*")
    .maybeSingle();
  throwIfDbError(error);
  if (!data) {
    throw new HttpError(409, "Campaign berubah saat disimpan. Muat ulang halaman lalu coba lagi.");
  }
  return { campaign: data as CampaignRow };
}
