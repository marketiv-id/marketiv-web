import { describe, expect, it, vi } from "vitest";
import { renderToString } from "react-dom/server";
import type { Campaign } from "@/types/umkm-dashboard.types";
import { CampaignDetailHeader } from "../CampaignDetailHeader";

vi.mock("next/link", () => ({
  default: ({
    children,
    href,
    ...props
  }: React.AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

const baseCampaign: Campaign = {
  id: "campaign-1",
  umkmId: "umkm-1",
  title: "Campaign Test",
  brief: "Brief",
  externalAssetUrl: "",
  thumbnailUrl: "",
  niche: "kuliner",
  status: "draft",
  creatorQuota: 10,
  usedQuota: 0,
  pricePerThousandViews: 10000,
  totalBudgetEscrow: 100000,
  usedBudget: 0,
  remainingBudget: 100000,
  createdAt: "2026-08-14T00:00:00.000Z",
  updatedAt: "2026-08-14T00:00:00.000Z",
};

function renderHeader(status: Campaign["status"]) {
  return renderToString(
    <CampaignDetailHeader
      campaign={{ ...baseCampaign, status }}
      onCancelClick={() => undefined}
      onExportClick={() => undefined}
      onEditClick={() => undefined}
    />
  );
}

describe("CampaignDetailHeader", () => {
  it("shows stop action only for active campaign", () => {
    expect(renderHeader("draft")).not.toContain("Hentikan Sementara Kampanye");
    expect(renderHeader("paused")).not.toContain("Hentikan Sementara Kampanye");
    expect(renderHeader("completed")).not.toContain("Hentikan Sementara Kampanye");
    expect(renderHeader("active")).toContain("Hentikan Sementara Kampanye");
  });

  it("keeps primary action aligned with campaign status", () => {
    expect(renderHeader("draft")).toContain("Lanjutkan Draf");
    expect(renderHeader("paused")).toContain("Aktifkan Kembali Kampanye");
    expect(renderHeader("active")).toContain("Unduh Laporan Kampanye");
  });
});
