# Language Audit - UMKM Dashboard

Scope: read-only language/copy audit of the UMKM dashboard in `marketiv-web` (Next.js 16 App Router), performed 2026-09-27. Paths scanned: every `page.tsx`/`loading.tsx`/`error.tsx`/`layout.tsx` under `src/app/dashboard/umkm/**`; all of `src/components/features/umkm-dashboard/**`; `src/constants/umkm-dashboard.constants.ts`; and the shared chrome actually rendered by UMKM routes (`src/components/features/dashboard/**`, `src/components/features/shared/**`, `src/components/features/dashboard/shared/**`, `src/components/ui/**` primitives reached through those, plus label-feeding config such as `src/lib/ratecard-review/review-state.ts`). No source file was modified. Note: an inventory can only list rows traceable to a line that was actually read; consistent Indonesian strings are counted in the Summary and the clean rows are listed where they define a screen's chrome, while the tables deliberately foreground every string that needs a decision. Rows marked `(verify)` are strings whose component is defined in the scanned tree but whose render path could not be confirmed, or slightly ambiguous issues.

## Summary

| Metric | Count |
| --- | --- |
| Strings reviewed (rows in inventory tables below) | ~248 |
| English-term occurrences (`campaign`, `escrow`, `views`, `creator`, `brief`, `submission`, `order`, `rate card`, `pending`, `engagement`, `delivery`, `latest`, `scope`, `review`, ...) | ~124 |
| Inconsistent-term occurrences (same concept labelled differently on sibling screens) | ~31 |
| Mixed-case occurrences (casing unit/romanization drift inside one label, e.g. `1K` vs `1.000`, `1rb`) | ~26 |

High-level finding: the dashboard is *mostly* Indonesian, but a stable English layer persists in exactly the places users read closely — status labels, wizard copy, analytics KPI titles, the finance filters, and the entire Rate Card review workbench (which is close to untranslated). The dominant inconsistency is `campaign` vs `kampanye` (both appear in neighbouring components and even in the same sentence family) and `creator` vs `kreator`.

## Inventory by screen

Column semantics: `Issue type` = `EN term` | `Mixed ID/EN` | `Mixed casing` | `Jargon` | `Inconsistent with sibling screen`. `Severity`: `P0` user cannot understand, `P1` inconsistency/untranslated term, `P2` polish.

### `/dashboard/umkm` overview (Hero + sections)

| File:Line | Current text | Issue type | Suggested Indonesian | Severity |
| --- | --- | --- | --- | --- |
| `src/components/features/umkm-dashboard/overview/HeroOverview.tsx:40` | `CAMPAIGN AKTIF` | Mixed ID/EN | `KAMPANYE AKTIF` | P1 |
| `src/components/features/umkm-dashboard/overview/HeroOverview.tsx:48` | `TOTAL VIEWS` | EN term | `TOTAL TAYANGAN` | P1 |
| `src/components/features/umkm-dashboard/overview/HeroOverview.tsx:98` | `DASHBOARD UMKM` | EN term | `DASBOR UMKM` | P2 |
| `src/components/features/umkm-dashboard/overview/UmkmOverviewClient.tsx:46` | `Gagal memuat ringkasan dashboard.` | EN term | `Gagal memuat ringkasan dasbor.` | P2 |
| `src/components/features/umkm-dashboard/overview/UmkmOverviewClient.tsx:102` | `Sebagian data ringkasan di bawah ini adalah estimasi (mencapai batas maksimal sistem 5000 data).` | — (clean) | — | — |
| `src/components/features/umkm-dashboard/overview/CampaignSection.tsx:18` | `draft: { label: "Konsep" }` | Inconsistent with sibling screen | `Draf` (align with `CampaignCard`/`DashboardBadge`) | P1 |
| `src/components/features/umkm-dashboard/overview/CampaignSection.tsx:140` | `/ 1rb Tayangan` | Mixed casing | `/ 1.000 tayangan` (align with detail card) | P2 |
| `src/components/features/umkm-dashboard/overview/CampaignSection.tsx:138` | `Komisi:` | — (clean) | — | — |
| `src/components/features/umkm-dashboard/overview/CampaignSection.tsx:164` | `ANGGARAN` | — (clean) | — | — |
| `src/components/features/umkm-dashboard/overview/CampaignSection.tsx:207-221` | `Buat Kampanye Baru` / `Jelajahi Kreator` / `Cari Kreator` | — (clean) | — | — |
| `src/components/features/umkm-dashboard/overview/ActivityTimeline.tsx:63` | `Aktivitas Campaign` | EN term | `Aktivitas Kampanye` | P1 |
| `src/components/features/umkm-dashboard/overview/ActivityTimeline.tsx:97` | `Mulai kampanye agar kreator dapat mengklaim job Anda.` | EN term | `Mulai kampanye agar kreator dapat mengklaim pekerjaan Anda.` | P1 |
| `src/components/features/umkm-dashboard/overview/ActivityTimeline.tsx:106` | `Riwayat klaim & bukti posting akan tampil otomatis di sini.` | — (clean) | — | — |
| `src/components/features/umkm-dashboard/overview/ActivityTimeline.tsx:165` | `Aktivitas klaim & submission kreator akan muncul otomatis di sini.` | EN term | `Aktivitas klaim & pengiriman bukti kreator ...` | P1 |
| `src/components/features/umkm-dashboard/overview/FinancialOverview.tsx:32` | `Saldo Escrow` | EN term | `Saldo Dana Aman` | P1 |
| `src/components/features/umkm-dashboard/overview/FinancialOverview.tsx:43` | `Pending Verifikasi` | EN term | `Menunggu Verifikasi` | P1 |
| `src/components/features/umkm-dashboard/overview/FinancialOverview.tsx:44` | `{pendingValidation} Submission` | EN term | `{n} Bukti Konten` | P1 |
| `src/components/features/umkm-dashboard/overview/FinancialOverview.tsx:46` | `Submission` (note) | EN term | `Bukti konten` | P1 |
| `src/components/features/umkm-dashboard/overview/FinancialOverview.tsx:56` | `Sejak bergabung` | — (clean) | — | — |
| `src/components/features/umkm-dashboard/overview/InsightSection.tsx:88` | `INSIGHT & SARAN` | EN term | `WAWASAN & SARAN` | P2 |
| `src/components/features/umkm-dashboard/overview/InsightSection.tsx:91` | `Saran & Petunjuk Usaha` | — (clean) | — | — |
| `src/components/features/umkm-dashboard/overview/InsightSection.tsx:149,157,160` | `Cari Kreator` / `Lihat Analitik` / `Pelajari Selengkapnya` | — (clean) | — | — |
| `src/components/features/umkm-dashboard/overview/QuickActions.tsx:21-53` | `Buat Kampanye` / `Cari Kreator` / `Lihat Kampanye` / `Kelola Keuangan` | — (clean) | — | — |
| `src/components/features/dashboard/shared/ProfileCompletionCard.tsx:29,39` | `Profil Belum Lengkap` / `Lengkapi Profil` | — (clean) | — | — |
| `src/components/features/umkm-dashboard/overview/KPISection.tsx:124-190` | `Campaign Aktif`, `Campaign Selesai`, `Total Views`, `Dana Escrow`, `Ringkasan KPI Bisnis` | EN term | `Kampanye Aktif`, `Kampanye Selesai`, `Total Tayangan`, `Dana Aman`, `Ringkasan Metrik Bisnis` | P1 (verify: component not imported anywhere — dead code) |

### `/dashboard/umkm/campaign` (list)

| File:Line | Current text | Issue type | Suggested Indonesian | Severity |
| --- | --- | --- | --- | --- |
| `src/components/features/umkm-dashboard/campaign/CampaignsPage.tsx:175` | `Gagal memuat campaign.` | EN term | `Gagal memuat kampanye.` | P1 |
| `src/components/features/umkm-dashboard/campaign/CampaignsPage.tsx:222` | `Campaign "..." berhasil dijeda.` | EN term | `Kampanye "..." berhasil dijeda.` | P1 |
| `src/components/features/umkm-dashboard/campaign/CampaignsPage.tsx:224` | `Gagal menjeda campaign.` | EN term | `Gagal menjeda kampanye.` | P1 |
| `src/components/features/umkm-dashboard/campaign/CampaignsPage.tsx:248` | `Draft "..." berhasil dihapus.` | Jargon | `Draf "..." berhasil dihapus.` | P2 |
| `src/components/features/umkm-dashboard/campaign/CampaignsPage.tsx:259` | `Gagal menerbitkan campaign.` | EN term | `Gagal menerbitkan kampanye.` | P1 |
| `src/components/features/umkm-dashboard/campaign/CampaignsPage.tsx:263` | `Campaign "..." kini tayang di Job Pool.` | Mixed ID/EN | `Kampanye "..." kini tayang di Daftar Pekerjaan.` | P1 |
| `src/components/features/umkm-dashboard/campaign/CampaignsPage.tsx:282` | `Campaign baru "..." berhasil dibuat sebagai Draft.` | EN term | `Kampanye baru "..." berhasil dibuat sebagai draf.` | P1 |
| `src/components/features/umkm-dashboard/campaign/CampaignsPage.tsx:285` | `Gagal menduplikasi campaign.` | EN term | `Gagal menduplikasi kampanye.` | P1 |
| `src/components/features/umkm-dashboard/campaign/CampaignsPage.tsx:332` | `Campaign tidak ditemukan` | EN term | `Kampanye tidak ditemukan` | P1 |
| `src/components/features/umkm-dashboard/campaign/CampaignsPage.tsx:335` | `Reset Filter` | Mixed ID/EN | `Atur Ulang Filter` | P2 |
| `src/components/features/umkm-dashboard/campaign/CampaignsPage.tsx:397` | `Hapus Draft Campaign?` | EN term | `Hapus Draf Kampanye?` | P1 |
| `src/components/features/umkm-dashboard/campaign/CampaignsPage.tsx:404` | `... beserta brief dan aset ...` | EN term | `... beserta arahan dan aset ...` | P1 |
| `src/components/features/umkm-dashboard/campaign/CampaignsPage.tsx:407` | `... dana escrow ... Jeda Campaign.` | EN term | `... dana yang tertahan ... Jedakan Kampanye.` | P1 |
| `src/components/features/umkm-dashboard/campaign/CampaignsPage.tsx:429-438` | Export column keys `Niche`, `Budget (Rp)`, `Budget Tersisa (Rp)`, `Total Views` | EN term | `Kategori`, `Anggaran (Rp)`, `Anggaran Tersisa (Rp)`, `Total Tayangan` | P2 |
| `src/components/features/umkm-dashboard/campaign/CampaignsHeader.tsx:17-42` | `Kelola Kampanye` / `Kampanye Saya` / `Unduh Laporan` / `Buat Kampanye Baru` | — (clean) | — | — |
| `src/components/features/umkm-dashboard/campaign/CampaignSummaryCards.tsx:61-98` | `Total Kampanye`, `Kampanye Aktif`, `Kampanye Selesai`, `Total Tayangan`, `Bukti Konten Menunggu`, `Dana Aman Kampanye` | — (clean) | — | — |
| `src/components/features/umkm-dashboard/campaign/CampaignToolbar.tsx:20` | `Budget Tertinggi` | EN term | `Anggaran Tertinggi` | P1 |
| `src/components/features/umkm-dashboard/campaign/CampaignToolbar.tsx:21` | `Views Terbanyak` | EN term | `Tayangan Terbanyak` | P1 |
| `src/components/features/umkm-dashboard/campaign/CampaignToolbar.tsx:85` | `Cari nama campaign atau produk...` | EN term | `Cari nama kampanye atau produk...` | P1 |
| `src/components/features/umkm-dashboard/campaign/CampaignToolbar.tsx:9-14` | Status tabs `Semua Status`/`Aktif`/`Draft`/`Penuh`/`Selesai`/`Dibatalkan` | Inconsistent with sibling screen | `Draf`; also `Penuh`/`Dibatalkan` have no count mapping in `CampaignsPage` (`paused` missing) | P1 (verify) |
| `src/components/features/umkm-dashboard/campaign/CampaignCard.tsx:88-93` | `Terbitkan Campaign`, `Edit Draft`, `Duplikasi Campaign`, `Batalkan Campaign`, `Hapus Draft` | EN term | `Terbitkan Kampanye`, `Ubah Draf`, `Duplikasi Kampanye`, `Batalkan Kampanye`, `Hapus Draf` | P1 |
| `src/components/features/umkm-dashboard/campaign/CampaignCard.tsx:180` | `Komisi: ... / 1K tayangan` | Mixed casing | `... / 1.000 tayangan` | P2 |
| `src/components/features/umkm-dashboard/campaign/CampaignCard.tsx:191` | `{n} Views` | EN term | `{n} Tayangan` | P1 |
| `src/components/features/umkm-dashboard/campaign/CampaignCard.tsx:203` | `Anggaran Terpakai` | — (clean) | — | — |
| `src/components/features/umkm-dashboard/campaign/CampaignCard.tsx:241` | `{pendingCount} Pending` | EN term | `{n} Menunggu` | P1 |
| `src/components/features/umkm-dashboard/campaign/CampaignCard.tsx:244` | `{validCount} Valid` | EN term | `{n} Disetujui` | P1 |
| `src/components/features/umkm-dashboard/campaign/CampaignCard.tsx:248` | `{disputeCount} Sengketa` | — (clean) | — | — |
| `src/components/features/umkm-dashboard/campaign/CampaignCard.tsx:265` | `Lanjutkan Draft` / `Lihat Detail` | EN term | `Lanjutkan Draf` / `Lihat Detail` | P1 |
| `src/components/features/umkm-dashboard/campaign/CampaignTable.tsx:57,65,71,81,90` | `Terbitkan Kampanye`, `Ubah Konsep`, `Salin Kampanye`, `Batalkan Kampanye`, `Hapus Konsep` | Inconsistent with sibling screen | Align with `CampaignCard`: pick `Terbitkan Kampanye` / `Ubah Draf` / `Duplikasi Kampanye` / `Batalkan Kampanye` / `Hapus Draf` | P1 |
| `src/components/features/umkm-dashboard/campaign/CampaignTable.tsx:146,149,153` | `{n} Menunggu`, `{n} Disetujui`, `{n} Sengketa` | Inconsistent with sibling screen | Card uses `Pending`/`Valid` — unify | P1 |
| `src/components/features/umkm-dashboard/campaign/CampaignTable.tsx:193-201` | Headers `Kampanye`/`Status`/`Kategori`/`Tayangan`/`Anggaran (Terpakai/Total)`/`Kuota Kreator`/`Bukti Konten`/`Dibuat`/`Aksi` | — (clean) | — | — |
| `src/components/features/umkm-dashboard/campaign/CampaignEmptyState.tsx:16-23` | `Belum Ada Kampanye` / `Buat Kampanye Baru` | — (clean) | — | — |
| `src/components/features/umkm-dashboard/campaign/CampaignErrorState.tsx:17-24` | `Gagal Memuat Kampanye` / `Coba Lagi` | — (clean) | — | — |
| `src/components/features/umkm-dashboard/campaign/campaignsEmptyVariants.ts:11-49` | `Slot Campaign`, `Buat Kampanye Pay-Per-View Baru`, `...reward CPM...`, `...Collab Post resmi`, `...sistem Escrow hingga deal tuntas` | Mixed ID/EN | `Slot Kampanye`, `Buat Kampanye Bayar-Per-Tayangan Baru`, `...sistem Dana Aman hingga kesepakatan tuntas` | P1 |
| `src/components/features/umkm-dashboard/campaign/DashboardBadge` (via `shared/DashboardBadge.tsx:19-43`) | status labels `Draft`, `Aktif`, `Penuh`, `Selesai`, `Dibatalkan`, `Pending`, `Valid`, `Fraud`, `Sengketa` | Inconsistent with sibling screen | `Draf`, `Menunggu`, `Disetujui`, `Kecurangan`; `paused` has no case → raw `paused` leaks | P1 (verify) |

