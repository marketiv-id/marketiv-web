import "server-only";

import { z } from "zod";

import { CURRENT_TOS_VERSION } from "@/services/auth/tos.service";
import { HttpError, parseBody, throwIfDbError, type DbErrorLike } from "@/server/http";
import { rpcErrorToHttp, type WriteDb } from "@/server/conversations/write-rpc";

/**
 * Port `request-withdrawal` (Fase 8). Semua aturan uang ada di RPC
 * `request_withdrawal` (0028): withdrawal `requested` + ledger debit pending
 * dalam satu transaksi, idempoten per (user, requestKey), saldo lewat
 * `private.post_ledger`. Route hanya memvalidasi bentuk body dan meneruskan
 * kebijakan dari env (nilai default = Function lama).
 */

export const requestWithdrawalSchema = z.object({
  amount: z.number({ error: "Jumlah penarikan tidak valid" }).int("Jumlah penarikan tidak valid").positive("Jumlah penarikan tidak valid"),
  payoutMethod: z.enum(["bank", "ewallet"], { error: "Metode penarikan tidak valid" }),
  providerName: z.string({ error: "Lengkapi data penarikan" }).trim().min(1, "Lengkapi data penarikan").max(100, "Nama bank/e-wallet terlalu panjang"),
  accountNumber: z.string({ error: "Lengkapi data penarikan" }).trim().regex(/^\d{6,20}$/, "Nomor rekening tidak valid"),
  accountName: z.string({ error: "Lengkapi data penarikan" }).trim().min(1, "Lengkapi data penarikan").max(255, "Nama pemilik rekening terlalu panjang"),
  requestKey: z.string({ error: "requestKey wajib diisi" }).regex(/^[A-Za-z0-9-]{8,64}$/, "requestKey wajib diisi"),
  sourceOrigin: z.enum(["umkm_refund", "umkm_budget"]).optional(),
});

export type RequestWithdrawalInput = z.infer<typeof requestWithdrawalSchema>;

export interface WithdrawalReceipt {
  withdrawalId: string;
  amount: number;
  status: "requested";
  requestedAt: string;
  balanceAfter: number;
  transactionId: string | null;
}

export interface WithdrawalPolicy {
  minimum: number;
  advancedGuards: boolean;
  kycThreshold: number;
  perDayLimit: number;
  coolingDays: number;
}

const int = (raw: string | undefined, fallback: number): number => {
  const parsed = Number(raw);
  return Number.isFinite(parsed) && parsed >= 0 ? Math.floor(parsed) : fallback;
};

/** Env yang sama dengan Function lama; default identik. */
export function withdrawalPolicyFromEnv(env: NodeJS.ProcessEnv = process.env): WithdrawalPolicy {
  return {
    minimum: int(env.MINIMUM_WITHDRAW, 50000),
    advancedGuards: String(env.WITHDRAWAL_ADVANCED_GUARDS_ENABLED ?? "").trim().toLowerCase() === "true",
    kycThreshold: int(env.KYC_THRESHOLD, 5000000),
    perDayLimit: int(env.WITHDRAW_PER_DAY_LIMIT, 3),
    coolingDays: int(env.WITHDRAW_COOLING_DAYS, 3),
  };
}

export function parseRequestWithdrawalBody(body: unknown): RequestWithdrawalInput {
  return parseBody(requestWithdrawalSchema, body, "Lengkapi data penarikan");
}

function mapError(error: DbErrorLike & { hint?: string | null }): never {
  if (error.code === "P0001" && error.hint === "rate_limited") {
    throw new HttpError(429, error.message || "Terlalu banyak permintaan penarikan.", "validation");
  }
  const mapped = rpcErrorToHttp(error);
  if (mapped) throw mapped;
  throwIfDbError(error);
  throw new HttpError(500, "Terjadi kesalahan di server. Coba lagi.", "server");
}

export async function requestWithdrawal(
  ctx: { db: WriteDb; userId: string },
  input: RequestWithdrawalInput,
  policy: WithdrawalPolicy = withdrawalPolicyFromEnv(),
  tosVersion: string = CURRENT_TOS_VERSION,
): Promise<WithdrawalReceipt> {
  const { data, error } = await ctx.db.rpc("request_withdrawal" as never, {
    p_user_id: ctx.userId,
    p_request_key: input.requestKey,
    p_amount: input.amount,
    p_payout_method: input.payoutMethod,
    p_provider_name: input.providerName,
    p_account_number: input.accountNumber,
    p_account_name: input.accountName,
    p_tos_version: tosVersion,
    p_source_origin: input.sourceOrigin ?? null,
    p_minimum: policy.minimum,
    p_advanced_guards: policy.advancedGuards,
    p_kyc_threshold: policy.kycThreshold,
    p_per_day_limit: policy.perDayLimit,
    p_cooling_days: policy.coolingDays,
  } as never);
  if (error) mapError(error as DbErrorLike & { hint?: string | null });
  const row = (data ?? {}) as Record<string, unknown>;
  return {
    withdrawalId: String(row.withdrawalId ?? ""),
    amount: Number(row.amount ?? input.amount),
    status: "requested",
    requestedAt: String(row.requestedAt ?? ""),
    balanceAfter: Number(row.balanceAfter ?? 0),
    transactionId: typeof row.transactionId === "string" ? row.transactionId : null,
  };
}
