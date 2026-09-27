# 🎪 Demo Readiness — Pameran Selasa 29 September 2026

> **Dokumen tunggal untuk memilih dan memilah perbaikan sebelum pameran.**
> Semua temuan dari `codebase-audit-2026-09-27.md` sudah **diverifikasi ulang baris per baris**,
> lalu dinilai dari satu sudut baru: **apakah user di booth akan melihatnya?**
>
> Tanggal: Minggu 27 Sep 2026 · Pameran: **Selasa 29 Sep 2026** (Senin 28 = hari terakhir kerja efektif)
> Konteks: website prod & staging akan di-showcase dan dicoba langsung oleh user.

---

## 0. Hasil verifikasi (ringkas)

| Status | Jumlah |
|---|---|
| **CONFIRMED** (kode benar-benar begitu) | **45 / 45** |
| REFUTED | 0 |
| UNVERIFIABLE | 0 |

Tiga koreksi yang muncul saat verifikasi (bukti bahwa verifikasi ini tidak sekadar mengulang):

1. **Temuan lama di repo sudah usang.** `docs/audits/umkm-dashboard-appwrite-integration-readiness.md` §3d menyebut
   "kirim pesan + auto-reply kreator fake via `setTimeout(1500)`" di `NegotiationRoomPage`. Sudah **tidak berlaku**:
   `NegotiationRoomPage.tsx:202-205` berkomentar eksplisit bahwa balasan otomatis dihapus karena menyesatkan.
   Dokumen audit lama tidak boleh lagi jadi dasar keputusan.
2. **Dua severity dinaikkan/turunkan.** `lib/umkm-status.ts:60` (label fraud berbeda) turun ke LOW karena
   hanya label milik modul creator yang pernah dirender. Sebaliknya `notification-appwrite.service.ts:177`
   naik ke P1 karena tombol hapus notifikasi benar-benar tampil lalu gagal (403).
3. **Satu pointer di laporan lama salah.** Temuan `getPendingSubmissions` menunjuk `:500`; implementasi
   sebenarnya ada di `src/services/umkm/umkm-appwrite.service.ts:516`.

---

## 1. WAJIB DICEK SEBELUM APA PUN — mode data di staging & prod

`src/config/data-source.config.ts`:

```ts
useMockData: process.env.NEXT_PUBLIC_USE_MOCK_DATA === "true",
```

Artinya **default-nya MODE REAL** (mock hanya aktif kalau env diset eksplisit `true`). Nilai di
staging/prod tidak tersimpan di repo (tidak ada di workflow CI, `.env` lokal = `true`).

**Cek 2 menit di browser staging/prod:** buka `/dashboard/umkm`.

- Ada bilah demo melayang (`FloatingDemoBar`, hanya dirender saat `useMockData` true) → **mode mock**.
- Tidak ada, dan banyak angka `—` / empty state → **mode real**.

**Kenapa ini menentukan prioritas Selasa:**

| Mode | Realita data live | Konsekuensi demo |
|---|---|---|
| **Mock** | Data demo kaya (campaign, kreator, chat, KPI) | Demo terlihat hidup. Prioritas pindah ke **perilaku mock yang tidak konsisten** (P0-11, 12, 13) |
| **Real** | `creator_portfolios` 0 baris, `followers` 0, order 0, belum ada ulasan | Banyak layar tampil `—`/kosong. Ini keputusan produk, bukan bug |

**Rekomendasi:** demo memakai **mock** (data live belum ada isinya), dan pastikan seluruh perilaku mock
konsisten. Kalau memilih real mode, siapkan narasi kenapa layar tampil kosong, dan kerjakan dulu
spec `creator-followers-directory-dto` + `creator-reviews-and-orders-aggregation`.

---

## 2. P0 — BLOKER DEMO (fungsionalitas & UI yang user akan klik/lihat)

> **STATUS: SELESAI** (branch `demo-readiness`, commit `d6a7173`, `1a4eb66`, `fe0be93`, `36793f5`).
> Semua 16 defek diperbaiki dengan tes yang gagal lebih dulu, lalu hijau. Verifikasi: `npx tsc --noEmit`
> bersih, eslint bersih, dan `npx vitest run --no-file-parallelism` **428 tes lolos (80 berkas)**.
> Sisa yang belum: klik manual di browser (butuh manusia) — daftar langkahnya ada di
> `.kiro/specs/demo-readiness-p0/tasks.md` §5.4.

Semua item di bawah **frontend-only, tanpa deploy backend**, risiko rendah, total estimasi **±2–3 jam**.