### `/dashboard/umkm/campaign/[campaignId]` (detail)

| File:Line | Current text | Issue type | Suggested Indonesian | Severity |
| --- | --- | --- | --- | --- |
| `src/components/features/umkm-dashboard/campaign/detail/CampaignDetailPage.tsx:79` | `Campaign tidak ditemukan.` | EN term | `Kampanye tidak ditemukan.` | P1 |
| `src/components/features/umkm-dashboard/campaign/detail/CampaignDetailPage.tsx:103,105,116,118` | `Campaign "..." berhasil dijeda.` / `Gagal menjeda campaign.` / `... berhasil diaktifkan kembali.` / `Gagal mengaktifkan campaign.` | EN term | Replace `campaign` → `kampanye` | P1 |
| `src/components/features/umkm-dashboard/campaign/detail/CampaignDetailPage.tsx:186` | `Tautan folder aset berhasil disalin.` | — (clean) | — | — |
| `src/components/features/umkm-dashboard/campaign/detail/CampaignDetailPage.tsx:228-237` | Export keys `ID Submission`, `Views`, `Fraud Status`, `Dana Dicairkan (Rp)`, `Divalidasi` | Mixed ID/EN | `ID Bukti Konten`, `Tayangan`, `Status Kecurangan`, `Dana Dicairkan (Rp)`, `Divalidasi` | P1 |
| `src/components/features/umkm-dashboard/campaign/detail/CampaignDetailHeader.tsx:25-33` | `Lanjutkan Draft` / `Unduh Laporan Kampanye` / `Aktifkan Kembali Kampanye` / `Unduh Laporan Selesai` | Mixed ID/EN | `Lanjutkan Draf` + rest clean | P1 |
| `src/components/features/umkm-dashboard/campaign/detail/CampaignDetailHeader.tsx:51` | `Kembali ke Daftar Kampanye` | — (clean) | — | — |
| `src/components/features/umkm-dashboard/campaign/detail/CampaignDetailHeader.tsx:80` | `Hentikan Kampanye` | Inconsistent with sibling screen | `Batalkan Kampanye` (other CTAs) or `Jedakan` (matches `paused`) | P1 |
| `src/components/features/umkm-dashboard/campaign/detail/CampaignOverviewCards.tsx:17-80` | `Total Tayangan Video`, `Dana Kampanye`, `Dana Terpakai`, `Sisa Dana Kampanye`, `Kreator Mendaftar`, `Menunggu Validasi` | — (clean) | — | — |
| `src/components/features/umkm-dashboard/campaign/detail/CampaignBudgetCard.tsx:18-57` | `Rincian Anggaran Kampanye` ... `Biaya Layanan Marketiv (2%)` ... `Cara Kerja Pembayaran Kampanye` | — (clean) | — | — |
| `src/components/features/umkm-dashboard/campaign/detail/CampaignWorkspaceCard.tsx:30-32` | `Arahan Konten` / `Foto & Video Produk` / `Laporan Tayangan` | — (clean) | — | — |
| `src/components/features/umkm-dashboard/campaign/detail/CampaignWorkspaceCard.tsx:59` | `INFORMASI KAMPANYE` | — (clean) | — | — |
| `src/components/features/umkm-dashboard/campaign/detail/CampaignWorkspaceCard.tsx:109` | `Bayaran / 1.000 Tayangan` | — (clean) | — | — |
| `src/components/features/umkm-dashboard/campaign/detail/CampaignWorkspaceCard.tsx:177` | `Buka Folder Google Drive / OneDrive` | — (clean) | — | — |
| `src/components/features/umkm-dashboard/campaign/detail/CampaignWorkspaceCard.tsx:205` | `Data Kampanye` | — (clean) | — | — |
| `src/components/features/umkm-dashboard/campaign/detail/CampaignQuickActionsCard.tsx:38-71` | `Lihat Status Validasi Bukti Konten`, `Salin Tautan Folder Foto & Video`, `Unduh Laporan Hasil Kampanye`, `Lihat Riwayat Transaksi` | — (clean) | — | — |
| `src/components/features/umkm-dashboard/campaign/detail/CampaignHealthChecklistCard.tsx:22-49` | `Status Kesiapan Kampanye` + 5 items | — (clean) | — | — |
| `src/components/features/umkm-dashboard/campaign/detail/CampaignActivityTimeline.tsx:18-92` | `Kampanye Dibuat`, `Dana Kampanye Berhasil Disimpan`, `Kampanye Diterbitkan`, `Validasi Bukti Selesai`, `Kampanye Selesai` | — (clean) | — | — |
| `src/components/features/umkm-dashboard/campaign/detail/CampaignActivityTimeline.tsx:207` | `{n} AKTIVITAS` | — (clean) | — | — |
| `src/components/features/umkm-dashboard/campaign/detail/CampaignSubmissionSection.tsx:24-38` | Tabs `Semua` / `Menunggu Validasi` / `Disetujui` / `Ditolak` | — (clean) | — | — |
| `src/components/features/umkm-dashboard/campaign/detail/CampaignSubmissionSection.tsx:116-129` | `Proses Validasi Konten Marketiv`, `1. Kreator Mengirim Bukti`, `2. Verifikasi Admin Marketiv`, `3. Pelepasan Reward` | EN term | `3. Pencairan Reward` (or `Pelepasan Hadiah`) | P1 |
| `src/components/features/umkm-dashboard/campaign/detail/CampaignSubmissionCard.tsx:59` | `Buka Link Tayang` | Mixed ID/EN | `Buka Tautan Tayangan` | P2 |
| `src/components/features/umkm-dashboard/campaign/detail/CampaignSubmissionCard.tsx:68` | label `Views` | EN term | `Tayangan` | P1 |
| `src/components/features/umkm-dashboard/campaign/detail/CampaignSubmissionCard.tsx:78` | label `Reward` | EN term | `Hadiah` | P1 |
| `src/components/features/umkm-dashboard/campaign/detail/CampaignNotFoundState.tsx:13-21` | `Kampanye Tidak Ditemukan` / `Kembali ke Kampanye Saya` | — (clean) | — | — |
| `src/components/features/umkm-dashboard/campaign/detail/CampaignAssetCard.tsx:23-74` | `Foto & Video Produk`, `Tautan Folder Aset`, `Buka Folder Foto & Video` | — (clean) | — | (verify: component not imported) |
| `src/components/features/umkm-dashboard/campaign/CampaignActionMenu.tsx:63-104` | `Lihat Detail`, `Ubah Konsep`, `Salin Kampanye`, `Unduh Laporan`, `Batalkan Kampanye` | Inconsistent with sibling screen | Align with one vocabulary | P1 (verify: not imported) |

### `/dashboard/umkm/campaign/buat` (wizard) + steps + cards

