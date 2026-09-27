# ✅ TASKS — Demo Readiness P0

> Urutan eksekusi mengikuti `design.md` §8: klaster teks → kontrol/navigasi → interaksi →
> mock/agregat, lalu gate verifikasi. Setiap task = satu commit, dengan tesnya, dan setiap task
> ditutup dengan menjalankan tes yang disebut di dalamnya.
>
> Semua task berstatus `- [ ]` karena **eksekusi menunggu review spec ini dan persetujuan
> keputusan D-1 … D-5** (`bugfix.md` §5).

---

## Task 0 — Prasyarat (blokir eksekusi)

- [ ] 0.1 Konfirmasi keputusan **D-1** (hapus vs implementasi "Urutkan dari").
- [ ] 0.2 Konfirmasi keputusan **D-2** (hapus tombol "Simpan Preferensi" vs sembunyikan panel notifikasi).
- [ ] 0.3 Konfirmasi keputusan **D-3** (mock gagal-tertutup vs buat ruang baru di demo store).
- [ ] 0.4 Konfirmasi keputusan **D-4** (`navigator.share` + fallback clipboard vs hapus tombol share).
- [ ] 0.5 Konfirmasi keputusan **D-5** (demo memakai mock) dan catat temuan cek bilah demo di
      `/dashboard/umkm` (mock ON bila bilah demo muncul).
- [ ] 0.6 Pastikan baseline bersih: `npx tsc --noEmit` lolos dan `npx vitest run` tidak menambah
      kegagalan baru di luar 3 berkas flake beban yang sudah diketahui
      (`NegotiationRoomPage.package-prefill`, `umkm-dashboard.thumbnail-legacy`,
      `rate-card-tos-preflight`).

---

## Task 1 — Klaster B: klaim & teks yang menyesatkan

_Requirements: 1.6, 1.7, 1.8, 1.9 · Contract: 2.6, 2.7, 2.8, 2.9_

- [ ] 1.1 **Red** — perluas `src/components/features/umkm-dashboard/creators/detail/__tests__/creator-content-source.test.tsx`:
  - [ ] 1.1.1 Kasus `isVerified: false` → teks `"Kreator Terverifikasi"` TIDAK ada di DOM.
  - [ ] 1.1.2 Kasus `isVerified: true` → teks tersebut ADA.
  - [ ] 1.1.3 Jalankan dan pastikan tes baru gagal (bukti Red untuk defek 1.6).
- [ ] 1.2 **Green** — `CreatorProfileHero.tsx:32-36`: bungkus badge dengan `creator.isVerified && (…)`.
  _Requirements: 2.6_
- [ ] 1.3 **Red** — buat `src/components/features/creator-dashboard/__tests__/active-work-honesty.test.tsx`:
  - [ ] 1.3.1 Render `ActiveWorkDetailView` dengan submission berstatus `pending` (`work.contentUrl` terisi).
  - [ ] 1.3.2 Assert teks `"Terverifikasi"` tidak muncul, sementara `"Belum diverifikasi"` muncul.
  - [ ] 1.3.3 Commit skenario 1.3.1-1.3.2 sebagai tes merah untuk defek 1.7.
- [ ] 1.4 **Green** — `ActiveWorkDetailView.tsx:880`: judul menjadi `"URL Bukti Tayang"`. _Requirements: 2.7_
- [ ] 1.5 **Red+Green** — `RoleChooser.tsx:14,33`: ganti dua bullet copy.
  - [ ] 1.5.1 Tes: `src/components/features/auth/__tests__/role-chooser-copy.test.tsx` — render `RoleChooser`,
        assert tidak ada teks yang mengandung `"ratusan"` atau `"ribuan"`. _Requirements: 2.8_
  - [ ] 1.5.2 Ubah copy menjadi `"Akses direktori kreator terverifikasi"` dan
        `"Ambil campaign dari UMKM yang sedang aktif"`.
- [ ] 1.6 **Red+Green** — `CampaignsPage.tsx:69-71`: `"Ratusan kreator aktif terverifikasi"` →
  `"Kreator aktif terverifikasi"`; perluas tes empty state campaign yang ada (atau buat tes baru)
  untuk mengunci copy tanpa angka. _Requirements: 2.9_
- [ ] 1.7 Verifikasi task: `npx tsc --noEmit`, `npx eslint` pada berkas yang disentuh, dan
  `npx vitest run src/components/features/umkm-dashboard/creators src/components/features/creator-dashboard src/components/features/auth`.
- [ ] 1.8 Commit: `Fix misleading claims and unverified badge in creator surfaces`.

