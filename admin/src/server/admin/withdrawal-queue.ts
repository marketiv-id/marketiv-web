import "server-only";

import type { AdminSupabaseClient } from "@/lib/supabase/admin";

import { HttpError, throwIfDbError } from "../http";

/**
 * Port `get-admin-withdrawal-queue`. DTO identik (validator
 * `isAdminWithdrawalQueue` di `withdrawal.service.ts`).
 *
 * `creator.username` selalu null: `creator_profiles` tidak punya
 * username/tiktokHandle (di Function lama hanya fallback).
 * Round-trip konstan: withdrawals → creator_profiles (`.in`).
 */

const STATUSES = ["requested", "processing", "succeeded", "failed", "reversed"] as const;
type WithdrawalStatus = (typeof STATUSES)[number];
export type WithdrawalQueueStatus = WithdrawalStatus | "all";
const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 100;
const MAX_OFFSET = 10000;

export interface WithdrawalQueueInput {
  status?: string;
  limit?: number;
  offset?: number;
}

export interface WithdrawalQueueItem {
  id: string;
  userId: string;
  creator: { name: string; username: string | null; avatarUrl: string | null };
  amount: number;
  payoutMethod: string;
  providerName: string;
  accountNumber: string;
  accountName: string;
  status: WithdrawalStatus;
  requestedAt: string | null;
  processingAt: string | null;
  processedAt: string | null;
  failureReason: string | null;
  transferReference: string | null;
  adminNote: string | null;
  processedBy: string | null;
}

export interface WithdrawalQueue {
  items: WithdrawalQueueItem[];
  total: number;
  limit: number;
  offset: number;
}

export function parseWithdrawalQueueInput(input: WithdrawalQueueInput): {
  status: WithdrawalQueueStatus;
  limit: number;
  offset: number;
} {
  const status = input.status ?? "requested";
  const limit = input.limit ?? DEFAULT_LIMIT;
  const offset = input.offset ?? 0;
  if (status !== "all" && !(STATUSES as readonly string[]).includes(status)) {
    throw new HttpError(400, "Status withdrawal tidak valid.");
  }
  if (!Number.isInteger(limit) || limit < 1 || limit > MAX_LIMIT) {
    throw new HttpError(400, `Limit harus antara 1 dan ${MAX_LIMIT}.`);
  }
  if (!Number.isInteger(offset) || offset < 0 || offset > MAX_OFFSET) {
    throw new HttpError(400, `Offset harus antara 0 dan ${MAX_OFFSET}.`);
  }
  return { status: status as WithdrawalQueueStatus, limit, offset };
}

export async function getAdminWithdrawalQueue(
  db: AdminSupabaseClient,
  input: WithdrawalQueueInput,
): Promise<WithdrawalQueue> {
  const { status, limit, offset } = parseWithdrawalQueueInput(input);

  let query = db
    .from("withdrawals")
    .select(
      "id, user_id, amount, payout_method, provider_name, account_number, account_name, status, created_at, processing_at, processed_at, failure_reason, transfer_reference, admin_note, processed_by",
      { count: "exact" },
    )
    .order("created_at", { ascending: false })
    .order("id", { ascending: false })
    .range(offset, offset + limit - 1);
  if (status !== "all") query = query.eq("status", status);
  const { data, error, count } = await query;
  throwIfDbError(error);
  const rows = data ?? [];

  const creatorIds = [...new Set(rows.map((row) => row.user_id).filter(Boolean))].slice(0, MAX_LIMIT);
  const creatorResult = creatorIds.length
    ? await db.from("creator_profiles").select("user_id, display_name, avatar_url").in("user_id", creatorIds)
    : { data: [], error: null };
  throwIfDbError(creatorResult.error);
  const creators = new Map((creatorResult.data ?? []).map((row) => [row.user_id, row]));

  const items = rows.map((withdrawal): WithdrawalQueueItem => {
    const creator = creators.get(withdrawal.user_id);
    return {
      id: str(withdrawal.id),
      userId: str(withdrawal.user_id),
      creator: {
        name: nullableString(creator?.display_name) || "Content Creator",
        username: null,
        avatarUrl: nullableString(creator?.avatar_url),
      },
      amount: Number(withdrawal.amount) || 0,
      payoutMethod: str(withdrawal.payout_method),
      providerName: str(withdrawal.provider_name),
      accountNumber: str(withdrawal.account_number),
      accountName: str(withdrawal.account_name),
      status: (STATUSES as readonly string[]).includes(withdrawal.status)
        ? (withdrawal.status as WithdrawalStatus)
        : "requested",
      requestedAt: nullableString(withdrawal.created_at),
      processingAt: nullableString(withdrawal.processing_at),
      processedAt: nullableString(withdrawal.processed_at),
      failureReason: nullableString(withdrawal.failure_reason),
      transferReference: nullableString(withdrawal.transfer_reference),
      adminNote: nullableString(withdrawal.admin_note),
      processedBy: nullableString(withdrawal.processed_by),
    };
  });

  return { items, total: count ?? 0, limit, offset };
}

function str(value: unknown): string {
  return typeof value === "string" ? value : "";
}
function nullableString(value: unknown): string | null {
  return str(value) || null;
}
