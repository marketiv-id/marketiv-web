import "server-only";

import { callFlowRpc, type FlowContext } from "./shared";

export interface ClaimResult {
  claimId: string;
  campaignId: string;
  status: "claimed";
  claimedAt: string;
}

/**
 * POST /api/campaigns/[campaignId]/claim — RPC `claim_campaign` (lock campaign,
 * cek status/dana/kuota/profil, +total_claims, notifikasi UMKM; satu transaksi).
 * Pengganti tulis langsung `campaign_claims` + event `campaign-claimed`.
 */
export function claimCampaign(ctx: FlowContext, campaignId: string): Promise<ClaimResult> {
  return callFlowRpc<ClaimResult>(ctx, "claim_campaign", {
    p_campaign_id: campaignId,
    p_creator_id: ctx.userId,
  });
}

/**
 * DELETE /api/campaigns/[campaignId]/claim?claimId=… — RPC `unclaim_campaign`
 * (hapus klaim `claimed` milik sendiri + kembalikan slot, atomik).
 */
export function unclaimCampaign(
  ctx: FlowContext,
  campaignId: string,
  claimId: string,
): Promise<{ success: true; claimId: string }> {
  return callFlowRpc(ctx, "unclaim_campaign", {
    p_claim_id: claimId,
    p_creator_id: ctx.userId,
    p_campaign_id: campaignId,
  });
}
