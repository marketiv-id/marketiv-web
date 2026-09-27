# Language Audit - Creator Dashboard

Scope: read-only audit of every user-facing string rendered inside the Creator dashboard of the Marketiv web app on 2026-09-27. Paths scanned: `src/app/dashboard/kreator/**` (all `page.tsx`, `loading.tsx`, `error.tsx`, `layout.tsx`), `src/components/features/creator-dashboard/**`, plus the shared chrome actually rendered by those routes — `src/components/features/dashboard/**` (`DashboardShell`, `DashboardStateCard`, `DashboardBadge`, `DashboardButton`, `SearchToolbar`, `LogoutConfirmDialog`, `HelpAdminModal`, `ProfileCompletionCard`, `DashboardProfileAvatar`), `src/components/features/shared/**` (`NotificationProvider`, `NotificationHeaderDropdown`, `NotificationView`, `AppNotificationDetailDialog`), `src/components/ui/creator-states.tsx`, `src/components/ui/creator-page-skeleton.tsx`, `src/components/ui/metric-card.tsx`, `src/components/ui/confirm-dialog.tsx`, and the status label source `src/lib/creator-status.ts`. `src/components/layouts/**` was inspected but nothing there is imported by the creator dashboard (its only consumers are the marketing/landing surfaces), so no `layouts` strings are in scope. No source file was modified; this markdown is the only artifact written.

## Summary

| Metric | Count |
| --- | --- |
| Strings reviewed (candidate user-facing strings inspected) | ~700 |
| Flagged rows in this document | 268 |
| `EN term` occurrences | 179 |
| `Mixed ID/EN` occurrences | 60 |
| `Inconsistent with sibling screen` occurrences | 10 |
| `Jargon` occurrences | 17 |
| `Mixed casing` occurrences | 6 |

Counts above are of the flagged rows in the inventory below; a row can carry more than one issue type, so the per-type tallies sum to slightly more than the row count. Grouped rows may cover several identical strings (line numbers listed together). The dominant pattern is a fully Indonesian UI that still exposes English domain nouns (`campaign`, `brief`, `deliverable`, `escrow`, `payout`, `wallet`, `job`, `inbox`, `order`, `draft`, `pending`, `fraud`) and two fully English CTAs. Several of those English nouns are also rendered as uppercase status/badge chips, which reads as untranslated rather than stylised.

## Inventory by screen

### layout / sidebar / topbar (shared chrome)

| File:Line | Current text | Issue type | Suggested Indonesian | Severity |
| --- | --- | --- | --- | --- |
| `src/components/features/creator-dashboard/CreatorDashboardSidebar.tsx:54`, `CreatorDashboardTopbar.tsx:51` | `Overview` | EN term | `Ringkasan` (or `Beranda`) | P1 |
| `src/components/features/creator-dashboard/CreatorDashboardSidebar.tsx:55`, `CreatorDashboardTopbar.tsx:27` | `Job Pool` | Jargon | `Pasar Lowongan` / `Pool Lowongan` (keep as product term — see open questions) | P1 |
| `src/components/features/creator-dashboard/CreatorDashboardSidebar.tsx:57`, `CreatorDashboardTopbar.tsx:29` | `Rate Card` | Jargon | `Daftar Tarif` / keep as product term | P1 |
| `src/components/features/creator-dashboard/CreatorDashboardSidebar.tsx:300` | `FAQ & Peraturan` | Jargon | `Tanya Jawab & Peraturan` (or `Bantuan & Peraturan`) | P2 |
| `src/components/features/creator-dashboard/CreatorDashboardSidebar.tsx:378` | `Kreator {isVerified ? "Terverifikasi" : "Akun"}` → renders `Kreator Akun` | Inconsistent with sibling screen | `Kreator` alone, or `Kreator Terverifikasi` / `Kreator Baru` | P1 |
| `src/components/features/creator-dashboard/CreatorDashboardSidebar.tsx:153`, `CreatorDashboardTopbar.tsx:83` | `alt="Marketiv Logo"` | Mixed ID/EN | `Logo Marketiv` | P2 |
| `src/components/features/creator-dashboard/CreatorDashboardTopbar.tsx:32` | `Pengaturan` (topbar) vs sidebar item `Settings` icon tooltip `Pengaturan` | — (already consistent) | — | — |

### `/dashboard/kreator` overview

| File:Line | Current text | Issue type | Suggested Indonesian | Severity |
| --- | --- | --- | --- | --- |
| `CreatorDashboardView.tsx:60`,`63` | `NICHE_LABELS` renders `Travel` / `Beauty` | Inconsistent with sibling screen | `Pariwisata` / `Kecantikan` (matches `JobPoolView.tsx:384`,`381` filter labels) | P1 |
| `CreatorDashboardView.tsx:88` | `Cari Job di Pool` | EN term | `Cari Lowongan di Pool` | P1 |
| `CreatorDashboardView.tsx:89` | `Temukan puluhan kampanye pay-per-view baru dari UMKM lokal.` | Mixed ID/EN | `Temukan puluhan kampanye bayar-per-tayangan baru dari UMKM lokal.` | P1 |
| `CreatorDashboardView.tsx:91`, `518`, `630`, `736` | `Buka Job Pool` / `Semua Kampanye` / `Cari Job Baru` | EN term | `Buka Pool Lowongan` / `Semua Kampanye` / `Cari Lowongan Baru` | P1 |
| `CreatorDashboardView.tsx:103`,`106`,`109`,`511` | `Rate Card` / `Aktifkan Rate Card` / `Atur Rate Card` / `Kelola Rate Card` | Jargon | `Daftar Tarif` / `Aktifkan Daftar Tarif` / `Atur Daftar Tarif` / `Kelola Daftar Tarif` | P1 |
| `CreatorDashboardView.tsx:230`,`243` | `PPV` chip | Jargon | `Bayar per Tayangan` (or keep `PPV` — see open questions) | P2 |
| `CreatorDashboardView.tsx:263`,`272`, `307` | `/ 1K views` / `{n} slot` / `{n} slot` | EN term | `/ 1.000 tayangan` / `{n} kuota` | P1 |
| `CreatorDashboardView.tsx:310` | `Klaim Job` | EN term | `Ambil Lowongan` | P1 |
| `CreatorDashboardView.tsx:376`,`380` | `Gagal mengambil pekerjaan ini.` / `Pekerjaan "{title}" berhasil diklaim!` | EN term | `Gagal mengambil pekerjaan ini.` / `Pekerjaan "{title}" berhasil diambil!` | P2 |
| `CreatorDashboardView.tsx:419`-`426` | Activity badges `VALID`, `PAYOUT`, `CHAT`, `KLAIM`, `KAMPANYE`, `KADALUARSA`, `INFO` | EN term | `VALID`→`VALID`, `PAYOUT`→`PENCARIAN`, `CHAT`→`OBROLAN`, `INFO`→`INFO` (keep) | P1 |
| `CreatorDashboardView.tsx:578` | `JOB TERSEDIA` | Mixed casing + EN term | `LOWONGAN TERSEDIA` | P1 |
| `CreatorDashboardView.tsx:584` | `Kampanye pool` | Mixed ID/EN | `Kampanye di pool` | P2 |
| `CreatorDashboardView.tsx:669` | `Kamu belum mengklaim campaign apa pun. Mulai hasilkan uang dengan memilih campaign yang cocok dari Job Pool!` | Mixed ID/EN | `Kamu belum mengklaim kampanye apa pun. Mulai hasilkan uang dengan memilih kampanye yang cocok dari pool lowongan!` | P1 |
| `CreatorDashboardView.tsx:670` | `Jelajahi Job Pool` | EN term | `Jelajahi Pool Lowongan` | P2 |
| `CreatorDashboardView.tsx:658` | `Job yang sedang dalam pengerjaan.` | Mixed ID/EN | `Lowongan yang sedang dalam pengerjaan.` | P2 |
| `CreatorDashboardView.tsx:705` | `Submit Bukti` | Mixed ID/EN | `Kirim Bukti` (matches `PekerjaanAktifView.tsx:352`) | P1 |
| `CreatorDashboardView.tsx:711` | `Lihat Post` | Mixed ID/EN | `Lihat Postingan` | P2 |
| `CreatorDashboardView.tsx:728` | `Jelajahi Job Pool untuk mengambil campaign lain dan tingkatkan penghasilanmu.` | Mixed ID/EN | `Jelajahi pool lowongan untuk mengambil kampanye lain dan tingkatkan penghasilanmu.` | P2 |
| `CreatorDashboardView.tsx:623` | `Dipilih khusus berdasarkan niche & kualifikasi profil kamu.` | EN term | `Dipilih khusus berdasarkan kategori & kualifikasi profil kamu.` | P2 |
| `CreatorDashboardView.tsx:604` | `Pesanan Rate Card` | Jargon | `Pesanan Daftar Tarif` | P2 |
| `CreatorDashboardView.tsx:544` | `Tarik ke rekening bank` | Mixed ID/EN | `Tarik ke rekening bank` (keep — bank is a loanword) | — |

### `/dashboard/kreator/job-pool`

