import "server-only";

import type { AdminSupabaseClient } from "@/lib/supabase/admin";

import { HttpError } from "../http";
import { throwIfRpcError } from "../rpc-error";

/**
 * Port `review-ratecard-deliverable`: Admin memutus deliverable Rate Card
 * `valid` / `invalid`. Semua aturan (versi terbaru, status order, satu
 * keputusan final per deliverable, notifikasi) ada di RPC
 * `review_ratecard_deliverable` (0024) dalam satu transaksi dengan row lock.
 *
 * Tidak ada efek uang di sini. Escrow cair saat UMKM approve (`approve_deliverable`
 * → `release_escrow`, 0026); bila approve datang lebih dulu, job
 * `reconcile-release-escrow` (tiap 15 menit) mencairkannya setelah validasi ini.
 */

export type DeliverableDecision = "valid" | "invalid";

export interface ReviewDeliverableInput {
  decision: DeliverableDecision;
  notes: string;
}

export interface ReviewDeliverableResult {
  success: true;
  deliverableId: string;
  decision: DeliverableDecision;
  reviewedAt: string;
}

export function parseReviewDeliverableBody(body: unknown): ReviewDeliverableInput {
  const input = (body && typeof body === "object" ? body : {}) as Record<string, unknown>;
  const decision = input.decision;
  const notes = typeof input.notes === "string" ? input.notes.trim().slice(0, 2000) : "";
  if (decision !== "valid" && decision !== "invalid") throw new HttpError(400, "Input review tidak valid.");
  if (decision === "invalid" && !notes) throw new HttpError(400, "Catatan wajib untuk keputusan invalid.");
  return { decision, notes };
}

type ReviewRpc = (
  fn: "review_ratecard_deliverable",
  args: { p_admin_id: string; p_deliverable_id: string; p_decision: string; p_notes: string | null },
) => PromiseLike<{ data: unknown; error: { code?: string; message?: string } | null }>;

export async function reviewRatecardDeliverable(
  db: AdminSupabaseClient,
  adminId: string,
  deliverableId: string,
  input: ReviewDeliverableInput,
): Promise<ReviewDeliverableResult> {
  if (!deliverableId || deliverableId.length > 255) throw new HttpError(400, "Input review tidak valid.");
  const rpc = db.rpc.bind(db) as unknown as ReviewRpc;
  const { data, error } = await rpc("review_ratecard_deliverable", {
    p_admin_id: adminId,
    p_deliverable_id: deliverableId,
    p_decision: input.decision,
    p_notes: input.notes || null,
  });
  throwIfRpcError(error);
  const row = (data && typeof data === "object" ? data : {}) as Record<string, unknown>;
  return {
    success: true,
    deliverableId,
    decision: row.decision === "invalid" ? "invalid" : row.decision === "valid" ? "valid" : input.decision,
    reviewedAt: typeof row.reviewedAt === "string" ? row.reviewedAt : new Date().toISOString(),
  };
}
