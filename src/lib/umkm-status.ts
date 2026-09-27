/**
 * Re-export dari peta label bersama. File ini dulu sumber label kedua untuk
 * dashboard UMKM; sekarang hanya jembatan supaya tidak ada lagi dua tempat yang
 * bisa berbeda pendapat soal kata untuk satu nilai enum.
 *
 * Lihat `src/lib/dashboard-labels.ts`. Nilai enum tetap English lowercase di
 * state/data; jangan pernah membandingkan label Indonesia di layer data.
 */
export {
  getCampaignStatusLabel,
  getCampaignStatusVariant,
  getSubmissionStatusLabel,
  getSubmissionStatusVariant,
  getFraudStatusLabel,
  getFraudStatusVariant,
  getNegotiationStatusLabel,
  getNegotiationStatusVariant,
  getOrderStatusLabel,
  getOrderStatusVariant,
  getTransactionStatusLabel,
  getTransactionStatusVariant,
} from "./dashboard-labels";
