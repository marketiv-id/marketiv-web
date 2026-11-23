import "server-only";

import { z } from "zod";

import { callFlowRpc, type FlowContext } from "./shared";

/** Host URL bukti harus sesuai platform (port `isValidProofUrl` submit-campaign-proof). */
export function isValidProofUrl(rawUrl: string, platform: string): boolean {
  try {
    const url = new URL(rawUrl);
    if (!/^https?:$/.test(url.protocol)) return false;
    const host = url.hostname.toLowerCase();
    if (platform === "tiktok") return /(^|\.)tiktok\.com$/.test(host);
    if (platform === "instagram") return /(^|\.)instagram\.com$/.test(host);
    return false;
  } catch {
    return false;
  }
}

export const submitProofSchema = z
  .object({
    claimId: z.string({ error: "Claim tidak valid." }).trim().min(1, "Claim tidak valid.").max(255),
    platform: z
      .string({ error: "Platform tidak valid." })
      .trim()
      .toLowerCase()
      .pipe(z.enum(["tiktok", "instagram"], { error: "Platform tidak valid." })),
    postUrl: z.string({ error: "URL bukti tayang tidak valid untuk platform yang dipilih." }).trim().max(2048),
    caption: z.string().max(5000).optional(),
  })
  .refine((v) => isValidProofUrl(v.postUrl, v.platform), {
    message: "URL bukti tayang tidak valid untuk platform yang dipilih.",
    path: ["postUrl"],
  });

export type SubmitProofInput = z.infer<typeof submitProofSchema>;

export interface SubmitProofResult {
  success: true;
  submissionId: string;
  claimId: string;
  campaignId: string;
  status: "pending";
}

/**
 * POST /api/campaigns/[campaignId]/submissions — RPC `submit_campaign_proof`
 * (klaim milik kreator & `claimed`, satu submission per klaim, klaim →
 * submitted, notifikasi UMKM). Fraud precheck dijalankan route lewat `after()`.
 */
export function submitCampaignProof(
  ctx: FlowContext,
  campaignId: string,
  input: SubmitProofInput,
): Promise<SubmitProofResult> {
  return callFlowRpc<SubmitProofResult>(ctx, "submit_campaign_proof", {
    p_creator_id: ctx.userId,
    p_campaign_id: campaignId,
    p_claim_id: input.claimId,
    p_platform: input.platform,
    p_post_url: input.postUrl,
    p_caption: input.caption ? input.caption.trim().slice(0, 1000) : null,
  });
}
