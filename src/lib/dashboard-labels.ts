import type {
  CampaignStatus,
  ClaimStatus,
  DeliverableStatus,
  EscrowStatus,
  FraudStatus,
  NegotiationStage,
  OfferStatus,
  OrderStatus,
  RateCardStatus,
  SubmissionStatus,
  TransactionStatus,
  TransactionType,
  WithdrawalStatus,
} from "@/types/domain";
import type { RatecardValidationStatus } from "@/types/ratecard-review.types";

/**
 * Satu-satunya tempat status backend diterjemahkan ke label UI untuk kedua
 * dashboard. Dua peta lama (`umkm-status.ts`, `creator-status.ts`) dan
 * `finance.utils.ts` sekarang mendelegasikan ke sini supaya nilai enum yang sama
 * tidak pernah tampil dengan kata berbeda di dua layar.
 *
 * Nilai enum tetap English lowercase di state/data; hanya label di sini yang
 * berbahasa Indonesia.
 */

/** Label netral saat nilai backend tidak dikenali. Jangan pernah render slug mentah. */
export const UNKNOWN_STATUS_LABEL = "Status Tidak Dikenal";

export type BadgeVariant = "neutral" | "success" | "warning" | "info" | "danger";

function resolve(map: Record<string, string>, value: string | null | undefined): string {
  if (!value) return UNKNOWN_STATUS_LABEL;
  return map[value] ?? UNKNOWN_STATUS_LABEL;
}

// --- Kampanye ---------------------------------------------------------------

const CAMPAIGN_STATUS_LABELS: Record<CampaignStatus, string> = {
  draft: "Draf",
  active: "Aktif",
  paused: "Dijeda",
  completed: "Selesai",
};

export function getCampaignStatusLabel(status: CampaignStatus): string {
  return resolve(CAMPAIGN_STATUS_LABELS, status);
}

const CAMPAIGN_STATUS_VARIANTS: Record<CampaignStatus, BadgeVariant> = {
  draft: "neutral",
  active: "success",
  paused: "warning",
  completed: "info",
};

export function getCampaignStatusVariant(status: CampaignStatus): BadgeVariant {
  return CAMPAIGN_STATUS_VARIANTS[status] ?? "neutral";
}

// --- Pengiriman dan validasi ------------------------------------------------

const SUBMISSION_STATUS_LABELS: Record<SubmissionStatus, string> = {
  pending: "Menunggu Tinjauan",
  approved: "Disetujui",
  rejected: "Ditolak",
};

export function getSubmissionStatusLabel(status: SubmissionStatus): string {
  return resolve(SUBMISSION_STATUS_LABELS, status);
}

const SUBMISSION_STATUS_VARIANTS: Record<SubmissionStatus, BadgeVariant> = {
  pending: "warning",
  approved: "success",
  rejected: "danger",
};

export function getSubmissionStatusVariant(status: SubmissionStatus): BadgeVariant {
  return SUBMISSION_STATUS_VARIANTS[status] ?? "neutral";
}

const FRAUD_STATUS_LABELS: Record<FraudStatus, string> = {
  safe: "Aman",
  review: "Perlu Ditinjau",
  rejected: "Terindikasi Kecurangan",
};

export function getFraudStatusLabel(status: FraudStatus): string {
  return resolve(FRAUD_STATUS_LABELS, status);
}

const FRAUD_STATUS_VARIANTS: Record<FraudStatus, BadgeVariant> = {
  safe: "success",
  review: "warning",
  rejected: "danger",
};

export function getFraudStatusVariant(status: FraudStatus): BadgeVariant {
  return FRAUD_STATUS_VARIANTS[status] ?? "neutral";
}

const DELIVERABLE_STATUS_LABELS: Record<DeliverableStatus, string> = {
  submitted: "Menunggu Tinjauan",
  revision_requested: "Diminta Revisi",
  approved: "Disetujui",
};

export function getDeliverableStatusLabel(status: DeliverableStatus): string {
  return resolve(DELIVERABLE_STATUS_LABELS, status);
}

// --- Validasi Marketiv ------------------------------------------------------

/**
 * Validasi adalah langkah terpisah dari tinjauan UMKM: Marketiv memeriksa bukti
 * sebelum UMKM boleh menyetujui. Karena itu kata-nya dibedakan dari "tinjauan".
 */
const VALIDATION_STATUS_LABELS: Record<RatecardValidationStatus, string> = {
  pending: "Menunggu Validasi",
  valid: "Valid",
  invalid: "Tidak Lolos Validasi",
};

export function getValidationStatusLabel(status: RatecardValidationStatus): string {
  return resolve(VALIDATION_STATUS_LABELS, status);
}

