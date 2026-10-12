# Payments — Testing

Lokasi test:

- Backend service & Function (Vitest): `00_BACKEND/tests/unit/*`, `00_BACKEND/tests/integration/functions.test.ts`, `00_BACKEND/tests/integration/services.test.ts`, `00_BACKEND/tests/integration/function-inventory.test.ts`.
- Unit test per Function (`node:test`): `functions/get-admin-withdrawal-queue/src/main.test.js`, `functions/review-withdrawal/src/main.test.js`, `functions/review-withdrawal/src/withdrawal-transition.test.js`.
- Admin app: `admin/src/features/admin/withdrawals/__tests__/withdrawal.service.test.ts`, `admin/src/features/admin/withdrawals/utils.test.ts`.

## Service Layer Referensi (`00_BACKEND/src/services`)

### `payment.service.ts` (`services-validation.test.ts`, `services.test.ts`)

- `amount` bukan integer > 0 → `PaymentServiceError('validation', 'Jumlah pembayaran tidak valid.')`.
- `purpose` bukan `order`/`campaign` → `'Tujuan pembayaran tidak valid.'`.
- `order` tanpa `orderId` → `'Order wajib diisi untuk pembayaran order.'`; `campaign` tanpa `campaignId` → `'Campaign wajib diisi untuk top-up campaign.'`.
- `campaign` → payload `totalAmount = amount + floor(amount × PLATFORM_FEE_RATE)`; `order` → `totalAmount = amount`. Function `create-payment` mengabaikan `totalAmount` dari klien dan menghitung ulang fee dari `FEE_RATE`.
- `getPayment('')` → `'Payment ID wajib diisi.'`.

### `wallet.service.ts` (`wallet.service.test.ts`, `services-validation.test.ts`)

- `PLATFORM_FEE_RATE` = `NEXT_PUBLIC_FEE_RATE || FEE_RATE || 0.02`; `calculatePlatformFee` = `floor(nominal × rate)`; `calculateTotalPayment` = nominal + fee; `calculateCreatorPayout` = nominal − fee.
- `MINIMUM_WITHDRAW` = 50000; `MINIMUM_CAMPAIGN_BUDGET` = 50000; `WITHDRAW_PAYOUT_METHODS` = `['bank', 'ewallet']`.
- Validasi `requestWithdraw()` (amount < 50000, metode invalid, data kosong) dan `getWallet()` → `not_found`.
- Catatan: test integrasi `requestWithdraw creates withdrawal (auto processed)` masih mengunci perilaku service lama (tulis langsung, status `processed`) yang tidak lagi dipakai produk. Jalur resmi = Function `request-withdrawal` (lihat bawah).

## Midtrans (`create-payment`, `midtrans-webhook`, `cancel-payment`)

- Signature valid → payment `paid`; signature invalid → `401`, tanpa mutasi.
- Status terminal `failed|expired|cancelled` pada order membuka `order_payment_key`; webhook duplikat tidak mengubah apa pun.
- Rate Card idempotency: satu payment per order, reuse intent `pending`; payment yang dibatalkan lokal tetap reusable; Snap ambigu mempertahankan kunci (`payment_preparing`); unique race dimenangkan satu baris; owner/nominal salah ditolak sebelum create.
- `purpose: topup` → `400` (T-19); `purpose: campaign` diterima dan mengkredit `remainingBudget` saat `paid`.
- `FEE_RATE=0.05` dipakai `create-payment` untuk campaign.

## Wallet (`create-user-wallet`)

- Wallet dibuat dengan `balance = 0`, `pendingBalance = 0`; idempoten (lookup `userId`).

## Escrow (`create-escrow`, `release-escrow`, `reconcile-release-escrow`)

