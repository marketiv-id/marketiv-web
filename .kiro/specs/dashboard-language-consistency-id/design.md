# Technical Design Document

## 1. Overview

This design implements `requirements.md` for the two dashboards. The work is a **copy and label-source refactor**, not a feature change. The architectural decision that matters is where the canonical strings live.

Two facts constrain every choice below:

1. **There is no i18n layer.** Copy is hardcoded inline in components. No message catalog, no locale switcher, no `.kiro/steering/**`. A revamp therefore defines *string conventions plus one shared label module*, not a translation runtime.
2. **Data and UI are separated by a hard rule.** Status enums stay English lowercase in state and data (`docs/marketiv-md/database/08-frontend-data-contract.md:17`). Indonesian exists only in presentation maps. `src/lib/umkm-status.ts:9-13` calls itself "SATU-SATUNYA tempat penerjemahan status untuk dashboard UMKM"; `src/lib/creator-status.ts:13-15` is declared its pair.

## 2. Current State vs Target State

```txt
CURRENT
  backend enum ---> [ umkm-status.ts ] ---> UMKM badge label A
                \-> [ creator-status.ts ] --> Creator badge label B      (A != B)
                \-> [ umkm-dashboard.constants.ts ] -> filter label C    (C != A)
                \-> [ negotiation.constants.ts ] ----> filter label D    (D != A, D != C)
                \-> [ RatecardReviewListPage  ] -----> slug.replaceAll("_"," ")
                \-> [ RatecardReviewDetailPage ] ----> slug.replaceAll("_"," ")
                \-> components inline literals ------> "Campaign", "Rate Card", "views"

TARGET
  backend enum ---> [ src/lib/dashboard-labels.ts ] --> one label per enum value
                                                       |
                                                       +--> badges (both dashboards)
                                                       +--> filter/option lists
                                                       +--> rate card review screens
  components -----> inline Indonesian literal (audited against the canonical glossary)
```

The single new architectural element is one shared label module. Everything else is editing existing literals.

## 3. Component Inventory

### 3.1 New

| Path | Purpose |
|---|---|
| `src/lib/dashboard-labels.ts` | Single source of rendered status/option labels for both dashboards. Pure functions, no React, no side effects. |

### 3.2 Modified, shared chrome (rendered by both dashboards)

| Path | Reason |
|---|---|
| `src/components/features/dashboard/DashboardSidebar.tsx` | UMKM nav labels (`SIDEBAR_NAV_ITEMS`, `:69-78`) and footer `Pengaturan` (`:382`) |
| `src/components/features/creator-dashboard/CreatorDashboardSidebar.tsx` | Creator nav labels (`:53-61`), `Overview` label, unverified label bug at `:378` |
| `src/components/features/creator-dashboard/CreatorDashboardTopbar.tsx` | Breadcrumb labels must mirror the sidebar (`:31-32`) |
| `src/components/features/shared/NotificationView.tsx` | Role heading convention (`:42` vs `:53`) |
| `src/components/features/dashboard/shared/LogoutConfirmDialog.tsx` | Confirmation copy |
| `src/components/features/dashboard/shared/DashboardStateCard.tsx` | Shared loading/empty/error shell copy |
| `src/components/features/dashboard/shared/HelpAdminModal.tsx`, `DashboardActionMenu.tsx`, `SearchToolbar.tsx` | Shared strings |

### 3.3 Modified, label sources

| Path | Reason |
|---|---|
| `src/lib/umkm-status.ts` | Align labels, remove slug fallback, adopt `Draf` |
| `src/lib/creator-status.ts` | Align labels with `umkm-status`, translate `TransactionType` labels (`Top-up`, `Refund`, `Platform Fee`, `Pencairan Escrow`) |
| `src/constants/umkm-dashboard.constants.ts` | `CAMPAIGN_STATUS_OPTIONS` `Draft` -> `Draf`; `NEGOTIATION_STATUS_OPTIONS` label `Escrow`; or delete in favour of the shared module |
| `src/components/features/umkm-dashboard/negotiation/negotiation.constants.ts` | Status filters must derive from the shared module |
| `src/components/features/umkm-dashboard/negotiation/negotiation.utils.ts` | Negotiation stage labels currently diverge from the filter list |
| `src/lib/ratecard-review/review-state.ts` | Already owns review `title`/`subtitle`/`description`; becomes the owner of review status labels |

