# Panduan QA Manual: Konsistensi Bahasa Dashboard Marketiv

**Dokumen ini satu-satunya panduan QA manual untuk pekerjaan revamp bahasa.**
Cakupan: Dashboard Konten Kreator (`/dashboard/kreator`) dan Dashboard UMKM (`/dashboard/umkm`).
Tanggal: 27 September 2026. Referensi spec: `.kiro/specs/dashboard-language-consistency-id/`.

---

## 1. Tujuan dan batas

QA ini memverifikasi **teks yang dilihat pengguna**, bukan logika. Yang dinilai:

1. Tidak ada kata Inggris yang seharusnya bahasa Indonesia.
2. Satu konsep memakai satu kata yang sama di semua layar, dan sama di kedua dashboard.
3. Tidak ada status backend mentah yang bocor ke layar pengguna.
4. Format angka, rupiah, dan tanggal konsisten lokal Indonesia.
5. Setiap layar punya teks untuk kondisi loading, kosong, dan gagal.

Yang **tidak** dinilai di QA ini: perilaku tombol, data yang tampil benar atau salah, performa, tampilan visual/mobile, dan route.

---

## 2. Persiapan

| Item | Nilai |
|---|---|
| Jalankan dev server | `npm run dev` di `marketiv-web` |
| URL utama | `http://localhost:3000` |
| Akun 1 | UMKM, punya minimal 1 kampanye dan 1 negosiasi |
| Akun 2 | Kreator, punya minimal 1 pekerjaan aktif dan 1 rate card |
| Perangkat | Desktop dulu. Ulangi ringkas di lebar 390px untuk cek teks terpotong |
| Alat bantu | DevTools > Elements, untuk cek `aria-label`, `title`, dan teks yang ter-`truncate` |

**Penting:** kalau salah satu variabel berikut belum diputuskan, **jangan tandai temuan sebagai bug**. Catat sebagai `PENDING` di kolom Catatan.

| Kode | Keputusan yang harus sudah ada | Default yang diasumsikan |
|---|---|---|
| D1 | Label `Rate Card` | `Paket Harga` |
| D2 | Label `Job Pool` | `Lowongan` |
| D3 | Label `Escrow` | `Dana Aman` |
| D4 | Label `Brief` | `Arahan` |
| D5 | Label `Collab Post` | `Postingan Kolaborasi` |
| D6 | Label `PPV` / `CPM` | `Bayar per Tayangan` / `Tarif per 1.000 Tayangan` |
| D7 | Label `Dashboard` | `Dashboard` (dipertahankan) |
| D8 | Kata untuk status draft | `Draf` |
| D9 | Label nav review | `Tinjauan Pekerjaan` |

---

## 3. Tingkat keparahan temuan

| Kode | Arti | Contoh |
|---|---|---|
| **P0** | Pengguna tidak bisa paham | `Join Campaign`, `Join campaign dulu untuk mulai submit video.` |
| **P1** | Kata tidak konsisten atau tidak diterjemahkan | `Wallet` di satu tabel, `Dompet` di hero layar yang sama |
| **P2** | Polish | Casing badge, spasi, pemisah judul tab |

---

## 4. Cek cepat sebelum buka browser (wajib, 10 menit)

Jalankan dari root `marketiv-web`. Semua perintah harus **tidak menghasilkan output** untuk istilah yang berstatus LOCKED.

