# Language Baseline & Glossary - Marketiv Dashboards

**Scope:** Creator dashboard (`/dashboard/kreator`) and UMKM dashboard (`/dashboard/umkm`) in `marketiv-web`.
**Purpose:** Capture what the repo has *already decided* about language, voice, and terminology so a language/terminology spec can be written on top of it instead of inventing new rules.
**Method:** read-only mining of `docs/marketiv-md/**`, `docs/audits/**`, `.kiro/specs/**`, repo root instruction files, `.agents/skills/**`, `docs/revisi/**`, `prompts/**`, plus the shipped source under `src/`. Every claim below carries a `file:line`. Paths are repo-relative (the doc lives inside `marketiv-web/`).
**Date:** 2026-09-27
**Read-only note:** the only file written for this effort is this document.

---

## Existing language/voice rules

- **Bahasa Indonesia is the default MVP product language.** "Use Bahasa Indonesia as default MVP language." — `docs/marketiv-md/technical-guidelines/08-accessibility-and-content-standards.md:59`
- **Hard rule: UI copy must be clear Bahasa Indonesia, no jargon on UMKM-facing flows.** "All user-facing UI copy must use clear Bahasa Indonesia and avoid technical jargon for UMKM-facing flows." — `docs/marketiv-md/technical-guidelines/08-accessibility-and-content-standards.md:87` (repeated verbatim as a Hard Rule in every technical guideline: `01-engineering-principles.md:71`, `02-project-architecture.md:73`, `03-nextjs-frontend-standards.md:91`, `04-appwrite-backend-standards.md:86`, `05-security-and-permissions.md:87`, `06-performance-and-scalability.md:86`, `07-ui-ux-implementation-standards.md:79`, `09-data-validation-and-error-handling.md:97`, `10-realtime-events-and-background-jobs.md:85`, `11-payment-escrow-and-financial-safety.md:94`, `12-ai-integration-standards.md:83`)
- **Feature-doc parity rule: simple, firm Indonesian for UMKM.** "Gunakan Bahasa Indonesia yang sederhana, tegas, dan mudah dipahami oleh UMKM." — `docs/marketiv-md/features/04-umkm-dashboard.md:26`, `features/05-creator-dashboard.md:26` (and features 01–17 §Permission Rules)
- **Indonesian only in the UI layer; state/data stays English lowercase.** "Frontend pakai Bahasa Indonesia di UI layer saja — state/data pakai English lowercase." — `docs/marketiv-md/database/08-frontend-data-contract.md:17`
- **Enums may be translated for display.** "UI boleh menerjemahkan enum menjadi Bahasa Indonesia yang lebih natural." — `docs/marketiv-md/features/18-status-lifecycle-reference.md:9`
- **Hard ban on translated status values in data.** "Do not store translated labels as enum values." — `docs/marketiv-md/features/18-status-lifecycle-reference.md:360`; "Jangan pernah menyimpan/membandingkan `"Aktif"`, `"Selesai"`, `"MenungguPembayaran"` di state/data." — `docs/audits/umkm-kreator-integration-design-and-rules.md:79`
- **Presentation labels may be Indonesian (newer canonical spec).** "Do not create UI-only database values such as `Valid`, `Paid`, `Fraud`, or translated PascalCase states. Presentation labels may be Indonesian." — `docs/marketiv-campaign-submission-admin-authority-ui-spec-v1/01_SPEC/design.md:42`
- **Explicit dashboard label rule.** "Use Indonesian copy for user-facing dashboard labels." — `.kiro/specs/dashboard-ui-system-refinement/design.md:98`
- **Role-based tone.** "UMKM-facing copy must be simple, trust-oriented, and action-focused. Kreator-facing copy can be more direct, progress-oriented, and earning-focused. Admin copy must be precise, operational, and status-driven. Financial copy must be explicit about amount, fee, escrow, and status." — `docs/marketiv-md/technical-guidelines/08-accessibility-and-content-standards.md:53-56`
- **Explain domain jargon; don't assume escrow/marketplace literacy.** "Do not assume users understand marketplace or escrow terminology. Provide short explanations for campaign, escrow, rate card, and collab post concepts." — `docs/marketiv-md/technical-guidelines/08-accessibility-and-content-standards.md:76-77`
- **One word per action, everywhere.** "Use consistent words for the same action across the app." — `docs/marketiv-md/technical-guidelines/08-accessibility-and-content-standards.md:78`
- **Microcopy pattern: state what happened + what to do next, in Indonesian.** Bad/Good examples — `docs/marketiv-md/technical-guidelines/08-accessibility-and-content-standards.md:63-70` (e.g. `Link tidak valid. Gunakan URL publik TikTok atau Instagram Reels.`)
- **UMKM copywriting verbs and banned jargon.** "Gunakan kata kerja jelas: Buat, Bayar, Lihat, Kirim, Batalkan." and "Hindari jargon seperti GMV, conversion, creative asset jika tidak dijelaskan." — `docs/marketiv-md/ui-ux/05-dashboard-umkm-guidelines.md:148-149`
- **Prescribed Indonesian glosses for two core concepts.** "Gunakan istilah `Dana ditahan sementara` untuk menjelaskan escrow." and "Gunakan istilah `Bukti Tayang` untuk URL hasil posting kreator." — `docs/marketiv-md/ui-ux/05-dashboard-umkm-guidelines.md:150-151`
- **Creator copy tone.** "Gunakan bahasa yang cepat dan jelas. Contoh: `Klaim Job Ini`, `Submit Bukti Tayang`, `Lihat Campaign`, `Tarik Dana`. Boleh menggunakan tone lebih energetic, tetapi jangan berlebihan. Jangan menjanjikan pendapatan pasti." — `docs/marketiv-md/ui-ux/06-dashboard-kreator-guidelines.md:167-170`
- **No viral/earning promises.** "Jangan membuat pesan yang menjanjikan hasil viral pasti." — `docs/marketiv-md/ui-ux/05-dashboard-umkm-guidelines.md:166`; "Dashboard harus memberi motivasi tanpa membuat klaim earning berlebihan." — `docs/marketiv-md/ui-ux/06-dashboard-kreator-guidelines.md:43`
- **Number/currency formatting: local Indonesian + Rupiah + compact views.** "Metric harus memakai format angka lokal Indonesia. Nominal uang harus memakai format Rupiah. Views harus memakai format singkat jika besar, misalnya 12.400 views." — `docs/marketiv-md/ui-ux/05-dashboard-umkm-guidelines.md:53-55`; "Saldo harus memakai format Rupiah." — `docs/marketiv-md/ui-ux/06-dashboard-kreator-guidelines.md:54`
- **Money format contract.** `formatRupiah(350000); // "Rp 350.000"` and date via `formatDateJakarta(isoString)` — `docs/marketiv-md/database/08-frontend-data-contract.md:656-661`
- **Date/amount localized at feature level.** "Tanggal dan nominal harus diformat lokal Indonesia." — `docs/marketiv-md/features/04-umkm-dashboard.md:50`
- **Internal enum naming is PascalCase, no spaces; one enum shared by DB/backend/frontend.** "Gunakan PascalCase tanpa spasi untuk enum internal jika memungkinkan. … Database, backend, dan frontend harus memakai enum yang sama." — `docs/marketiv-md/features/18-status-lifecycle-reference.md:8-11`
- **Dashboard spec copy constraints (per feature).** "Bahasa Indonesia yang santun, ringkas, dan jelas pada seluruh copy UI." — `.kiro/specs/job-pool-kreator/requirements.md:93`; "Semua instruksi teks dan form menggunakan Bahasa Indonesia yang formal dan mudah dipahami." — `.kiro/specs/pekerjaan-aktif-kreator/requirements.md:76`; "Teks UI menggunakan Bahasa Indonesia yang ringkas dan profesional." — `.kiro/specs/refactor-ui-campaigns/requirements.md:63` and `.kiro/specs/refactor-ui-campaigns-details/requirements.md:53`
- **No unverifiable claim numbers in copy.** RoleChooser copy SHALL drop "ratusan"/"ribuan"; empty-state copy becomes "Kreator aktif terverifikasi". — `.kiro/specs/demo-readiness-p0/bugfix.md:141-145`
- **Every `page.tsx` needs metadata/generateMetadata (SEO), and AI copy is positioned as assistant/draft support.** — `.github/copilot-instructions.md` ("Setiap page.tsx wajib memiliki metadata"); `.kiro/specs/dashboard-ui-system-refinement/tasks.md:309-311`