### 3.4 Modified, creator dashboard screens

| Path | Reason |
|---|---|
| `CreatorDashboardView.tsx` | Overview copy, KPI labels, `views`, `niche`, `brand` |
| `CreatorActionCard.tsx` | Action card copy |
| `JobPoolView.tsx` | `Job Pool`, `niche`, empty state CTAs |
| `JobDetailView.tsx` | `Join Campaign` (`:319`), `Join campaign dulu…` (`:687`), `CPM`, `footage` |
| `PekerjaanAktifView.tsx` | `Payout`, `endorsement`, `Batas Waktu` alignment |
| `ActiveWorkDetailView.tsx` | `Timeline`, `Read-Only`, `CPM` |
| `NegosiasiView.tsx` | `Kelola order Rate Card`, `Order Selesai`, `Inbox` tab |
| `NegosiasiRoomView.tsx` | `Deliverable` / `Deliverables` / `Kirim Deliverable`, `Custom Offer` |
| `KeuanganView.tsx` | `Wallet` vs `Dompet`, `Tarik Saldo`, `Pencairan`, `Platform Fee` |
| `RateCardView.tsx` | `Draft`, `Standard`, `Bundle`, `Exposure`, `marketplace`, `Order Jasa Masuk` |
| `SettingsView.tsx` | `Password`, `Username`, `Thumbnail`, `Insight`, `Newsletter`, lowercase niche values (`:828`) |
| `modals/ClaimCampaignModal.tsx`, `modals/ClaimSuccessModal.tsx` | Claim flow copy and toasts |
| `src/app/dashboard/kreator/panduan/page.tsx` | `KYC`, `dispute`, `auto-approve`, `withdrawal` keywords and FAQ copy |
| `src/app/dashboard/kreator/**/page.tsx`, `loading.tsx` | `metadata.title` convention |

### 3.5 Modified, UMKM dashboard screens

| Path | Reason |
|---|---|
| `overview/HeroOverview.tsx`, `CampaignSection.tsx`, `InsightSection.tsx`, `FinancialOverview.tsx`, `QuickActions.tsx`, `ActivityTimeline.tsx`, `UmkmOverviewClient.tsx` | Overview copy, `Konsep` status word, KPI labels |
| `campaign/CampaignsPage.tsx`, `CampaignsHeader.tsx`, `CampaignSummaryCards.tsx`, `CampaignToolbar.tsx`, `CampaignCard.tsx`, `CampaignTable.tsx`, `campaignsEmptyVariants.ts` | `Campaign` -> `Kampanye`, table headers, empty variants |
| `campaign/detail/*` (12 files) | Detail labels, submission section, activity timeline |
| `campaign/modals/ExportReportModal.tsx`, `CancelCampaignModal.tsx`, `DuplicateCampaignModal.tsx`, `SubmissionDetailModal.tsx` | Modal copy |
| `create-campaign/CreateCampaignWizard.tsx`, `CampaignWizardHeader.tsx`, `CampaignWizardStepper.tsx`, `CampaignWizardFooter.tsx`, `CampaignHealthChecklist.tsx`, `CampaignLivePreviewCard.tsx` | `Wizard Campaign` eyebrow, step copy, `Brief` vs `Arahan` |
| `create-campaign/steps/*` (5 files) | Step headings and helper text |
| `create-campaign/cards/BriefQualityCard.tsx`, `BudgetCalculatorCard.tsx` | Card copy |
| `create-campaign/modals/*` (3 files) | Modal copy |
| `creators/CreatorDirectoryPage.tsx`, `CreatorDirectoryHeader.tsx`, `CreatorCard.tsx`, `CreatorSummaryCards.tsx`, `CreatorToolbar.tsx`, `creator.adapter.ts`, `creatorsEmptyState`/`ErrorState` | `Creator` -> `Kreator` including adapter copy |
| `creators/detail/*` (8 files) | Detail labels, stats (`Engagement`), portfolio |
| `creators/modals/StartNegotiationModal.tsx` | `deadline`, `scope` |
| `negotiation/NegotiationHeader.tsx`, `NegotiationListPage.tsx`, `NegotiationSummaryCards.tsx`, `NegotiationToolbar.tsx`, `NegotiationRoomCard.tsx` | H1 vs nav alignment, stage vocabulary |
| `negotiation/detail/*` (13 files) | `Deliverable`, `Collab Post`, escrow copy, `Order Summary` |
| `negotiation/modals/PaymentSimulationModal.tsx` | `kamu` -> `Anda` (`:76,88`) |
| `negotiation/modals/SendCustomOfferModal.tsx` | `deadline`, `scope` |
| `negotiation/modals/OrderSuccessModal.tsx` | Success copy |
| `ratecard-review/RatecardReviewListPage.tsx` | Raw slug renders (`:203-204`), `Review Pekerjaan` |
| `ratecard-review/RatecardReviewDetailPage.tsx` | `Latest Deliverable` (`:156`), `Submission`, `Validation`, `Previous Versions`, `Source` |
| `finance/FinanceOverviewPage.tsx`, `FinanceHeader.tsx`, `FinanceSummaryCards.tsx`, `FinanceToolbar.tsx`, `TransactionCard.tsx`, `TransactionTable.tsx`, `TransactionStatusBadge.tsx`, `TransactionHistorySection.tsx`, `EscrowOverviewCard.tsx`, `finance.constants.ts`, `finance.utils.ts` | Escrow/Dana Aman unification, `Mode Paket Harga (Rate Card)`, transaction labels |
| `finance/modals/TransactionDetailModal.tsx`, `PendingPaymentModal.tsx`, `ExportFinanceReportModal.tsx`, `FinanceActionSuccessModal.tsx` | Modal and export copy |
| `analytics/AnalitikClient.tsx`, `PerformanceChart.tsx` | `Analitik & Insight`, `Campaign` KPI labels, chart legends |
| `settings/PengaturanClient.tsx` | Settings copy |
| `src/app/dashboard/umkm/panduan/page.tsx` | Rules/FAQ copy, `Escrow`, `Rate Card Mode` |
| `src/app/dashboard/umkm/**/page.tsx` | `metadata.title` convention |

