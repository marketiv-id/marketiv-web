# 02 — Modules

Daftar modul fungsional Marketiv (platform UMKM ↔ Content Creator untuk promosi digital: Campaign PPV & Rate Card/Order dengan Escrow, di atas Appwrite + Next.js). Setiap modul punya folder sendiri dengan dokumen Overview, Business Rules, Flow, Database, API, Backend, Events, dan Testing sesuai kebutuhan.

## Daftar Modul

- **Authentication** — Registrasi (`create-user-profile`), login (email/password & Google OAuth di balik flag), reset password via OTP, verifikasi email, persetujuan ToS. Tidak memiliki `50_Database.md`; tabel `otp_rate_limits` didokumentasikan di `Authentication/70_Backend.md`.
- **Users** — Profil pengguna: baris `users`, profil UMKM & Creator, akun sosial, portfolio, kuota berkas, moderasi akun (suspend, banding).
- **Campaigns** — Campaign Pay-Per-View (PPV): draft, pendanaan, aktif/jeda, claim, submission, validasi Admin, reward, fraud check record.
- **RateCards** — Katalog layanan creator (rate card + paket). Tidak punya Function; ditulis langsung dari klien dengan permission baris pemilik.
- **Chat** — Ruang negosiasi UMKM ↔ Creator (percakapan, pesan `text`/`offer`, baca, arsip, push notifikasi).
- **Offers** — Custom offer di dalam percakapan; diterima creator → memicu pembuatan order.
- **Orders** — Aggregate utama jalur Rate Card: order, deliverable, revisi, tenggat review/auto-approve, validasi deliverable Admin.
- **Payments** — Wallet, pembayaran Midtrans, escrow, ledger transaksi, refund, withdrawal (manual Admin), KYC, monitor fee.
- **AI** — AI Brief Generator dan AI Fraud Detection (pre-check). Chatbot landing ada di frontend (`src/app/api/chat/route.ts`), bukan Function.
- **Notifications** — Notifikasi in-app (tabel `notifications`) yang ditulis Function lintas modul; push hanya untuk chat.

## Lihat Juga

- [10_Domain_Model.md](10_Domain_Model.md) — Seluruh 32 tabel, modul pemilik, dan relasi antar tabel.

## Katalog Appwrite Function

**Sumber tunggal** pemetaan 67 Function → modul pemilik. Data trigger/timeout/status diambil dari `00_BACKEND/appwrite.config.json`; kode di `00_BACKEND/functions/<id>/src/main.js`. Semua Function memakai runtime `node-22`. Event tabel ditulis ringkas `<tabel>.<aksi>`; bentuk lengkapnya `databases.6a4c8598001da3b0d7f0.tables.<tabel>.rows.*.<aksi>`. Event `users.*.create|update` adalah event akun Appwrite Auth (ditulis apa adanya). Jadwal cron dievaluasi Appwrite (UTC). Detail kontrak tiap Function ada di `60_API.md` / `70_Backend.md` modul pemiliknya.

Legenda trigger: `execute users` = dipanggil user login (`executeFunction`); `execute any` = publik/webhook; `internal` = hanya API key/Console (admin/CLI); `event`/`cron` = otomatis.

### Authentication (5)

| Function | Trigger | Timeout | Status |
| --- | --- | --- | --- |
| `create-user-profile` | event `users.*.create`; execute `users` | 15s | enabled |
| `request-password-otp` | execute `any` | 15s | enabled |
| `reset-password-with-otp` | execute `any` | 15s | enabled |
| `user-email-verified` | event `users.*.update` | 15s | enabled |
| `accept-tos` | execute `users` | 15s | enabled |

### Users (10)

| Function | Trigger | Timeout | Status |
| --- | --- | --- | --- |
| `update-profile` | execute `users` | 15s | enabled |
| `get-umkm-profile` | execute `users` | 15s | enabled |
| `get-creator-profile` | execute `users` | 15s | enabled |
| `get-creator-directory` | execute `users` | 30s | enabled |
| `validate-and-upload` | execute `users` | 30s | enabled |
| `delete-file` | execute `users` | 15s | enabled |
| `suspend-user` | internal (`execute: []`) | 15s | enabled |
| `unsuspend-user` | internal (`execute: []`) | 15s | enabled |
| `create-appeal` | execute `users` | 15s | enabled |
| `review-appeal` | internal (`execute: []`) | 15s | enabled |

### Campaigns (12)