```bash
# 1. Tidak ada status backend mentah yang dirender
# Harapan: 0 hasil. Selalu 0 setelah revamp.
grep -rn 'replaceAll("_", " ")' src/components src/app

# 2. Kandidat istilah Inggris terkunci
# Catatan: perintah ini luas. Nilai enum dan key data yang sah ("pending", "draft",
# "brief", "niche") ikut terjaring. Sortir manual: hanya baris yang teksnya
# DIRENDER (JSX text atau nilai prop label/title/description/placeholder) yang
# dihitung bug.
grep -rniE '"(Join|Deliverable|Deadline|Pending|Draft|Wallet|Withdraw|Refund|In Progress|Validation|Submission|Latest|Previous Versions|Insight|Thumbnail|Password|Username|Engagement|Follower|Niche|Brand|Scope|Brief)"' \
  src/components/features/creator-dashboard src/components/features/umkm-dashboard src/app/dashboard

# 3. Tidak ada teks JSX berbahasa Inggris
# Harapan: 0 hasil. Baris yang muncul adalah kandidat teks yang benar-benar tampil.
grep -rnE '>[[:space:]]*(Total Views|Dana Escrow|Ongoing|No Data|Loading|Search|Submit|Cancel|Delete|Save)[[:space:]]*<' \
  src/components/features/creator-dashboard src/components/features/umkm-dashboard src/app/dashboard

# 4. Tidak ada bahasa informal
# Harapan: 0 hasil.
grep -rn "kamu" src/components/features/umkm-dashboard src/components/features/creator-dashboard

# 5. Peta label harus sepakat untuk nilai enum yang sama
# Periksa manual: satu nilai enum hanya punya satu label.
grep -n "escrow:\|rejected:\|pending:\|held:\|refunded:" src/lib/dashboard-labels.ts
```

Kalau muncul temuan, periksa dulu: apakah itu **identifier kode** atau **nilai data** (nama variabel, key, slug route, enum) atau **teks yang dirender**. Hanya teks yang dirender yang dihitung sebagai bug.

---

## 5. Cek global (berlaku di setiap halaman)

Buka setiap route di daftar bagian 6 dan 7, lalu periksa baris berikut. Tandai `✓` atau tulis temuan.

| # | Yang dicek | Cara cek |
|---|---|---|
| G1 | Judul tab browser | Lihat tab. Harus mengikuti konvensi `Halaman \| Dashboard X \| Marketiv`. Pengecualian yang sudah diketahui: `/dashboard/umkm/keuangan`, `/dashboard/umkm/panduan`, `/dashboard/umkm/campaign/buat`, `/dashboard/umkm/campaign/[campaignId]/edit`, dan `/dashboard/kreator/panduan` memakai judul root `Marketiv` karena file route-nya `"use client"`. Jangan tandai kelima route itu sebagai bug |
| G2 | Judul tab sama dengan H1 | Bandingkan teks tab dengan `<h1>` di layar |
| G3 | Label sidebar | Baca semua item sidebar, harus bahasa Indonesia dan sama istilahnya di kedua dashboard untuk konsep yang sama |
| G4 | Breadcrumb topbar | Harus sama katanya dengan label sidebar untuk route yang sama |
| G5 | Tidak ada kalimat Inggris utuh | Baca semua tombol, judul kartu, dan teks bantuan |
| G6 | Tidak ada slug mentah | Cari teks dengan `_` di dalamnya, misal `pending_payment`, `in_progress`, `revision requested` |
| G7 | Casing badge/chip konsisten | Tidak boleh campur `JOB TERSEDIA` (kapital semua) dengan `Menunggu Review` (Title Case) di layar yang sama |
| G8 | Angka lokal Indonesia | Ribuan pakai titik. Tayangan pakai `rb`/`jt`, bukan `K`/`M` |
| G9 | Rupiah konsisten | Semua nominal pakai `Rp` dan titik ribuan |
| G10 | Data kosong tampil `—` | Layar dengan data 0/null tidak boleh menampilkan `0` untuk metrik yang belum pernah diisi |
| G11 | Sapaan formal | Tidak ada `kamu`, `lo`, `gue`. Harus `Anda`. Sebelum perbaikan, `kamu` muncul 26 kali dan hampir semuanya di dashboard kreator |
| G12 | `aria-label` dan tooltip | DevTools > Elements. Ikon tanpa teks harus punya `aria-label` bahasa Indonesia |
| G13 | Istilah asing dijelaskan | Saat pertama kali muncul, istilah seperti dana aman atau paket harga harus ada penjelasan singkat dalam bahasa Indonesia |
| G14 | Janji hasil | Tidak ada klaim "dijamin viral", "pasti cuan", atau angka statistik tanpa sumber |

---

## 6. Checklist Dashboard Konten Kreator

Login sebagai **Kreator**. Buka route berikut berurutan.

### 6.1 `/dashboard/kreator` (ringkasan)