### 3.6 Delete

| Path | Evidence |
|---|---|
| `src/components/features/umkm-dashboard/overview/KPISection.tsx` | Only self-reference. English copy inside. |
| `src/components/features/umkm-dashboard/campaign/detail/CampaignAssetCard.tsx` | Only self-reference |
| `src/components/features/umkm-dashboard/campaign/modals/AssetPreviewModal.tsx` | Only self-reference |
| `src/components/features/umkm-dashboard/create-campaign/cards/EscrowSimulationCard.tsx` | Only self-reference |
| `src/components/features/umkm-dashboard/campaign/CampaignStatusBadge.tsx` | Exported from barrel, not rendered. Decide: wire in or delete. |
| `src/components/features/umkm-dashboard/campaign/CampaignProgress.tsx` | Same |
| `src/components/features/umkm-dashboard/campaign/CampaignActionMenu.tsx` | Same |

**Verification method for the delete list.** Each path returned exactly one hit when grepping its own identifier across `src/` (excluding tests). The three barrel-exported files were additionally searched inside `src/components/features/umkm-dashboard/**`, and after excluding `campaign/index.ts` only their own declarations appeared. Command shape:

```bash
grep -rn "<ComponentName>" src --include=*.tsx --include=*.ts | grep -v "__tests__"
```

Re-run this before deletion; a component that gains a consumer between this audit and the task must be translated instead of deleted.

## 4. The Shared Label Module

### 4.1 Interface

```ts
// src/lib/dashboard-labels.ts

import type {
  CampaignStatus, SubmissionStatus, FraudStatus, OrderStatus,
  TransactionStatus, TransactionType, EscrowStatus, ClaimStatus, RateCardStatus,
} from "@/types/umkm-dashboard.types";

/** Fallback rendered when a backend value is not in the map. Never the raw slug. */
export const UNKNOWN_STATUS_LABEL = "Status Tidak Dikenal";

export function getStatusLabel(status: string): string;          // generic entry point
export function getCampaignStatusLabel(status: CampaignStatus): string;
export function getSubmissionStatusLabel(status: SubmissionStatus): string;
export function getFraudStatusLabel(status: FraudStatus): string;
export function getOrderStatusLabel(status: OrderStatus): string;
export function getTransactionStatusLabel(status: TransactionStatus): string;
export function getTransactionTypeLabel(type: TransactionType): string;
export function getEscrowStatusLabel(status: EscrowStatus): string;
export function getClaimStatusLabel(status: ClaimStatus): string;
export function getRateCardStatusLabel(status: RateCardStatus): string;

/** Filter/option lists derived from the same maps, so labels cannot drift. */
export function getOrderStatusOptions(): Array<{ label: string; value: OrderStatus }>;
export function getCampaignStatusOptions(): Array<{ label: string; value: CampaignStatus }>;
```

