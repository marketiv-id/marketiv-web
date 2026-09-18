import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  getDraftStorageKey,
  saveLocalDraft,
  loadLocalDraft,
  removeLocalDraft,
  DRAFT_MAX_AGE_MS,
  CampaignWizardDraftPayload,
} from "../create-campaign.autodraft";

describe("create-campaign.autodraft utility", () => {
  const mockUserId = "user_test_123";
  const mockStorage: Record<string, string> = {};

  beforeEach(() => {
    for (const key in mockStorage) {
      delete mockStorage[key];
    }

    vi.stubGlobal("localStorage", {
      getItem: (key: string) => mockStorage[key] || null,
      setItem: (key: string, value: string) => {
        mockStorage[key] = value;
      },
      removeItem: (key: string) => {
        delete mockStorage[key];
      },
    });
  });

  it("generates correct user-scoped keys for new and edit modes", () => {
    expect(getDraftStorageKey(mockUserId)).toBe(
      "marketiv_campaign_wizard_draft_user_test_123_new"
    );
    expect(getDraftStorageKey(mockUserId, "camp_456")).toBe(
      "marketiv_campaign_wizard_draft_user_test_123_camp_456"
    );
  });

  it("saves and loads local draft successfully", () => {
    const key = getDraftStorageKey(mockUserId);
    const payload: CampaignWizardDraftPayload = {
      version: 1,
      userId: mockUserId,
      savedAt: Date.now(),
      currentStep: 2,
      state: {
        title: "Test Campaign",
        category: "kuliner",
        type: "ugc",
        description: "Test description with 30+ characters needed",
        location: "Jakarta",
        brief: "Arahan singkat",
        videoStyle: "edukatif",
        requiredPoints: "- Wajib kemasan",
        callToAction: "Kunjungi toko",
        hashtags: "#kuliner",
        externalAssetUrl: "https://drive.google.com/drive/folders/123",
        assetNotes: "",
        pricePerThousandViews: 5000,
        totalBudgetEscrow: 3000000,
        creatorQuota: 3,
      },
    };

    const saved = saveLocalDraft(key, payload);
    expect(saved).toBe(true);

    const loaded = loadLocalDraft(key);
    expect(loaded).not.toBeNull();
    expect(loaded?.state.title).toBe("Test Campaign");
    expect(loaded?.currentStep).toBe(2);
  });

  it("discards expired drafts older than 7 days", () => {
    const key = getDraftStorageKey(mockUserId);
    const eightDaysAgo = Date.now() - (DRAFT_MAX_AGE_MS + 1000);

    const payload: CampaignWizardDraftPayload = {
      version: 1,
      userId: mockUserId,
      savedAt: eightDaysAgo,
      currentStep: 1,
      state: {
        title: "Old Campaign",
        category: "fashion",
        type: "ugc",
        description: "Old description that has expired",
        location: "",
        brief: "",
        videoStyle: "",
        requiredPoints: "",
        callToAction: "",
        hashtags: "",
        externalAssetUrl: "",
        assetNotes: "",
        pricePerThousandViews: 0,
        totalBudgetEscrow: 0,
        creatorQuota: 0,
      },
    };

    saveLocalDraft(key, payload);

    const loaded = loadLocalDraft(key);
    expect(loaded).toBeNull();
    // Verify it was purged from localStorage
    expect(localStorage.getItem(key)).toBeNull();
  });

  it("removes local draft explicitly", () => {
    const key = getDraftStorageKey(mockUserId);
    const payload: CampaignWizardDraftPayload = {
      version: 1,
      userId: mockUserId,
      savedAt: Date.now(),
      currentStep: 1,
      state: {
        title: "To Be Removed",
        category: "",
        type: "",
        description: "",
        location: "",
        brief: "",
        videoStyle: "",
        requiredPoints: "",
        callToAction: "",
        hashtags: "",
        externalAssetUrl: "",
        assetNotes: "",
        pricePerThousandViews: 0,
        totalBudgetEscrow: 0,
        creatorQuota: 0,
      },
    };

    saveLocalDraft(key, payload);
    expect(loadLocalDraft(key)).not.toBeNull();

    removeLocalDraft(key);
    expect(loadLocalDraft(key)).toBeNull();
  });
});