- [ ] Greeting dan eyebrow bahasa Indonesia (`DASBOR KREATOR` atau padanannya, bukan `DASHBOARD KREATOR`)
- [ ] KPI: label satuan tayangan pakai `tayangan`, bukan `views`
- [ ] Kartu rekomendasi memakai `Kampanye`, bukan `Campaign`
- [ ] Tidak ada sapaan `kamu` di teks rekomendasi dan kartu aksi
- [ ] Cek G1 sampai G14

### 6.2 `/dashboard/kreator/job-pool`

- [ ] Judul halaman konsisten dengan D2
- [ ] Filter kategori memakai `Kategori`, bukan `Niche`
- [ ] Chip tipe kerja: `PPV` dan `CPM` sesuai D6 (kalau tetap akronim, harus ada tooltip penjelasan)
- [ ] Empty state: ada kalimat situasi + aksi berikutnya, bahasa Indonesia

### 6.3 `/dashboard/kreator/job-pool/[id]` (detail lowongan)

- [ ] **Cek P0:** tombol klaim. Tidak boleh `Join Campaign`. Harus bahasa Indonesia
- [ ] **Cek P0:** peringatan ketika belum klaim. Tidak boleh `Join campaign dulu untuk mulai submit video.`
- [ ] Label tenggat memakai satu kata saja (`Batas Waktu`), tidak campur `Deadline`
- [ ] Istilah `Arahan`/`Brief` konsisten dengan halaman lain
- [ ] Rincian pembayaran: satuan `per 1.000 tayangan`, bukan `per 1K views`

### 6.4 `/dashboard/kreator/pekerjaan-aktif`

- [ ] Judul `Pekerjaan Aktif`
- [ ] Sort/filter tenggat memakai `Batas Waktu`
- [ ] Badge `Payout` sudah jadi `Pencairan`
- [ ] Setiap kartu: label status pakai bahasa Indonesia, tidak ada `_`

### 6.5 `/dashboard/kreator/pekerjaan-aktif/[id]` (detail pekerjaan)

- [ ] Label `Riwayat`, bukan `Timeline`
- [ ] Label akses `Hanya Baca`, bukan `Read-Only`
- [ ] Semua status dana: satu istilah saja untuk dana yang ditahan (lihat D3). Tidak boleh campur `Dana Ditahan`, `Dana di Escrow`, `Dana Tersimpan Aman` di layar ini
- [ ] Tombol aksi: `Kirim Bukti Tayang`, `Ajukan Revisi`, dan sejenisnya dalam bahasa Indonesia

### 6.6 `/dashboard/kreator/negosiasi` dan `/dashboard/kreator/negosiasi/[id_conversation]`

- [ ] Judul dan tab: `Kotak Masuk`, bukan `Inbox`
- [ ] `Pesanan`, bukan `Order`
- [ ] `Hasil Kerja`, bukan `Deliverable` atau `Deliverables`
- [ ] `Penawaran Khusus`, bukan `Custom Offer`
- [ ] Status tahap negosiasi: satu istilah per tahap, tidak ada dua nama untuk tahap yang sama
- [ ] Lampiran/berkas: label `Rekaman` atau `Berkas`, bukan `Footage`
- [ ] Tidak ada sapaan `kamu` di daftar maupun ruang obrolan (sebelum perbaikan ada 5 kemunculan di dua layar ini)

### 6.7 `/dashboard/kreator/keuangan`

- [ ] Judul halaman dan hero: satu istilah saja untuk wadah saldo (`Saldo` untuk jumlah, `Dompet` untuk wadah). Tidak boleh `Wallet` di tabel lalu `Dompet` di hero
- [ ] Riwayat transaksi: judul tabel bahasa Indonesia, bukan `Riwayat Transaksi Wallet`
- [ ] Tipe transaksi: `Isi Saldo`, `Penarikan Dana`, `Pembayaran`, `Pengembalian Dana`, `Pencairan`, `Komisi Platform`. Tidak boleh `Top-up`, `Refund`, `Platform Fee` mentah
- [ ] Satu kata untuk aksi penarikan saja. Tidak boleh campur `Tarik Dana` dan `Tarik Saldo` sebagai label aksi yang sama
- [ ] Semua nominal format `Rp` + titik ribuan (cek G9)

### 6.8 `/dashboard/kreator/rate-card`