### 4.2 Rules

1. A label function takes a backend value and returns a display string. It never reads React state and never throws.
2. An unknown value returns `UNKNOWN_STATUS_LABEL`. The current `return map[status] || status` pattern in both existing files leaks slugs such as `pending_payment` to the user.
3. Variant maps (`getOrderStatusVariant`) move unchanged. Badge colour is presentation, not copy.
4. `src/lib/umkm-status.ts` and `src/lib/creator-status.ts` become thin re-export shims during migration, then are removed once every call site imports the shared module. This keeps the change incremental, as the repo requires for UI refactors (`.kiro/specs/ui-kit-migration/design.md:5-6`).
5. The module is server-safe: no `"use client"`, no browser API. It is imported by both server and client components.

### 4.3 Why one module rather than two synchronised files

The audit found four independent vocabularies for the same negotiation stage (`umkm-status.ts`, `creator-status.ts`, `negotiation.constants.ts`, `umkm-dashboard.constants.ts:18-27`). Cross-file equality cannot be enforced by a comment. A single module makes drift impossible by construction, which is requirement 1.1.

## 5. Label Resolution Flow

```txt
                    +--------------------------------------+
                    |  backend enum value (English lower)   |
                    +------------------+-------------------+
                                       |
                     +-----------------v-----------------+
                     | src/lib/dashboard-labels.ts       |
                     |  map[value] ?? UNKNOWN_STATUS_LABEL|
                     +-----------------+-----------------+
                                       |
        +------------------------------+------------------------------+
        |                              |                              |
   DashboardBadge                 Filter option                  Table cell
   (both dashboards)              (derived list)                 (label, not slug)
```

Anti-pattern to remove: `String(status).replaceAll("_", " ")`, `status.replaceAll("_"," ")`, and rendering a bare `status` variable.

## 6. Copy Conventions To Apply At Every Edit Site

### 6.1 Casing

| Surface | Convention | Example |
|---|---|---|
| Nav item, page H1, section heading | Title Case | `Pekerjaan Aktif`, `Tinjauan Pekerjaan` |
| Badge and chip text | Title Case | `Menunggu Review`, `Lowongan Tersedia` |
| Button and CTA | Title Case, action verb first | `Tarik Dana`, `Klaim Lowongan` |
| Table header, eyebrow | Title Case in source, uppercase via CSS | `tayangan` label rendered as `TAYANGAN` by `uppercase tracking-[0.14em]` |
| Helper, description, toast | Sentence case | `Menunggu kreator mengirim hasil kerja.` |
| Status value in source | Title Case, never lowercase-enum-plus-CSS-capitalize | `Kuliner`, not `kuliner` plus `capitalize` |

### 6.2 Microcopy shape

Follow `docs/marketiv-md/technical-guidelines/08-accessibility-and-content-standards.md:63-70`. State the situation, then the next action, both in Indonesian.

```txt
Bad   : "Error"
Good  : "Bukti tayang belum diunggah. Unggah tautan TikTok atau Instagram Reels."
```

### 6.3 Prohibited in new copy

- Direct address other than `Anda` (requirements 5.1 and 5.2). `kamu` currently appears 26 times, 23 of them in the Creator dashboard.
- `ratusan`, `ribuan`, or any unverifiable count (requirement 5.4).
- Viral or guaranteed earning promises (requirement 5.3).
- New English loanwords outside the canonical glossary.
- Chat or contact affordances, which Campaign Mode forbids (`ui-ux/05:35`, `ui-ux/06:95`).

### 6.4 Number and time

Always through `src/lib/formatters.ts`: `formatCurrency`, `formatRupiahInput`, `formatCompactCurrency`, `formatCompactNumber`, `formatCompactViews`, `formatDate`, `formatRelativeTime`. `formatCompactViews` returns Indonesian compact suffixes (`1.2jt`, `45rb`). Unit strings that surround a number are copy and must be Indonesian: `1.000 tayangan`, not `1K views`.