| File:Line | Current text | Issue type | Suggested Indonesian | Severity |
| --- | --- | --- | --- | --- |
| `src/components/features/umkm-dashboard/create-campaign/CampaignWizardHeader.tsx:18` | `Wizard Campaign` | Mixed ID/EN | `Panduan Langkah Kampanye` | P1 |
| `src/components/features/umkm-dashboard/create-campaign/CampaignWizardHeader.tsx:23` | `Buat Campaign Baru` | EN term | `Buat Kampanye Baru` | P1 |
| `src/components/features/umkm-dashboard/create-campaign/CampaignWizardHeader.tsx:26` | `Buat campaign berbasis views, atur brief, aset, budget, dan kuota kreator dalam satu alur.` | Mixed ID/EN | `Buat kampanye berbasis tayangan, atur arahan, aset, anggaran, dan kuota kreator dalam satu alur.` | P0 |
| `src/components/features/umkm-dashboard/create-campaign/CampaignWizardHeader.tsx:37,45` | `Kembali` / `Simpan Draft` | Mixed ID/EN | `Kembali` / `Simpan Draf` | P2 |
| `src/components/features/umkm-dashboard/create-campaign/CampaignWizardStepper.tsx:17-18` | `Produk`/`Arahan`/`Bahan`/`Anggaran`/`Ringkasan` + subtitles | — (clean) | — | — |
| `src/components/features/umkm-dashboard/create-campaign/CampaignWizardFooter.tsx:56,71,85,91,96` | `Langkah {n} dari {m}`, `Kembali`, `Memproses...`, `Bayar ...`, `Langkah Berikutnya` | — (clean) | — | — |
| `src/components/features/umkm-dashboard/create-campaign/CampaignWizardFooter.tsx:35` | `Pembayaran diproses aman melalui Midtrans` | — (clean) | — | — |
| `src/components/features/umkm-dashboard/create-campaign/CampaignLivePreviewCard.tsx:97` | `Live Preview` | EN term | `Pratinjau Langsung` | P1 |
| `src/components/features/umkm-dashboard/create-campaign/CampaignLivePreviewCard.tsx:108` | `Ganti Gambar Cover` / `Upload Gambar Cover` | Mixed ID/EN | `Ganti Gambar Sampul` / `Unggah Gambar Sampul` | P1 |
| `src/components/features/umkm-dashboard/create-campaign/CampaignLivePreviewCard.tsx:112` | `Pilih foto background card` | Mixed ID/EN | `Pilih foto latar kartu` | P2 |
| `src/components/features/umkm-dashboard/create-campaign/CampaignLivePreviewCard.tsx:132` | `Judul campaign akan muncul di sini` | EN term | `Judul kampanye akan muncul di sini` | P1 |
| `src/components/features/umkm-dashboard/create-campaign/CampaignLivePreviewCard.tsx:148` | `Anggaran Escrow` | EN term | `Anggaran Dana Aman` | P1 |
| `src/components/features/umkm-dashboard/create-campaign/CampaignLivePreviewCard.tsx:158` | `Bayaran / 1K Views` | EN term | `Bayaran / 1.000 Tayangan` | P1 |
| `src/components/features/umkm-dashboard/create-campaign/CampaignLivePreviewCard.tsx:172` | `{creatorQuota} Slot` | Mixed ID/EN | `{n} Kuota` / `{n} Kreator` | P2 |
| `src/components/features/umkm-dashboard/create-campaign/CampaignLivePreviewCard.tsx:180` | `Target Views` | EN term | `Target Tayangan` | P1 |
| `src/components/features/umkm-dashboard/create-campaign/CampaignHealthChecklist.tsx:35-39,65,91` | `Informasi Produk` ... `Tips Langkah Ini`, `Kelengkapan` | — (clean) | — | — |
| `src/components/features/umkm-dashboard/create-campaign/create-campaign.constants.ts:45` | `Gunakan nama campaign yang mudah dikenali kreator.` | EN term | `Gunakan nama kampanye yang mudah dikenali kreator.` | P1 |
| `src/components/features/umkm-dashboard/create-campaign/create-campaign.constants.ts:46` | `Brief yang jelas mempercepat kreator memahami gaya video.` | EN term | `Arahan yang jelas mempercepat kreator memahami gaya video.` | P1 |
| `src/components/features/umkm-dashboard/create-campaign/create-campaign.constants.ts:37,40-42` | `Niche Rendah / Pemula`, `Saldo Dompet Marketiv`, `Gopay, OVO, Dana, LinkAja, ShopeePay` | Mixed ID/EN | `Kategori ...`, `Saldo Dompet Marketiv` | P2 |
| `src/components/features/umkm-dashboard/create-campaign/steps/ProductInfoStep.tsx:101` | `Gambar Produk Campaign` | EN term | `Gambar Produk Kampanye` | P1 |
| `src/components/features/umkm-dashboard/create-campaign/steps/ProductInfoStep.tsx:110` | alt `Pratinjau gambar produk campaign` | EN term | `Pratinjau gambar produk kampanye` | P1 |
| `src/components/features/umkm-dashboard/create-campaign/steps/ProductInfoStep.tsx:146` | `Ganti Gambar` / `Upload Gambar` | Mixed ID/EN | `Ganti Gambar` / `Unggah Gambar` | P2 |
| `src/components/features/umkm-dashboard/create-campaign/steps/ProductInfoStep.tsx:150-153` | `Upload foto produk yang akan dipromosikan dalam campaign ini. Gambar ini akan ditampilkan kepada creator sebagai representasi utama campaign.` | Mixed ID/EN | `Unggah foto produk ... kampanye ini. Gambar ini akan ditampilkan kepada kreator sebagai representasi utama kampanye.` | P0 |
| `src/components/features/umkm-dashboard/create-campaign/steps/ProductInfoStep.tsx:86-260` | `Nama Produk atau Judul Kampanye`, `Kategori Kreator`, `Jenis Kampanye`, `Deskripsi Singkat Produk` + placeholders | — (clean) | — | — |
| `src/components/features/umkm-dashboard/create-campaign/steps/BriefGuidelineStep.tsx:228` | `− Sembunyikan catalog` / `+ Lihat arahan lainnya` | EN term | `− Sembunyikan katalog` | P1 |
| `src/components/features/umkm-dashboard/create-campaign/steps/BriefGuidelineStep.tsx:333` | `Gaya / Tone Video Konten` | Mixed ID/EN | `Gaya / Nada Video Konten` | P2 |
| `src/components/features/umkm-dashboard/create-campaign/steps/BriefGuidelineStep.tsx:354` | `Call to Action (CTA) yang Diinginkan` | EN term | `Ajakan Bertindak (CTA) yang Diinginkan` | P1 |
| `src/components/features/umkm-dashboard/create-campaign/steps/BriefGuidelineStep.tsx:154-535` | `Arahan Konten`, `Arahan Cepat`, `Wajib Ditampilkan`, `Perlu Dihindari`, `Aturan Tambahan (Opsional)`, `Tagar & Rekomendasi Teks Postingan (Opsional)` | — (clean) | — | — |
| `src/components/features/umkm-dashboard/create-campaign/steps/AssetLinkStep.tsx:139-142` | guide list with parenthetical English: `Bagikan (Share)`, `Salin Tautan (Copy link)`, `Anyone with the link` | Mixed ID/EN | Keep Indonesian first; move English gloss to a tooltip or drop | P2 |
| `src/components/features/umkm-dashboard/create-campaign/steps/AssetLinkStep.tsx:77-197` | `Foto & Video Produk`, `Periksa Tautan`, `Sebaiknya folder berisi`, `Catatan untuk Kreator (Opsional)` | — (clean) | — | — |
| `src/components/features/umkm-dashboard/create-campaign/steps/BudgetQuotaStep.tsx:185` | `Nominal Lain (Rupiah / 1.000 views)` | EN term | `Nominal Lain (Rupiah / 1.000 tayangan)` | P1 |
| `src/components/features/umkm-dashboard/create-campaign/steps/BudgetQuotaStep.tsx:78-290` | `Anggaran & Jumlah Kreator`, `Bagaimana dana kampanye digunakan?`, `Kreator Dibayar` | — (clean) | — | — |
| `src/components/features/umkm-dashboard/create-campaign/steps/ReviewEscrowStep.tsx:146,316` | `Ajakan untuk Penonton (CTA)` / `Bayaran / 1K Tayangan:` | Mixed casing | `Ajakan untuk Penonton (CTA)` / `Bayaran / 1.000 Tayangan:` | P2 |
| `src/components/features/umkm-dashboard/create-campaign/steps/ReviewEscrowStep.tsx:174` | `Hashtag / Tagar` | Mixed ID/EN | `Tagar` (or `Tagar (hashtag)`) | P2 |
| `src/components/features/umkm-dashboard/create-campaign/steps/ReviewEscrowStep.tsx:65-400` | `Periksa & Konfirmasi Kampanye`, `Rincian Pembayaran`, `Perlindungan Dana`, `Ketentuan Kampanye Marketiv` | — (clean) | — | — |
| `src/components/features/umkm-dashboard/create-campaign/cards/BriefQualityCard.tsx:25` | `Kategori Niche Terpilih` | Mixed ID/EN | `Kategori Terpilih` | P2 |
| `src/components/features/umkm-dashboard/create-campaign/cards/BriefQualityCard.tsx:26-36,55,64` | `CTA Kampanye Ditentukan`, `Kesempurnaan Arahan`, `Skor Kesempurnaan ({n}/5)` | — (clean) | — | — |
| `src/components/features/umkm-dashboard/create-campaign/cards/BudgetCalculatorCard.tsx:35-99` | `Perkiraan Kampanye`, `Rincian Pembayaran`, `Total yang perlu dibayar` | — (clean) | — | — |
| `src/components/features/umkm-dashboard/create-campaign/CreateCampaignWizard.tsx:392` | confirm `Brief yang sudah Anda tulis akan ditimpa. Lanjutkan?` | EN term | `Arahan yang sudah Anda tulis akan ditimpa. Lanjutkan?` | P1 |
| `src/components/features/umkm-dashboard/create-campaign/CreateCampaignWizard.tsx:894` | `Pembayaran dibatalkan. Campaign tersimpan sebagai draft.` | EN term | `Pembayaran dibatalkan. Kampanye tersimpan sebagai draf.` | P1 |
| `src/components/features/umkm-dashboard/create-campaign/CreateCampaignWizard.tsx:903` | `Campaign berhasil diterbitkan dan kini tayang di Job Pool.` | Mixed ID/EN | `Kampanye berhasil diterbitkan dan kini tayang di Daftar Pekerjaan.` | P1 |
| `src/components/features/umkm-dashboard/create-campaign/CreateCampaignWizard.tsx:897` | itemName `Deposit Escrow Kampanye Marketiv` | EN term | `Titipan Dana Aman Kampanye Marketiv` | P1 |
| `src/components/features/umkm-dashboard/create-campaign/modals/PaymentSimulationModal.tsx:41-88` | `Simpan Dana Kampanye`, `Biaya Platform (2%)`, `Lanjut ke Pembayaran Midtrans` | — (clean) | — | — |
| `src/components/features/umkm-dashboard/create-campaign/modals/CampaignCreatedModal.tsx:27-47` | `Kampanye Berhasil Dibuat!`, `Lihat Kampanye Saya`, `Buat Kampanye Baru Lagi` | — (clean) | — | — |
| `src/components/features/umkm-dashboard/create-campaign/modals/SaveDraftModal.tsx:27,47` | `Simpan sebagai Draft?`, `Simpan Draft` | Mixed ID/EN | `Simpan sebagai Draf?`, `Simpan Draf` | P2 |
| `src/components/features/umkm-dashboard/create-campaign/cards/EscrowSimulationCard.tsx:5-51` | `Simpan Dana Kampanye`, `Cara Kerja Dana Aman Kampanye`, `💡 Jaminan Perlindungan UMKM` | — (clean) | — | (verify: component not imported) |
| `src/components/features/demo/SimulatedSnapModal.tsx:64-233` (rendered by wizard) | `Midtrans Snap Simulator`, `Demo Booth`, `Order ID`, `QRIS / E-Wallet`, `Virtual Account`, `Saldo`/`Salin No. VA`, `Mode Booth Pameran`, `Simulasikan Bayar Berhasil` | Mixed ID/EN | Keep as an explicitly-labelled simulator, but translate `Order ID`→`ID Pesanan`, `Demo Booth`→`Stan Demo` | P1 (out of scanned dir, rendered by UMKM wizard) |

### `/dashboard/umkm/campaign/[campaignId]/edit`

| File:Line | Current text | Issue type | Suggested Indonesian | Severity |
| --- | --- | --- | --- | --- |
| `src/app/dashboard/umkm/campaign/[campaignId]/edit/page.tsx:42` | comment/log only (`Failed to load draft for edit` is `console.warn`, not rendered) | — | — | — |
| `src/app/dashboard/umkm/campaign/[campaignId]/edit/page.tsx:54-66` | Renders `UmkmDashboardChrome` + `CreateCampaignWizard` (copy owned by wizard rows above) | — | — | — |
| `src/components/features/umkm-dashboard/create-campaign/create-campaign.rehydrate.ts` | warning strings shown via `toast.warning` | (verify) | Not read line-by-line; sample and translate if any English | P2 (verify) |

### `/dashboard/umkm/kreator` (directory)

| File:Line | Current text | Issue type | Suggested Indonesian | Severity |
| --- | --- | --- | --- | --- |
| `src/components/features/umkm-dashboard/creators/CreatorDirectoryHeader.tsx:24-94` | `Direktori Kreator`, `Temukan Kreator Terbaik`, `Lihat Negosiasi Aktif` | — (clean) | — | — |
| `src/components/features/umkm-dashboard/creators/CreatorSummaryCards.tsx:47-86` | `Kreator Terdaftar`, `Kreator Terverifikasi`, `Tarif Mulai Dari`, `/ proyek` | — (clean) | — | — |
| `src/components/features/umkm-dashboard/creators/CreatorSummaryCards.tsx:71` | `Rata-rata Engagement` | EN term | `Rata-rata Keterlibatan` | P1 |
| `src/components/features/umkm-dashboard/creators/CreatorToolbar.tsx:25` | `Rating Tertinggi` | Mixed ID/EN | `Peringkat Tertinggi` | P2 |
| `src/components/features/umkm-dashboard/creators/CreatorToolbar.tsx:28` | `Engagement Tertinggi` | EN term | `Keterlibatan Tertinggi` | P1 |
| `src/components/features/umkm-dashboard/creators/CreatorToolbar.tsx:60` | `Cari nama kreator atau keahlian...` | — (clean) | — | — |
| `src/components/features/umkm-dashboard/creators/CreatorCard.tsx:145` | `Engagement` | EN term | `Keterlibatan` | P1 |
| `src/components/features/umkm-dashboard/creators/CreatorCard.tsx:156` | `Order Selesai` | EN term | `Pesanan Selesai` | P1 |
| `src/components/features/umkm-dashboard/creators/CreatorCard.tsx:82,117,167,183,425` | `Baru`, `{n} ulasan`, `Estimasi Biaya Jasa`, `Lihat Profil` | — (clean) | — | — |
| `src/components/features/umkm-dashboard/creators/CreatorErrorState.tsx:8,17,27` | `Gagal memuat data kreator...`, `Terjadi Kesalahan`, `Coba Lagi` | — (clean) | — | — |
| `src/components/features/umkm-dashboard/creators/CreatorEmptyState.tsx:16-26` | `Kreator Tidak Ditemukan`, `Hapus Filter & Pencarian` | — (clean) | — | — |
| `src/components/features/umkm-dashboard/creators/creator.adapter.ts:64` | `Belum menuliskan deskripsi profil.` | — (clean) | — | — |
| `src/components/features/umkm-dashboard/creators/creator.adapter.ts:68` | `Belum ada rate card` | EN term | `Belum ada paket harga` | P1 |

