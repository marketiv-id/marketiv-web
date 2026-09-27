# Audit UMKM Dashboard — Kesiapan Integrasi Appwrite

Static audit date: 2026-07-19

Audit ini bersifat **documentation-only** — tidak ada refactor UI, perubahan logika bisnis, integrasi backend, atau perubahan route yang dilakukan. Dokumen ini terpisah dari audit Kreator Dashboard (`docs/audits/kreator-dashboard-appwrite-integration-readiness.md`) dan tidak digabung.

Source of truth kontrak backend adalah `00_BACKEND` (kode `.ts` + docs modul). `docs/marketiv-md/` **tidak dipakai** sebagai acuan dalam audit ini.

```txt
00_BACKEND/src/services/*.ts
00_BACKEND/src/lib/appwrite/*
00_BACKEND/docs/02_Modules/{Campaigns,Offers,Orders,Payments,RateCards,Users,Authentication,Chat,Notifications,AI}/**
00_BACKEND/docs/01_Global/{20_Coding_Standards,40_Folder_Structure,60_Error_Handling,90_Design_System}.md
00_BACKEND/docs/03_Workflows/{20_Campaign_PPV,30_RateCard_Order,40_Submission_Fraud,50_Withdrawal,60_Dispute}.md
00_BACKEND/docs/00_Project/{40_Tech_Stack,50_Project_Rules}.md
.claude/skills/marketiv-data-contracts/SKILL.md
.claude/skills/marketiv-appwrite-integration/SKILL.md
```

Priority legend:

- P0 = memblokir integrasi backend / menyebabkan data salah
- P1 = inkonsistensi teknis yang harus dibereskan sebelum replace mock
- P2 = perlu dikerjakan selama proses integrasi per modul
- P3 = polish / lanjutan setelah integrasi berjalan

---

## 1. Ringkasan Eksekutif

- **UI slicing UMKM Dashboard mayoritas selesai penuh** (7 dari 9 modul), namun **kualitas kesiapan integrasinya tidak merata**: dua modul (Overview, Creators) **mem-bypass service layer sepenuhnya** dan membaca data hardcoded dari `src/data/*`, satu modul (Analytics) murni statis tanpa state, dan satu modul (Settings) hanya fake-save via toast.
- **Integrasi backend 0%.** Seluruh 16 fungsi di `src/services/umkm/umkm-appwrite.service.ts` adalah stub `"Not implemented"` — tidak ada satu pun import `databases`/`Query`/`account`. Aplikasi berjalan dalam mode mock secara default (`src/config/data-source.config.ts` → mock aktif saat `NEXT_PUBLIC_USE_MOCK_DATA` `"true"` **atau undefined**).
- **Temuan paling berbahaya: tiga vokabulari status yang saling bertentangan** di `src/types/` (`umkm-dashboard.types.ts` English lowercase, `status.ts` Indonesia PascalCase yang mengklaim "match Appwrite schema" padahal match spec lama yang sudah deprecated, dan `umkmDashboard.ts` Indonesia versi lama). Tidak satu pun cocok 100% dengan enum backend nyata (mis. frontend punya `"full"`, backend punya `"paused"`).
- **Tidak ada auth/session/role guard sama sekali** — bahkan tidak ada `layout.tsx` untuk segment `src/app/dashboard/umkm/**`, sehingga tidak ada boundary untuk guard role UMKM.
- **Semua aksi tulis adalah simulasi lokal** (`setTimeout` + mutasi state + toast): submit wizard campaign, review submission, cancel/duplicate campaign, kirim pesan/offer, bayar escrow, simpan settings — tidak ada satu pun yang memanggil service.
- **Backend `00_BACKEND` sebagian besar siap** untuk kebutuhan UMKM (campaign create/publish, payment top-up, wallet, user profile, AI brief via Function `ai-brief` dengan Gemini), tetapi punya gap method yang harus ditambah: tidak ada `topUpCampaign` di campaign.service (jalur resminya `payment.service.createPayment purpose:'campaign'`), tidak ada CRUD `campaign_assets`, tidak ada `getConversations` (list chat), tidak ada read method untuk offers, tidak ada `getOrderById`/`getDeliverables`/`getRevisions`, dan tidak ada backend Analytics sama sekali.

---

## 2. Status Progress per Modul

