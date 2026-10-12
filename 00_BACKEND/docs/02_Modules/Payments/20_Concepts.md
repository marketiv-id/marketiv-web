# Payments — Concepts

## Istilah

- **Wallet** — dompet digital setiap user: `balance` (tersedia) dan `pendingBalance` (legacy).
- **Payment Gateway** — penyedia pembayaran eksternal. Marketiv memakai **Midtrans Snap** untuk menerima pembayaran UMKM.
- **Payment** — payment intent ke Midtrans yang disimpan lokal untuk melacak status (`purpose: order | campaign`).
- **Transaction** — baris ledger mutasi uang (`payment`, `release`, `fee`, `refund`, `withdrawal`, `withdrawal_reversal`, `mature` legacy).
- **Escrow** — penahanan dana Rate Card order sampai deliverable disetujui dan divalidasi.
- **Campaign funding** — pembayaran budget campaign yang mengisi `campaigns.remainingBudget` (bukan wallet).
- **Withdrawal** — pencairan dari wallet ke rekening bank/e-wallet, diproses manual Admin.
- **Fee snapshot** — `escrows.fee_rate`, tarif fee yang dikunci saat escrow dibuat.

## Status Payment

`pending → paid | failed | expired | cancelled` (terminal tidak berubah lagi).

## Status Escrow

`held → releasing → released` atau `held → refunded`.

## Status Withdrawal

`requested → processing → succeeded`, atau `requested | processing → reversed`. `failed` hanya marker internal/legacy.

## Konsep

- Satu user = satu wallet.
- Satu pembayaran = satu dokumen `payments`; `gateway_reference` (`ord-`/`cmp-` + paymentId) = `order_id` Midtrans dan unik.
- Satu Rate Card order maksimal satu payment `pending|paid` (`order_payment_key`).
- Payment sukses hanya setelah webhook tervalidasi menulis `paid`.
- Escrow & transactions dipisah secara skema.
- User tidak bisa mengubah saldo sendiri; mutasi hanya oleh Function.
- Withdrawal me-reserve balance saat request; Admin menjalankan transfer manual dan mencatat final state lewat `review-withdrawal`.
- Refund mengembalikan dana ke wallet UMKM tanpa fee.