| File:Line | Current text | Issue type | Suggested Indonesian | Severity |
| --- | --- | --- | --- | --- |
| `JobPoolView.tsx:47`,`49` | `NICHE_LABELS` renders `Travel` / `Beauty` | Inconsistent with sibling screen | `Pariwisata` / `Kecantikan` (its own filter options at L384, L381 already use the Indonesian forms) | P1 |
| `JobPoolView.tsx:157`,`243` | `PPV` chip | Jargon | `Bayar per Tayangan` | P2 |
| `JobPoolView.tsx:190` | `/ 1K views` | EN term | `/ 1.000 tayangan` | P1 |
| `JobPoolView.tsx:205` | `{slotsLeft} slot` | EN term | `{slotsLeft} kuota` | P1 |
| `JobPoolView.tsx:213` | `{usedQuota} / {quota} Klaim` | Mixed ID/EN | `{usedQuota} / {quota} diambil` | P2 |
| `JobPoolView.tsx:250` | `Sudah Diklaim ✓` | EN term | `Sudah Diambil ✓` | P2 |
| `JobPoolView.tsx:330` | `Gagal mengambil pekerjaan ini.` | — (OK) | — | — |
| `JobPoolView.tsx:405`,`406` | `Job Pool Kampanye` / `Pilih campaign UMKM yang cocok dengan niche kamu.` | Mixed ID/EN | `Pool Lowongan Kampanye` / `Pilih kampanye UMKM yang cocok dengan kategori kamu.` | P1 |
| `JobPoolView.tsx:412`,`434` | `Job Tersedia` / `Job Baru Hari Ini` | EN term | `Lowongan Tersedia` / `Lowongan Baru Hari Ini` | P1 |
| `JobPoolView.tsx:421` | `Per 1k tayangan` | Mixed casing | `Per 1.000 tayangan` | P2 |
| `JobPoolView.tsx:447` | `Cari kampanye / brand...` | Mixed ID/EN | `Cari kampanye / merek...` | P2 |
| `JobPoolView.tsx:463` | `Kuota Tersedia` | — (OK) | — | — |
| `JobPoolView.tsx:471` | `Job tidak ditemukan` / `Job pool kosong` | Mixed ID/EN | `Lowongan tidak ditemukan` / `Pool lowongan kosong` | P2 |
| `JobPoolView.tsx:475` | `UMKM belum menerbitkan kampanye baru di pool.` | Mixed ID/EN | `UMKM belum menerbitkan kampanye baru di pool.` (keep `pool`) | P2 |
| `ClaimCampaignModal.tsx:31` | `Kesesuaian Brief & Larangan` | Jargon | `Kesesuaian Panduan & Larangan` | P1 |
| `ClaimCampaignModal.tsx:32` | `...sesuai panduan dan larangan (do's & don'ts) pada brief produk.` | Mixed ID/EN | `...sesuai panduan dan larangan pada panduan produk.` | P1 |
| `ClaimCampaignModal.tsx:46`,`47` | `Perhitungan Reward Berdasar Views` / `...dihitung dari views tervalidasi...` | EN term | `Perhitungan Imbalan Berdasar Tayangan` / `...dihitung dari tayangan tervalidasi...` | P1 |
| `ClaimCampaignModal.tsx:94`,`111` | `Kontrak Kampanye` / `Klaim Campaign` | Mixed ID/EN | `Kontrak Kampanye` / `Klaim Kampanye` | P1 |
| `ClaimCampaignModal.tsx:120` | `{job.brandName || "Marketiv Client"}` | EN term | `{job.brandName || "Klien Marketiv"}` | P1 |
| `ClaimCampaignModal.tsx:124` | `{formatCurrency(...)} / 1k views` | EN term | `{formatCurrency(...)} / 1.000 tayangan` | P1 |
| `ClaimCampaignModal.tsx:216` | `Memproses Klaim…` / `Klaim Sekarang` | — (OK) | — | — |
| `ClaimSuccessModal.tsx:59` | `Job Berhasil Diklaim!` | EN term | `Lowongan Berhasil Diambil!` | P1 |
| `ClaimSuccessModal.tsx:81` | `...baca brief produk...ajukan link bukti tayang...` | Mixed ID/EN | `...baca panduan produk...ajukan tautan bukti tayang...` | P1 |
| `ClaimSuccessModal.tsx:93` | `Cari Job Lain` | EN term | `Cari Lowongan Lain` | P2 |
| `ClaimSuccessModal.tsx:72`,`104` | `Pekerjaan Aktif` | — (OK) | — | — |

### `/dashboard/kreator/job-pool/[id]` (job-pool detail)

| File:Line | Current text | Issue type | Suggested Indonesian | Severity |
| --- | --- | --- | --- | --- |
| `JobDetailView.tsx:85` | `VIDEO_SUB_TABS`: `Semua`, `Menunggu`, `Disetujui`, `Ditolak`, `Perlu Aksi`, `Dihapus` | — (OK) | — | — |
| `JobDetailView.tsx:96` | `BRIEF_PILLS`: `Aturan`, `Narasi`, `Caption`, `Tentang` | Jargon | `Aturan`, `Narasi`, `Keterangan`, `Tentang` | P1 |
| `JobDetailView.tsx:168`,`170` | `Tautan campaign disalin.` / `Gagal menyalin tautan campaign.` | Mixed ID/EN | `Tautan kampanye disalin.` / `Gagal menyalin tautan kampanye.` | P1 |
| `JobDetailView.tsx:200` | `Kembali ke Job Pool` | EN term | `Kembali ke Pool Lowongan` | P2 |
| `JobDetailView.tsx:282` | `PENUH` / `HAMPIR PENUH` / `ACTIVE` | EN term | `PENUH` / `HAMPIR PENUH` / `AKTIF` | P1 |
| `JobDetailView.tsx:294` | `/ 1K views` | EN term | `/ 1.000 tayangan` | P1 |
| `JobDetailView.tsx:319` | `Join Campaign` | EN term | `Ikut Kampanye` | P0 |
| `JobDetailView.tsx:323` | `Submit Video` | Mixed ID/EN | `Kirim Video` | P1 |
| `JobDetailView.tsx:328`,`329` | `aria-label/title="Bagikan campaign"` | Mixed ID/EN | `Bagikan kampanye` | P1 |
| `JobDetailView.tsx:395` | `Tentang Campaign` | Mixed ID/EN | `Tentang Kampanye` | P1 |
| `JobDetailView.tsx:402` | `Show more` | EN term | `Tampilkan selengkapnya` | P1 |
| `JobDetailView.tsx:416` | `Brief & Materi Clipping` | EN term | `Panduan & Materi Kliping` | P1 |
| `JobDetailView.tsx:418` | `Penjelasan brand, narasi, aturan + logo, footage & materi yang harus dipakai` | Mixed ID/EN | `Penjelasan merek, narasi, aturan + logo, rekaman & materi yang harus dipakai` | P1 |
| `JobDetailView.tsx:431` | `{quotaRemaining} / {job.quota} slot` | EN term | `{quotaRemaining} / {job.quota} kuota` | P2 |
| `JobDetailView.tsx:442` | `CPM Awal` | Jargon | `Tarif Awal per 1.000 Tayangan` (or keep `CPM` — open questions) | P2 |
| `JobDetailView.tsx:446` | `CPM (Rate /1K Views)` | Mixed ID/EN | `CPM (Tarif per 1.000 Tayangan)` | P1 |
| `JobDetailView.tsx:460` | `Materi Clipping Campaigns:` | EN term | `Materi Kliping Kampanye:` | P1 |
| `JobDetailView.tsx:527` | `Do's & Don'ts` | EN term | `Yang Boleh & Dilarang` | P1 |
| `JobDetailView.tsx:565`,`582` | `Narasi & pesan` / `Caption & CTA` | EN term | `Narasi & pesan` / `Keterangan & Ajakan` | P1 |
| `JobDetailView.tsx:583` | `Call to action yang disarankan` | EN term | `Ajakan yang disarankan` | P1 |
| `JobDetailView.tsx:589` | `UMKM belum menuliskan CTA.` | Jargon | `UMKM belum menuliskan ajakan.` | P1 |
| `JobDetailView.tsx:599` | `Tentang brand` / badge `Informasi` | Mixed ID/EN | `Tentang merek` / `Informasi` | P2 |
| `JobDetailView.tsx:609` | `Objektif campaign` | Mixed ID/EN | `Tujuan kampanye` | P1 |
| `JobDetailView.tsx:634` | `Material links (logo, footage, foto produk, dll)` | EN term | `Tautan materi (logo, rekaman, foto produk, dll)` | P1 |
| `JobDetailView.tsx:651` | `Buka` / `Unduh` | — (OK) | — | — |
| `JobDetailView.tsx:683` | `Daftar video muncul setelah kamu join campaign.` | EN term | `Daftar video muncul setelah kamu ikut kampanye.` | P1 |
| `JobDetailView.tsx:687` | `Join campaign dulu untuk mulai submit video.` | EN term | `Ikut kampanye dulu untuk mulai mengirim video.` | P0 |
| `JobDetailView.tsx:534`,`550` | `HAL YANG BOLEH DILAKUKAN` / `HAL YANG DILARANG` | — (OK) | — | — |

### `/dashboard/kreator/pekerjaan-aktif`

