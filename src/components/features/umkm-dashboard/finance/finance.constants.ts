import {
  getTransactionStatusLabel,
  getTransactionTypeLabel,
} from "@/lib/dashboard-labels";

export const TRANSACTION_STATUS_OPTIONS = [
  { value: "all", label: "Semua Status" },
  { value: "pending", label: getTransactionStatusLabel("pending") },
  { value: "held", label: getTransactionStatusLabel("held") },
  { value: "paid", label: getTransactionStatusLabel("paid") },
  { value: "released", label: getTransactionStatusLabel("released") },
  { value: "failed", label: getTransactionStatusLabel("failed") },
  { value: "refunded", label: getTransactionStatusLabel("refunded") },
] as const;

export const TRANSACTION_TYPE_OPTIONS = [
  { value: "all", label: "Semua Jenis" },
  { value: "deposit", label: getTransactionTypeLabel("deposit") },
  { value: "payment", label: getTransactionTypeLabel("payment") },
  { value: "refund", label: getTransactionTypeLabel("refund") },
  { value: "release", label: getTransactionTypeLabel("release") },
  { value: "withdrawal", label: getTransactionTypeLabel("withdrawal") },
  { value: "fee", label: getTransactionTypeLabel("fee") },
] as const;

export const REFERENCE_TYPE_OPTIONS = [
  { value: "all", label: "Semua Fitur" },
  { value: "campaign", label: "Mode Kampanye" },
  { value: "rate_card", label: "Mode Paket Harga" },
] as const;

export const SORT_OPTIONS = [
  { value: "date_desc", label: "Terbaru" },
  { value: "date_asc", label: "Terlama" },
  { value: "amount_desc", label: "Nominal Terbesar" },
  { value: "amount_asc", label: "Nominal Terkecil" },
] as const;

export const EXPORT_FORMAT_OPTIONS = [
  { value: "csv", label: "File CSV (.csv)" },
  { value: "xlsx", label: "Berkas Excel (.xlsx)" },
] as const;

export const EXPORT_TYPE_OPTIONS = [
  { value: "all", label: "Laporan Keuangan Lengkap" },
  { value: "campaign", label: "Laporan Mode Kampanye" },
  { value: "rate_card", label: "Laporan Mode Paket Harga" },
  { value: "refund", label: "Laporan Pengembalian Dana & Pembatalan" },
] as const;
