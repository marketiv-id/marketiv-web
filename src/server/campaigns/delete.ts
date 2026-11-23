import "server-only";

import { HttpError, throwIfDbError } from "@/server/http";

import { loadOwnedDraft, type CampaignWriteContext } from "./shared";

/**
 * `DELETE /api/campaigns/[id]` — hapus campaign DRAFT milik user. Brief & aset
 * ikut terhapus lewat FK `on delete cascade`.
 *
 * Mengembalikan `thumbnailUrl` lama supaya klien membersihkan file-nya
 * (best-effort; policy storage hanya mengizinkan folder milik sendiri).
 * Campaign yang sudah punya baris pembayaran ditolak FK (RESTRICT) → 409.
 */
export async function deleteCampaignDraft(
  ctx: CampaignWriteContext,
  campaignId: string,
): Promise<{ ok: true; thumbnailUrl: string }> {
  const campaign = await loadOwnedDraft(
    ctx,
    campaignId,
    "Hanya campaign draft yang bisa dihapus. Campaign yang sudah tayang cukup dijeda.",
  );
  const { data, error } = await ctx.db
    .from("campaigns")
    .delete()
    .eq("id", campaignId)
    .eq("umkm_id", ctx.userId)
    .eq("status", "draft")
    .select("id");
  if (error?.code === "23503") {
    throw new HttpError(409, "Campaign ini sudah punya riwayat pembayaran sehingga tidak bisa dihapus.");
  }
  throwIfDbError(error);
  if (!data || (data as unknown[]).length === 0) {
    throw new HttpError(409, "Campaign berubah saat dihapus. Muat ulang halaman lalu coba lagi.");
  }
  return { ok: true, thumbnailUrl: campaign.thumbnail_url ?? "" };
}