| File:Line | Current text | Issue type | Suggested Indonesian | Severity |
| --- | --- | --- | --- | --- |
| `PekerjaanAktifView.tsx:59` | `Klaim Campaign Baru` | Mixed ID/EN | `Klaim Kampanye Baru` | P1 |
| `PekerjaanAktifView.tsx:60` | `...ambil campaign Pay-Per-View yang sesuai dengan niche kontenmu.` | Mixed ID/EN | `...ambil kampanye Bayar-per-Tayangan yang sesuai dengan kategori kontenmu.` | P1 |
| `PekerjaanAktifView.tsx:62`,`88` | `Cari di Job Pool` / `Kelola Rate Card` | EN term | `Cari di Pool Lowongan` / `Kelola Daftar Tarif` | P2 |
| `PekerjaanAktifView.tsx:64`,`77` | `Reward dihitung berbasis views` / `Audit views transparan oleh admin` | EN term | `Imbalan dihitung berbasis tayangan` / `Audit tayangan transparan oleh admin` | P1 |
| `PekerjaanAktifView.tsx:69` | `Tingkatkan Payout` | EN term | `Tingkatkan Pencairan` | P1 |
| `PekerjaanAktifView.tsx:73` | `Klaim beberapa campaign sekaligus...reward penayangan videomu.` | Mixed ID/EN | `Klaim beberapa kampanye sekaligus...imbalan penayangan videomu.` | P1 |
| `PekerjaanAktifView.tsx:75` | `Jelajahi Campaign` | Mixed ID/EN | `Jelajahi Kampanye` | P1 |
| `PekerjaanAktifView.tsx:78` | `Pencairan langsung ke dompet saldo` | Mixed ID/EN | `Pencairan langsung ke saldo dompet` | P2 |
| `PekerjaanAktifView.tsx:86` | `Tawarkan paket konten fixed price langsung ke brand UMKM dengan kolaborasi endorsement.` | EN term | `Tawarkan paket konten harga tetap langsung ke merek UMKM dengan kolaborasi dukungan.` | P1 |
| `PekerjaanAktifView.tsx:90`,`91` | `Format Collab Post resmi IG/TikTok` / `Dana diamankan sistem Escrow` | EN term | `Format Postingan Kolaborasi resmi IG/TikTok` / `Dana diamankan sistem Rekening Bersama` | P1 |
| `PekerjaanAktifView.tsx:174` | `Pendapatan Dirilis` / `Estimasi Reward` | EN term | `Pendapatan Dirilis` / `Estimasi Imbalan` | P1 |
| `PekerjaanAktifView.tsx:186` | STATUS_CHIP key `Terindikasi Fraud` | EN term | `Terindikasi Kecurangan` | P1 |
| `PekerjaanAktifView.tsx:181`,`182` | STATUS_CHIP key `Menunggu Review` / `Perlu Ditinjau` | EN term | `Menunggu Peninjauan` / `Perlu Ditinjau` | P1 |
| `PekerjaanAktifView.tsx:243` | `PPV` chip | Jargon | `Bayar per Tayangan` | P2 |
| `PekerjaanAktifView.tsx:271` | `/ 1K views` | EN term | `/ 1.000 tayangan` | P1 |
| `PekerjaanAktifView.tsx:299` | `{isValid \|\| isPending ? "Audit" : "Target"} {views} views` | EN term | `{... ? "Audit" : "Target"} {views} tayangan` | P1 |
| `PekerjaanAktifView.tsx:352`,`356` | `Kirim Bukti` / `Sudah Dikirim` | — (OK) | — | — |
| `PekerjaanAktifView.tsx:411` | `Pekerjaan "{title}" dibatalkan. Slot campaign kembali terbuka.` | Mixed ID/EN | `Pekerjaan "{title}" dibatalkan. Kuota kampanye kembali terbuka.` | P1 |
| `PekerjaanAktifView.tsx:481` | filter option `Review / Fraud` | EN term | `Tinjauan / Kecurangan` | P1 |
| `PekerjaanAktifView.tsx:499` | sort option `Deadline Terdekat` | EN term | `Tenggat Terdekat` | P1 |
| `PekerjaanAktifView.tsx:514` | `Pantau campaign yang sudah kamu klaim.` | Mixed ID/EN | `Pantau kampanye yang sudah kamu klaim.` | P1 |
| `PekerjaanAktifView.tsx:529`,`543` | `Sedang diaudit` / `Ada kendala konten` | — (OK) | — | — |
| `PekerjaanAktifView.tsx:608` | `...Kamu masih bisa mengambil campaign ini lagi selama slotnya belum penuh.` | Mixed ID/EN | `...Kamu masih bisa mengambil kampanye ini lagi selama kuotanya belum penuh.` | P1 |

### `/dashboard/kreator/pekerjaan-aktif/[id]` (pekerjaan-aktif detail)

| File:Line | Current text | Issue type | Suggested Indonesian | Severity |
| --- | --- | --- | --- | --- |
| `ActiveWorkDetailView.tsx:217`,`222` | `Pekerjaan "{title}" dibatalkan. Slot campaign kembali terbuka.` / `...Kembali ke daftar...` | Mixed ID/EN | `...Kuota kampanye kembali terbuka.` | P1 |
| `ActiveWorkDetailView.tsx:275` | STATUS_BADGE key `Menunggu Review` | EN term | `Menunggu Peninjauan` | P1 |
| `ActiveWorkDetailView.tsx:280` | STATUS_BADGE key `Terindikasi Fraud` | EN term | `Terindikasi Kecurangan` | P1 |
| `ActiveWorkDetailView.tsx:334` | `CAMPAIGN` hero chip | EN term | `KAMPANYE` | P1 |
| `ActiveWorkDetailView.tsx:354` | `/ 1K views` | EN term | `/ 1.000 tayangan` | P1 |
| `ActiveWorkDetailView.tsx:373` | `CPM MODE` | Jargon | `MODE CPM` (keep — open questions) | P2 |
| `ActiveWorkDetailView.tsx:377` | `{views} VIEW AUDIT` / `BELUM DIVERIFIKASI` | EN term | `{views} TAYANGAN TERAUDIT` / `BELUM DIVERIFIKASI` | P1 |
| `ActiveWorkDetailView.tsx:394`,`607` | `Kirim untuk Diverifikasi` | — (OK) | — | — |
| `ActiveWorkDetailView.tsx:464` | `Brief Kampanye & Detail Aset` | EN term | `Panduan Kampanye & Detail Aset` | P1 |
| `ActiveWorkDetailView.tsx:474` | `Rate 1k Views` | EN term | `Tarif per 1.000 Tayangan` | P1 |
| `ActiveWorkDetailView.tsx:484` | `Bukti Tayang` value `URL Link` | EN term | `Tautan URL` | P1 |
| `ActiveWorkDetailView.tsx:499` | `Aset yang dilampirkan UMKM untuk campaign ini.` | Mixed ID/EN | `Aset yang dilampirkan UMKM untuk kampanye ini.` | P1 |
| `ActiveWorkDetailView.tsx:520` | `Kirim Bukti Tayang (Link URL)` | Mixed ID/EN | `Kirim Bukti Tayang (Tautan URL)` | P1 |
| `ActiveWorkDetailView.tsx:533` | `Cara Hitung Reward` | EN term | `Cara Hitung Imbalan` | P1 |
| `ActiveWorkDetailView.tsx:534` | `Reward = (jumlah views ÷ 1.000) × tarif per 1K views...reward = Rp0.` | EN term | `Imbalan = (jumlah tayangan ÷ 1.000) × tarif per 1.000 tayangan...` | P1 |
| `ActiveWorkDetailView.tsx:557` | `Read-Only` | EN term | `Hanya Baca` | P1 |
| `ActiveWorkDetailView.tsx:584` | `Campaign Mode: Dilarang mengunggah file video...` | EN term | `Mode Kampanye: Dilarang mengunggah berkas video...` | P1 |
| `ActiveWorkDetailView.tsx:595` | placeholder `Contoh: Video sudah ditayangkan menggunakan hashtag brand...` | Mixed ID/EN | `...menggunakan tagar merek...` | P2 |
| `ActiveWorkDetailView.tsx:622` | `📷 Instagram` / `🎵 TikTok` | — (OK) | — | — |
| `ActiveWorkDetailView.tsx:626` | `Postingan Video URL` | Mixed ID/EN | `Tautan Video Postingan` | P2 |
| `ActiveWorkDetailView.tsx:660` | `Estimasi & Data Views Tayangan` | EN term | `Estimasi & Data Tayangan Video` | P1 |
| `ActiveWorkDetailView.tsx:666` | `Jumlah Views` | EN term | `Jumlah Tayangan` | P1 |
| `ActiveWorkDetailView.tsx:673` | `Rate per 1k Views` | EN term | `Tarif per 1.000 Tayangan` | P1 |
| `ActiveWorkDetailView.tsx:687` | `Reward Terhitung` / `Estimasi Reward` | EN term | `Imbalan Terhitung` / `Estimasi Imbalan` | P1 |
| `ActiveWorkDetailView.tsx:700` | `Reward dihitung oleh sistem...floor(views ÷ 1.000) × tarif per 1K views...` | EN term | `Imbalan dihitung oleh sistem...dibulatkan ke bawah...` | P1 |
| `ActiveWorkDetailView.tsx:712` | `Timeline Progres Bukti` | EN term | `Riwayat Progres Bukti` | P1 |
| `ActiveWorkDetailView.tsx:723` | `Campaign Diklaim` | Mixed ID/EN | `Kampanye Diklaim` | P1 |
| `ActiveWorkDetailView.tsx:850` | `Standar Campaign Mode` | EN term | `Standar Mode Kampanye` | P1 |
| `ActiveWorkDetailView.tsx:856` | `Pertanyaan teknis dapat diajukan ke Admin via menu support.` | Mixed ID/EN | `...melalui menu bantuan.` | P1 |
| `ActiveWorkDetailView.tsx:873` | `Statistik & Riwayat Tayangan Video` | — (OK) | — | — |
| `ActiveWorkDetailView.tsx:880` | `URL Bukti Tayang` | EN term | `Tautan Bukti Tayang` | P1 |
| `ActiveWorkDetailView.tsx:893`,`899` | `Views` / `Reward` | EN term | `Tayangan` / `Imbalan` | P1 |
| `ActiveWorkDetailView.tsx:922` | `Kirim URL video Anda terlebih dahulu di tab Detail.` | EN term | `Kirim tautan video Anda terlebih dahulu di tab Detail.` | P1 |
| `ActiveWorkDetailView.tsx:931` | `Cara Kerja Verifikasi Views` | EN term | `Cara Kerja Verifikasi Tayangan` | P1 |
| `ActiveWorkDetailView.tsx:933` | `Admin Marketiv mengunci jumlah views video ini...dasar perhitungan reward.` | EN term | `...jumlah tayangan video ini...dasar perhitungan imbalan.` | P1 |
| `ActiveWorkDetailView.tsx:945` | `Yakin ingin mengirim URL {TikTok Video \| Instagram Reels} berikut...` | Mixed ID/EN | `Yakin ingin mengirim tautan {Video TikTok \| Instagram Reels} berikut...` | P1 |
| `ActiveWorkDetailView.tsx:948` | `Cek Ulang URL` | EN term | `Cek Ulang Tautan` | P2 |
| `ActiveWorkDetailView.tsx:962` | `...slotnya kembali terbuka untuk kreator lain.` (also `:608` note `...slotnya belum penuh.`) | Mixed ID/EN | `...kuotanya kembali terbuka...` / `...kuotanya belum penuh.` | P1 |
| `ActiveWorkDetailView.tsx:945`-`967` | ModalFrame/ConfirmDialog labels | — (OK) | — | — |

