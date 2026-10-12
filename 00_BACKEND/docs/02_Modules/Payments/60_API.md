# Payments — API

Kontrak pemanggilan modul Payments. Implementasi Function: [70_Backend.md](70_Backend.md).

## Lapisan Pemanggil

- **Frontend aktif** (root `src/`) memanggil Function lewat `executeFunction(FUNCTION_IDS.*)` (`src/lib/appwrite/functions.ts`) dan membaca tabel lewat Appwrite Client SDK:
  - `src/services/umkm/umkm-appwrite.service.ts` — `createCampaignPaymentInAppwrite`, `createOrderPaymentInAppwrite`, `cancelPaymentInAppwrite`, ringkasan keuangan UMKM.
  - `src/services/creator/creator-appwrite.service.ts` — `requestWithdrawalInAppwrite`, `getCreatorTransactionsFromAppwrite`.
  - Admin app `admin/src/features/admin/withdrawals/services/withdrawal.service.ts` — queue & review withdrawal.
- **Service referensi backend** `00_BACKEND/src/services/payment.service.ts` dan `wallet.service.ts` (Client SDK). `wallet.service.ts:requestWithdraw()` masih versi lama yang menulis `withdrawals`/`wallets`/`transactions` langsung (status `processed`) — **tidak sesuai** permission tabel saat ini dan tidak dipakai frontend. Jalur resmi: Function `request-withdrawal`.

Semua callable Function memakai identitas header `x-appwrite-user-id` (sesi Appwrite), bukan `userId` dari body.

---

## Client SDK (baca)

| Fungsi | Tabel | Query | Akses |
|---|---|---|---|
| `getWallet()` | `wallets` | `userId = me`, limit 1 | row `read(user)` |
| `getTransactions({ type?, limit? })` | `transactions` | `userId = me`, `$createdAt` desc, default 50 | row `read(user)` |
| `getWithdrawals({ limit? })` | `withdrawals` | `userId = me`, `$createdAt` desc, default 50 | row `read(user)` |
| `getPayment(paymentId)` / `getPayments({ status?, purpose?, limit? })` | `payments` | `user_id = me` | row `read(user)` |

`escrows` tidak terbaca dari browser; gunakan DTO Function (`get-umkm-finance-summary`, `get-*-negotiations`).

---

## Callable Functions

### `create-payment` — UMKM

- **Input**: `{ purpose: 'order' | 'campaign', amount: integer > 0, orderId?, campaignId?, finishUrl? }`. `orderId` wajib untuk `order`; `campaignId` wajib untuk `campaign` dan dilarang untuk purpose lain. `amount` = harga order / budget campaign **dasar** (tanpa fee).
- **Output 200**: `{ paymentId, gateway: 'midtrans', snapToken?, redirectUrl?, status: 'pending', reused? }`.
- **Errors**:
  - `400` — `Invalid payment purpose` (termasuk `topup`), `Invalid payment amount`, `orderId is required for order payment`, `campaignId is required for campaign payment`, `campaignId is only valid for campaign payment`.
  - `401` — tanpa sesi. `405` — bukan `POST`.
  - `403` — akun tidak aktif; order/campaign bukan milik caller.
  - `409` — nominal tidak cocok; order bukan `pending_payment`; campaign bukan `draft`; `code: payment_already_paid`; `code: payment_preparing` (intent pending belum punya token).
  - Status HTTP Midtrans + pesan Midtrans bila Snap menolak; `500` lainnya.

### `cancel-payment` — pemilik payment

- **Input**: `{ paymentId }`.
- **Output 200**: `{ ok: true }` (hanya payment campaign `pending`).
- **Errors**: `400 paymentId wajib diisi`, `401`, `403` bukan pemilik, `404` tidak ditemukan, `405`, `409` status bukan `pending`, `409 { code: 'gateway_cancellation_required', paymentId, status }` untuk payment order.

### `request-withdrawal` — Creator / UMKM

