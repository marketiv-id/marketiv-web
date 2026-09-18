import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { CampaignWizardState } from "./types";

export interface CampaignWizardDraftPayload {
  version: number;
  userId: string;
  campaignId?: string;
  savedAt: number;
  currentStep: number;
  state: Omit<CampaignWizardState, "termsAgreed">;
}

export const DRAFT_STORAGE_VERSION = 1;
export const DRAFT_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

export function getDraftStorageKey(userId: string, campaignId?: string): string {
  const scope = campaignId && campaignId.trim() ? campaignId.trim() : "new";
  return `marketiv_campaign_wizard_draft_${userId}_${scope}`;
}

function getStorage(): Storage | null {
  if (typeof window !== "undefined" && window.localStorage) {
    return window.localStorage;
  }
  if (typeof localStorage !== "undefined") {
    return localStorage;
  }
  return null;
}

export function saveLocalDraft(
  key: string,
  payload: CampaignWizardDraftPayload
): boolean {
  const storage = getStorage();
  if (!storage) return false;
  try {
    storage.setItem(key, JSON.stringify(payload));
    return true;
  } catch (err) {
    console.warn("[AutoDraft] Failed to save draft to localStorage", err);
    return false;
  }
}

export function loadLocalDraft(key: string): CampaignWizardDraftPayload | null {
  const storage = getStorage();
  if (!storage) return null;
  try {
    const raw = storage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CampaignWizardDraftPayload;

    if (!parsed || typeof parsed !== "object") {
      removeLocalDraft(key);
      return null;
    }

    // Check expiration (7 days)
    if (Date.now() - parsed.savedAt > DRAFT_MAX_AGE_MS) {
      removeLocalDraft(key);
      return null;
    }

    return parsed;
  } catch (err) {
    console.warn("[AutoDraft] Failed to load draft from localStorage", err);
    removeLocalDraft(key);
    return null;
  }
}

export function removeLocalDraft(key: string): void {
  const storage = getStorage();
  if (!storage) return;
  try {
    storage.removeItem(key);
  } catch (err) {
    console.warn("[AutoDraft] Failed to remove draft from localStorage", err);
  }
}

function hasMeaningfulContent(state: CampaignWizardState): boolean {
  return Boolean(
    state.title?.trim() ||
    state.category?.trim() ||
    state.type?.trim() ||
    state.description?.trim() ||
    state.brief?.trim() ||
    state.videoStyle?.trim() ||
    state.callToAction?.trim() ||
    state.externalAssetUrl?.trim() ||
    state.totalBudgetEscrow > 0 ||
    state.pricePerThousandViews > 0 ||
    state.creatorQuota > 0 ||
    (state.selectedDirections && state.selectedDirections.length > 0)
  );
}

export interface UseCampaignAutoDraftOptions {
  userId?: string;
  campaignId?: string;
  currentStep: number;
  state: CampaignWizardState;
  onRestoreDraft: (
    restoredState: Omit<CampaignWizardState, "termsAgreed">,
    restoredStep: number
  ) => void;
  onDiscardDraft?: () => void;
  enabled?: boolean;
}

export function useCampaignAutoDraft({
  userId,
  campaignId,
  currentStep,
  state,
  onRestoreDraft,
  onDiscardDraft,
  enabled = true,
}: UseCampaignAutoDraftOptions) {
  const [hasRestored, setHasRestored] = useState(false);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isDiscardedRef = useRef(false);

  const storageKey = userId ? getDraftStorageKey(userId, campaignId) : null;

  // ── Rehydrate draft on mount ───────────────────────────────────────────────
  useEffect(() => {
    if (!enabled || !storageKey || hasRestored) return;

    const draft = loadLocalDraft(storageKey);
    if (draft && draft.state) {
      onRestoreDraft(draft.state, draft.currentStep || 1);
      toast.info("Draf lokal dipulihkan. Anda dapat melanjutkan pengisian.", {
        duration: 6000,
        action: {
          label: "Hapus Draf",
          onClick: () => {
            clearDraft();
            if (onDiscardDraft) {
              onDiscardDraft();
            }
          },
        },
      });
    }
    setHasRestored(true);
  }, [enabled, storageKey, hasRestored, onRestoreDraft, onDiscardDraft]);

  // ── Debounced auto-save on change ──────────────────────────────────────────
  useEffect(() => {
    if (!enabled || !storageKey || !hasRestored || isDiscardedRef.current) return;

    if (!hasMeaningfulContent(state)) {
      return;
    }

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(() => {
      // Exclude termsAgreed from persistence
      const { termsAgreed: _discard, ...stateToSave } = state;
      const payload: CampaignWizardDraftPayload = {
        version: DRAFT_STORAGE_VERSION,
        userId: userId!,
        campaignId,
        savedAt: Date.now(),
        currentStep,
        state: stateToSave,
      };
      saveLocalDraft(storageKey, payload);
    }, 500);

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [enabled, storageKey, hasRestored, currentStep, state, userId, campaignId]);

  const clearDraft = () => {
    if (storageKey) {
      removeLocalDraft(storageKey);
    }
    isDiscardedRef.current = true;
  };

  return {
    clearDraft,
  };
}
