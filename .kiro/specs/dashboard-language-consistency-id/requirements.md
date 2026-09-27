# Requirements Document

## Introduction

This spec defines the **Marketiv Dashboard Language Consistency** workstream for the two authenticated dashboards:

- Creator dashboard: `/dashboard/kreator`
- UMKM dashboard: `/dashboard/umkm`

The dashboards currently mix Bahasa Indonesia with untranslated English nouns, acronyms, and raw backend enum slugs. The same domain concept is often labelled differently on sibling screens, sometimes even inside one screen. Evidence for every claim in this spec is recorded in the three audit documents produced before this spec:

```txt
docs/audits/language-audit-creator-dashboard.md     (486 lines, ~268 flagged strings)
docs/audits/language-audit-umkm-dashboard.md        (502 lines, ~186 flagged strings)
docs/audits/language-baseline-glossary.md           (rules, glossary, conflicts, constraints)
```

This spec is **copy-only**. It does not add features, does not introduce an i18n runtime, and does not rename code identifiers, route slugs, state keys, or backend enums.

## Business Goal

Marketiv already commits to Indonesian as the product language:

> "All user-facing UI copy must use clear Bahasa Indonesia and avoid technical jargon for UMKM-facing flows."
> `docs/marketiv-md/technical-guidelines/08-accessibility-and-content-standards.md:87`

The shipped dashboards do not meet that standard. The goal is a dashboard where a UMKM owner and a micro-creator can read every label without translating English in their head, and where the same concept carries the same word on every screen.

## Scope

### In scope

1. Every user-facing string rendered inside `/dashboard/kreator/**` and `/dashboard/umkm/**`, including the shared chrome these routes render.
2. Strings in: JSX text, `label`, `title`, `description`, `subtitle`, `placeholder`, `aria-label`, `alt`, `helperText`, `emptyTitle`, `emptyDescription`, tooltip text, button text, badge text, tab labels, table headers, KPI titles, chart legends, toast/`sonner` messages, validation messages, and `metadata.title`.
3. The two status label maps: `src/lib/umkm-status.ts` and `src/lib/creator-status.ts`.
4. Rendered status filters and option lists that duplicate those maps, notably `src/constants/umkm-dashboard.constants.ts` and `src/components/features/umkm-dashboard/negotiation/negotiation.constants.ts`.
5. Existing tests that assert exact UI strings for the two dashboards.

### Out of scope

1. Code identifiers, component names, prop names, type names, file names, folder names, route slugs.
2. Backend enum values and any string written to or compared against `state`/`data`. The rule stands: "Jangan pernah menyimpan/membandingkan `"Aktif"`, `"Selesai"`, `"MenungguPembayaran"` di state/data." (`docs/audits/umkm-kreator-integration-design-and-rules.md:79`)
3. An i18n layer, message catalog, or locale switcher. None exists and none is added.
4. The `admin/` app, public marketing routes, auth routes, and `00_BACKEND` cloud functions.
5. Route behavior changes. `routes.umkmSettings` pointing at a non-existent `/dashboard/umkm/settings` is a known bug (`src/lib/constants/routes.ts:104`); it is recorded here as a defect, not silently fixed by copy work.
6. The `docs/marketiv-md/**` documentation set. Documentation drift is recorded in `docs/audits/language-baseline-glossary.md:87,98`, not fixed here.

---

## Terminology Contract

### Canonical glossary

The glossary below is the single normative source for user-facing dashboard copy. Both dashboards MUST use these strings. Column **Status** is `LOCKED` when the Indonesian term is unambiguous and the English source has no product identity attached, and `DECISION` when the term is a feature name or a loanword that the repo previously kept in English.