**No i18n / no message catalog exists.** There is no `.kiro/steering/**` directory, no `next-intl`/`react-i18next` usage, and no terminology rules in `.agents/skills/**` (only caveman communication skills) or `docs/revisi/**` or `prompts/**`. Copy is hardcoded inline in components.

---

## Established Indonesian terminology (evidence-backed)

| English/raw term | Indonesian already used in repo | Source file:line | Confidence |
|---|---|---|---|
| creator | **Kreator** | `docs/marketiv-md/README.md:26` ("Kreator Mikro"); `docs/marketiv-md/features/05-creator-dashboard.md:7` role `KREATOR`; `src/lib/creator-status.ts:13` | High |
| campaign | **Kampanye** (nav/headers) / **Campaign** (body copy, docs, many labels) | `src/components/features/dashboard/DashboardSidebar.tsx:71` ("Kampanye"); `src/components/features/umkm-dashboard/campaign/CampaignsHeader.tsx:20` ("Kampanye Saya"); docs use "campaign" — `docs/marketiv-md/features/04-umkm-dashboard.md:4` | High (both variants) |
| brief | **Brief** (loanword, kept) | `docs/marketiv-md/ui-ux/05-dashboard-umkm-guidelines.md:91-93` ("deskripsi brief"); `docs/marketiv-md/ui-ux/06-dashboard-kreator-guidelines.md:92` | High |
| rate card | **Rate Card** (loanword, kept) | `docs/marketiv-md/README.md:47-53` ("Rate Card Mode"); `docs/marketiv-md/ui-ux/05-dashboard-umkm-guidelines.md:134` | High |
| order | **Order** / **Pesanan** | `docs/marketiv-md/features/10-rate-card-order-chat-and-custom-offer.md:1` ("Rate Card Order"); `src/app/dashboard/kreator/panduan/page.tsx:79` ("pesanan Rate Card Mode") | High (both) |
| deliverable | **Deliverable** / **Hasil Kerja** | `src/components/features/umkm-dashboard/ratecard-review/RatecardReviewDetailPage.tsx:156` ("Latest Deliverable"); `:222` ("Setujui Hasil Kerja?") | High (both) |
| escrow | **Escrow** / **Dana Aman** / **Dana Ditahan** | `docs/marketiv-md/README.md:32` ("Sistem **Escrow**"); `src/lib/umkm-status.ts:77` ("Dana Tersimpan Aman"); `src/lib/creator-status.ts:62` ("Dana Ditahan"); `docs/marketiv-md/ui-ux/05-dashboard-umkm-guidelines.md:150` ("Dana ditahan sementara") | High |
| wallet / balance | **Saldo** (dominant) / **Dompet** / **Wallet** | `docs/marketiv-md/ui-ux/06-dashboard-kreator-guidelines.md:48` ("Saldo Tersedia"); `src/components/features/creator-dashboard/KeuanganView.tsx:340` ("Keuangan & Dompet"); `:449` ("Riwayat Transaksi Wallet") | High |
| withdrawal | **Tarik Dana** / **Penarikan** / **Pencairan** / **Tarik Saldo** | `docs/marketiv-md/ui-ux/06-dashboard-kreator-guidelines.md:161` ("Tarik Dana"); `src/lib/creator-status.ts:113` ("Penarikan Dana"); `src/components/features/creator-dashboard/KeuanganView.tsx:313` ("Tarik Saldo"); `docs/marketiv-md/ui-ux/06-dashboard-kreator-guidelines.md:160` ("riwayat pencairan") | High (all variants) |
| refund | **Refund** / **Dana Dikembalikan** / **Pengembalian** | `src/lib/creator-status.ts:116` ("Refund"); `src/lib/umkm-status.ts:109` ("Dana Dikembalikan"); `src/lib/creator-status.ts:114` ("Pengembalian Penarikan") | High |
| submission / proof | **Bukti Tayang** / **Submission** / **Bukti Konten** | `docs/marketiv-md/ui-ux/05-dashboard-umkm-guidelines.md:151` ("Bukti Tayang"); `docs/marketiv-md/ui-ux/06-dashboard-kreator-guidelines.md:117` ("Submit Bukti Tayang"); `src/components/features/umkm-dashboard/campaign/CampaignTable.tsx:199` ("Bukti Konten") | High |
| review (validation) | **Menunggu Review** / **Tinjau** / **Review Pekerjaan** | `src/lib/creator-status.ts:20` ("Menunggu Review"); `src/components/features/umkm-dashboard/ratecard-review/RatecardReviewListPage.tsx:122,124` ("Review Pekerjaan", "Tinjau hasil terbaru") | High |
| review (rating/ulasan) | **Ulasan** | `.kiro/specs/creator-reviews-and-orders-aggregation/requirements.md:164-166` (`4.8 (12 Ulasan)`) | Low |
| negotiation | **Negosiasi** | `src/components/features/dashboard/DashboardSidebar.tsx:73` ("Negosiasi"); `.kiro/specs/negosiasi-kreator/requirements.md` | High |
| analytics | **Analitik** | `src/components/features/dashboard/DashboardSidebar.tsx:76` ("Analitik"); `docs/marketiv-md/ui-ux/05-dashboard-umkm-guidelines.md:172` ("analytics visual") | High |
| insight | **Insight** (kept as loanword) | `src/components/features/umkm-dashboard/analytics/AnalitikClient.tsx:193` ("Analitik & Insight") | Low |
| KPI | **KPI** (kept; internal only) | `docs/marketiv-md/implementation_docs/03-component-inventory.md:205` ("Dashboard KPI card"); `src/components/features/umkm-dashboard/analytics/AnalitikClient.tsx` (`KPI_CARDS`, internal) | Low |
| engagement | **Engagement** (kept, no ID equivalent) | `docs/marketiv-md/database/08-frontend-data-contract.md:372` (`engagementRate`); `docs/audits/codebase-audit-2026-09-27.md:158` (`avgEngagement`) | Low |
| follower | **Follower** (kept, no ID equivalent) | `docs/marketiv-md/README.md:26,34` ("follower"); `.kiro/specs/creator-followers-directory-dto/requirements.md:114` | High (as loanword) |
| reach | **Jangkauan** (once, non-dashboard) | `src/data/chatbotKnowledge.ts:29` ("jangkauan massal") | Low |
| impression | **Tayangan** (repo uses views/tayangan, not "impresi") | `src/components/features/umkm-dashboard/campaign/CampaignSummaryCards.tsx:82` ("Total Tayangan"); `src/components/features/umkm-dashboard/campaign/CampaignTable.tsx:196` ("Tayangan") | High (as Tayangan) |
| notification | **Notifikasi** | `src/components/features/shared/NotificationView.tsx:42,53`; `src/app/dashboard/kreator/notifikasi/page.tsx:4` | High |
| settings | **Pengaturan** | `src/components/features/dashboard/DashboardSidebar.tsx:388` ("Pengaturan"); `src/app/dashboard/kreator/settings/page.tsx:4`; `src/app/dashboard/umkm/pengaturan/page.tsx:4` | High |
| profile | **Profil** | `src/components/features/creator-dashboard/SettingsView.tsx:69` ("Profil Kreator"); `src/app/dashboard/kreator/profil/page.tsx` (route) | High |
| job pool | **Job Pool** | `src/components/features/creator-dashboard/JobPoolView.tsx:405` ("Job Pool Kampanye"); `src/components/features/creator-dashboard/CreatorDashboardSidebar.tsx:55` ("Job Pool") | High |
| active work | **Pekerjaan Aktif** | `src/components/features/creator-dashboard/PekerjaanAktifView.tsx:513` ("Pekerjaan Aktif"); `docs/marketiv-md/ui-ux/06-dashboard-kreator-guidelines.md:104` | High |
| pending | **Menunggu…** (Menunggu Review / Menunggu Pembayaran / Menunggu Validasi) | `src/lib/creator-status.ts:20,79`; `docs/marketiv-md/ui-ux/06-dashboard-kreator-guidelines.md:107` | High |
| draft | **Draft** / **Konsep** | spec `docs/marketiv-md/database/08-frontend-data-contract.md:211` ("Draft"); shipped `src/lib/umkm-status.ts:19` ("Konsep") | High (conflict) |
| approved | **Disetujui** | `src/lib/umkm-status.ts:40`; `src/lib/creator-status.ts:53` | High |
| rejected | **Ditolak** / **Tidak Valid** / **Terindikasi Fraud** | `src/lib/umkm-status.ts:41,60`; `src/lib/creator-status.ts:42` | High (conflict) |
| completed | **Selesai** | `src/lib/umkm-status.ts:22`; `src/lib/creator-status.ts:54` | High |
| cancelled | **Dibatalkan** | `src/lib/creator-status.ts:55` | High |
| platform fee | **Komisi platform** / **Platform Fee** / **Biaya platform** | `docs/marketiv-md/ui-ux/05-dashboard-umkm-guidelines.md:109` ("komisi platform 15%"); `src/lib/creator-status.ts:118` ("Platform Fee"); `src/app/dashboard/kreator/panduan/page.tsx:107` ("Biaya platform") | High |