### `/dashboard/kreator/negosiasi`

| File:Line | Current text | Issue type | Suggested Indonesian | Severity |
| --- | --- | --- | --- | --- |
| `NegosiasiView.tsx:76` | stage label `Diskusi` | — (OK) | — | — |
| `NegosiasiView.tsx:81` | stage label `Escrow Aktif` | EN term | `Dana Ditahan` (consistent with `getEscrowStatusLabel`) | P1 |
| `NegosiasiView.tsx:82` | stage label `Dikerjakan` | Inconsistent with sibling screen | `Sedang Dikerjakan` (matches `NegosiasiRoomView.tsx:100`) | P1 |
| `NegosiasiView.tsx:83` | stage label `Revisi` | Inconsistent with sibling screen | `Revisi Diminta` (matches `NegosiasiRoomView.tsx:101`) | P1 |
| `NegosiasiView.tsx:165` | `Brand UMKM` | Mixed ID/EN | `Merek UMKM` | P2 |
| `NegosiasiView.tsx:249` | `Buka Room` | EN term | `Buka Ruang` / `Buka Obrolan` | P1 |
| `NegosiasiView.tsx:408` | `Kelola order Rate Card dari UMKM.` | EN term | `Kelola pesanan Daftar Tarif dari UMKM.` | P1 |
| `NegosiasiView.tsx:432` | `Escrow Aktif` metric label | EN term | `Dana Ditahan` | P1 |
| `NegosiasiView.tsx:440` | `Order Selesai` | EN term | `Pesanan Selesai` | P1 |
| `NegosiasiView.tsx:442` | `Reward siap dicairkan` | EN term | `Imbalan siap dicairkan` | P1 |
| `NegosiasiView.tsx:454` | `Cari UMKM / judul order...` | EN term | `Cari UMKM / judul pesanan...` | P1 |
| `NegosiasiView.tsx:475` | tab `Inbox` | EN term | `Kotak Masuk` | P1 |
| `NegosiasiView.tsx:496` | tab `Arsip` | — (OK) | — | — |
| `NegosiasiView.tsx:518` | `...chat negosiasi masuk dari UMKM buat paket Rate Card kamu.` | Mixed ID/EN | `...obrolan negosiasi masuk dari UMKM untuk paket Daftar Tarif kamu.` | P1 |
| `NegosiasiView.tsx:355`,`365` | filter options `Escrow Aktif` / `Deadline Terdekat` | EN term | `Dana Ditahan` / `Tenggat Terdekat` | P1 |
| `NegosiasiView.tsx:354` | filter option `Menunggu Pembayaran` | — (OK) | — | — |
| `NegosiasiView.tsx:196` | `Diskusi Paket & Kebutuhan Konten` | — (OK) | — | — |
| `NegosiasiView.tsx:216` | `Kamu Terima` | — (OK) | — | — |
| `NegosiasiView.tsx:283` | `Percakapan diarsipkan.` / `Percakapan dikembalikan ke inbox.` | EN term | `...dikembalikan ke kotak masuk.` | P1 |

### `/dashboard/kreator/negosiasi/[id_conversation]` (negosiasi room)

| File:Line | Current text | Issue type | Suggested Indonesian | Severity |
| --- | --- | --- | --- | --- |
| `NegosiasiRoomView.tsx:94` | stage label `Negosiasi` (for `chatting`) | Inconsistent with sibling screen | `Diskusi` (matches `NegosiasiView.tsx:76`) | P1 |
| `NegosiasiRoomView.tsx:99`-`101` | `Escrow Aktif` / `Sedang Dikerjakan` / `Revisi Diminta` | EN term | `Dana Ditahan` for escrow | P1 |
| `NegosiasiRoomView.tsx:173`,`191` | `Gagal memuat data percakapan.` / `Gagal memuat ruang percakapan.` | — (OK) | — | — |
| `NegosiasiRoomView.tsx:304` | `Gagal menjawab penawaran.` | — (OK) | — | — |
| `NegosiasiRoomView.tsx:373` | `Gagal mengirim deliverable.` | EN term | `Gagal mengirim hasil kerja.` | P1 |
| `NegosiasiRoomView.tsx:381` | `Deliverable terkirim. Menunggu review UMKM.` | EN term | `Hasil kerja terkirim. Menunggu peninjauan UMKM.` | P1 |
| `NegosiasiRoomView.tsx:455` | `Inisiasi Negosiasi & Deal` | EN term | `Negosiasi & Kesepakatan Dimulai` | P1 |
| `NegosiasiRoomView.tsx:456`,`458` | `Pembayaran Escrow UMKM` / `Pelepasan Dana Escrow` | EN term | `Pembayaran ke Rekening Bersama` / `Pelepasan Dana Rekening Bersama` | P1 |
| `NegosiasiRoomView.tsx:457` | `Kirim URL Collab Post` | EN term | `Kirim Tautan Postingan Kolaborasi` | P1 |
| `NegosiasiRoomView.tsx:505`,`506` | `Keluar dari fullscreen chat` / `Fullscreen chat` | EN term | `Keluar dari layar penuh` / `Layar penuh` | P1 |
| `NegosiasiRoomView.tsx:518` | `...wajib memakai fitur "Collab Post" di Instagram / TikTok...` | EN term | `...wajib memakai fitur "Postingan Kolaborasi" di Instagram / TikTok...` | P1 |
| `NegosiasiRoomView.tsx:567` | `Custom Offer` | EN term | `Penawaran Khusus` | P1 |
| `NegosiasiRoomView.tsx:584` | offer card label `Deadline` | EN term | `Tenggat` | P1 |
| `NegosiasiRoomView.tsx:613` | `Tolak` | — (OK) | — | — |
| `NegosiasiRoomView.tsx:619` | `Kesepakatan Terbuat` | Mixed casing / grammar | `Kesepakatan Dibuat` | P1 |
| `NegosiasiRoomView.tsx:689`,`956` | `Kirim Ulang (v{n})` / `Kirim Deliverable` | EN term | `...` / `Kirim Hasil Kerja` | P1 |
| `NegosiasiRoomView.tsx:694` | `...bukti lolos validasi Marketiv dan menunggu review UMKM` / `...belum lolos validasi Marketiv` | EN term | `...menunggu peninjauan UMKM` | P1 |
| `NegosiasiRoomView.tsx:700` | `UMKM minta revisi pada v{n}` | Mixed casing (informal) | `UMKM meminta revisi pada v{n}` | P2 |
| `NegosiasiRoomView.tsx:765` | quick reply `Sedang dikerjakan` / `Konten sedang dalam proses pengerjaan kak, mohon ditunggu.` | Mixed casing | `Sedang Dikerjakan` / (message OK) | P2 |
| `NegosiasiRoomView.tsx:766` | `Minta perpanjangan` / `...apakah deadline bisa diundur sedikit?` | EN term | `Minta Perpanjangan` / `...apakah tenggat bisa diundur sedikit?` | P1 |
| `NegosiasiRoomView.tsx:835` | `Deliverables` | EN term | `Hasil Kerja` | P1 |
| `NegosiasiRoomView.tsx:843` | `Deadline` (contract card) | EN term | `Tenggat` | P1 |
| `NegosiasiRoomView.tsx:824` | `Harga paket {x}. Harga final tetap dari kesepakatan.` | Mixed ID/EN | `...Harga akhir tetap dari kesepakatan.` | P2 |
| `NegosiasiRoomView.tsx:873`,`888` | `Status Escrow` / `Belum Ada Escrow` | EN term | `Status Rekening Bersama` / `Belum Ada Dana Ditahan` | P1 |
| `NegosiasiRoomView.tsx:898` | `Checklist Deliverables` | EN term | `Checklist Hasil Kerja` | P1 |
| `NegosiasiRoomView.tsx:1004` | `Link Hasil Kerja` | EN term | `Tautan Hasil Kerja` | P1 |
| `NegosiasiRoomView.tsx:1059` | `...dana escrow dilepaskan ke saldo kamu dikurangi fee platform {x}%.` | EN term | `...dana rekening bersama dilepaskan...dikurangi biaya platform {x}%.` | P1 |
| `NegosiasiRoomView.tsx:835` | section badge `Panduan` | — (OK) | — | — |
| `NegosiasiRoomView.tsx:946` | `Kirim Deliverable` | EN term | `Kirim Hasil Kerja` | P1 |

