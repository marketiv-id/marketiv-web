# 📐 Design: Campaign Creation Flow Refinements

## 1. System Architecture & Flow Diagrams

### 1.1 Auto-Draft Persistence Lifecycle

```
[ UMKM User Types in Wizard ]
             │
      (500ms Debounce)
             │
             ▼
[ localStorage: marketiv_campaign_wizard_draft_${userId}_${mode} ]
  (mode = "new" OR "${campaignId}")
             │
  ┌──────────┴────────────────────────────────┐
  │ On Page Refresh / Tab Reopen              │ On Publish / Midtrans Payment Initiated
  ▼                                           ▼
[ Check savedAt (< 7 days) ]               [ Clear localStorage Key ]
  ├── Expired / Corrupted ──► Init Fresh Form
  └── Valid ──► Rehydrate Form State + currentStep
                ├── termsAgreed forced to false
                └─► Toast: "Draf lokal dipulihkan" [Hapus Draf]
```

---

### 1.2 Validation Failure & Auto-Scroll Anchor Resolution

```
[ User clicks "Langkah berikutnya" ]
                │
                ▼
      [ validateStep(currentStep) ]
                │
        ├── valid: true ──► Increment currentStep & scrollTo(0, 0)
        │
        └── valid: false
                │
                ├─► setValidationErrors(errs)
                ├─► toast.warning("Harap lengkapi kolom wajib sebelum melanjutkan.")
                ├─► Find first matching key in STEP_FIELD_ANCHORS
                │
                ▼
        [ document.getElementById(targetAnchorId) ]
                │
                ├─► element.scrollIntoView({ behavior: 'smooth', block: 'center' })
                └─► if input/textarea: element.focus({ preventScroll: true })
```

---

## 2. Data Structures & Core Contracts

### 2.1 Auto-Draft Storage Schema (`create-campaign.autodraft.ts`)

```typescript
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
  const scope = campaignId ? campaignId : "new";
  return `marketiv_campaign_wizard_draft_${userId}_${scope}`;
}
```

#### Auto-Draft Hook Interface (`useCampaignAutoDraft`):
```typescript
interface UseCampaignAutoDraftOptions {
  userId?: string;
  campaignId?: string;
  currentStep: number;
  state: CampaignWizardState;
  onRestoreDraft: (restoredState: Partial<CampaignWizardState>, restoredStep: number) => void;
}

export function useCampaignAutoDraft(options: UseCampaignAutoDraftOptions): {
  hasDraft: boolean;
  clearDraft: () => void;
};
```

---

### 2.2 Cloud Storage Whitelist Validator (`campaign.schema.ts`)

```typescript
export const APPROVED_CLOUD_STORAGE_DOMAINS = [
  "drive.google.com",
  "dropbox.com",
  "www.dropbox.com",
  "onedrive.live.com",
  "1drv.ms",
  "sharepoint.com",
] as const;

export function isCloudStorageFolderUrl(urlString: string): boolean {
  if (!urlString || typeof urlString !== "string") return false;
  const trimmed = urlString.trim();
  if (!trimmed.startsWith("https://")) return false;

  try {
    const parsed = new URL(trimmed);
    const host = parsed.hostname.toLowerCase();
    return APPROVED_CLOUD_STORAGE_DOMAINS.some(
      (domain) => host === domain || host.endsWith(`.${domain}`)
    );
  } catch {
    return false;
  }
}
```

Updated Step 3 Zod Schema (`campaignStepSchemas[3]`):
```typescript
3: z.object({
  externalAssetUrl: z
    .string()
    .trim()
    .min(1, "Tautan aset eksternal wajib diisi.")
    .refine((v) => isCloudStorageFolderUrl(v), {
      message: "Tautan harus berupa link folder Google Drive, Dropbox, atau OneDrive (awali https://).",
    }),
}),
```

---

### 2.3 DOM Anchor Registry for Form Fields

```typescript
export const STEP_FIELD_ANCHORS: Record<string, string> = {
  // Step 1: Informasi Produk
  title: "campaign-title",
  category: "field-category",
  type: "field-type",
  description: "campaign-description",
  // Step 2: Brief & Arahan Kreator
  videoStyle: "field-video-style",
  callToAction: "field-call-to-action",
  // Step 3: Tautan Folder Aset
  externalAssetUrl: "external-asset-url",
  // Step 4: Anggaran & Kuota
  pricePerThousandViews: "field-price-per-views",
  creatorQuota: "field-creator-quota",
  totalBudgetEscrow: "field-total-budget",
  // Step 5: Konfirmasi Escrow
  termsAgreed: "field-terms-agreed",
};
```