---

## Conflicting usages found

| Term | Variant A (source) | Variant B (source) | Recommended resolution |
|---|---|---|---|
| Campaign vs Kampanye | "Kampanye" nav + headers — `src/components/features/dashboard/DashboardSidebar.tsx:71`, `src/components/features/umkm-dashboard/campaign/CampaignsHeader.tsx:20` ("Kampanye Saya") | "Campaign" in many body labels/pages — `src/components/features/umkm-dashboard/analytics/AnalitikClient.tsx:211,286` ("Campaign Aktif", "Semua Campaign"); `src/components/features/umkm-dashboard/create-campaign/CampaignWizardHeader.tsx:23` ("Buat Campaign Baru"); docs use "campaign" (`docs/marketiv-md/ui-ux/05-dashboard-umkm-guidelines.md:60`) | Pick **Kampanye** for user-facing UMKM copy, keep "Campaign Mode" as the product name of the mode only. Code routes/fields stay English. |
| Kreator vs Creator | "Kreator" — `docs/marketiv-md/features/05-creator-dashboard.md:4`; `src/components/features/dashboard/DashboardSidebar.tsx:72` | "Creator" in shipped copy — `src/components/features/umkm-dashboard/ratecard-review/RatecardReviewListPage.tsx:124` ("Tinjau hasil terbaru Creator"), `RatecardReviewDetailPage.tsx:173` ("Creator belum mengirim hasil kerja"); internal component names (`CreatorDashboardView`) | Standardize user-facing copy on **Kreator**; keep `Creator*` only in code identifiers/route `kreator`. |
| draft label | "Draft" — `docs/marketiv-md/database/08-frontend-data-contract.md:211`, `docs/marketiv-md/ui-ux/05-dashboard-umkm-guidelines.md:60` | "Konsep" — `src/lib/umkm-status.ts:19` | Pick one label for `campaigns.status="draft"`. "Konsep" is shipped; doc says "Draft". Decide and align map + doc. |
| escrow badge label | "Dana Tersimpan Aman" (UMKM) — `src/lib/umkm-status.ts:77,107` | "Dana di Escrow" (Kreator) — `src/lib/creator-status.ts:50`; "Dana Ditahan" — `src/lib/creator-status.ts:62` | Use one shared string (e.g. "Dana di Escrow") in both role maps; keep "Dana ditahan sementara" for explanatory helper text per `ui-ux/05:150`. |
| fraud/rejected label | "Tidak Valid" (UMKM) — `src/lib/umkm-status.ts:60` | "Terindikasi Fraud" (Kreator) — `src/lib/creator-status.ts:42` | Unify; `docs/marketiv-md/ui-ux/06-dashboard-kreator-guidelines.md:123-125` treats Fraud/Dispute as review states. |
| transaction pending label | "Menunggu Pembayaran" (UMKM) — `src/lib/umkm-status.ts:102` | "Menunggu Diproses" (Kreator) — `src/lib/creator-status.ts:79` | Unify per transaction type; both maps should agree for the same enum value. |
| withdrawal wording | "Tarik Dana" — `docs/marketiv-md/ui-ux/06-dashboard-kreator-guidelines.md:161`; "Tarik Saldo" — `src/components/features/creator-dashboard/KeuanganView.tsx:313` | "Penarikan Dana" — `src/lib/creator-status.ts:113`; "Pencairan" — `src/components/features/creator-dashboard/KeuanganView.tsx:404` ("Pencairan Tertunda") | Pick one primary CTA ("Tarik Dana") + one noun ("Penarikan"); avoid using "Pencairan" for both withdrawal and escrow release. |
| wallet naming | "Wallet" — `src/components/features/creator-dashboard/KeuanganView.tsx:449` ("Riwayat Transaksi Wallet"), `:572` ("Tarik Saldo Wallet") | "Dompet" — `src/components/features/creator-dashboard/KeuanganView.tsx:340` ("Keuangan & Dompet") | Standardize on **Saldo** for balance and avoid "Wallet"/"Dompet" in user-facing labels (or pick one). |
| analytics page title | "Analitik" nav — `src/components/features/dashboard/DashboardSidebar.tsx:76` | "Analitik & Insight" H1 — `src/components/features/umkm-dashboard/analytics/AnalitikClient.tsx:193` | Align H1 with nav, or confirm "Insight" as an intentional subtitle. |
| notification page title | "Notifikasi" (UMKM) — `src/components/features/shared/NotificationView.tsx:53` | "Notifikasi Kreator" (Kreator) — `NotificationView.tsx:42` | Make role suffix consistent (both plain "Notifikasi", or both role-suffixed). |
| UMKM settings route | `/dashboard/umkm/pengaturan` (actual filesystem + sidebar link) — `src/components/features/dashboard/DashboardSidebar.tsx:382` | `/dashboard/umkm/settings` — `src/lib/constants/routes.ts:104` (`routes.umkmSettings`) | Route drift, not a copy issue: fix `routes.umkmSettings` or the folder; do not write a spec that cites `/dashboard/umkm/settings`. |
| nav "Overview" vs "Dashboard" | "Overview" (Kreator) — `src/components/features/creator-dashboard/CreatorDashboardSidebar.tsx:54` | "Dashboard" (UMKM) — `src/components/features/dashboard/DashboardSidebar.tsx:70` | Pick one label for the home item on both sidebars (symmetry). |
| nav label vs doc label for negotiations | "Diskusi Paket Harga Kreator" H1 — `src/components/features/umkm-dashboard/negotiation/NegotiationHeader.tsx:16` | "Negosiasi" nav/label — `src/components/features/dashboard/DashboardSidebar.tsx:73`; docs `docs/marketiv-md/ui-ux/05-dashboard-umkm-guidelines.md:139` | Keep "Negosiasi" as the canonical noun; treat the H1 as an optional subtitle. |
| documents "campaign" vs shipped "Kampanye" in tab labels | Doc tabs "Semua, Draft, Aktif, Penuh, Selesai, Dibatalkan" — `docs/marketiv-md/ui-ux/05-dashboard-umkm-guidelines.md:60` | Shipped tabs derived from `getCampaignStatusLabel` — `src/lib/umkm-status.ts:17-25` ("Konsep/Aktif/Dijeda/Selesai") | Reconcile doc status vocabulary with the shipped 4-state enum (`draft/active/paused/completed`). |