| ID | Lokasi | Yang user lihat | Fix | Usaha |
|---|---|---|---|---|
| **P0-1** | `umkm-dashboard/creators/detail/CreatorProfileHero.tsx:35` | Badge **"Kreator Terverifikasi"** muncul di semua kreator, termasuk yang `isVerified` false | Bungkus `creator.isVerified && (...)` | S |
| **P0-2** | `umkm-dashboard/campaign/detail/CampaignDetailPage.tsx:188` | Tombol **"Lihat Riwayat Transaksi"** hanya memunculkan toast, tidak pindah halaman | Arahkan ke `/dashboard/umkm/keuangan` | S |
| **P0-3** | `creator-dashboard/CreatorDashboardView.tsx:294` | Klik **"Detail"** pada rekomendasi membuka daftar job, bukan job itu | Pakai rute detail job (`routes.kreatorJobDetail(job.id)`) | S |
| **P0-4** | `creator-dashboard/JobDetailView.tsx:299` | Tombol **share** (ikon saja) tidak melakukan apa pun | Implementasi share atau hapus tombolnya | S |
| **P0-5** | `creator-dashboard/JobDetailView.tsx:650` | Tombol **"Urutkan dari"** tidak melakukan apa pun | Implementasi sort atau hapus | S–M |
| **P0-6** | `creator-dashboard/SettingsView.tsx:1114` | Tombol **"Simpan Preferensi"** abu-abu permanen | Sembunyikan sampai preferensi benar-benar tersimpan | S |
| **P0-7** | `creator-dashboard/ActiveWorkDetailView.tsx:880` | Satu layar menulis **"URL Postingan Terverifikasi"** sementara baris di bawahnya **"Belum diverifikasi"** | Judul jadi "URL Bukti Tayang" kecuali status valid | S |
| **P0-8** | `creator-dashboard/modals/ClaimCampaignModal.tsx:143-145` | Baris aturan berbentuk `div onClick`. User yang memakai keyboard **tidak bisa klaim** (tombol klaim terkunci) | Ganti ke `checkbox`/`button` asli | M |
| **P0-9** | `creator-dashboard/CreatorDashboardView.tsx:299-300` | Tombol **"Klaim Job"** tidak mendisable diri saat proses → klik ganda tanpa umpan balik | Tambah `disabled` + indikator proses | S |
| **P0-10** | `auth/RoleChooser.tsx:14,33` | Layar register menulis klaim **"ratusan kreator terverifikasi"**, **"ribuan UMKM aktif"** | Lunakkan ("kreator terverifikasi", "UMKM aktif") | S |
| **P0-11** | `services/creator/creator-dashboard.service.ts:206` | **(mock)** Chat sisi kreator **selalu kosong**, padahal sisi UMKM punya riwayat | Pakai sumber mock yang sama | S |
| **P0-12** | `services/umkm/umkm-dashboard.service.ts:287` | **(mock)** Membuka chat dengan kreator yang tidak ada di data mock → masuk ruang palsu `conv_000` | Kembalikan error yang jujur | S |
| **P0-13** | `mocks/umkm/overview.mock.ts:28` | **(mock)** KPI **"8 kreator bergabung"** di samping daftar campaign yang hanya menghitung 7 | Hitung KPI dari store demo | S |
| **P0-14** | `umkm-dashboard/campaign/CampaignSummaryCards.tsx:62` | Kartu **"Total Kampanye"** mencampur campaign + jumlah pembayaran, mengabaikan draft/paused | Jumlahkan status campaign saja | S |
| **P0-15** | `umkm-dashboard/creators/CreatorSummaryCards.tsx:84` | Kartu **"Tarif Mulai Dari"** menampilkan **"Rp 0"** saat tidak ada harga | Tampilkan `—` | S |

**Definisi selesai P0:** semua tombol di atas punya perilaku nyata atau dihapus, tidak ada lagi teks
yang saling bertentangan di satu layar, dan data mock tidak bertentangan dengan dirinya sendiri.

---

## 3. P1 — Kalau P0 selesai dan masih ada waktu (Senin malam)

