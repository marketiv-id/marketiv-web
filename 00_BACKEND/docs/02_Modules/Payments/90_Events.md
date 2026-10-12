# Payments — Events

Automasi finansial berjalan event-driven via Appwrite Functions. Event string lengkap memakai prefix `databases.<databaseId>.tables.<table>.rows.*.<aksi>` (`appwrite.config.json`). Appwrite tidak mengirim `$previous`, jadi Function memeriksa **status akhir** dan mengandalkan id deterministik untuk idempotensi.

---

## User Registered → Create Wallet

- **Trigger**: `users.*.create`.
- **Function**: `create-user-wallet`.
- **Aksi**: buat `wallets` (`balance = 0`, `pendingBalance = 0`) bila belum ada. Tanpa notifikasi.
- **Link**: alur registrasi → `../Authentication/`.

## Checkout → Midtrans Payment

- **Trigger**: callable dari frontend (UMKM): Rate Card order di ruang negosiasi, atau pendanaan campaign di wizard campaign.
- **Function**: `create-payment`.
- **Aksi**: buat `payments` (`pending`), panggil Snap, kembalikan `snapToken`/`redirectUrl`.

## Midtrans Notification → Payment Status

- **Trigger**: HTTP notification Midtrans.
- **Function**: `midtrans-webhook`.
- **Aksi**: validasi signature + nominal, update `payments.status` (`paid | failed | expired | cancelled | pending`) secara idempotent; status terminal order membuka `order_payment_key`.

## Payment Paid → Escrow Hold / Campaign Funding

- **Trigger**: `tables.payments.rows.*.update` (semua update; Function abaikan bila `status ≠ paid`).
- **Function**: `create-escrow`.
- **Aksi order**: escrow `held` (+ snapshot `fee_rate`), ledger `payment`, order `in_progress`, notifikasi `escrow_held` UMKM & creator.
- **Aksi campaign**: increment `campaigns.remainingBudget` sebesar `payments.amount`, ledger `payment` (`referenceType: payment`).
- **Link**: alur order → `../Orders/90_Events.md`.

## Deliverable Approved + Validasi Admin → Release Escrow

- **Trigger**: `tables.deliverables.rows.*.update` dan `tables.ratecard_deliverable_validations.rows.*.create`.
- **Function**: `release-escrow`.
- **Syarat**: deliverable terbaru `approved` (UMKM approve atau `auto-approve-orders`) DAN validasi Admin `valid` (`review-ratecard-deliverable`) dengan snapshot cocok; order `in_progress|revision`.
- **Aksi**: escrow `held → releasing → released`, `wallets.balance` creator += nominal bersih, ledger `release` + `fee`, order `completed`, notifikasi creator & UMKM.

## Escrow Releasing Tertahan → Reconcile

- **Trigger**: schedule `*/15 * * * *`.
- **Function**: `reconcile-release-escrow`.
- **Aksi**: escrow `releasing` dengan ledger `release` (dan `fee`) sudah `completed` → `released` + order `completed`.

## Order Cancelled/Expired → Refund Escrow (T-02)

- **Trigger**: `tables.orders.rows.*.update`; proses bila `status ∈ {cancelled, expired}` dan `oldStatus ≠ status`.
- **Function**: `refund-order`.
- **Aksi**: escrow `held → refunded`, `wallets.balance` UMKM += `escrow.amount`, ledger `refund` (`referenceType: escrow`), notifikasi `refund`.
- **Fee**: tidak dikembalikan.

## Campaign Budget Refund (T-02)

- **Trigger**: manual admin (bukan event) — `refund-order` payload `{ campaignId }`.
- **Syarat**: campaign `cancelled`/`completed`, `remainingBudget > 0`.
- **Aksi**: `wallets.balance` UMKM += `remainingBudget`, `remainingBudget` di-nol-kan, ledger `refund` (`referenceType: campaign`), notifikasi `refund` ("Sisa Budget Dikembalikan").

## Submission Approved → Reward Campaign

- **Trigger**: `tables.campaign_submissions.rows.*.update` (submission `approved`).
- **Function**: `calculate-campaign-reward` (modul Campaigns).
- **Efek Payments**: `wallets.balance` creator += reward, ledger `release` `matured` (`referenceType: campaign_submission`), `remainingBudget` berkurang.

## Withdraw Requested → Admin Review

- **Trigger**: creator/UMKM memanggil `request-withdrawal`.
- **Aksi**: validasi policy/provenance, reserve balance atomik, withdrawal `requested` + ledger `pending`, notifikasi `keuangan`.
- **Admin**: `review-withdrawal` `requested → processing`, lalu `succeeded` (transfer manual + `transfer_reference`) atau `reversed` (kredit balik idempoten). Notifikasi tiap transisi.
- **Provider boundary**: tidak ada Iris/payout-provider call. `midtrans-webhook` khusus payment UMKM.

## Fee Rate Monitor

- **Trigger**: schedule `0 0 * * *` (UTC).
- **Function**: `fee-rate-flip`.
- **Aksi**: hitung `transactions` `completed`; ≥ 1000 → alert log + notifikasi Admin (`ADMIN_NOTIFY_USER_ID`). Flip `FEE_RATE` tetap manual.

## Retired

- `mature-pending-balance` — schedule dikosongkan, `enabled: false` (2026-08-25).
- `withdrawal-callback` — `enabled: false`, `execute: []` (2026-08-25).
