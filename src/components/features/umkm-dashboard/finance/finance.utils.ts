import { TransactionStatus, TransactionType, ReferenceType } from "./finance.types";
import { getTransactionStatusLabel, getTransactionTypeLabel } from "@/lib/dashboard-labels";

export function getStatusBadgeVariant(status: TransactionStatus): "warning" | "info" | "success" | "danger" | "neutral" {
  switch (status) {
    case "pending":
      return "warning";
    case "held":
      return "info";
    case "paid":
    case "released":
    case "completed":
    case "matured":
      return "success";
    case "failed":
      return "danger";
    case "expired":
    case "cancelled":
    case "refunded":
      return "neutral";
    default:
      return "neutral";
  }
}

export function getStatusLabel(status: TransactionStatus): string {
  return getTransactionStatusLabel(status);
}

export function getTypeLabel(type: TransactionType): string {
  return getTransactionTypeLabel(type);
}

export function getReferenceLabel(type: ReferenceType): string {
  switch (type) {
    case "campaign":
      return "Mode Kampanye";
    case "rate_card":
      return "Mode Paket Harga";
    default:
      return type;
  }
}
