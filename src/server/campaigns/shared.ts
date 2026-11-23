import "server-only";

import { z } from "zod";

import type { AdminSupabaseClient } from "@/lib/supabase/admin";
import { getSupabasePublicEnv } from "@/lib/supabase/env";
import { HttpError, throwIfDbError } from "@/server/http";
import { MINIMUM_CAMPAIGN_BUDGET } from "@/types/domain";
import type { Database, Json } from "@/types/supabase";

/**
 * Bersama untuk route tulis campaign (Fase 6).
 *
 * Semua fungsi menerima `{ db, userId }`: `db` = client service role (dibuat
 * route SETELAH `requireUser({ role: "umkm" })`), `userId` = id sesi. Setiap
 * query tulis selalu memfilter `umkm_id = userId` — service role melewati RLS,
 * jadi filter ini satu-satunya penjaga kepemilikan.
 */

export type CampaignRow = Database["public"]["Tables"]["campaigns"]["Row"];
export type CampaignBriefRow = Database["public"]["Tables"]["campaign_briefs"]["Row"];
export type CampaignAssetRow = Database["public"]["Tables"]["campaign_assets"]["Row"];

export interface CampaignWriteContext {
  db: Pick<AdminSupabaseClient, "from" | "rpc">;
  userId: string;
}

export const MAX_BUDGET = 999_999_999;
export const THUMBNAIL_BUCKET = "campaign-assets";

export const NOT_FOUND_DRAFT = "Campaign draft tidak ditemukan atau bukan milik Anda.";
export const NOT_FOUND = "Campaign tidak ditemukan atau bukan milik Anda.";

/** Panggil RPC 0019 (belum ada di tipe hasil generate). `this` dijaga lewat bind. */
export async function callWriteRpc<T>(
  db: CampaignWriteContext["db"],
  name: string,
  args: Record<string, unknown>,
): Promise<T> {
  const rpc = db.rpc.bind(db) as unknown as (
    fn: string,
    params: Record<string, unknown>,
  ) => PromiseLike<{ data: unknown; error: { code?: string; message?: string } | null }>;
  const { data, error } = await rpc(name, args);
  throwIfDbError(error);
  if (data === null || data === undefined) {
    throw new HttpError(500, "Terjadi kesalahan di server. Coba lagi.", "server");
  }
  return data as T;
}

/** Baca campaign milik userId, atau 404. */
export async function loadOwnedCampaign(
  ctx: CampaignWriteContext,
  campaignId: string,
  notFoundMessage = NOT_FOUND,
): Promise<CampaignRow> {
  const { data, error } = await ctx.db
    .from("campaigns")
    .select("*")
    .eq("id", campaignId)
    .eq("umkm_id", ctx.userId)
    .maybeSingle();
  throwIfDbError(error);
  if (!data) throw new HttpError(404, notFoundMessage);
  return data as CampaignRow;
}

/** Campaign milik userId yang masih draft: 404 bila tidak ada, 409 bila bukan draft. */
export async function loadOwnedDraft(
  ctx: CampaignWriteContext,
  campaignId: string,
  notDraftMessage: string,
): Promise<CampaignRow> {
  const campaign = await loadOwnedCampaign(ctx, campaignId, NOT_FOUND_DRAFT);
  if (campaign.status !== "draft") throw new HttpError(409, notDraftMessage);
  return campaign;
}

/**
 * URL thumbnail yang sah: URL publik objek bucket `campaign-assets` di project
 * Supabase ini, di folder milik userId (`<uid>/<file>`). Mencegah campaign
 * menunjuk file milik orang lain atau host arbitrer.
 */
export function isOwnCampaignThumbnailUrl(value: string, userId: string): boolean {
  let parsed: URL;
  let base: URL;
  try {
    parsed = new URL(value);
    base = new URL(getSupabasePublicEnv().url);
  } catch {
    return false;
  }
  if (parsed.origin !== base.origin || parsed.search || parsed.hash) return false;
  const match = /^\/storage\/v1\/object\/public\/([^/]+)\/([^/]+)\/([^/]+)$/.exec(parsed.pathname);
  if (!match) return false;
  const [, bucket, folder, file] = match.map((part) => decodeURIComponent(part ?? ""));
  return bucket === THUMBNAIL_BUCKET && folder === userId && file.length > 0 && !file.includes("..");
}

