import { describe, expect, it } from "vitest";

import {
  UNKNOWN_STATUS_LABEL,
  getCampaignStatusLabel,
  getCampaignStatusOptions,
  getCampaignStatusVariant,
  getClaimStatusLabel,
  getDeliverableStatusLabel,
  getEscrowStatusLabel,
  getFraudStatusLabel,
  getOrderStatusLabel,
  getOrderStatusOptions,
  getRateCardStatusLabel,
  getSubmissionStatusLabel,
  getTransactionStatusLabel,
  getTransactionStatusVariant,
  getTransactionTypeLabel,
  getWithdrawalStatusLabel,
  resolveStatusLabel,
} from "@/lib/dashboard-labels";
import type {
  CampaignStatus,
  ClaimStatus,
  DeliverableStatus,
  EscrowStatus,
  FraudStatus,
  NegotiationStage,
  RateCardStatus,
  SubmissionStatus,
  TransactionStatus,
  TransactionType,
  WithdrawalStatus,
} from "@/types/domain";

const CAMPAIGN: CampaignStatus[] = ["draft", "active", "paused", "completed"];
const SUBMISSION: SubmissionStatus[] = ["pending", "approved", "rejected"];
const FRAUD: FraudStatus[] = ["safe", "review", "rejected"];
const CLAIM: ClaimStatus[] = ["claimed", "submitted", "approved", "rejected", "expired"];
const STAGE: NegotiationStage[] = [
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
const DELIVERABLE: DeliverableStatus[] = ["submitted", "revision_requested", "approved"];
const ESCROW: EscrowStatus[] = ["held", "released", "refunded"];
const TRANSACTION: TransactionStatus[] = [
  "pending",
  "paid",
  "failed",
  "expired",
  "cancelled",
  "held",
  "released",
  "refunded",
  "completed",
  "matured",
];
const TX_TYPE: TransactionType[] = [
  "deposit",
  "withdrawal",
  "withdrawal_reversal",
  "payment",
  "refund",
  "release",
  "fee",
];
const RATE_CARD: RateCardStatus[] = ["draft", "published"];
const WITHDRAWAL: WithdrawalStatus[] = [
  "requested",
  "processing",
  "succeeded",
  "failed",
  "reversed",
];

const labelFns: Array<[string, string[], (value: string) => string]> = [
  ["campaign", CAMPAIGN, (v) => getCampaignStatusLabel(v as CampaignStatus)],
  ["submission", SUBMISSION, (v) => getSubmissionStatusLabel(v as SubmissionStatus)],
  ["fraud", FRAUD, (v) => getFraudStatusLabel(v as FraudStatus)],
  ["claim", CLAIM, (v) => getClaimStatusLabel(v as ClaimStatus)],
  ["negotiation", STAGE, (v) => getOrderStatusLabel(v as NegotiationStage)],
  ["deliverable", DELIVERABLE, (v) => getDeliverableStatusLabel(v as DeliverableStatus)],
  ["escrow", ESCROW, (v) => getEscrowStatusLabel(v as EscrowStatus)],
  ["transaction", TRANSACTION, (v) => getTransactionStatusLabel(v as TransactionStatus)],
  ["transactionType", TX_TYPE, (v) => getTransactionTypeLabel(v as TransactionType)],
  ["rateCard", RATE_CARD, (v) => getRateCardStatusLabel(v as RateCardStatus)],
  ["withdrawal", WITHDRAWAL, (v) => getWithdrawalStatusLabel(v as WithdrawalStatus)],
];

describe("dashboard-labels", () => {
  it.each(labelFns)("maps every %s value to a non-empty label that is not the raw slug", (_name, values, label) => {
    for (const value of values) {
      const result = label(value);
      expect(result.length).toBeGreaterThan(0);
      expect(result).not.toBe(value);
      expect(result).not.toMatch(/_/);
    }
  });

  it("never renders a raw slug for an unknown enum value", () => {
    expect(resolveStatusLabel("no_such_status", "campaign")).toBe(UNKNOWN_STATUS_LABEL);
    expect(resolveStatusLabel(undefined, "negotiation")).toBe(UNKNOWN_STATUS_LABEL);
    expect(resolveStatusLabel(null, "transaction")).toBe(UNKNOWN_STATUS_LABEL);
  });

  it("resolves loose status strings through the shared maps", () => {
    expect(resolveStatusLabel("COMPLETED", "campaign")).toBe("Selesai");
    expect(resolveStatusLabel("revision_requested", "deliverable")).toBe("Diminta Revisi");
  });

  it("uses one draft word for campaigns and rate cards", () => {
    expect(getCampaignStatusLabel("draft")).toBe("Draf");
    expect(getRateCardStatusLabel("draft")).toBe("Draf");
  });

  it("uses one escrow word across order, escrow, and transaction status", () => {
    expect(getOrderStatusLabel("escrow")).toBe("Dana Aman");
    expect(getEscrowStatusLabel("held")).toBe("Dana Aman");
    expect(getTransactionStatusLabel("held")).toBe("Dana Aman");
  });

  it("uses one fraud word for both dashboards", () => {
    expect(getFraudStatusLabel("rejected")).toBe("Terindikasi Kecurangan");
  });

  it("keeps negotiation stage and order status vocabulary identical", () => {
    for (const stage of STAGE) {
      expect(getOrderStatusLabel(stage)).toBe(resolveStatusLabel(stage, "negotiation"));
    }
  });

  it("reads pending from the reader's perspective", () => {
    expect(getTransactionStatusLabel("pending", "payer")).toBe("Menunggu Pembayaran");
    expect(getTransactionStatusLabel("pending", "payee")).toBe("Menunggu Diproses");
    expect(getTransactionStatusLabel("pending")).toBe("Menunggu Pembayaran");
  });

  it("derives filter options from the same label maps", () => {
    const campaignOptions = getCampaignStatusOptions();
    expect(campaignOptions.map((o) => o.label)).toEqual(["Draf", "Aktif", "Dijeda", "Selesai"]);
    for (const option of campaignOptions) {
      expect(option.label).toBe(getCampaignStatusLabel(option.value));
    }

    const orderOptions = getOrderStatusOptions();
    expect(orderOptions).toHaveLength(STAGE.length);
    for (const option of orderOptions) {
      expect(option.label).toBe(getOrderStatusLabel(option.value));
    }
  });

  it("keeps badge variants aligned with label tone", () => {
    expect(getCampaignStatusVariant("draft")).toBe("neutral");
    expect(getTransactionStatusVariant("refunded")).toBe("neutral");
    expect(getTransactionStatusVariant("completed")).toBe("success");
  });
});
