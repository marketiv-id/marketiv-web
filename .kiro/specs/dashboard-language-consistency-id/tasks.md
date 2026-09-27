# Implementation Plan: Dashboard Language Consistency (id-ID)

## Progress Record (2026-09-27)

Implementation landed on `main` working tree. Gate results: `npx tsc --noEmit` clean, `npm run build` succeeds, `npx vitest run --fileParallelism=false` reports 81 of 81 test files passing, `npx eslint src` unchanged at 4 errors / 48 warnings (all pre-existing). 150 files touched, 7 dead components deleted.

- **Done:** tasks 1 (verdicts recorded in `glossary.md` and below), 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24.
- **Done with a caveat:** 13.3 and 22.4 (metadata titles). Four route files are `"use client"` and cannot export `metadata` without a structural change that is out of scope: `/dashboard/umkm/keuangan`, `/dashboard/umkm/panduan`, `/dashboard/umkm/campaign/buat`, `/dashboard/umkm/campaign/[campaignId]/edit`. `/dashboard/kreator/panduan` is the same case.
- **Done:** 25.1, 25.2, 25.3, 25.5, 25.6, 25.8 (see the resolution table in `docs/audits/language-baseline-glossary.md`).
- **Pending for the owner:** 25.4 (manual QA pass in the browser using `docs/audits/dashboard-language-manual-qa.md`) and 25.7 (manual browser confirmation). The final gate cannot be self-certified without a human pass.
- **Decisions applied:** D1 `Paket Harga`, D2 `Lowongan`, D3 `Dana Aman`, D4 `Arahan`, D5 `Postingan Kolaborasi`, D6 `Bayar per Tayangan` / `Tarif per 1.000 Tayangan`, D7 `Dashboard` kept, D8 `Draf`, D9 `Tinjauan Pekerjaan`.
- **Follow-up discovered during implementation:** older specs `umkm-dashboard-radix-refactor`, `umkm-layout-system`, and `ui-kit-migration` still list `KPISection.tsx` as a component to migrate. That file was an unrendered prototype leftover and is now deleted; those specs need reconciling.
- **Follow-up discovered:** `routes.umkmSettings` still points at `/dashboard/umkm/settings` while the real route is `/dashboard/umkm/pengaturan` (`src/lib/constants/routes.ts:104`). Out of scope for copy work, still a defect.

## How to read this plan

- Tasks are sequential unless a task states otherwise.
- Every task names its files and ends with `_Requirements: x.y_` traceability tags.
- Every task ends with the same local check: `npx tsc --noEmit` is clean and the touched screen still renders.
- Copy edits only. If a task appears to require a logic change, stop and re-read `design.md` section 9.
- `DECISION` terms (D1-D9 in `requirements.md`) must have a recorded verdict before the task that touches them starts. Tasks that depend on a decision are marked `[BLOCKED: Dn]`.

## Task List

- [ ] 1. Resolve the open terminology decisions (gate)
  - Record a verdict for D1 to D9 from `requirements.md` in `docs/audits/language-baseline-glossary.md`, one line each, with the chosen Indonesian label.
  - Acceptance: the file lists 9 decisions, each with a chosen label and a one-line justification.
  - _Requirements: 10.5_

- [ ] 2. Create the shared label module
  - File: `src/lib/dashboard-labels.ts` (new)
  - 2.1 Implement the interface in `design.md` section 4.1: per-enum label functions, `UNKNOWN_STATUS_LABEL`, and option-list builders.
  - 2.2 Apply the canonical glossary from `requirements.md`, including `OrderStatus.escrow`, `FraudStatus.rejected`, `TransactionStatus.pending/held/refunded`, and `Draft` -> `Draf`.
  - 2.3 Replace every `map[status] || status` fallback with `?? UNKNOWN_STATUS_LABEL`.
  - 2.4 Make `src/lib/umkm-status.ts` and `src/lib/creator-status.ts` re-export from the new module.
  - 2.5 Add unit tests covering: every enum value maps to a non-empty Indonesian string, two dashboards agree for the same value, and an unknown value returns `UNKNOWN_STATUS_LABEL` and never the slug.
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.7, 10.3_

- [ ] 3. Derive filter and option lists from the shared module
  - Files: `src/constants/umkm-dashboard.constants.ts`, `src/components/features/umkm-dashboard/negotiation/negotiation.constants.ts`, `src/components/features/umkm-dashboard/negotiation/negotiation.utils.ts`
  - 3.1 Delete `NEGOTIATION_STATUS_OPTIONS` in `umkm-dashboard.constants.ts` if it has no consumer; otherwise replace its hand-written labels with `getOrderStatusOptions()`.
  - 3.2 Replace the negotiation status filter labels with the derived list.
  - 3.3 Change `CAMPAIGN_STATUS_OPTIONS` `Draft` to `Draf` (or derive it).
  - 3.4 Reconcile `negotiation.utils.ts` stage labels with the derived list so one stage has one word.
  - _Requirements: 1.6, 1.8, 4.3_

