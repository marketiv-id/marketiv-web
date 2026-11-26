import "server-only";

import type { AdminSupabaseClient } from "@/lib/supabase/admin";

import { HttpError } from "../http";
import { throwIfRpcError } from "../rpc-error";

/**
 * Port jalur Admin `review-submission`: setujui / tolak bukti kerja campaign.
 *
 * Logika status ada di RPC `review_submission` (0022, alur campaign — dipakai
 * juga UMKM) dengan `p_as_admin = true`. Approve mengkredit reward kreator
 * (`credit_campaign_reward`, 0026) dalam transaksi yang sama.
 *
 * Kontrak body = Function lama: `{ status: "approved" | "rejected", views?, notes? }`.
 * Respons = Function lama: `{ success: true, campaignId, status }`.
 */

export interface ReviewSubmissionInput {
  status: "approved" | "rejected";
  views?: number;
  notes?: string;
}

export interface ReviewSubmissionResult {
  success: true;
  campaignId: string;
  status: "approved" | "rejected";
}

export function parseReviewSubmissionBody(body: unknown): ReviewSubmissionInput {
  const input = (body && typeof body === "object" ? body : {}) as Record<string, unknown>;
  const status = input.status;
  if (status !== "approved" && status !== "rejected") {
    throw new HttpError(400, "Status review tidak valid.");
  }
  const views = input.views;
  if (status === "approved" && (typeof views !== "number" || !Number.isSafeInteger(views) || views < 0)) {
    throw new HttpError(400, "Jumlah views tidak valid.");
  }
  const notes = typeof input.notes === "string" ? input.notes.trim().slice(0, 1000) : undefined;
  return {
    status,
    ...(status === "approved" ? { views: views as number } : {}),
    ...(notes ? { notes } : {}),
  };
}

type ReviewRpc = (
  fn: "review_submission",
  args: {
    p_reviewer_id: string;
    p_submission_id: string;
    p_decision: string;
    p_note: string | null;
    p_as_admin: boolean;
    p_views: number | null;
  },
) => PromiseLike<{ data: unknown; error: { code?: string; message?: string } | null }>;

export async function reviewSubmissionAsAdmin(
  db: AdminSupabaseClient,
  adminId: string,
  submissionId: string,
  input: ReviewSubmissionInput,
): Promise<ReviewSubmissionResult> {
  if (!submissionId || submissionId.length > 255) throw new HttpError(400, "Submission tidak valid.");
  // Tipe RPC 0022 belum ada di `Database` sampai `npm run db:types`.
  const rpc = db.rpc.bind(db) as unknown as ReviewRpc;
  const { data, error } = await rpc("review_submission", {
    p_reviewer_id: adminId,
    p_submission_id: submissionId,
    p_decision: input.status,
    p_note: input.notes ?? null,
    p_as_admin: true,
    p_views: input.status === "approved" ? (input.views ?? 0) : null,
  });
  throwIfRpcError(error);
  const row = (data && typeof data === "object" ? data : {}) as Record<string, unknown>;
  const campaignId = typeof row.campaignId === "string" ? row.campaignId : typeof row.campaign_id === "string" ? row.campaign_id : "";
  return { success: true, campaignId, status: input.status };
}