### `/dashboard/umkm/kreator/[id]` (creator detail)

| File:Line | Current text | Issue type | Suggested Indonesian | Severity |
| --- | --- | --- | --- | --- |
| `src/components/features/umkm-dashboard/creators/detail/CreatorDetailPage.tsx:57,65,73,81,134` | `Gagal memuat profil kreator.`, `Gagal memuat paket rate card.`, `Gagal memuat portofolio.`, `Gagal memuat akun sosial.`, `Kembali ke Direktori` | EN term | `Gagal memuat paket harga.` | P1 |
| `src/components/features/umkm-dashboard/creators/detail/CreatorProfileHero.tsx:37` | `Kreator Terverifikasi` | — (clean) | — | — |
| `src/components/features/umkm-dashboard/creators/detail/CreatorProfileHero.tsx:83` | `Followers` | EN term | `Pengikut` | P1 |
| `src/components/features/umkm-dashboard/creators/detail/CreatorProfileHero.tsx:109` | `Order Selesai` | EN term | `Pesanan Selesai` | P1 |
| `src/components/features/umkm-dashboard/creators/detail/CreatorStatsCards.tsx:11` | `Tingkat Keterlibatan` | Inconsistent with sibling screen | Same concept shown as `Engagement` elsewhere — unify on `Tingkat Keterlibatan` | P1 |
| `src/components/features/umkm-dashboard/creators/detail/CreatorStatsCards.tsx:23` | `Pesanan Selesai` | Inconsistent with sibling screen | Card/hero use `Order Selesai` — unify | P1 |
| `src/components/features/umkm-dashboard/creators/detail/CreatorStatsCards.tsx:35-37` | `Rata-rata Tayangan`, `Data belum tersedia` | — (clean) | — | — |
| `src/components/features/umkm-dashboard/creators/detail/CreatorNotFoundState.tsx:14-23` | `Profil Kreator Tidak Ditemukan`, `Kembali ke Direktori` | — (clean) | — | — |
| `src/components/features/umkm-dashboard/creators/detail/RateCardPackagesSection.tsx:26` | `Rate Card Kolaborasi` | EN term | `Paket Harga Kolaborasi` | P1 |
| `src/components/features/umkm-dashboard/creators/detail/RateCardPackagesSection.tsx:30-52` | `Pilihan Paket Harga Kreator`, `Kreator ini belum mempublikasikan paket harga.` | — (clean) | — | — |
| `src/components/features/umkm-dashboard/creators/detail/RateCardPackageCard.tsx:87,101,106,115,143` | `Pengerjaan`, `Revisi`, `Revisi Brief`, `Yang Akan Anda Dapatkan`, `Pilih Paket Ini` | EN term | `Revisi Arahan` | P1 |
| `src/components/features/umkm-dashboard/creators/detail/CreatorPortfolioSection.tsx:50-73` | `Portofolio Konten Terbaru`, `Kreator ini belum menambahkan portofolio konten.` | — (clean) | — | — |
| `src/components/features/umkm-dashboard/creators/detail/CreatorSocialLinksCard.tsx:67,85,127` | `Saluran Media Sosial`, `Kreator ini belum menghubungkan akun sosial media.`, `Followers` | EN term | `Pengikut` | P1 |
| `src/components/features/umkm-dashboard/creators/modals/StartNegotiationModal.tsx:41,63,65` | `Gagal membuka ruang negosiasi.`, `Diskusi & Negosiasi`, `Buka Chat dengan {name}` | Mixed ID/EN | `Buka Obrolan dengan {name}` | P2 |
| `src/components/features/umkm-dashboard/creators/modals/StartNegotiationModal.tsx:76-80,124` | `Paket Acuan`, `Harga Acuan`, `Masuk ke Chat Negosiasi` | Mixed ID/EN | `Masuk ke Obrolan Negosiasi` | P2 |
| `src/components/features/umkm-dashboard/creators/modals/StartNegotiationModal.tsx:93` | `Kirim kesepakatan harga & deadline dari dalam ruang chat.` | EN term | `Kirim kesepakatan harga & batas waktu dari dalam ruang obrolan.` | P1 |

### `/dashboard/umkm/negosiasi` (list)

| File:Line | Current text | Issue type | Suggested Indonesian | Severity |
| --- | --- | --- | --- | --- |
| `src/components/features/umkm-dashboard/negotiation/NegotiationHeader.tsx:13-30` | `Kelola Negosiasi`, `Diskusi Paket Harga Kreator`, `Cari Kreator Baru` | — (clean) | — | — |
| `src/components/features/umkm-dashboard/negotiation/NegotiationSummaryCards.tsx:61-97` | `Negosiasi Aktif`, `Perlu Dibayar`, `Selesai`, `Dibatalkan` | — (clean) | — | — |
| `src/components/features/umkm-dashboard/negotiation/NegotiationSummaryCards.tsx:79` | `Dalam Escrow` | EN term | `Dalam Dana Aman` | P1 |
| `src/components/features/umkm-dashboard/negotiation/negotiation.constants.ts:8` | status filter `Menyiapkan Order` | EN term | `Menyiapkan Pesanan` | P1 |
| `src/components/features/umkm-dashboard/negotiation/negotiation.constants.ts:5-15` | `Diskusi`, `Penawaran Dikirim`, `Ditolak Kreator`, `Dana Aman` (vs `utils` `Negosiasi`/`Menunggu Kreator`/`Penawaran Ditolak`/`Dalam Escrow`) | Inconsistent with sibling screen | Single status vocabulary shared by filter, badge and room header | P1 |
| `src/components/features/umkm-dashboard/negotiation/negotiation.constants.ts:26-31` | `Penawaran Dibuat`, `Pembayaran Anda`, `Dana Tersimpan Aman`, `Kreator Mengerjakan Konten`, `Verifikasi Postingan Bersama`, `Dana Cair ke Kreator` | — (clean) | — | — |
| `src/components/features/umkm-dashboard/negotiation/NegotiationListPage.tsx:58` | `Percakapan dikembalikan ke inbox.` | EN term | `Percakapan dikembalikan ke daftar masuk.` | P2 |
| `src/components/features/umkm-dashboard/negotiation/NegotiationListPage.tsx:161` | `Inbox` | EN term | `Daftar Masuk` | P1 |
| `src/components/features/umkm-dashboard/negotiation/NegotiationListPage.tsx:171` | `Arsip` | — (clean) | — | — |
| `src/components/features/umkm-dashboard/negotiation/NegotiationRoomCard.tsx:199,204,215,239` | `Batas Waktu:`, `Pesan Terakhir:`, `Nilai Proyek`, `Buka Percakapan` | — (clean) | — | — |
| `src/components/features/umkm-dashboard/negotiation/NegotiationRoomCard.tsx:227` | title `Kembalikan ke daftar aktif` / `Arsipkan percakapan` | — (clean) | — | — |
| `src/components/features/umkm-dashboard/negotiation/negotiation.utils.ts:11-76` | `Negosiasi`, `Menunggu Kreator`, `Penawaran Ditolak`, `Menyiapkan Pesanan`, `Menunggu Pembayaran`, `Dalam Escrow`, `Sedang Dikerjakan`, `Revisi`, `Disetujui`, `Selesai`, `Dibatalkan` | Inconsistent with sibling screen | Align `Dalam Escrow` → `Dalam Dana Aman`, `Negosiasi` → `Diskusi` | P1 |
| `src/components/features/umkm-dashboard/negotiation/negotiation.utils.ts:163` | `Belum ditentukan` | — (clean) | — | — |
| `src/components/features/umkm-dashboard/negotiation/NegotiationEmptyState.tsx:20-55` | `Negosiasi Tidak Ditemukan`, `Hapus Filter & Pencarian`, `Belum Ada Percakapan Negosiasi`, `Temukan Kreator` | — (clean) | — | — |
| `src/components/features/umkm-dashboard/negotiation/NegotiationErrorState.tsx:9,20,30` | `Gagal memuat daftar negosiasi...`, `Gagal Memuat Negosiasi`, `Coba Lagi` | — (clean) | — | — |

### `/dashboard/umkm/negosiasi/[id]` (room)

