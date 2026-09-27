# 🐛 BUGFIX SPEC — Demo Readiness P0 (Pameran 29 September 2026)

> **Konteks**: prod & staging akan di-showcase dan dicoba langsung user pada pameran Selasa
> 29 September 2026. Prioritas tunggal: **fungsionalitas dan UI yang memengaruhi pengalaman user.**
>
> **Sumber temuan**: `docs/audits/demo-readiness-selasa-2026-09-29.md` (bagian P0), semua sudah
> diverifikasi baris per baris (`45/45 CONFIRMED`).
>
> **Catatan bahasa**: dokumen ini memakai Bahasa Indonesia mengikuti konvensi `.kiro/specs/` di repo
> ini. Struktur SDD tetap dipatuhi: kriteria RFC 2119 (`SHALL`, `WHEN`, `THEN`, `IF`), defect
> inventory, functional contract, non-regression invariants, dan traceability `_Requirements: X_`.
> Minta versi Inggris kapan saja kalau diperlukan untuk review eksternal.
>
> **Batas lingkup**: hanya frontend. Tidak ada perubahan skema, Function, kontrak DTO backend,
> atau kode `00_BACKEND/**`.

---

## 1. Defect Inventory

Setiap item menyebut lokasi bukti dan perilaku salah yang bisa diamati user.

### Klaster A — Kontrol mati & navigasi salah

**1.1** WHEN user membuka detail campaign UMKM dan menekan tombol **"Lihat Riwayat Transaksi"**
THEN tidak ada navigasi apa pun; hanya muncul toast `"Membuka rekam transaksi escrow..."`.
Bukti: `src/components/features/umkm-dashboard/campaign/detail/CampaignDetailPage.tsx:188`,
label tombol di `campaign/detail/CampaignQuickActionsCard.tsx:64-72`.

**1.2** WHEN user menekan tautan **"Detail"** pada kartu rekomendasi job di dashboard kreator
THEN user diarahkan ke daftar job (`/dashboard/kreator/job-pool`), bukan detail job yang dimaksud.
Bukti: `src/components/features/creator-dashboard/CreatorDashboardView.tsx:293-298`.

**1.3** WHEN user menekan tombol **share** (ikon `Share2`) di header detail job kreator
THEN tidak terjadi apa pun; tombol juga tanpa `onClick` dan tanpa `aria-label`.
Bukti: `src/components/features/creator-dashboard/JobDetailView.tsx:299-301`.

**1.4** WHEN user menekan tombol **"Urutkan dari"** di tab "Video Kamu"
THEN tidak terjadi apa pun (tanpa `onClick`), sementara di bawahnya hanya ada empty state
"Join campaign dulu untuk mulai submit video."
Bukti: `src/components/features/creator-dashboard/JobDetailView.tsx:649-656`.

**1.5** WHEN user membuka panel Notifikasi di Pengaturan kreator dan melihat tombol
**"Simpan Preferensi"** THEN tombol selalu `disabled` dengan handler kosong.
Bukti: `src/components/features/creator-dashboard/SettingsView.tsx:1113-1117`
(semua `NotifToggleRow` di atasnya juga sudah `disabled`, dan halaman sudah menulis
"Fitur notifikasi akan segera hadir." pada baris 1058-1060).

### Klaster B — Klaim & teks yang menyesatkan

**1.6** WHEN user membuka profil kreator mana pun di direktori UMKM
THEN badge **"Kreator Terverifikasi"** selalu tampil, walau `creator.isVerified === false`.
Bukti: `src/components/features/umkm-dashboard/creators/detail/CreatorProfileHero.tsx:32-36`;
field `isVerified` tersedia dari adapter (`creator.adapter.ts:67`) tapi tidak pernah dipakai hero.

**1.7** WHEN user kreator melihat kartu bukti tayang yang **belum divalidasi**
THEN satu kartu menulis **"URL Postingan Terverifikasi"** sementara sel di sebelahnya menulis
**"Belum diverifikasi"** untuk data yang sama.
Bukti: `src/components/features/creator-dashboard/ActiveWorkDetailView.tsx:880` vs `:895`.