- [ ] Judul halaman konsisten dengan D1
- [ ] Status kartu: `Draf` dan `Tayang` (lihat D8)
- [ ] Tingkat paket: `Standar`, `Gabungan`, `Jangkauan`, bukan `Standard`, `Bundle`, `Exposure`
- [ ] Tidak ada `Marketplace` sebagai label
- [ ] Cek G7 untuk badge status

### 6.9 `/dashboard/kreator/settings`

- [ ] `Kata Sandi`, bukan `Password`
- [ ] `Nama Pengguna`, bukan `Username`
- [ ] `Gambar Mini`, bukan `Thumbnail`
- [ ] `Wawasan`, bukan `Insight`; `Buletin`, bukan `Newsletter`
- [ ] Daftar kategori: huruf awal kapital dari sumber string, bukan huruf kecil yang di-`capitalize` CSS
- [ ] Tab keamanan: pesan validasi dan konfirmasi bahasa Indonesia
- [ ] Tidak ada sapaan `kamu` (sebelum perbaikan layar ini punya 8 kemunculan, terbanyak di dashboard)

### 6.10 `/dashboard/kreator/notifikasi`

- [ ] Judul notifikasi konsisten dengan dashboard UMKM (satu pola untuk keduanya)
- [ ] Isi notifikasi contoh tidak mencampur bahasa Inggris di dalam kalimat Indonesia
- [ ] Tombol aksi di notifikasi bahasa Indonesia

### 6.11 `/dashboard/kreator/panduan`

- [ ] `Verifikasi Identitas`, bukan `KYC`
- [ ] `Sengketa`, bukan `Dispute`
- [ ] `Setujui Otomatis`, bukan `Auto-Approve`
- [ ] `Penarikan`, bukan `Withdrawal`
- [ ] Istilah dana aman dan paket harga punya penjelasan singkat bahasa Indonesia saat pertama muncul (lihat G13)
- [ ] Tidak ada sapaan `kamu` (sebelum perbaikan ada 3 kemunculan)
- [ ] Tidak ada klaim penghasilan pasti (lihat G14)

---

## 7. Checklist Dashboard UMKM

Login sebagai **UMKM**. Buka route berikut berurutan.

### 7.1 `/dashboard/umkm` (ringkasan)

- [ ] Greeting dan eyebrow bahasa Indonesia
- [ ] KPI: `Campaign` sudah jadi `Kampanye` di semua judul kartu
- [ ] Status kampanye di kartu: satu kata untuk draft, sesuai D8
- [ ] Metrik kosong tampil `—`, bukan `0` (cek G10)
- [ ] Angka tayangan pakai `rb`/`jt`

### 7.2 `/dashboard/umkm/campaign` (daftar kampanye)

- [ ] Judul dan eyebrow: `Kampanye Saya`, bukan `Campaign`
- [ ] Tab/filter status: pakai label dari peta status, tidak ada `Draft` mentah
- [ ] Header tabel: `Tayangan`, `Bukti Konten`, dan header lain bahasa Indonesia
- [ ] Toast setelah aksi (hapus, duplikat, jeda) bahasa Indonesia
- [ ] Empty state bahasa Indonesia + aksi berikutnya

### 7.3 `/dashboard/umkm/campaign/[campaignId]` (detail kampanye)

- [ ] Semua judul kartu bahasa Indonesia
- [ ] Bagian bukti konten: label bahasa Indonesia, tidak ada `Submission`
- [ ] Timeline aktivitas: label bahasa Indonesia
- [ ] Status dana: satu istilah saja (lihat D3)
- [ ] Halaman tidak ditemukan: copy bahasa Indonesia

### 7.4 `/dashboard/umkm/campaign/buat` (wizard)

- [ ] Judul: `Buat Kampanye Baru`, bukan `Buat Campaign Baru`
- [ ] Tidak ada kata `Wizard` di eyebrow atau judul langkah
- [ ] Nama langkah dan teks bantuan bahasa Indonesia
- [ ] Istilah brief konsisten dengan detail kampanye dan job detail kreator (lihat D4)
- [ ] Kartu simulasi dana aman: istilahnya sesuai D3 dan ada penjelasan singkat
- [ ] Pesan validasi form bahasa Indonesia, tidak ada kode teknis yang bocor