- [ ] 4. Shared chrome and pronoun normalization
  - Files: `src/components/features/creator-dashboard/CreatorDashboardSidebar.tsx`, `src/components/features/dashboard/DashboardSidebar.tsx`, `src/components/features/creator-dashboard/CreatorDashboardTopbar.tsx`, `src/components/features/shared/NotificationView.tsx`, `src/components/features/dashboard/shared/LogoutConfirmDialog.tsx`, plus the 11 `kamu` files listed in 4.7
  - 4.1 Fix `CreatorDashboardSidebar.tsx:378` so the unverified state renders a grammatical label instead of `Kreator Akun`.
  - 4.2 Align the home nav item across both sidebars to one word per the glossary.
  - 4.3 Localise creator nav labels per D2, D4-n/a, D9; keep both sidebars symmetric for shared concepts.
  - 4.4 Sync `CreatorDashboardTopbar.tsx:31-32` breadcrumb labels with the sidebar labels.
  - 4.5 Agree the notification role-heading convention between `NotificationView.tsx:42` and `:53`.
  - 4.6 Audit `LogoutConfirmDialog` and `HelpAdminModal` copy.
  - 4.7 Sweep every `kamu` to `Anda`: `SettingsView.tsx` (8), `NegosiasiView.tsx` (4), `src/app/dashboard/kreator/panduan/page.tsx` (3), `PekerjaanAktifView.tsx` (2), `ActiveWorkDetailView.tsx` (2), `PaymentSimulationModal.tsx` (2), `NegosiasiRoomView.tsx` (1), `KeuanganView.tsx` (1), `JobPoolView.tsx` (1), `JobDetailView.tsx` (1), `CreatorDashboardView.tsx` (1). Rewrite the surrounding sentence when a verbatim swap reads badly; do not leave a sentence that was written for an informal pronoun.
  - _Requirements: 4.4, 5.1, 5.2, 8.1, 8.2, 8.3, 8.4, 8.5_

- [ ] 5. Shared state and primitive copy
  - Files: `src/components/features/dashboard/shared/DashboardStateCard.tsx`, `DashboardActionMenu.tsx`, `SearchToolbar.tsx`, `src/components/features/umkm-dashboard/shared/*`, `src/components/features/creator-dashboard/CreatorEmptyState.tsx`, `CreatorErrorState.tsx`
  - 5.1 Audit every default title/description/action label in the shared state components.
  - 5.2 Confirm both `error.tsx` files stay Indonesian (they currently are; keep them as the reference pattern).
  - 5.3 Ensure empty states state the situation and the next action in Indonesian.
  - _Requirements: 7.1, 7.2, 7.3_

- [ ] 6. Creator dashboard: overview and action cards
  - Files: `CreatorDashboardView.tsx`, `CreatorActionCard.tsx`, `CreatorOverviewPageClient.tsx`, `CreatorPageHeader.tsx`
  - 6.1 Localise KPI titles and helper text (`views` -> `tayangan`, `niche` -> `kategori`, `brand` -> `merek`).
  - 6.2 Localise the eyebrow and greeting copy.
  - 6.3 Fix `Kategori Niche Utama` style mixed strings so the whole string is Indonesian.
  - _Requirements: 2.3, 2.4, 6.2_

- [ ] 7. Creator dashboard: job pool and job detail
  - Files: `JobPoolView.tsx`, `JobDetailView.tsx`, `modals/ClaimCampaignModal.tsx`, `modals/ClaimSuccessModal.tsx`
  - 7.1 Replace `Join Campaign` at `JobDetailView.tsx:319` and `Join campaign dulu untuk mulai submit video.` at `:687`.
  - 7.2 Localise `Job Pool` per D2 and `Klaim Job` -> claim of a `Lowongan`.
  - 7.3 Localise `CPM` and `PPV` per D6, keeping the acronym available in a tooltip.
  - 7.4 Localise `footage` and the empty-state CTAs.
  - 7.5 Audit claim flow modal and toast copy.
  - _Requirements: 2.1, 2.2, 2.3, 6.2, 6.5_

