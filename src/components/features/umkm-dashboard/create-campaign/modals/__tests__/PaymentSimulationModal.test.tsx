// @vitest-environment jsdom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { formatCurrency } from "@/lib/formatters";
import { PaymentSimulationModal } from "../PaymentSimulationModal";

vi.mock("@/components/ui/responsive-modal", () => ({
  ResponsiveModal: ({
    open,
    children,
  }: {
    open: boolean;
    children: React.ReactNode;
  }) => (open ? <div role="dialog">{children}</div> : null),
  ResponsiveModalContent: ({
    children,
    className,
  }: {
    children: React.ReactNode;
    className?: string;
  }) => <section className={className}>{children}</section>,
  ResponsiveModalHeader: ({
    children,
    className,
  }: {
    children: React.ReactNode;
    className?: string;
  }) => <header className={className}>{children}</header>,
  ResponsiveModalTitle: ({
    children,
    className,
  }: {
    children: React.ReactNode;
    className?: string;
  }) => <h2 className={className}>{children}</h2>,
  ResponsiveModalDescription: ({
    children,
    className,
  }: {
    children: React.ReactNode;
    className?: string;
  }) => <p className={className}>{children}</p>,
  ResponsiveModalFooter: ({
    children,
    className,
  }: {
    children: React.ReactNode;
    className?: string;
  }) => <footer className={className}>{children}</footer>,
}));

let root: Root | undefined;
let host: HTMLDivElement;

async function renderModal(props: {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  totalBudgetEscrow: number;
}) {
  host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
  await act(async () => {
    root?.render(<PaymentSimulationModal {...props} />);
  });
}

function getButtonByText(text: string): HTMLButtonElement | undefined {
  return [...document.querySelectorAll("button")].find(
    (el) => el.textContent?.trim() === text
  );
}

beforeEach(() => {
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
});

afterEach(async () => {
  await act(async () => root?.unmount());
  host?.remove();
});

describe("PaymentSimulationModal [UAT-08]", () => {
  it("does not render when isOpen is false", async () => {
    await renderModal({
      isOpen: false,
      onClose: vi.fn(),
      onConfirm: vi.fn(),
      totalBudgetEscrow: 1_000_000,
    });

    expect(document.querySelector('div[role="dialog"]')).toBeNull();
  });

  describe("DEF-01: No dummy payment method selection", () => {
    it("does not render payment method radio buttons or dummy method lists", async () => {
      await renderModal({
        isOpen: true,
        onClose: vi.fn(),
        onConfirm: vi.fn(),
        totalBudgetEscrow: 1_000_000,
      });

      const bodyText = document.body.textContent || "";
      expect(bodyText).not.toContain("Pilih Metode Pembayaran");
      expect(bodyText).not.toContain("Transfer Bank Otomatis 24 Jam");
      expect(bodyText).not.toContain("GoPay, OVO, Dana, ShopeePay");

      // Verify no radio buttons or multiple selectable payment option buttons exist
      const buttons = [...document.querySelectorAll("button")];
      const buttonLabels = buttons.map((b) => b.textContent?.trim());
      expect(buttonLabels).toEqual(["Batal", "Lanjut ke Pembayaran Midtrans"]);
    });
  });

  describe("DEF-02: Informational notice about Midtrans Snap payment method selection", () => {
    it("displays notice explaining payment methods are chosen directly in Midtrans Snap", async () => {
      await renderModal({
        isOpen: true,
        onClose: vi.fn(),
        onConfirm: vi.fn(),
        totalBudgetEscrow: 1_000_000,
      });

      const bodyText = document.body.textContent || "";
      expect(bodyText).toContain("Midtrans Snap");
      expect(bodyText).toContain("QRIS");
      expect(bodyText).toContain("GoPay");
      expect(bodyText).toContain("OVO");
      expect(bodyText).toContain("ShopeePay");
      expect(bodyText).toContain("Virtual Account");
    });
  });

  describe("DEF-03: Primary CTA button", () => {
    it('renders CTA button reading "Lanjut ke Pembayaran Midtrans" and triggers onConfirm on click', async () => {
      const handleConfirm = vi.fn();
      await renderModal({
        isOpen: true,
        onClose: vi.fn(),
        onConfirm: handleConfirm,
        totalBudgetEscrow: 1_000_000,
      });

      const ctaButton = getButtonByText("Lanjut ke Pembayaran Midtrans");
      expect(ctaButton).toBeDefined();

      await act(async () => {
        ctaButton?.click();
      });

      expect(handleConfirm).toHaveBeenCalledTimes(1);
    });
  });

  describe("Fee calculation and cancellation", () => {
    it("calculates and displays budget, 2% platform fee, and total payment accurately", async () => {
      const budget = 1_000_000;
      const expectedPlatformFee = budget * 0.02; // 20,000
      const expectedTotal = budget + expectedPlatformFee; // 1,020,000

      await renderModal({
        isOpen: true,
        onClose: vi.fn(),
        onConfirm: vi.fn(),
        totalBudgetEscrow: budget,
      });

      const bodyText = document.body.textContent || "";
      expect(bodyText).toContain("Dana Kampanye");
      expect(bodyText).toContain(formatCurrency(budget));

      expect(bodyText).toContain("Biaya Platform (2%)");
      expect(bodyText).toContain(formatCurrency(expectedPlatformFee));

      expect(bodyText).toContain("Total Pembayaran");
      expect(bodyText).toContain(formatCurrency(expectedTotal));
    });

    it('renders "Batal" button and triggers onClose on click', async () => {
      const handleClose = vi.fn();
      await renderModal({
        isOpen: true,
        onClose: handleClose,
        onConfirm: vi.fn(),
        totalBudgetEscrow: 500_000,
      });

      const cancelButton = getButtonByText("Batal");
      expect(cancelButton).toBeDefined();

      await act(async () => {
        cancelButton?.click();
      });

      expect(handleClose).toHaveBeenCalledTimes(1);
    });
  });
});