| File:Line | Current text | Issue type | Suggested Indonesian | Severity |
| --- | --- | --- | --- | --- |
| `src/components/features/umkm-dashboard/negotiation/detail/NegotiationRoomPage.tsx:52-62` | `Negosiasi`, `Menunggu Kreator`, `Penawaran Ditolak`, `Menyiapkan Pesanan`, `Menunggu Pembayaran`, `Dalam Escrow`, `Sedang Dikerjakan`, `Revisi`, `Disetujui`, `Selesai`, `Dibatalkan` | Inconsistent with sibling screen | Mirror `negotiation.utils.ts`/`constants.ts` after unification | P1 |
| `src/components/features/umkm-dashboard/negotiation/detail/NegotiationRoomPage.tsx:111` | `Gagal memuat detail negosiasi.` | — (clean) | — | — |
| `src/components/features/umkm-dashboard/negotiation/detail/NegotiationRoomPage.tsx:354,420` | `Bayar dengan Midtrans` | — (clean) | — | — |
| `src/components/features/umkm-dashboard/negotiation/detail/NegotiationRoomPage.tsx:382` | `Kembali ke Negosiasi` | — (clean) | — | — |
| `src/components/features/umkm-dashboard/negotiation/detail/NegotiationRoomPage.tsx:395-397` | `Paket Acuan: ...`, `Harga paket ... Rincian masih dapat dinegosiasikan ...`, `Kesepakatan Final` | — (clean) | — | — |
| `src/components/features/umkm-dashboard/negotiation/detail/NegotiationRoomPage.tsx:405-411` | `Pembayaran diperlukan untuk memulai pekerjaan`, `Pembayaran sedang diperiksa/disiapkan...`, `Belum ada konfirmasi server dari Midtrans...`, `Bayar ... melalui Midtrans.` | — (clean) | — | — |
| `src/components/features/umkm-dashboard/negotiation/detail/NegotiationRoomPage.tsx:487-488` | aria/title `Keluar dari fullscreen chat` / `Fullscreen chat` | EN term | `Keluar dari mode layar penuh` / `Layar penuh obrolan` | P1 |
| `src/components/features/umkm-dashboard/negotiation/detail/NegotiationRoomPage.tsx:573-584` | `Batalkan Pesanan Ini?`, `Batalkan Pesanan` | — (clean) | — | — |
| `src/components/features/umkm-dashboard/negotiation/detail/ChatTimeline.tsx:40,74-75` | `Percakapan Negosiasi`, `Belum Ada Pesan`, `Kirim pesan pertama Anda untuk memulai percakapan.` | — (clean) | — | — |
| `src/components/features/umkm-dashboard/negotiation/detail/MessageComposer.tsx:69,76,83-85,146,170,189` | `Kirim Penawaran Khusus`, `Lakukan Pembayaran`, templates, `Aksi Cepat`, placeholder, `Kirim` | — (clean) | — | — |
| `src/components/features/umkm-dashboard/negotiation/detail/CustomOfferCard.tsx:41-46` | `Menunggu Kreator`, `Diterima — Menunggu Bayar`, `Ditolak Kreator`, `Tawaran Disetujui` | — (clean) | — | — |
| `src/components/features/umkm-dashboard/negotiation/detail/CustomOfferCard.tsx:60-146` | `Penawaran Harga Khusus`, `Judul Proyek`, `Lingkup Pekerjaan`, `Harga Proyek`, `Batas Waktu`, `Batas Revisi`, `Bayar & Simpan Dana Aman`, `Batalkan Penawaran` | — (clean) | — | — |
| `src/components/features/umkm-dashboard/negotiation/detail/OrderSummaryCard.tsx:39-80` | `Ringkasan Proyek`, `Kreator`, `Judul Pekerjaan`, `Harga Kerja Sama`, `Batas Waktu`, `Lingkup Pekerjaan`, `Batalkan Pesanan` | — (clean) | — | — |
| `src/components/features/umkm-dashboard/negotiation/detail/DealChecklistCard.tsx:29-33,50` | `Lingkup Pekerjaan Jelas`, `Harga Disepakati`, `Batas Waktu Disepakati`, `Postingan Bersama di Instagram/TikTok`, `Dana Aman Siap`, `Daftar Kesepakatan` | — (clean) | — | — |
| `src/components/features/umkm-dashboard/negotiation/detail/EscrowStatusCard.tsx:24` | `Status Dana Aman Anda` | — (clean) | — | — |
| `src/components/features/umkm-dashboard/negotiation/detail/DeliverableReviewCard.tsx:14-18` | `Menunggu Validasi Marketiv`, `Menunggu Creator mengirim versi baru`, `Buka Review Pekerjaan`, `Review Sekarang`, `Lihat Review` | Mixed ID/EN | `Menunggu Kreator mengirim versi baru`, `Buka Tinjauan Pekerjaan`, `Tinjau Sekarang`, `Lihat Tinjauan` | P1 |
| `src/components/features/umkm-dashboard/negotiation/detail/CollabPostWarningBanner.tsx:27,42,46` | `Postingan Bersama`, `Ketentuan Publikasi Kolaborasi` | — (clean) | — | — |
| `src/components/features/umkm-dashboard/negotiation/detail/CreatorMiniProfileCard.tsx:22,58` | `Profil Kreator`, `Lihat Profil Lengkap` | — (clean) | — | — |
| `src/components/features/umkm-dashboard/negotiation/detail/NegotiationNotFoundState.tsx:14-23` | `Negosiasi Tidak Ditemukan`, `Kembali ke Daftar Negosiasi` | — (clean) | — | — |
| `src/components/features/umkm-dashboard/negotiation/modals/SendCustomOfferModal.tsx:93` | `Harga paket menjadi acuan. Harga, scope, deadline, dan revisi di bawah tetap dapat diubah.` | Mixed ID/EN | `Harga paket menjadi acuan. Harga, lingkup, batas waktu, dan revisi di bawah tetap dapat diubah.` | P1 |
| `src/components/features/umkm-dashboard/negotiation/modals/SendCustomOfferModal.tsx:63-197` | `Kesepakatan Kerja`, `Kirim Penawaran ke {n}`, `Rincian Pekerjaan & Konten`, `Harga Kesepakatan`, `Batas Revisi`, `Batas Waktu Selesai`, `Kirim Penawaran` | — (clean) | — | — |
| `src/components/features/umkm-dashboard/negotiation/modals/OrderSuccessModal.tsx:27-48` | `Pembayaran Berhasil Dikonfirmasi!`, `Pantau Pesanan` | — (clean) | — | — |
| `src/components/features/umkm-dashboard/negotiation/modals/PaymentSimulationModal.tsx:54` | `Dana ditahan di escrow setelah pembayaran dikonfirmasi server.` | EN term | `Dana ditahan di sistem Dana Aman setelah pembayaran dikonfirmasi server.` | P1 |
| `src/components/features/umkm-dashboard/negotiation/modals/PaymentSimulationModal.tsx:76` | `Tanpa biaya tambahan. Fee platform 2% dipotong dari pendapatan kreator, bukan dari pembayaran kamu.` | Mixed ID/EN | `... Biaya platform 2% dipotong dari pendapatan kreator, bukan dari pembayaran Anda.` | P1 |
| `src/components/features/umkm-dashboard/negotiation/modals/PaymentSimulationModal.tsx:88` | `Setelah lanjut, kamu diarahkan ke halaman pembayaran Midtrans ...` | Inconsistent with sibling screen | Elsewhere the app uses `Anda`; standardize pronoun (`Anda`) | P1 |

### `/dashboard/umkm/review-rate-card` (Rate Card review list + detail)

| File:Line | Current text | Issue type | Suggested Indonesian | Severity |
| --- | --- | --- | --- | --- |
| `src/components/features/umkm-dashboard/ratecard-review/RatecardReviewListPage.tsx:17-20` | Filters `Semua`, `Perlu Tindakan`, `Menunggu Marketiv`, `Revisi`, `Selesai` | — (clean) | — | — |
| `src/components/features/umkm-dashboard/ratecard-review/RatecardReviewListPage.tsx:48` | aria `Memuat review pekerjaan` | Mixed ID/EN | `Memuat tinjauan pekerjaan` | P2 |
| `src/components/features/umkm-dashboard/ratecard-review/RatecardReviewListPage.tsx:122` | `Review Pekerjaan` | EN term | `Tinjau Pekerjaan` | P2 |
| `src/components/features/umkm-dashboard/ratecard-review/RatecardReviewListPage.tsx:124` | `Tinjau hasil terbaru Creator setelah validasi Marketiv. Semua order tetap terpisah meski berasal dari percakapan sama.` | EN term | `Tinjau hasil terbaru kreator setelah validasi Marketiv. Semua pesanan tetap terpisah meski berasal dari percakapan sama.` | P1 |
| `src/components/features/umkm-dashboard/ratecard-review/RatecardReviewListPage.tsx:157` | `Review pekerjaan gagal dimuat` | Mixed ID/EN | `Tinjauan pekerjaan gagal dimuat` | P1 |
| `src/components/features/umkm-dashboard/ratecard-review/RatecardReviewListPage.tsx:160` | `Coba Lagi` | — (clean) | — | — |
| `src/components/features/umkm-dashboard/ratecard-review/RatecardReviewListPage.tsx:168-169` | `Belum ada pekerjaan Rate Card untuk ditinjau.`, `Hasil kerja Creator akan muncul di sini setelah dikirim.` | EN term | `... Hasil kerja kreator akan muncul ...` | P1 |
| `src/components/features/umkm-dashboard/ratecard-review/RatecardReviewListPage.tsx:187` | `Custom Rate Card` | EN term | `Paket Harga Kustom` | P0 |
| `src/components/features/umkm-dashboard/ratecard-review/RatecardReviewListPage.tsx:201` | `Harga order` | EN term | `Harga pesanan` | P1 |
| `src/components/features/umkm-dashboard/ratecard-review/RatecardReviewListPage.tsx:202` | `Versi latest` | EN term | `Versi terbaru` | P1 |
| `src/components/features/umkm-dashboard/ratecard-review/RatecardReviewListPage.tsx:203` | `Order` + raw slug `{orderStatus.replaceAll("_"," ")}` | EN term | `Pesanan`; translate slug via a status map instead of render | P0 |
| `src/components/features/umkm-dashboard/ratecard-review/RatecardReviewListPage.tsx:204` | `Validation` + raw status | EN term | `Validasi`; map value | P1 |
| `src/components/features/umkm-dashboard/ratecard-review/RatecardReviewListPage.tsx:209` | `Submission` | EN term | `Pengiriman` | P1 |
| `src/components/features/umkm-dashboard/ratecard-review/RatecardReviewListPage.tsx:213` | `Lihat Detail` | — (clean) | — | — |
| `src/components/features/umkm-dashboard/ratecard-review/RatecardReviewDetailPage.tsx:48,61,120` | `Detail review pekerjaan tidak ditemukan.`, `Detail review gagal dimuat` | Mixed ID/EN | `Detail tinjauan pekerjaan ...` | P1 |
| `src/components/features/umkm-dashboard/ratecard-review/RatecardReviewDetailPage.tsx:89` | `Hasil kerja disetujui. Status settlement sedang diperbarui.` | EN term | `... Status pencairan sedang diperbarui.` | P1 |
| `src/components/features/umkm-dashboard/ratecard-review/RatecardReviewDetailPage.tsx:109` | `Permintaan revisi terkirim ke Creator.` | EN term | `Permintaan revisi terkirim ke kreator.` | P1 |
| `src/components/features/umkm-dashboard/ratecard-review/RatecardReviewDetailPage.tsx:134` | `Kembali ke Review Pekerjaan` | EN term | `Kembali ke Tinjau Pekerjaan` | P2 |
| `src/components/features/umkm-dashboard/ratecard-review/RatecardReviewDetailPage.tsx:141` | `Custom Rate Card` | EN term | `Paket Harga Kustom` | P1 |
| `src/components/features/umkm-dashboard/ratecard-review/RatecardReviewDetailPage.tsx:156` | `Latest Deliverable` | EN term | `Hasil Kerja Terbaru` | P0 |
| `src/components/features/umkm-dashboard/ratecard-review/RatecardReviewDetailPage.tsx:159` | `{latest.status.replaceAll("_"," ")}` (raw slug, e.g. `revision requested`) | EN term | Map status → Indonesian (`Revisi Diminta`) | P0 |
| `src/components/features/umkm-dashboard/ratecard-review/RatecardReviewDetailPage.tsx:165` | `Buka file hasil kerja` | Mixed ID/EN | `Buka berkas hasil kerja` | P2 |
| `src/components/features/umkm-dashboard/ratecard-review/RatecardReviewDetailPage.tsx:168` | `Source` / `Marketiv Storage` / `External URL` | EN term | `Sumber` / `Penyimpanan Marketiv` / `Tautan Eksternal` | P1 |
| `src/components/features/umkm-dashboard/ratecard-review/RatecardReviewDetailPage.tsx:169` | `Submission time` | EN term | `Waktu pengiriman` | P1 |
| `src/components/features/umkm-dashboard/ratecard-review/RatecardReviewDetailPage.tsx:170` | `Notes` / `Tidak ada catatan.` | EN term | `Catatan` | P1 |
| `src/components/features/umkm-dashboard/ratecard-review/RatecardReviewDetailPage.tsx:173` | `Creator belum mengirim hasil kerja.` | EN term | `Kreator belum mengirim hasil kerja.` | P1 |
| `src/components/features/umkm-dashboard/ratecard-review/RatecardReviewDetailPage.tsx:177-178` | `Setujui Hasil Kerja` / `Minta Revisi` | — (clean) | — | — |
| `src/components/features/umkm-dashboard/ratecard-review/RatecardReviewDetailPage.tsx:184` | `Previous Versions` | EN term | `Versi Sebelumnya` | P1 |
| `src/components/features/umkm-dashboard/ratecard-review/RatecardReviewDetailPage.tsx:185` | `Riwayat lama baca-saja. Hanya versi terbaru dapat ditindaklanjuti.` | — (clean) | — | — |
| `src/components/features/umkm-dashboard/ratecard-review/RatecardReviewDetailPage.tsx:201` | `Marketiv Validation` | EN term | `Validasi Marketiv` | P1 |
| `src/components/features/umkm-dashboard/ratecard-review/RatecardReviewDetailPage.tsx:202` | raw validation status (`valid`/`invalid`/`pending`) | EN term | Map to label | P1 |
| `src/components/features/umkm-dashboard/ratecard-review/RatecardReviewDetailPage.tsx:204` | `Belum ditinjau Admin Marketiv` | — (clean) | — | — |
| `src/components/features/umkm-dashboard/ratecard-review/RatecardReviewDetailPage.tsx:208` | `Ringkasan Order` | EN term | `Ringkasan Pesanan` | P1 |
| `src/components/features/umkm-dashboard/ratecard-review/RatecardReviewDetailPage.tsx:210` | `Scope` | EN term | `Lingkup` | P1 |
| `src/components/features/umkm-dashboard/ratecard-review/RatecardReviewDetailPage.tsx:212` | `Revision used / limit` | EN term | `Revisi terpakai / batas` | P1 |
| `src/components/features/umkm-dashboard/ratecard-review/RatecardReviewDetailPage.tsx:213` | `Escrow` / `Escrow dilepas` | EN term | `Dana Aman` / `Dana Aman dilepas` | P1 |
| `src/components/features/umkm-dashboard/ratecard-review/RatecardReviewDetailPage.tsx:222-237` | `Setujui Hasil Kerja?`, `Minta Revisi`, `Kirim Permintaan` | — (clean) | — | — |
| `src/lib/ratecard-review/review-state.ts:38,48,75,84,98` | `Creator belum mengirim hasil`, `Menunggu Creator Mengirim Versi Perbaikan`, `... mengirim deliverable`, `... bukti hasil kerja ...` | EN term | `Kreator belum mengirim hasil`, `Menunggu Kreator Mengirim Versi Perbaikan`, `... mengirim hasil kerja` | P1 |