- [ ] 8. Creator dashboard: pekerjaan aktif and detail
  - Files: `PekerjaanAktifView.tsx`, `ActiveWorkDetailView.tsx`
  - 8.1 `Payout` -> `Pencairan`; align with the `Keuangan` screen vocabulary.
  - 8.2 `Timeline` -> `Riwayat`; `Read-Only` -> `Hanya Baca`.
  - 8.3 Align `Deadline Terdekat` sort with `Batas Waktu`.
  - 8.4 Localise `endorsement` and `CPM` usage.
  - _Requirements: 2.3, 4.1, 6.2, 6.5_

- [ ] 9. Creator dashboard: negosiasi
  - Files: `NegosiasiView.tsx`, `NegosiasiRoomView.tsx`
  - 9.1 `Kelola order Rate Card` -> `Kelola Pesanan` (plus D1 term); `Order Selesai` -> `Pesanan Selesai`.
  - 9.2 Replace bare `Deliverable` / `Deliverables` / `Kirim Deliverable` with `Hasil Kerja` forms.
  - 9.3 `Custom Offer` -> `Penawaran Khusus`; `Inbox` -> `Kotak Masuk`.
  - 9.4 Localise `Collab Post` per D5.
  - _Requirements: 2.3, 6.2_

- [ ] 10. Creator dashboard: keuangan
  - Files: `KeuanganView.tsx`
  - 10.1 Unify `Wallet` and `Dompet` to the glossary terms (`Saldo` for balance, `Dompet` for container).
  - 10.2 Unify withdrawal wording to one CTA verb and one noun; stop using `Pencairan` for both withdrawal and escrow release.
  - 10.3 Verify every amount uses `formatCurrency` / `formatCompactCurrency` and every count uses `formatCompactViews`.
  - 10.4 Localise `Platform Fee` -> `Komisi Platform` and `Pencairan Escrow` per D3.
  - _Requirements: 2.3, 6.1, 6.2, 6.5_

- [ ] 11. Creator dashboard: rate card
  - Files: `RateCardView.tsx`
  - 11.1 `Draft` -> `Draf` via the shared map (already covered by task 2; verify the view does not hard-code it).
  - 11.2 Localise tier labels `Standard` / `Bundle` / `Exposure` -> `Standar` / `Gabungan` / `Jangkauan`.
  - 11.3 Localise `marketplace` and `Order Jasa Masuk`.
  - 11.4 Apply D1 consistently across the page title, sidebar, and empty states.
  - _Requirements: 2.3, 4.1, 6.2_

- [ ] 12. Creator dashboard: pengaturan
  - Files: `SettingsView.tsx`
  - 12.1 `Password` -> `Kata Sandi`, `Username` -> `Nama Pengguna`, `Thumbnail` -> `Gambar Mini`.
  - 12.2 `Insight` -> `Wawasan`, `Newsletter` -> `Buletin`.
  - 12.3 Fix the lowercase niche values relying on CSS `capitalize` at `:828`; render Title Case Indonesian.
  - 12.4 Audit `Profil Kreator` section copy and notification preference labels.
  - _Requirements: 2.3, 4.3_

- [ ] 13. Creator dashboard: notifikasi, panduan, metadata
  - Files: `src/app/dashboard/kreator/panduan/page.tsx`, `src/app/dashboard/kreator/**/page.tsx`
  - 13.1 `KYC` -> `Verifikasi Identitas`, `dispute` -> `Sengketa`, `auto-approve` -> `Setujui Otomatis`, `withdrawal` -> `Penarikan`, `Refund` -> `Pengembalian Dana`.
  - 13.2 Localise the FAQ headings and body copy; keep the Indonesian gloss for escrow and rate card per `ui-ux/05:150-151`.
  - 13.3 Add `metadata.title` to every creator route using the convention in `design.md` section 7.
  - _Requirements: 2.3, 4.5, 7.4_

- [ ] 14. UMKM dashboard: overview
  - Files: `overview/HeroOverview.tsx`, `CampaignSection.tsx`, `InsightSection.tsx`, `FinancialOverview.tsx`, `QuickActions.tsx`, `ActivityTimeline.tsx`, `UmkmOverviewClient.tsx`
  - 14.1 Resolve the `Draft` / `Konsep` status word per D8 and apply it via the shared map.
  - 14.2 Localise KPI titles, chart legends, and helper text.
  - 14.3 Verify `—` is shown for missing metrics, not `0`.
  - _Requirements: 1.8, 2.3, 6.2, 6.4_