| # | Modul | Status | File terkait (utama) |
|---|---|---|---|
| 1 | Overview | UI selesai penuh — **tapi bypass service layer** | `src/app/dashboard/umkm/page.tsx` (85 baris, server component); `src/components/features/umkm-dashboard/overview/` — `UmkmOverviewClient.tsx`, `CampaignSection.tsx` (432), `InsightSection.tsx` (310), `FinancialOverview.tsx` (264), `ActivityTimeline.tsx` (260), `KPISection.tsx` (214), `QuickActions.tsx` (201), `HeroOverview.tsx` (160) |
| 2 | Campaign list & detail | UI selesai penuh — state handling terbaik di seluruh UMKM | `campaign/CampaignsPage.tsx` (297), `campaign/detail/CampaignDetailPage.tsx` (270), `CampaignWorkspaceCard.tsx` (336), 35 file total incl. `modals/**`, skeleton/empty/error lengkap |
| 3 | Create Campaign Wizard | UI selesai penuh — **submit 100% simulasi** | `create-campaign/CreateCampaignWizard.tsx` (355), 5 step di `steps/**`, `create-campaign.validation.ts` (63), `constants.ts`, `cards/BriefQualityCard.tsx` (80), `modals/PaymentSimulationModal.tsx` (129); route `campaign/buat/page.tsx` |
| 4 | Creators / Rate Card directory | UI selesai penuh — **bypass service, data difabrikasi inline** | `creators/CreatorDirectoryPage.tsx` (102), `detail/CreatorDetailPage.tsx` (102), `CreatorCard.tsx` (429), `detail/RateCardPackagesSection.tsx` (139), `modals/StartNegotiationModal.tsx` (255), 19 file |
| 5 | Negotiation | UI selesai penuh — interaksi simulasi lokal berat | `negotiation/detail/NegotiationRoomPage.tsx` (421), `NegotiationListPage.tsx` (146), `MessageComposer.tsx` (204), `modals/SendCustomOfferModal.tsx` (165), 29 file |
| 6 | Finance / Escrow / Wallet | UI selesai penuh — fetch nyata via service | `finance/FinanceOverviewPage.tsx` (320), `modals/**` (4 modal), `finance.utils.ts`, skeleton/empty/error lengkap; route `keuangan/page.tsx` |
| 7 | Analytics | **Ada tapi belum matang** — komponen presentasional statis | `analytics/AnalitikClient.tsx` (258); route `analitik/page.tsx` (5 baris) |
| 8 | Settings | UI selesai sebagian — form lengkap, **persistence fake** | `settings/PengaturanClient.tsx` (366); route `pengaturan/page.tsx` (5 baris) |
| 9 | Shared primitives UMKM | Ada — **5 fork divergen** dari `dashboard/shared` | `umkm-dashboard/shared/` — `DashboardBadge.tsx` (108), `DashboardMetricCard.tsx` (124), `DashboardActionMenu.tsx` (81), `DashboardProgress.tsx` (56), `ResponsiveDataRow.tsx` (43), `UmkmPageWrapper.tsx` (44), 2 re-export shim |

Catatan route-level:

- Tidak ada `layout.tsx` untuk segment UMKM — setiap page membungkus diri dengan `UmkmDashboardChrome` sendiri-sendiri; tidak ada tempat untuk role guard terpusat.
- Tidak ada `loading.tsx` di seluruh `src/app/dashboard/umkm/**`. Satu-satunya boundary: `src/app/dashboard/umkm/error.tsx` (28 baris).
- Route `analitik/page.tsx` dan `pengaturan/page.tsx` mengirim `businessName="Dapur Sehat Sukabumi"` hardcoded, tidak memanggil `getUmkmProfile()`.

---

## 3. Inventarisasi Mock Data

### 3a. Store mock resmi (dikonsumsi via service layer)

| Modul | File | Isi |
|---|---|---|
| Campaign | `src/mocks/umkm/campaigns.mock.ts` (185) | `mockCampaigns` |
| Campaign | `src/mocks/umkm/submissions.mock.ts` (236) | `mockSubmissions` |
| Negotiation | `src/mocks/umkm/negotiations.mock.ts` (125) | `mockNegotiations` |
| Negotiation | `src/mocks/umkm/messages.mock.ts` (178) | `mockChatMessages` (keyed `orderId`) |
| Finance | `src/mocks/umkm/transactions.mock.ts` (243) | `mockTransactions` (21 transaksi) |
| Overview (summary) | `src/mocks/umkm/dashboard-summary.mock.ts` (44) | `getCalculatedDashboardSummary()` |
| Profil | `src/mocks/umkm/profile.mock.ts` (13) | `mockUmkmProfile` |
| Creators — **dead code** | `src/mocks/umkm/creators.mock.ts` (261) | `mockCreators` — **tidak dikonsumsi UI mana pun** |
| Rate cards — **dead code** | `src/mocks/umkm/rate-cards.mock.ts` (145) | `mockRateCardPackages` — **tidak dikonsumsi UI mana pun** |

### 3b. Store mock paralel yang mem-bypass service (harus dihapus saat integrasi)

