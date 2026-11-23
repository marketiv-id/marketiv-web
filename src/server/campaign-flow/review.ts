import "server-only";

import { z } from "zod";

import { callFlowRpc, type FlowContext } from "./shared";

/** Periode observasi views sebelum approve (env lama VIEW_VALIDATION_DELAY_HOURS, default 72). */
export function observationHours(env: Record<string, string | undefined> = process.env): number {
  const raw = env.VIEW_VALIDATION_DELAY_HOURS;
  if (typeof raw !== "string" || raw.trim() === "") return 72;
  const parsed = Number(raw);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 72;
}

export const reviewSubmissionSchema = z
  .object({
    status: z.enum(["approved", "rejected"], { error: "Status review tidak valid." }),
    views: z.number().int().min(0).max(Number.MAX_SAFE_INTEGER).optional(),
    notes: z.string().max(5000).optional(),
  })
  .refine((v) => v.status !== "approved" || v.views !== undefined, {
    message: "Jumlah views tidak valid.",
    path: ["views"],
  });

export type ReviewSubmissionInput = z.infer<typeof reviewSubmissionSchema>;

export interface ReviewContext extends FlowContext {
  /** Dari `isAdminUser()` (app_metadata + users.role) — tidak pernah dari body. */
  isAdmin: boolean;
}

/**
 * Review bukti kerja — RPC `review_submission`. Hanya Admin Marketiv (sama
 * dengan Function lama); non-admin → 403 dari RPC. Approve tidak memindah uang
 * (TODO(fase-08): credit_campaign_reward di dalam RPC).
 */
export function reviewSubmission(
  ctx: ReviewContext,
  submissionId: string,
  input: ReviewSubmissionInput,
): Promise<{ success: true; campaignId: string; status: "approved" | "rejected" }> {
  const notes = input.notes?.trim().slice(0, 1000);
  return callFlowRpc(ctx, "review_submission", {
    p_reviewer_id: ctx.userId,
    p_submission_id: submissionId,
    p_decision: input.status,
    p_note: notes ? notes : null,
    p_as_admin: ctx.isAdmin,
    p_views: input.status === "approved" ? input.views : null,
    p_observation_hours: observationHours(),
  });
}
