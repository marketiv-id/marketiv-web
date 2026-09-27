# ✅ TASKS — Demo Readiness P0

> Branch: `demo-readiness` (dibuat dari `staging` untuk pekerjaan P0/P1/P2).
> Urutan eksekusi mengikuti `design.md` §8: klaster teks → kontrol/navigasi → interaksi →
> mock/agregat, lalu gate verifikasi. Setiap task = satu commit, test-first.
>
> Status per 27 September 2026: Task 1-4 **selesai**, Task 5 sebagian (yang butuh klik browser
> manusia ditandai belum).

---

## Task 0 — Prasyarat

- [x] 0.1 Keputusan **D-1** (hapus tombol "Urutkan dari") — dicatat di `bugfix.md` §5.
- [x] 0.2 Keputusan **D-2** (hapus tombol "Simpan Preferensi", toggle tetap disabled).
- [x] 0.3 Keputusan **D-3** (mock gagal-tertutup untuk kreator tanpa ruang).
- [x] 0.4 Keputusan **D-4** (`navigator.share` + fallback clipboard).
- [ ] 0.5 Konfirmasi mode data demo (D-5 diputuskan **mock**; **cek bilah demo di
      `/dashboard/umkm` pada staging/prod masih perlu dilakukan manusia** — hanya itu cara
      membuktikan `NEXT_PUBLIC_USE_MOCK_DATA=true` di environment deploy).
- [x] 0.6 Baseline bersih: `npx tsc --noEmit` lolos; tiga berkas tes yang timeout saat suite penuh
      (`NegotiationRoomPage.package-prefill`, `umkm-dashboard.thumbnail-legacy`,
      `rate-card-tos-preflight`) terbukti lulus saat dijalankan sendiri (flake beban).

---

## Task 1 — Klaster B: klaim & teks yang menyesatkan ✅

_Requirements: 1.6, 1.7, 1.8, 1.9 · Contract: 2.6, 2.7, 2.8, 2.9_

- [x] 1.1 Tes merah: kasus `isVerified: false` dan `true` pada badge hero.
- [x] 1.2 `CreatorProfileHero.tsx`: badge dibungkus `creator.isVerified && (…)`.
- [x] 1.3 Tes merah: `active-work-honesty.test.tsx` untuk judul bukti tayang.
- [x] 1.4 `ActiveWorkDetailView.tsx`: judul menjadi "URL Bukti Tayang".
- [x] 1.5 `RoleChooser.tsx`: copy tanpa "ratusan"/"ribuan" + tes `role-chooser-copy.test.tsx`.
- [x] 1.6 `CampaignsPage.tsx`: copy empty state tanpa angka + variasi dipindah ke
      `campaignsEmptyVariants.ts` agar bisa diuji tanpa memuat seluruh halaman.
- [x] 1.7 Verifikasi task: `npx tsc --noEmit` bersih, eslint bersih, 15 tes lolos.
- [x] 1.8 Commit `d6a7173` — "Drop unverified claims from creator and campaign UI".

**Bukti**: 4 berkas tes (1 diperluas, 3 baru) gagal sebelum perbaikan, hijau sesudahnya.

---

## Task 2 — Klaster A: kontrol mati & navigasi salah ✅

_Requirements: 1.1, 1.2, 1.3, 1.4, 1.5 · Contract: 2.1, 2.2, 2.3, 2.4, 2.5_

- [x] 2.1-2.2 "Lihat Riwayat Transaksi" → `router.push(routes.umkmFinance)`, tes
      `campaign-quick-actions.test.tsx` membuktikan navigasi terjadi dan toast tidak dipakai lagi.
- [x] 2.3-2.4 Tautan "Detail" kartu rekomendasi → `routes.kreatorJobDetail(job.id)`, tes
      `creator-dashboard-navigation.test.tsx`.
- [x] 2.5-2.6 Tombol share punya `handleShare` (share → clipboard → toast) + `aria-label`;
      blok "Urutkan dari" dihapus. Tes `job-detail-controls.test.tsx` (2 kasus).
- [x] 2.7-2.8 Tombol "Simpan Preferensi" dihapus; keterangan "Fitur notifikasi akan segera hadir."
      tetap ada. Tes `settings-notification-panel.test.tsx`.
- [x] 2.9 Verifikasi task: tsc bersih, 30 tes lolos di suite creator-dashboard + campaign detail.
- [x] 2.10 Commit `1a4eb66` — "Replace dead controls with real behaviour".

**Catatan UI**: tidak ada perubahan warna/ukuran/radius; hanya perilaku, semantik, dan satu
penghapusan kontrol. Blok "Urutkan dari" diganti satu baris keterangan agar tinggi kartu tidak
melompat.

---

## Task 3 — Klaster C: ketahanan interaksi ✅

_Requirements: 1.10, 1.11 · Contract: 2.10, 2.11_

- [x] 3.1 Tes merah: `claim-modal-keyboard.test.tsx` — 4 checkbox asli, tombol klaim terkunci lalu
      terbuka setelah keempatnya dicentang (klik pada checkbox = jalur yang sama dengan Space).
- [x] 3.2 `ClaimCampaignModal.tsx`: baris ketentuan menjadi `label` + `input[type=checkbox].sr-only`
      dengan `peer-focus-visible` ring; kotak visual tidak berubah.
- [x] 3.3-3.4 `CreatorDashboardView.tsx`: prop `isClaiming` diteruskan ke kartu; tombol menonaktifkan
      diri dan berlabel "Mengklaim…". Tes `creator-dashboard-claim-state.test.tsx`.