| Source term | Canonical UI label | Status | Notes |
|---|---|---|---|
| creator | Kreator | LOCKED | Already dominant; `docs/marketiv-md/features/05-creator-dashboard.md:4` |
| campaign | Kampanye | LOCKED | Nav and list already use it; English leaks from toasts, wizard, analytics |
| views | Tayangan | LOCKED | `formatCompactViews` already localises the number |
| deadline | Batas Waktu | LOCKED | `Batas Waktu` filter already exists; replaces `Deadline` |
| submit | Kirim | LOCKED | Verb form. Noun form: Pengiriman |
| pending | Menunggu | LOCKED | Composes with a noun: Menunggu Review, Menunggu Pembayaran |
| draft | Draf | LOCKED | Replaces all three of `Draft`, `Draf`, `Konsep`. `Konsep` is reserved for the user-authored campaign concept, not the status |
| order | Pesanan | LOCKED | `Order` must not survive as a rendered label |
| wallet (balance) | Saldo | LOCKED | `Saldo Dompet Marketiv` pattern |
| wallet (container/noun) | Dompet | LOCKED | `Wallet` must not survive as a rendered label |
| withdrawal | Penarikan | LOCKED | CTA verb form: Tarik Dana |
| refund | Pengembalian Dana | LOCKED | `Refund` as a transaction-type label becomes `Pengembalian Dana` |
| top-up | Isi Saldo | LOCKED | Transaction type |
| platform fee | Komisi Platform | LOCKED | Guideline already says `komisi platform 15%` |
| insight | Wawasan | LOCKED | `Insight & Saran` becomes `Wawasan & Saran` |
| engagement | Tingkat Keterlibatan | LOCKED | `Tingkat Keterlibatan` already exists in `CreatorStatsCards` |
| follower | Pengikut | LOCKED | |
| reach | Jangkauan | LOCKED | |
| impression | Tayangan | LOCKED | Repo does not use `impresi` |
| niche | Kategori | LOCKED | `Kategori Niche Utama` becomes `Kategori Utama` |
| scope | Lingkup | LOCKED | `Lingkup Pekerjaan` already used |
| deliverable | Hasil Kerja | LOCKED | `Setujui Hasil Kerja` already used |
| submission (artifact) | Bukti Konten | LOCKED | |
| submission (act) | Pengiriman | LOCKED | |
| review (noun) | Tinjauan | LOCKED | |
| review (verb) | Tinjau | LOCKED | Replaces `Review Pekerjaan` nav label with `Tinjauan Pekerjaan` |
| settings | Pengaturan | LOCKED | |
| overview (nav home) | Ringkasan | LOCKED | Both sidebars use the same word |
| job (open, unclaimed) | Lowongan | LOCKED | Distinguishes from Pekerjaan (claimed) |
| slot | Kuota | LOCKED | `Slot` is redundant next to `Kuota Kreator` |
| inbox | Kotak Masuk | LOCKED | |
| fraud | Kecurangan | LOCKED | Status label: Terindikasi Kecurangan |
| dispute | Sengketa | LOCKED | |
| password | Kata Sandi | LOCKED | |
| username | Nama Pengguna | LOCKED | |
| thumbnail | Gambar Mini | LOCKED | |
| brand | Merek | LOCKED | |
| support | Bantuan | LOCKED | |
| newsletter | Buletin | LOCKED | |
| marketplace | Toko | LOCKED | |
| read-only | Hanya Baca | LOCKED | |
| auto-approve | Setujui Otomatis | LOCKED | |
| KYC | Verifikasi Identitas | LOCKED | |
| footage | Rekaman | LOCKED | |
| standard / bundle / exposure | Standar / Gabungan / Jangkauan | LOCKED | Rate Card tier labels |
| custom offer | Penawaran Khusus | LOCKED | |
| timeline | Riwayat | LOCKED | |
| valid / invalid (submission) | Disetujui / Ditolak | LOCKED | Render only through the label maps, never the slug |
| collab post | Postingan Kolaborasi | DECISION | Repo already glosses it this way; recommend dropping the English aside |
| brief | Arahan | DECISION | Wizard step 2 already renders `Arahan Konten` / `Arahan Anda`; recommend `Arahan` so the wizard and the job detail agree |
| rate card | Paket Harga | DECISION | Repo has an explicit keep-English rule (`ui-ux/05:134`); wizard and finance already render `Paket Harga`; recommend localising the label and keeping `/rate-card` as the route slug only |
| job pool | Lowongan | DECISION | Recommend nav `Lowongan`, page title `Lowongan Kampanye`; alternatives `Pool Lowongan`, `Pasar Lowongan` |
| escrow | Dana Aman | DECISION | UMKM already brands it `Dana Aman`; Kreator map says `Dana di Escrow`; recommend `Dana Aman` for both, with the explanatory phrase `dana ditahan sementara` on first use per `ui-ux/05:150` |
| campaign mode | Mode Kampanye | DECISION | Product mode name; recommend `Mode Kampanye` |
| rate card mode | Mode Paket Harga | DECISION | |
| PPV | Bayar per Tayangan | DECISION | Acronym is internal media-buying vocabulary; recommend translating and keeping the acronym in a tooltip |
| CPM | Tarif per 1.000 Tayangan | DECISION | Same reasoning as PPV |
| wizard | (omit) | LOCKED | Eyebrow `Wizard Campaign` becomes `Buat Kampanye`; the word carries no meaning for the user |
| dashboard | Dasbor | DECISION | KBBI-correct, but `Dashboard` is near-universal in Indonesian SaaS and appears in spec names and eyebrows. Recommend `Dasbor` only if the product wants a fully monolingual surface; otherwise record `Dashboard` as an accepted loanword |