| Modul | File | Lokasi/section | Jenis data |
|---|---|---|---|
| Overview | `src/data/umkmDashboard.ts` (106) | diimport `page.tsx:2` | `UMKM_DASHBOARD_MOCK_DATA` seluruh data overview |
| Overview | `src/app/dashboard/umkm/page.tsx` | baris 10–77 | `mapCampaignsFromDashboardData()` — 3 campaign fiktif hardcoded (campaign 2 & 3 literal, bukan derivasi data) |
| Creators | `src/data/creators.ts` (116) | diimport `CreatorDirectoryPage.tsx:5`, `CreatorDetailPage.tsx:5` | `dummyCreators` seluruh direktori kreator |

### 3c. Mock/fabrikasi inline di komponen

| Modul | File | Lokasi | Jenis data |
|---|---|---|---|
| Overview | `UmkmOverviewClient.tsx` | baris 43, 49 | fallback hero hardcoded `"2.4jt"` / `"Rp 12.5 jt"` |
| Overview | `KPISection.tsx` | baris 125, 135, 145 | fallback KPI `?? 5`, `?? 18`, `?? 28` |
| Creators | `detail/CreatorStatsCards.tsx` | baris 8–14 | statistik difabrikasi aritmetika `parseInt(creatorId)` (`// Vary statistics mockup based on id`) |
| Creators | `detail/RateCardPackagesSection.tsx` | baris 14–40+ | `getPackages(category)` — paket rate card hardcoded per niche (mis. `"Rp 1.200.000"`) |
| Creators | `detail/CreatorPortfolioSection.tsx` | baris 12–13 | `// Mock portfolio item details` array hardcoded |
| Creators | `detail/CreatorSocialLinksCard.tsx` | baris 10 | array `channels` hardcoded |
| Negotiation | `detail/NegotiationRoomPage.tsx` | baris 72–118 | special-case `orderId === "rc-offer-simulated"` → order + pesan dibangun inline (kreator "Ahmad Fauzi", `finalPrice: 1500000`) |
| Wizard | `CreateCampaignWizard.tsx` | baris 50–52 | seed default `pricePerThousandViews=5000`, `totalBudgetEscrow=3200000`, `creatorQuota=4` |
| Wizard | `create-campaign.constants.ts` (57) | seluruh file | opsi kategori/video style/CTA hardcoded (acceptable sebagai konstanta UI) |
| Finance | `FinanceOverviewPage.tsx` | baris 125; service baris 240 | `refundEligible` magic number `Math.min(campaignEscrow, 1200000)` |
| Finance | `FinanceOverviewPage.tsx` | baris 186–219 | `handlePaymentSuccess` mutasi lokal ("simulate database updates"), fabrikasi `MID-DEMO-${txId}` (baris 217) |
| Analytics | `AnalitikClient.tsx` | baris 10–17, 19–24, 26–31, 135, 138, 186 | `VIEWS_DATA` (6 bulan), `TOP_CAMPAIGNS` (4), `KPI_CARDS` ("2.4jt", "+169%"), label periode/persentase hardcoded |
| Settings | `PengaturanClient.tsx` | baris 40–46, 73–85 | `INITIAL_NOTIFICATIONS` + seluruh state profil awal hardcoded (alamat, telepon, email, sosial); komentar baris 72 mengklaim "1:1 to Appwrite database schema" tanpa ada DB call |
| Finance (route) | `keuangan/page.tsx` | baris 26 | fallback `businessName` hardcoded `"Dapur Sehat Sukabumi"` |
| Analytics/Settings (route) | `analitik/page.tsx:4`, `pengaturan/page.tsx:4` | — | `businessName` "Dapur Sehat Sukabumi" hardcoded, tanpa `getUmkmProfile()` |

> **Update 2026-09-27** — dua baris Creators di atas sudah selesai:
> `CreatorPortfolioSection.tsx` & `CreatorSocialLinksCard.tsx` kini props-driven
> dari `getCreatorPortfolio()` / `getCreatorSocialAccounts()` (facade
> `umkm-dashboard.service.ts`, read langsung `creator_portfolios` &
> `creator_social_accounts` — keduanya `read("any")` per baris).
> `views`/`likes`/`avgViews` dihapus dari UI karena tidak ada kolom sumbernya.
> Verifikasi live 2026-09-27: `creator_portfolios` = **0 dokumen**,
> `creator_social_accounts` = 11 baris (semua TikTok, `followers`/`engagementRate`
> masih 0), jadi kedua section menampilkan empty state — bukan data karangan.

### 3d. Perilaku tersimulasi (bukan data, tapi menandai titik integrasi)