#### Scroll & Focus Utility (`scrollToFirstInvalidField`):
```typescript
export function scrollToFirstInvalidField(errors: Record<string, string>): void {
  const errorKeys = Object.keys(errors);
  if (errorKeys.length === 0) return;

  for (const key of errorKeys) {
    const anchorId = STEP_FIELD_ANCHORS[key];
    if (!anchorId) continue;
    const element = document.getElementById(anchorId);
    if (element) {
      element.scrollIntoView({ behavior: "smooth", block: "center" });
      if ("focus" in element && typeof (element as HTMLElement).focus === "function") {
        (element as HTMLElement).focus({ preventScroll: true });
      }
      break;
    }
  }
}
```

---

### 2.4 Bidirectional Guideline & Quick Direction Sync (`campaign.schema.ts` & `BriefGuidelineStep.tsx`)

#### Architectural Data Flow:
```
[ User Action / Draft Load ]
             │
             ├── Incoming `requiredPoints` (multiline string)
             │        │
             │        ▼
             │  [ parseRequiredPoints(requiredPoints) ]
             │        │
             │        ├── selectedReqGuidelines: string[] ──► Checkmark chips (✓ Wajib)
             │        ├── selectedRestGuidelines: string[] ──► Checkmark chips (✓ Hindari)
             │        └── customRequiredPoints: string   ──► Textarea (Aturan Tambahan)
             │
             └── Chip Toggle / Custom Text Edit
                      │
                      ▼
                [ syncCombinedRequiredPoints(reqs, rests, custom) ]
                      │
                      ▼
                `requiredPoints` formatted string:
                "- Wajib: <label>\n- Hindari: <label>\n<customText>"
```

#### 2.4.1 Bidirectional Parsing Contract (`parseRequiredPoints`):
```typescript
export interface ParsedRequiredPoints {
  selectedReqGuidelines: string[];
  selectedRestGuidelines: string[];
  customRequiredPoints: string;
}

export function parseRequiredPoints(
  rawText: string,
  knownGuidelines: CreatorGuidelineItem[] = CREATOR_GUIDELINES
): ParsedRequiredPoints {
  const reqLabels = new Set(knownGuidelines.filter((g) => g.type === "required").map((g) => g.label.toLowerCase()));
  const restLabels = new Set(knownGuidelines.filter((g) => g.type === "restriction").map((g) => g.label.toLowerCase()));

  const selectedReq: string[] = [];
  const selectedRest: string[] = [];
  const customLines: string[] = [];

  const lines = (rawText || "").split("\n").map((l) => l.trim()).filter(Boolean);

  for (const raw of lines) {
    const clean = raw.replace(/^[-•*]\s*/, "").trim();
    if (!clean) continue;

    // 1. Check for explicit Wajib prefix or exact preset match
    const reqMatch = clean.match(/^(?:wajib(?:\s+ditampilkan)?)\s*:?\s*(.+)$/i);
    const candidateReq = reqMatch ? reqMatch[1].trim() : clean;
    if (reqLabels.has(candidateReq.toLowerCase())) {
      const canonical = knownGuidelines.find((g) => g.type === "required" && g.label.toLowerCase() === candidateReq.toLowerCase())?.label || candidateReq;
      if (!selectedReq.includes(canonical)) selectedReq.push(canonical);
      continue;
    }

    // 2. Check for explicit Hindari/Dilarang/Jangan prefix or exact preset match
    const restMatch = clean.match(/^(?:hindari|dilarang|jangan)\s*:?\s*(.+)$/i);
    const candidateRest = restMatch ? restMatch[1].trim() : clean;
    if (restLabels.has(candidateRest.toLowerCase())) {
      const canonical = knownGuidelines.find((g) => g.type === "restriction" && g.label.toLowerCase() === candidateRest.toLowerCase())?.label || candidateRest;
      if (!selectedRest.includes(canonical)) selectedRest.push(canonical);
      continue;
    }

    // 3. Line is not a recognized preset chip -> keep as custom rule
    customLines.push(raw);
  }

  return {
    selectedReqGuidelines: selectedReq,
    selectedRestGuidelines: selectedRest,
    customRequiredPoints: customLines.join("\n"),
  };
}
```