// --- Klaim pekerjaan --------------------------------------------------------

const CLAIM_STATUS_LABELS: Record<ClaimStatus, string> = {
  claimed: "Sedang Dikerjakan",
  submitted: "Menunggu Tinjauan",
  approved: "Selesai",
  rejected: "Ditolak",
  expired: "Kedaluwarsa",
};

export function getClaimStatusLabel(status: ClaimStatus): string {
  return resolve(CLAIM_STATUS_LABELS, status);
}

const CLAIM_STATUS_VARIANTS: Record<ClaimStatus, BadgeVariant> = {
  claimed: "info",
  submitted: "warning",
  approved: "success",
  rejected: "danger",
  expired: "neutral",
};

export function getClaimStatusVariant(status: ClaimStatus): BadgeVariant {
  return CLAIM_STATUS_VARIANTS[status] ?? "neutral";
}

// --- Pesanan dan tahap negosiasi -------------------------------------------

const ORDER_STATUS_LABELS: Record<NegotiationStage, string> = {
  chatting: "Diskusi",
  offer_pending: "Penawaran Dikirim",
  offer_rejected: "Penawaran Ditolak",
  awaiting_order: "Menyiapkan Pesanan",
  pending_payment: "Menunggu Pembayaran",
  escrow: "Dana Aman",
  in_progress: "Sedang Dikerjakan",
  revision: "Revisi",
  approved: "Disetujui",
  completed: "Selesai",
  cancelled: "Dibatalkan",
};

export function getOrderStatusLabel(status: NegotiationStage | OrderStatus): string {
  return resolve(ORDER_STATUS_LABELS, status);
}

/** Alias lama; tahap negosiasi dan status pesanan memakai kosakata yang sama. */
export function getNegotiationStatusLabel(status: OrderStatus): string {
  return getOrderStatusLabel(status);
}

const ORDER_STATUS_VARIANTS: Record<NegotiationStage, BadgeVariant> = {
  chatting: "neutral",
  offer_pending: "warning",
  offer_rejected: "danger",
  awaiting_order: "info",
  pending_payment: "warning",
  escrow: "info",
  in_progress: "info",
  revision: "warning",
  approved: "success",
  completed: "success",
  cancelled: "neutral",
};

export function getOrderStatusVariant(status: NegotiationStage | OrderStatus): BadgeVariant {
  return ORDER_STATUS_VARIANTS[status] ?? "neutral";
}

export function getNegotiationStatusVariant(status: OrderStatus): BadgeVariant {
  return getOrderStatusVariant(status);
}

const OFFER_STATUS_LABELS: Record<OfferStatus, string> = {
  pending: "Menunggu Jawaban Kreator",
  accepted: "Diterima",
  rejected: "Ditolak",
};

export function getOfferStatusLabel(status: OfferStatus): string {
  return resolve(OFFER_STATUS_LABELS, status);
}

// --- Dana aman dan transaksi ------------------------------------------------

const ESCROW_STATUS_LABELS: Record<EscrowStatus, string> = {
  held: "Dana Aman",
  released: "Dana Dicairkan",
  refunded: "Dana Dikembalikan",
};

export function getEscrowStatusLabel(status: EscrowStatus): string {
  return resolve(ESCROW_STATUS_LABELS, status);
}

const TRANSACTION_STATUS_LABELS: Record<TransactionStatus, string> = {
  pending: "Menunggu Pembayaran",
  paid: "Pembayaran Berhasil",
  failed: "Gagal",
  expired: "Kedaluwarsa",
  cancelled: "Dibatalkan",
  held: "Dana Aman",
  released: "Dana Dicairkan",
  refunded: "Dana Dikembalikan",
  completed: "Selesai",
  matured: "Selesai",
};

/**
 * Sudut pandang pembaca menentukan arti `pending`: UMKM menunggu membayar,
 * kreator menunggu dana diproses. Salah pilih membuat baris transaksi bohong.
 */
export type TransactionPerspective = "payer" | "payee";

export function getTransactionStatusLabel(
  status: TransactionStatus,
  perspective: TransactionPerspective = "payer"
): string {
  if (status === "pending") {
    return perspective === "payee" ? "Menunggu Diproses" : "Menunggu Pembayaran";
  }

  return resolve(TRANSACTION_STATUS_LABELS, status);
}

const TRANSACTION_STATUS_VARIANTS: Record<TransactionStatus, BadgeVariant> = {
  pending: "warning",
  paid: "success",
  failed: "danger",
  expired: "neutral",
  cancelled: "neutral",
  held: "info",
  released: "success",
  refunded: "neutral",
  completed: "success",
  matured: "success",
};

