// @vitest-environment jsdom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { formatCurrency } from "@/lib/formatters";
import { SimulatedSnapModal } from "../SimulatedSnapModal";

let root: Root | undefined;
let host: HTMLDivElement;

async function renderModal(props: {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  grossAmount: number;
  orderId?: string;
  itemName?: string;
}) {
  host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
  await act(async () => {
    root?.render(<SimulatedSnapModal {...props} />);
  });
}

function getButtonByText(text: string): HTMLButtonElement | undefined {
  return [...document.querySelectorAll("button")].find(
    (el) => el.textContent?.trim().includes(text)
  );
}

beforeEach(() => {
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
});

afterEach(async () => {
  await act(async () => root?.unmount());
  host?.remove();
});

describe("SimulatedSnapModal [Task 5]", () => {
  it("does not render anything when isOpen is false", async () => {
    await renderModal({
      isOpen: false,
      onClose: vi.fn(),
      onSuccess: vi.fn(),
      grossAmount: 1_020_000,
    });

    expect(document.querySelector(".fixed")).toBeNull();
  });

  it("renders order info, gross amount, and default QRIS tab", async () => {
    const grossAmount = 1_020_000;
    await renderModal({
      isOpen: true,
      onClose: vi.fn(),
      onSuccess: vi.fn(),
      grossAmount,
      orderId: "MKT-TEST-999",
      itemName: "Review Sambal Roa",
    });

    const bodyText = document.body.textContent || "";
    expect(bodyText).toContain("Midtrans Snap Simulator");
    expect(bodyText).toContain(formatCurrency(grossAmount));
    expect(bodyText).toContain("MKT-TEST-999");
    expect(bodyText).toContain("Review Sambal Roa");
    expect(bodyText).toContain("QRIS Nasional");
  });

  it("allows switching to Virtual Account tab and displays bank options", async () => {
    await renderModal({
      isOpen: true,
      onClose: vi.fn(),
      onSuccess: vi.fn(),
      grossAmount: 500_000,
    });

    const vaTabButton = getButtonByText("Virtual Account");
    expect(vaTabButton).toBeDefined();

    await act(async () => {
      vaTabButton?.click();
    });

    const bodyText = document.body.textContent || "";
    expect(bodyText).toContain("Nomor Virtual Account");
    expect(bodyText).toContain("bca");
    expect(bodyText).toContain("mandiri");
    expect(bodyText).toContain("bni");
  });

  it("triggers onSuccess after clicking Simulasikan Bayar Berhasil", async () => {
    vi.useFakeTimers();
    const handleSuccess = vi.fn();

    await renderModal({
      isOpen: true,
      onClose: vi.fn(),
      onSuccess: handleSuccess,
      grossAmount: 1_000_000,
    });

    const successBtn = getButtonByText("Simulasikan Bayar Berhasil");
    expect(successBtn).toBeDefined();

    await act(async () => {
      successBtn?.click();
    });

    // Advance timeout
    await act(async () => {
      vi.advanceTimersByTime(700);
    });

    expect(handleSuccess).toHaveBeenCalledTimes(1);
    vi.useRealTimers();
  });

  it("triggers onClose when clicking Batal button", async () => {
    const handleClose = vi.fn();
    await renderModal({
      isOpen: true,
      onClose: handleClose,
      onSuccess: vi.fn(),
      grossAmount: 1_000_000,
    });

    const cancelBtn = getButtonByText("Batal");
    expect(cancelBtn).toBeDefined();

    await act(async () => {
      cancelBtn?.click();
    });

    expect(handleClose).toHaveBeenCalledTimes(1);
  });
});
