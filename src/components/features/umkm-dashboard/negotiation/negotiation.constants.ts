import type { ToolbarStatusFilterOption, ToolbarSortOption, EscrowStep } from "./negotiation.types";
import { getOrderStatusLabel, getOrderStatusOptions } from "@/lib/dashboard-labels";

/**
 * Filter status diturunkan dari peta label bersama supaya badge dan filter tidak
 * pernah memakai kata berbeda untuk tahap yang sama.
 */
export const NEGOTIATION_STATUS_FILTERS: ToolbarStatusFilterOption[] = [
  { id: "all", label: "Semua" },
  ...getOrderStatusOptions().map((option) => ({ id: option.value, label: option.label })),
];

export const NEGOTIATION_SORT_OPTIONS: ToolbarSortOption[] = [
  { id: "newest", label: "Terbaru" },
  { id: "deadline", label: "Batas Waktu Terdekat" },
  { id: "price_desc", label: "Harga Tertinggi" },
  { id: "unread", label: "Belum Dibaca" },
];

export const ESCROW_STEPS: EscrowStep[] = [
  { label: "Penawaran Dibuat", desc: "Tawaran kolaborasi diajukan" },
  { label: "Pembayaran Anda", desc: "Anda membayar via Virtual Account atau QRIS" },
  { label: getOrderStatusLabel("escrow"), desc: "Sistem menyimpan anggaran Anda" },
  { label: "Kreator Mengerjakan Konten", desc: "Kreator membuat dan mengirim video" },
  { label: "Verifikasi Postingan Kolaborasi", desc: "Sistem memeriksa tautan video yang diunggah" },
  { label: "Dana Cair ke Kreator", desc: "Pembayaran diselesaikan" },
];