### `/dashboard/umkm/keuangan`

| File:Line | Current text | Issue type | Suggested Indonesian | Severity |
| --- | --- | --- | --- | --- |
| `src/components/features/umkm-dashboard/finance/FinanceHeader.tsx:17-48` | `Riwayat Transaksi`, `Keuangan Saya`, `Lihat Kampanye Aktif`, `Lihat Negosiasi`, `Unduh Laporan` | — (clean) | — | — |
| `src/components/features/umkm-dashboard/finance/FinanceSummaryCards.tsx:59-105` | `Total Pengeluaran`, `Dana Aman Tersimpan`, `Perlu Dibayar`, `Pengembalian Dana Diterima`, `Biaya Platform`, `Transaksi Sukses` | — (clean) | — | — |
| `src/components/features/umkm-dashboard/finance/finance.constants.ts:8` | status label `Refunded` | EN term | `Dana Dikembalikan` | P1 |
| `src/components/features/umkm-dashboard/finance/finance.constants.ts:13,15,16,18` | `Deposit / Top-up`, `Refund / Pengembalian`, `Pencairan Escrow`, `Platform Fee` | EN term | `Titipan / Isi Ulang`, `Pengembalian Dana`, `Pencairan Dana Aman`, `Biaya Platform` | P1 |
| `src/components/features/umkm-dashboard/finance/finance.constants.ts:23-24` | `Campaign Mode` / `Rate Card Mode` | EN term | `Mode Kampanye` / `Mode Paket Harga` | P1 |
| `src/components/features/umkm-dashboard/finance/finance.constants.ts:35-36` | `CSV File (.csv)` / `Excel Spreadsheet (.xlsx)` | Mixed ID/EN | `File CSV (.csv)` / `Berkas Excel (.xlsx)` | P2 |
| `src/components/features/umkm-dashboard/finance/FinanceToolbar.tsx:72` | `Cari deskripsi transaksi atau ID...` | — (clean) | — | — |
| `src/components/features/umkm-dashboard/finance/EscrowOverviewCard.tsx:31-40` | `Sistem Dana Aman`, `Dana Terlindungi` | — (clean) | — | — |
| `src/components/features/umkm-dashboard/finance/EscrowOverviewCard.tsx:93` | `Mode Kampanye (Pay-Per-View)` | EN term | `Mode Kampanye (Bayar per Tayangan)` | P1 |
| `src/components/features/umkm-dashboard/finance/EscrowOverviewCard.tsx:97` | `... dikenakan biaya layanan platform 2% (buyer-side).` | EN term | `... dikenakan biaya layanan platform 2% (dibebankan ke UMKM).` | P1 |
| `src/components/features/umkm-dashboard/finance/EscrowOverviewCard.tsx:113-138` | `Mode Paket Harga (Rate Card)`, `Total Dana Aman Aktif`, `Menunggu Rilis`, `Dapat Dikembalikan` | — (clean) | — | — |
| `src/components/features/umkm-dashboard/finance/finance.utils.ts:25-68` | `Menunggu Pembayaran`, `Dana Tersimpan Aman`, `Pembayaran Berhasil`, `...`, `Deposit / Bayar`, `Penarikan`, `Biaya Layanan`, `Pengembalian Dana`, `Pencairan` | Mixed ID/EN | `Titipan / Bayar` (align with `finance.constants`) | P2 |
| `src/components/features/umkm-dashboard/finance/finance.utils.ts:70-78` | `Mode Kampanye` / `Mode Paket Harga` | — (clean) | — | — |
| `src/components/features/umkm-dashboard/finance/TransactionTable.tsx:22-94` | `Tanggal`, `Deskripsi`, `Jenis Transaksi`, `Jenis Layanan`, `Jumlah`, `Status`, `Aksi`, `Detail`, `Bayar`, `Menampilkan {n} transaksi`, `Klik baris untuk melihat rincian` | — (clean) | — | — |
| `src/components/features/umkm-dashboard/finance/TransactionCard.tsx:49,64,72` | `Jumlah`, `Detail`, `Bayar` | — (clean) | — | — |
| `src/components/features/umkm-dashboard/finance/FinanceEmptyState.tsx:18-33` | `Pencarian Tidak Ditemukan`, `Belum Ada Transaksi`, `Atur Ulang Filter` | — (clean) | — | — |
| `src/components/features/umkm-dashboard/finance/FinanceErrorState.tsx:10-29` | `Gagal memuat data keuangan`, `Terjadi Kesalahan`, `Coba Lagi` | — (clean) | — | — |
| `src/components/features/umkm-dashboard/finance/modals/TransactionDetailModal.tsx:41-125` | `Bukti Pembayaran`, `Resi #...`, `Total Nominal`, `ID Transaksi`, `Tanggal Dibuat`, `Jenis Transaksi`, `Kategori Fitur`, `Deskripsi Transaksi` | — (clean) | — | — |
| `src/components/features/umkm-dashboard/finance/modals/TransactionDetailModal.tsx:89` | `Midtrans Order ID` | Mixed ID/EN | `ID Pesanan Midtrans` | P2 |
| `src/components/features/umkm-dashboard/finance/modals/PendingPaymentModal.tsx:76` | `Budget Target` | EN term | `Target Anggaran` | P1 |
| `src/components/features/umkm-dashboard/finance/modals/PendingPaymentModal.tsx:80` | `Platform Fee (2%)` | EN term | `Biaya Platform (2%)` | P1 |
| `src/components/features/umkm-dashboard/finance/modals/PendingPaymentModal.tsx:46-118` | `Selesaikan Pembayaran`, `Menunggu Bayar`, `Total yang Harus Dibayar`, `Bayar Sekarang via Midtrans`, `Batalkan Transaksi Ini` | — (clean) | — | — |
| `src/components/features/umkm-dashboard/finance/modals/ExportFinanceReportModal.tsx:22-268` | `ID Transaksi`, `Tanggal`, `Deskripsi`, `... (IDR)`, `Unduh Laporan Keuangan`, `Pilih Jenis & Rentang Laporan`, `Cakupan Data Transaksi`, `Rentang Waktu Laporan`, `Format File`, `Unduh Laporan` | — (clean) | — | — |
| `src/components/features/umkm-dashboard/finance/modals/ExportFinanceReportModal.tsx:143` | `Laporan gagal dibuat. Coba lagi.` | — (clean) | — | — |
| `src/components/features/umkm-dashboard/finance/modals/FinanceActionSuccessModal.tsx:27` | `Selesai` (default action label) | — (clean) | — | — |
| `src/components/features/umkm-dashboard/finance/FinanceOverviewPage.tsx:170` | `Laporan Keuangan kemajuan P2MW Anda berhasil diekspor. File spreadsheet CSV telah terunduh ke direktori komputer Anda.` | Mixed ID/EN | Drop `P2MW` leftover; `File CSV telah terunduh ke komputer Anda.` | P1 |
| `src/components/features/umkm-dashboard/finance/FinanceOverviewPage.tsx:171` | `Filename:` | EN term | `Nama file:` | P2 |
| `src/components/features/umkm-dashboard/finance/FinanceOverviewPage.tsx:65-195` | `Gagal mengambil data transaksi`, `Gagal memuat ringkasan keuangan.`, `Pembayaran dibatalkan.`, `Laporan Berhasil Diunduh`, `Coba Lagi Memuat Ringkasan` | — (clean) | — | — |

### `/dashboard/umkm/analitik`

| File:Line | Current text | Issue type | Suggested Indonesian | Severity |
| --- | --- | --- | --- | --- |
| `src/components/features/umkm-dashboard/analytics/AnalitikClient.tsx:123` | `Gagal memuat data campaign.` | EN term | `Gagal memuat data kampanye.` | P1 |
| `src/components/features/umkm-dashboard/analytics/AnalitikClient.tsx:190,193` | eyebrow `Performa Bisnis`, `Analitik & Insight` | EN term | `Analitik & Wawasan` | P2 |
| `src/components/features/umkm-dashboard/analytics/AnalitikClient.tsx:196` | `Ringkasan performa campaign dan aktivitas bisnis Anda di Marketiv.` | EN term | `Ringkasan performa kampanye dan aktivitas bisnis Anda di Marketiv.` | P1 |
| `src/components/features/umkm-dashboard/analytics/AnalitikClient.tsx:211` | KPI `Campaign Aktif` | EN term | `Kampanye Aktif` | P1 |
| `src/components/features/umkm-dashboard/analytics/AnalitikClient.tsx:223-226` | KPI `Total Views` / helper `views terverifikasi` | EN term | `Total Tayangan` / `tayangan terverifikasi` | P1 |
| `src/components/features/umkm-dashboard/analytics/AnalitikClient.tsx:234` | helper `campaign & kolaborasi Rate Card` | EN term | `kampanye & kolaborasi paket harga` | P1 |
| `src/components/features/umkm-dashboard/analytics/AnalitikClient.tsx:238-242` | KPI `Saldo Escrow` / helper `tertahan di campaign & order aktif` | EN term | `Saldo Dana Aman` / `tertahan di kampanye & pesanan aktif` | P1 |
| `src/components/features/umkm-dashboard/analytics/AnalitikClient.tsx:249-253` | KPI `Submission Masuk` / helper `menunggu review` | EN term | `Bukti Konten Masuk` / `menunggu tinjauan` | P1 |
| `src/components/features/umkm-dashboard/analytics/AnalitikClient.tsx:256` | KPI `Negosiasi Aktif` | — (clean) | — | — |
| `src/components/features/umkm-dashboard/analytics/AnalitikClient.tsx:263` | KPI `Campaign Selesai` | EN term | `Kampanye Selesai` | P1 |
| `src/components/features/umkm-dashboard/analytics/AnalitikClient.tsx:270-274` | KPI `Pembayaran Tertunda` / `perlu tindakan` / `semua lunas` | — (clean) | — | — |
| `src/components/features/umkm-dashboard/analytics/AnalitikClient.tsx:286,290` | `Semua Campaign` / `{n} campaign` | EN term | `Semua Kampanye` / `{n} kampanye` | P1 |
| `src/components/features/umkm-dashboard/analytics/AnalitikClient.tsx:307-309` | `Belum ada campaign` / `Buat campaign pertama Anda untuk mulai melihat data di sini.` | EN term | `Belum ada kampanye` / `Buat kampanye pertama ...` | P1 |
| `src/components/features/umkm-dashboard/analytics/AnalitikClient.tsx:202` | `Sebagian data analitik di bawah ini adalah estimasi (mencapai batas maksimal sistem 5000 data).` | — (clean) | — | — |
| `src/components/features/umkm-dashboard/analytics/PerformanceChart.tsx:122` | `Grafik Performa Views` | EN term | `Grafik Performa Tayangan` | P1 |
| `src/components/features/umkm-dashboard/analytics/PerformanceChart.tsx:179,185,191,203` | `Akumulasi Periode Ini`, `tayangan`, `Tren Pertumbuhan`, `Status Kampanye` | — (clean) | — | — |
| `src/components/features/umkm-dashboard/analytics/PerformanceChart.tsx:207` | `{n} Campaign Aktif` | EN term | `{n} Kampanye Aktif` | P1 |
| `src/components/features/umkm-dashboard/analytics/PerformanceChart.tsx:218` | `... grafik akan merekam performa secara real-time.` | Mixed ID/EN | `... secara waktu nyata.` | P2 |
| `src/components/features/umkm-dashboard/analytics/PerformanceChart.tsx:262` | `Data diperbarui secara otomatis setiap kali validasi submission selesai.` | EN term | `... validasi bukti konten selesai.` | P1 |
| `src/components/features/umkm-dashboard/analytics/PerformanceChart.tsx:196` | hardcoded `+28.4%` (fabricated trend, not a language issue) | — | — | — (flag separately) |

### `/dashboard/umkm/notifikasi` (shared notification chrome)