- `CreateCampaignWizard.tsx:127-135` — submit final: `setTimeout(1500)` → `CampaignCreatedModal` → `router.push`. **Tidak ada service call.**
- `campaign/buat/page.tsx:25-27` — skeleton dipicu `setTimeout(500)` artifisial.
- `CampaignDetailPage.tsx:96-136` — approve/reject submission dihitung lokal; `CampaignsPage.tsx:160-180` — duplicate membuat id fake `campaign_new_${Date.now()}`.
- `NegotiationRoomPage.tsx:124-156` — kirim pesan + **auto-reply kreator fake via `setTimeout(1500)`**; baris 188–212 bayar → status `escrow` lokal; baris 390 verifikasi → `window.location.reload()`.
- `CreatorDirectoryPage.tsx:24-27` & `CreatorDetailPage.tsx:25-30` — loading = **timer `setTimeout(600)` murni**, bukan fetch.
- `NegotiationListPage.tsx:39-43`, `NegotiationRoomPage.tsx:67` — fetch nyata tapi di-padding `setTimeout(600)`.
- `PengaturanClient.tsx:97-103,139` — save/deactivate/upload foto = toast saja.
- `modals/ExportFinanceReportModal.tsx:51-90` — export menghasilkan CSV nyata di klien, tapi konten selalu CSV walau user memilih `.xlsx`.
- `AnalitikClient.tsx:75-87` — selector periode & tombol "Export Laporan" **mati** (tanpa handler).

---

## 4. Audit Konsistensi Komponen & Primitive

### 4a. Fork divergen di `umkm-dashboard/shared/`

Dikonfirmasi via diff terhadap `src/components/features/dashboard/shared/*` — lima komponen menduplikasi konsep dengan **API yang tidak kompatibel**:

| Komponen UMKM lokal | Versi cross-dashboard | Divergensi |
|---|---|---|
| `DashboardBadge.tsx` (108) | `dashboard/shared/DashboardBadge` | UMKM pakai CSS class legacy `"badge orange"` + prop `type`; versi shared membungkus `ui/badge` dengan map `tone` |
| `DashboardMetricCard.tsx` (124) | `dashboard/shared/DashboardMetricCard` | `trendText/trendType/variant/isCompactCurrency` vs `tone/currency/badgeText/badgeTone` |
| `DashboardActionMenu.tsx` (81) | `dashboard/shared/DashboardActionMenu` | `danger`+`align`/`trigger` vs `tone`+`label` |
| `DashboardProgress.tsx` (56) | `dashboard/shared/DashboardProgress` | bar polos `bg-*` + `max` wajib vs wrapper `ui/progress` + gradien + `shimmer` |
| `ResponsiveDataRow.tsx` (43) | `dashboard/shared/ResponsiveDataRow` | flex row generik vs struktur `{title, cells[], actions}` di atas `DashboardCard` |

- `DashboardButton.tsx` dan `DashboardCard.tsx` di folder UMKM adalah **re-export 2 baris** ke `dashboard/shared` (harmless).
- `UmkmPageWrapper.tsx` (44) satu-satunya yang genuinely UMKM-specific (container layout).

### 4b. Provenance import

- 34 file mengimport dari **fork lokal** `../shared` (pola dominan: finance modals, campaign detail/cards, create-campaign steps, settings, overview, creators).
- Hanya 6 file mengimport dari `dashboard/shared` (a.l. `campaign/CampaignTable.tsx`, `negotiation/detail/NegotiationRoomPage.tsx`).
- 37 pemakaian `components/ui/*` di 29 file.

### 4c. Masalah arah normalisasi

`dashboard/shared/index.ts` menandai sebagian besar primitive `@deprecated` dengan arah migrasi ke `@/components/ui/*` — tetapi fork UMKM tidak mengikuti arah itu, sehingga sekarang ada **tiga generasi primitive** hidup berdampingan: `components/ui/*` (target), `dashboard/shared/*` (deprecated), `umkm-dashboard/shared/*` (fork legacy). Tidak perlu primitive baru — yang diperlukan adalah migrasi fork ke primitive yang sudah ada.

---

## 5. Gap Analysis Teknis per Modul

Legend: ✅ memadai · ⚠️ sebagian · ❌ tidak ada

### 5a. Service/API layer

- ✅ Facade layer ada dan berpola benar: `src/services/umkm/umkm-dashboard.service.ts` (255 baris, 16 fungsi, semua branch `useMockData`).
- ✅ Stub Appwrite terdokumentasi baik: `src/services/umkm/umkm-appwrite.service.ts` (137 baris) — tiap fungsi punya TODO berisi target collection, filter, dan baris `// RBAC:` (mis. "owner only, READ-ONLY (NO direct write from client)" untuk transaksi).
- ❌ **Implementasi 0/16** — tidak ada import `databases`/`Query`/`account` sama sekali.
- ❌ **Overview, Creators, Analytics, Settings mem-bypass service layer** (lihat §3b/§3c). `getCreators`/`getCreatorById`/`getCreatorRateCards`/`getFinanceSummary`/`getEscrowOverview` di service **tidak pernah dipanggil UI** — `FinanceOverviewPage.tsx:71-134` malah menghitung ulang summary/escrow di klien, menduplikasi logika `umkm-dashboard.service.ts:179-254`.
- ❌ Tidak ada satu pun fungsi **write** di service layer (semua 16 read) — padahal UMKM butuh: create/publish campaign, top-up, review submission, kirim pesan, create offer, bayar, approve deliverable, update profil.

