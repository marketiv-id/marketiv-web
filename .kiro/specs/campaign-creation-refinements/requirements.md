# 📋 Requirements: Campaign Creation Flow Refinements

## 1. Executive Summary & Context

Berdasarkan hasil testing pada alur pembuatan campaign UMKM (`/dashboard/umkm/campaign/buat`), terdapat 3 area perbaikan UX & validasi data:
1. **Kehilangan Input saat Refresh / Tab Tutup**: State wizard hilang saat tab tertutup atau halaman direfresh jika belum klik simpan draft manual.
2. **Validasi URL Aset Terlalu Permisif**: Input "Tautan Folder Foto & Video" menerima sembarang URL HTTPS (contoh YouTube/link umum) padahal aturan sistem mewajibkan folder cloud storage (Google Drive, Dropbox, OneDrive).
3. **Ketiadaan Auto-Scroll saat Validasi Gagal**: Ketika klik "Langkah berikutnya" dengan input wajib yang belum lengkap, pengguna tidak diarahkan secara visual ke elemen formulir yang belum diisi.

Dokumen ini mendefinisikan kontrak fungsional dan kriteria penerimaan RFC 2119 yang telah diselaraskan melalui proses grilling interview.

---

## 2. Terminology & Glossary

| Term | Definition |
|---|---|
| **Wizard State** | Kumpulan nilai formulir 5 langkah pembuatan campaign UMKM (`CampaignWizardState`). |
| **Auto-Draft** | Penyimpanan progres input otomatis ke client `localStorage` debounced 500ms tanpa mengharuskan klik tombol simpan. |
| **Server Draft** | Dokumen campaign di Appwrite Database dengan status `draft` via `createCampaignDraft()`. |
| **Cloud Storage Whitelist** | Daftar 3 domain resmi penyimpanan awan yang diizinkan untuk raw asset: Google Drive, Dropbox, dan OneDrive. |
| **Anchor Element** | Node DOM target yang menerima smooth scroll dan visual focus saat validasi langkah mendeteksi kolom belum terisi. |

---

## 3. Detailed Requirements & RFC 2119 Acceptance Criteria

### Requirement 1: Auto-Draft Persistence (Resilience across Refresh & Tab Close)
**User Story:** As a UMKM owner, I want my campaign form inputs to be automatically saved as I type, so that accidental browser refreshes or tab closures do not cause me to lose my progress.

#### Acceptance Criteria
1. **Debounced Auto-Save:**
   - WHEN the user alters any form field within the campaign wizard, THE SYSTEM SHALL persist the current form state to `localStorage` debounced at 500ms.
   - THE SYSTEM SHALL save the active `currentStep`, `wizardState` (excluding `termsAgreed`), and a timestamp `savedAt`.
2. **User & Entity Scoped Storage Key:**
   - WHERE the user creates a new campaign, THE SYSTEM SHALL use the key:
     `marketiv_campaign_wizard_draft_${userId}_new`
   - WHERE the user is editing an existing draft with a known `campaignId`, THE SYSTEM SHALL use the key:
     `marketiv_campaign_wizard_draft_${userId}_${campaignId}`
   - IF no authenticated user is present, THE SYSTEM SHALL NOT write or restore draft data.
3. **Rehydration on Mount:**
   - WHEN the user opens `/dashboard/umkm/campaign/buat`, IF a valid auto-draft exists in `localStorage` for the current user and context, THE SYSTEM SHALL restore the form fields and active step.
   - THE SYSTEM SHALL force `termsAgreed` to `false` during rehydration to ensure explicit user consent before escrow payment.
   - THE SYSTEM SHALL display a non-intrusive toast notification: `"Draf lokal dipulihkan. Anda dapat melanjutkan pengisian."` with a clickable action button `"Hapus Draf"`.
4. **Draft Expiration:**
   - IF the stored draft has a `savedAt` timestamp older than 7 days, THE SYSTEM SHALL discard the expired draft and initialize a fresh form.
5. **Draft Cleanup:**
   - WHEN the campaign is successfully submitted to the payment gateway / published, THE SYSTEM SHALL immediately remove the corresponding draft key from `localStorage`.
   - WHEN the user clicks `"Hapus Draf"`, THE SYSTEM SHALL clear the draft from `localStorage`, reset form state to default, and notify user via toast.

---

### Requirement 2: Strict Cloud Storage Whitelist Validation for Raw Assets
**User Story:** As an administrator and UMKM owner, I want the external asset URL field to strictly enforce cloud storage folder links (Google Drive, Dropbox, OneDrive), so that creators only receive accessible raw asset repositories rather than invalid links (e.g. YouTube, social media posts).

#### Acceptance Criteria
1. **Domain Whitelist Enforcement:**
   - WHERE the user submits or checks `externalAssetUrl`, THE SYSTEM SHALL validate that the URL begins with `https://` AND its hostname strictly matches one of the approved cloud storage providers:
     - Google Drive: `drive.google.com`
     - Dropbox: `dropbox.com`, `www.dropbox.com`
     - Microsoft OneDrive / SharePoint: `onedrive.live.com`, `1drv.ms`, `sharepoint.com`
2. **Rejection of Non-Cloud URLs:**
   - IF the entered URL belongs to any unapproved domain (including `youtube.com`, `youtu.be`, `tiktok.com`, `instagram.com`, or any generic web URL), THE SYSTEM SHALL fail validation with the exact error message:
     `"Tautan harus berupa link folder Google Drive, Dropbox, atau OneDrive (awali https://)."`
