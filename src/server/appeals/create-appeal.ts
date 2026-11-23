import "server-only";

import { z } from "zod";

import { callWriteRpc, type WriteDb } from "@/server/conversations/write-rpc";
import { parseBody } from "@/server/http";

/**
 * POST /api/appeals — pengganti Function `create-appeal`.
 * Body `{ reason, evidence?, actionRef? }`. Aturan (akun nonaktif, ≤ 14 hari
 * sejak suspend, satu banding terbuka) ditegakkan RPC `create_appeal`.
 */
export const appealSchema = z.object({
  reason: z
    .string({ error: "Alasan banding wajib diisi." })
    .trim()
    .min(1, "Alasan banding wajib diisi.")
    .max(1000, "Alasan banding maksimal 1000 karakter."),
  evidence: z.string().trim().max(2048, "Bukti maksimal 2048 karakter.").optional(),
  actionRef: z.string().trim().max(255, "Referensi tindakan tidak valid.").optional(),
});

export interface AppealResult {
  appealId: string;
  status: "submitted";
  slaDecidedAt: string;
  notificationId: string;
}

export async function createAppeal(ctx: { db: WriteDb; userId: string }, body: unknown): Promise<AppealResult> {
  const input = parseBody(appealSchema, body, "Data banding tidak valid.");
  return callWriteRpc<AppealResult>(ctx.db, "create_appeal", {
    p_user_id: ctx.userId,
    p_reason: input.reason,
    p_evidence: input.evidence || null,
    p_action_ref: input.actionRef || null,
  });
}
