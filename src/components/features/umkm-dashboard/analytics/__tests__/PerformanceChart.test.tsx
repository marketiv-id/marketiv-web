// @vitest-environment jsdom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { PerformanceChart } from "../PerformanceChart";
import type { Campaign, UmkmDashboardSummary } from "@/types/umkm-dashboard.types";

vi.mock("recharts", async () => {
  const original = await vi.importActual<Record<string, unknown>>("recharts");
  return {
    ...original,
    ResponsiveContainer: ({ children }: { children: React.ReactNode }) => (
      <div style={{ width: 800, height: 300 }} data-testid="mock-responsive-container">
        {children}
      </div>
    ),
  };
});

let root: Root | undefined;
let host: HTMLDivElement;

beforeEach(() => {
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
});

afterEach(async () => {
  await act(async () => root?.unmount());
  host?.remove();
});

describe("PerformanceChart", () => {
  const mockCampaigns: Campaign[] = [
    {
      id: "camp-1",
      umkmId: "umkm-1",
      title: "Promo Sambal Bakar Merdeka",
      brief: "Review jujur sambal bakar pedas nikmat",
      externalAssetUrl: "https://drive.google.com/asset-1",
      thumbnailUrl: "",
      niche: "kuliner",
      status: "active",
      creatorQuota: 5,
      usedQuota: 2,
      pricePerThousandViews: 25000,
      totalBudgetEscrow: 1500000,
      usedBudget: 500000,
      remainingBudget: 1000000,
      totalViews: 45000,
      createdAt: "2026-09-01T00:00:00.000Z",
      updatedAt: "2026-09-01T00:00:00.000Z",
    },
  ];

  const mockSummary: UmkmDashboardSummary = {
    activeCampaigns: 1,
    completedCampaigns: 0,
    totalViews: 45000,
    totalSpent: 500000,
    escrowBalance: 1000000,
    pendingSubmissions: 0,
    activeNegotiations: 0,
  };

  it("renders chart header, metric summary, and default timeframe", async () => {
    await act(async () => {
      root?.render(<PerformanceChart campaigns={mockCampaigns} summary={mockSummary} />);
    });

    const text = host.textContent || "";
    expect(text).toContain("Grafik Performa Views");
    expect(text).toContain("Pertumbuhan tayangan konten & efisiensi kampanye");
    expect(text).toContain("1 Campaign Aktif");
    expect(host.querySelector("[data-testid='mock-responsive-container']")).not.toBeNull();
  });

  it("allows switching timeframe filters (30 Hari, 6 Bulan, 1 Tahun)", async () => {
    await act(async () => {
      root?.render(<PerformanceChart campaigns={mockCampaigns} summary={mockSummary} />);
    });

    const buttons = [...host.querySelectorAll("button")];
    const btn30d = buttons.find((b) => b.textContent?.includes("30 Hari"));
    const btn1y = buttons.find((b) => b.textContent?.includes("1 Tahun"));

    expect(btn30d).toBeDefined();
    expect(btn1y).toBeDefined();

    await act(async () => {
      btn30d?.click();
    });
    expect(btn30d?.className).toContain("text-orange-600");

    await act(async () => {
      btn1y?.click();
    });
    expect(btn1y?.className).toContain("text-orange-600");
  });

  it("renders empty state fallback when no campaigns and zero views exist", async () => {
    await act(async () => {
      root?.render(
        <PerformanceChart
          campaigns={[]}
          summary={{
            activeCampaigns: 0,
            completedCampaigns: 0,
            totalViews: 0,
            totalSpent: 0,
            escrowBalance: 0,
            pendingSubmissions: 0,
            activeNegotiations: 0,
          }}
        />
      );
    });

    const text = host.textContent || "";
    expect(text).toContain("Belum ada tayangan kampanye");
  });
});