### 7.5 `/dashboard/umkm/kreator` (direktori)

- [ ] Judul: `Temukan Kreator Terbaik`, eyebrow `Direktori Kreator`
- [ ] Kartu kreator: tidak ada `Creator` dalam teks apa pun, termasuk teks yang dihasilkan adapter
- [ ] `Tingkat Keterlibatan`, bukan `Engagement`
- [ ] Jumlah pengikut pakai format ringkas lokal; kalau belum diisi tampil `—`
- [ ] Filter kategori bahasa Indonesia

### 7.6 `/dashboard/umkm/kreator/[id]` (detail kreator)

- [ ] Hero, statistik, portofolio, dan tautan sosial semua bahasa Indonesia
- [ ] Tidak ada `Brand` sebagai label, gunakan `Merek`
- [ ] Modal mulai negosiasi: tenggat pakai `Batas Waktu`, ruang lingkup pakai `Lingkup`
- [ ] Tombol aksi bahasa Indonesia

### 7.7 `/dashboard/umkm/negosiasi` dan `/dashboard/umkm/negosiasi/[id_conversation]`

- [ ] Judul halaman pakai kata kanonik `Negosiasi`, tidak menyimpang dari label sidebar
- [ ] Satu istilah untuk setiap tahap negosiasi di kartu ringkasan, filter, dan ruang obrolan
- [ ] `Hasil Kerja`, bukan `Deliverable`
- [ ] `Ringkasan Pesanan`, bukan `Order Summary`
- [ ] `Postingan Kolaborasi` sesuai D5
- [ ] Sapaan: `Anda`, tidak boleh `kamu` (cek G11)
- [ ] Kartu status dana aman: istilah sesuai D3 + kalimat penjelasan `dana ditahan sementara`

### 7.8 `/dashboard/umkm/review-rate-card` (daftar tinjauan)

- [ ] Judul konsisten dengan D9
- [ ] **Cek P0/P1:** tidak ada status berbentuk slug. Cari teks dengan `_`. Tidak boleh `in progress`, `revision requested`, `valid`
- [ ] Kartu tinjauan: label `Harga pesanan` (bukan `Harga order`), `Versi terbaru` (bukan `Versi latest`), `Status Pesanan` (bukan `Order`), `Validasi` (bukan `Validation`), `Pengiriman` (bukan `Submission`)

### 7.9 `/dashboard/umkm/review-rate-card/[orderId]` (detail tinjauan)

- [ ] Header `Hasil Kerja Terbaru`, bukan `Latest Deliverable`
- [ ] Badge status versi: bahasa Indonesia, tidak ada `_`
- [ ] Bagian versi sebelumnya: `Versi Sebelumnya`, bukan `Previous Versions`
- [ ] Bagian sumber: label bahasa Indonesia, bukan `Source`
- [ ] Tombol persetujuan: `Setujui Hasil Kerja` dan sejenisnya bahasa Indonesia

### 7.10 `/dashboard/umkm/keuangan`

- [ ] Judul `Keuangan Saya`, eyebrow bahasa Indonesia
- [ ] Istilah dana aman **satu saja** di seluruh layar, termasuk dropdown filter. Dropdown tidak boleh menawarkan dua label berbeda untuk nilai yang sama
- [ ] Nama mode paket harga konsisten dengan D1
- [ ] Kartu ringkasan: label bahasa Indonesia
- [ ] Riwayat transaksi: tipe dan status transaksi bahasa Indonesia
- [ ] Modal detail transaksi, modal pembayaran tertunda, dan modal ekspor laporan: semua copy bahasa Indonesia
- [ ] Semua nominal format rupiah (cek G9)

### 7.11 `/dashboard/umkm/analitik`

- [ ] Judul halaman konsisten dengan label sidebar
- [ ] Judul kartu KPI: `Kampanye Aktif`, `Semua Kampanye`, bukan `Campaign`
- [ ] Legenda dan sumbu grafik bahasa Indonesia
- [ ] Satuan tayangan konsisten `rb`/`jt`

### 7.12 `/dashboard/umkm/notifikasi`

- [ ] Pola judul sama dengan dashboard kreator
- [ ] Isi dan tombol notifikasi bahasa Indonesia

