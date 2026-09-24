// @vitest-environment jsdom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { FloatingDemoBar } from "../FloatingDemoBar";

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
  }),
  usePathname: () => "/dashboard/umkm",
}));

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

let root: Root | undefined;
let host: HTMLDivElement;

async function renderBar() {
  host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
  await act(async () => {
    root?.render(<FloatingDemoBar />);
  });
}

function getButtonByText(text: string): HTMLButtonElement | undefined {
  return [...document.querySelectorAll("button")].find(
    (el) => el.textContent?.trim().includes(text)
  );
}

beforeEach(() => {
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  window.localStorage.clear();
});

afterEach(async () => {
  await act(async () => root?.unmount());
  host?.remove();
});

describe("FloatingDemoBar [Task 6]", () => {
  it("renders role switchers and reset button", async () => {
    await renderBar();

    const bodyText = document.body.textContent || "";
    expect(bodyText).toContain("Offline Booth Mode");
    expect(bodyText).toContain("UMKM");
    expect(bodyText).toContain("Kreator");
    expect(bodyText).toContain("Reset Data");
  });

  it("opens confirmation dialog when Reset Data is clicked", async () => {
    await renderBar();

    const resetBtn = getButtonByText("Reset Data");
    expect(resetBtn).toBeDefined();

    await act(async () => {
      resetBtn?.click();
    });

    const bodyText = document.body.textContent || "";
    expect(bodyText).toContain("Reset Seluruh Data Demo Pameran?");
    expect(bodyText).toContain("Ya, Reset Sekarang");
  });

  it("can minimize and restore floating bar", async () => {
    await renderBar();

    const closeBtn = getButtonByText("✕");
    expect(closeBtn).toBeDefined();

    await act(async () => {
      closeBtn?.click();
    });

    // Should now show collapsed pill
    const collapsedBtn = getButtonByText("Demo Booth");
    expect(collapsedBtn).toBeDefined();

    await act(async () => {
      collapsedBtn?.click();
    });

    // Should restore full bar
    expect(document.body.textContent).toContain("Offline Booth Mode");
  });
});
