import { describe, expect, it } from "vitest";
import { SIDEBAR_NAV_ITEMS } from "../DashboardSidebar";

describe("UMKM review navigation", () => {
  it("places Review Pekerjaan next to Negosiasi", () => {
    const labels = SIDEBAR_NAV_ITEMS.map((item) => item.label);
    const negotiationIndex = labels.indexOf("Negosiasi");

    expect(labels[negotiationIndex + 1]).toBe("Tinjauan Pekerjaan");
    expect(SIDEBAR_NAV_ITEMS[negotiationIndex + 1].href).toBe(
      "/dashboard/umkm/review-rate-card",
    );
  });
});
