// @vitest-environment jsdom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { CreatorActiveWork } from "@/types/creator-dashboard";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn() }),
}));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock("@/services/creator/creator-dashboard.service", () => ({
  getCreatorActiveWorks: vi.fn(async () => ({ success: true, data: [] })),
  submitProof: vi.fn(),
  unclaimActiveWork: vi.fn(),
}));

const baseWork: CreatorActiveWork = {
  id: "claim_1",
  campaignId: "campaign_1",
  title: "Review Jujur Sambal Roa",
  brandName: "Sambal Roa Juara",
  brandAvatar: "",
  brief: "Buat video review 30-60 detik.",
  ratePerThousandViews: 15000,
  status: "submitted",
  claimedAt: "2026-09-20T09:00:00.000Z",
  deadline: "2026-09-28T23:59:59.000Z",
  contentUrl: "https://www.tiktok.com/@riankulineran/video/73918291028",
  submittedAt: "2026-09-23T15:30:00.000Z",
  submissionStatus: "pending",
  actualViews: 0,
};

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
  host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
});

afterEach(async () => {
  await act(async () => root?.unmount());
  host?.remove();
});

describe("ActiveWorkDetailView — tidak mengklaim bukti yang belum divalidasi", () => {
  it("tidak menulis 'Terverifikasi' pada judul bukti tayang di tab Video Kamu", async () => {
    const { ActiveWorkDetailView } = await import("../ActiveWorkDetailView");
    await act(async () => root?.render(<ActiveWorkDetailView work={baseWork} />));

    // Judul bukti tayang berada di tab "video", bukan tab default.
    await act(async () => {
      [...host.querySelectorAll("button")]
        .find((button) => button.textContent?.toLowerCase().includes("video"))
        ?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    const text = host.textContent ?? "";
    expect(text).toContain("Tautan Bukti Tayang");
    expect(text).not.toContain("URL Postingan Terverifikasi");
    expect(text).toContain("Belum diverifikasi");
  });
});