- [ ] 15. UMKM dashboard: campaign list and table
  - Files: `campaign/CampaignsPage.tsx`, `CampaignsHeader.tsx`, `CampaignSummaryCards.tsx`, `CampaignToolbar.tsx`, `CampaignCard.tsx`, `CampaignTable.tsx`, `campaignsEmptyVariants.ts`, `campaign/modals/*`
  - 15.1 `Campaign` -> `Kampanye` in all user-facing strings, including toasts.
  - 15.2 Localise table headers (`Tayangan`, `Bukti Konten`, and remaining English headers).
  - 15.3 Audit modal copy: cancel, duplicate, export, submission detail.
  - _Requirements: 2.3, 2.4, 6.2_

- [ ] 16. UMKM dashboard: campaign detail
  - Files: `campaign/detail/*` (12 files)
  - 16.1 Localise detail header, overview cards, workspace card, quick actions, budget card, health checklist.
  - 16.2 Localise submission section and card, including `Bukti Konten` usage.
  - 16.3 Localise activity timeline labels.
  - 16.4 Localise `CampaignNotFoundState` and skeleton text.
  - _Requirements: 2.3, 7.1, 7.2_

- [ ] 17. UMKM dashboard: create campaign wizard
  - Files: `create-campaign/*` including `steps/*`, `cards/BriefQualityCard.tsx`, `cards/BudgetCalculatorCard.tsx`, `modals/*`
  - 17.1 Drop the `Wizard Campaign` eyebrow; use Indonesian step copy.
  - 17.2 Apply the `Brief` decision (D4) consistently across the wizard, the live preview, and the campaign detail.
  - 17.3 Localise escrow review step copy and the payment simulation modal.
  - 17.4 Localise validation messages surfaced to the user; keep field-level technical validation codes in state.
  - _Requirements: 2.3, 6.2, 7.3_

- [ ] 18. UMKM dashboard: creator directory and detail
  - Files: `creators/CreatorDirectoryPage.tsx`, `CreatorDirectoryHeader.tsx`, `CreatorCard.tsx`, `CreatorSummaryCards.tsx`, `CreatorToolbar.tsx`, `creator.adapter.ts`, `creators/detail/*` (8 files), `creators/modals/StartNegotiationModal.tsx`
  - 18.1 `Creator` -> `Kreator` in every rendered string, including adapter-produced copy.
  - 18.2 `Engagement` -> `Tingkat Keterlibatan`; verify follower counts render through `formatFollowersLabel`.
  - 18.3 Localise `deadline` -> `Batas Waktu` and `scope` -> `Lingkup` in the negotiation modal.
  - 18.4 Audit creator detail hero, stats, portfolio, and social links copy.
  - _Requirements: 2.3, 6.2, 6.4_

- [ ] 19. UMKM dashboard: negosiasi
  - Files: `negotiation/NegotiationHeader.tsx`, `NegotiationListPage.tsx`, `NegotiationSummaryCards.tsx`, `NegotiationToolbar.tsx`, `NegotiationRoomCard.tsx`, `negotiation/detail/*` (13 files), `negotiation/modals/*`
  - 19.1 Align the H1 with the canonical `Negosiasi` noun.
  - 19.2 One vocabulary for negotiation stages, sourced from the shared module.
  - 19.3 Localise `Deliverable` -> `Hasil Kerja`, `Collab Post` per D5, and `Order Summary` -> `Ringkasan Pesanan`.
  - 19.4 Confirm no `kamu` remains in the negotiation screens, including `PaymentSimulationModal.tsx:76,88`.
  - 19.5 Localise escrow status card copy with the D3 term and the `dana ditahan sementara` explanation.
  - _Requirements: 2.3, 5.1, 6.2_

- [ ] 20. UMKM dashboard: rate card review
  - Files: `ratecard-review/RatecardReviewListPage.tsx`, `RatecardReviewDetailPage.tsx`, `src/lib/ratecard-review/review-state.ts`
  - 20.1 Replace `orderStatus.replaceAll("_"," ")` at `RatecardReviewListPage.tsx:203` and `latest.status.replaceAll("_"," ")` at `RatecardReviewDetailPage.tsx:159` with label-map lookups.
  - 20.2 Replace the bare `review.validation.status` render at `RatecardReviewListPage.tsx:204`.
  - 20.3 Localise `Review Pekerjaan` per D9, plus `Latest Deliverable`, `Previous Versions`, `Source`, `Submission`, `Validation`, `Harga order`, `Versi latest`.
  - 20.4 Apply D1 to the review screens.
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 2.3_