### 5b. Type/interface vs kontrak backend (`50_Database.md` per modul)

- ❌ **Tiga vokabulari status paralel**:
  - `src/types/umkm-dashboard.types.ts` (208) — dipakai kode hidup; English lowercase tapi **tidak match backend**: `CampaignStatus "draft"|"active"|"full"|"completed"|"cancelled"` (backend: `draft|active|paused|completed`); `SubmissionStatus "pending"|"valid"|"fraud"|"dispute"` (backend: `pending|approved|rejected` + `fraudStatus safe|review|rejected` terpisah); `TransactionStatus "pending"|"escrow"|"success"|"failed"|"refunded"` (backend transactions pakai `type deposit|withdrawal|payment|refund|release|fee`).
  - `src/types/status.ts` (88) — Indonesia PascalCase (`"Aktif"`, `"MenungguPembayaran"`), header mengklaim match schema Appwrite → **klaim salah**; ini match spec lama yang deprecated.
  - `src/types/umkmDashboard.ts` (64) — generasi ketiga, Indonesia PascalCase, dipakai Overview.
- ⚠️ Field casing: backend campur camelCase (campaigns/orders/wallets) dan snake_case (payments/conversations/messages) — mapper per collection wajib merujuk `00_BACKEND/appwrite.config.json`.

### 5c. Loading / error / empty state

| Modul | Loading | Error | Empty |
|---|---|---|---|
| Overview | ❌ tidak ada (server component, data statis) | ⚠️ hanya route `error.tsx` | ❌ |
| Campaign | ✅ fetch-driven (`CampaignListSkeleton`, `CampaignDetailSkeleton`) | ✅ `CampaignErrorState` dari `res.error` | ✅ `CampaignEmptyState` + filtered-empty |
| Wizard | ⚠️ `setTimeout(500)` artifisial di route | ❌ | n/a (form) |
| Creators | ❌ **timer `setTimeout(600)`, bukan fetch** | ❌ `CreatorErrorState.tsx` ada tapi **dead code, tidak pernah dirender** | ✅ (filtered) + `CreatorNotFoundState` |
| Negotiation | ✅ fetch-driven (padding 600ms) | ✅ `NegotiationErrorState` | ✅ |
| Finance | ✅ `FinancePageSkeleton` | ✅ `FinanceErrorState` + retry | ✅ |
| Analytics | ❌ | ❌ | ❌ |
| Settings | ❌ (tidak ada async) | ❌ | n/a |

- ❌ Tidak ada `loading.tsx` di seluruh segment → tidak ada Suspense fallback route-level.

### 5d. Validasi form

- ✅ Wizard: `create-campaign.validation.ts` (63) per step — judul/kategori wajib, deskripsi ≥30, brief ≥50, `externalAssetUrl` wajib `https://`, harga>0, kuota≥1, budget≥Rp100.000, terms wajib. ⚠️ Minimum budget frontend Rp100.000 ≠ backend `MINIMUM_CAMPAIGN_BUDGET` Rp50.000 — selaraskan.
- ✅ Primitives Zod reusable ada: `src/lib/validations/common.ts` (99) — `requiredHttpsUrl`, `indonesianPhone`, `currencyAmountIDR`, `externalAssetUrl`, `MAX_FILE_SIZE_BYTES`.
- ❌ Settings: **tanpa validasi apa pun**.
- ❌ Belum ada skema Zod per modul (campaign, offer, withdrawal) sebagaimana standar `01_Global/20_Coding_Standards.md` (Zod di `src/validations/` sebelum service call).

### 5e. Permission / role check (per `30_Business_Rules.md` modul)

- ❌ Tidak ada auth/session (`useAuth`/`AuthProvider`/`account.get()`) di mana pun di segment UMKM.
- ❌ Tidak ada `layout.tsx` UMKM → tidak ada boundary role guard (`role === 'umkm'`).
- ⚠️ Aturan bisnis backend yang harus tercermin di UI dan belum di-enforce dari data nyata: publish butuh `remainingBudget > 0` (top-up dulu); review submission hanya untuk status `pending`; approve deliverable hanya oleh UMKM owner; revisi dibatasi `revisionLimit`; hanya UMKM yang membuat offer.

### 5f. Status lifecycle (per `20_Concepts.md` modul)

- ❌ Lifecycle frontend tidak match backend (lihat §5b). Contoh konkret dampak: filter tab status campaign di `CampaignsPage` memakai `"full"` yang tidak akan pernah muncul dari backend; badge submission `"valid"/"fraud"` tidak akan match `approved/rejected` + `fraudStatus`.
- ⚠️ Alur PPV nyata (`03_Workflows/20_Campaign_PPV.md`): `draft` → top-up (payment `campaign`, webhook `midtrans-webhook` mengisi `remainingBudget`) → `publishCampaign` → `active`. Wizard saat ini melompat langsung "created" tanpa fase top-up — UI wizard step 5 (`ReviewEscrowStep` + `PaymentSimulationModal`) secara konsep sudah mengarah ke alur ini, tinggal wiring.