| ID | Lokasi | Yang user lihat | Fix | Usaha |
|---|---|---|---|---|
| **P1-1** | `umkm-dashboard/analytics/PerformanceChart.tsx:70-71, 196` | Grafik tren 6 bulan dan klaim **"+28.4%"** dirender dari baseline fiktif (`68000` views / `Rp 1.800.000`) | Beri label "contoh data demo" atau sembunyikan grafik sampai ada seri waktu nyata | M |
| **P1-2** | `umkm-dashboard/campaign/detail/CampaignActivityTimeline.tsx:30` | Timeline menampilkan event yang dikarang (`payDate + 15 menit`) | Ambil event asli atau beri label estimasi | M |
| **P1-3** | `umkm-dashboard/settings/PengaturanClient.tsx:92-99` | Toggle notifikasi berubah + toast **"berhasil diperbarui"**, padahal tidak tersimpan | Simpan ke service atau hentikan klaim sukses | M |
| **P1-4** | `umkm-dashboard/negotiation/detail/DealChecklistCard.tsx:32` | Checklist **"Postingan Bersama"** selalu bercentang hijau apa pun statusnya | Turunkan dari data order/deliverable | S |
| **P1-5** | `umkm-dashboard/negotiation/NegotiationSummaryCards.tsx:52-53` | Angka **"Dalam Escrow"** dihitung di klien dari daftar stage (ada TODO di kode) | Ambil dari summary backend | M |
| **P1-6** | `umkm-dashboard/creators/CreatorDirectoryPage.tsx:73-86` | Statistik "terverifikasi"/"rata-rata engagement" dihitung dari 100 baris pertama tapi ditampilkan sebagai rasio populasi | Beri label cakupan atau hitung di server | M |
| **P1-7** | `services/shared/notification-appwrite.service.ts:177` | **(mode real)** Tombol hapus notifikasi tampil, diklik → gagal (tidak ada `Permission.delete`) | Sembunyikan tombol atau lewat Function | S |
| **P1-8** | `umkm-dashboard/finance/TransactionCard.tsx:19` · `creator-dashboard/KeuanganView.tsx:708,730,751` | Tidak terlihat mata, tapi kartu transaksi tidak bisa di-Tab dan field bank/nominal tanpa nama aksesibel | Tambah `role`/`tabIndex`/handler keyboard; sambungkan `htmlFor`/`id` | S |
| **P1-9** | `creator-dashboard/CreatorDashboardSidebar.tsx:104` | Update state setelah `await` tanpa guard (risiko warning saat pindah halaman cepat) | Tambah guard `isActive` | S |
| **P1-10** | `lib/umkm-status.ts:60` vs `lib/creator-status.ts:42` | Dua modul memetakan status yang sama, label fraud `rejected` berbeda ("Tidak Valid" vs "Terindikasi Fraud") | Satukan ke satu modul | S |
| **P1-11** | `types/role.ts:7` | Tidak terlihat (dead file), tapi bertabrakan dengan kanon `@/types/domain` | Hapus file | S |
| **P1-12** | 38 tempat di `src/**` | **Em dash (`—`) di prosa/judul halaman** (mis. `"Masuk — Marketiv"`), melanggar antislop R-02 | Ganti ke `·`, `:`, atau `|` | S (tapi 38 berkas) |

Catatan em dash: 62 pemakaian lain adalah **placeholder data** `"—"` untuk "belum ada data" yang
sengaja kita pakai. Rekomendasi: pertahankan placeholder, perbaiki 38 prosa, dan tulis pengecualiannya
satu baris di dokumen desain.

---

## 4. JANGAN SENTUH SEBELUM PAMERAN (butuh deploy backend / risiko tinggi)

Semua temuan berikut **CONFIRMED** dan **serius**, tapi perbaikannya menyentuh kode uang/keamanan
Function yang butuh deploy dan uji konkurensi. Dikerjakan setelah pameran, sebagai spec bugfix tersendiri.

| Prioritas | Lokasi | Risiko |
|---|---|---|
| **#1** | `functions/review-submission/src/main.js:83` + 4 Function lain (`get-admin-dashboard-summary:74`, `get-admin-submission-queue:73`, `get-admin-ratecard-deliverable-queue:35`, `review-ratecard-deliverable:64`) | **Eskalasi admin**: `prefs.role` bisa ditulis user sendiri (`account.updatePrefs`), dan `review-submission` teregistrasi `execute: ["users"]` → user bisa menyetujui submission miliknya dengan `views` bebas lalu memicu kredit reward |
| #2 | `functions/release-escrow/src/main.js:95-98` | Kredit wallet ditulis **sebelum** penanda idempotensi → crash di antaranya bisa mengkredit ulang saat retry |
| #3 | `functions/calculate-campaign-reward/src/main.js:22-29,63-64` | Dedup racy + credit-before-ledger → reward dobel pada event paralel |
| #4 | `functions/refund-order/src/main.js:218-224` · `refund-escrow/src/main.js:63,96` | Setelah kredit sukses, kegagalan langkah berikut menghapus ledger / meninggalkan escrow `refunded` → refund macet atau dobel |
| #5 | `functions/withdrawal-callback/src/main.js:42,124,134` | Token callback opsional (gagal-terbuka) + reversal check-then-increment |
| #6 | `functions/validate-and-upload/src/main.js:39,89` · `delete-file/src/main.js:38-42` | Kuota storage read-then-write → upload paralel bisa melewati kuota |
| #7 | `00_BACKEND/src/services/wallet.service.ts:247` · `claim.service.ts:129,180` | Jalur SDK klien non-atomik (tidak dipakai frontend lagi, tapi masih ada dan masih diuji) |
| #8 | `functions/request-password-otp/src/main.js:147` | Rate limit OTP non-atomik |
| #9 | `services/umkm/umkm-appwrite.service.ts:476` | `getSubmissionCounts` tanpa filter kepemilikan (celah otorisasi) |
| #10 | `services/umkm/umkm-appwrite.service.ts:300` · `creator-appwrite.service.ts:133` | Error fetch tertelan (real mode) & id ke-101+ dibuang tanpa chunking |