**1.8** WHEN calon user membuka layar pemilihan peran (register)
THEN terbaca klaim skala yang tidak bisa dibuktikan: "Akses direktori **ratusan** kreator
terverifikasi" dan "Ambil campaign dari **ribuan** UMKM aktif".
Bukti: `src/components/features/auth/RoleChooser.tsx:14,33`.

**1.9** WHEN user UMKM melihat empty state daftar campaign
THEN terbaca klaim "**Ratusan** kreator aktif terverifikasi".
Bukti: `src/components/features/umkm-dashboard/campaign/CampaignsPage.tsx:69-71`.
_(Ditemukan saat penyusunan spec ini; kelasnya sama dengan 1.8 dan perbaikannya satu baris.)_

### Klaster C — Ketahanan interaksi (keyboard & klik ganda)

**1.10** WHEN user mencoba menyetujui 4 poin ketentuan di modal klaim campaign dengan keyboard
THEN user tidak bisa: tiap baris adalah `div onClick` tanpa `role`, `tabIndex`, atau handler
keyboard, padahal keempatnya wajib dicentang agar tombol klaim aktif.
Bukti: `src/components/features/creator-dashboard/modals/ClaimCampaignModal.tsx:143-152`
dan tombol terkunci di `:198`.

**1.11** WHEN user menekan **"Klaim Job"** pada kartu rekomendasi
THEN tombol tidak mendisable diri dan tidak memberi indikator proses, walau state
`claimingJobId` sudah ada; klik berulang bisa memicu dua permintaan klaim.
Bukti: `src/components/features/creator-dashboard/CreatorDashboardView.tsx:299-308`
(state di `:348`).

### Klaster D — Konsistensi data mock (mode demo)

**1.12** WHEN user kreator membuka ruang negosiasi dalam mode mock
THEN riwayat pesan **selalu kosong**, padahal sisi UMKM memuat riwayat lengkap.
Bukti: `src/services/creator/creator-dashboard.service.ts:201-209` (`data: []`)
vs `src/services/umkm/umkm-dashboard.service.ts:272-280` (memuat `mockChatMessages`).

**1.13** WHEN user UMKM menekan "Masuk ke Chat Negosiasi" untuk kreator yang **tidak punya**
ruang negosiasi di data mock THEN user diarahkan ke id `conv_000`, yaitu ruang milik kreator lain
(`conv_000` = creator_006 Fitri Handayani di `src/mocks/umkm/negotiations.mock.ts:11-21`).
Bukti: `src/services/umkm/umkm-dashboard.service.ts:286-287`.

**1.14** WHEN user UMKM membuka Overview dalam mode mock
THEN KPI "Total Kreator" menunjukkan **8**, padahal daftar campaign di halaman yang sama hanya
menghitung **7** slot terpakai (1+0+2+4) dari `src/lib/demo/demo-store.ts:34-107`;
`campaignActive: 1` juga bertentangan dengan 3 campaign `active` di store, dan
`campaignCompleted: 3` bertentangan dengan 1 campaign `completed`.
Bukti: `src/mocks/umkm/overview.mock.ts:23-31` vs `src/lib/demo/demo-store.ts`.

**1.15** WHEN user UMKM membuka daftar campaign
THEN kartu **"Total Kampanye"** mencampur jumlah campaign dengan jumlah pembayaran tertunda
(`activeCampaigns + completedCampaigns + pendingPayments`), dan menulis catatan "Semua status"
padahal draft/paused tidak ikut dihitung.
Bukti: `src/components/features/umkm-dashboard/campaign/CampaignSummaryCards.tsx:59-65`.

**1.16** WHEN direktori kreator belum punya data harga
THEN kartu **"Tarif Mulai Dari"** menampilkan **"Rp 0"** seolah tarifnya nol.
Bukti: `src/components/features/umkm-dashboard/creators/CreatorSummaryCards.tsx:81-92`;
tes lama `creators/__tests__/CreatorSummaryCards.test.tsx:82` justru mengunci perilaku salah ini.

---

## 2. Expected Functional Contract

**2.1** WHEN user menekan "Lihat Riwayat Transaksi" pada detail campaign THEN aplikasi SHALL
menavigasi ke halaman keuangan UMKM (`routes.umkmFinance`). _(1.1)_

