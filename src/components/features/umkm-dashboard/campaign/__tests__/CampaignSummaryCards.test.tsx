// @vitest-environment jsdom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { UmkmDashboardSummary } from "@/types/umkm-dashboard.types";

let root: Root | undefined;
let host: HTMLDivElement;

const summary: UmkmDashboardSummary = {
  activeCampaigns: 3,
  completedCampaigns: 1,
  totalViews: 0,
  totalSpent: 0,
  escrowBalance: 0,
  pendingSubmissions: 0,
  activeNegotiations: 0,
  pendingPayments: 2,
};

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

describe("CampaignSummaryCards", () => {
  it("total kampanye hanya menjumlahkan status campaign, bukan jumlah pembayaran", async () => {
    const { CampaignSummaryCards } = await import("../CampaignSummaryCards");
    await act(async () => root?.render(<CampaignSummaryCards summary={summary} />));

    const text = host.textContent ?? "";
    expect(text).toContain("Total Kampanye");
    expect(text).toContain("Aktif & selesai");
    // 3 aktif + 1 selesai = 4; pendingPayments (2) tidak boleh ikut.
    expect(text).not.toContain("Semua status");
    expect(text).toContain("4");
  });
});