- Payment order `paid` → escrow `held`, order `in_progress`; event berulang → satu escrow + satu ledger `payment`.
- Release mengkredit wallet creator nominal bersih; kredit gagal → escrow tetap `releasing`, retry menyelesaikan tepat sekali.
- Tanpa validasi Admin `valid`, atau validasi untuk versi deliverable lama → tidak dirilis.
- Release memakai snapshot `escrow.fee_rate` (0.02) walau env `FEE_RATE=0.05`; escrow tanpa `fee_rate` → fallback 0.02.
- Reconcile menuntaskan escrow `releasing` yang ledger-nya sudah `completed`.

## Refund (`refund-escrow`, `refund-order`)

- Escrow `held` → UMKM wallet + ledger `refund`; panggilan kedua tidak mengkredit ulang; escrow `released` diabaikan.
- Order `cancelled` → refund escrow; campaign `completed` dengan sisa budget → kredit wallet + budget nol.
- Fee tidak dikembalikan (wallet bertambah tepat `escrow.amount`).

## Reward Campaign (`calculate-campaign-reward`)

- Submission `approved` → `balance` creator bertambah, ledger `release` `matured`, budget berkurang; submission ditolak tanpa efek; panggilan ulang idempoten.

## Fee Monitor (`fee-rate-flip`)

- 999 transaksi `completed` → `thresholdReached: false`; 1000 → `true` + log alert.

## Withdrawal (`request-withdrawal`)

- Tanpa sesi → `401`; role selain creator/UMKM eligible → `403`; akun tidak aktif → `403`; T&C belum v3.1 → `403`.
- Default MVP: penarikan pertama tanpa verifikasi email diizinkan; KYC threshold, limit harian, dan cooling tidak memblokir. Strict mode (`WITHDRAWAL_ADVANCED_GUARDS_ENABLED=true`) memblokir dan men-set `kyc_status: pending_wa`.
- Request valid → reserve balance, ledger `pending`, status `requested`, tanpa payout provider.
- Saldo nol / di bawah minimum → ditolak tanpa baris withdrawal.
- Duplikat nominal sama < 60 detik dengan `requestKey` berbeda → `409`.
- Recovery: marker legacy ledger diperbaiki tanpa debit kedua; rollback staged debit saat transisi gagal; commit hilang / HTTP 500 direkonsiliasi tanpa debit kedua; `requestKey` baru diblok selama marker internal belum selesai; marker legacy ambigu tidak di-debit ulang.
- Dua request bersamaan yang total melebihi saldo → hanya satu diterima.
- UMKM tanpa `sourceOrigin` valid / tanpa sumber ledger → `403`; dengan ledger `refund` → diterima.

## Admin Withdrawal (`get-admin-withdrawal-queue`, `review-withdrawal`)

- Non-admin, admin via prefs saja, label Auth admin dengan profil app non-aktif, dan lookup profil gagal → `403` (fail closed).
- Admin aktif menerima DTO + paginasi; status invalid ditolak sebelum query.
- `start_processing` sekali dengan audit processor; `mark_succeeded` wajib `transferReference` dan state `processing`, ledger awal `completed`.
- `fail` wajib alasan; dari `requested`/`processing` → `reversed`, ledger `withdrawal_reversal` deterministik, kredit tepat sekali; retry/terminal tidak mengkredit ulang.
- Commit hilang direkonsiliasi lewat state kanonik (notifikasi tetap sekali); ambigu tanpa bukti → gagal tertutup.
- `withdrawal-transition`: ledger reversal di-stage sebelum kredit wallet; HTTP 500/network saat commit = ambigu (tanpa rollback); 409 saat commit = definitif (rollback).

## Legacy / Inventory

- `function-inventory.test.ts`: `mature-pending-balance` dan `withdrawal-callback` tetap disabled sementara fungsi Midtrans aktif.
- `legacy-retirement-audit.test.ts`: `audit-legacy-money-state.mjs` melaporkan hitungan tanpa membocorkan data user/rekening.
- `withdrawal-callback` (retired) masih punya test integrasi historis (Iris completed/failed, idempotensi, 404 referensi tak dikenal).