| File:Line | Current text | Issue type | Suggested Indonesian | Severity |
| --- | --- | --- | --- | --- |
| `src/components/features/shared/NotificationView.tsx:52-53` | `Dashboard UMKM`, `Notifikasi` | EN term | `Dasbor UMKM` | P2 |
| `src/components/features/shared/NotificationView.tsx:72` | category label `Campaign` | EN term | `Kampanye` | P1 |
| `src/components/features/shared/NotificationView.tsx:80,88,96,104` | `Keuangan`, `Negosiasi`, `Rate Card`, `Sistem` | — (clean) | — | — |
| `src/components/features/shared/NotificationView.tsx:221` | tab `Campaign` | EN term | `Kampanye` | P1 |
| `src/components/features/shared/NotificationView.tsx:219-225` | `Semua`, `Belum Dibaca`, `Negosiasi`, `Keuangan`, `Sistem` | — (clean) | — | — |
| `src/components/features/shared/NotificationView.tsx:247-248` | `{n} notifikasi belum dibaca` / `Semua notifikasi sudah dibaca` | — (clean) | — | — |
| `src/components/features/shared/NotificationView.tsx:263,315,323,332-345,451,464,482` | `Tandai Semua Dibaca`, `Gagal memuat notifikasi`, `Coba lagi`, empty states, `Tandai Dibaca`, `Hapus Notifikasi`, `Semua notifikasi telah dimuat` | — (clean) | — | — |
| `src/components/features/shared/NotificationHeaderDropdown.tsx:132-243` | `Notifikasi`, `{n} baru`, `Tandai Semua Dibaca`, `Dibaca`, `Tidak Ada Notifikasi`, `Lihat Semua Notifikasi` | — (clean) | — | — |
| `src/components/features/shared/AppNotificationDetailDialog.tsx:44` | category label `Campaign` | EN term | `Kampanye` | P1 |
| `src/components/features/shared/AppNotificationDetailDialog.tsx:50-68` | `Keuangan`, `Negosiasi`, `Rate Card`, `Sistem` | — (clean) | — | — |
| `src/components/features/shared/AppNotificationDetailDialog.tsx:159,177,190,205` | `Waktu Diterima:`, `Hapus Notifikasi`, `Tutup`, `Buka Halaman Terkait` | — (clean) | — | — |
| `src/components/features/shared/NotificationProvider.tsx:60,63` | `Gagal memuat notifikasi.` | — (clean) | — | — |

### `/dashboard/umkm/pengaturan`

| File:Line | Current text | Issue type | Suggested Indonesian | Severity |
| --- | --- | --- | --- | --- |
| `src/components/features/umkm-dashboard/settings/PengaturanClient.tsx:48` | notification label `Pembaruan Escrow` | EN term | `Pembaruan Dana Aman` | P1 |
| `src/components/features/umkm-dashboard/settings/PengaturanClient.tsx:49` | desc `... tawaran kustom Rate Card baru` | EN term | `... tawaran paket harga baru` | P1 |
| `src/components/features/umkm-dashboard/settings/PengaturanClient.tsx:45-47,50` | `Aktivitas Kreator`, `Pengiriman Konten`, `Penyelesaian Kampanye`, `Kabar & Fitur Baru` | — (clean) | — | — |
| `src/components/features/umkm-dashboard/settings/PengaturanClient.tsx:68` | aria `Toggle notifikasi` | Mixed ID/EN | `Alihkan notifikasi` | P2 |
| `src/components/features/umkm-dashboard/settings/PengaturanClient.tsx:237-240` | `Akun UMKM`, `Pengaturan` | — (clean) | — | — |
| `src/components/features/umkm-dashboard/settings/PengaturanClient.tsx:268-272` | `Akun Terverifikasi`, `UMKM Plan` | Mixed ID/EN | `Paket UMKM` | P2 |
| `src/components/features/umkm-dashboard/settings/PengaturanClient.tsx:288` | `Mengunggah…` / `Edit Foto` | — (clean) | — | — |
| `src/components/features/umkm-dashboard/settings/PengaturanClient.tsx:305-434` | `Profil Bisnis`, `Nama Bisnis`, `Kategori`, `Deskripsi`, `Kontak & Lokasi`, `Nomor WhatsApp`, `Email Bisnis`, `Kota`, `Alamat`, `TikTok Username` | Mixed ID/EN | `Nama Pengguna TikTok` | P2 |
| `src/components/features/umkm-dashboard/settings/PengaturanClient.tsx:397` | `Dikelola akun — hubungi support untuk mengubah.` | EN term | `... hubungi dukungan untuk mengubah.` | P2 |
| `src/components/features/umkm-dashboard/settings/PengaturanClient.tsx:455,468-510` | `Simpan Perubahan`, `Preferensi Notifikasi`, `Zona Berbahaya`, `Penonaktifan Akun` | — (clean) | — | — |
| `src/components/features/umkm-dashboard/settings/PengaturanClient.tsx:510` | `... saldo escrow ...` | EN term | `... saldo dana aman ...` | P1 |

### `/dashboard/umkm/panduan`

| File:Line | Current text | Issue type | Suggested Indonesian | Severity |
| --- | --- | --- | --- | --- |
| `src/app/dashboard/umkm/panduan/page.tsx:35-44` | popular keywords `escrow`, `withdraw`, `collab`, `auto-approve`, `dispute`, `kyc` (rendered as chips) | EN term | Add Indonesian aliases (`penarikan`, `pengembalian`, `sengketa`) so search works for both | P1 |
| `src/app/dashboard/umkm/panduan/page.tsx:50` | `Marketiv menyediakan Campaign Mode (bayar per 1.000 views, ...) dan Rate Card Mode (...) wajib Collab Post).` | Mixed ID/EN | `... Mode Kampanye (bayar per 1.000 tayangan ...) dan Mode Paket Harga (...) wajib Postingan Bersama).` | P1 |
| `src/app/dashboard/umkm/panduan/page.tsx:58` | title `Campaign Mode Is Zero Chat` | EN term | `Mode Kampanye Tanpa Obrolan` | P0 |
| `src/app/dashboard/umkm/panduan/page.tsx:59` | `... di dalam brief atau deskripsi Campaign Mode.` | Mixed ID/EN | `... di dalam arahan atau deskripsi Mode Kampanye.` | P1 |
| `src/app/dashboard/umkm/panduan/page.tsx:67-68` | `Jaminan Transaksi Aman Lewat Sistem Escrow` / `... disimpan aman di sistem Escrow Marketiv.` | EN term | `... Lewat Sistem Dana Aman` | P1 |
| `src/app/dashboard/umkm/panduan/page.tsx:76-77` | `Batas Waktu Peninjauan Rate Card (Auto-Approve 3 Hari)` / `... dana Escrow otomatis dirilis ...` | EN term | `... (Setujui Otomatis 3 Hari)` / `... dana Dana Aman otomatis dirilis ...` | P1 |
| `src/app/dashboard/umkm/panduan/page.tsx:85-86` | `Perlindungan Sengketa (Dispute Resolution)` / `... mengajukan Dispute via WhatsApp ...` | EN term | `Perlindungan Sengketa (Penyelesaian Sengketa)` / `... mengajukan Sengketa ...` | P1 |
| `src/app/dashboard/umkm/panduan/page.tsx:103-104` | `Tidak Ada Manipulasi Views atau Engagement Palsu` / `... keaslian views. ... pembelian views, bot, atau boosting ilegal ...` | EN term | `... Manipulasi Tayangan atau Interaksi Palsu` / `... keaslian tayangan ... pembelian tayangan ...` | P1 |
| `src/app/dashboard/umkm/panduan/page.tsx:118-119` | FAQ `Apa bedanya Campaign Mode dan Rate Card Mode?` / `... model pay-per-view ... Custom Offer resmi, dan kewajiban Collab Post.` | Mixed ID/EN | `... Mode Kampanye dan Mode Paket Harga?` / `... model bayar-per-tayangan ... penawaran kustom ... Postingan Bersama.` | P1 |
| `src/app/dashboard/umkm/panduan/page.tsx:122-123` | `... Escrow ...` | EN term | `... Dana Aman ...` | P1 |
| `src/app/dashboard/umkm/panduan/page.tsx:126-127` | `Berapa batas minimum budget campaign?` / `Budget minimum ... campaign ...` | EN term | `Berapa batas minimum anggaran kampanye?` / `Anggaran minimum ... kampanye ...` | P1 |
| `src/app/dashboard/umkm/panduan/page.tsx:131` | `... meninjau deliverable dari Kreator ... (Auto-Approve).` | EN term | `... meninjau hasil kerja dari Kreator ... (Setujui Otomatis).` | P1 |
| `src/app/dashboard/umkm/panduan/page.tsx:134-135` | `Apa itu fitur Collab Post?` / `... Collab Post adalah fitur ... direct traffic ...` | EN term | `Apa itu fitur Postingan Bersama?` / `... untuk mendapatkan kunjungan langsung ...` | P1 |
| `src/app/dashboard/umkm/panduan/page.tsx:139` | `... bukti chat & deliverable ...` | EN term | `... bukti obrolan & hasil kerja ...` | P1 |
| `src/app/dashboard/umkm/panduan/page.tsx:142-147` | `pengembalian dana (Refund)`, `Wallet UMKM`, `(Withdrawal)`, `KYC manual` | EN term | `... (Pengembalian Dana)`, `Dompet UMKM`, `(Penarikan)`, `verifikasi identitas (KYC)` | P1 |
| `src/app/dashboard/umkm/panduan/page.tsx:261-285` | `Pusat Informasi & Hukum Platform`, `FAQ, Aturan & Syarat Ketentuan`, `Versi Resmi 3.1 (Agustus 2026)`, `Ulangi Panduan` | — (clean) | — | — |
| `src/app/dashboard/umkm/panduan/page.tsx:298,359` | placeholder/suggestion using `escrow`, `withdraw`, `collab` | EN term | Offer Indonesian chips too | P1 |
| `src/app/dashboard/umkm/panduan/page.tsx:316,338,344,356,370,409,438,473-475` | `Kata Kunci Populer:`, `Ditemukan {n} hasil pencarian ...`, `Reset Pencarian`, `Hasil di ...`, tabs `Aturan Ringkas`/`FAQ Usaha`/`Syarat & Ketentuan (Pasal 1-22)` | — (clean) | — | — |
| `src/app/dashboard/umkm/panduan/page.tsx:502,546` | `Aturan Utama Operasional Platform`, `Pertanyaan Sering Diajukan (FAQ)` | — (clean) | — | — |
| `src/app/dashboard/umkm/panduan/page.tsx:555` | `Operasional & Keuangan (Biaya 2%, Escrow, Withdrawal)` | EN term | `... (Biaya 2%, Dana Aman, Penarikan)` | P1 |
| `src/app/dashboard/umkm/panduan/page.tsx:599` | `Ketentuan Resmi Biaya Platform & Escrow (Versi 3.1)` | EN term | `... & Dana Aman ...` | P1 |
| `src/app/dashboard/umkm/panduan/page.tsx:697-708` | `Punya Pertanyaan Lain Seputar Kebijakan?`, `Hubungi Support` | Mixed ID/EN | `Hubungi Dukungan` | P2 |

### Layout / sidebar / topbar (shared chrome rendered by UMKM)

| File:Line | Current text | Issue type | Suggested Indonesian | Severity |
| --- | --- | --- | --- | --- |
| `src/components/features/dashboard/DashboardSidebar.tsx:57-59` | `Sedang Dikerjakan`, `Revisi Diminta`, `Menunggu Pencairan` | — (clean) | — | — |
| `src/components/features/dashboard/DashboardSidebar.tsx:70-77` | Nav items `Dashboard`, `Kampanye`, `Kreator`, `Negosiasi`, `Review Pekerjaan`, `Keuangan`, `Analitik`, `Notifikasi` | Mixed ID/EN | `Dasbor`; `Review Pekerjaan` → `Tinjau Pekerjaan` | P2 |
| `src/components/features/dashboard/DashboardSidebar.tsx:165,201,305,345,353,360,377-408,442` | `Perluas Menu`, `Sembunyikan Menu`, `Dashboard UMKM`, `Kreator Sedang Bekerja`, `Butuh Bantuan?`, `Hubungi Admin`, `FAQ & Peraturan`, `Pengaturan`, `Keluar`, `UMKM Terverifikasi` | Mixed ID/EN | `Dasbor UMKM` | P2 |
| `src/components/features/dashboard/DashboardTopbar.tsx:26-46` | Page titles/subtitles `Dashboard`/`Kampanye`/`Buat Kampanye`/`Kreator`/`Negosiasi`/`Review Pekerjaan`/`Keuangan`/`Analitik`/`Pengaturan`/`FAQ & Peraturan`/`Notifikasi`/`Detail Kampanye`/`Profil Kreator`/`Ruang Negosiasi`/`Detail Review` | Mixed ID/EN | `Dasbor`; `Review Pekerjaan` → `Tinjau Pekerjaan` | P2 |
| `src/components/features/dashboard/DashboardTopbar.tsx:40-46` | `Detail Kampanye`, `Profil Kreator`, `Ruang Negosiasi`, `Detail Review` | — (clean) | — | — |
| `src/components/features/dashboard/DashboardTopbar.tsx:57,90-99,142,153,203` | `Dashboard`, `Buat Baru`, `Detail`, `Profil`, aria `Buka menu`, alt `Marketiv Logo`, aria `Profil akun` | Mixed ID/EN | `Dasbor` (breadcrumb root) | P2 |
| `src/components/features/dashboard/shared/LogoutConfirmDialog.tsx:32-40` | `Pemilik UMKM`, `Keluar dari Dashboard UMKM?`, `... mengelola campaign, pesanan, dan escrow.`, `Ya, Keluar Akun UMKM` | Mixed ID/EN | `... mengelola kampanye, pesanan, dan dana aman.` | P1 |
| `src/components/features/dashboard/shared/LogoutConfirmDialog.tsx:102` | alt `Logout Banner` | EN term | `Banner Keluar` | P1 |
| `src/components/features/dashboard/shared/LogoutConfirmDialog.tsx:141,152` | `Batal`, `Mengeluarkan…` | — (clean) | — | — |
| `src/components/features/dashboard/shared/HelpAdminModal.tsx:44-107` | `Pusat Bantuan UMKM`, `Hubungi Admin & Komunitas`, `Chat Admin Marketiv`, `Respon Cepat`, `Grup WhatsApp UMKM`, `Komunitas UMKM` | Mixed ID/EN | `Obrolan Admin Marketiv` | P2 |
| `src/components/features/dashboard/shared/DashboardStateCard.tsx` | (props-driven, no literals) | — | — | — |
| `src/components/features/dashboard/shared/DashboardProfileAvatar.tsx:48` | alt fallback `Avatar` | EN term | `Foto profil` | P2 |