---

## 6. Kesiapan Backend per Modul

Catatan: file `.js` di `00_BACKEND/src/services/` adalah stub kosong; implementasi nyata di `.ts`. 16 Cloud Functions terimplementasi di `00_BACKEND/functions/*/src/main.js`.

| Modul UMKM | Service & doc modul terkait | Status kesiapan |
|---|---|---|
| Overview | agregasi dari `campaign.service.getCampaigns`, `wallet.service.getWallet/getTransactions`, `submission` — docs `02_Modules/Campaigns`, `Payments` | ⚠️ **Tidak ada aggregate/dashboard-summary service** (dan tidak ada backend analytics); overview harus dirakit dari beberapa call + counter denormalized (ADR-005: `totalClaims`, `spentAmount`, `remainingBudget`) |
| Campaign list & detail | `campaign.service.ts` (`getCampaigns`, `getCampaignById`), `submission.service.ts` (`approveSubmission`, `rejectSubmission`) — docs `Campaigns/**`, workflow `40_Submission_Fraud.md` | ⚠️ Read campaign ✅; review submission ✅; **tidak ada method list submissions per campaign untuk UMKM** (yang ada `getMySubmissions` milik kreator) — perlu ditambah |
| Create Campaign Wizard | `campaign.service.ts` (`createCampaign`, `generateBrief`, `publishCampaign`), `payment.service.ts` (`createPayment purpose:'campaign'`, fee 5% buyer-side), Function `ai-brief` — docs `Campaigns/**`, `AI/**`, workflow `20_Campaign_PPV.md` | ⚠️ Inti ✅ (create→top-up→publish lengkap; `ai-brief` real, Gemini `gemini-2.5-flash`, auto-insert `campaign_briefs`); **gap: tidak ada `topUpCampaign` helper di campaign.service** (pakai `payment.service`) dan **tidak ada CRUD `campaign_assets`** padahal collection + `85_Asset_Tutorial.md` ada |
| Creators / Rate Card | `user.service.searchCreators`, `creator.service.getRateCards({creatorId})` (published only — cocok untuk sisi UMKM) — docs `RateCards/**`, `Users/**` | ✅ Browse + rate card read siap; profil kreator via `user.service.getProfile(userId,'creator')` |
| Negotiation | `chat.service.ts` (`createConversation`, `sendMessage`, `getMessages`, `markConversationAsRead`), `offer.service.ts` (`createOffer` UMKM-only), `order.service.ts` (`getOrders`, `approveDeliverable`, `requestRevision`), Functions `create-order`, `create-escrow`, `release-escrow` — docs `Chat/**`, `Offers/**`, `Orders/**`, workflow `30_RateCard_Order.md` | ⚠️ Tulis ✅; **gap read: tidak ada `getConversations` (inbox list), tidak ada read offers (`getOffers`/`getOfferById`), tidak ada `getOrderById`, `getDeliverables(orderId)`, `getRevisions(orderId)`** |
| Finance / Escrow | `wallet.service.ts` (`getWallet`, `getTransactions`, `getWithdrawals`, konstanta `PLATFORM_FEE_RATE=0.05`, `MINIMUM_CAMPAIGN_BUDGET=50000`), `payment.service.ts` (`createPayment`, `getPayments`), Functions `create-payment`, `midtrans-webhook`, `create-escrow`, `release-escrow` — docs `Payments/**` | ✅ Lengkap untuk sisi UMKM (top-up, riwayat, escrow). Mutasi saldo hanya via Functions/webhook — sesuai aturan |
| Analytics | — | ❌ **Tidak ada service/Function analytics sama sekali** di backend. Catat sebagai gap produk: pilih (a) rakit dari counter denormalized, atau (b) tunda modul ini |
| Settings | `user.service.ts` (`getProfile`, `updateProfile` dengan whitelist field UMKM), `auth.service.ts` — docs `Users/**`, `Authentication/**` | ✅ Siap |

Method backend yang harus **ditambah** sebelum UMKM dashboard bisa penuh: `getConversations()`, `getOffers()/getOfferById()`, `getOrderById()`, `getDeliverables(orderId)`, `getRevisions(orderId)`, `getSubmissionsByCampaign(campaignId)`, service `campaign_assets` (add/list/remove), opsional helper `topUpCampaign()`.

---

## 7. Rencana Kerja Bertahap Sebelum Integrasi Appwrite

Urut fondasional → akhir; tiap langkah selesai dulu sebelum lanjut.

