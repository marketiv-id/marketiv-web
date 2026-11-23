import "server-only";

import type { AdminSupabaseClient } from "@/lib/supabase/admin";

import { HttpError } from "../http";
import { throwIfRpcError } from "../rpc-error";

/**
 * Port `review-withdrawal` (Fase 8). Transisi + ledger + audit ada di RPC
 * `transition_withdrawal` (0028) dalam satu transaksi dengan row lock:
 *   start_processing : requested  → processing
 *   mark_succeeded   : processing → succeeded (wajib transferReference)
 *   fail             : requested|processing → reversed (wajib failureReason;
 *                      saldo dikredit balik lewat ledger withdrawal_reversal)
 * Transisi tidak valid → 409.
 */

export type WithdrawalAction = "start_processing" | "mark_succeeded" | "fail";

export interface ReviewWithdrawalInput {
  action: WithdrawalAction;
  transferReference: string | null;
  failureReason: string | null;
  adminNote: string | null;
}

const ACTIONS = new Set<WithdrawalAction>(["start_processing", "mark_succeeded", "fail"]);

const text = (value: unknown, max: number): string | null => {
  if (typeof value !== "string") return null;
  const trimmed = value.trim().slice(0, max);
  return trimmed || null;
};

export function parseReviewWithdrawalBody(body: unknown): ReviewWithdrawalInput {
  const input = (body && typeof body === "object" ? body : {}) as Record<string, unknown>;
  const action = input.action as WithdrawalAction;
  if (!ACTIONS.has(action)) throw new HttpError(400, "Action withdrawal tidak valid.");
  const transferReference = text(input.transferReference, 255);
  const failureReason = text(input.failureReason, 500);
  if (action === "mark_succeeded" && !transferReference) throw new HttpError(400, "Referensi transfer wajib diisi.");
  if (action === "fail" && !failureReason) throw new HttpError(400, "Alasan kegagalan wajib diisi.");
  return { action, transferReference, failureReason, adminNote: text(input.adminNote, 1000) };
}

export interface ReviewWithdrawalResult {
  success: true;
  withdrawalId: string;
  status: "processing" | "succeeded" | "reversed";
}

export async function reviewWithdrawal(
  db: AdminSupabaseClient,
  adminId: string,
  withdrawalId: string,
  input: ReviewWithdrawalInput,
): Promise<ReviewWithdrawalResult> {
  if (!withdrawalId || withdrawalId.length > 255) throw new HttpError(400, "Withdrawal tidak valid.");
  const { data, error } = await db.rpc("transition_withdrawal" as never, {
    p_admin_id: adminId,
    p_withdrawal_id: withdrawalId,
    p_action: input.action,
    p_transfer_reference: input.transferReference,
    p_failure_reason: input.failureReason,
    p_admin_note: input.adminNote,
  } as never);
  throwIfRpcError(error);
  const row = (data && typeof data === "object" ? data : {}) as Record<string, unknown>;
  const status = row.status;
  if (status !== "processing" && status !== "succeeded" && status !== "reversed") {
    throw new HttpError(500, "Respons transisi withdrawal tidak valid.", "server");
  }
  return { success: true, withdrawalId, status };
}