---

## Task 2 — Klaster A: kontrol mati & navigasi salah

_Requirements: 1.1, 1.2, 1.3, 1.4, 1.5 · Contract: 2.1, 2.2, 2.3, 2.4, 2.5_

- [ ] 2.1 **Red** — buat `src/components/features/umkm-dashboard/campaign/detail/__tests__/campaign-quick-actions.test.tsx`:
  - [ ] 2.1.1 Mock `next/navigation`; klik tombol `"Lihat Riwayat Transaksi"`.
  - [ ] 2.1.2 Assert `router.push` dipanggil dengan `routes.umkmFinance` dan `toast.success` TIDAK dipanggil.
- [ ] 2.2 **Green** — `CampaignDetailPage.tsx:188`: `onViewEscrow={() => router.push(routes.umkmFinance)}`
  (impor `routes` bila belum ada). _Requirements: 2.1_
- [ ] 2.3 **Red** — buat `src/components/features/creator-dashboard/__tests__/creator-dashboard-navigation.test.tsx`:
  - [ ] 2.3.1 Render `CreatorDashboardView` dengan satu `recommendedJobs` ber-id `job_123`.
  - [ ] 2.3.2 Assert href tautan `"Detail"` = `/dashboard/kreator/job-pool/job_123`.
- [ ] 2.4 **Green** — `CreatorDashboardView.tsx:293-298`: `href={routes.kreatorJobDetail(job.id)}`. _Requirements: 2.2_
- [ ] 2.5 **Red** — buat `src/components/features/creator-dashboard/__tests__/job-detail-controls.test.tsx`:
  - [ ] 2.5.1 Tombol share: punya `aria-label`, dan saat `navigator.share` tidak ada, klik memanggil
        `navigator.clipboard.writeText` dengan tautan detail job + toast sukses.
  - [ ] 2.5.2 Tombol `"Urutkan dari"` tidak ada di DOM (bila D-1 = hapus).
- [ ] 2.6 **Green** — `JobDetailView.tsx`:
  - [ ] 2.6.1 Tambah `handleShare` (share → fallback clipboard → toast sukses/kegagalan).
  - [ ] 2.6.2 Pasang `onClick={handleShare}` + `aria-label="Bagikan campaign"` pada tombol `:299-301`.
  - [ ] 2.6.3 Hapus blok tombol "Urutkan dari" `:649-653` bila D-1 = hapus. _Requirements: 2.3, 2.4_
- [ ] 2.7 **Red** — buat `src/components/features/creator-dashboard/__tests__/settings-notification-panel.test.tsx`:
  - [ ] 2.7.1 Assert teks `"Simpan Preferensi"` tidak ada, `"Fitur notifikasi akan segera hadir."` ada,
        dan semua toggle tetap `disabled`.
- [ ] 2.8 **Green** — `SettingsView.tsx:1113-1117`: hapus tombol simpan; hapus handler/state yang jadi
  tidak terpakai (tanpa mengubah state toggle). Bila D-2 = sembunyikan panel, lewati langkah ini dan
  ganti dengan menyembunyikan seluruh `renderNotifikasi`. _Requirements: 2.5_
- [ ] 2.9 Verifikasi task: `npx tsc --noEmit`, eslint, dan `npx vitest run src/components/features/creator-dashboard src/components/features/umkm-dashboard`.
- [ ] 2.10 Commit: `Replace dead controls with real behaviour in campaign and job surfaces`.

---

## Task 3 — Klaster C: ketahanan interaksi

_Requirements: 1.10, 1.11 · Contract: 2.10, 2.11_

- [ ] 3.1 **Red** — buat `src/components/features/creator-dashboard/__tests__/claim-modal-keyboard.test.tsx`:
  - [ ] 3.1.1 Render `ClaimCampaignModal` terbuka.
  - [ ] 3.1.2 Assert terdapat 4 `input[type="checkbox"]` (atau `role="checkbox"`) yang dapat difokus.
  - [ ] 3.1.3 Simulasikan `change` pada keempatnya → tombol `"Klaim Sekarang"` menjadi `enabled`.
  - [ ] 3.1.4 Assert jalur mouse (klik label) tetap bekerja seperti sebelumnya.
- [ ] 3.2 **Green** — `ClaimCampaignModal.tsx:143-152`: ubah baris `div onClick` menjadi `label` +
  `input type="checkbox" className="sr-only"` + `onChange={() => toggleRule(rule.key)}`, dan
  pertahankan kelas visual kotak centang. Tambahkan ring fokus `has-[:focus-visible]:…`. _Requirements: 2.10_
