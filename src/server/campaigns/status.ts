import "server-only";

import { z } from "zod";

import { HttpError, throwIfDbError } from "@/server/http";

import {
  callWriteRpc,
  loadOwnedCampaign,
  NOT_FOUND,
  type CampaignRow,
  type CampaignWriteContext,
} from "./shared";

export const patchStatusSchema = z.object({
  action: z.enum(["pause", "resume", "publish"], {
    error: "action harus salah satu dari: pause, resume, publish.",
  }),
});
export type PatchStatusBody = z.infer<typeof patchStatusSchema>;

const TRANSITIONS = {
  pause: { from: "active", to: "paused", message: "Hanya campaign aktif yang bisa dijeda." },
  resume: { from: "paused", to: "active", message: "Hanya campaign terjeda yang bisa diaktifkan kembali." },
} as const;

/**
 * `PATCH /api/campaigns/[id]/status` — port `patch-campaign-status`.
 *   pause   : active → paused
 *   resume  : paused → active
 *   publish : draft → active, wajib remaining_budget ≥ budget (RPC
 *             publish_campaign; juga mengirim notifikasi "Campaign Baru")
 * Status/kode error sama dengan Function lama (404 / 409).
 * Mengembalikan baris campaign terbaru.
 */
export async function patchCampaignStatus(
  ctx: CampaignWriteContext,
  campaignId: string,
  body: PatchStatusBody,
): Promise<{ campaign: CampaignRow }> {
  if (body.action === "publish") {
    const result = await callWriteRpc<string>(ctx.db, "publish_campaign", {
      p_umkm_id: ctx.userId,
      p_campaign_id: campaignId,
    });
    if (result === "not_found") throw new HttpError(404, NOT_FOUND);
    if (result === "not_draft") throw new HttpError(409, "Hanya campaign draft yang bisa diterbitkan.");
    if (result === "underfunded") {
      throw new HttpError(
        409,
        "Dana campaign belum mencukupi target budget. Lakukan pembayaran/top-up terlebih dahulu.",
      );
    }
    return { campaign: await loadOwnedCampaign(ctx, campaignId) };
  }

  const transition = TRANSITIONS[body.action];
  const { data, error } = await ctx.db
    .from("campaigns")
    .update({ status: transition.to })
    .eq("id", campaignId)
    .eq("umkm_id", ctx.userId)
    .eq("status", transition.from)
    .select("*")
    .maybeSingle();
  throwIfDbError(error);
  if (data) return { campaign: data as CampaignRow };

  // Tidak ada baris yang berubah: bedakan "bukan milik / tidak ada" vs "status salah".
  await loadOwnedCampaign(ctx, campaignId);
  throw new HttpError(409, transition.message);
}
