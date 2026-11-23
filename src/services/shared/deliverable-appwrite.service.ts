import { callApi } from "@/lib/api/call-api";
import { createClient } from "@/lib/supabase/client";
import { rowToDoc, rowsToDocs } from "@/services/shared/legacy-doc";
import type { ServiceResult } from "@/types/domain";
import type {
  Deliverable,
  DeliverableStatus,
  DeliverableSource,
  Revision,
  RevisionStatus,
} from "@/types/umkm-dashboard.types";
import {
  uploadDeliverableSchema,
  requestRevisionSchema,
  type UploadDeliverableInput,
  type RequestRevisionInput,
} from "@/lib/validations/deliverable.schema";
import {
  type Doc,
  str,
  num,
  ok,
  fail,
  failValidation,
  failFromError,
  failFromWriteError,
  requireUserId,
} from "@/services/shared/service-result";

/**
 * Deliverable & revisi — dipakai dashboard UMKM maupun Kreator.
 *
 * Ditaruh di `shared/` karena aturan yang paling mudah salah di sini identik
 * untuk kedua peran: nomor versi, permission baris, dan siapa boleh apa.
 * Menyalinnya ke dua service domain akan mengulang kesalahan yang sama dua kali.
 *
 * Mirror 00_BACKEND/src/services/order.service.ts:195-360.
 *
 * ⚠️ JALUR UANG. Menyetujui deliverable akan mencairkan escrow ke wallet
 * kreator (Fase 8). Browser TIDAK punya hak tulis apa pun ke `deliverables`,
 * `revisions`, atau `orders` (RLS SELECT-only); semua tulis lewat Route
 * Handler + RPC 0023 yang memeriksa peran & kepemilikan di server:
 *
 * - kirim deliverable  → `POST /api/orders/[orderId]/deliverables` (kreator)
 * - minta revisi       → `POST /api/orders/[orderId]/revisions` (UMKM)
 * - setujui deliverable→ `POST /api/deliverables/[id]/approve` (UMKM; STUB
 *   status sampai Fase 8 — TODO(fase-08): release_escrow)
 *
 * BACA (riwayat deliverable & revisi) lewat supabase-js + RLS
 * (`private.is_order_party`).
 */

const ORDERS = "orders";
const DELIVERABLES = "deliverables";
const REVISIONS = "revisions";

const mapDeliverable = (d: Doc): Deliverable => ({
  id: str(d.$id),
  orderId: str(d.orderId),
  source: (str(d.source) || "external_url") as DeliverableSource,
  fileUrl: str(d.fileUrl),
  fileId: str(d.fileId) || undefined,
  notes: str(d.notes) || undefined,
  version: num(d.version),
  status: (str(d.status) || "submitted") as DeliverableStatus,
  createdAt: str(d.createdAt) || str(d.$createdAt),
});

const mapRevision = (d: Doc): Revision => ({
  id: str(d.$id),
  orderId: str(d.orderId),
  requestedBy: str(d.requestedBy),
  message: str(d.message),
  status: (str(d.status) || "open") as RevisionStatus,
  createdAt: str(d.$createdAt),
});

/**
 * Peserta order (Supabase) — null bila bukan peserta / tidak terbaca RLS.
 * Cek peserta eksplisit tetap dipasang, sama dengan versi Appwrite.
 */
async function loadOrderParticipationFromSupabase(orderId: string, userId: string) {
  const { data, error } = await createClient()
    .from(ORDERS)
    .select("id, umkm_id, creator_id, status")
    .eq("id", orderId)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  const order = rowToDoc(ORDERS, data);
  const umkmId = str(order.umkmId);
  const creatorId = str(order.creatorId);
  if (umkmId !== userId && creatorId !== userId) return null;
  return { order, umkmId, creatorId, status: str(order.status) };
}

/** Riwayat deliverable satu order, versi menaik. */
export async function getDeliverablesInAppwrite(
  orderId: string
): Promise<ServiceResult<Deliverable[]>> {
  const auth = await requireUserId<Deliverable[]>([]);
  if (!auth.ok) return auth.result;
  try {
    const participation = await loadOrderParticipationFromSupabase(orderId, auth.userId);
    if (!participation) return fail("Pesanan tidak ditemukan.", "not_found", []);

    const { data, error } = await createClient()
      .from(DELIVERABLES)
      .select("*")
      .eq("order_id", orderId)
      .order("version", { ascending: true })
      .limit(50);
    if (error) throw error;
    return ok(rowsToDocs(DELIVERABLES, data).map(mapDeliverable));
  } catch (err) {
    return failFromError<Deliverable[]>(err, []);
  }
}