3. **UI Checker Consistency:**
   - WHEN the user clicks "Cek Tautan" in `AssetLinkStep`:
     - IF the domain matches Google Drive, Dropbox, or OneDrive, THE SYSTEM SHALL display a success status badge identifying the specific recognized provider.
     - IF the domain does NOT match an approved cloud provider, THE SYSTEM SHALL display a warning status badge: `"⚠️ Hanya tautan Google Drive, Dropbox, atau OneDrive yang diperbolehkan."`
4. **Zod Schema & UI Parity:**
   - The validation rule in `campaignStepSchemas[3]` in `src/lib/validations/campaign.schema.ts` SHALL enforce the exact same cloud storage domain whitelist, ensuring client-server validation parity.

---

### Requirement 3: Auto-Scroll & Visual Focus on Incomplete Mandatory Fields
**User Story:** As a UMKM owner, when I click "Langkah berikutnya" with incomplete mandatory fields, I want the interface to automatically scroll to the first missing field, so that I can immediately see and correct what was missed without hunting through the page.

#### Acceptance Criteria
1. **Identification of First Defect:**
   - WHEN the user clicks "Langkah berikutnya" and `validateStep(currentStep)` yields validation errors, THE SYSTEM SHALL extract the first invalid field key from `validationErrors` according to the step's field order.
2. **Smooth Viewport Scroll:**
   - THE SYSTEM SHALL execute a smooth scroll to bring the target element or form group into the viewport (`block: 'center'`).
   - THE SYSTEM SHALL ensure adequate clearance for sticky navigation and topbar headers so the field label remains visible.
3. **Focus & Visual Feedback:**
   - IF the target is an HTML input or textarea, THE SYSTEM SHALL invoke `.focus()`.
   - IF the target is a card selection group (such as Kategori Niche, Tipe Campaign, Video Style, CTA), THE SYSTEM SHALL scroll to the container element and ensure the validation error text is visible.
4. **System Toast Notification:**
   - WHEN validation fails on step transition, THE SYSTEM SHALL display a warning toast:
     `"Harap lengkapi kolom wajib sebelum melanjutkan."`

---

### Requirement 4: Two-Way Bidirectional Synchronization for Quick Option Chips & Guidelines
**User Story:** As a UMKM owner, when I select quick direction chips (Arahan Cepat) or creator guidelines (Wajib Ditampilkan / Perlu Dihindari / Aturan Tambahan) and save the draft or refresh the page, I want these selections and custom guidelines to remain selected and populated, so that my work is not lost and subsequent edits do not overwrite existing rules.

#### Acceptance Criteria
1. **Bidirectional Parsing of Creator Guidelines:**
   - WHEN `requiredPoints` is populated (from draft restoration, external prop update, or step revisit), THE SYSTEM SHALL parse the multiline text into:
     - `selectedReqGuidelines: string[]` matching predefined required items (`CREATOR_GUIDELINES` type `"required"`).
     - `selectedRestGuidelines: string[]` matching predefined restriction items (`CREATOR_GUIDELINES` type `"restriction"`).
     - `customRequiredPoints: string` containing all custom lines not matching predefined guidelines.
   - THE SYSTEM SHALL render the matching chips in their active/selected state (`✓ <Label>`) and populate the "Aturan Tambahan (Opsional)" textarea with the custom rules.
2. **Safe Incremental Guideline Toggling:**
   - WHEN the user toggles any guideline chip, THE SYSTEM SHALL recalculate `requiredPoints` while strictly preserving existing custom rules and other active guideline selections.
   - Toggling a chip SHALL NOT wipe or overwrite custom rules previously entered by the user.
3. **Arahan Cepat (Quick Directions) Persistence:**
   - THE SYSTEM SHALL promote `selectedDirections` to `CampaignWizardState` (array of string labels).
   - WHEN the user toggles any quick direction chip (up to 3 items), THE SYSTEM SHALL store `selectedDirections` in the active wizard state and persist it to `localStorage` auto-draft.
   - WHEN the user saves a draft to Appwrite, THE SYSTEM SHALL encode `selectedDirections` in `briefDetail` via `composeBriefDetail` under the section `Arahan Cepat: <item1>, <item2>`, and decode it on rehydrate via `decomposeBriefDetail`.
4. **Step 4 Custom Price Tier Synchronization:**
   - IN `BudgetQuotaStep`, the active state of "Nominal lain" (`customPriceActive`) SHALL stay synchronized with `pricePerThousandViews`. If the restored price does not match preset tiers (3.000, 5.000, 8.000) and is greater than 0, "Nominal lain" SHALL automatically activate and display the custom price input.

---

## 4. Non-Regression Invariants

1. **Campaign Mode Zero-Chat:**
   - No chat, WhatsApp, or revision elements SHALL be introduced into the campaign creation wizard.
2. **Server Draft Coexistence:**
   - The existing manual "Simpan Draft" button and Appwrite backend draft persistence SHALL continue to function seamlessly alongside local auto-drafting.
3. **Legal Consent Invariant:**
   - Rehydrated drafts SHALL NEVER pre-check `termsAgreed = true`.
4. **Form State Integrity:**
   - Debounced writing to `localStorage` SHALL NOT induce input lag or keystroke dropping.

---

## 5. Out of Scope

- Direct multi-gigabyte video file uploads to Appwrite Storage (external cloud drive links remain mandatory).
- Cross-browser cloud synchronization of drafts without server login.
