import "server-only";

import type { AdminSupabaseClient } from "@/lib/supabase/admin";

import { throwIfDbError } from "../http";
import { toAdminFileUrl } from "./file-url";

/**
 * Port `get-admin-ratecard-deliverable-queue`.
 *
 * Function lama melakukan 3 query PER deliverable (validasi, order, versi
 * terbaru). Di sini satu RPC `admin_ratecard_deliverable_queue` (0017) yang
 * menerapkan aturan yang sama di SQL. DTO identik dengan Function lama.
 */

const LIMIT = 100;

export interface RatecardDeliverableQueueItem {
  id: string;
  orderId: string;
  version: number;
  source: string;
  evidenceUrl: string;
  notes?: string;
  submittedAt: string;
  status: "pending";
  isLatest: true;
  creator: { id: string; name: string };
  umkm: { id: string; businessName: string };
  projectTitle: string;
  finalAmount: number;
}

/** Baris RPC `admin_ratecard_deliverable_queue` (0017). */
export interface RatecardDeliverableQueueRow {
  deliverable_id: string;
  order_id: string;
  version: number | null;
  source: string | null;
  file_url: string | null;
  notes: string | null;
  submitted_at: string | null;
  creator_id: string | null;
  creator_display_name: string | null;
  umkm_id: string | null;
  umkm_business_name: string | null;
  package_name_snapshot: string | null;
  amount: number | string | null;
}

// Tipe `Database` belum memuat RPC 0017 sampai `npm run db:types` dijalankan
// ulang; panggilan dipersempit ke bentuk yang dipakai di sini.
type QueueRpc = (
  fn: "admin_ratecard_deliverable_queue",
  args: { p_limit: number },
) => PromiseLike<{ data: RatecardDeliverableQueueRow[] | null; error: { code?: string; message?: string } | null }>;

export async function getAdminRatecardDeliverableQueue(
  db: AdminSupabaseClient,
): Promise<{ items: RatecardDeliverableQueueItem[]; total: number }> {
  const rpc = db.rpc.bind(db) as unknown as QueueRpc;
  const { data, error } = await rpc("admin_ratecard_deliverable_queue", { p_limit: LIMIT });
  throwIfDbError(error);
  const items = (data ?? []).map(toQueueItem);
  return { items, total: items.length };
}

export function toQueueItem(row: RatecardDeliverableQueueRow): RatecardDeliverableQueueItem {
  return {
    id: str(row.deliverable_id),
    orderId: str(row.order_id),
    version: Number(row.version) || 0,
    source: str(row.source),
    // URL file privat app user → route admin (same-origin); URL lain apa adanya.
    evidenceUrl: toAdminFileUrl(str(row.file_url)),
    notes: str(row.notes) || undefined,
    submittedAt: str(row.submitted_at),
    status: "pending",
    isLatest: true,
    creator: { id: str(row.creator_id), name: str(row.creator_display_name) || "Content Creator" },
    umkm: { id: str(row.umkm_id), businessName: str(row.umkm_business_name) || "UMKM" },
    projectTitle: str(row.package_name_snapshot) || "Rate Card Order",
    finalAmount: Number(row.amount) || 0,
  };
}

function str(value: unknown): string {
  return typeof value === "string" ? value : "";
}
