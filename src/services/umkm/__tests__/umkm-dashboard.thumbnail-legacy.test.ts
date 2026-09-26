import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type { Campaign } from "@/types/umkm-dashboard.types";
import type { CreateCampaignDraftInput } from "@/services/umkm/umkm-appwrite.service";

/**
 * Kepatuhan keputusan produk thumbnail pada jalur SIMPAN (mock/demo store):
 * - Legacy edit tanpa thumbnail → thumbnailUrl tetap "" (dikecualikan).
 * - Legacy menambah thumbnail → tersimpan.
 * - Replace thumbnail → URL baru tersimpan (Model B hapus file lama ada di
 *   lapisan wizard/service — diuji terpisah oleh suite regression).
 *
 * DATA_SOURCE_CONFIG.useMockData dibaca saat modul dievaluasi → stub env +
 * resetModules sebelum import dinamis.
 */

const mem = new Map<string, string>();

const THUMB_A =
  "https://api.example.test/v1/storage/buckets/campaign-assets/files/thumbA/view";
const THUMB_B =
  "https://api.example.test/v1/storage/buckets/campaign-assets/files/thumbB/view";

const baseInput: CreateCampaignDraftInput = {
  title: "Edit judul legacy",
  category: "kuliner",
  type: "ugc",
  description: "Deskripsi produk campaign yang cukup panjang untuk lolos validasi.",
  budget: 100000,
  rewardPer1000Views: 5000,
  claimLimit: 10,
};

const legacyDraft = (thumbnailUrl: string): Campaign =>
  ({
    id: "legacy_cmp_001",
    umkmId: "umkm_001",
    title: "Campaign legacy",
    thumbnailUrl,
    brief: "brief lama",
    externalAssetUrl: "",
    niche: "kuliner",
    status: "draft",
    creatorQuota: 10,
    usedQuota: 0,
    pricePerThousandViews: 5000,
    totalBudgetEscrow: 100000,
    usedBudget: 0,
    remainingBudget: 0,
    totalViews: 0,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  }) as Campaign;

describe("updateCampaignDraft (mock) — keputusan thumbnail legacy/new", () => {
  beforeEach(() => {
    mem.clear();
    vi.stubEnv("NEXT_PUBLIC_USE_MOCK_DATA", "true");
    vi.resetModules();
    vi.stubGlobal("window", {
      localStorage: {
        getItem: (k: string) => mem.get(k) ?? null,
        setItem: (k: string, v: string) => void mem.set(k, v),
        removeItem: (k: string) => void mem.delete(k),
      },
    });
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    vi.resetModules();
  });

  const setup = async (seedCampaign: Campaign) => {
    const { addDemoCampaign } = await import("@/lib/demo/demo-store");
    const svc = await import("@/services/umkm/umkm-dashboard.service");
    addDemoCampaign(seedCampaign);
    return svc;
  };

  it("legacy edit tanpa thumbnail → thumbnailUrl tersimpan tetap kosong", async () => {
    const svc = await setup(legacyDraft(""));
    const res = await svc.updateCampaignDraft("legacy_cmp_001", {
      ...baseInput,
      thumbnailUrl: "",
    });
    expect(res.success).toBe(true);
    if (res.success && res.data) {
      expect(res.data.campaign.thumbnailUrl).toBe("");
    }
  });

  it("legacy menambah thumbnail → thumbnailUrl tersimpan", async () => {
    const svc = await setup(legacyDraft(""));
    const res = await svc.updateCampaignDraft("legacy_cmp_001", {
      ...baseInput,
      thumbnailUrl: THUMB_A,
    });
    expect(res.success).toBe(true);
    if (res.success && res.data) {
      expect(res.data.campaign.thumbnailUrl).toBe(THUMB_A);
    }
  });

  it("replace thumbnail → URL baru tersimpan", async () => {
    const svc = await setup(legacyDraft(THUMB_A));
    const res = await svc.updateCampaignDraft("legacy_cmp_001", {
      ...baseInput,
      thumbnailUrl: THUMB_B,
    });
    expect(res.success).toBe(true);
    if (res.success && res.data) {
      expect(res.data.campaign.thumbnailUrl).toBe(THUMB_B);
    }
  });
});
