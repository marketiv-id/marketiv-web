# Payments — Backend

Dokumen ini khusus untuk Appwrite Functions dan aturan backend. Kontrak pemanggilan (input/output/error) dibahas di [60_API.md](60_API.md). Konfigurasi kanonik: `00_BACKEND/appwrite.config.json` (generator `appwrite/generate_appwrite_json.cjs`). Semua Function `node-22`, entrypoint `src/main.js`, kunci API runtime dari header `x-appwrite-key` (fallback `APPWRITE_API_KEY`).

## Ringkasan Konfigurasi

| Function | Trigger | execute | Scopes | Timeout | Enabled |
|---|---|---|---|---|---|
| `create-user-wallet` | event `users.*.create` | `[]` | documents.read/write | 15 | ya |
| `create-payment` | callable | `users` | documents.read/write | 30 | ya |
| `cancel-payment` | callable | `users` | documents.read/write | 15 | ya |
| `midtrans-webhook` | HTTP Midtrans | `any` | documents.read/write | 30 | ya |
| `create-escrow` | event `tables.payments.rows.*.update` | `[]` | documents.read/write | 15 | ya |
| `release-escrow` | event `tables.deliverables.rows.*.update` + `tables.ratecard_deliverable_validations.rows.*.create` | `[]` | documents.read/write | 15 | ya |
| `reconcile-release-escrow` | schedule `*/15 * * * *` | `[]` | documents.read/write | 15 | ya |
| `refund-escrow` | manual (Console/CLI) | `[]` | documents.read/write | 15 | ya |
| `refund-order` | event `tables.orders.rows.*.update` + manual | `[]` | documents.read/write | 15 | ya |
| `request-withdrawal` | callable | `users` | documents.read/write, rows.write | 30 | ya |
| `get-admin-withdrawal-queue` | callable Admin | `users` | documents.read, users.read | 30 | ya |
| `review-withdrawal` | callable Admin | `users` | documents.read/write, rows.write, users.read | 30 | ya |
| `get-umkm-finance-summary` | callable | `users` | documents.read | 30 | ya |
| `fee-rate-flip` | schedule `0 0 * * *` (UTC) | `[]` | documents.read/write | 30 | ya |
| `verify-kyc` | manual (Console/CLI) | `[]` | documents.read/write | 15 | ya |
| `mature-pending-balance` | — (schedule `""`) | `[]` | documents.read/write | 60 | **tidak** (retired) |
| `withdrawal-callback` | — | `[]` | documents.read/write | 30 | **tidak** (retired) |

Event lengkap memakai prefix `databases.<databaseId>.` (lihat `appwrite.config.json`).

## Pola Bersama

- **Increment/decrement atomik**: `src/atomic.js` (salinan identik per Function) memanggil `PATCH /tablesdb/{db}/tables/{table}/rows/{row}/{column}/increment|decrement`; `min`/`max` ditegakkan server. Dipakai untuk `wallets.balance`, `wallets.pendingBalance`, `campaigns.remainingBudget`/`spentAmount`.
- **Transaksi TablesDB**: `request-withdrawal` (`withdrawal-transaction.js`) dan `review-withdrawal` (`withdrawal-transition.js`) membuka `POST /tablesdb/transactions` (`ttl: 60`), men-stage semua tulisan dengan `transactionId`, lalu commit. Butuh scope `rows.write`.
- **Id deterministik**: ledger `tx` + sha256 hex (32 char; `release-escrow` memakai 30 char dari `${referenceId}:${referenceType}:${type}`), notifikasi `ntf` + 29 hex dari `${sourceId}:${kind}`, withdrawal `wd` + 32 hex. Duplikat → `409` dianggap sukses/idempoten.
- **Notifikasi** tidak pernah menggagalkan alur uang; gagal tulis hanya di-log.
- **Admin guard** (`get-admin-withdrawal-queue`, `review-withdrawal`): baris `users` (`userId` = caller) harus `role = admin` dan `status = active`; bila baris `users` tidak ada, fallback Auth user aktif dengan label `admin`. Prefs user tidak dipercaya; lookup gagal → tolak (fail closed).