- **Input**: `{ amount, payoutMethod: 'bank' | 'ewallet', providerName, accountNumber, accountName, requestKey, sourceOrigin? }`. `sourceOrigin` (`umkm_refund | umkm_budget`) wajib untuk UMKM.
- **Output 200**: `{ withdrawalId, amount, status: 'requested', requestedAt, balanceAfter, transactionId }`. Retry dengan `requestKey` + data sama mengembalikan receipt yang sama.
- **Errors**:
  - `400` — nominal tidak valid / di bawah minimum, metode tidak valid, data tujuan kosong, nomor rekening bukan 6–20 digit, panjang field berlebih, `requestKey wajib diisi`.
  - `401`, `405`.
  - `403` — role bukan creator/UMKM; UMKM tanpa `sourceOrigin` valid atau tanpa bukti ledger; akun tidak aktif; T&C belum disetujui; (strict) email belum terverifikasi / KYC belum `verified`.
  - `404` — wallet tidak ditemukan.
  - `409` — saldo tidak mencukupi; `requestKey` sama dengan data berbeda; duplikat 60 detik; klaim sebelumnya belum selesai; marker legacy perlu rekonsiliasi.
  - `429` — (strict) batas harian / cooling rekening baru.
  - `500` — reserve gagal atau status commit belum pasti (ulangi dengan `requestKey` sama).

### `get-admin-withdrawal-queue` — Admin aktif

- **Input** (`GET`/`POST`): `{ status?: 'requested' (default) | 'processing' | 'succeeded' | 'failed' | 'reversed' | 'all', limit?: 1–100 (default 50), offset?: 0–10000 }`.
- **Output 200**: `{ items: AdminWithdrawalDto[], total, limit, offset }`; item = `{ id, userId, creator: { name, username, avatarUrl }, amount, payoutMethod, providerName, accountNumber, accountName, status, requestedAt, processingAt, processedAt, failureReason, transferReference, adminNote, processedBy }`.
- **Errors**: `400` status/limit/offset tidak valid, `401`, `403 Akses Admin ditolak.`, `405`, `500`.

### `review-withdrawal` — Admin aktif

- **Input**: `{ withdrawalId, action: 'start_processing' | 'mark_succeeded' | 'fail', transferReference?, failureReason?, adminNote? }`.
- **Output 200**: `{ success: true, withdrawalId, status: 'processing' | 'succeeded' | 'reversed' }`.
- **Errors**: `400` withdrawal/action tidak valid, `transferReference` kosong untuk `mark_succeeded`, `failureReason` kosong untuk `fail`; `401`; `403`; `404`; `409` transisi tidak diizinkan / ledger pending tidak ditemukan / wallet tidak ada / data sudah berubah; `500` commit belum dapat dipastikan.

### `get-umkm-finance-summary` — UMKM

- **Input**: tidak ada (`GET`/`POST`).
- **Output 200**: `{ finance: { totalExpenses, escrowBalance, pendingPayments, refundsReceived, platformFees, successfulTransactionsCount, isTruncated }, escrow: { activeEscrow, pendingRelease, refundEligible, campaignEscrow, rateCardEscrow, isTruncated } }`. Pemetaan angka: [70_Backend.md](70_Backend.md#get-umkm-finance-summary).
- **Errors**: `401`, `405`, `500`.

---

## Server-only Functions

Tidak dapat dipanggil browser (`execute: []`, kecuali webhook).

### `midtrans-webhook` — HTTP Midtrans (`execute: ["any"]`)

- **Input**: notifikasi Midtrans (`order_id`, `status_code`, `gross_amount`, `signature_key`, `transaction_status`, `fraud_status?`, `settlement_time?`, `transaction_time?`).
- **Output**: `200 { status: 'ok', paymentId, paymentStatus }` | `200 { status: 'ok', test: true }` | `200 { status: 'ignored' }`.
- **Errors**: `400` body/field wajib, `401 Invalid signature`, `404 Payment not found`, `405`, `409 Amount mismatch`.
- Satu-satunya jalur yang menandai payment `paid`.

### `refund-escrow` — manual

- **Input**: `{ escrowId }` atau `{ orderId }`.
- **Output**: `{ status: 'ok', escrowId, walletId, amount }` | `{ status: 'ignored', reason }` | `{ status: 'already_processed' }`.

### `refund-order` — event + manual

- **Input**: dokumen order (event) | `{ orderId }` | `{ campaignId }`.
- **Output**: `{ status: 'ok', ... }` | `{ status: 'ignored', reason }` | `{ status: 'already_processed' }`; manual `orderId` non-refundable → `409`.

### Event-driven

- `create-user-wallet`, `create-escrow`, `release-escrow`, `reconcile-release-escrow`, `fee-rate-flip` — lihat [90_Events.md](90_Events.md).

---

## Lihat Juga

- [50_Database.md](50_Database.md) — skema data
- [30_Business_Rules.md](30_Business_Rules.md) — aturan validasi
- [90_Events.md](90_Events.md) — event trigger flow