#### 2.4.2 Arahan Cepat (Intent Chips) Persistence in `composeBriefDetail`:
```typescript
export function composeBriefDetail(input: {
  brief: string;
  requiredPoints?: string;
  hashtags?: string;
  location?: string;
  assetNotes?: string;
  selectedDirections?: string[];
}): string {
  const sections: string[] = [];
  if (input.brief.trim()) sections.push(input.brief.trim());
  if (input.selectedDirections && input.selectedDirections.length > 0) {
    sections.push(`Arahan Cepat: ${input.selectedDirections.join(", ")}`);
  }
  if (input.requiredPoints?.trim()) sections.push(`Poin Wajib:\n${input.requiredPoints.trim()}`);
  if (input.hashtags?.trim()) sections.push(`Hashtag: ${input.hashtags.trim()}`);
  if (input.location?.trim()) sections.push(`Target Lokasi Kreator: ${input.location.trim()}`);
  if (input.assetNotes?.trim()) sections.push(`Catatan Aset: ${input.assetNotes.trim()}`);
  return sections.join("\n\n").slice(0, 10000);
}
```
`decomposeBriefDetail` handles chunk `chunk.startsWith("Arahan Cepat: ")` and populates `selectedDirections: string[]`. Self-verification is preserved.

---

## 3. Error Handling & Edge Cases

1. **Quota / Privacy Restrictions in `localStorage`**:
   - `localStorage` operations are guarded with `try / catch` blocks. If quota is exceeded or storage is disabled by the browser, operations fail silently without impeding user inputs.
2. **Account Switch & Dirty State**:
   - Keys are explicitly user-scoped (`marketiv_campaign_wizard_draft_${userId}_${mode}`). Logging in as a different user loads only that user's draft.
3. **Legal Invariant: Terms Re-Consent**:
   - `termsAgreed` is excluded from the rehydrated payload (`state: Omit<CampaignWizardState, "termsAgreed">`), ensuring user must actively review and check the escrow terms on Step 5 every session before payment.
4. **Non-Focusable DOM Anchors**:
   - Cards/grid groups (e.g. Category, Video Style) are container elements. `scrollIntoView` brings them into view, and if `focus()` is unavailable on the `div`, it gracefully completes without runtime errors.

---

## 4. Appwrite Backend Data Contract & Schema Parity

Audit terverifikasi terhadap konfigurasi database Appwrite (`00_BACKEND/appwrite.config.json`) dan `src/services/umkm/umkm-appwrite.service.ts`:

### 4.1 Collection: `campaigns`
- **Table ID**: `campaigns`
- **Attributes**:
  - `umkmId` (string, required, length 255)
  - `title` (string, required, length 255)
  - `category` (string, required)
  - `type` (string, required, enum: "ugc" | "clipping")
  - `platforms` (string, required, default: `["tiktok"]`)
  - `description` (string, length 2000)
  - `budget` (integer, required)
  - `rewardPer1000Views` (integer, required)
  - `status` (string, required, `"draft"` | `"active"` | `"paused"` | `"completed"`)
  - `claimLimit` (integer, required)
  - `submissionDays` (integer, default: 7)

### 4.2 Collection: `campaign_briefs`
- **Table ID**: `campaign_briefs`
- **Attributes**:
  - `campaignId` (string, required)
  - `objective` (string, length 2000)
  - `contentAngle` (string, length 2000)
  - `cta` (string, length 1000)
  - `briefDetail` (string, length 10000) — dikelola oleh `composeBriefDetail()`
  - `doAndDont` (string, length 400) — dikelola oleh `packDoAndDontJson()`
  - `generatedByAi` (boolean)

### 4.3 Collection: `campaign_assets`
- **Table ID**: `campaign_assets`
- **Attributes**:
  - `campaignId` (string, required)
  - `source` (string, required, `"external"`)
  - `type` (string, required, `"link"`)
  - `fileUrl` (string, required, length 2048) — diisi dari `externalAssetUrl` hasil validasi Cloud Storage Whitelist
  - `fileName` (string, default: `"Folder Aset Eksternal"`)

### 4.4 Data Boundary & Storage Invariants
1. **No Raw Video in Appwrite Storage**: Appwrite Storage bucket `campaign-assets` dilarang untuk video mentah besar. `externalAssetUrl` wajib berupa URL cloud storage (Google Drive, Dropbox, OneDrive) dan disimpan di collection `campaign_assets`.
2. **Persistence Handshake**:
   - Fase pengisian form: Auto-draft di `localStorage` (mencegah penulisan record sampah di Appwrite saat field belum lengkap).
   - Tombol "Simpan Draft" eksplisit / Pembayaran Midtrans: Menulis dokumen resmi ke Appwrite via `createCampaignDraftInAppwrite()`.
   - Sukses terbit / bayar: `localStorage` otomatis dibersihkan.