**2.2** WHEN user menekan "Detail" pada kartu rekomendasi job THEN aplikasi SHALL menavigasi ke
`routes.kreatorJobDetail(job.id)`. _(1.2)_

**2.3** WHEN user menekan tombol share pada detail job THEN aplikasi SHALL, jika
`navigator.share` tersedia, membuka dialog berbagi sistem; JIKA tidak tersedia THEN aplikasi SHALL
menyalin tautan detail job ke clipboard dan menampilkan toast konfirmasi; tombol SHALL memiliki
`aria-label`. _(1.3)_

**2.4** Tombol "Urutkan dari" SHALL dihapus dari tab "Video Kamu" karena tidak ada daftar yang
bisa diurutkan. _(1.4)_

**2.5** Tombol "Simpan Preferensi" SHALL dihapus dari panel Notifikasi; panel tetap menampilkan
keterangan "Fitur notifikasi akan segera hadir." dan seluruh toggle SHALL tetap `disabled`. _(1.5)_

**2.6** Badge "Kreator Terverifikasi" SHALL dirender hanya JIKA `creator.isVerified === true`. _(1.6)_

**2.7** Judul kartu bukti tayang SHALL membaca "URL Bukti Tayang" pada semua status; sel Views/Reward
tetap memakai "Belum diverifikasi"/"Belum dihitung" seperti sekarang. _(1.7)_

**2.8** Copy pada RoleChooser SHALL tidak memuat angka skala yang tidak bisa diverifikasi;
menjadi "Akses direktori kreator terverifikasi" dan "Ambil campaign dari UMKM yang sedang aktif". _(1.8)_

**2.9** Copy fitur pada empty state daftar campaign SHALL menjadi "Kreator aktif terverifikasi". _(1.9)_

**2.10** Setiap baris ketentuan klaim SHALL berupa kontrol yang bisa difokus keyboard dan
diaktifkan dengan `Space`/`Enter`, dengan status tercentang yang terekspos ke assistive technology
(`checkbox` semantik), sehingga seluruh alur klaim SHALL selesai tanpa mouse. _(1.10)_

**2.11** WHEN klaim job sedang diproses THEN tombol "Klaim Job" SHALL `disabled` dan SHALL
menampilkan indikator proses ("Mengklaim…") sampai permintaan selesai. _(1.11)_

**2.12** Dalam mode mock, WHEN user kreator membuka ruang negosiasi miliknya THEN riwayat pesan
SHALL berasal dari sumber mock kreator yang konsisten dengan `mockCreatorNegotiations`
(nama brand dan lawan bicara sesuai entri ruang tersebut). _(1.12)_

**2.13** Dalam mode mock, WHEN tidak ada ruang negosiasi untuk `creatorId` yang diminta THEN
`createConversation` SHALL mengembalikan kegagalan (`success: false`, `code: "not_found"`) dengan
pesan yang menjelaskan bahwa percakapan demo untuk kreator itu belum tersedia, dan SHALL NOT
mengembalikan identitas ruang milik kreator lain. Pemanggil (`StartNegotiationModal`) sudah
menangani kegagalan dengan toast, jadi tidak ada navigasi yang terjadi. _(1.13)_

**2.14** KPI Overview mode mock yang bisa diturunkan dari daftar campaign SHALL dihitung dari
daftar tersebut (`campaignActive`, `campaignCompleted`, `creatorJoined`), bukan dari konstanta
statis, sehingga KPI dan daftar campaign pada satu layar SHALL selalu konsisten. _(1.14)_

**2.15** Kartu "Total Kampanye" SHALL menjumlahkan hanya status campaign yang tersedia di DTO
(`activeCampaigns + completedCampaigns`) dan catatannya SHALL menyebut cakupan sebenarnya
("Aktif & selesai"); `pendingPayments` SHALL NOT ikut dijumlahkan. _(1.15)_

**2.16** Kartu "Tarif Mulai Dari" SHALL menampilkan `—` tanpa unit ketika belum ada harga. _(1.16)_

---

## 3. Preservation & Non-Regression Invariants

**3.1** Seluruh alur yang sudah berfungsi SHALL CONTINUE TO berjalan: klaim campaign dari modal
(mouse), submit bukti tayang, preflight TOS pada offer, penarikan saldo kreator, dan seluruh alur
dashboard UMKM yang tidak disebut di bagian 1.

