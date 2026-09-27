// @vitest-environment jsdom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

let root: Root | undefined;
let host: HTMLDivElement;

beforeEach(() => {
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  // Komponen modal memanggil matchMedia; jsdom tidak menyediakannya.
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
  host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
});

afterEach(async () => {
  await act(async () => root?.unmount());
  host?.remove();
});

async function renderModal() {
  const [{ ClaimCampaignModal }, { mockCreatorJobs }] = await Promise.all([
    import("../modals/ClaimCampaignModal"),
    import("@/mocks/creator-dashboard.mock"),
  ]);

  const onConfirm = vi.fn();
  await act(async () => {
    root?.render(
      <ClaimCampaignModal isOpen job={mockCreatorJobs[0]} onClose={vi.fn()} onConfirm={onConfirm} />
    );
  });
  return onConfirm;
}

function claimButton() {
  return [...document.body.querySelectorAll("button")].find((button) =>
    button.textContent?.includes("Klaim Sekarang")
  );
}

describe("ClaimCampaignModal — ketentuan bisa dipakai dengan keyboard", { timeout: 20000 }, () => {
  it("memakai checkbox asli dan membuka tombol klaim setelah keempatnya dicentang", async () => {
    const onConfirm = await renderModal();

    // Modal Radix merender lewat portal, jadi kueri diarahkan ke document.body.
    const boxes = [...document.body.querySelectorAll<HTMLInputElement>("input[type='checkbox']")];
    expect(boxes).toHaveLength(4);
    expect(claimButton()?.disabled).toBe(true);

    await act(async () => {
      for (const box of boxes) {
        // React memetakan click pada checkbox ke onChange; Space di keyboard
        // juga memicu click, jadi jalur ini mewakili operasi keyboard.
        box.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      }
    });

    expect(claimButton()?.disabled).toBe(false);

    await act(async () => {
      claimButton()?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    expect(onConfirm).toHaveBeenCalledOnce();
  });
});
