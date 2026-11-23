import "server-only";

import { z } from "zod";

import { externalDeliverableUrl } from "@/lib/validations/deliverable.schema";
import type { Deliverable, Revision } from "@/types/umkm-dashboard.types";
import { callWriteRpc, type WriteDb } from "@/server/conversations/write-rpc";
import { HttpError, parseBody } from "@/server/http";

/**
 * Order rate card — pengganti `cancel-order`, `submit-ratecard-deliverable`
 * (+ `track-order-review`, `notify-order-activity`), `request-ratecard-revision`
 * (+ `sync-order-revision`), dan approve deliverable dari browser.
 *
 * Event trigger Appwrite diganti pemanggilan eksplisit: semuanya terjadi di
 * satu RPC 0023 (row lock order) sehingga urutannya jelas dan bisa dites.
 *
 * UANG (Fase 8): approve memanggil `release_escrow` di dalam RPC yang sama
 * (0026) — dana cair bila validasi Admin `valid` sudah ada.
 */

export interface OrderWriteContext {
  db: WriteDb;
  userId: string;
}

const idSchema = z.string().trim().min(1).max(255);

function routeId(raw: string, notFound: string): string {
  const parsed = idSchema.safeParse(raw);
  if (!parsed.success) throw new HttpError(404, notFound);
  return parsed.data;
}

type Row = Record<string, unknown>;
const str = (v: unknown): string => (typeof v === "string" ? v : "");

/** Baris `deliverables` → DTO `Deliverable` (bentuk sama dengan Function lama). */
export function mapDeliverableRow(row: Row): Deliverable {
  const fileId = str(row.file_id);
  const notes = str(row.notes);
  return {
    id: str(row.id),
    orderId: str(row.order_id),
    source: (str(row.source) || "external_url") as Deliverable["source"],
    fileUrl: str(row.file_url),
    ...(fileId ? { fileId } : {}),
    ...(notes ? { notes } : {}),
    version: typeof row.version === "number" ? row.version : 0,
    status: (str(row.status) || "submitted") as Deliverable["status"],
    createdAt: str(row.created_at),
  };
}

/** Baris `revisions` → DTO `Revision`. */
export function mapRevisionRow(row: Row): Revision {
  return {
    id: str(row.id),
    orderId: str(row.order_id),
    requestedBy: str(row.requested_by),
    message: str(row.message),
    status: (str(row.status) || "open") as Revision["status"],
    createdAt: str(row.created_at),
  };
}

/** POST /api/orders/[orderId]/cancel — UMKM, hanya `pending_payment`. */
export async function cancelOrder(
  ctx: OrderWriteContext,
  rawOrderId: string,
): Promise<{ ok: true; status: string }> {
  const orderId = routeId(rawOrderId, "Order tidak ditemukan");
  // Status pending_payment belum memindahkan uang. Payment pending yang
  // menyertai dibatalkan lewat cancel-payment. TODO(fase-08): cancel_payment.
  return callWriteRpc(ctx.db, "cancel_order", { p_order_id: orderId, p_umkm_id: ctx.userId });
}

const MAX_FILE_URL = 2048;
const MAX_NOTES = 2000;

const deliverableBodySchema = z
  .object({
    source: z.enum(["external_url", "storage"], { error: "Sumber deliverable tidak valid." }),
    fileUrl: z.string().trim().max(MAX_FILE_URL, `Link deliverable maksimal ${MAX_FILE_URL} karakter.`).optional(),
    fileId: z.string().trim().max(255).optional(),
    notes: z
      .string({ error: "Catatan tidak valid." })
      .max(MAX_NOTES, `Catatan maksimal ${MAX_NOTES} karakter.`)
      .optional(),
  })
  .superRefine((value, ctx) => {
    if (value.source === "external_url") {
      const result = externalDeliverableUrl.safeParse(value.fileUrl ?? "");
      if (!result.success) {
        ctx.addIssue({
          code: "custom",
          path: ["fileUrl"],
          message: result.error.issues[0]?.message ?? "Link deliverable tidak valid.",
        });
      }
      return;
    }
    if (!value.fileId) {
      ctx.addIssue({ code: "custom", path: ["fileId"], message: "Berkas belum terunggah." });
    }
  });

