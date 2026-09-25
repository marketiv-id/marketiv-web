// @vitest-environment jsdom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { CampaignCard } from "../CampaignCard";
import type { Campaign } from "@/types/umkm-dashboard.types";

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
  }),
}));

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

describe("CampaignCard responsive layout", () => {
  const baseCampaign: Campaign = {
    id: "camp-123",
    umkmId: "umkm-1",
    title: "Review Bakso Granat Spesial",
    brief: "Review jujur konten video reels / tiktok untuk bakso granat pedas",
    externalAssetUrl: "https://drive.google.com/raw-asset",
    thumbnailUrl: "",
    niche: "kuliner",
    status: "active",
    creatorQuota: 6,
    usedQuota: 2,
    pricePerThousandViews: 20000,
    totalBudgetEscrow: 1500000,
    usedBudget: 500000, // 33%
    remainingBudget: 1000000,
    totalViews: 32000,
    createdAt: "2026-09-20T00:00:00.000Z",
    updatedAt: "2026-09-20T00:00:00.000Z",
  };

  it("renders budget progress and percentage badge without breaking", async () => {
    await act(async () => {
      root?.render(
        <CampaignCard
          campaign={baseCampaign}
          pendingCount={0}
          validCount={0}
          onDuplicate={vi.fn()}
          onCancel={vi.fn()}
          onDelete={vi.fn()}
          onPublish={vi.fn()}
          onExport={vi.fn()}
          onEdit={vi.fn()}
        />
      );
    });

    const text = host.textContent || "";
    expect(text).toContain("Anggaran Terpakai");
    expect(text).toContain("Rp 500 rb");
    expect(text).toContain("Rp 1,5 jt");
    expect(text).toContain("33%");
  });

  it("renders validation badges properly in validation row", async () => {
    await act(async () => {
      root?.render(
        <CampaignCard
          campaign={baseCampaign}
          pendingCount={2}
          validCount={4}
          disputeCount={1}
          onDuplicate={vi.fn()}
          onCancel={vi.fn()}
          onDelete={vi.fn()}
          onPublish={vi.fn()}
          onExport={vi.fn()}
          onEdit={vi.fn()}
        />
      );
    });

    const text = host.textContent || "";
    expect(text).toContain("Validasi");
    expect(text).toContain("2 Pending");
    expect(text).toContain("4 Valid");
    expect(text).toContain("1 Sengketa");
  });
});
