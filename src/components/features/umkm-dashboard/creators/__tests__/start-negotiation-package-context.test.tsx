// @vitest-environment jsdom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ push: vi.fn(), createConversation: vi.fn() }));

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: mocks.push }) }));
vi.mock("sonner", () => ({ toast: { error: vi.fn() } }));
vi.mock("@/services/umkm/umkm-dashboard.service", () => ({ createConversation: mocks.createConversation }));
vi.mock("@/components/ui/responsive-modal", () => ({
  ResponsiveModal: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  ResponsiveModalContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  ResponsiveModalDescription: () => null,
}));

let root: Root | undefined;
let host: HTMLDivElement;

beforeEach(() => {
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  vi.clearAllMocks();
  mocks.createConversation.mockResolvedValue({ success: true, data: "conv-existing" });
});

afterEach(async () => {
  await act(async () => root?.unmount());
  host?.remove();
});

describe("StartNegotiationModal package context", () => {
  it("reuses conversation then preserves selected stable package id in room URL", async () => {
    const { StartNegotiationModal } = await import("../modals/StartNegotiationModal");
    host = document.createElement("div");
    document.body.append(host);
    root = createRoot(host);
    await act(async () => root?.render(
      <StartNegotiationModal isOpen onClose={vi.fn()} creatorId="creator-1" creatorName="Ayu" packageId="pkg-special&1" packageName="Review" packagePrice="Rp200.000" />
    ));
    await act(async () => {
      [...document.querySelectorAll("button")].find((button) => button.textContent?.includes("Masuk ke Obrolan"))?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    expect(mocks.createConversation).toHaveBeenCalledWith("creator-1");
    expect(mocks.push).toHaveBeenCalledWith("/dashboard/umkm/negosiasi/conv-existing?packageId=pkg-special%261");
  });
});