/** URL stabil file privat: route memeriksa hak akses lalu redirect ke signed URL. */
export const privateFileUrl = (fileId: string): string =>
  `/api/files/${encodeURIComponent(fileId)}/url?redirect=1`;

/**
 * POST /api/orders/[orderId]/deliverables — kreator pengerja.
 * `source: "storage"`: `fileId` = baris user_files milik kreator; file_url
 * disimpan sebagai route stabil (bukan URL dari klien).
 */
export async function submitDeliverable(
  ctx: OrderWriteContext,
  rawOrderId: string,
  body: unknown,
): Promise<Deliverable> {
  const orderId = routeId(rawOrderId, "Pesanan tidak ditemukan.");
  const input = parseBody(deliverableBodySchema, body, "Data deliverable tidak valid.");
  const isStorage = input.source === "storage";
  const row = await callWriteRpc<Row | null>(ctx.db, "submit_deliverable", {
    p_order_id: orderId,
    p_creator_id: ctx.userId,
    p_source: input.source,
    p_file_url: isStorage ? privateFileUrl(input.fileId ?? "") : (input.fileUrl ?? ""),
    p_file_id: isStorage ? input.fileId : null,
    p_notes: input.notes?.trim() || null,
  });
  if (!row) throw new HttpError(500, "Deliverable gagal dikirim.", "server");
  return mapDeliverableRow(row);
}

const revisionBodySchema = z.object({
  message: z
    .string({ error: "Alasan revisi wajib diisi." })
    .trim()
    .min(1, "Alasan revisi wajib diisi.")
    .max(2000, "Alasan revisi maksimal 2000 karakter."),
});

/** POST /api/orders/[orderId]/revisions — UMKM pemilik order. */
export async function requestRevision(
  ctx: OrderWriteContext,
  rawOrderId: string,
  body: unknown,
): Promise<Revision> {
  const orderId = routeId(rawOrderId, "Pesanan tidak ditemukan.");
  const { message } = parseBody(revisionBodySchema, body, "Alasan revisi tidak valid.");
  const row = await callWriteRpc<Row | null>(ctx.db, "request_revision", {
    p_order_id: orderId,
    p_umkm_id: ctx.userId,
    p_message: message,
  });
  if (!row) throw new HttpError(500, "Permintaan revisi gagal.", "server");
  return mapRevisionRow(row);
}

const approveBodySchema = z.object({
  orderId: z.string().trim().min(1).max(255).optional(),
});

/**
 * POST /api/deliverables/[deliverableId]/approve — UMKM pemilik order.
 * Menandai deliverable `approved` lalu `release_escrow` (0026): bila validasi
 * Admin `valid` sudah ada, dana cair ke wallet kreator dan order `completed`
 * dalam transaksi yang sama; bila belum, `release` = `not_releasable` dan job
 * `reconcile-release-escrow` mencoba lagi setelah validasi masuk.
 */
export async function approveDeliverable(
  ctx: OrderWriteContext,
  rawDeliverableId: string,
  body: unknown,
): Promise<{
  ok: true;
  deliverableId: string;
  orderId: string;
  status: "approved";
  /** Hasil `release_escrow`: `released`, `already_released`, atau `not_releasable`. */
  release: string;
}> {
  const deliverableId = routeId(rawDeliverableId, "Deliverable tidak ditemukan.");
  const { orderId } = parseBody(approveBodySchema, body ?? {}, "Data tidak valid.");
  return callWriteRpc(ctx.db, "approve_deliverable", {
    p_deliverable_id: deliverableId,
    p_umkm_id: ctx.userId,
    p_order_id: orderId ?? null,
  });
}