- [x] 3.5 Verifikasi task: 37 tes lolos (creator-dashboard + campaign), termasuk preflight TOS yang
      sudah ada.
- [x] 3.6 Commit `fe0be93` — "Make claim flow keyboard-accessible and prevent double claim".

---

## Task 4 — Klaster D: konsistensi data mock & agregat ✅

_Requirements: 1.12, 1.13, 1.14, 1.15, 1.16 · Contract: 2.12, 2.13, 2.14, 2.15, 2.16_

- [x] 4.1-4.3 Sumber mock baru `src/mocks/creator-messages.mock.ts` + wiring
      `creator-dashboard.service.ts`. Tes `creator-mock-messages.test.ts` (3 kasus, termasuk
      invarian "setiap ruang negosiasi punya pesan dengan conversationId cocok").
- [x] 4.4-4.5 `createConversation` mode mock gagal-tertutup (`code: "not_found"`). Tes
      `create-conversation.mock.test.ts`.
- [x] 4.6-4.7 `deriveOverviewKpis` + `MOCK_SEED_KPIS` di `overview.mock.ts`, dipakai facade
      `getOverview`. Tes `overview-kpis.test.ts` (termasuk pembuktian KPI ikut berubah saat daftar
      campaign bertambah).
- [x] 4.8 "Total Kampanye" = aktif + selesai, catatan "Aktif & selesai". Tes
      `CampaignSummaryCards.test.tsx`.
- [x] 4.9 "Tarif Mulai Dari" → `—` tanpa unit saat belum ada harga; ekspektasi tes lama
      `CreatorSummaryCards.test.tsx` yang mengunci "Rp 0" diperbarui (invariant 3.7).
- [x] 4.10 Verifikasi task: tsc bersih, 60 tes lolos dari 61 (1 timeout = flake beban yang lulus
      saat dijalankan sendiri), eslint bersih.
- [x] 4.11 Commit `36793f5` — "Derive mock KPIs and stop mixing payment count into totals".

---

## Task 5 — Gate verifikasi akhir

_Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8_

- [x] 5.1 `npx tsc --noEmit` → nol error (dijalankan setiap task).
- [x] 5.2 `npx eslint` pada berkas yang disentuh → nol error, nol warning baru.
- [ ] 5.3 `npx vitest run` suite penuh → dijalankan; catat kegagalan timeout yang tersisa dan
      buktikan tiap-tiapnya lulus saat dijalankan sendiri.
- [ ] 5.4 Klik manual di browser (**belum dijalankan: butuh manusia**, agent tidak menjalankan
      dev server). Daftar langkah 5.4.1-5.4.9 di bawah siap dipakai sebagai checklist QA.
- [x] 5.5 `docs/audits/demo-readiness-selasa-2026-09-29.md` bagian P0 ditandai selesai + bukti.
- [ ] 5.6 Push branch `demo-readiness` (branch sudah ada; commit dikirim setelah dokumen ini).

### 5.4 Checklist QA manual (untuk manusia)

- [ ] 5.4.1 Detail campaign → "Lihat Riwayat Transaksi" → halaman keuangan terbuka.
- [ ] 5.4.2 Dashboard kreator → "Detail" pada rekomendasi → detail job yang benar.
- [ ] 5.4.3 Detail job → share → tautan tersalin + toast.
- [ ] 5.4.4 Modal klaim → Tab + Space pada 4 ketentuan → tombol klaim aktif.
- [ ] 5.4.5 Klaim job → tombol menampilkan "Mengklaim…" lalu kembali normal.
- [ ] 5.4.6 Pengaturan kreator → panel notifikasi tanpa tombol simpan.
- [ ] 5.4.7 Direktori kreator → profil non-verifikasi tanpa badge.
- [ ] 5.4.8 Ruang negosiasi kreator (mock) → riwayat pesan terisi.
- [ ] 5.4.9 Overview UMKM → KPI "Total Kreator" = jumlah slot terpakai pada daftar campaign.

---

## 6. Definition of Done

- [x] Kriteria 2.1 … 2.16 punya tes yang gagal sebelum perbaikan dan hijau sesudahnya.
- [x] Invariant 3.1 … 3.8 terbukti (tsc, eslint, tes suite terkait, tidak ada berkas di luar daftar).
- [ ] Bukti klik manual tercatat (menunggu QA manusia — agent tidak bisa menjalankan browser).

---

## 7. Follow-up (bukan bagian P0)

- [ ] Backend: tambah `totalCampaigns` (atau hitungan semua status) ke DTO `get-umkm-dashboard-summary`
      supaya catatan "Semua status" bisa kembali jujur.
- [ ] Mock: buat ruang negosiasi baru secara dinamis di demo store (menggantikan perilaku
      gagal-tertutup pada D-3) bila demo butuh chat untuk semua kreator.
- [ ] Mock: selaraskan id ruang negosiasi sisi UMKM dan sisi kreator (`conv_001` dipakai dua dunia
      berbeda) supaya data demo tidak menyesatkan saat berpindah akun.
- [ ] Mock: persistensi pesan di mode mock (saat ini pesan terkirim hilang setelah reload).
- [ ] P1 dari `docs/audits/demo-readiness-selasa-2026-09-29.md` (analitik, timeline, a11y, em dash).
- [ ] P2 backend (eskalasi `prefs.role`, idempotensi kredit wallet, kuota storage, rate limit OTP).
