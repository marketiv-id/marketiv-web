import "server-only";

import type { AdminSupabaseClient } from "@/lib/supabase/admin";
import { callWriteRpc } from "@/server/conversations/write-rpc";
import { HttpError } from "@/server/http";

/**
 * Konteks alur campaign (Fase 7): client service role + userId sesi.
 * Semua RPC 0022_campaign_flow.sql dipanggil lewat `callWriteRpc` (peta error
 * P0002→404, 42501→403, 22023→400, P0001→409; pesan Indonesia diteruskan).
 */
export interface FlowContext {
  db: Pick<AdminSupabaseClient, "rpc" | "from">;
  userId: string;
}

export const callFlowRpc = <T>(ctx: FlowContext, name: string, args: Record<string, unknown>): Promise<T> =>
  callWriteRpc<T>(ctx.db, name, args);

/** Segmen ID di path / query: teks 1–255 karakter. */
export function flowId(value: string | null | undefined, label: string): string {
  const id = (value ?? "").trim();
  if (!id || id.length > 255) throw new HttpError(400, `${label} tidak valid.`);
  return id;
}
