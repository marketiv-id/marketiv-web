import { describe, expect, it } from "vitest";
import { UMKM_CAMPAIGN_EMPTY_VARIANTS } from "../campaignsEmptyVariants";

describe("empty state daftar campaign", () => {
  it("tidak memuat klaim jumlah kreator/UMKM yang tidak bisa diverifikasi", () => {
    const joined = UMKM_CAMPAIGN_EMPTY_VARIANTS.flatMap((variant) => variant.features)
      .join(" | ")
      .toLowerCase();

    expect(joined).toContain("kreator aktif terverifikasi");
    expect(joined).not.toContain("ratusan");
    expect(joined).not.toContain("ribuan");
  });
});