1. **(P0) Tetapkan satu kanon status & tipe.** Hapus dualisme: jadikan enum backend (`00_BACKEND` `.ts` + `50_Database.md`) satu-satunya nilai di data layer. Perbaiki `src/types/umkm-dashboard.types.ts` (ganti `full`→`paused` dst., pisahkan `fraudStatus` dari `SubmissionStatus`), **hapus/deprecate `src/types/status.ts` dan `src/types/umkmDashboard.ts`**. Label Indonesia hanya di layer presentasi (map status→label).
2. **(P0) Bangun auth/session + guard.** Buat `src/app/dashboard/umkm/layout.tsx` (chrome sekali + role guard `umkm`), AuthProvider dengan `account.get()` → role check via `COLLECTIONS.users`, redirect non-UMKM. Isi `NEXT_PUBLIC_APPWRITE_*` di `.env` (nilai resmi di skill `marketiv-appwrite-integration`) dan dokumentasikan `NEXT_PUBLIC_USE_MOCK_DATA` di `.env.example`.
3. **(P0) Tambah method backend yang hilang** di `00_BACKEND/src/services/`: `getConversations`, `getOffers`/`getOfferById`, `getOrderById`, `getDeliverables`, `getRevisions`, `getSubmissionsByCampaign`, service `campaign_assets`; putuskan helper `topUpCampaign` (atau standardisasi pemakaian `payment.service.createPayment`).
4. **(P1) Hentikan bypass service layer.** Overview: ganti `src/data/umkmDashboard.ts` + `mapCampaignsFromDashboardData()` dengan `getDashboardSummary()`/`getCampaigns()`. Creators: ganti `src/data/creators.ts` + fabrikasi inline (`CreatorStatsCards`, `RateCardPackagesSection`, portfolio, social) dengan `getCreators()`/`getCreatorById()`/`getCreatorRateCards()`. Hapus `src/data/*` dan hidupkan kembali mock resmi `creators.mock.ts`/`rate-cards.mock.ts` sebagai satu-satunya sumber mock. Finance: pakai `getFinanceSummary()`/`getEscrowOverview()` alih-alih hitung ulang di klien.
5. **(P1) Tambahkan fungsi write ke facade + stub.** Perluas `umkm-dashboard.service.ts`/`umkm-appwrite.service.ts` dengan: `createCampaign`, `publishCampaign`, `topUpCampaign`, `generateBrief`, `reviewSubmission(approve/reject)`, `sendMessage`, `createOffer`, `payOrder`, `approveDeliverable`, `requestRevision`, `updateUmkmProfile` — masing-masing dengan TODO collection/filter/RBAC mengikuti pola yang sudah ada.
6. **(P1) Implement 16+ stub `umkm-appwrite.service.ts`** memakai pola skill `marketiv-appwrite-integration` (`databases.listDocuments` + `Query`, mapper `$id→id`, `ServiceResult<T>`, propagasi `code` dari typed error per `01_Global/60_Error_Handling.md`).
7. **(P1) Wire aksi tersimulasi ke service:** submit wizard (create→createPayment purpose `campaign`→webhook→publish; selaraskan minimum budget ke Rp50.000), review submission, cancel/duplicate campaign, kirim pesan/offer (hapus auto-reply fake & `window.location.reload()`), simpan Settings (`updateProfile`), hapus semua `setTimeout` artifisial & special-case `rc-offer-simulated`.
8. **(P2) Replace mock per modul** dengan `NEXT_PUBLIC_USE_MOCK_DATA=false`, urutan risiko rendah→tinggi: Settings → Overview → Creators → Campaign → Wizard (incl. `ai-brief` nyata menggantikan heuristik `BriefQualityCard`) → Negotiation → Finance.
9. **(P2) Lengkapi state handling:** `loading.tsx` per route, error state Creators (hidupkan `CreatorErrorState`), empty state Overview, validasi Settings (Zod), skema Zod per modul di `src/lib/validations/`.
10. **(P3) Konsolidasi primitive:** migrasi 5 fork `umkm-dashboard/shared/*` ke `components/ui/*` (arah deprecation resmi); putuskan nasib Analytics (bangun backend agregasi atau tandai "coming soon").
11. **(P3) Testing:** smoke test per modul dalam mode live, uji alur lintas-role (campaign PPV & rate card order) bersama dashboard Kreator — lihat dokumen gabungan `docs/audits/umkm-kreator-integration-design-and-rules.md`.

---

## 8. Risiko & Catatan Tambahan