---

## Route slug + page title inventory

Metadata column = Next.js `metadata.title` / `generateMetadata`; "none" means the route inherits root `"Marketiv"` (`src/app/layout.tsx:21`). Only 5 dashboard routes currently export metadata.

**Creator (`/dashboard/kreator`)**

| Route path | Route file | `metadata.title` (file:line) | Visible H1/title (file:line) |
|---|---|---|---|
| `/dashboard/kreator` | `src/app/dashboard/kreator/page.tsx` | none | "Selamat Datang, {name}" — `src/components/features/creator-dashboard/CreatorDashboardView.tsx:493`; eyebrow "DASHBOARD KREATOR" `:483` |
| `/dashboard/kreator/job-pool` | `src/app/dashboard/kreator/job-pool/page.tsx` | none | "Job Pool Kampanye" — `src/components/features/creator-dashboard/JobPoolView.tsx:405` |
| `/dashboard/kreator/job-pool/[id]` | `src/app/dashboard/kreator/job-pool/[id]/page.tsx` | none | dynamic (job title) — `JobDetailView.tsx` |
| `/dashboard/kreator/pekerjaan-aktif` | `src/app/dashboard/kreator/pekerjaan-aktif/page.tsx` | none | "Pekerjaan Aktif" — `src/components/features/creator-dashboard/PekerjaanAktifView.tsx:513` |
| `/dashboard/kreator/pekerjaan-aktif/[id]` | `.../pekerjaan-aktif/[id]/page.tsx` | none | dynamic `work.title` — `src/components/features/creator-dashboard/ActiveWorkDetailView.tsx:346` |
| `/dashboard/kreator/negosiasi` | `src/app/dashboard/kreator/negosiasi/page.tsx` | none | "Negosiasi Rate Card" — `src/components/features/creator-dashboard/NegosiasiView.tsx:407` |
| `/dashboard/kreator/negosiasi/[id_conversation]` | `.../negosiasi/[id_conversation]/page.tsx` | none | dynamic |
| `/dashboard/kreator/rate-card` | `src/app/dashboard/kreator/rate-card/page.tsx` | "Rate Card — Dashboard Kreator \| Marketiv" (`:4`) | "Paket Rate Card Jasa" — `src/components/features/creator-dashboard/RateCardView.tsx:594` |
| `/dashboard/kreator/keuangan` | `src/app/dashboard/kreator/keuangan/page.tsx` | "Keuangan — Dashboard Kreator \| Marketiv" (`:4`) | "Keuangan & Dompet" — `src/components/features/creator-dashboard/KeuanganView.tsx:340`; eyebrow "Keuangan Kreator" `:337` |
| `/dashboard/kreator/notifikasi` | `src/app/dashboard/kreator/notifikasi/page.tsx` | "Notifikasi — Dashboard Kreator \| Marketiv" (`:4`) | "Notifikasi Kreator" — `src/components/features/shared/NotificationView.tsx:42` (`pageTitle`) |
| `/dashboard/kreator/profil` | `src/app/dashboard/kreator/profil/page.tsx` | none | redirects to `/dashboard/kreator/settings` (`:4`) |
| `/dashboard/kreator/panduan` | `src/app/dashboard/kreator/panduan/page.tsx` | none | "FAQ, Aturan & Syarat Ketentuan Kreator" — `src/app/dashboard/kreator/panduan/page.tsx:219` |
| `/dashboard/kreator/settings` | `src/app/dashboard/kreator/settings/page.tsx` | "Pengaturan — Dashboard Kreator \| Marketiv" (`:4`) | "Pengaturan" — `src/components/features/creator-dashboard/SettingsView.tsx:1255` |