| Function | Trigger | Timeout | Status |
| --- | --- | --- | --- |
| `patch-campaign-draft` | execute `users` | 15s | enabled |
| `patch-campaign-status` | execute `users` | 15s | enabled |
| `campaign-published` | event `campaigns.update` | 15s | enabled |
| `campaign-claimed` | event `campaign_claims.create` | 15s | enabled |
| `unclaim-campaign` | execute `users` | 15s | enabled |
| `expire-stale-claims` | cron `0 */6 * * *` | 60s | enabled |
| `submit-campaign-proof` | execute `users` | 15s | enabled |
| `review-submission` | execute `users` | 15s | enabled |
| `calculate-campaign-reward` | event `campaign_submissions.update` | 30s | enabled |
| `get-admin-submission-queue` | execute `users` | 30s | enabled |
| `get-umkm-dashboard-summary` | execute `users` | 30s | enabled |
| `get-admin-dashboard-summary` | execute `users` | 30s | enabled |

### AI (2)

| Function | Trigger | Timeout | Status |
| --- | --- | --- | --- |
| `ai-brief` | execute `users` | 30s | enabled |
| `ai-fraud-precheck` | event `campaign_submissions.create` | 60s | enabled |

### Chat (7)

| Function | Trigger | Timeout | Status |
| --- | --- | --- | --- |
| `create-conversation` | execute `users` | 15s | enabled |
| `send-message` | execute `users` | 15s | enabled |
| `mark-conversation-read` | execute `users` | 15s | enabled |
| `patch-conversation-archive` | execute `users` | 15s | enabled |
| `get-umkm-negotiations` | execute `users` | 30s | enabled |
| `get-creator-negotiations` | execute `users` | 30s | enabled |
| `send-chat-notification` | event `messages.create` | 15s | enabled |

### Offers (1)

| Function | Trigger | Timeout | Status |
| --- | --- | --- | --- |
| `create-offer` | execute `users` | 15s | enabled |

### Orders (10)

| Function | Trigger | Timeout | Status |
| --- | --- | --- | --- |
| `create-order` | event `offers.update` | 15s | enabled |
| `cancel-order` | execute `users` | 15s | enabled |
| `submit-ratecard-deliverable` | execute `users` | 15s | enabled |
| `request-ratecard-revision` | execute `users` | 15s | enabled |
| `track-order-review` | event `deliverables.create` | 15s | enabled |
| `auto-approve-orders` | cron `0 * * * *` | 15s | enabled |
| `review-ratecard-deliverable` | execute `users` | 30s | enabled |
| `get-admin-ratecard-deliverable-queue` | execute `users` | 30s | enabled |
| `get-umkm-ratecard-reviews` | execute `users` | 15s | enabled |
| `sync-order-revision` | internal (`execute: []`) | 15s | **disabled** |

### Payments (18)

| Function | Trigger | Timeout | Status |
| --- | --- | --- | --- |
| `create-user-wallet` | event `users.*.create` | 15s | enabled |
| `create-payment` | execute `users` | 30s | enabled |
| `cancel-payment` | execute `users` | 15s | enabled |
| `midtrans-webhook` | execute `any` | 30s | enabled |
| `create-escrow` | event `payments.update` | 15s | enabled |
| `release-escrow` | event `deliverables.update`, `ratecard_deliverable_validations.create` | 15s | enabled |
| `reconcile-release-escrow` | cron `*/15 * * * *` | 15s | enabled |
| `refund-escrow` | internal (`execute: []`) | 15s | enabled |
| `refund-order` | event `orders.update` | 15s | enabled |
| `request-withdrawal` | execute `users` | 30s | enabled |
| `review-withdrawal` | execute `users` | 30s | enabled |
| `get-admin-withdrawal-queue` | execute `users` | 30s | enabled |
| `withdrawal-callback` | internal (`execute: []`) | 30s | **disabled** |
| `mature-pending-balance` | internal (`execute: []`) | 60s | **disabled** |
| `verify-kyc` | internal (`execute: []`) | 15s | enabled |
| `fee-rate-flip` | cron `0 0 * * *` | 30s | enabled |
| `get-umkm-finance-summary` | execute `users` | 30s | enabled |
| `get-creator-dashboard-summary` | execute `users` | 30s | enabled |

### Notifications (2)

| Function | Trigger | Timeout | Status |
| --- | --- | --- | --- |
| `mark-notifications-read` | execute `users` | 15s | enabled |
| `notify-order-activity` | event `deliverables.create`, `revisions.create` | 15s | enabled |

> Catatan: `get-*-dashboard-summary`, `get-umkm-finance-summary`, dan `get-*-negotiations` adalah DTO baca yang menggabungkan beberapa tabel lintas modul; pemiliknya ditetapkan di atas agar satu Function punya satu rumah dokumentasi.
