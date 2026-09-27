// @vitest-environment jsdom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  push: vi.fn(),
  toastSuccess: vi.fn(),
  getUmkmProfile: vi.fn(),
  getCampaignById: vi.fn(),
  getCampaignSubmissions: vi.fn(),
}));

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: mocks.push }) }));
vi.mock("sonner", () => ({ toast: { success: mocks.toastSuccess, error: vi.fn() } }));
vi.mock("@/services/umkm/umkm-dashboard.service", () => ({
  getUmkmProfile: mocks.getUmkmProfile,
  getCampaignById: mocks.getCampaignById,
  getCampaignSubmissions: mocks.getCampaignSubmissions,
  updateCampaignStatus: vi.fn(),
}));
vi.mock("@/components/features/dashboard/UmkmDashboardChrome", () => ({
  UmkmDashboardChrome: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

let root: Root | undefined;
let host: HTMLDivElement;

async function renderPage() {
  const { CampaignDetailPage } = await import("../CampaignDetailPage");
  host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
  await act(async () => root?.render(<CampaignDetailPage campaignId="campaign_1" />));
}

beforeEach(() => {
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  vi.clearAllMocks();
  mocks.getUmkmProfile.mockResolvedValue({
    success: true,
    data: { id: "umkm_1", userId: "umkm_1", businessName: "Dapur Sehat", category: "kuliner", logoUrl: "" },
  });
  mocks.getCampaignById.mockResolvedValue({
    success: true,
    data: {
      id: "campaign_1",
      umkmId: "umkm_1",
      title: "Review Sambal Roa",
      brief: "Brief",
      externalAssetUrl: "",
      thumbnailUrl: "",
      niche: "kuliner",
      status: "active",
      creatorQuota: 3,
      usedQuota: 1,
      pricePerThousandViews: 15000,
      totalBudgetEscrow: 1500000,
      usedBudget: 500000,
      remainingBudget: 1000000,
      createdAt: "2026-09-20T00:00:00.000Z",
      updatedAt: "2026-09-20T00:00:00.000Z",
    },
  });
  mocks.getCampaignSubmissions.mockResolvedValue({ success: true, data: [] });
});

afterEach(async () => {
  await act(async () => root?.unmount());
  host?.remove();
});

async function waitFor(assertion: () => void, timeoutMs = 8000) {
  const deadline = Date.now() + timeoutMs;
  for (;;) {
    await act(async () => {});
    try {
      assertion();
      return;
    } catch (err) {
      if (Date.now() > deadline) throw err;
      await new Promise((resolve) => setTimeout(resolve, 10));
    }
  }
}

describe("Aksi cepat detail campaign", { timeout: 20000 }, () => {
  it("mengarahkan ke halaman keuangan, bukan hanya toast", async () => {
    await renderPage();
    await waitFor(() => expect(host.textContent).toContain("Lihat Riwayat Transaksi"));

    await act(async () => {
      [...host.querySelectorAll("button")]
        .find((button) => button.textContent?.includes("Lihat Riwayat Transaksi"))
        ?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(mocks.push).toHaveBeenCalledWith("/dashboard/umkm/keuangan");
    expect(mocks.toastSuccess).not.toHaveBeenCalledWith("Membuka rekam transaksi escrow...");
  });
});