### `/dashboard/kreator/keuangan`

| File:Line | Current text | Issue type | Suggested Indonesian | Severity |
| --- | --- | --- | --- | --- |
| `KeuanganView.tsx:191` | `Menunggu diproses tim Marketiv.` | — (OK) | — | — |
| `KeuanganView.tsx:236` | source option `Campaign` | EN term | `Kampanye` | P1 |
| `KeuanganView.tsx:237` | source option `Rate Card` | Jargon | `Daftar Tarif` | P1 |
| `KeuanganView.tsx:317` | type label `Dana Escrow` | EN term | `Dana Rekening Bersama` | P1 |
| `KeuanganView.tsx:315` | `Pendapatan Campaign` | EN term | `Pendapatan Kampanye` | P1 |
| `KeuanganView.tsx:343` | `...pendapatan campaign, dan transaksi escrow Rate Card Anda.` | Mixed ID/EN | `...pendapatan kampanye, dan transaksi rekening bersama Daftar Tarif Anda.` | P1 |
| `KeuanganView.tsx:427` | `Dari marketing pay-per-view` | Mixed ID/EN | `Dari pemasaran bayar-per-tayangan` | P1 |
| `KeuanganView.tsx:449` | `Riwayat Transaksi Wallet` | EN term | `Riwayat Transaksi Dompet` | P1 |
| `KeuanganView.tsx:459` | `Cari ID, deskripsi, atau campaign...` | Mixed ID/EN | `Cari ID, deskripsi, atau kampanye...` | P1 |
| `KeuanganView.tsx:572`,`601` | `Tarik Saldo Wallet` | EN term | `Tarik Saldo Dompet` | P1 |
| `KeuanganView.tsx:606` | `Pindahkan saldo hasil karya kreator ke rekening bank atau e-wallet.` | EN term | `...atau dompet digital.` | P1 |
| `KeuanganView.tsx:650`,`687` | `E-Wallet` | EN term | `Dompet Digital` | P1 |
| `KeuanganView.tsx:661` | `Pilih Bank / E-Wallet` | EN term | `Pilih Bank / Dompet Digital` | P1 |
| `KeuanganView.tsx:709` | `Nomor Handphone E-Wallet` | Mixed ID/EN | `Nomor Handphone Dompet Digital` | P1 |
| `KeuanganView.tsx:841` | `Sisa Saldo Wallet` | EN term | `Sisa Saldo Dompet` | P1 |
| `KeuanganView.tsx:1045`,`1059` | `Detail Transaksi Wallet` | EN term | `Detail Transaksi Dompet` | P1 |
| `KeuanganView.tsx:1047` | `Rincian transaksi wallet kreator.` | EN term | `Rincian transaksi dompet kreator.` | P1 |
| `KeuanganView.tsx:1091` | `Jumlah Transaksi` | — (OK) | — | — |
| `KeuanganView.tsx:1137` | `Catatan Audit Wallet` | EN term | `Catatan Audit Dompet` | P1 |
| `KeuanganView.tsx:1151` | `Tutup Rincian` | — (OK) | — | — |
| `KeuanganView.tsx:833`,`925` | `Biaya Layanan Admin` / `Biaya Admin` | Inconsistent with sibling screen | pick one: `Biaya Layanan Admin` | P2 |
| `KeuanganView.tsx:492` | `ID Transaksi` | — (OK) | — | — |
| `KeuanganView.tsx:496` | `Status` | — (OK) | — | — |
| `KeuanganView.tsx:1036` | `Maksimal {n} MB dan memakai kuota penyimpananmu.` | — (OK) | — | — |

### `/dashboard/kreator/rate-card`

| File:Line | Current text | Issue type | Suggested Indonesian | Severity |
| --- | --- | --- | --- | --- |
| `RateCardView.tsx:157` | `Buat Paket Standard` | Mixed ID/EN | `Buat Paket Standar` | P1 |
| `RateCardView.tsx:158` | `...konsep review produk atau endorsement cepat.` | EN term | `...konsep ulasan produk atau dukungan cepat.` | P1 |
| `RateCardView.tsx:165`,`167` | `Paket Bundling Konten` / `Tambah Paket Bundle` | EN term | `Paket Gabungan Konten` / `Tambah Paket Gabungan` | P1 |
| `RateCardView.tsx:166` | `...bundling 2-3 video promosi berkala untuk exposure maksimal.` | EN term | `...menggabungkan 2-3 video promosi berkala untuk jangkauan maksimal.` | P1 |
| `RateCardView.tsx:173`,`174` | `Paket Eksklusif + Collab` / `...mencakup Collab Post resmi...link bio profil.` | EN term | `Paket Eksklusif + Kolaborasi` / `...Postingan Kolaborasi resmi...tautan bio profil.` | P1 |
| `RateCardView.tsx:214` | `Collab Post & Fixed Price` | EN term | `Postingan Kolaborasi & Harga Tetap` | P1 |
| `RateCardView.tsx:218` | `Dana dijamin Escrow Aman` | EN term | `Dana dijamin Rekening Bersama` | P1 |
| `RateCardView.tsx:271` | `aria-label="Jadikan draft" / "Tayangkan paket"` | EN term | `Jadikan draf` | P1 |
| `RateCardView.tsx:280` | status `Tayang` / `Draft` | EN term | `Tayang` / `Draf` | P1 |
| `RateCardView.tsx:339` | `Output / Deliverables` | EN term | `Output / Hasil Kerja` | P1 |
| `RateCardView.tsx:478` | `Paket berhasil diaktifkan!/dinonaktifkan!` | — (OK) | — | — |
| `RateCardView.tsx:573` | `Paket dijadikan draft — tidak lagi tampil di marketplace.` | EN term | `Paket dijadikan draf — tidak lagi tampil di toko.` | P1 |
| `RateCardView.tsx:594`,`595` | `Paket Rate Card Jasa` / `Kelola paket jasa kreator untuk order fixed-price.` | EN term | `Paket Daftar Tarif Jasa` / `Kelola paket jasa kreator untuk pesanan harga tetap.` | P1 |
| `RateCardView.tsx:646` | `Order Jasa Masuk` | EN term | `Pesanan Jasa Masuk` | P1 |
| `RateCardView.tsx:698` | placeholder `Contoh: Standard TikTok Review` | EN term | `Contoh: Ulasan TikTok Standar` | P2 |
| `RateCardView.tsx:715`,`769` | `Output / Deliverables` | EN term | `Output / Hasil Kerja` | P1 |
| `RateCardView.tsx:716` | placeholder `...1 Video TikTok (30-60 detik) + Link Bio 3 Hari` | EN term | `...Tautan Bio 3 Hari` | P2 |
| `RateCardView.tsx:720` | placeholder `...visual tone, dan apa yang didapat UMKM...` | EN term | `...gaya visual, dan apa yang didapat UMKM...` | P2 |
| `RateCardView.tsx:815` | `Jadikan Draft Saja` | EN term | `Jadikan Draf Saja` | P1 |
| `RateCardView.tsx:614` | `Maksimal 3 paket telah tercapai.` | — (OK) | — | — |
| `RateCardView.tsx:637` | `Harga paket termurah aktif` | — (OK) | — | — |

### `/dashboard/kreator/settings`

