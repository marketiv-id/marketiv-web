import "server-only";

import type { AdminSupabaseClient } from "@/lib/supabase/admin";

import { HttpError, throwIfDbError } from "../http";

/**
 * Port `get-admin-submission-queue`.
 *
 * Bentuk DTO identik dengan Function lama (validator `isQueueResponse` di
 * `submission.service.ts`). Kolom Appwrite yang tidak punya padanan Postgres
 * (`creator_profiles.username/tiktokHandle`, `umkm_profiles.brandName/ownerName`,
 * `submission.note/submittedAt/verifiedAt/verifiedBy/rejectionReason`) hanya
 * fallback di kode lama, jadi hasilnya jatuh ke default yang sama.
 *
 * Round-trip konstan (bukan N+1): submissions → (campaigns ∥ creator_profiles)
 * → umkm_profiles.
 */

export const SUBMISSION_STATUSES = ["pending", "approved", "rejected", "all"] as const;
export type SubmissionQueueStatus = (typeof SUBMISSION_STATUSES)[number];
const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 100;

export interface SubmissionQueueInput {
  status?: string;
  limit?: number;
}

export interface SubmissionQueueItem {
  id: string;
  campaignId: string;
  creator: { id: string; name: string; username: string; avatarUrl?: string; tiktokHandle?: string };
  campaign: { id: string; title: string; rewardPer1000Views: number; platform: Platform };
  umkm: { id: string; name: string; ownerName?: string };
  platform: Platform;
  postUrl: string;
  note?: string;
  status: "pending" | "approved" | "rejected";
  submittedAt: string;
  verifiedViews: number;
  verifiedAt?: string;
  verifiedBy?: string;
  estimatedReward: number;
  finalReward: number;
  rejectionReason?: string;
}

type Platform = "tiktok" | "instagram" | "youtube";

export function parseSubmissionQueueInput(input: SubmissionQueueInput): { status: SubmissionQueueStatus; limit: number } {
  const status = input.status ?? "pending";
  const limit = input.limit ?? DEFAULT_LIMIT;
  if (!(SUBMISSION_STATUSES as readonly string[]).includes(status)) {
    throw new HttpError(400, "Status submission tidak valid.");
  }
  if (!Number.isInteger(limit) || limit < 1 || limit > MAX_LIMIT) {
    throw new HttpError(400, `Limit harus antara 1 dan ${MAX_LIMIT}.`);
  }
  return { status: status as SubmissionQueueStatus, limit };
}

export async function getAdminSubmissionQueue(
  db: AdminSupabaseClient,
  input: SubmissionQueueInput,
): Promise<{ items: SubmissionQueueItem[]; total: number }> {
  const { status, limit } = parseSubmissionQueueInput(input);

  let query = db
    .from("campaign_submissions")
    .select(
      "id, campaign_id, creator_id, platform, post_url, caption, views, views_count, views_final, views_captured_at, views_source, status, review_notes, created_at",
      { count: "exact" },
    )
    .order("created_at", { ascending: false })
    .order("id", { ascending: false })
    .limit(limit);
  if (status !== "all") query = query.eq("status", status);
  const { data: submissions, error, count } = await query;
  throwIfDbError(error);
  const rows = submissions ?? [];
  if (rows.length === 0) return { items: [], total: count ?? 0 };

  const campaignIds = unique(rows.map((row) => row.campaign_id));
  const creatorIds = unique(rows.map((row) => row.creator_id));
  const [campaignResult, creatorResult] = await Promise.all([
    db.from("campaigns").select("id, umkm_id, title, reward_per_1000_views").in("id", campaignIds),
    db.from("creator_profiles").select("user_id, display_name, avatar_url").in("user_id", creatorIds),
  ]);
  throwIfDbError(campaignResult.error);
  throwIfDbError(creatorResult.error);

  const umkmIds = unique((campaignResult.data ?? []).map((row) => row.umkm_id));
  const umkmResult = umkmIds.length
    ? await db.from("umkm_profiles").select("user_id, business_name").in("user_id", umkmIds)
    : { data: [], error: null };
  throwIfDbError(umkmResult.error);

  const campaigns = new Map((campaignResult.data ?? []).map((row) => [row.id, row]));
  const creators = new Map((creatorResult.data ?? []).map((row) => [row.user_id, row]));
  const umkms = new Map((umkmResult.data ?? []).map((row) => [row.user_id, row]));

  const items = rows.map((submission): SubmissionQueueItem => {
    const campaign = campaigns.get(submission.campaign_id);
    const creator = creators.get(submission.creator_id);
    const umkm = campaign ? umkms.get(campaign.umkm_id) : undefined;
    const verifiedViews = Number(submission.views_final ? submission.views_count : submission.views) || 0;
    const rewardPer1000Views = Number(campaign?.reward_per_1000_views) || 0;
    const estimatedReward = Math.floor(verifiedViews / 1000) * rewardPer1000Views;
    const itemPlatform = platform(submission.platform);

    return {
      id: str(submission.id),
      campaignId: str(submission.campaign_id),
      creator: {
        id: str(submission.creator_id),
        name: str(creator?.display_name) || "Content Creator",
        // creator_profiles tidak punya username/tiktokHandle (fallback lama).
        username: "@creator",
        avatarUrl: optionalString(creator?.avatar_url),
        tiktokHandle: undefined,
      },
      campaign: {
        id: str(submission.campaign_id),
        title: str(campaign?.title) || "Campaign Pay-Per-View",
        rewardPer1000Views,
        platform: itemPlatform,
      },
      umkm: {
        id: str(campaign?.umkm_id),
        name: str(umkm?.business_name) || "UMKM Client",
        ownerName: undefined,
      },
      platform: itemPlatform,
      postUrl: str(submission.post_url),
      note: optionalString(submission.caption),
      status: submissionStatus(submission.status),
      submittedAt: str(submission.created_at),
      verifiedViews,
      verifiedAt: optionalString(submission.views_captured_at),
      verifiedBy: optionalString(submission.views_source),
      estimatedReward,
      finalReward: estimatedReward,
      rejectionReason: optionalString(submission.review_notes),
    };
  });

  return { items, total: count ?? items.length };
}

function unique(values: (string | null | undefined)[]): string[] {
  return [...new Set(values.filter((v): v is string => typeof v === "string" && v.length > 0))].slice(0, MAX_LIMIT);
}
function str(value: unknown): string {
  return typeof value === "string" ? value : "";
}
function optionalString(value: unknown): string | undefined {
  return str(value) || undefined;
}
function submissionStatus(value: unknown): SubmissionQueueItem["status"] {
  return value === "approved" || value === "rejected" ? value : "pending";
}
function platform(value: unknown): Platform {
  return value === "instagram" || value === "youtube" ? value : "tiktok";
}
