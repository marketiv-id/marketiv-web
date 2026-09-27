import type { NegotiationStage } from "@/types/domain";
import { getOrderStatusLabel } from "@/lib/dashboard-labels";
import { StatusDetail, EscrowStepStatus } from "./negotiation.types";

/** Warna badge per tahap. Teks label-nya berasal dari peta label bersama. */
const STAGE_TONE: Record<string, Pick<StatusDetail, "textClass" | "bgClass">> = {
  chatting: { textClass: "text-neutral-600", bgClass: "bg-neutral-100 border-neutral-200" },
  offer_pending: { textClass: "text-warning-strong", bgClass: "bg-warning-soft/30 border-warning-soft" },
  offer_rejected: { textClass: "text-danger-strong", bgClass: "bg-danger-soft/30 border-danger-soft" },
  awaiting_order: { textClass: "text-info-strong", bgClass: "bg-info-soft/30 border-info-soft" },
  pending_payment: { textClass: "text-warning-strong", bgClass: "bg-warning-soft/30 border-warning-soft" },
  escrow: { textClass: "text-primary-800", bgClass: "bg-primary-50/50 border-primary-200/50" },
  in_progress: { textClass: "text-info-strong", bgClass: "bg-info-soft/30 border-info-soft" },
  revision: { textClass: "text-danger-strong", bgClass: "bg-danger-soft/30 border-danger-soft" },
  approved: { textClass: "text-success-strong", bgClass: "bg-success-soft/30 border-success-soft" },
  completed: { textClass: "text-success-strong", bgClass: "bg-success-soft/30 border-success-soft" },
  cancelled: { textClass: "text-neutral-600", bgClass: "bg-neutral-100 border-neutral-200" },
};

const DEFAULT_TONE = STAGE_TONE.chatting;

/**
 * Tahap sebelum order lahir (chatting sampai awaiting_order) tidak punya nilai di
 * `OrderStatus`, jadi tipenya dilebarkan ke `NegotiationStage`. Nilai tak dikenal
 * memakai label netral, bukan slug mentah.
 */
export function getStatusDetails(status: string): StatusDetail {
  return {
    label: getOrderStatusLabel(status as NegotiationStage),
    ...(STAGE_TONE[status] ?? DEFAULT_TONE),
  };
}

/**
 * Formats dynamic step status in the escrow tracker.
 *
 * Empat tahap sebelum order lahir (chatting → offer_pending → offer_rejected →
 * awaiting_order) tidak punya cabang di versi lama, sehingga stepIdx 0 selalu
 * "completed" termasuk saat UMKM baru membuka percakapan. Sekarang memakai urutan
 * kanonik sebagai bilangan bulat agar setiap langkah dievaluasi hanya dari posisi
 * tahap saat ini.
 */
export function getStepStatus(stepIdx: number, orderStatus: string): EscrowStepStatus {
  if (orderStatus === "cancelled") return "cancelled";

  // Tahap bercabang (offer_rejected, revision) sejajar dengan tahap sebelumnya
  // agar tracker tidak mengklaim sudah maju saat negosiasi mengulang.
  const STAGE_ORDER: Record<string, number> = {
    chatting: 0,
    offer_pending: 1,
    offer_rejected: 1,
    awaiting_order: 2,
    pending_payment: 3,
    escrow: 4,
    in_progress: 5,
    revision: 5,
    approved: 6,
    completed: 7,
  };
  const o = STAGE_ORDER[orderStatus] ?? 0;

  switch (stepIdx) {
    case 0: // Offer Dibuat
      if (o === 0) return "pending";
      if (o === 1) return "active";
      return "completed";
    case 1: // Pembayaran UMKM
      if (o < 3) return "pending";
      if (o === 3) return "active";
      return "completed";
    case 2: // Dana Terkunci Escrow
      if (o < 4) return "pending";
      if (o === 4) return "active";
      return "completed";
    case 3: // Kreator Eksekusi
      if (o < 5) return "pending";
      if (o === 5) return "active";
      return "completed";
    case 4: // Verifikasi Collab Post
      if (o < 6) return "pending";
      if (o === 6) return "active";
      return "completed";
    case 5: // Dana Cair ke Kreator
      return o >= 7 ? "completed" : "pending";
    default:
      return "pending";
  }
}

/**
 * Formats relative date or text representation for Indonesian local dates with time.
 */
export function formatTime(isoString: string): string {
  try {
    const date = new Date(isoString);
    return date.toLocaleDateString("id-ID", {
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return isoString;
  }
}

/**
 * Formats full Indonesian date for deadlines.
 */
export function deadlineTime(isoString: string): string {
  if (!isoString || typeof isoString !== "string") return "Belum ditentukan";
  try {
    const date = new Date(isoString);
    if (isNaN(date.getTime())) return "Belum ditentukan";
    return date.toLocaleDateString("id-ID", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  } catch {
    return "Belum ditentukan";
  }
}