Terms that MUST remain untranslated because they are proper nouns or platform names: `Marketiv`, `TikTok`, `Instagram`, `Reels`, `P2MW`, `CSV`, and social platform product names. `P2MW` is verified legitimate, not a stray: it is the program name in `src/components/layouts/Footer.tsx:109` and `src/data/chatbotKnowledge.ts:9`.

### Constraint carried forward

`docs/marketiv-md/technical-guidelines/08-accessibility-and-content-standards.md:76-77` requires jargon to be explained rather than assumed: "Do not assume users understand marketplace or escrow terminology. Provide short explanations for campaign, escrow, rate card, and collab post concepts." A locked or decided translation MUST NOT remove the explanation. Where a term is localised, the first occurrence on a screen SHALL carry a short Indonesian gloss.

---

## User Stories

### Story 1: Single source for rendered status labels

**As a** product maintainer, **I want** one place that decides how a backend status is displayed, **so that** a UMKM user and a creator never see two different words for the same state.

Acceptance criteria:

1.1 WHEN the same backend enum value is rendered on the UMKM dashboard and on the Creator dashboard, THEN both SHALL render the identical Indonesian label.
1.2 The `OrderStatus.escrow` value SHALL render the same label on both dashboards. Currently `src/lib/umkm-status.ts:77` renders `Dana Tersimpan Aman` and `src/lib/creator-status.ts:50` renders `Dana di Escrow`.
1.3 The `FraudStatus.rejected` value SHALL render the same label on both dashboards. Currently `src/lib/umkm-status.ts:60` renders `Tidak Valid` and `src/lib/creator-status.ts:42` renders `Terindikasi Fraud`.
1.4 The `TransactionStatus.pending` value SHALL render the same label on both dashboards. Currently `src/lib/umkm-status.ts:102` renders `Menunggu Pembayaran` and `src/lib/creator-status.ts:79` renders `Menunggu Diproses`; the label SHALL be chosen per transaction direction and applied consistently, not per dashboard.
1.5 The `TransactionStatus.held` and `TransactionStatus.refunded` values SHALL render the same label on both dashboards. Currently `Dana Tersimpan Aman` / `Dana Ditahan` and `Dana Dikembalikan` / `Dikembalikan`.
1.6 IF a rendered status filter list or option list exists for an enum, THEN its labels SHALL be derived from the same map used for the badge, and SHALL NOT be hand-written in a second file. Currently `src/constants/umkm-dashboard.constants.ts:18-27` declares a fourth overlapping negotiation status vocabulary whose `escrow` label is the bare English `Escrow`.
1.7 WHEN an unknown enum value reaches a label map, THEN the map SHALL NOT render the raw slug to the user; it SHALL fall back to a neutral Indonesian label and the fallback SHALL be a single shared value, not the `status` variable. The current `return map[status] || status` pattern in both files renders raw slugs such as `pending_payment`.
1.8 `src/lib/creator-status.ts:71` SHALL use the same word for the draft status as the campaign draft status, per the canonical glossary (`Draf`).