**UMKM (`/dashboard/umkm`)**

| Route path | Route file | `metadata.title` (file:line) | Visible H1/title (file:line) |
|---|---|---|---|
| `/dashboard/umkm` | `src/app/dashboard/umkm/page.tsx` | none | "Selamat Datang, {businessName}" — `src/components/features/umkm-dashboard/overview/HeroOverview.tsx:104`; eyebrow "DASHBOARD UMKM" `:98` |
| `/dashboard/umkm/campaign` | `src/app/dashboard/umkm/campaign/page.tsx` | none | "Kampanye Saya" — `src/components/features/umkm-dashboard/campaign/CampaignsHeader.tsx:20`; eyebrow "Kelola Kampanye" `:17` |
| `/dashboard/umkm/campaign/buat` | `.../campaign/buat/page.tsx` | none | "Buat Campaign Baru" — `src/components/features/umkm-dashboard/create-campaign/CampaignWizardHeader.tsx:23`; eyebrow "Wizard Campaign" `:18` |
| `/dashboard/umkm/campaign/[campaignId]` | `.../campaign/[campaignId]/page.tsx` | none | dynamic |
| `/dashboard/umkm/campaign/[campaignId]/edit` | `.../[campaignId]/edit/page.tsx` | none | dynamic |
| `/dashboard/umkm/kreator` | `src/app/dashboard/umkm/kreator/page.tsx` | none | "Temukan Kreator Terbaik" — `src/components/features/umkm-dashboard/creators/CreatorDirectoryHeader.tsx:48`; eyebrow "Direktori Kreator" `:24` |
| `/dashboard/umkm/kreator/[id]` | `.../kreator/[id]/page.tsx` | none | dynamic (creator name) |
| `/dashboard/umkm/negosiasi` | `.../negosiasi/page.tsx` | none | "Diskusi Paket Harga Kreator" — `src/components/features/umkm-dashboard/negotiation/NegotiationHeader.tsx:16`; eyebrow "Kelola Negosiasi" `:13` |
| `/dashboard/umkm/negosiasi/[id_conversation]` | `.../negosiasi/[id_conversation]/page.tsx` | none | dynamic |
| `/dashboard/umkm/review-rate-card` | `.../review-rate-card/page.tsx` | none | "Review Pekerjaan" — `src/components/features/umkm-dashboard/ratecard-review/RatecardReviewListPage.tsx:122`; eyebrow "Rate Card" `:121` |
| `/dashboard/umkm/review-rate-card/[orderId]` | `.../review-rate-card/[orderId]/page.tsx` | none | dynamic `review.projectTitle` — `RatecardReviewDetailPage.tsx:140` |
| `/dashboard/umkm/keuangan` | `src/app/dashboard/umkm/keuangan/page.tsx` | none | "Keuangan Saya" — `src/components/features/umkm-dashboard/finance/FinanceHeader.tsx:20`; eyebrow "Riwayat Transaksi" `:17` |
| `/dashboard/umkm/analitik` | `src/app/dashboard/umkm/analitik/page.tsx` | none | "Analitik & Insight" — `src/components/features/umkm-dashboard/analytics/AnalitikClient.tsx:193` |
| `/dashboard/umkm/notifikasi` | `.../notifikasi/page.tsx` | none | "Notifikasi" — `src/components/features/shared/NotificationView.tsx:53` |
| `/dashboard/umkm/panduan` | `.../panduan/page.tsx` | none | "FAQ, Aturan & Syarat Ketentuan" — `src/app/dashboard/umkm/panduan/page.tsx:264` |
| `/dashboard/umkm/pengaturan` | `.../pengaturan/page.tsx` | "Pengaturan — Dashboard UMKM \| Marketiv" (`:4`) | "Pengaturan" — `src/components/features/umkm-dashboard/settings/PengaturanClient.tsx:240` |