## Appwrite Functions

### create-payment

- **Guard**: header `x-appwrite-user-id`; baris `users` dengan `status ≠ active` → `403`. Tidak ada cek role eksplisit; kepemilikan order/campaign yang menegakkan akses.
- **Validasi purpose `order`**: `orders.umkm_id|umkmId === caller`, `price ?? amount ?? escrow_amount === amount`, status `pending_payment` (dicek setelah lookup payment eksisting).
- **Validasi purpose `campaign`**: `campaigns.umkmId === caller`, status `draft`, `budget === amount`.
- **Fee**: `fee_amount = floor(amount × FEE_RATE)` hanya untuk campaign; `total_amount = amount + fee_amount` dan nilai inilah `gross_amount` Snap.
- **gateway_reference**: `<ord|cmp>-<paymentId>` (24 karakter); Midtrans membatasi `order_id` 50 karakter dan Function menolak sebelum fetch bila lebih. Id campaign/order dikirim di `custom_field2`, user id di `custom_field1`.
- **Snap**: `POST {app|app.sandbox}.midtrans.com/snap/v1/transactions` dengan Basic auth server key; `finishUrl` opsional dipasang ke `callbacks.finish|unfinish|error`.
- **Idempotensi Rate Card**: lihat [30_Business_Rules.md](30_Business_Rules.md#rate-card-order-payment-lock). Kalah unique race (`409` di create) → baca pemenang lewat `order_payment_key`; tidak membuat Snap kedua.
- **Gagal Snap**: order → payment tetap `pending` + kunci dipertahankan (log `payment-reconciliation-required`); campaign → payment `failed`.
- **Env**: `MIDTRANS_SERVER_KEY` (wajib), `MIDTRANS_ENV` (default `sandbox`; `production` → app.midtrans.com), `FEE_RATE` (default `0.02`), `USERS_/PAYMENTS_/ORDERS_/CAMPAIGNS_COLLECTION_ID`.

### cancel-payment

- **Guard**: `POST`, header user, payment milik caller (`user_id`), status `pending`.
- **Aksi**: campaign → `status: cancelled` lokal; order → `409 gateway_cancellation_required` (tidak ada integrasi cancel Midtrans).
- **Env**: `PAYMENTS_COLLECTION_ID` (+ env Appwrite standar).

### midtrans-webhook

- **Aksi**: validasi field wajib (`order_id`, `status_code`, `gross_amount`, `signature_key`, `transaction_status`) → signature SHA-512 timing-safe → cari payment via `gateway_reference` → bandingkan `gross_amount` dengan `total_amount ?? amount` → map status → update.
- **Update**: `paid` mengisi `paid_at`; status `failed|expired|cancelled` pada payment `order` meng-`null`-kan `order_payment_key` (retry unlocked).
- **Terminal guard**: payment `paid|failed|expired|cancelled` tidak diubah lagi.
- **Konfigurasi WAJIB di luar repo**: URL Function harus didaftarkan di dashboard Midtrans (**Settings → Configuration → Payment Notification URL**). Tanpa itu Snap tetap sukses, tapi `payments.status` selamanya `pending`, `create-escrow` tidak menyala, `campaigns.remainingBudget` tetap 0, dan campaign mandek sebagai draft ("Dana campaign belum masuk"). Cetak URL:

  ```bash
  node 00_BACKEND/appwrite/ops/midtrans-webhook-url.mjs
  ```

- **`execute` harus `["any"]`**: Midtrans memanggil tanpa sesi Appwrite.
- **Env**: `MIDTRANS_SERVER_KEY`, `PAYMENTS_COLLECTION_ID`.

### create-user-wallet

- **Trigger**: `users.*.create`.
- **Aksi**: bila belum ada wallet untuk `userId`, buat `wallets` `{ userId, balance: 0, pendingBalance: 0 }` dengan `read("user:<userId>")`. Idempoten via lookup. Tidak mengirim notifikasi.
- **Env**: `WALLETS_COLLECTION_ID`.

### create-escrow

- **Trigger**: setiap update baris `payments`; payload `status ≠ paid` → `200 ignored`.
- **Campaign** (`purpose = campaign`): klaim ledger `payment` deterministik (`tx` + sha256(`${paymentId}:payment`)) sebagai `pending` → increment `campaigns.remainingBudget` sebesar `payments.amount` → ledger `completed`. Ledger `completed` sudah ada → `already_processed`; ledger `pending` → retry menyelesaikan kredit.
- **Order** (`purpose = order`): cari/buat escrow `{ orderId, amount: payments.amount, status: held, fee_rate: FEE_RATE }` (unique `orderId` sebagai arbiter race) → pastikan ledger `payment` (`referenceType: order`, `completed`) → `orders.status = in_progress` → notifikasi `escrow_held` ke UMKM & creator.
- Tidak mengkredit wallet mana pun.
- **Env**: `FEE_RATE` + collection id payments/wallets/transactions/escrows/orders/campaigns/notifications.

### release-escrow

- **Trigger**: update `deliverables` atau create `ratecard_deliverable_validations`. Payload tidak dipercaya; deliverable, order, validation dimuat ulang.
- **Guard** (gagal → `200 ignored`): order `in_progress|revision`; deliverable `approved` dan versi terbaru; validation `status: valid` dengan snapshot cocok; escrow `held|releasing` (`released` → `already_released`).
- **Aksi**: escrow → `releasing` → ledger `release` (`creatorAmount = amount − floor(amount × fee_rate)`) dan `fee` (bila > 0) dibuat `processing` → bila ledger release belum `completed`, increment `wallets.balance` creator lalu tandai `completed` → ledger fee `completed` → `orders.status = completed` → escrow `released` → notifikasi `escrow_released` (creator) & `order_completed` (UMKM).
- `fee_rate` dari snapshot escrow, fallback `0.02` bila kosong/0. Wallet creator wajib sudah ada (tidak dibuat otomatis).

### reconcile-release-escrow

- **Trigger**: cron `*/15 * * * *`.
- **Aksi**: ambil ≤100 escrow `releasing`; bila ledger `release` `completed` dan (`fee` tidak ada atau `completed`) → escrow `released` + order `completed`. Sisanya dilaporkan `unresolved` (tanpa mutasi wallet).
- **Output**: `{ ok, finalized, unresolved[] }`.

### refund-escrow

- **Trigger**: manual — payload `{ escrowId }` atau `{ orderId }`. `execute: []`.
- **Aksi**: escrow `held` → `refunded` (flip-first) → ledger `refund` `pending` (id `tx` + sha256(`${escrowId}:refund`), `409` → `already_processed`) → find-or-create wallet UMKM (`orders.umkmId`) → increment `balance` `escrow.amount` → ledger `completed` → notifikasi `refund`.
- **Rollback**: increment gagal → hapus ledger `pending`, respons `500`.
- **Fee**: TIDAK dikembalikan.

### refund-order

- **Trigger**: event `orders.rows.*.update` (payload dokumen order) + manual `{ orderId }` / `{ campaignId }`. `execute: []`.
- **Event**: proses hanya bila `status ∈ {cancelled, expired}` dan `oldStatus ≠ status` (bila `oldStatus` tidak ada, tetap diproses). Logika refund escrow identik dengan `refund-escrow`.
- **Manual `orderId`**: order bukan `cancelled|expired` → `409`; 404 bila order tidak ada.
- **Manual `campaignId`**: campaign `cancelled|completed` dan `remainingBudget > 0` → ledger `refund` (`referenceType: campaign`, id `tx` + sha256(`${campaignId}:refund`)) → increment wallet UMKM → decrement `remainingBudget` (min 0) → ledger `completed` → notifikasi `refund_campaign`. Status lain / budget 0 → `ignored`.

### request-withdrawal

- **Trigger**: callable creator/UMKM — `execute: ["users"]`, identitas dari `x-appwrite-user-id`.
- **Hasil**: row `requested`, `balance` di-reserve atomik, ledger `withdrawal` `pending`, notifikasi `type: keuangan` ("umumnya diproses dalam 1–2 hari kerja"). Tidak ada network call ke Iris/payout provider.
- **Langkah**: validasi payload → baca `users` (role, status, T&C, email, KYC) → guard role/UMKM provenance → advanced guards (bila flag) → cek klaim `wd…` eksisting / klaim internal belum selesai → cek wallet & saldo → duplicate 60 detik → buat klaim `failed` + marker → transaksi TablesDB (decrement `balance` min 0, ledger `pending`, status `requested`) → receipt.
- **Recovery**: marker legacy `withdrawal_ledger_pending` diperbaiki (buat ledger lalu `requested`) pada retry key sama; marker `withdrawal_reserve_pending` (ambigu) → `409`, perlu rekonsiliasi Admin.
- **Env**: `MINIMUM_WITHDRAW` (default 50000), `CURRENT_TOS_VERSION` (default `v3.1`), `WITHDRAWAL_ADVANCED_GUARDS_ENABLED`, `KYC_THRESHOLD` (5000000), `WITHDRAW_PER_DAY_LIMIT` (3), `WITHDRAW_COOLING_DAYS` (3), collection id wallets/withdrawals/transactions/users/notifications.

### get-admin-withdrawal-queue

- **Trigger**: callable Admin (`GET`/`POST`) — `execute: ["users"]`.
- **Aksi**: validasi `status` (`requested` default, `processing|succeeded|failed|reversed|all`), `limit` 1–100 (default 50), `offset` 0–10000 → admin guard → list urut `$createdAt` desc → join `creator_profiles` (`displayName`, `username|tiktokHandle`, `avatarUrl`; fallback nama "Content Creator").
- Tidak me-log data rekening.
- **Env**: `USERS_/WITHDRAWALS_/CREATOR_PROFILES_COLLECTION_ID`.

### review-withdrawal

- **Trigger**: callable Admin — `execute: ["users"]`.
- **Actions**: `start_processing` (`requested → processing`), `mark_succeeded` (`processing → succeeded`, wajib `transferReference`), `fail` (`requested|processing → reversed`, wajib `failureReason`). `adminNote` opsional (≤1000).
- **Guard ledger**: tepat satu ledger `withdrawal` milik withdrawal (referenceId, userId, amount cocok) berstatus `pending`; else `409`. `fail` juga wajib wallet ada.
- **Atomik**: satu transaksi TablesDB — reverse: create ledger `withdrawal_reversal` `completed` → increment `balance` → ledger awal `failed` → withdrawal `reversed` (+ `failure_reason`, `reversed_at`, `processedAt`, `processed_by`). Succeed: ledger awal `completed` + withdrawal `succeeded` (+ `processedAt`, `processed_by`, `transfer_reference`).
- **Commit ambigu** (network / HTTP ≥ 500): tidak di-rollback; Function membaca state kanonik untuk membuktikan commit. Terbukti → lanjut sukses + notifikasi; tidak terbukti → `500`. Commit `409` → rollback + `409`.
- **Notifikasi** (`type: keuangan`): `withdrawal_processing`, `withdrawal_succeeded`, `withdrawal_reversed`.

### get-umkm-finance-summary

- **Trigger**: callable (`GET`/`POST`) — `execute: ["users"]`, identitas dari `x-appwrite-user-id`. Read-only.
- **Aksi**: paginasi penuh (100/halaman, cap 5000 dokumen per sumber) atas `payments` (`user_id`), `transactions` (`userId`), `campaigns` (`umkmId`), `orders` (`umkmId`), lalu `escrows` `held` per chunk 100 `orderId`.

| Field | Sumber |
| --- | --- |
| `finance.totalExpenses` | Σ `payments.total_amount` `paid` (termasuk fee) |
| `finance.escrowBalance` | = `escrow.activeEscrow` |
| `finance.pendingPayments` | Σ `payments.total_amount` `pending` |
| `finance.refundsReceived` | Σ `transactions.amount` `type: refund` |
| `finance.platformFees` | Σ `payments.fee_amount` `paid` (dibaca dari kolom) |
| `finance.successfulTransactionsCount` | jumlah `payments` `paid` |
| `escrow.campaignEscrow` | Σ `campaigns.remainingBudget` status `active`/`paused` |
| `escrow.rateCardEscrow` | Σ `escrows.amount` `held` milik order UMKM |
| `escrow.activeEscrow` | `campaignEscrow + rateCardEscrow` |
| `escrow.pendingRelease` | escrow `held` yang order-nya `approved` |
| `escrow.refundEligible` | Σ `campaigns.remainingBudget` status `completed` |
| `isTruncated` (keduanya) | ada sumber yang mencapai cap 5000 |

### fee-rate-flip

- **Trigger**: cron `0 0 * * *`.
- **Aksi**: hitung semua `transactions` `status: completed` (cursor paginasi). ≥ 1000 → log alert + notifikasi `type: system` ke `ADMIN_NOTIFY_USER_ID` (id harian deterministik). Tidak mengubah `FEE_RATE`.
- **Output**: `{ count, thresholdReached, rate }`.
- **Env**: `FEE_RATE`, `ADMIN_NOTIFY_USER_ID` (opsional), `TRANSACTIONS_/NOTIFICATIONS_COLLECTION_ID`.

### verify-kyc

- **Trigger**: INTERNAL (admin/Console/CLI) — `execute: []`.
- **Aksi**: `{ userId }` → `users.kyc_status = "verified"` + `kyc_verified_at`, notifikasi `kyc_verified`. Idempoten.
- **Alur dokumen**: verifikasi lewat WhatsApp admin (di luar sistem). Hanya relevan bila advanced guards aktif.
- **Env**: `USERS_COLLECTION_ID`, `NOTIFICATIONS_COLLECTION_ID`.

### mature-pending-balance (retired)

- `enabled: false`, `schedule: ""`, `execute: []` sejak 2026-08-25. Source disimpan untuk audit.
- Perilaku source: ledger `release` + `referenceType: campaign_submission` + `status: completed` berumur ≥ 7 hari → ledger `mature` (`tx` + sha256(`${txId}:mature`)) → decrement `pendingBalance`, increment `balance` → sumber ditandai `matured`.
- Jalur reward aktif (`calculate-campaign-reward`) tidak pernah menulis `status: completed`, jadi Function ini tidak punya input.
- Jangan aktifkan ulang tanpa inventory baru (`appwrite/ops/audit-legacy-money-state.mjs`).

### withdrawal-callback (retired)

- `enabled: false`, `execute: []` sejak 2026-08-25. Retirement evidence: zero withdrawal `processing` dan zero row `iris_reference`.
- Source dan kolom `iris_reference` dipertahankan untuk audit. Setup lama: [101_Iris_Webhook_Security_Setup.md](101_Iris_Webhook_Security_Setup.md).

### calculate-campaign-reward (milik modul Campaigns)

- Disebut di sini karena mengkredit wallet: event `campaign_submissions.rows.*.update`, submission `approved` → reward `min(floor(views/1000 × rewardPer1000Views), remainingBudget)` → increment `wallets.balance` creator → ledger `release` `matured` → decrement `remainingBudget`, increment `spentAmount` → campaign `completed` bila budget habis. Detail di modul Campaigns.

## Aturan Backend

- `MINIMUM_WITHDRAW` server = env Function `request-withdrawal` (default `50000`). Konstanta klien (`src/types/domain.ts`, `00_BACKEND/src/services/wallet.service.ts`) hanya untuk validasi UI. Lihat [ADR-007](../../04_Decisions/ADR-007.md).
- Withdrawal mengikuti manual Admin flow `requested → processing → succeeded|reversed`; tidak ada automated payout provider.
- `mark_succeeded` berarti Admin sudah transfer manual dan wajib mencatat `transfer_reference`.
- Webhook Midtrans wajib valid signature dan nominal sebelum mengubah status payment; payment terminal tidak pernah diubah.
- `balance` tidak boleh negatif — ditegakkan server (`decrement` `min: 0` dan kolom `min: 0`).
- Escrow, wallet, transactions, dan status withdrawal hanya diubah Function (API key).
- Setiap mutasi `balance` disertai baris `transactions`; kredit `campaigns.remainingBudget` dari top-up juga.