### Story 2: No untranslated sentence or CTA

**As a** creator, **I want** every button and message in Indonesian, **so that** I never guess what an action does.

Acceptance criteria:

2.1 WHEN a creator opens a job detail page, THEN the claim CTA SHALL be Indonesian. Currently `src/components/features/creator-dashboard/JobDetailView.tsx:319` renders `Join Campaign`.
2.2 WHEN a creator opens a job detail page without having claimed the job, THEN the blocking hint SHALL be Indonesian. Currently `src/components/features/creator-dashboard/JobDetailView.tsx:687` renders `Join campaign dulu untuk mulai submit video.`
2.3 No user-facing string inside the two dashboards SHALL be a full English sentence, clause, or imperative. Abbreviations, loanwords, and proper nouns from the canonical glossary are exempt.
2.4 WHEN a mixed string exists such as `Kategori Niche Utama`, THEN the English fragment SHALL be replaced so that the whole string is Indonesian.

### Story 3: No raw backend status slug reaches the user

**As a** UMKM owner reviewing work, **I want** status text in Indonesian, **so that** I can act on it.

Acceptance criteria:

3.1 WHEN the rate card review list renders an order status, THEN the label SHALL come from a label map. Currently `src/components/features/umkm-dashboard/ratecard-review/RatecardReviewListPage.tsx:203` renders `review.orderStatus.replaceAll("_", " ")`.
3.2 WHEN the rate card review detail renders a submission status, THEN the label SHALL come from a label map. Currently `src/components/features/umkm-dashboard/ratecard-review/RatecardReviewDetailPage.tsx:159` renders `latest.status.replaceAll("_", " ")`.
3.3 WHEN a validation status is rendered, THEN it SHALL come from a label map. Currently `src/components/features/umkm-dashboard/ratecard-review/RatecardReviewListPage.tsx:204` renders `review.validation.status` directly.
3.4 WHEN any screen renders a status, THEN the string SHALL NOT contain a raw underscore from an enum value.

### Story 4: Consistent casing and label typography

**As a** user, **I want** labels that look like one product, **so that** the dashboard reads as deliberate rather than assembled.

Acceptance criteria:

4.1 WHEN a status badge or chip is rendered, THEN its visible text SHALL use Title Case Indonesian and SHALL NOT be an ALL-CAPS English string. Currently strings such as `JOB TERSEDIA`, `SALDO TERSEDIA`, and `VIEWS PENONTON` exist in the creator dashboard.
4.2 WHERE uppercase styling is a visual device with letter spacing (section eyebrows, table headers), THEN the visual treatment MAY be preserved via CSS `uppercase`, and the source string SHALL be Indonesian Title Case or sentence case.
4.3 WHEN a status filter option is rendered, THEN it SHALL not render a lowercase enum value relying on a CSS `capitalize` class for its visible casing. Currently `src/components/features/creator-dashboard/SettingsView.tsx:828` renders lowercase niche values.
4.4 WHEN a navigation label is rendered, THEN both sidebars SHALL use the same convention for the home item and for shared concepts. The creator sidebar currently uses `Overview` and the UMKM sidebar uses `Dashboard` for the same concept.
4.5 WHEN `metadata.title` is set for a dashboard route, THEN the dashboard routes SHALL use one agreed separator and role suffix convention across all dashboard pages.

### Story 5: One house voice

**As a** user, **I want** the dashboards to address me the same way, **so that** the product sounds like one author.

Acceptance criteria:

5.1 WHEN the interface addresses the user directly, THEN it SHALL use the formal `Anda`, except where a role-specific tone is explicitly documented.
5.2 `kamu` SHALL NOT appear in any user-facing string. It currently appears 26 times across 11 files, of which 23 are in the Creator dashboard: `SettingsView.tsx` (8), `NegosiasiView.tsx` (4), `src/app/dashboard/kreator/panduan/page.tsx` (3), `PekerjaanAktifView.tsx` (2), `ActiveWorkDetailView.tsx` (2), `PaymentSimulationModal.tsx` (2), `NegosiasiRoomView.tsx` (1), `KeuanganView.tsx` (1), `JobPoolView.tsx` (1), `JobDetailView.tsx` (1), `CreatorDashboardView.tsx` (1). For reference, `Anda` appears 90 times in the same tree, so `Anda` is already the house voice and `kamu` is the exception to remove.
5.3 WHEN copy describes an action the user must take, THEN it SHALL follow the microcopy pattern already mandated by `docs/marketiv-md/technical-guidelines/08-accessibility-and-content-standards.md:63-70`: state what happened, then what to do next, in Indonesian.
5.4 Copy SHALL NOT promise viral or guaranteed earning outcomes, per `ui-ux/05:166` and `ui-ux/06:43`.
5.5 Copy SHALL NOT contain unverifiable claim numbers. The existing rule from `.kiro/specs/demo-readiness-p0/bugfix.md:141-145` (`Kreator aktif terverifikasi` instead of `ratusan`/`ribuan`) SHALL be preserved.

### Story 6: Numbers, currency, and dates are consistently localised

**As a** user, **I want** numbers in Indonesian format, **so that** I read them without effort.

Acceptance criteria:

6.1 WHEN a nominal amount is rendered, THEN it SHALL use `formatCurrency`, `formatRupiahInput`, or `formatCompactCurrency` from `src/lib/formatters.ts`.
6.2 WHEN a tayangan count is rendered, THEN it SHALL use `formatCompactViews` and the label SHALL be `tayangan`, not `views`. Any suffix such as `/ 1K views` SHALL become `/ 1.000 tayangan`.
6.3 WHEN a date or a relative time is rendered, THEN it SHALL use `formatDate` or `formatRelativeTime` from `src/lib/formatters.ts`.
6.4 WHEN a follower count or a creator metric has no data, THEN it SHALL render `—` and not `0`, preserving the honesty rule in `src/lib/formatters.ts:50-56`.
6.5 WHEN a percent or rate is rendered, THEN it SHALL use the `id-ID` decimal separator. `CPM (Rate /1K Views)` style labels SHALL be restated as `Tarif per 1.000 Tayangan`.

### Story 7: Every page state has Indonesian copy

**As a** user, **I want** actionable Indonesian copy when a page is loading, empty, or failing, **so that** I know what to do.

Acceptance criteria:

7.1 WHEN a page is loading, THEN its loading state SHALL contain Indonesian description text where it contains text at all.
7.2 WHEN a list is empty, THEN the empty state SHALL state the situation and the next action in Indonesian.
7.3 WHEN an error occurs, THEN the error copy SHALL be Indonesian and SHALL offer a recovery action. The existing `error.tsx` files under both dashboards SHALL be checked for English copy.
7.4 WHEN a destructive or financial action is confirmed, THEN the confirmation copy SHALL name the amount and the consequence, per the financial-copy rule in `docs/marketiv-md/technical-guidelines/08-accessibility-and-content-standards.md:56`.

### Story 8: Shell copy is Indonesian

**As a** user, **I want** the frame around the content to be Indonesian, **so that** navigation is effortless.

Acceptance criteria:

8.1 WHEN the creator sidebar renders the unverified account label, THEN the result SHALL be grammatically correct Indonesian. Currently `src/components/features/creator-dashboard/CreatorDashboardSidebar.tsx:378` composes `Kreator {isVerified ? "Terverifikasi" : "Akun"}`, producing `Kreator Akun`.
8.2 WHEN the topbar renders a breadcrumb, THEN the breadcrumb label SHALL match the sidebar label for the same route, including `Keuangan` and `Pengaturan` referenced in `src/components/features/creator-dashboard/CreatorDashboardTopbar.tsx:31-32`.
8.3 WHEN the notification view renders a role heading, THEN the role suffix convention SHALL be the same for both dashboards. `src/components/features/shared/NotificationView.tsx:42` renders `Notifikasi Kreator` while `:53` renders the bare `Notifikasi`.
8.4 WHEN an accessible name is required, THEN `aria-label`, `alt`, and tooltip text SHALL be Indonesian, and SHALL remain meaningful when the icon is hidden.
8.5 WHEN a logout or account confirmation dialog is rendered, THEN its copy SHALL be Indonesian.

