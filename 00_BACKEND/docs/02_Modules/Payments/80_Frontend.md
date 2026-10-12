# Payments — Frontend

Frontend utama di root `src/` (Next.js), admin app di `admin/`. Semua mutasi uang lewat Function; klien tidak menghitung angka uang final.

## Halaman

### Keuangan Kreator — `/dashboard/kreator/keuangan`

- Komponen: `KeuanganPageClient` → `KeuanganView` (`src/components/features/creator-dashboard/`).
- Metrik dari `get-creator-dashboard-summary`: **Saldo Tersedia** (`wallets.balance`), **Pencairan Tertunda** (`pendingPayouts` = `wallets.pendingBalance`, legacy), pendapatan campaign/rate card.
- Riwayat ledger dari `transactions` milik creator (`getCreatorTransactionsFromAppwrite`), label sumber dari `referenceType` (`campaign_submission` → Campaign, `escrow` → Rate Card, `withdrawal` → Withdrawal); `withdrawal_reversal` ditampilkan "Pengembalian saldo penarikan".
- Modal **Tarik Dana** 3 langkah `form → confirm → requested`:
  - Provider tetap (`PAYOUT_PROVIDERS`: Mandiri, BCA, BNI, BRI, GoPay, OVO); `payoutMethod` diturunkan dari provider.
  - Validasi `withdrawalRequestSchema` (`src/lib/validations/withdrawal.schema.ts`): integer, ≥ `MINIMUM_WITHDRAW` (Rp50.000), ≤ saldo, nomor 6–20 digit, panjang field.
  - Cek persetujuan T&C terbaru (`useTosConsent`) sebelum submit; kirim `requestKey` idempoten.
  - Setelah sukses, saldo diganti `balanceAfter` dari Function; copy "umumnya diproses dalam 1–2 hari kerja". Tanpa biaya admin.

### Keuangan UMKM — `/dashboard/umkm/keuangan`

- Komponen: `FinanceOverviewPage` (`src/components/features/umkm-dashboard/finance/`).
- `FinanceSummaryCards` + `EscrowOverviewCard` dari `get-umkm-finance-summary` (`finance` + `escrow`).
- Riwayat transaksi = baris `payments` milik UMKM (`getTransactionsFromAppwrite`, limit 100), bukan `transactions`.
- `PendingPaymentModal` dapat membatalkan payment `pending` via `cancel-payment` (order ditolak `gateway_cancellation_required`).
- UMKM **tidak** punya tampilan saldo wallet maupun form withdrawal (belum diimplementasikan).

### Pembayaran Rate Card — ruang negosiasi UMKM

- `NegotiationRoomPage` → `createOrderPaymentInAppwrite({ orderId, amount, finishUrl })` → redirect ke `redirectUrl` Snap.
- `PaymentSimulationModal` menampilkan harga final (tanpa fee tambahan) dan meminta konfirmasi sebelum `create-payment`.

### Pendanaan Campaign — wizard campaign

- `CreateCampaignWizard` → `createCampaignPaymentInAppwrite({ campaignId, budget })` → `loadSnap()` (`src/lib/midtrans/snap.ts`) → `window.snap.pay(snapToken)`.
- `snap.js` dimuat lazy dari `app(.sandbox).midtrans.com` berdasarkan `NEXT_PUBLIC_MIDTRANS_ENV`; butuh `NEXT_PUBLIC_MIDTRANS_CLIENT_KEY` (`src/config/midtrans.config.ts`).

### Admin Withdrawals — admin app `/withdrawals`

- `admin/src/app/withdrawals/page.tsx` + `admin/src/features/admin/withdrawals/` (`WithdrawalTable`, `WithdrawalCard`, `WithdrawalDetailDialog`, `WithdrawalStatusBadge`).
- Data: `get-admin-withdrawal-queue` (paginasi 100 per halaman, maks offset 10000).
- Aksi via `review-withdrawal`: **Mulai Proses**, **Tandai Berhasil** (wajib referensi transfer), **Gagal / Tolak** (wajib alasan, saldo dikembalikan). `409` memicu refresh antrean.

## Komponen Kunci

- `KeuanganView` — saldo, ledger, modal tarik dana (Creator).
- `FinanceSummaryCards`, `EscrowOverviewCard`, `TransactionHistorySection`, `PendingPaymentModal` — keuangan UMKM.
- `WithdrawalTable`, `WithdrawalDetailDialog` — review withdrawal (Admin).
- `loadSnap` — loader Snap Midtrans.
