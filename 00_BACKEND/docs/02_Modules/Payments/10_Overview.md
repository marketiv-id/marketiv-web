# Payments — Overview

Modul Payments mengelola seluruh aliran dana Marketiv.

## Komponen

- **Midtrans Payment Gateway (Snap)** — menerima pembayaran UMKM untuk Rate Card order dan pendanaan campaign. Frontend hanya menerima `snapToken`/`redirectUrl`; server memegang server key dan memproses webhook.
- **Payments** — payment intent lokal (`purpose: order | campaign`) beserta status dari Midtrans, nominal dasar, fee, dan total yang ditagih.
- **Wallet** — satu wallet per user; `balance` (tersedia, dapat ditarik) dan `pendingBalance` (legacy, tidak lagi diisi).
- **Transactions** — ledger append-only (`payment`, `release`, `fee`, `refund`, `withdrawal`, `withdrawal_reversal`, `mature` legacy).
- **Escrow** — dana Rate Card order ditahan saat payment `paid`, dirilis ke creator setelah deliverable di-approve UMKM dan divalidasi Admin, atau dikembalikan ke UMKM. Status `held | releasing | released | refunded`.
- **Campaign funding** — dana campaign tidak memakai `escrows`; payment campaign mengkredit `campaigns.remainingBudget`.
- **Withdrawals** — pencairan ke bank/e-wallet: saldo di-reserve saat request, lalu Admin memproses transfer manual (`requested → processing → succeeded | reversed`).
- **Platform fee** — default 2% dari env `FEE_RATE`: seller-side untuk Rate Card (dipotong saat release), buyer-side untuk campaign (ditambahkan saat bayar). Monitor `fee-rate-flip` memberi sinyal flip manual.

## Prinsip

- Satu user = satu wallet.
- Midtrans satu-satunya payment gateway MVP; withdrawal tidak memakai Iris/automated payout.
- Server key Midtrans hanya di environment Function.
- Status payment internal hanya dari webhook Midtrans yang tervalidasi signature dan nominalnya.
- Escrow dan transactions disimpan **terpisah** — escrow domain sensitif, transactions adalah ledger.
- User tidak dapat mengubah saldo, escrow, atau status withdrawal; semua mutasi via Function (API key) dengan operasi atomik.

## Tautan

- Escrow dipicu alur order → `../Orders/`.
- Reward campaign mengkredit wallet → `../Campaigns/`.
- Wallet dibuat saat user register → `../Authentication/`.
- Keputusan order sebagai aggregate → `../../04_Decisions/ADR-003.md`; minimum withdraw → ADR-007; fee → ADR-008.
- Skema & relasi → `50_Database.md`.
