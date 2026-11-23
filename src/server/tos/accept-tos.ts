import "server-only";

import { z } from "zod";

import type { AdminSupabaseClient } from "@/lib/supabase/admin";
import { CURRENT_TOS_VERSION, type TosAcceptResult, type TosStatus } from "@/services/auth/tos.service";
import { callWriteRpc } from "@/server/conversations/write-rpc";
import { HttpError, parseBody, throwIfDbError } from "@/server/http";

/**
 * POST /api/tos — pengganti Function `accept-tos`.
 *
 *   { action: "status" }                     → TosStatus
 *   { action?: "accept", tos_version: "…" }  → TosAcceptResult (idempoten)
 *
 * Versi aktif = `CURRENT_TOS_VERSION` dari tos.service (satu sumber dengan
 * status yang dibaca browser).
 */

const bodySchema = z.object({
  action: z.enum(["status", "accept"], { error: "Action tidak didukung." }).default("accept"),
  tos_version: z.string().trim().max(50, "tos_version tidak valid.").optional(),
});

type TosDb = Pick<AdminSupabaseClient, "from" | "rpc">;

export async function handleTos(
  ctx: { db: TosDb; userId: string },
  body: unknown,
): Promise<TosStatus | TosAcceptResult> {
  const { action, tos_version } = parseBody(bodySchema, body, "Permintaan tidak valid.");

  if (action === "status") {
    const { data, error } = await ctx.db
      .from("users")
      .select("tos_version, tos_accepted_at")
      .eq("id", ctx.userId)
      .maybeSingle();
    throwIfDbError(error);
    if (!data) throw new HttpError(404, "Profil pengguna tidak ditemukan.");
    const acceptedVersion = data.tos_version || null;
    const acceptedAt = data.tos_accepted_at || null;
    return {
      currentVersion: CURRENT_TOS_VERSION,
      acceptedVersion,
      acceptedAt,
      needsConsent: acceptedVersion !== CURRENT_TOS_VERSION || !acceptedAt,
    };
  }

  if (!tos_version) throw new HttpError(400, "tos_version wajib diisi.");
  if (tos_version !== CURRENT_TOS_VERSION) {
    throw new HttpError(400, "Versi T&C tidak sesuai dengan versi aktif.");
  }
  return callWriteRpc<TosAcceptResult>(ctx.db, "accept_tos", {
    p_user_id: ctx.userId,
    p_version: tos_version,
  });
}
