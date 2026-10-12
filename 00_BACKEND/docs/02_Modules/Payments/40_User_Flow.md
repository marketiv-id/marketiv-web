# Payments — User Flow

## Alur Pembayaran Rate Card Order

```text
Order dibuat (pending_payment)
↓
UMKM klik bayar di ruang negosiasi → create-payment (purpose: order, finishUrl)
↓
Redirect ke redirectUrl Snap Midtrans
↓
UMKM bayar di Midtrans → kembali ke finishUrl
↓
midtrans-webhook tervalidasi → payment paid
↓
create-escrow → escrow held, order in_progress
↓
Creator kirim deliverable → Admin validasi (valid) + UMKM approve (atau auto-approve)
↓
release-escrow → saldo bersih (setelah fee) masuk wallet Creator, order completed
```

UI hanya menyatakan pembayaran berhasil setelah DTO server menunjukkan order `in_progress`.

## Alur Pendanaan Campaign (Top-up Campaign)

```text
UMKM isi wizard campaign (budget ≥ Rp50.000, status draft)
↓
create-payment (purpose: campaign, amount = budget)
↓
Snap popup (snap.js, snapToken) — total = budget + fee
↓
midtrans-webhook tervalidasi → payment paid
↓
create-escrow → campaigns.remainingBudget += budget
↓
UMKM terbitkan campaign (modul Campaigns)
```

Tidak ada top-up saldo wallet UMKM. Payment campaign `pending` dapat dibatalkan dari halaman Keuangan UMKM (`cancel-payment`).

## Alur Withdrawal (Creator)

```text
Creator buka Keuangan → "Tarik Dana"
↓
Pilih provider (bank / e-wallet) → payoutMethod diturunkan dari provider
↓
Input: amount, nomor rekening/HP, nama pemilik
↓
Konfirmasi (T&C terbaru wajib) → request-withdrawal (+ requestKey)
↓
Saldo di-reserve, status requested ("umumnya diproses dalam 1–2 hari kerja")
↓
Admin (admin app /withdrawals) mulai proses → processing
↓
Admin transfer manual → isi transfer reference → succeeded
   atau Admin fail → saldo dikembalikan tepat sekali → reversed
```

UMKM dapat menarik saldo refund lewat Function yang sama (`sourceOrigin` wajib), tetapi UI withdrawal UMKM **belum diimplementasikan**.

## Alur Refund (UMKM)

```text
Order cancelled/expired → refund-order otomatis → escrow refunded → wallets.balance UMKM bertambah
Campaign cancelled/completed dengan sisa budget → Admin jalankan refund-order { campaignId } → wallets.balance UMKM bertambah
```