### Story 9: English-only leftovers are removed before they are translated

**As a** maintainer, **I want** unused components to be deleted instead of translated, **so that** the repo does not carry dead copy.

Acceptance criteria:

9.1 The following components SHALL be verified as unreferenced and then deleted, rather than translated: `src/components/features/umkm-dashboard/overview/KPISection.tsx`, `src/components/features/umkm-dashboard/campaign/detail/CampaignAssetCard.tsx`, `src/components/features/umkm-dashboard/campaign/modals/AssetPreviewModal.tsx`, and `src/components/features/umkm-dashboard/create-campaign/cards/EscrowSimulationCard.tsx`. Each is referenced only by itself (see `design.md` verification method).
9.2 `src/components/features/umkm-dashboard/campaign/CampaignStatusBadge.tsx`, `CampaignProgress.tsx`, and `CampaignActionMenu.tsx` SHALL be either wired into a rendered screen or deleted; they are currently exported from `src/components/features/umkm-dashboard/campaign/index.ts` but not rendered by any consumer.
9.3 A deleted component SHALL have its export removed from `src/components/features/umkm-dashboard/campaign/index.ts` in the same change.

### Story 10: The change is verifiable and does not regress behavior

**As a** reviewer, **I want** proof that the revamp changed only copy, **so that** I can approve it confidently.

Acceptance criteria:

10.1 WHEN the copy revamp is complete, THEN `npx tsc --noEmit` SHALL report zero errors and `npm run build` SHALL succeed.
10.2 WHEN a test asserts an exact UI string that the revamp changed, THEN the test SHALL be updated in the same change and SHALL still assert the same behavior.
10.3 WHEN the revamp is complete, THEN no component logic, state shape, prop signature, route, or data contract SHALL have changed.
10.4 WHEN the revamp is complete, THEN a second grep pass over the two dashboards SHALL return zero remaining hits for the English terms listed as `LOCKED` in the canonical glossary, outside code identifiers, route slugs, and `aria-*`-free logic.
10.5 IF a term is marked `DECISION`, THEN the chosen label SHALL be recorded in `docs/audits/language-baseline-glossary.md` before the last affected screen is edited, so the implementation does not fork mid-way.

---

## Open Decisions Required Before Implementation

These are the `DECISION` rows from the canonical glossary. Each needs a one-line product verdict before the corresponding task starts. The recommended default is listed so work can proceed if no objection is raised.

| # | Decision | Recommended default | Why it cannot be decided by the implementer |
|---|---|---|---|
| D1 | `Rate Card` label | `Paket Harga` | It is a feature name, a route slug, and a backend notification type; the repo has an explicit keep-English rule at `ui-ux/05-dashboard-umkm-guidelines.md:134` |
| D2 | `Job Pool` label | `Lowongan` | Feature name; changes the creator IA vocabulary |
| D3 | `Escrow` label | `Dana Aman` | Money-facing; two shipped variants exist and the choice affects trust copy |
| D4 | `Brief` label | `Arahan` | Wizard already uses `Arahan`; the repo doc keeps `Brief` |
| D5 | `Collab Post` label | `Postingan Kolaborasi` | Platform feature name |
| D6 | `PPV` / `CPM` labels | translate, keep acronym in tooltip | Affects whether creators are assumed to know media-buying acronyms |
| D7 | `Dashboard` label | keep `Dashboard`, or `Dasbor` for full localisation | Large surface area; affects eyebrows and spec names |
| D8 | Draft status word | `Draf` | Three shipped variants: `Draft`, `Draf`, `Konsep` |
| D9 | `Review` nav label | `Tinjauan Pekerjaan` | Crosses sidebar, topbar, and rate card review screens |

---

## Glossary (this document)

| Term | Meaning |
|---|---|
| Canonical glossary | The normative label table in the Terminology Contract section |
| Label map | A pure function that converts a backend enum to a display string, e.g. `getCampaignStatusLabel` |
| Slug | A raw backend enum value such as `pending_payment` or `in_progress` |
| LOCKED | A glossary row whose Indonesian label is decided by this spec |
| DECISION | A glossary row that requires an explicit product verdict before implementation |
