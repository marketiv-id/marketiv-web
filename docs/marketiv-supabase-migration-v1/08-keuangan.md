# Fase 8 — Keuangan: payment, escrow, wallet, withdrawal

**Bobot:** XL (fase paling berisiko)

## Tujuan

Semua perpindahan uang menjadi atomik dan idempoten. Fase ini menutup celah #3:
- bayar ganda di `calculate-campaign-reward`, `release-escrow`, dan top-up
- dana hilang di refund

## Prinsip wajib
1. **Satu perpindahan uang = satu RPC** `SECURITY DEFINER` (`set search_path = ''`). Seluruh isinya berjalan dalam satu transaksi Postgres.
2. Wallet, escrow, dan campaign yang tersentuh dikunci dengan `SELECT … FOR UPDATE`. Urutan kunci selalu sama (ID terkecil dulu) supaya tidak deadlock.
3. **Ledger dulu, saldo kemudian.**
   - `INSERT INTO transactions … ON CONFLICT (reference_type, reference_id, type) DO NOTHING RETURNING id`.
   - Saldo hanya berubah bila insert berhasil.
   - Akibatnya panggilan ulang otomatis tidak berefek.
4. Status escrow/withdrawal hanya berubah lewat transisi yang valid: `UPDATE … WHERE status = 'expected' RETURNING`. Kalau 0 baris berubah, panggilan itu no-op.
5. `CHECK (balance >= 0)` dan `CHECK (remaining_budget >= 0)` di DB. Port `atomic.js` tidak diperlukan.
6. EXECUTE RPC dicabut dari `anon` dan `authenticated`, sehingga **hanya** service role (route) yang bisa memanggilnya.

## Task

| Appwrite | Pengganti |
|---|---|
| `create-payment` | `POST /api/payments`: buat payment `pending` (unique `order_payment_key`), panggil Midtrans Snap, kembalikan token |
| `cancel-payment` | `POST /api/payments/[id]/cancel`, lalu panggil cancel di Midtrans juga (sebelumnya tidak dilakukan) |
| `midtrans-webhook` | `POST /api/webhooks/midtrans` (runtime nodejs): verifikasi `SHA512(order_id+status_code+gross_amount+server_key)` secara timing-safe dan cek nominal. Status `settlement`/`capture` memanggil RPC `apply_payment_paid(payment_id)`. Refund/chargeback setelah `paid` dicatat dan memicu alert, tidak diabaikan diam-diam |
| event `create-escrow` | di dalam `apply_payment_paid`: order → escrow `held`, order `in_progress`, ledger `payment`. Campaign → `remaining_budget += amount`, ledger `topup` |
| `release-escrow` | RPC `release_escrow(order_id)`: escrow `held` → `released`, kreator `balance += amount - floor(amount*fee_rate)`, ledger `release` + `fee`. Dipanggil dari approve deliverable, validasi admin, dan auto-approve |
| `reconcile-release-escrow` | job `pg_cron` `*/15 * * * *` → panggil ulang `release_escrow` untuk escrow `releasing`/macet (aman karena idempoten) |
| `refund-order` / `refund-escrow` | RPC `refund_escrow(order_id, reason)`: status, kredit UMKM, dan ledger dalam satu transaksi. Kalau satu langkah gagal, semuanya rollback (menutup bug "dana hilang") |
| `calculate-campaign-reward` | RPC `credit_campaign_reward(submission_id)`: baca ulang submission (bukan payload event), reward = `min(views/1000*rate, remaining_budget)`, kunci campaign, ledger lalu kredit lalu kurangi budget |
| `request-withdrawal` | `POST /api/withdrawals` → RPC `request_withdrawal` (port `withdrawal-transaction.js`: guard minimum, KYC, limit harian, cooling days) |
| `review-withdrawal` | admin `POST /api/admin/withdrawals/[id]/review` → RPC `transition_withdrawal` (port `withdrawal-transition.js`) |
| `fee-rate-flip` | job `pg_cron` `0 0 * * *` |
| `mature-pending-balance`, `withdrawal-callback` | **Tidak dimigrasi** (nonaktif). Pastikan di audit Fase 0 tidak ada `pending_balance` yang tersisa |

Route admin lain:
- [ ] `suspend-user`, `unsuspend-user`, `verify-kyc`, `review-appeal` → `admin/src/app/api/admin/users/[id]/*`
- [ ] Setiap aksi admin dicatat ke tabel audit `admin_actions`, yang dibuat baru di fase ini.

## Verifikasi
- Setiap RPC punya test pgTAP (`supabase/tests/finance/*.sql`) yang membuktikan:
  - Panggilan **dua kali** tidak mengubah saldo untuk kedua kalinya.
  - Saldo tidak bisa negatif.
  - Exception di tengah RPC membuat semua perubahan rollback.
- Uji konkurensi dengan skrip yang menembak `release_escrow` dan `credit_campaign_reward` 20× paralel. Hasilnya harus satu kredit saja.
- Midtrans **sandbox** end-to-end dengan notification URL di preview staging: bayar order, bayar top-up campaign, expire, cancel.
- Query rekonsiliasi `sum(transactions)` = `wallets.balance` untuk setiap user, dan dijadikan view `finance_reconciliation`.
