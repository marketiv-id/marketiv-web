import "server-only";

import type { AdminSupabaseClient } from "@/lib/supabase/admin";

import { HttpError } from "../http";
import { throwIfRpcError } from "../rpc-error";

/**
 * Port `suspend-user`, `unsuspend-user`, `verify-kyc`, `review-appeal` (Fase 8).
 * Aturan + notifikasi + audit `admin_actions` ada di RPC 0028, satu transaksi.
 *
 * Sesi Supabase user yang ditangguhkan TIDAK dicabut (sama dengan perilaku
 * lama): user tetap bisa login untuk melihat status dan mengajukan banding,
 * sementara semua Route Handler tulis menolak akun non-aktif lewat
 * `requireUser` (403).
 */

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function assertUserId(userId: string): string {
  if (!UUID.test(userId ?? "")) throw new HttpError(400, "userId tidak valid.");
  return userId;
}

const obj = (body: unknown): Record<string, unknown> =>
  (body && typeof body === "object" ? body : {}) as Record<string, unknown>;
const text = (value: unknown, max: number): string => (typeof value === "string" ? value.trim().slice(0, max) : "");

type Rpc = (fn: string, args: Record<string, unknown>) => PromiseLike<{ data: unknown; error: { code?: string; message?: string } | null }>;

async function call<T>(db: AdminSupabaseClient, fn: string, args: Record<string, unknown>): Promise<T> {
  const rpc = db.rpc.bind(db) as unknown as Rpc;
  const { data, error } = await rpc(fn, args);
  throwIfRpcError(error);
  return (data ?? {}) as T;
}

export interface SuspendInput {
  status: "suspended" | "terminated";
  reason: string;
}

export function parseSuspendBody(body: unknown): SuspendInput {
  const input = obj(body);
  const status = input.status ?? "suspended";
  if (status !== "suspended" && status !== "terminated") throw new HttpError(400, "Invalid status");
  const reason = text(input.reason, 500);
  if (!reason) throw new HttpError(400, "Alasan wajib diisi.");
  return { status, reason };
}

export function suspendUser(db: AdminSupabaseClient, adminId: string, userId: string, input: SuspendInput) {
  return call<{ status: string; deadlineAt: string; notificationId: string }>(db, "admin_suspend_user", {
    p_admin_id: adminId,
    p_user_id: assertUserId(userId),
    p_status: input.status,
    p_reason: input.reason,
  });
}

export function unsuspendUser(db: AdminSupabaseClient, adminId: string, userId: string, body: unknown) {
  const note = text(obj(body).note, 500);
  return call<{ status: string; notificationId: string }>(db, "admin_unsuspend_user", {
    p_admin_id: adminId,
    p_user_id: assertUserId(userId),
    p_note: note || null,
  });
}

export function verifyKyc(db: AdminSupabaseClient, adminId: string, userId: string) {
  return call<{ status: string; userId: string; kyc_status: string; alreadyVerified: boolean }>(db, "admin_verify_kyc", {
    p_admin_id: adminId,
    p_user_id: assertUserId(userId),
  });
}

export interface AppealReviewInput {
  decision: "approved" | "rejected";
  note: string | null;
}

export function parseAppealReviewBody(body: unknown): AppealReviewInput {
  const input = obj(body);
  const decision = input.decision;
  if (decision !== "approved" && decision !== "rejected") throw new HttpError(400, "Invalid decision");
  return { decision, note: text(input.note, 1000) || null };
}

export function reviewAppeal(db: AdminSupabaseClient, adminId: string, appealId: string, input: AppealReviewInput) {
  if (!appealId || appealId.length > 255) throw new HttpError(400, "appealId tidak valid.");
  return call<{ status: string; notificationId: string }>(db, "admin_review_appeal", {
    p_admin_id: adminId,
    p_appeal_id: appealId,
    p_decision: input.decision,
    p_note: input.note,
  });
}