- [ ] 3.3 **Red** — buat `src/components/features/creator-dashboard/__tests__/creator-dashboard-claim-state.test.tsx`:
  - [ ] 3.3.1 `onClaim` mengembalikan promise yang belum selesai → tombol `"Klaim Job"` berstatus
        `disabled` dan berlabel `"Mengklaim…"`.
  - [ ] 3.3.2 Setelah promise selesai → tombol kembali aktif dengan label semula.
- [ ] 3.4 **Green** — `CreatorDashboardView.tsx`:
  - [ ] 3.4.1 Tambah prop `isClaiming: boolean` pada komponen kartu rekomendasi.
  - [ ] 3.4.2 Kirim `isClaiming={claimingJobId === job.id}` dari daftar kartu.
  - [ ] 3.4.3 `disabled={isClaiming}` + label bersyarat pada tombol `:299-308`. _Requirements: 2.11_
- [ ] 3.5 Verifikasi task: `npx tsc --noEmit`, eslint, dan
  `npx vitest run src/components/features/creator-dashboard` (termasuk preflight TOS yang sudah ada untuk
  memastikan tidak ada regresi pada alur offer).
- [ ] 3.6 Commit: `Make claim flow keyboard-accessible and prevent double claim`.

---

## Task 4 — Klaster D: konsistensi data mock & agregat

_Requirements: 1.12, 1.13, 1.14, 1.15, 1.16 · Contract: 2.12, 2.13, 2.14, 2.15, 2.16_

- [ ] 4.1 **Red** — buat `src/services/creator/__tests__/creator-mock-messages.test.ts`:
  - [ ] 4.1.1 Dengan `DATA_SOURCE_CONFIG.useMockData = true`, `getMessagesByConversationId("conv_001")`
        mengembalikan array tidak kosong.
  - [ ] 4.1.2 Id tak dikenal tetap `[]` (bukan error).
- [ ] 4.2 **Green** — `src/mocks/creator-dashboard.mock.ts`: tambah `mockCreatorMessages` untuk
  `conv_001` … `conv_004`, isinya konsisten dengan `mockCreatorNegotiations` (brand: Batik Cantik Solo,
  Herbal Glow Indonesia, Dapur Sehat Sukabumi, Anggun Apparel). _Requirements: 2.12_
- [ ] 4.3 **Green** — `src/services/creator/creator-dashboard.service.ts:201-209`: cabang mock memakai
  `mockCreatorMessages[conversationId] ?? []`. _Requirements: 2.12_
- [ ] 4.4 **Red** — buat `src/services/umkm/__tests__/create-conversation.mock.test.ts`:
  - [ ] 4.4.1 `creatorId` yang punya ruang (mis. `creator_001`) → `success: true`, `data: "conv_001"`.
  - [ ] 4.4.2 `creatorId` tanpa ruang (mis. `creator_016`) → `success: false`, `code: "not_found"`,
        dan `data` BUKAN `"conv_000"`.
- [ ] 4.5 **Green** — `src/services/umkm/umkm-dashboard.service.ts:286-287`: gagal-tertutup dengan pesan
  `"Percakapan demo untuk kreator ini belum tersedia."` (sesuai D-3). _Requirements: 2.13_
- [ ] 4.6 **Red** — buat `src/mocks/__tests__/derive-overview-kpis.test.ts`:
  - [ ] 4.6.1 Dengan seed store (4 campaign: 3 active, 1 completed, usedQuota 1+0+2+4) → hasil
        `campaignActive: 3`, `campaignCompleted: 1`, `creatorJoined: 7`.
  - [ ] 4.6.2 Tambah satu campaign `active` dengan `usedQuota` 2 → `creatorJoined` menjadi 9 (bukti turunan, bukan konstanta).
- [ ] 4.7 **Green** — `src/mocks/umkm/overview.mock.ts`: tambah `MOCK_SEED_KPIS` (nilai demo
  terdokumentasi) + `deriveOverviewKpis(campaigns)`; `umkm-dashboard.service.ts:115-122` memakai helper
  tersebut. _Requirements: 2.14_
- [ ] 4.8 **Red+Green** — buat `src/components/features/umkm-dashboard/campaign/__tests__/CampaignSummaryCards.test.tsx`:
  - [ ] 4.8.1 Ringkasan `{ activeCampaigns: 3, completedCampaigns: 1, pendingPayments: 2 }` → kartu
        "Total Kampanye" menampilkan `4` (bukan `6`) dan catatan `"Aktif & selesai"`.
  - [ ] 4.8.2 Ubah `CampaignSummaryCards.tsx:59-65` sesuai design §4.4. _Requirements: 2.15_