Tab-title separator is inconsistent: dashboard pages use `"… — Dashboard X | Marketiv"` (pipe), while public pages use `"… — Marketiv"` (em dash only, e.g. `src/app/(auth)/login/page.tsx:21`).

---

## Navigation labels inventory

**UMKM sidebar** — `SIDEBAR_NAV_ITEMS`, `src/components/features/dashboard/DashboardSidebar.tsx:69-78`

| Order | Label | Route |
|---|---|---|
| 1 | `Dashboard` | `/dashboard/umkm` |
| 2 | `Kampanye` | `/dashboard/umkm/campaign` |
| 3 | `Kreator` | `/dashboard/umkm/kreator` |
| 4 | `Negosiasi` | `/dashboard/umkm/negosiasi` |
| 5 | `Review Pekerjaan` | `/dashboard/umkm/review-rate-card` |
| 6 | `Keuangan` | `/dashboard/umkm/keuangan` |
| 7 | `Analitik` | `/dashboard/umkm/analitik` |
| 8 | `Notifikasi` | `/dashboard/umkm/notifikasi` |
| — | (footer link) `Pengaturan` | `/dashboard/umkm/pengaturan` — `:382` (href) |
| — | (footer link) help link → `panduan` | `/dashboard/umkm/panduan` — `:356` |