### 7.13 `/dashboard/umkm/pengaturan`

- [ ] Semua label dan pesan validasi bahasa Indonesia
- [ ] Tidak ada istilah Inggris mentah di preferensi notifikasi

### 7.14 `/dashboard/umkm/panduan`

- [ ] `Mode Paket Harga` dan istilah dana aman konsisten dengan dashboard
- [ ] Semua istilah asing punya penjelasan bahasa Indonesia
- [ ] Tidak ada klaim hasil yang dijamin

---

## 8. Cek lintas dashboard

Lakukan setelah kedua dashboard selesai.

| # | Yang dicek | Cara cek |
|---|---|---|
| X1 | Peta status sepakat | Bandingkan halaman `/dashboard/kreator/keuangan` dengan `/dashboard/umkm/keuangan`. Nilai status yang sama harus berlabel sama |
| X2 | Casing judul tab seragam | Bandingkan tab untuk 5 route kreator dan 5 route UMKM |
| X3 | Home nav | Kata untuk item home harus sama di kedua sidebar |
| X4 | Istilah bersama | `Kampanye`, `Kreator`, `Negosiasi`, `Keuangan`, `Notifikasi`, `Pengaturan` harus sama persis di kedua sidebar |
| X5 | Review nav | `Tinjauan Pekerjaan` (UMKM) tidak boleh berbeda dari kata yang dipakai di dalam halaman review |
| X6 | Notifikasi | Pola judul notifikasi sama untuk kedua role |
| X7 | Sapaan | Keduanya pakai `Anda`; jumlah kemunculan `kamu` harus 0 di seluruh pohon dashboard |

---

## 9. Format laporan temuan

Gunakan satu baris per temuan.

```txt
[KODE-KEPARAHAN] Route — Lokasi di layar
  Terlihat: <teks asli>
  Seharusnya: <teks usulan>
  Bukti: <file:baris, kalau tahu>
```

Contoh:

```txt
[P0] /dashboard/kreator/job-pool/[id] — tombol utama di kartu sticky
  Terlihat: Join Campaign
  Seharusnya: Klaim Lowongan
  Bukti: src/components/features/creator-dashboard/JobDetailView.tsx:319
```

---

## 10. Definition of Done QA

QA dinyatakan lulus jika semua ini benar.

- [ ] Tidak ada temuan **P0** tersisa.
- [ ] Setiap temuan **P1** tertutup atau diputuskan sebagai keputusan produk dan dicatat di `docs/audits/language-baseline-glossary.md`.
- [ ] Temuan **P2** boleh tersisa, tapi harus terdaftar dengan alasan.
- [ ] Semua baris G1 sampai G14 lulus di setiap route bagian 6 dan 7.
- [ ] Semua baris X1 sampai X7 lulus.
- [ ] Cek cepat bagian 4 tidak menghasilkan temuan.
- [ ] `npx tsc --noEmit` bersih, `npm run build` sukses, `npm test` lulus.
- [ ] Ringkas di lebar 390px: tidak ada label tombol yang terpotong sampai maknanya hilang.

## 11. Gesekan yang sudah diketahui (bukan bug QA)

| Hal | Status |
|---|---|
| `routes.umkmSettings` menunjuk `/dashboard/umkm/settings` padahal route nyata `/dashboard/umkm/pengaturan` | Bug konstanta route, di luar cakupan bahasa. Sudah dicatat di `design.md` |
| Lima route `"use client"` belum bisa punya `metadata.title` | Keterbatasan struktur Next.js, di luar cakupan bahasa. Daftarnya ada di baris G1 |
| Dokumen di `docs/marketiv-md/**` masih memakai kata `campaign`, `Draft` | Drift dokumentasi, di luar cakupan |
| Komponen tanpa pemakai yang memuat teks Inggris (`KPISection`, `CampaignAssetCard`, `AssetPreviewModal`, `EscrowSimulationCard`, `CampaignStatusBadge`, `CampaignProgress`, `CampaignActionMenu`) | Sudah dihapus, bukan diterjemahkan. Export-nya juga dibersihkan dari `campaign/index.ts` |
| `P2MW` muncul di pesan ekspor laporan | Nama program, sah. Bukan istilah Inggris yang perlu diterjemahkan |