- [ ] 4.9 **Red+Green** — perbarui `src/components/features/umkm-dashboard/creators/__tests__/CreatorSummaryCards.test.tsx`:
  - [ ] 4.9.1 Ubah ekspektasi `"Rp 0"` → `"—"` dan assert unit `/ proyek` tidak ikut tampil.
  - [ ] 4.9.2 Ubah `CreatorSummaryCards.tsx:81-92` sesuai design §4.5. _Requirements: 2.16_
- [ ] 4.10 Verifikasi task: `npx tsc --noEmit`, eslint, dan
  `npx vitest run src/services src/mocks src/components/features/umkm-dashboard src/lib/demo`.
- [ ] 4.11 Commit: `Derive mock KPIs from data and stop mixing payment count into campaign total`.

---

## Task 5 — Gate verifikasi akhir (wajib sebelum dianggap selesai)

_Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8_

- [ ] 5.1 `npx tsc --noEmit` → nol error.
- [ ] 5.2 `npx eslint <semua berkas yang disentuh>` → nol error, tanpa warning baru.
- [ ] 5.3 `npx vitest run` (suite penuh). Catat hasilnya: bila ada kegagalan timeout pada
  `NegotiationRoomPage.package-prefill`, `umkm-dashboard.thumbnail-legacy`, atau
  `rate-card-tos-preflight`, jalankan ketiganya secara terpisah untuk membuktikan itu flake beban
  (`_Requirements: 3.7_`).
- [ ] 5.4 Klik manual di `npm run dev` dan catat hasil per elemen (bukan klaim):
  - [ ] 5.4.1 Detail campaign → "Lihat Riwayat Transaksi" → halaman keuangan terbuka.
  - [ ] 5.4.2 Dashboard kreator → "Detail" pada rekomendasi → detail job yang benar.
  - [ ] 5.4.3 Detail job → share → tautan tersalin + toast.
  - [ ] 5.4.4 Modal klaim → Tab + Space pada 4 ketentuan → tombol klaim aktif.
  - [ ] 5.4.5 Klaim job → tombol menampilkan "Mengklaim…" lalu kembali normal.
  - [ ] 5.4.6 Pengaturan kreator → panel notifikasi tanpa tombol simpan.
  - [ ] 5.4.7 Direktori kreator → profil kreator non-verifikasi tanpa badge.
  - [ ] 5.4.8 Ruang negosiasi kreator (mock) → riwayat pesan terisi.
  - [ ] 5.4.9 Overview UMKM → KPI "Total Kreator" = jumlah slot terpakai pada daftar campaign.
- [ ] 5.5 Perbarui bagian P0 pada `docs/audits/demo-readiness-selasa-2026-09-29.md` menjadi
  "SELESAI (tanggal)" beserta bukti tes, dan catat sisa P1 sebagai backlog.
- [ ] 5.6 Push ke `staging` dan pastikan commit history memuat 4 commit task di atas.

---

## 6. Definition of Done

- [ ] Semua kriteria 2.1 … 2.16 punya tes yang gagal sebelum perbaikan dan hijau sesudahnya.
- [ ] Semua invariant 3.1 … 3.8 terbukti (bukan diasumsikan).
- [ ] Tidak ada berkas di luar `design.md` §5 yang berubah.
- [ ] Tidak ada tombol tanpa perilaku yang tersisa pada berkas yang disentuh.
- [ ] Bukti klik manual tercatat di dokumen demo readiness.

---

## 7. Follow-up (bukan bagian P0)

- [ ] Backend: tambah `totalCampaigns` (atau hitungan semua status) ke DTO `get-umkm-dashboard-summary`
      supaya catatan "Semua status" bisa kembali jujur.
- [ ] Mock: buat ruang negosiasi baru secara dinamis di demo store (menggantikan perilaku
      gagal-tertutup pada D-3) bila demo butuh chat untuk semua kreator.
- [ ] Mock: selaraskan id ruang negosiasi sisi UMKM dan sisi kreator (`conv_001` dipakai dua dunia
      berbeda) supaya data demo tidak menyesatkan saat berpindah akun.
- [ ] Mock: persistensi pesan di mode mock (saat ini pesan terkirim hilang setelah reload) — perilaku
      baru, bukan bugfix.
- [ ] P1 dari `docs/audits/demo-readiness-selasa-2026-09-29.md` (analitik, timeline, a11y, em dash).
- [ ] P2 backend (eskalasi `prefs.role`, idempotensi kredit wallet, kuota storage, rate limit OTP).