**Creator sidebar** — `SIDEBAR_ITEMS`, `src/components/features/creator-dashboard/CreatorDashboardSidebar.tsx:53-61`

| Order | Label | Route |
|---|---|---|
| 1 | `Overview` | `/dashboard/kreator` |
| 2 | `Job Pool` | `/dashboard/kreator/job-pool` |
| 3 | `Pekerjaan Aktif` | `/dashboard/kreator/pekerjaan-aktif` |
| 4 | `Rate Card` | `/dashboard/kreator/rate-card` |
| 5 | `Negosiasi` | `/dashboard/kreator/negosiasi` |
| 6 | `Keuangan` | `/dashboard/kreator/keuangan` |
| 7 | `Notifikasi` | `/dashboard/kreator/notifikasi` |
| — | (footer link) `Pengaturan` | `/dashboard/kreator/settings` — `:320` (href) |
| — | (footer link) → `panduan` | `/dashboard/kreator/panduan` — `:295` (href) |

**Symmetry gaps:** no `Profil` item on either sidebar (Kreator has `/profil` but it redirects to settings); creator sidebar lacks a `Kreator`/directory item (N/A) and `Review Pekerjaan`/`Analitik`; UMKM sidebar lacks `Job Pool`/`Pekerjaan Aktif`/`Rate Card` (role-appropriate). `CreatorDashboardTopbar.tsx:31-32` adds breadcrumb labels (`Keuangan`, `Pengaturan`) that must stay in sync with the sidebar.

---

## Constraints to respect

1. **No i18n layer.** Copy is inline in components; there is no message catalog, no locale switcher, and no `.kiro/steering/**`. A language spec cannot assume runtime translation infrastructure, and should specify hardcoded-string conventions instead.
2. **Data/UI separation is hard-enforced.** Status enums stay English lowercase in state/data (`docs/marketiv-md/database/08-frontend-data-contract.md:17`; `docs/audits/umkm-kreator-integration-design-and-rules.md:79`); Indonesian only via presentation maps (`src/lib/umkm-status.ts:9-13` calls itself "SATU-SATUNYA tempat penerjemahan status untuk dashboard UMKM"; `src/lib/creator-status.ts:13-15` is its pair). Any label change must edit those two files, not state.
3. **Two label maps must stay synchronized.** `src/lib/umkm-status.ts` and `src/lib/creator-status.ts` independently translate the same backend enums and currently disagree (see conflicts). A spec must mandate a single shared label source or explicit cross-file equality.
4. **`docs/marketiv-md/features/18-status-lifecycle-reference.md` is explicitly non-canonical.** `docs/marketiv-campaign-submission-admin-authority-ui-spec-v1/00_AUDIT/source-conflicts.md:9-19` and `03_LEGACY_RECONCILIATION/marketiv-md-reconciliation.md:36-37` rule that `src/types/domain.ts` + Appwrite schema are enum truth and its PascalCase sets "must not override current domain truth". Do not standardize on its label strings without checking `src/types/domain.ts`.
5. **Route/constant drift to not encode.** `routes.umkmSettings` points at `/dashboard/umkm/settings` (`src/lib/constants/routes.ts:104`) while the real route is `/dashboard/umkm/pengaturan`; `routes.umkmTransactionDetail` (`:102-103`) targets a non-existent route; negotiation detail route constant uses `orderId` while the folder is `[id_conversation]`; `docs/audits/dashboard-route-audit-matrix.md:27,34-35` cites `/negosiasi/[id_order]`. A spec must reference actual slugs.
6. **Radix / ui-kit component policy.** New interactive UI must use shadcn/ui + Radix primitives and the shared dashboard primitives (`DashboardButton`, `DashboardBadge`, `ResponsiveModal`, `SearchToolbar`, etc.); refactors are incremental and must preserve component APIs, semantics, and accessibility — `.github/copilot-instructions.md`; `.kiro/specs/ui-kit-migration/design.md:5-6,73-77`; `.kiro/specs/refactor-ui-campaigns/requirements.md:6`.
7. **Accessibility is non-negotiable and couples to copy.** Labels, `aria-label`, and visible text are part of the a11y contract (`docs/marketiv-md/technical-guidelines/08-accessibility-and-content-standards.md:21-39`; `:76` "Do not use icons without text for critical actions"). Renaming a button can break icon-only fallbacks and screen-reader copy.
8. **Tests assert exact UI strings.** Copy changes will break snapshot/string assertions. Examples: `src/components/features/creator-dashboard/__tests__/job-detail-controls.test.tsx:82-87` asserts absence of "Urutkan dari"; `src/components/features/umkm-dashboard/creators/__tests__/CreatorSummaryCards.test.tsx:35-43,80-84` asserts "Kreator Terdaftar"/"Kreator Terverifikasi" and asserts `”—”` is shown instead of `"Rp 0"`; `.kiro/specs/demo-readiness-p0/design.md:284-294` built tests around exact copy ("Kreator Terverifikasi", "Terverifikasi", "segera hadir"). A language spec must treat these as update targets.
9. **Zero-chat rule freezes some vocabulary.** Campaign Mode must never render chat/contact copy (`docs/marketiv-md/technical-guidelines/08-accessibility-and-content-standards.md:83`; `ui-ux/05-dashboard-umkm-guidelines.md:35`; `ui-ux/06-dashboard-kreator-guidelines.md:95`). Any CTA/wording spec must not reintroduce contact affordances.
10. **Hardcoded mock/brand strings are known debt, not a license.** `"Dapur Sehat Sukabumi"` fallbacks (`docs/audits/2026-07-28-validasi-sidebar-integrasi.md:102-103`), fabricated sidebar panels (`:89-93`), and unverifiable claim copy (`docs/audits/codebase-audit-2026-09-27.md:158`, item 2.10) are flagged for removal — a spec should forbid new examples of this pattern.
11. **Failure/empty/error copy is mandatory per page.** Every page must implement loading/empty/error/unauthorized/success states with actionable Indonesian copy (`docs/marketiv-md/technical-guidelines/08-accessibility-and-content-standards.md:88`; `docs/marketiv-md/features/04-umkm-dashboard.md:66-71`), so a revamp must cover state copy, not just headings and nav.
12. **Do not translate domain loanwords that the repo keeps English.** `Brief`, `Rate Card`, `Job Pool`, `Campaign Mode`, `Collab Post`, `Escrow`, `Escrow Release`, `Escrow` transaction types, and social-platform terms are used as-is across docs and shipped UI; a spec should standardize their casing/spelling rather than invent Indonesian replacements.
    - **Overridden 2026-09-27 by product decision.** The owner chose full Indonesianisation. See "Resolutions shipped" below. `Marketiv`, `TikTok`, `Instagram`, `Reels`, `P2MW`, `CSV`, `QRIS`, and `Virtual Account` remain untranslated as proper nouns; all other loanwords in this constraint were localised.