## 7. Metadata and Page Title Design

Current state: only 5 dashboard routes export `metadata.title`, and the separator is inconsistent (`"… — Dashboard Kreator | Marketiv"` on dashboards versus `"… — Marketiv"` on public pages, `src/app/(auth)/login/page.tsx:21`).

Target convention:

```txt
<title>{Page Name} | {Role Dashboard} | Marketiv</title>

/dashboard/kreator/keuangan  ->  "Keuangan | Dashboard Kreator | Marketiv"
/dashboard/umkm/analitik     ->  "Analitik | Dashboard UMKM | Marketiv"
```

Every route listed in `docs/audits/language-baseline-glossary.md:106-143` gets a `metadata.title` using its own visible H1 as the page name, so tab title and heading agree.

Constraint: the em dash currently in use is a deliberate product punctuation choice in existing titles. This design does not mandate converting it; it mandates *one* consistent convention. If the product keeps the em dash, keep it everywhere. If not, use the pipe form above. Whichever is chosen, `docs/audits/language-baseline-glossary.md` records it.

## 8. Error Handling and Edge Cases

| Case | Behaviour |
|---|---|
| Backend returns a status not in the map | Render `UNKNOWN_STATUS_LABEL`. Log nothing in production. Never render the slug. |
| Metric has no data (followers, tayangan, rating) | Render `—`, per `src/lib/formatters.ts:50-56`. Not `0`, not a placeholder number. |
| Copy mentions multiple claims | State the count and the cap together: `Versi 2 dari 3`. |
| Term is `DECISION` and unresolved | Do not edit that string. Leave it and record the pending decision in the requirements Open Decisions table. Partial, honest progress beats forked vocabulary. |
| A test asserts a string being changed | Update the assertion in the same commit. Tests that assert exact copy are listed in `docs/audits/language-baseline-glossary.md:193`. |
| A helper legitimately needs an English technical value | Keep the technical value in `state`, render the Indonesian label in the UI. Example: `MODE_CAMPAIGN` stays as the value, `Mode Kampanye` is the label. |

## 9. Non-Regression Invariants

The following must be true after every task and are re-verified at the final gate.

1. `npx tsc --noEmit` reports zero errors.
2. `npm run build` succeeds.
3. No backend enum value, `state` key, `data` attribute, route slug, or prop signature changes. Diff review of `src/types/**`, `src/services/**`, and `00_BACKEND/**` shows zero changes from this workstream.
4. `String.prototype.replaceAll("_", " ")` no longer appears in any render path under the two dashboards.
5. Both dashboards render the same label for the same enum value.
6. `formatCurrency` and friends remain the only money formatters under the dashboards.
7. Existing behaviour for unknown or empty data is unchanged (`—` for missing metrics).
8. Shared primitives (`DashboardButton`, `DashboardBadge`, `ResponsiveModal`, `SearchToolbar`, `DashboardCard`, `DashboardStateCard`) keep their public APIs; only default or literal copy inside them changes.

## 10. Risks and Sequencing

| Risk | Mitigation |
|---|---|
| Copy edits break string-asserting tests | Run `npm test` after each phase, not only at the end. |
| Two label maps begin to diverge mid-migration | Land `src/lib/dashboard-labels.ts` as task 1, before any screen copy edit. |
| Delete list becomes stale | Re-run the grep in section 3.6 immediately before deleting. |
| `DECISION` terms fork the vocabulary | Gate the tasks that touch them behind an explicit verdict recorded in `docs/audits/language-baseline-glossary.md`. |
| Route constant drift gets encoded into the work | `routes.umkmSettings` -> `/dashboard/umkm/settings` is wrong while the real route is `/pengaturan` (`src/lib/constants/routes.ts:104`). Reference actual slugs only. Reported as a defect, not fixed here. |
| Renaming a button breaks an icon-only fallback | When a label changes, check the `aria-label` and any icon-only variant in the same edit, per `docs/marketiv-md/technical-guidelines/08-accessibility-and-content-standards.md:76`. |

Sequencing summary: shared label module first, then shared chrome, then the two dashboards screen by screen, then metadata, then cleanup and the final gate. `tasks.md` encodes this order with traceability tags.
