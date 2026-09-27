// @vitest-environment jsdom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  toastSuccess: vi.fn(),
  toastError: vi.fn(),
  clipboardWrite: vi.fn(async () => {}),
}));

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));
vi.mock("sonner", () => ({ toast: { success: mocks.toastSuccess, error: mocks.toastError } }));
vi.mock("@/services/creator/creator-dashboard.service", () => ({
  getCreatorActiveWorks: vi.fn(async () => ({ success: true, data: [] })),
  claimCampaign: vi.fn(async () => ({ success: true, data: null })),
}));

let root: Root | undefined;
let host: HTMLDivElement;

beforeEach(() => {
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  // Beberapa komponen memanggil matchMedia; jsdom tidak menyediakannya.
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: (query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    }),
  });
  vi.clearAllMocks();
  Object.defineProperty(navigator, "clipboard", {
    configurable: true,
    value: { writeText: mocks.clipboardWrite },
  });
  // Paksa jalur fallback clipboard.
  Object.defineProperty(navigator, "share", { configurable: true, value: undefined });
  host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
});

afterEach(async () => {
  await act(async () => root?.unmount());
  host?.remove();
});

async function renderJobDetail() {
  const [{ JobDetailView }, { mockCreatorJobs }] = await Promise.all([
    import("../JobDetailView"),
    import("@/mocks/creator-dashboard.mock"),
  ]);

  await act(async () => root?.render(<JobDetailView job={mockCreatorJobs[0]} />));
  return mockCreatorJobs[0];
}

describe("JobDetailView — kontrol yang punya perilaku", { timeout: 20000 }, () => {
  it("menyalin tautan campaign saat tombol share ditekan", async () => {
    const job = await renderJobDetail();

    const shareButton = host.querySelector("button[aria-label='Bagikan campaign']");
    expect(shareButton).not.toBeNull();

    await act(async () => {
      shareButton?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(mocks.clipboardWrite).toHaveBeenCalledWith(
      expect.stringContaining(`/dashboard/kreator/job-pool/${job.id}`)
    );
    expect(mocks.toastSuccess).toHaveBeenCalledWith("Tautan campaign disalin.");
  });

  it("tidak menampilkan tombol Urutkan dari yang tidak berfungsi", async () => {
    await renderJobDetail();

    const labels = [...host.querySelectorAll("button")].map((b) => b.textContent ?? "");
    expect(labels.some((label) => label.includes("Urutkan dari"))).toBe(false);
  });
});
