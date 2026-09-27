/**
 * Re-export dari peta label bersama untuk dashboard Kreator. Dulu pasangan
 * terpisah dari `umkm-status.ts` dan sempat berbeda kata untuk nilai enum yang
 * sama; sekarang keduanya membaca `src/lib/dashboard-labels.ts`.
 */
export {
  getClaimStatusLabel,
  getClaimStatusVariant,
  getSubmissionStatusLabel,
  getSubmissionStatusVariant,
  getFraudStatusLabel,
  getFraudStatusVariant,
  getOrderStatusLabel,
  getOrderStatusVariant,
  getEscrowStatusLabel,
  getRateCardStatusLabel,
  getTransactionTypeLabel,
} from "./dashboard-labels";

import { getTransactionStatusLabel } from "./dashboard-labels";
import type { TransactionStatus } from "@/types/domain";

/** Baris transaksi kreator adalah dana masuk, jadi `pending` berarti menunggu diproses. */
export function getCreatorTransactionStatusLabel(status: TransactionStatus): string {
  return getTransactionStatusLabel(status, "payee");
}

const SUCCESSFUL_TRANSACTION_STATUSES = new Set<TransactionStatus>([
  "paid",
  "released",
  "completed",
  "matured",
]);

export function matchesCreatorTransactionStatusFilter(
  status: TransactionStatus,
  filter: string
): boolean {
  if (filter === "all") return true;
  if (filter === "success") return SUCCESSFUL_TRANSACTION_STATUSES.has(status);
  return status === filter;
}
