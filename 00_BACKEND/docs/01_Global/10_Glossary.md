# 10_Glossary

Istilah inti domain Marketiv. Satu baris per istilah. Detail teknis tiap entitas ada di modul terkait ([`../02_Modules/`](../02_Modules/)).

## Aktor

- **UMKM** — Pelaku usaha (non-tech) yang membuat campaign, memesan jasa creator, dan membayar.
- **Content Creator** — Pembuat konten (mayoritas Gen-Z, mobile) yang meng-claim campaign, menerbitkan rate card, menerima order, mengunggah konten/deliverable, dan menerima reward/escrow release.
- **Admin** — Internal Marketiv (app terpisah `admin/`): memvalidasi submission campaign & mengisi views, memvalidasi deliverable rate card, memproses withdrawal (transfer manual), moderasi user (suspend/appeal), verifikasi KYC, refund dispute manual. Dikenali dari `users.role = admin`.

## Campaign & Konten

- **Campaign** — Program konten berbayar dari UMKM untuk creator.
- **Pay-Per-View (PPV)** — Model campaign yang membayar creator berdasarkan jumlah views konten.
- **UGC** — User Generated Content; campaign meminta creator membuat konten produk berbasis aset digital (foto/video) dari UMKM tanpa pengiriman sampel fisik produk di MVP.
- **Clipping** — Campaign memotong/mengedit ulang konten panjang (mis. podcast/live streaming) dari link/aset UMKM menjadi klip pendek tanpa pengiriman sampel fisik produk.
- **Brief** — Panduan campaign (objective, content angle, CTA, do & don't, materi) yang bisa dibuat manual atau lewat AI Brief Generator; disimpan di tabel `campaign_briefs_v2`.
- **Job Pool** — Daftar campaign aktif yang bisa diklaim creator.
- **Rate Card** — Daftar layanan & harga yang dipublikasikan creator.
- **Package** — Paket di dalam rate card (Basic/Standard/Premium) dengan harga, lama pengerjaan, limit revisi.
- **Offer** — Penawaran (custom price, opsional merujuk paket) dari UMKM ke creator di ruang negosiasi (chat).
- **Order** — Aggregate transaksi rate card (dibuat dari offer yang diterima) yang mengikat escrow & deliverable.
- **Deliverable** — Hasil kerja/bukti creator yang dikirim pada sebuah order (berversi).
- **Validasi Deliverable** — Keputusan Admin atas deliverable rate card (`ratecard_deliverable_validations`); syarat wajib sebelum escrow dirilis.
- **Review Deadline** — Tenggat UMKM mereview deliverable (`orders.review_deadline_at`); lewat tenggat → auto-approve.
- **Submission** — Bukti posting konten campaign PPV oleh creator (post URL); views diisi Admin saat validasi. Dinilai fraud. Hanya untuk model Campaign.
- **Claim** — Aksi creator mengambil sebuah campaign sebelum membuat submission.

## Finansial

- **Wallet** — Dompet per user (`balance` + `pendingBalance`). Reward campaign dan release escrow masuk ke `balance`; `pendingBalance` adalah sisa model lama (pematangan dipensiunkan).
- **Escrow** — Dana order rate card yang ditahan sistem (tabel `escrows`, satu per order), hanya dikelola Appwrite Function, dirilis saat deliverable disetujui UMKM dan divalidasi Admin. Budget campaign PPV tidak memakai `escrows`, melainkan `campaigns.remainingBudget`.
- **CPM / reward per 1000 views** — Tarif imbalan campaign PPV per 1000 views (`rewardPer1000Views`).
- **Platform Fee** — Potongan 2% (env `FEE_RATE`, default 0.02): buyer-side untuk campaign, seller-side untuk rate card ([ADR-008](../04_Decisions/ADR-008.md)).
- **Withdrawal** — Penarikan saldo wallet ke rekening; status `requested → processing → succeeded | failed | reversed`, diproses manual Admin.
- **Transaction (ledger)** — Catatan mutasi saldo append-only di `transactions` (`type` mis. `payment`, `escrow_held`, `release`, `fee`, `reward`, `refund`, `withdrawal`, `withdrawal_reversal`).

## Akun & Kepatuhan

- **Status Akun** — `users.status`: `active`, `suspended`, `terminated`. Function sensitif menolak akun non-`active`.
- **Appeal (Banding)** — Pengajuan banding user atas suspend/terminate (tabel `appeals`).
- **KYC** — Verifikasi identitas manual oleh Admin (`users.kyc_status`: `none`, `pending_wa`, `verified`).
- **ToS** — Versi Syarat & Ketentuan yang disetujui user (`users.tos_version`, `tos_accepted_at`).

## Fraud

- **Fraud Score** — Skor numerik risiko submission 0–100 dari `ai-fraud-precheck` (`fraudScore`).
- **Fraud Status** — Hasil penilaian fraud: `safe` (skor ≤ 30), `review` (≤ 70, perlu ditinjau admin), `rejected` (> 70).