export function getTransactionStatusVariant(status: TransactionStatus): BadgeVariant {
  return TRANSACTION_STATUS_VARIANTS[status] ?? "neutral";
}

/** Sama seperti `resolveStatusLabel`, tetapi menghormati sudut pandang pembaca. */
export function resolveTransactionStatusLabel(
  status: string | null | undefined,
  perspective: TransactionPerspective = "payer"
): string {
  if (typeof status !== "string") return UNKNOWN_STATUS_LABEL;
  const key = status.toLowerCase();
  if (!(key in TRANSACTION_DOMAIN_LABELS)) return UNKNOWN_STATUS_LABEL;
  if (key === "pending") {
    return perspective === "payee" ? "Menunggu Diproses" : "Menunggu Pembayaran";
  }
  return TRANSACTION_DOMAIN_LABELS[key];
}

const TRANSACTION_TYPE_LABELS: Record<TransactionType, string> = {
  deposit: "Isi Saldo",
  withdrawal: "Penarikan Dana",
  withdrawal_reversal: "Pengembalian Penarikan",
  payment: "Pembayaran",
  refund: "Pengembalian Dana",
  release: "Pencairan Dana Aman",
  fee: "Komisi Platform",
};

export function getTransactionTypeLabel(type: TransactionType): string {
  return resolve(TRANSACTION_TYPE_LABELS, type);
}

// --- Rate card dan pencairan ------------------------------------------------

const RATE_CARD_STATUS_LABELS: Record<RateCardStatus, string> = {
  draft: "Draf",
  published: "Tayang",
};

export function getRateCardStatusLabel(status: RateCardStatus): string {
  return resolve(RATE_CARD_STATUS_LABELS, status);
}

const WITHDRAWAL_STATUS_LABELS: Record<WithdrawalStatus, string> = {
  requested: "Menunggu Diproses",
  processing: "Sedang Diproses",
  succeeded: "Berhasil",
  failed: "Gagal",
  reversed: "Saldo Dikembalikan",
};

export function getWithdrawalStatusLabel(status: WithdrawalStatus): string {
  return resolve(WITHDRAWAL_STATUS_LABELS, status);
}

// --- Resolver longgar untuk badge generik -----------------------------------

/**
 * Badge transaksi menerima status transaksi maupun status penarikan manual,
 * karena keduanya tampil di riwayat yang sama. Dua kamus digabung di sini.
 */
const TRANSACTION_DOMAIN_LABELS: Record<string, string> = {
  ...TRANSACTION_STATUS_LABELS,
  ...WITHDRAWAL_STATUS_LABELS,
};

export type StatusDomain =
  | "campaign"
  | "claim"
  | "submission"
  | "deliverable"
  | "fraud"
  | "negotiation"
  | "offer"
  | "rate_card"
  | "transaction"
  | "validation"
  | "withdrawal";

const DOMAIN_MAPS: Record<StatusDomain, Record<string, string>> = {
  campaign: CAMPAIGN_STATUS_LABELS,
  claim: CLAIM_STATUS_LABELS,
  submission: SUBMISSION_STATUS_LABELS,
  deliverable: DELIVERABLE_STATUS_LABELS,
  fraud: FRAUD_STATUS_LABELS,
  negotiation: ORDER_STATUS_LABELS,
  offer: OFFER_STATUS_LABELS,
  rate_card: RATE_CARD_STATUS_LABELS,
  transaction: TRANSACTION_DOMAIN_LABELS,
  validation: VALIDATION_STATUS_LABELS,
  withdrawal: WITHDRAWAL_STATUS_LABELS,
};

/**
 * Untuk komponen badge yang menerima status sebagai string lepas. Nilai yang
 * tidak dikenali mengembalikan label netral, bukan slug mentah.
 */
export function resolveStatusLabel(status: string | null | undefined, domain: StatusDomain): string {
  return resolve(DOMAIN_MAPS[domain], typeof status === "string" ? status.toLowerCase() : status);
}

// --- Daftar opsi filter -----------------------------------------------------

export function getCampaignStatusOptions(): Array<{ label: string; value: CampaignStatus }> {
  const order: CampaignStatus[] = ["draft", "active", "paused", "completed"];
  return order.map((value) => ({ value, label: CAMPAIGN_STATUS_LABELS[value] }));
}

export function getOrderStatusOptions(): Array<{ label: string; value: NegotiationStage }> {
  const order: NegotiationStage[] = [
    "chatting",
    "offer_pending",
    "offer_rejected",
    "awaiting_order",
    "pending_payment",
    "escrow",
    "in_progress",
    "revision",
    "approved",
    "completed",
    "cancelled",
  ];
  return order.map((value) => ({ value, label: ORDER_STATUS_LABELS[value] }));
}