---

## Resolutions shipped (2026-09-27)

Shipped under `.kiro/specs/dashboard-language-consistency-id/`. Gate results: `npx tsc --noEmit` clean, `npm run build` succeeds, `npx vitest run --fileParallelism=false` reports 81 of 81 test files passing, `npx eslint src` unchanged at 4 errors / 48 warnings. 150 files touched, 7 dead components deleted.

| Conflict | Shipped resolution |
|---|---|
| Campaign vs Kampanye | `Kampanye` in all user copy. `Campaign Mode` became `Mode Kampanye`. |
| Kreator vs Creator | `Kreator` everywhere, including strings produced by `creator.adapter.ts` and the rate card review screens. |
| draft label | `Draf` for every draft status. `Konsep` survives only where it names the campaign concept the user authors. |
| escrow badge label | `Dana Aman` in both dashboards for `OrderStatus.escrow`, `EscrowStatus.held`, and `TransactionStatus.held`, with the gloss `dana ditahan sementara` on first use per screen. |
| fraud/rejected label | `Terindikasi Kecurangan` in both dashboards. |
| transaction pending label | Perspective-aware through `getTransactionStatusLabel(status, perspective)`: `Menunggu Pembayaran` for the paying side, `Menunggu Diproses` for the receiving side. |
| withdrawal wording | CTA `Tarik Dana` and `Ajukan Penarikan`; record noun `Penarikan`; `Pencairan` reserved for escrow release. |
| wallet naming | `Saldo` for the amount, `Dompet` for the container. `Wallet` removed from rendered copy. |
| analytics page title | `Analitik & Wawasan`. |
| notification page title | Plain `Notifikasi` for both roles; the eyebrow carries the role. |
| nav Overview vs Dashboard | Both sidebars use `Ringkasan` for the home item. |
| nav label for negotiations | `Negosiasi` retained as the canonical noun. Stage `chatting` renders as `Diskusi`. |
| docs campaign vs shipped Kampanye | Both status maps, every filter list, and the badge components now derive from `src/lib/dashboard-labels.ts`. `docs/marketiv-md/**` wording remains unreconciled and was out of scope. |

Label sources after the change: `src/lib/umkm-status.ts` and `src/lib/creator-status.ts` are thin re-export shims over `src/lib/dashboard-labels.ts`; `finance.utils.ts` delegates its label functions; `CreatorStatusBadge` resolves through `resolveStatusLabel` / `resolveTransactionStatusLabel` and can no longer render a raw status slug.

Fixes shipped beyond the conflict table: the ungrammatical `Kreator Akun` sidebar fallback became `Kreator Belum Terverifikasi`; the earlier audit under-counted `kamu` (26 occurrences across 11 files, not 1); all validation messages in `src/lib/validations/**` were localised; `P2MW` was confirmed as a legitimate program name and kept.

Still open, out of copy scope: `routes.umkmSettings` points at `/dashboard/umkm/settings` while the real route is `/dashboard/umkm/pengaturan`; five `"use client"` route files still cannot export `metadata.title`; the older specs `umkm-dashboard-radix-refactor`, `umkm-layout-system`, and `ui-kit-migration` still list the deleted `KPISection.tsx` as a component to migrate.
