// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from "vitest";
import {
  getDemoStore,
  resetDemoStore,
  addDemoCampaign,
  updateDemoCampaignStatus,
  claimDemoJob,
  submitDemoProof,
  unclaimDemoJob,
  createInitialDemoState,
} from "../demo-store";
import { Campaign } from "@/types/umkm-dashboard.types";

describe("Stateful Demo Store (Option A)", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("initializes default Indonesian showcase state when storage is empty", () => {
    const store = getDemoStore();
    expect(store.campaigns.length).toBeGreaterThanOrEqual(4);
    expect(store.campaigns[0].title).toContain("Sambal Roa");
    expect(store.creatorJobs.length).toBe(store.campaigns.length);
    expect(store.creatorActiveWorks.length).toBeGreaterThanOrEqual(2);
    expect(store.umkmProfile.businessName).toBe("Sambal Roa Juara Manado");
    expect(store.creatorProfile.username).toBe("riankulineran");
  });

  it("persists a newly created campaign and mirrors it into Creator Jobs", () => {
    const initial = getDemoStore();
    const newCampaign: Campaign = {
      id: "demo_cmp_new_001",
      umkmId: "umkm_001",
      title: "Promo Spesial Pameran P2MW",
      brief: "Review cemilan khas booth",
      externalAssetUrl: "https://drive.google.com/test",
      thumbnailUrl: "https://images.unsplash.com/test",
      niche: "kuliner",
      status: "active",
      creatorQuota: 5,
      usedQuota: 0,
      pricePerThousandViews: 15000,
      totalBudgetEscrow: 1500000,
      usedBudget: 0,
      remainingBudget: 1500000,
      totalViews: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    addDemoCampaign(newCampaign);

    const reloaded = getDemoStore();
    expect(reloaded.campaigns.length).toBe(initial.campaigns.length + 1);
    expect(reloaded.campaigns[0].id).toBe("demo_cmp_new_001");
    expect(reloaded.creatorJobs.some((j) => j.id === "demo_cmp_new_001")).toBe(true);
  });

  it("updates campaign status across both campaigns and creatorJobs", () => {
    const store = getDemoStore();
    const targetId = store.campaigns[0].id;

    const ok = updateDemoCampaignStatus(targetId, "paused");
    expect(ok).toBe(true);

    const reloaded = getDemoStore();
    expect(reloaded.campaigns.find((c) => c.id === targetId)?.status).toBe("paused");
    expect(reloaded.creatorJobs.find((j) => j.id === targetId)?.status).toBe("paused");
  });

  it("handles claiming job and creating active work record", () => {
    const store = getDemoStore();
    // Cari campaign dengan kuota tersedia
    const available = store.creatorJobs.find((j) => j.usedQuota < j.quota);
    expect(available).toBeDefined();

    const claimResult = claimDemoJob(available!.id);
    expect(claimResult.success).toBe(true);
    expect(claimResult.claimId).toBeDefined();

    const reloaded = getDemoStore();
    const updatedJob = reloaded.creatorJobs.find((j) => j.id === available!.id);
    expect(updatedJob?.usedQuota).toBe(available!.usedQuota + 1);

    const newActiveWork = reloaded.creatorActiveWorks.find((w) => w.id === claimResult.claimId);
    expect(newActiveWork).toBeDefined();
    expect(newActiveWork?.status).toBe("claimed");
  });

  it("rejects claim when campaign quota is already full", () => {
    const store = getDemoStore();
    // demo_cmp_004 has usedQuota === quota
    const fullJob = store.creatorJobs.find((j) => j.usedQuota >= j.quota);
    expect(fullJob).toBeDefined();

    const result = claimDemoJob(fullJob!.id);
    expect(result.success).toBe(false);
    expect(result.error).toContain("penuh");
  });

  it("submits proof and updates status to submitted", () => {
    const store = getDemoStore();
    const claimedWork = store.creatorActiveWorks.find((w) => w.status === "claimed");
    expect(claimedWork).toBeDefined();

    const proofUrl = "https://www.tiktok.com/@riankulineran/video/123456789";
    const result = submitDemoProof(claimedWork!.id, proofUrl);
    expect(result.success).toBe(true);

    const reloaded = getDemoStore();
    const updated = reloaded.creatorActiveWorks.find((w) => w.id === claimedWork!.id);
    expect(updated?.status).toBe("submitted");
    expect(updated?.contentUrl).toBe(proofUrl);
    expect(updated?.submissionStatus).toBe("pending");
  });

  it("unclaims job and restores quota", () => {
    const store = getDemoStore();
    const claimedWork = store.creatorActiveWorks.find((w) => w.status === "claimed");
    expect(claimedWork).toBeDefined();

    const beforeJob = store.creatorJobs.find((j) => j.id === claimedWork!.campaignId);
    const beforeQuota = beforeJob?.usedQuota ?? 0;

    const result = unclaimDemoJob(claimedWork!.id);
    expect(result.success).toBe(true);

    const reloaded = getDemoStore();
    expect(reloaded.creatorActiveWorks.some((w) => w.id === claimedWork!.id)).toBe(false);
    const afterJob = reloaded.creatorJobs.find((j) => j.id === claimedWork!.campaignId);
    if (beforeQuota > 0) {
      expect(afterJob?.usedQuota).toBe(beforeQuota - 1);
    }
  });

  it("resets state to pristine seed on resetDemoStore", () => {
    // Tambah data palsu
    addDemoCampaign({
      id: "fake_cmp",
      umkmId: "umkm_001",
      title: "Sampah Testing",
      brief: "Brief sampah",
      externalAssetUrl: "",
      thumbnailUrl: "",
      niche: "kuliner",
      status: "draft",
      creatorQuota: 1,
      usedQuota: 0,
      pricePerThousandViews: 1000,
      totalBudgetEscrow: 100000,
      usedBudget: 0,
      remainingBudget: 0,
      totalViews: 0,
      createdAt: "",
      updatedAt: "",
    });

    expect(getDemoStore().campaigns.some((c) => c.id === "fake_cmp")).toBe(true);

    resetDemoStore();

    const fresh = getDemoStore();
    expect(fresh.campaigns.some((c) => c.id === "fake_cmp")).toBe(false);
    expect(fresh.campaigns.length).toBe(createInitialDemoState().campaigns.length);
  });
});
