import type {
  RatecardReview,
  RatecardReviewFilter,
} from "@/types/ratecard-review.types";

export interface RatecardReviewState {
  filter: RatecardReviewFilter | null;
  title: string;
  subtitle: string;
  description: string;
  canApprove: boolean;
  canRequestRevision: boolean;
  actionableDeliverableId: string | null;
}

export function getRatecardReviewState(review: RatecardReview): RatecardReviewState {
  const latest = review.latestDeliverable;
  const activeOrder = review.orderStatus === "in_progress" || review.orderStatus === "revision";
  const revisionAvailable = review.revisionCount < review.revisionLimit;

  if (review.orderStatus === "completed" || review.orderStatus === "approved") {
    return {
      filter: "completed",
      title: "Selesai",
      subtitle: "Hasil akhir tersimpan",
      description: "Pekerjaan dan validasi final tersedia sebagai riwayat baca-saja.",
      canApprove: false,
      canRequestRevision: false,
      actionableDeliverableId: null,
    };
  }

  if (!latest) {
    return {
      filter: null,
      title: "Menunggu Hasil Kerja",
      subtitle: "Kreator belum mengirim hasil",
      description: "Hasil kerja akan muncul setelah Kreator mengirim hasil kerja.",
      canApprove: false,
      canRequestRevision: false,
      actionableDeliverableId: null,
    };
  }

  if (latest.status === "revision_requested") {
    return {
      filter: "revision",
      title: "Menunggu Kreator Mengirim Versi Perbaikan",
      subtitle: "Revisi telah diminta",
      description: "Versi lama tetap tersedia sebagai riwayat dan tidak dapat disetujui.",
      canApprove: false,
      canRequestRevision: false,
      actionableDeliverableId: null,
    };
  }

  if (latest.status === "approved") {
    return {
      filter: "completed",
      title: "Selesai",
      subtitle: "Hasil kerja telah disetujui",
      description: "Hasil kerja tersedia sebagai riwayat baca-saja.",
      canApprove: false,
      canRequestRevision: false,
      actionableDeliverableId: null,
    };
  }

  const canRequestRevision = activeOrder && revisionAvailable;
  if (review.validation.status === "pending") {
    return {
      filter: "marketiv_validation",
      title: "Menunggu Validasi Marketiv",
      subtitle: "Kreator telah mengirim hasil",
      description: "Marketiv sedang memvalidasi bukti hasil kerja sebelum dapat disetujui.",
      canApprove: false,
      canRequestRevision,
      actionableDeliverableId: canRequestRevision ? latest.id : null,
    };
  }

  if (review.validation.status === "invalid") {
    return {
      filter: "action_required",
      title: "Bukti Belum Lolos Validasi Marketiv",
      subtitle: "Periksa catatan validasi",
      description: "Hasil kerja tidak dapat disetujui sampai bukti terbaru dinyatakan valid.",
      canApprove: false,
      canRequestRevision,
      actionableDeliverableId: canRequestRevision ? latest.id : null,
    };
  }

  return {
    filter: "action_required",
    title: "Validasi Marketiv Selesai",
    subtitle: "Siap Ditinjau",
    description: "Bukti hasil kerja terbaru telah lolos validasi Marketiv.",
    canApprove: activeOrder,
    canRequestRevision,
    actionableDeliverableId: activeOrder ? latest.id : null,
  };
}