**3.2** Kontrak servis SHALL CONTINUE TO tidak berubah untuk cabang non-mock:
`createConversation`, `getMessagesByConversationId`, `getOverview`, dan `getDashboardSummary`
tetap memanggil implementasi Appwrite dengan signature yang sama.

**3.3** Tipe kanon SHALL CONTINUE TO tidak berubah untuk konsumen backend:
tidak ada perubahan `src/types/domain.ts` maupun DTO backend. Penambahan tipe hanya boleh bersifat
opsional/aditif di lapisan frontend.

**3.4** Rute yang sudah ada SHALL CONTINUE TO valid: `routes.umkmFinance`,
`routes.kreatorJobDetail`, `routes.kreatorJobPool` (dijaga oleh
`src/lib/constants/__tests__/routes.test.ts`).

**3.5** Penampilan visual SHALL CONTINUE TO sama untuk semua komponen yang disentuh: tidak ada
perubahan warna, ukuran, radius, atau layout; perbaikan hanya pada perilaku, semantik, dan teks.

**3.6** `npx tsc --noEmit` SHALL lolos tanpa error baru dan `npx eslint`
SHALL NOT memunculkan warning baru di berkas yang disentuh.

**3.7** Tes yang ada SHALL CONTINUE TO lolos, kecuali dua tes yang sengaja diperbarui karena
mengunci perilaku salah: `creators/__tests__/CreatorSummaryCards.test.tsx:82` (ekspektasi `"Rp 0"`)
dan tes apa pun yang mengasumsikan tombol "Urutkan dari"/"Simpan Preferensi" ada.

**3.8** Tidak ada berkas di luar daftar pada `design.md` §5 yang boleh berubah.

---

## 4. Out of Scope (ditegaskan)

- Seluruh temuan P1 (analitik, timeline aktivitas, toggle notifikasi persisten, checklist deal,
  summary negosiasi, statistik direktori, a11y `htmlFor`/`tabIndex`, em dash prosa) — dikerjakan
  setelah P0, tercatat terpisah di dokumen demo readiness.
- Seluruh temuan P2 backend (eskalasi `prefs.role`, idempotensi kredit wallet, kuota storage,
  rate limit OTP, filter kepemilikan `getSubmissionCounts`) — butuh spec bugfix backend sendiri.
- Penambahan field `totalCampaigns` ke DTO summary (butuh backend) — dicatat sebagai follow-up,
  bukan bagian P0.
- Penyimpanan preferensi notifikasi ke server (fitur baru, bukan bugfix).
- Implementasi pengurutan daftar video di tab "Video Kamu" (fiturnya belum ada).

---

## 5. Keputusan yang sudah diambil (disetujui: ikut rekomendasi)

| # | Keputusan | Dipilih | Alasan yang berpihak ke pengguna |
|---|---|---|---|
| D-1 | Tombol "Urutkan dari" (1.4) | **Hapus** | Tidak ada daftar untuk diurutkan; kontrol mati membuat user mengira aplikasinya rusak. Mengimplementasikan pengurutan berarti menambah fitur, bukan memperbaiki defek |
| D-2 | Panel Notifikasi (1.5) | **Hapus tombol simpan**, toggle tetap `disabled` + keterangan "Fitur notifikasi akan segera hadir." | Tombol yang tidak bisa menyimpan apa pun adalah janji palsu. Keterangan jujur lebih baik daripada kontrol yang diam |
| D-3 | Kreator tanpa ruang di mock (1.13) | **Gagal-tertutup** dengan pesan jelas | Mengirim user ke percakapan milik kreator lain (perilaku lama) jauh lebih buruk daripada pesan "percakapan demo belum tersedia" |
| D-4 | Tombol share (1.3) | **`navigator.share` + fallback salin tautan + toast**, dengan `aria-label` | Memberi perilaku nyata di semua perangkat, tanpa bergantung fitur yang tidak ada di desktop |
| D-5 | Mode data demo | **Mock** (dikonfirmasi lewat bilah demo di `/dashboard/umkm`) | Data live masih kosong (portofolio 0, follower 0, order 0), jadi mock adalah satu-satunya cara demo terlihat utuh; konsekuensinya klaster D wajib beres |
