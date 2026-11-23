import { AdminFunctionExecutionError, callAdminApi } from "@/lib/api/call-api";
import { executeAdminFunction } from "@/lib/admin/execute-function";
import { FUNCTION_IDS } from "@/lib/admin/appwrite";
import {
  AdminWithdrawal,
  AdminWithdrawalQueue,
  FailWithdrawalPayload,
  MarkWithdrawalSucceededPayload,
  WithdrawalQueueStatus,
  WithdrawalStatus,
} from "../types";

const QUEUE_LIMIT = 100;
const MAX_QUEUE_OFFSET = 10000;

interface ReviewWithdrawalResponse {
  success: true;
  withdrawalId: string;
  status: "processing" | "succeeded" | "reversed";
}

export class AdminWithdrawalReadError extends Error {
  constructor(public readonly statusCode: number, message: string) {
    super(message);
    this.name = "AdminWithdrawalReadError";
  }
}

export type WithdrawalRefreshResult =
  | { status: "refreshed"; queue: AdminWithdrawalQueue }
  | { status: "failed"; error: AdminWithdrawalReadError };

export class AdminWithdrawalConflictError extends Error {
  readonly statusCode = 409;

  constructor(
    message: string,
    public readonly refresh: WithdrawalRefreshResult,
  ) {
    super(message);
    this.name = "AdminWithdrawalConflictError";
  }
}

export interface WithdrawalMutationResult {
  success: true;
  withdrawalId: string;
  status: ReviewWithdrawalResponse["status"];
  message: string;
  refresh: WithdrawalRefreshResult;
}

export async function getAdminWithdrawals(
  status: WithdrawalQueueStatus = "all",
): Promise<AdminWithdrawalQueue> {
  const items: AdminWithdrawal[] = [];
  let offset = 0;
  let total = 0;

  do {
    const page = await getAdminWithdrawalPage(status, offset);
    if (offset === 0) total = page.total;
    items.push(...page.items);
    if (items.length >= total) break;
    if (page.items.length === 0) {
      throw new AdminWithdrawalReadError(
        502,
        "Respons antrean penarikan tidak lengkap.",
      );
    }
    offset += page.items.length;
    if (offset > MAX_QUEUE_OFFSET) {
      throw new AdminWithdrawalReadError(
        422,
        "Antrean terlalu besar untuk dimuat. Gunakan filter status backend.",
      );
    }
  } while (items.length < total);

  return { items, total, limit: QUEUE_LIMIT, offset: 0 };
}

async function getAdminWithdrawalPage(
  status: WithdrawalQueueStatus,
  offset: number,
): Promise<AdminWithdrawalQueue> {
  try {
    return await callAdminApi(
      "getAdminWithdrawalQueue",
      { status, limit: QUEUE_LIMIT, offset },
      isAdminWithdrawalQueue,
      "Gagal memuat antrean penarikan.",
    );
  } catch (error) {
    if (error instanceof AdminFunctionExecutionError) {
      throw new AdminWithdrawalReadError(error.statusCode, error.message);
    }
    throw new AdminWithdrawalReadError(
      500,
      error instanceof Error ? error.message : "Gagal memuat antrean penarikan.",
    );
  }
}

export async function startWithdrawalProcessing(
  withdrawalIdRaw: string,
): Promise<WithdrawalMutationResult> {
  const withdrawalId = requireText(
    withdrawalIdRaw,
    "Withdrawal tidak valid.",
  );
  return reviewAndRefresh(
    { withdrawalId, action: "start_processing" },
    "processing",
  );
}

export async function markWithdrawalSucceeded(
  payload: MarkWithdrawalSucceededPayload,
): Promise<WithdrawalMutationResult> {
  const withdrawalId = requireText(payload.withdrawalId, "Withdrawal tidak valid.");
  const transferReference = requireText(
    payload.transferReference,
    "Referensi transfer wajib diisi.",
  );
  return reviewAndRefresh(
    withAdminNote({
      withdrawalId,
      action: "mark_succeeded",
      transferReference,
    }, payload.adminNote),
    "succeeded",
  );
}

export async function failWithdrawal(
  payload: FailWithdrawalPayload,
): Promise<WithdrawalMutationResult> {
  const withdrawalId = requireText(payload.withdrawalId, "Withdrawal tidak valid.");
  const failureReason = requireText(
    payload.failureReason,
    "Alasan kegagalan wajib diisi.",
  );
  return reviewAndRefresh(
    withAdminNote({
      withdrawalId,
      action: "fail",
      failureReason,
    }, payload.adminNote),
    "reversed",
  );
}