- **`src/types/status.ts` menyesatkan** — header-nya mengklaim match schema Appwrite dan melarang nilai tak terdokumentasi, padahal isinya match spec lama (`docs/marketiv-md`) yang sudah tidak dipakai. Risiko tinggi developer menjadikannya acuan. Prioritaskan penghapusan (langkah 1).
- **Dua store mock paralel** (`src/mocks/umkm/**` vs `src/data/*`) membuat UI Overview/Creators dan UI Campaign/Negotiation/Finance menampilkan data yang tidak saling konsisten.
- **Inkonsistensi dokumen backend** yang perlu dikonfirmasi ke pemilik backend: (a) `Payments/80_Frontend.md` menyebut komponen `AdminWithdrawReview` padahal aturan withdrawal adalah direct-processed tanpa review admin; (b) diagram `20_Campaign_PPV.md` menyebut state `funded` yang tidak ada di enum campaign; (c) workflow `30_RateCard_Order.md` merujuk Function `notify-client-review` yang tidak dideklarasikan dan tidak diimplementasi; (d) `approveDeliverable` hanya mengubah status deliverable — transisi order ke `completed` didelegasikan ke Function `release-escrow`.
- **Casing field campur di backend**: `payments`/`conversations`/`messages` snake_case, sisanya camelCase — mapper frontend wajib dicek per collection terhadap `00_BACKEND/appwrite.config.json`.
- **Fee model (ADR-008)** harus tercermin benar di UI: top-up campaign = buyer-side (`budget + floor(5%)`), rate card order = seller-side (dipotong saat release). `EscrowSimulationCard` wizard dan `FinanceOverviewPage` perlu diverifikasi terhadap ini saat integrasi.
- **Export keuangan**: `.xlsx` menghasilkan bytes CSV (`ExportFinanceReportModal.tsx:77-79`) — bug kecil yang membingungkan user.
- `BriefQualityCard` (heuristik panjang string) dan Function `ai-brief` (Gemini) adalah **dua hal berbeda** — jangan sampai heuristik dibuang begitu saja; ia tetap berguna sebagai indikator kelengkapan form, sedangkan `generateBrief` menjadi aksi eksplisit.
- Dokumen ini adalah pasangan dari audit Kreator; blocker fondasi yang sama (auth, env, kanon tipe, `tsconfig.json:33` yang meng-exclude `00_BACKEND`) dibahas terpusat di `docs/audits/umkm-kreator-integration-design-and-rules.md`.

---

## 9. Lampiran — Daftar File yang Diaudit

### Routes
- `src/app/dashboard/umkm/page.tsx`, `error.tsx`
- `src/app/dashboard/umkm/campaign/page.tsx`, `campaign/[campaignId]/page.tsx`, `campaign/buat/page.tsx`
- `src/app/dashboard/umkm/kreator/page.tsx`, `kreator/[id]/page.tsx`
- `src/app/dashboard/umkm/negosiasi/page.tsx`, `negosiasi/[id_order]/page.tsx`
- `src/app/dashboard/umkm/keuangan/page.tsx`, `analitik/page.tsx`, `pengaturan/page.tsx`

### Komponen fitur
- `src/components/features/umkm-dashboard/overview/**` (8 file)
- `src/components/features/umkm-dashboard/campaign/**` (35 file, incl. `detail/**`, `modals/**`)
- `src/components/features/umkm-dashboard/create-campaign/**` (26 file, incl. `steps/**`, `cards/**`, `modals/**`, validation/constants/utils/types)
- `src/components/features/umkm-dashboard/creators/**` (19 file, incl. `detail/**`, `modals/**`)
- `src/components/features/umkm-dashboard/negotiation/**` (29 file, incl. `detail/**`, `modals/**`)
- `src/components/features/umkm-dashboard/finance/**` (22 file, incl. `modals/**`)
- `src/components/features/umkm-dashboard/analytics/AnalitikClient.tsx`
- `src/components/features/umkm-dashboard/settings/PengaturanClient.tsx`
- `src/components/features/umkm-dashboard/shared/**` (9 file)
- `src/components/features/dashboard/shared/**` (pembanding)

### Data layer frontend
- `src/services/umkm/umkm-dashboard.service.ts`, `src/services/umkm/umkm-appwrite.service.ts`
- `src/mocks/umkm/**` (10 file), `src/data/umkmDashboard.ts`, `src/data/creators.ts`
- `src/types/umkm-dashboard.types.ts`, `src/types/status.ts`, `src/types/umkmDashboard.ts`
- `src/lib/validations/common.ts`, `src/lib/appwrite/**`, `src/config/data-source.config.ts`

### Backend (source of truth)
- `00_BACKEND/src/services/{campaign,creator,order,offer,submission,chat,wallet,payment,user,notification,claim,auth}.service.ts`
- `00_BACKEND/src/lib/appwrite/**`
- `00_BACKEND/functions/*` (16 function, khusus dibaca: `ai-brief/src/main.js`)
- `00_BACKEND/docs/02_Modules/**` (10 modul), `docs/01_Global/**`, `docs/03_Workflows/**`, `docs/00_Project/**`, `docs/04_Decisions/**` (ADR-005, ADR-008)