- [ ] 21. UMKM dashboard: keuangan
  - Files: `finance/FinanceOverviewPage.tsx`, `FinanceHeader.tsx`, `FinanceSummaryCards.tsx`, `FinanceToolbar.tsx`, `TransactionCard.tsx`, `TransactionTable.tsx`, `TransactionStatusBadge.tsx`, `TransactionHistorySection.tsx`, `EscrowOverviewCard.tsx`, `finance.constants.ts`, `finance.utils.ts`, `finance/modals/*`
  - 21.1 Unify escrow naming across the card, header, and filters per D3; the filter list currently offers both `Escrow` and `Dana Aman`.
  - 21.2 `Mode Paket Harga (Rate Card)` -> one form per D1.
  - 21.3 Localise transaction type and status labels through the shared module.
  - 21.4 Verify every amount uses the money formatters.
  - 21.5 Audit export and pending payment modal copy.
  - _Requirements: 1.1, 2.3, 6.1_

- [ ] 22. UMKM dashboard: analitik, pengaturan, panduan, metadata
  - Files: `analytics/AnalitikClient.tsx`, `PerformanceChart.tsx`, `settings/PengaturanClient.tsx`, `src/app/dashboard/umkm/panduan/page.tsx`, `src/app/dashboard/umkm/**/page.tsx`
  - 22.1 Resolve `Analitik & Insight` against the nav label (`Wawasan` per glossary).
  - 22.2 Localise `Campaign Aktif` / `Semua Campaign` KPI labels and chart legends.
  - 22.3 Audit `panduan` rules and FAQ copy, including `Rate Card Mode` and `Escrow`.
  - 22.4 Add `metadata.title` to every UMKM route using the convention in `design.md` section 7.
  - _Requirements: 2.3, 4.5, 6.2_

- [ ] 23. Remove dead English-copy components
  - Files: `overview/KPISection.tsx`, `campaign/detail/CampaignAssetCard.tsx`, `campaign/modals/AssetPreviewModal.tsx`, `create-campaign/cards/EscrowSimulationCard.tsx`
  - 23.1 Re-run the reference-grep from `design.md` section 3.6 immediately before deleting.
  - 23.2 Delete confirmed-unreferenced files.
  - 23.3 For `CampaignStatusBadge.tsx`, `CampaignProgress.tsx`, `CampaignActionMenu.tsx`: delete, or wire in and translate. Remove their barrel exports from `campaign/index.ts` either way.
  - _Requirements: 9.1, 9.2, 9.3_

- [ ] 24. Update string-asserting tests
  - Files: every test that asserts a changed string, starting with `creator-dashboard/__tests__/*`, `creator-dashboard/__tests__/job-detail-controls.test.tsx`, `umkm-dashboard/creators/__tests__/*`, `umkm-dashboard/campaign/__tests__/*`, `services/umkm/__tests__/*`
  - 24.1 Update assertions to the new copy without weakening what they prove.
  - 24.2 Confirm the honesty assertions survive: `—` for missing data, no fabricated counts.
  - _Requirements: 10.2, 6.4_

- [ ] 25. Final verification gate
  - 25.1 `npx tsc --noEmit` clean.
  - 25.2 `npm run build` succeeds.
  - 25.3 `npm test` passes.
  - 25.4 Grep the two dashboards for each `LOCKED` glossary term and confirm zero remaining user-facing hits.
  - 25.5 Confirm `grep -rn "kamu"` over `src/components/features/creator-dashboard`, `src/components/features/umkm-dashboard`, and `src/app/dashboard` returns nothing.
  - 25.6 Diff `src/types/**`, `src/services/**`, `00_BACKEND/**` and confirm zero changes from this workstream.
  - 25.7 Run the manual QA checklist in `docs/audits/dashboard-language-manual-qa.md`.
  - 25.8 Update `docs/audits/language-baseline-glossary.md` conflict table with the resolutions actually shipped.
  - _Requirements: 10.1, 10.3, 10.4, 10.5_

## Dependency Notes

- Task 1 blocks tasks 7, 11, 14, 17, 19, 20, 21 (every `DECISION` term).
- Task 2 blocks tasks 3 and 20 (shared module must exist before filters and review screens consume it).
- Task 24 depends on tasks 4 to 23; run it after each phase rather than once, to catch drift early.
- Task 25 is the only task allowed to be marked complete without a manual browser pass; it requires one.

## Explicitly Not In This Plan

- Adding an i18n layer or message catalog.
- Renaming route slugs, folders, or files.
- Fixing `routes.umkmSettings` -> `/dashboard/umkm/settings` drift (`src/lib/constants/routes.ts:104`). Recorded as a defect only.
- Translating `admin/`, public routes, auth routes, or `00_BACKEND` function responses.
- Reconciling `docs/marketiv-md/**` documentation wording.