async function reviewAndRefresh(
  payload: Record<string, unknown>,
  expectedStatus: ReviewWithdrawalResponse["status"],
): Promise<WithdrawalMutationResult> {
  let response: ReviewWithdrawalResponse;
  try {
    // TODO(fase-08): tulis masih lewat Function Appwrite `review-withdrawal`;
    // pindah ke POST /api/admin/withdrawals/[id]/review (RPC transition_withdrawal).
    response = await executeAdminFunction(
      FUNCTION_IDS.reviewWithdrawal,
      payload,
      isReviewWithdrawalResponse,
      "Gagal memperbarui penarikan.",
    );
  } catch (error) {
    if (error instanceof AdminFunctionExecutionError && error.statusCode === 409) {
      throw new AdminWithdrawalConflictError(error.message, await refreshQueue());
    }
    throw error;
  }

  if (response.status !== expectedStatus) {
    throw new AdminFunctionExecutionError(
      502,
      "Status respons Function withdrawal tidak sesuai action.",
    );
  }

  return {
    success: true,
    withdrawalId: response.withdrawalId,
    status: response.status,
    message: mutationMessage(response.status),
    refresh: await refreshQueue(),
  };
}

async function refreshQueue(): Promise<WithdrawalRefreshResult> {
  try {
    return { status: "refreshed", queue: await getAdminWithdrawals("all") };
  } catch (error) {
    const readError = error instanceof AdminWithdrawalReadError
      ? error
      : new AdminWithdrawalReadError(
        500,
        "Status berubah, tetapi antrean terbaru gagal dimuat.",
      );
    return { status: "failed", error: readError };
  }
}

function withAdminNote(
  payload: Record<string, unknown>,
  adminNoteRaw?: string,
): Record<string, unknown> {
  const adminNote = adminNoteRaw?.trim();
  return adminNote ? { ...payload, adminNote } : payload;
}

function requireText(value: string, errorMessage: string): string {
  const normalized = value.trim();
  if (!normalized) throw new Error(errorMessage);
  return normalized;
}

function mutationMessage(status: ReviewWithdrawalResponse["status"]): string {
  if (status === "processing") return "Penarikan mulai diproses.";
  if (status === "succeeded") return "Penarikan ditandai berhasil.";
  return "Penarikan dibatalkan dan saldo dikembalikan.";
}

function isReviewWithdrawalResponse(
  value: unknown,
): value is ReviewWithdrawalResponse {
  if (!isRecord(value)) return false;
  return value.success === true
    && typeof value.withdrawalId === "string"
    && (value.status === "processing"
      || value.status === "succeeded"
      || value.status === "reversed");
}

function isAdminWithdrawalQueue(value: unknown): value is AdminWithdrawalQueue {
  if (!isRecord(value)) return false;
  return Array.isArray(value.items)
    && value.items.every(isAdminWithdrawal)
    && isNonNegativeInteger(value.total)
    && isNonNegativeInteger(value.limit)
    && isNonNegativeInteger(value.offset);
}

function isAdminWithdrawal(value: unknown): value is AdminWithdrawal {
  if (!isRecord(value) || !isRecord(value.creator)) return false;
  return typeof value.id === "string"
    && typeof value.userId === "string"
    && typeof value.creator.name === "string"
    && isNullableString(value.creator.username)
    && isNullableString(value.creator.avatarUrl)
    && typeof value.amount === "number"
    && Number.isFinite(value.amount)
    && value.amount >= 0
    && typeof value.payoutMethod === "string"
    && typeof value.providerName === "string"
    && typeof value.accountNumber === "string"
    && typeof value.accountName === "string"
    && isWithdrawalStatus(value.status)
    && isNullableString(value.requestedAt)
    && isNullableString(value.processingAt)
    && isNullableString(value.processedAt)
    && isNullableString(value.failureReason)
    && isNullableString(value.transferReference)
    && isNullableString(value.adminNote)
    && isNullableString(value.processedBy);
}

function isWithdrawalStatus(value: unknown): value is WithdrawalStatus {
  return value === "requested"
    || value === "processing"
    || value === "succeeded"
    || value === "failed"
    || value === "reversed";
}

function isNullableString(value: unknown): value is string | null {
  return value === null || typeof value === "string";
}

function isNonNegativeInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value >= 0;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object";
}
