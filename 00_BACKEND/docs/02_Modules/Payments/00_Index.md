# Modul Payments

Sistem finansial Marketiv: payment gateway Midtrans Snap (Rate Card order + pendanaan campaign), wallet per user, ledger transaksi, escrow Rate Card (`held/releasing/released/refunded`), refund ke wallet UMKM, platform fee dari env `FEE_RATE`, dan withdrawal dengan reserve saldo + transfer manual Admin. Modul ini memiliki data `payments`, `wallets`, `transactions`, `escrows`, dan `withdrawals`.

## Daftar Dokumen

- `10_Overview.md` — Komponen & prinsip: Midtrans, wallet, ledger, escrow, campaign funding, withdrawal, fee.
- `20_Concepts.md` — Istilah, status payment/escrow/withdrawal.
- `30_Business_Rules.md` — Webhook & mapping status, lock payment order, balance vs pendingBalance (legacy), tipe transaksi, escrow, refund, platform fee & flip, aturan withdraw.
- `40_User_Flow.md` — Alur bayar Rate Card, pendanaan campaign, withdrawal, refund.
- `50_Database.md` — Skema, index, permission `wallets`, `payments`, `transactions`, `escrows`, `withdrawals`.
- `60_API.md` — Kontrak callable Function, Client SDK read, webhook Midtrans, refund manual.
- `70_Backend.md` — Konfigurasi & implementasi Appwrite Functions Payments.
- `80_Frontend.md` — Halaman keuangan Kreator/UMKM, pembayaran Snap, admin withdrawals.
- `90_Events.md` — Event & schedule: wallet, payment, escrow, refund, reward, withdrawal, fee monitor.
- `100_Testing.md` — Cakupan test service, Function, dan admin app.
- `101_Iris_Webhook_Security_Setup.md` — Setup lama webhook Iris (`withdrawal-callback`), **superseded**, hanya untuk audit.