**Kenapa ditunda:** perubahan di sini berpotensi memutus alur demo (approve submission, pencairan,
refund, upload) kalau deploy dilakukan buru-buru tanpa uji. Risikonya lebih besar daripada manfaatnya
untuk acara Selasa.

Kalau tim backend punya slot aman Senin malam, hanya **#1** yang layak dikejar: perbaikannya kecil
(hapus jalur `prefs.role`), tidak mengubah alur sukses, dan menutup eskalasi admin. Selebihnya tunggu
setelah pameran.

---

## 5. TEMUAN YANG TIDAK PERLU DIPIKIRKAN SEKARANG (tidak terlihat user)

Dari verifikasi, item berikut dinyatakan **tidak demo-visible** — aman ditunda:

- `umkm-appwrite.service.ts:300` (hanya muncul saat outage di real mode)
- `creator-appwrite.service.ts:133` (butuh >100 data)
- `umkm-appwrite.service.ts:476` (celah otorisasi, tanpa gejala visual)
- `umkm-appwrite.service.ts:132` (`externalAssetUrl` kosong hanya di real mode)
- Mock tanpa guard di `umkm-dashboard.service.ts:837/846/875` (memang tidak error, tapi guard tidak teruji)
- `types/role.ts`, `lib/umkm-status.ts` (dead code / label tak dirender)
- `getPendingSubmissions` (fungsi tidak pernah dipanggil)
- Seluruh P2 backend di bagian 4 (kecuali kalau tim backend punya waktu)
- `finance/TransactionCard` & `KeuanganView` label a11y (hanya untuk pengguna keyboard/SR)

---

## 6. Checklist eksekusi

### Sebelum mulai
- [ ] Cek mode data staging & prod (bagian 1) dan catat hasilnya di dokumen ini.
- [ ] Putuskan: demo pakai mock atau real (rekomendasi: mock).

### P0 (target: Senin siang)
- [ ] P0-1 badge terverifikasi diberi syarat `isVerified`
- [ ] P0-2 tombol riwayat transaksi mengarah ke halaman keuangan
- [ ] P0-3 link "Detail" rekomendasi → detail job
- [ ] P0-4 tombol share (implementasi atau hapus)
- [ ] P0-5 tombol "Urutkan dari" (implementasi atau hapus)
- [ ] P0-6 tombol "Simpan Preferensi" (sembunyikan atau fungsikan)
- [ ] P0-7 judul "URL Postingan Terverifikasi" → "URL Bukti Tayang"
- [ ] P0-8 baris aturan klaim jadi checkbox yang bisa di-Tab
- [ ] P0-9 tombol "Klaim Job" disable + indikator saat proses
- [ ] P0-10 copy `RoleChooser` tanpa angka tak terverifikasi
- [ ] P0-11 mock chat kreator diisi sumber yang sama dengan sisi UMKM
- [ ] P0-12 `conv_000` diganti error jujur
- [ ] P0-13 KPI mock dihitung dari store demo
- [ ] P0-14 "Total Kampanye" dihitung dari status campaign
- [ ] P0-15 "Tarif Mulai Dari" → `—` saat tidak ada harga
- [ ] `npx tsc --noEmit` + test terkait lulus
- [ ] Klik manual semua yang diperbaiki, catat hasilnya (bukti, bukan klaim)

### P1 (Senin malam, kalau sempat)
- [ ] P1-1 s/d P1-6 (data karangan di layar analitik/campaign/negosiasi/direktori)
- [ ] P1-7 s/d P1-9 (notifikasi, a11y, guard async)
- [ ] P1-10, P1-11 (konsolidasi status, hapus dead file)
- [ ] P1-12 em dash prosa

### Setelah pameran
- [ ] Spec bugfix backend (bagian 4, mulai dari #1 eskalasi admin)
- [ ] Spec `creator-followers-directory-dto` + `creator-reviews-and-orders-aggregation` (kalau demo memakai real mode)
- [ ] Hapus dua berkas tak terpakai di root: `banner_copywriting_guide.html`, `banner_meja_copywriting_guide.html`
- [ ] Perbarui dokumen audit lama yang sudah usang (§3d `umkm-dashboard-appwrite-integration-readiness.md`)