/** Riwayat permintaan revisi satu order. */
export async function getRevisionsInAppwrite(
  orderId: string
): Promise<ServiceResult<Revision[]>> {
  const auth = await requireUserId<Revision[]>([]);
  if (!auth.ok) return auth.result;
  try {
    const participation = await loadOrderParticipationFromSupabase(orderId, auth.userId);
    if (!participation) return fail("Pesanan tidak ditemukan.", "not_found", []);

    const { data, error } = await createClient()
      .from(REVISIONS)
      .select("*")
      .eq("order_id", orderId)
      .order("created_at", { ascending: false })
      .limit(50);
    if (error) throw error;
    return ok(rowsToDocs(REVISIONS, data).map(mapRevision));
  } catch (err) {
    return failFromError<Revision[]>(err, []);
  }
}

/**
 * Kirim hasil kerja. KREATOR-ONLY.
 *
 * Setiap kiriman adalah BARIS BARU dengan `version + 1`. Memperbarui baris lama
 * akan menghapus jejak apa yang pernah ditolak UMKM, dan `revisionLimit` jadi
 * tidak bisa diaudit.
 */
export async function uploadDeliverableInAppwrite(
  input: UploadDeliverableInput
): Promise<ServiceResult<Deliverable>> {
  const empty = null as unknown as Deliverable;
  const auth = await requireUserId<Deliverable>(empty);
  if (!auth.ok) return auth.result;

  const parsed = uploadDeliverableSchema.safeParse(input);
  if (!parsed.success) {
    return failValidation<Deliverable>(
      parsed.error.issues[0]?.message ?? "Data deliverable tidak valid.",
      empty
    );
  }
  const payload = parsed.data;

  try {
    // `orderId` mengisi path; sisanya body. Untuk `storage`, server menyimpan
    // URL stabil `/api/files/<fileId>/url?redirect=1` (bukan URL dari klien).
    const created = await callApi<Deliverable>("submitDeliverable", payload);
    return ok(created);
  } catch (err) {
    return failFromWriteError<Deliverable>(err, empty, "Data deliverable tidak valid.");
  }
}

/**
 * Setujui deliverable. UMKM-ONLY (ditegakkan route + RPC `approve_deliverable`).
 *
 * ⚠️ Di Fase 8 ini yang MENCAIRKAN DANA (escrow → wallet kreator dikurangi fee,
 * order `completed`). Sampai saat itu route hanya menandai status.
 * TODO(fase-08): release_escrow di dalam route/RPC yang sama.
 */
export async function approveDeliverableInAppwrite(
  orderId: string,
  deliverableId: string
): Promise<ServiceResult<null>> {
  const auth = await requireUserId<null>(null);
  if (!auth.ok) return auth.result;
  try {
    await callApi("approveDeliverable", { deliverableId, orderId });
    return ok(null);
  } catch (err) {
    return failFromWriteError<null>(err, null);
  }
}

/**
 * Minta revisi. UMKM-ONLY.
 *
 * Route + RPC `request_revision`: batas revisi, status deliverable terbaru,
 * order → `revision`, dan notifikasi kreator dalam satu transaksi.
 */
export async function requestRevisionInAppwrite(
  input: RequestRevisionInput
): Promise<ServiceResult<Revision>> {
  const empty = null as unknown as Revision;
  const auth = await requireUserId<Revision>(empty);
  if (!auth.ok) return auth.result;

  const parsed = requestRevisionSchema.safeParse(input);
  if (!parsed.success) {
    return failValidation<Revision>(
      parsed.error.issues[0]?.message ?? "Alasan revisi tidak valid.",
      empty
    );
  }
  const payload = parsed.data;

  try {
    const created = await callApi<Revision>("requestRevision", payload);
    return ok(created);
  } catch (err) {
    return failFromWriteError<Revision>(err, empty, "Alasan revisi tidak valid.");
  }
}