| File:Line | Current text | Issue type | Suggested Indonesian | Severity |
| --- | --- | --- | --- | --- |
| `SettingsView.tsx:72` | tab desc `Password & akses` | EN term | `Kata sandi & akses` | P1 |
| `SettingsView.tsx:642` | `Gunakan gambar landscape. Rekomendasi 1600 × 500 px.` | EN term | `Gunakan gambar lanskap. Rekomendasi 1600 × 500 px.` | P2 |
| `SettingsView.tsx:770` | `Nama Display` | Mixed ID/EN | `Nama Tampilan` | P1 |
| `SettingsView.tsx:866` | `Jumlah Followers TikTok` | EN term | `Jumlah Pengikut TikTok` | P1 |
| `SettingsView.tsx:877` | `Diisi manual dan opsional. Angka ini yang ditampilkan ke UMKM.` | — (OK) | — | — |
| `SettingsView.tsx:933` | `Tingkat Penyelesaian Job` | EN term | `Tingkat Penyelesaian Lowongan` | P1 |
| `SettingsView.tsx:938`,`940` | `Total Followers Gabungan` / `{n} followers` | EN term | `Total Pengikut Gabungan` / `{n} pengikut` | P1 |
| `SettingsView.tsx:1063` | `Campaign Baru Sesuai Niche` | EN term | `Kampanye Baru Sesuai Kategori` | P1 |
| `SettingsView.tsx:1064` | `...saat ada campaign baru yang cocok dengan kategori konten kamu.` | Mixed ID/EN | `...saat ada kampanye baru...` | P1 |
| `SettingsView.tsx:1070` | `Pengingat Deadline Pekerjaan` | EN term | `Pengingat Tenggat Pekerjaan` | P1 |
| `SettingsView.tsx:1077` | `Update Status Order Rate Card` | EN term | `Pembaruan Status Pesanan Daftar Tarif` | P1 |
| `SettingsView.tsx:1078` | `...saat UMKM melakukan order, konfirmasi, atau revisi...` | EN term | `...saat UMKM melakukan pesanan, konfirmasi, atau revisi...` | P1 |
| `SettingsView.tsx:1090` | `Alert Pembayaran & Pencairan` | EN term | `Peringatan Pembayaran & Pencairan` | P1 |
| `SettingsView.tsx:1091` | `...pembayaran masuk ke wallet atau pencairan berhasil diproses.` | EN term | `...pembayaran masuk ke dompet...` | P1 |
| `SettingsView.tsx:1104` | `Newsletter & Tips Kreator` | EN term | `Buletin & Tips Kreator` | P1 |
| `SettingsView.tsx:1105` | `Email bulanan berisi tips monetisasi, update fitur, dan insight dari Marketiv.` | EN term | `...pembaruan fitur, dan wawasan dari Marketiv.` | P1 |
| `SettingsView.tsx:1127` | `Username` (and `:1133`) | EN term | `Nama pengguna` | P1 |
| `SettingsView.tsx:1137` | `Email Terdaftar` | — (OK, loanword) | — | — |
| `SettingsView.tsx:1174`,`1212` | `Ubah Password` | EN term | `Ubah Kata Sandi` | P1 |
| `SettingsView.tsx:1183` | `Password Saat Ini` | EN term | `Kata Sandi Saat Ini` | P1 |
| `SettingsView.tsx:1193` | `Password Baru` | EN term | `Kata Sandi Baru` | P1 |
| `SettingsView.tsx:1203` | `Konfirmasi Password Baru` | EN term | `Konfirmasi Kata Sandi Baru` | P1 |
| `SettingsView.tsx:1207` | placeholder `Ulangi password baru` | EN term | `Ulangi kata sandi baru` | P1 |
| `SettingsView.tsx:1219` | `Sesi & Aktivitas Login` | EN term | `Sesi & Aktivitas Masuk` | P1 |
| `SettingsView.tsx:1222`,`1177` | `Segera tersedia` | — (OK) | — | — |
| `SettingsView.tsx:1471`,`1584` | `Thumbnail (Opsional)` | EN term | `Gambar Mini (Opsional)` | P1 |
| `SettingsView.tsx:1481`,`1594` | `Mengunggah thumbnail…` | EN term | `Mengunggah gambar mini…` | P1 |
| `SettingsView.tsx:1484`,`1597` | `Thumbnail siap disimpan.` | EN term | `Gambar mini siap disimpan.` | P1 |
| `SettingsView.tsx:1494` | placeholder `Review toner serum glow up...` | EN term | `Ulasan toner serum...` | P2 |
| `SettingsView.tsx:1022` | `VIEWS PENONTON` (`{n} views`) | EN term | `TAYANGAN PENONTON` (`{n} tayangan`) | P1 |
| `SettingsView.tsx:917` | `{n} views` (StatRow value) | EN term | `{n} tayangan` | P1 |
| `SettingsView.tsx:983` | `...video terbaik kamu biar brand bisa lihat karya kamu.` | Mixed ID/EN (informal) | `...video terbaikmu agar merek bisa melihat karyamu.` | P2 |
| `SettingsView.tsx:1097` | `Pesan Baru dari Brand atau Admin` | Mixed ID/EN | `Pesan Baru dari Merek atau Admin` | P2 |
| `SettingsView.tsx:1246`,`1256` | `Pengaturan` / `Kelola profil publik, portofolio, notifikasi, dan keamanan akun kamu.` | — (OK) | — | — |
| `SettingsView.tsx:1399` | `...tautan sosial media kamu berhasil disinkronisasikan...` | — (OK) | — | — |

### `/dashboard/kreator/notifikasi`

| File:Line | Current text | Issue type | Suggested Indonesian | Severity |
| --- | --- | --- | --- | --- |
| `NotificationView.tsx:42` | `Notifikasi Kreator` (pageTitle) | — (OK) | — | — |
| `NotificationView.tsx:72` | NOTIF_CFG label `Campaign` | EN term | `Kampanye` | P1 |
| `NotificationView.tsx:95` | NOTIF_CFG label `Rate Card` | Jargon | `Daftar Tarif` | P1 |
| `NotificationView.tsx:94`,`97` | `Rate Card` (tab) / `Sistem` (tab) | Jargon | `Daftar Tarif` / `Sistem` | P1 |
| `NotificationView.tsx:221` | tab `Campaign` | EN term | `Kampanye` | P1 |
| `NotificationView.tsx:220` | tab `Belum Dibaca` | — (OK) | — | — |
| `NotificationView.tsx:247` | `{n} notifikasi belum dibaca` / `Semua notifikasi sudah dibaca` | — (OK) | — | — |
| `NotificationView.tsx:332`,`336` | `Tidak ada notifikasi baru` / `Belum ada notifikasi` / `Semua notifikasi sudah Anda baca.` | — (OK) | — | — |
| `NotificationView.tsx:345` | `Lihat semua notifikasi` | — (OK) | — | — |
| `NotificationView.tsx:399` | aria `Belum dibaca` | — (OK) | — | — |
| `NotificationView.tsx:464` | title `Hapus Notifikasi` | — (OK) | — | — |
| `NotificationView.tsx:482` | `Semua notifikasi telah dimuat` | — (OK) | — | — |

### shared chrome rendered by the creator dashboard

| File:Line | Current text | Issue type | Suggested Indonesian | Severity |
| --- | --- | --- | --- | --- |
| `src/components/features/shared/NotificationHeaderDropdown.tsx:141` | `{n} baru` | — (OK) | — | — |
| `src/components/features/shared/NotificationHeaderDropdown.tsx:157` | `Dibaca` (mark-all button) | — (OK) | — | — |
| `src/components/features/shared/NotificationHeaderDropdown.tsx:170` | `Notifikasi baru Anda akan tampil di sini.` | — (OK) | — | — |
| `src/components/features/shared/NotificationHeaderDropdown.tsx:243` | `Lihat Semua Notifikasi` | — (OK) | — | — |
| `src/components/features/shared/AppNotificationDetailDialog.tsx:45`,`62` | CATEGORY_CONFIG labels `Campaign` / `Rate Card` | EN term | `Kampanye` / `Daftar Tarif` | P1 |
| `src/components/features/shared/AppNotificationDetailDialog.tsx:205` | fallback `Buka Halaman Terkait` | — (OK) | — | — |
| `src/components/features/dashboard/shared/DashboardStateCard.tsx` | (all copy comes from callers) | — | — | — |
| `src/components/features/dashboard/shared/DashboardBadge.tsx:71`,`72` | status label `Pending` / `Valid` | EN term | `Menunggu` / `Valid` | P1 |
| `src/components/features/dashboard/shared/DashboardBadge.tsx:75` | status label `Fraud` | EN term | `Kecurangan` | P1 |
| `src/components/features/dashboard/shared/DashboardBadge.tsx:61` | status label `Draft` | EN term | `Draf` | P2 |
| `src/components/features/dashboard/shared/SearchToolbar.tsx:156` | `Filter & Opsi` | Mixed ID/EN | `Saringan & Opsi` | P1 |
| `src/components/features/dashboard/shared/SearchToolbar.tsx:176`,`210` | `Reset` | EN term | `Setel ulang` | P1 |
| `src/components/features/dashboard/shared/SearchToolbar.tsx:223` | `Kategori:` | — (OK) | — | — |
| `src/components/features/dashboard/shared/LogoutConfirmDialog.tsx:44`-`52` | purple config: `Konten Kreator`, `Keluar dari Dashboard Kreator?`, `...job pool, rate card, dan pencairan saldo.`, `Ya, Keluar Akun Kreator` | Mixed ID/EN | `...pool lowongan, daftar tarif, dan pencairan saldo.` | P1 |
| `src/components/features/dashboard/shared/LogoutConfirmDialog.tsx:56` | red config badgeLabel `Marketiv Account` | EN term | `Akun Marketiv` | P2 |
| `src/components/features/dashboard/shared/HelpAdminModal.tsx:26` | toast `Link grup WhatsApp Konten Kreator akan segera tersedia!` | Mixed ID/EN | `Tautan grup WhatsApp Konten Kreator akan segera tersedia!` | P2 |
| `src/components/features/dashboard/shared/HelpAdminModal.tsx:44`,`48` | `Pusat Bantuan Kreator` / `Hubungi Admin & Komunitas` | — (OK) | — | — |
| `src/components/features/dashboard/shared/HelpAdminModal.tsx:72`,`79` | `Chat Admin Marketiv` / `...WhatsApp resmi Admin Marketiv...` | Mixed ID/EN | `Obrolan Admin Marketiv` | P2 |
| `src/components/features/dashboard/shared/ProfileCompletionCard.tsx:29`,`31`,`39` | `Profil Belum Lengkap` / `Lengkapi profil Anda...` / `Lengkapi Profil` | — (OK) | — | — |
| `src/components/features/dashboard/shared/DashboardButton.tsx:74` | default aria `Tombol aksi` | — (OK) | — | — |
| `src/components/ui/creator-states.tsx:9` | `Koneksi Gagal` / `Coba Lagi` | — (OK) | — | — |
| `src/lib/creator-status.ts:41`,`52` | `Perlu Ditinjau` / `Revisi` (fraud & order labels reused across screens) | Inconsistent with sibling screen | align with `NegosiasiRoomView.tsx:101` `Revisi Diminta` | P2 |