### Shared UMKM primitives

| File:Line | Current text | Issue type | Suggested Indonesian | Severity |
| --- | --- | --- | --- | --- |
| `src/components/features/dashboard/shared/SearchToolbar.tsx:131` | aria `Hapus pencarian` | — (clean) | — | — |
| `src/components/features/dashboard/shared/SearchToolbar.tsx:156,176,210,223` | `Filter & Opsi`, `Reset`, `Kategori:` | Mixed ID/EN | `Filter & Opsi` ok; `Reset` → `Atur Ulang` | P2 |
| `src/components/features/umkm-dashboard/shared/DashboardActionMenu.tsx:46` | aria `Menu Aksi` | — (clean) | — | — |
| `src/components/features/umkm-dashboard/shared/DashboardCard.tsx` / `UmkmPageWrapper.tsx` / `ResponsiveDataRow.tsx` | no user-facing literals | — | — | — |
| `src/components/features/umkm-dashboard/shared/UmkmPageSkeleton.tsx` | no user-facing literals | — | — | — |

Unused candidates found inside the scanned tree but not imported anywhere (defined only): `KPISection.tsx`, `CampaignActionMenu.tsx`, `CampaignProgress.tsx`, `CampaignStatusBadge.tsx`, `CampaignAssetCard.tsx`, `campaign/modals/AssetPreviewModal.tsx`, `create-campaign/cards/EscrowSimulationCard.tsx`. Their strings are inventoried above with a `(verify)` marker; deleting them would remove several of the inconsistencies for free.

## Canonical term mapping

Counts in the second column are approximate occurrences among the strings actually reviewed. Where two Indonesian candidates are defensible, both are given with the trade-off.

| English term | Occurrences | Recommended Indonesian | Notes |
| --- | --- | --- | --- |
| `campaign` | ~55 | `kampanye` | Unambiguous. The codebase already uses `kampanye` in the campaign list, detail, and summary cards; the English form leaks from toasts, analytics, wizard, and rate-card-review. `kampanye` is the only candidate. |
| `escrow` | ~25 | `Dana Aman` | The dashboard already brands this as `Dana Aman` (finance header, escrow card, deal checklist). Alternative `Rekening Bersama` is the Indonesian banking gloss but is longer and less familiar to UMKM; keep `Escrow` only in a first-use parenthetical: `Dana Aman (Escrow)`. |
| `views` / `tayangan` | ~20 | `tayangan` | Already dominant (`Total Tayangan`, `Bayaran / 1.000 Tayangan`). Enforce everywhere; drop `Views`. |
| `creator` | ~15 | `kreator` | The whole product uses `kreator`. `creator` appears only in rate-card-review, `creator.adapter.ts` copy, and `DeliverableReviewCard`. |
| `brief` | ~12 | `arahan` (or keep `brief`) | The wizard already labels step 2 `Arahan Konten` / `Arahan Anda`. Two options: (a) fully localize to `arahan`; (b) keep `brief` as an accepted loanword and gloss on first use (`arahan (brief)`). Recommend (a) for consistency with the wizard. |
| `submission` | ~10 | `bukti konten` / `pengiriman` | Two senses: a submitted post → `bukti konten` (already used in campaign detail); the act → `pengiriman`. Pick by context; never leave bare `Submission`. |
| `deliverable` | ~8 | `hasil kerja` | Used in rate-card review and `review-state.ts`. `Hasil kerja` is already present in the same screen (`Buka file hasil kerja`, `Setujui Hasil Kerja`). |
| `order` | ~10 | `pesanan` | The negotiation room already uses `pesanan` (`Batalkan Pesanan`, `Pantau Pesanan`). `Order Summary` must become `Ringkasan Pesanan`. |
| `rate card` | ~18 | `paket harga` (label) / keep `Rate Card` as the feature name | The wizard and finance already say `Paket Harga`. Two defensible choices: (a) `Rate Card` retained as a proper feature name with a consistent gloss (`Rate Card — Paket Harga`), or (b) fully `Paket Harga`. Recommend (b) for the *content* screens and (a) only where the feature is being introduced. |
| `collab post` | ~8 | `Postingan Bersama` | Already the established translation (`CollabPostWarningBanner`, `DealChecklistCard`, escrow copy). Standardize fully and drop the English aside. |
| `pending` | ~12 | `menunggu` | `Pending` appears as a badge and KPI helper. `Menunggu`/`Menunggu Pembayaran`/`Menunggu Validasi` are already used; align. |
| `valid` / `invalid` | ~10 | `disetujui` / `ditolak` | For submission badges the sibling table already uses `Disetujui`/`Ditolak`. For raw backend statuses (`valid`, `invalid`, `pending`, `revision_requested`) render through a label map, never the slug. |
| `draft` | ~20 | `draf` (KBBI) or `konsep` | Three forms now: `Draft`, `Draf`, `Konsep`. Recommend `draf` (KBBI-form) as the single UI word; `konsep` reads as "concept" and collides with the timeline copy "disimpan sebagai konsep". |
| `engagement` | ~5 | `tingkat keterlibatan` (or `interaksi`) | `Tingkat Keterlibatan` already exists in `CreatorStatsCards`; either unify on it or use `Interaksi`. Drop `Engagement`. |
| `review` | ~12 | `tinjau` / `tinjauan` | `Review Pekerjaan` is the sidebar label. Two options: keep `Review` as a borrowed verb (widely understood) or convert to `Tinjau Pekerjaan`. If converted, do it in sidebar + topbar + rate-card-review together. |
| `insight` | ~4 | `wawasan` | Low-frequency; `Insight & Saran` and `Analitik & Insight`. `Wawasan` is the standard gloss. |
| `deadline` | ~5 | `batas waktu` | Already used (`Batas Waktu`); `deadline` survives only in `SendCustomOfferModal` and `StartNegotiationModal`. |
| `scope` | ~3 | `lingkup` | `Lingkup Pekerjaan` already used in the room; `scope` leaks in `SendCustomOfferModal` and rate-card review. |
| `withdrawal` | ~3 | `penarikan` | `Penarikan Dana` already used in finance. |
| `refund` | ~5 | `pengembalian dana` | `Pengembalian Dana` already used in finance. |
| `wallet` | ~3 | `dompet` / `saldo` | Finance says `Saldo Dompet Marketiv`; legal copy says `Wallet UMKM`. Prefer `Dompet`/`Saldo`. |
| `auto-approve` | ~3 | `setujui otomatis` | Appears in `panduan`. `Auto-Approve` bare is English. |
| `dispute` | ~4 | `sengketa` | `Sengketa` already used for submission dispute badge. |
| `dashboard` | ~8 | `dasbor` (or keep `Dashboard`) | `Dashboard` is near-universal in Indonesian SaaS. Low priority; if standardized, prefer `Dasbor` for full localization. Trade-off: `Dashboard` is more familiar; `Dasbor` is KBBI-correct. |
| `wizard` | ~2 | `panduan langkah` (or keep `Wizard`) | Only `Wizard Campaign` header. Either drop the word (`Buat Kampanye Baru` alone) or use `Panduan`. |

## Open questions

- `escrow`: do we keep the loanword `Escrow` as the primary label (with `Dana Aman` as the friendly gloss), or fully switch to `Dana Aman`? Evidence: `Dana Aman` is already the dominant brand term in the finance screen, the campaign summary card (`Dana Aman Kampanye`), the escrow tracker header (`Status Dana Aman Anda`), and the deal checklist (`Dana Aman Siap`), yet `Escrow` persists in the constants (`negotiation.constants.ts` filter `Dana Aman` vs `umkm-dashboard.constants.ts` filter `Escrow`), the wizard, analytics, and all of `panduan`. Product needs to pick one for the filter dropdowns, which currently offer both.
- `draft` vs `draf` vs `konsep`: three spellings currently live for the same status. `Draft` (loanword), `Konsep` (overview `CampaignSection`, table actions `Ubah Konsep`/`Hapus Konsep`), and the KBBI `draf`. Which is the single word? Evidence: `CampaignSection.tsx:18`, `CampaignCard.tsx:44-49`, `DashboardBadge.tsx:22`, `CampaignTable.tsx:65,90`.
- `Rate Card` vs `Paket Harga` vs `Mode Paket Harga`: the finance screen says `Mode Paket Harga (Rate Card)`, the wizard says `Paket Harga`, analytics says `Rate Card`, and `panduan` says `Rate Card Mode`. Is `Rate Card` a retained feature name or a term to localize entirely? Evidence: `EscrowOverviewCard.tsx:113`, `AnalitikClient.tsx:234`, `panduan/page.tsx:50,118`, `FinanceSummaryCards` context.
- Status-vocabulary unification: the same negotiation stage is labelled `Diskusi`/`Negosiasi`, `Menyiapkan Order`/`Menyiapkan Pesanan`, `Dana Aman`/`Dalam Escrow`, `Menunggu Kreator`/`Penawaran Dikirim`, `Ditolak Kreator`/`Penawaran Ditolak` across three files (`negotiation.constants.ts`, `negotiation.utils.ts`, `NegotiationRoomPage.tsx`). Which set wins? Also `umkm-dashboard.constants.ts` exports a *fourth* overlapping `NEGOTIATION_STATUS_OPTIONS` with labels `Escrow`/`Menunggu Pembayaran`/`Sedang Dikerjakan` that does not match the filter list — is it still used?
- Pronoun: formal `Anda` vs informal `kamu`. `kamu` appears in `negotiation/modals/PaymentSimulationModal.tsx:76,88` while the rest of the dashboard uses `Anda`. Confirm the house voice (the copy elsewhere reads formal).
- Raw backend status slugs rendered to users: rate-card review renders `orderStatus.replaceAll("_"," ")`, `validation.status`, and `latest.status.replaceAll("_"," ")` directly (`RatecardReviewListPage.tsx:203-204`, `RatecardReviewDetailPage.tsx:159,202`). These can surface `revision requested`, `in progress`, `valid`. Confirm the label map should live in `src/lib/ratecard-review/review-state.ts` (which already defines `title`/`subtitle`/`description`) rather than in the page.
- `P2MW` leftover in `FinanceOverviewPage.tsx:170` (`Laporan Keuangan kemajuan P2MW Anda ...`) — is this a stray from an earlier program name that should be removed or replaced?
- Sidebar / topbar `Review Pekerjaan` vs `Review` elsewhere vs `Tinjauan`: is `Review` intended as a retained borrowed term (like `Rating`) or should it be localized to `Tinjau`/`Tinjauan`?
- Dead components that carry English copy (`KPISection`, `CampaignActionMenu`, `CampaignAssetCard`, `AssetPreviewModal`, `EscrowSimulationCard`, `CampaignStatusBadge`, `CampaignProgress`): delete, or keep and translate? They are defined in the scanned tree but not imported anywhere.