// ── Skema body ────────────────────────────────────────────────────────────────

const intIn = (min: number, max: number, message: string) =>
  z.coerce.number({ error: message }).int(message).min(min, message).max(max, message);

export const campaignFieldShape = {
  title: z
    .string({ error: "Judul kampanye wajib diisi." })
    .trim()
    .min(1, "Judul kampanye wajib diisi.")
    .max(255, "Judul kampanye maksimal 255 karakter."),
  category: z
    .string({ error: "Kategori wajib dipilih." })
    .trim()
    .min(1, "Kategori wajib dipilih.")
    .max(100, "Kategori maksimal 100 karakter."),
  type: z.enum(["ugc", "clipping"], { error: "Tipe kampanye wajib dipilih." }),
  platforms: z
    .array(z.enum(["tiktok", "instagram", "youtube"], { error: "Platform tidak valid." }))
    .min(1, "Pilih minimal satu platform."),
  description: z
    .string({ error: "Deskripsi wajib diisi." })
    .trim()
    .max(2000, "Deskripsi produk maksimal 2000 karakter."),
  budget: intIn(
    MINIMUM_CAMPAIGN_BUDGET,
    MAX_BUDGET,
    `Budget tidak valid. Minimal Rp${MINIMUM_CAMPAIGN_BUDGET.toLocaleString("id-ID")}.`,
  ),
  rewardPer1000Views: intIn(0, MAX_BUDGET, "rewardPer1000Views tidak valid."),
  claimLimit: intIn(1, 100_000, "claimLimit harus minimal 1."),
  submissionDays: intIn(1, 365, "submissionDays harus minimal 1."),
  thumbnailUrl: z.string().trim().max(2048, "URL gambar produk maksimal 2048 karakter."),
};

export const briefSchema = z.object({
  briefDetail: z.string().max(10000, "Brief maksimal 10000 karakter.").default(""),
  contentAngle: z.string().max(2000, "Content angle maksimal 2000 karakter.").default(""),
  cta: z.string().max(1000, "CTA maksimal 1000 karakter.").default(""),
  objective: z.string().max(2000, "Objective maksimal 2000 karakter.").optional(),
  /** String JSON `{do:[],dont:[]}` (packDoAndDontJson) atau objeknya langsung. */
  doAndDont: z.union([z.string().max(4000), z.record(z.string(), z.unknown())]).optional(),
  generatedByAi: z.boolean().optional(),
});
export type BriefInput = z.infer<typeof briefSchema>;

export const assetSchema = z.object({
  fileUrl: z
    .string({ error: "URL aset wajib diisi." })
    .trim()
    .min(1, "URL aset wajib diisi.")
    .max(2048, "URL aset maksimal 2048 karakter.")
    .refine((value) => /^https?:\/\//i.test(value), "URL aset harus diawali http:// atau https://."),
  fileName: z.string().trim().max(255, "Nama aset maksimal 255 karakter.").optional(),
});

/** `doAndDont` string JSON → objek `{do, dont}`; tidak valid / kosong → null. */
export function parseDoAndDont(value: BriefInput["doAndDont"]): Record<string, unknown> | null {
  if (value === undefined || value === "") return null;
  if (typeof value !== "string") return value;
  try {
    const parsed: unknown = JSON.parse(value);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : null;
  } catch {
    return null;
  }
}

/** Brief (camelCase) → kolom `campaign_briefs`. */
export function briefColumns(brief: BriefInput) {
  return {
    objective: brief.objective ?? "",
    content_angle: brief.contentAngle,
    cta: brief.cta,
    brief_detail: brief.briefDetail,
    do_and_dont: parseDoAndDont(brief.doAndDont) as Json | null,
    generated_by_ai: brief.generatedByAi ?? false,
  };
}