### `/dashboard/kreator/panduan`

| File:Line | Current text | Issue type | Suggested Indonesian | Severity |
| --- | --- | --- | --- | --- |
| `src/app/dashboard/kreator/panduan/page.tsx:29`-`36` | `POPULAR_KEYWORDS`: `withdrawal`, `escrow`, `collab`, `auto-approve`, `dispute`, `kyc` | EN term | `penarikan`, `rekening bersama`, `kolaborasi`, `setujui-otomatis`, `sengketa`, `verifikasi identitas` | P1 |
| `src/app/dashboard/kreator/panduan/page.tsx:51` | `Submit URL Video Maksimum 24 Jam Setelah Posting` | EN term | `Kirim Tautan Video Maksimum 24 Jam Setelah Posting` | P1 |
| `src/app/dashboard/kreator/panduan/page.tsx:52` | `...kirimkan URL tayang sosial media...` | EN term | `...kirimkan tautan tayang media sosial...` | P1 |
| `src/app/dashboard/kreator/panduan/page.tsx:61` | `...seluruh hashtag wajib...Tanpa hashtag wajib, video tidak akan terdeteksi...` | EN term | `...seluruh tagar wajib...Tanpa tagar wajib...` | P1 |
| `src/app/dashboard/kreator/panduan/page.tsx:69`,`70` | `Campaign Mode Is Zero Chat (Tanpa Revisi)` / `Di Campaign Mode, tidak ada fitur chat, revisi, atau approval.` | EN term | `Mode Kampanye Tanpa Obrolan (Tanpa Revisi)` / `Di Mode Kampanye, tidak ada fitur obrolan, revisi, atau persetujuan.` | P0 |
| `src/app/dashboard/kreator/panduan/page.tsx:78`,`79` | `Rate Card Mode Wajib Collab Post` / `...fitur Collab Post...direct traffic.` | EN term | `Mode Daftar Tarif Wajib Postingan Kolaborasi` / `...fitur Postingan Kolaborasi...trafik langsung.` | P1 |
| `src/app/dashboard/kreator/panduan/page.tsx:88` | `...bot, view farm, beli views, atau ads boosting tidak sah. Video dengan views palsu...` | EN term | `...bot, ladang tayangan, beli tayangan, atau penggalakan iklan tidak sah. Video dengan tayangan palsu...` | P1 |
| `src/app/dashboard/kreator/panduan/page.tsx:96`,`97` | `Perlindungan Dana via Sistem Escrow` / `...ditahan aman di Escrow Marketiv...` | EN term | `Perlindungan Dana via Rekening Bersama` / `...ditahan aman di Rekening Bersama Marketiv...` | P1 |
| `src/app/dashboard/kreator/panduan/page.tsx:108` | `...Di Campaign Mode, Kreator menerima reward 100% penuh...` | EN term | `...Di Mode Kampanye, Kreator menerima imbalan 100% penuh...` | P1 |
| `src/app/dashboard/kreator/panduan/page.tsx:111`,`112` | `Berapa minimum penarikan dana (Withdrawal)?` / `...verifikasi KYC manual...` | Mixed ID/EN | `Berapa minimum penarikan dana?` / `...verifikasi identitas manual...` | P1 |
| `src/app/dashboard/kreator/panduan/page.tsx:116` | `...sistem (Auto-Approve) dalam 3 hari kalender...` | EN term | `...sistem (Persetujuan Otomatis) dalam 3 hari kalender...` | P1 |
| `src/app/dashboard/kreator/panduan/page.tsx:120` | `...sistem Dispute (Sengketa)...` | EN term | `...sistem Sengketa...` | P1 |
| `src/app/dashboard/kreator/panduan/page.tsx:124` | `...tipe campaign UGC dan Clipping?...raw video/aset mentah, dan kamu bertugas mengedit/remix...` | EN term | `...tipe kampanye UGC dan Kliping?...video mentah/aset mentah, dan kamu bertugas mengedit/menggubah...` | P1 |
| `src/app/dashboard/kreator/panduan/page.tsx:128` | `...akun ditangguhkan (suspended) secara permanen.` | EN term | `...akun ditangguhkan secara permanen.` | P2 |
| `src/app/dashboard/kreator/panduan/page.tsx:240` | placeholder `Cari kata kunci (misal: 'withdrawal', 'escrow', '5%')...` | EN term | `...misal: 'penarikan', 'rekening bersama', '5%'...` | P1 |
| `src/app/dashboard/kreator/panduan/page.tsx:301` | inline suggestion buttons `withdrawal`, `5%`, `escrow` | EN term | `penarikan`, `5%`, `rekening bersama` | P1 |
| `src/app/dashboard/kreator/panduan/page.tsx:502`,`546`,`549` | `Penghasilan & Escrow (Biaya Platform 5%, Withdrawal)` / `...saat escrow dirilis ke Wallet...` | EN term | `Penghasilan & Rekening Bersama (Biaya Platform 5%, Penarikan)` / `...saat dana rekening bersama dirilis ke Dompet...` | P1 |
| `src/app/dashboard/kreator/panduan/page.tsx:647`,`655` | `...via Email...` / `Hubungi Support Kreator` | EN term | `...via Surel...` / `Hubungi Dukungan Kreator` | P1 |

### error / loading / metadata surfaces

| File:Line | Current text | Issue type | Suggested Indonesian | Severity |
| --- | --- | --- | --- | --- |
| `src/app/dashboard/kreator/error.tsx:20`-`23` | `Terjadi Kesalahan` / `Gagal memuat data dashboard kreator...` / `Coba Lagi` | — (OK) | — | — |
| `src/app/dashboard/kreator/rate-card/page.tsx:4`, `keuangan/page.tsx:4` | metadata `Rate Card — Dashboard Kreator \| Marketiv` / `Keuangan — Dashboard Kreator \| Marketiv` | Jargon | `Daftar Tarif — Dashboard Kreator \| Marketiv` | P2 |
| `src/app/dashboard/kreator/notifikasi/page.tsx:4`, `settings/page.tsx:4` | `Notifikasi — Dashboard Kreator \| Marketiv` / `Pengaturan — Dashboard Kreator \| Marketiv` | — (OK) | — | — |
| all `loading.tsx` | render `CreatorPageSkeleton` only — no copy | — | — | — |
| `CreatorOverviewPageClient.tsx:54`,`97`, `JobPoolPageClient.tsx:26`,`53`, `PekerjaanAktifPageClient.tsx:20`,`46`, `KeuanganPageClient.tsx:30`,`59`, `RateCardPageClient.tsx:33`,`40`, `SettingsPageClient.tsx:38`,`67` | error fallbacks `Gagal memuat dashboard.` / `Gagal memuat Job Pool.` / `Gagal memuat pekerjaan aktif.` / `Gagal memuat data keuangan.` / `Gagal memuat rate card.` / `Gagal memuat profil.` | Inconsistent with sibling screen | unify verb: `Gagal memuat ...` (already consistent) — but `Job Pool` and `rate card` should follow the canonical term | P2 |

## Canonical term mapping

Occurrence counts below are counts of *user-facing* render sites observed during this audit (approximate; raw `grep -oi` across the two creator directories returns larger numbers because it also matches code identifiers such as `campaignId`, `deliverableUrl`, `deadlineStr`).

| English term | Occurrences | Recommended Indonesian | Notes |
| --- | --- | --- | --- |
| `campaign` / `Campaign` | ~45 user-facing (grep 159 incl. identifiers) | `kampanye` / `Kampanye` | Already dominant in UI: `CreatorDashboardView.tsx:621` uses `Rekomendasi Kampanye`, `:630` `Semua Kampanye`, but many other sites still use the English. Standardise on lowercase `kampanye`. |
| `brief` / `Brief` | ~18 user-facing (grep 98) | `panduan` / `Panduan` | The domain already has a good Indonesian candidate (`JobDetailView.tsx:565` badge `Panduan`, `:418` `penjelasan brand, narasi, aturan`). Trade-off: `panduan` is generic and may collide with the `/panduan` help page; alternative `ringkasan kampanye` is clearer but longer. |
| `deliverable(s)` | ~12 user-facing (grep 130) | `hasil kerja` | `NegosiasiRoomView` mixes `Deliverable`, `Deliverables`, and `Kirim Deliverable` in one screen. `hasil kerja` is plain and unambiguous. Alternative `luaran` is technically precise but reads stiff for creators. |
| `escrow` / `Escrow` | ~28 user-facing (grep 52) | `rekening bersama` | `Escrow` is used everywhere including `panduan`. Both `rekening bersama` (common in Indonesian marketplace UX) and keeping `escrow` with a one-time glossary are defensible — see open questions. Note `getEscrowStatusLabel` already returns `Dana Ditahan/Dicairkan`, which conflicts with the `Escrow Aktif` stage label. |
| `payout` | 1 user-facing (grep 19) | `pencairan` | Only `PekerjaanAktifView.tsx:69` badge `Tingkatkan Payout`; `keuangan` already uses `Pencairan Tertunda`, `Ajukan Penarikan`. Reuse `pencairan`. |
| `wallet` / `Wallet` | ~10 user-facing (grep 52) | `dompet` | `KeuanganView` uses `Dompet` in the hero (`Keuangan & Dompet`) then `Wallet` in tables/modals. Pick `dompet`. |
| `deadline` / `Deadline` | ~12 user-facing (grep 64) | `tenggat` (or `batas waktu`) | Both are defensible: `batas waktu` is warmer and already used (`PekerjaanAktifView.tsx:485` filter `Batas Waktu`), `tenggat` is shorter for chips. Recommend `batas waktu` for consistency with the existing filter, `tenggat` acceptable in tight sort labels. |
| `job` / `Job` | ~35 user-facing (grep 212) | `lowongan` | `lowongan` for a job to claim; `pekerjaan` for one already claimed (`Pekerjaan Aktif`). The UI currently uses `Job` for both, which blurs `Job Pool` vs `Pekerjaan Aktif`. |
| `Job Pool` | ~12 (grep incl. identifiers) | `pool lowongan` | Keep `pool` (already in `Pool` chip and `Job Pool Kampanye`). Alternative `pasar lowongan` is more descriptive. Product-level decision — see open questions. |
| `Rate Card` | ~25 user-facing (grep 33) | `daftar tarif` | Strongest brand-ish term; `daftar tarif` is a direct, understood translation but loses product identity. See open questions. |
| `order` / `Order` | ~10 user-facing | `pesanan` | `NegosiasiView.tsx:408` `Kelola order Rate Card`, `:440` `Order Selesai`, `RateCardView.tsx:646` `Order Jasa Masuk`. `pesanan` already used at `CreatorDashboardView.tsx:604` `Pesanan Rate Card`. |
| `inbox` | 3 user-facing (grep 5) | `kotak masuk` | `NegosiasiView.tsx:475` tab + two toast strings. |
| `views` | ~30 user-facing (grep 88) | `tayangan` | `views` is used in every KPI, tooltip, and formula. `tayangan` is the established Indonesian; the unit suffix `/ 1K views` should become `/ 1.000 tayangan`. |
| `slot` | ~8 user-facing | `kuota` | The same concept is `kuota` in `Kuota Kreator`, `Kuota Tersedia`, `Kuota Penuh`. `slot` is redundant. |
| `submission` / `submit` | ~6 user-facing | `kirim` / `pengiriman` | `Submit Bukti` (`CreatorDashboardView.tsx:705`), `Submit Video` (`JobDetailView.tsx:323`). |
| `claim` (as verb `Klaim` is ID) | 0 EN; `Klaim` ID ~20 (grep 53) | keep `Klaim` | `Klaim` is an accepted Indonesian loanword; no change needed except `Klaim Job` → `Ambil Lowongan`. |
| `draft` / `Draft` | ~5 user-facing | `draf` | `RateCardView.tsx:280`, `:815`, `getRateCardStatusLabel` (`creator-status.ts:71`). |
| `review` | ~8 user-facing | `peninjauan` / `tinjauan` | `Menunggu Review`, `Perlu Review / Fraud`. `peninjauan` reads better; `tinjauan` acceptable. |
| `fraud` | ~5 user-facing | `kecurangan` | Status chip and filter label, plus `creator-status.ts:42`. |
| `Collab Post` | 8 (grep 8) | `postingan kolaborasi` | A platform feature name (IG/TikTok); could reasonably stay as a proper noun if quoted, but the surrounding sentence is Indonesian. |
| `Custom Offer` | ~4 user-facing (grep 8) | `penawaran khusus` | `NegosiasiRoomView.tsx:567`; the message prefix already uses `Penawaran Khusus: `. |
| `PPV` | 3 user-facing (grep 4) | `bayar per tayangan` | Marketing-relevant; `PPV` reads as an internal acronym. See open questions. |
| `CPM` | 4 user-facing (grep 4) | `tarif per 1.000 tayangan` | Used in `JobDetailView.tsx:442`,`446` and `ActiveWorkDetailView.tsx:373`. |
| `KYC` | 1 user-facing | `verifikasi identitas` | `panduan/page.tsx:112`. |
| `dispute` / `Dispute` | 2 user-facing | `sengketa` | `panduan/page.tsx:34`,`120`; the Indonesian is already given in parentheses. |
| `auto-approve` / `Auto-Approve` | 2 user-facing | `persetujuan otomatis` | `panduan/page.tsx:33`,`116`. |
| `withdrawal` / `Withdrawal` | 6 user-facing | `penarikan` | `panduan` keywords/FAQ; the keuangan screen already uses `Penarikan`. |
| `niche` | ~6 user-facing | `kategori` | `CreatorDashboardView.tsx:623`, `JobPoolView.tsx:406`, `SettingsView.tsx:796` (`Kategori Niche Utama` — mixed). |
| `followers` | 4 user-facing | `pengikut` | `SettingsView.tsx:866`,`938`,`940`. |
| `footage` | 2 user-facing | `rekaman` | `JobDetailView.tsx:418`,`634`. |
| `endorsement` | 2 user-facing | `dukungan` (or keep as marketing term) | `PekerjaanAktifView.tsx:86`, `RateCardView.tsx:158`. |
| `marketplace` | 1 user-facing | `toko` | `RateCardView.tsx:573`. |
| `Timeline` | 1 user-facing | `riwayat` | `ActiveWorkDetailView.tsx:712`. |
| `Read-Only` | 1 user-facing | `hanya baca` | `ActiveWorkDetailView.tsx:557`. |
| `Standard` / `Bundle` / `Bundling` / `Exposure` | 4 user-facing | `standar` / `gabungan` / `jangkauan` | `RateCardView.tsx:157`,`165`,`166`,`698`. |
| `brand` / `Brand` | ~10 user-facing | `merek` | Appears in `JobPoolView.tsx:447`, `NegosiasiView.tsx:165`, `SettingsView.tsx:1097`, etc. |
| `support` / `Support` | 2 user-facing | `dukungan` / `bantuan` | `ActiveWorkDetailView.tsx:856`, `panduan/page.tsx:647`. |
| `newsletter` | 1 user-facing | `buletin` | `SettingsView.tsx:1104`. |
| `insight` | 1 user-facing | `wawasan` | `SettingsView.tsx:1105`. |
| `Password` | 5 user-facing | `kata sandi` | `SettingsView` security tab. |
| `Username` | 3 user-facing | `nama pengguna` | `SettingsView.tsx:1127`,`1133`, `:853`. |
| `Thumbnail` | 5 user-facing | `gambar mini` | `SettingsView` portfolio modals. |
| `Inbox` | 3 user-facing | `kotak masuk` | `NegosiasiView.tsx:475`, `:283`, `LogoutConfirmDialog`. |
| `Slot` | ~8 | `kuota` | see above. |
| `ppv/CPM` | 7 combined | see rows above | Keep or translate — product decision. |

## Open questions

- **`Rate Card`** — appears ~25 times as a sidebar label, page title, metric label, and status type. Keeping it preserves a product/brand noun; translating to `Daftar Tarif` makes the whole dashboard monolingual. Needs a product decision because it is also a route name (`/rate-card`) and a backend `rate_card` notification type.
- **`Job Pool`** — same trade-off as `Rate Card`. Evidence: sidebar `Job Pool`, topbar breadcrumb `Job Pool`, page title `Job Pool Kampanye`, empty-state CTAs `Jelajahi Job Pool`. Alternative `Pasar Lowongan` (or `Pool Lowongan`) is fully Indonesian.
- **`Escrow`** — used in ~28 render sites across keuangan, job detail, panduan, and negosiasi, but the canonical status map (`src/lib/creator-status.ts:60`) already returns `Dana Ditahan/Dicairkan/Dikembalikan`. Decide whether the noun becomes `rekening bersama`, `dana ditahan`, or stays `escrow` with a glossary tooltip.
- **`PPV` and `CPM`** — internal/media-buying acronyms shown on job cards (`PPV` chip) and job detail (`CPM Awal`, `CPM (Rate /1K Views)`, `CPM MODE`). They carry real meaning for the pay-per-view model; translating to `bayar per tayangan` / `tarif per 1.000 tayangan` is accurate but longer. Needs a decision on whether creators are expected to know them.
- **`Brief` vs `Panduan`** — `panduan` is already used elsewhere in the same screens but is also the name of the help route (`/panduan`). Confirm whether `brief` should become `panduan kampanye` to avoid the clash.
- **`Deadline` vs `Tenggat` vs `Batas Waktu`** — three candidates are already in the codebase (`Batas Waktu` filter, `Deadline Terdekat` sort, `deadline` offer field). Confirm the single canonical word.
- **`Kreator Akun` string** (`CreatorDashboardSidebar.tsx:378`) — the unverified branch produces the grammatically odd `Kreator Akun`. Confirm the intended fallback (`Kreator`, `Kreator Baru`, or `Akun Kreator`).
- **Status label casing** — status/badge chips are a mix of Title Case (`Menunggu Review`, `Perlu Ditinjau`) and ALL CAPS (`JOB TERSEDIA`, `SALDO TERSEDIA`, `VIEWS PENONTON`) and lowercase enum values rendered directly (`SettingsView.tsx:828` renders `kecantikan`, `kuliner`, etc., relying on a CSS `capitalize` class). Decide whether all badges are Title Case or all-caps.
- **Two fully English CTAs** — `Join Campaign` (`JobDetailView.tsx:319`) and `Join campaign dulu untuk mulai submit video.` (`JobDetailView.tsx:687`) are the only strings a creator cannot infer from context. They should be fixed regardless of the term decisions above.
