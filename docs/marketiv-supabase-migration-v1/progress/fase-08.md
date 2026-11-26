# Fase 08 — Keuangan: payment, escrow, wallet, withdrawal

- Tanggal: 2026-11-23
- PR: https://github.com/marketiv-id/marketiv-web/pull/43
- Status: selesai di sisi kode dan staging. Semua perpindahan uang lewat RPC atomik + idempoten; test finance, uji konkurensi, dan smoke uang di staging lulus. **Satu verifikasi menunggu pemilik:** E2E Midtrans **sandbox sungguhan** (butuh kunci sandbox + Notification URL + branch deploy yang bisa dijangkau Midtrans) — lihat "Isu terbuka".

## Status task

### Prinsip wajib (semua RPC uang)
- [x] Satu perpindahan uang = satu RPC `SECURITY DEFINER`, `set search_path = ''`, satu transaksi.
- [x] `SELECT … FOR UPDATE` dengan urutan kunci tetap: payment → campaign → order → escrow → submission → withdrawal → wallet (user_id menaik).
- [x] Ledger dulu: semua perubahan saldo lewat `private.post_ledger` (0025) — `insert … on conflict (reference_type, reference_id, type) do nothing returning id`, saldo berubah hanya bila baris baru. Panggilan ulang = no-op.
- [x] Transisi status bersyarat (`update … where status = … returning`), 0 baris = no-op.
- [x] `CHECK (balance >= 0)` / `CHECK (remaining_budget >= 0)` (sudah ada sejak 0004/0007); overdraw → rollback.
- [x] EXECUTE semua RPC uang dicabut dari anon/authenticated (hanya service_role).

### Task
| Appwrite | Pengganti | Status |
|---|---|---|
| `create-payment` | `POST /api/payments` → RPC `create_payment` (pending, unique `order_payment_key`, payment pending dipakai ulang) → Midtrans Snap → `attach_payment_gateway` | [x] |
| `cancel-payment` | `POST /api/payments/[id]/cancel` → `cancel_payment` + cancel di Midtrans (sebelumnya tidak) | [x] |
| `midtrans-webhook` | `POST /api/webhooks/midtrans` (nodejs): SHA512 `timingSafeEqual`, cek nominal; settlement/capture-accept → `apply_payment_paid`; expire/cancel/deny/failure → `mark_payment_status`; refund/chargeback setelah paid, settlement terlambat, nominal salah, status tak dikenal → `record_payment_event` (`payment_events`) + alert ke semua admin | [x] |
| event `create-escrow` | di `apply_payment_paid`: order → escrow `held` + order `in_progress` + ledger `payment`; campaign → `remaining_budget += amount` + ledger `payment` (ref payment) | [x] |
| `release-escrow` | `release_escrow(order_id)`: syarat lama (deliverable terbaru `approved` + validasi admin `valid` cocok snapshot), kreator `amount − floor(amount × fee_rate)`, ledger `release` + `fee`, order `completed`. Dipanggil dari approve UMKM, validasi admin (0029), auto-approve, dan cron rekonsiliasi | [x] |
| `reconcile-release-escrow` | pg_cron `reconcile-release-escrow` `*/15 * * * *` | [x] |
| `refund-order` / `refund-escrow` | `refund_escrow(order_id, reason)` + `refund_campaign_budget(campaign_id)` — status, kredit UMKM, ledger dalam satu transaksi | [x] |
| `calculate-campaign-reward` | `credit_campaign_reward(submission_id)`: baca ULANG submission dari DB, `min(floor(views × rate / 1000), remaining_budget)`, ledger → kredit → kurangi budget; dipanggil `review_submission` approve | [x] |
| `request-withdrawal` | `POST /api/withdrawals` → `request_withdrawal` (port `withdrawal-transaction.js`: minimum, ToS, double-submit 60 dtk; guard lanjutan opsional: email, KYC ≥ threshold, limit harian, cooling rekening baru) | [x] |
| `review-withdrawal` | admin `POST /api/admin/withdrawals/[id]/review` → `transition_withdrawal` (requested → processing → succeeded; fail → reversed + `withdrawal_reversal` sekali) | [x] |
| `fee-rate-flip` | pg_cron `fee-rate-flip` `0 0 * * *` → `private.fee_rate_flip_check()` (notifikasi admin saat threshold; flip tetap manual di `private.finance_settings`, sama dengan function lama) | [x] |
| `mature-pending-balance`, `withdrawal-callback` | **Tidak dimigrasi.** Audit Fase 0: semua uang produksi 0, tidak ada `pending_balance` tersisa | [x] |

### Route admin lain
- [x] `suspend`, `unsuspend`, `verify-kyc` → `admin/src/app/api/admin/users/[userId]/*`; review banding → `admin/src/app/api/admin/appeals/[appealId]/review` (dipisah karena yang diputus baris banding).
- [x] Tabel audit `admin_actions` (0025) + `private.log_admin_action`, ditulis di transaksi yang sama dengan aksinya (withdrawal, suspend, unsuspend, KYC, banding).

## File dibuat / diubah
- SQL: `supabase/migrations/0025_finance_foundation.sql`, `0026_finance_core.sql`, `0027_payments.sql`, `0028_withdrawals_admin.sql`, `0029_release_after_validation.sql`; pgTAP `supabase/tests/finance/{foundation,apply_payment_paid,release_escrow,refund_escrow,credit_campaign_reward,jobs,payments,withdrawals,admin_users,release_after_validation}.test.sql`; `supabase/tests/0001_schema_foundation.test.sql` (34 tabel).
- App user: `src/server/payments/{midtrans,payments,webhook,config}.ts`, `src/app/api/payments/**`, `src/app/api/webhooks/midtrans/route.ts`, `src/server/withdrawals/**`, `src/app/api/withdrawals/route.ts`, `src/server/orders/orders.ts` (approve → release; batal order → cancel Midtrans), `src/server/campaign-flow/review.ts`, `src/lib/api/routes/finance.ts`; service `umkm-appwrite.service.ts` (payment), `creator-appwrite.service.ts` (withdrawal), `deliverable-appwrite.service.ts`.
- Admin: `admin/src/server/admin/{review-withdrawal,user-actions,review-*}.ts`, `admin/src/app/api/admin/{withdrawals,users,appeals}/**`, `admin/src/lib/api/call-api.ts`, `withdrawal.service.ts`.
- Skrip: `scripts/migration/finance-concurrency.ts`, `scripts/migration/smoke-finance.ts`.
- Tipe: `src/types/supabase.ts`, `admin/src/types/supabase.ts`.

## Keputusan & deviasi dari rencana
- **Fondasi `post_ledger` (0025).** Satu-satunya jalan mengubah `wallets.balance`. Arah saldo per type: `release`/`refund`/`withdrawal_reversal`/`mature` +, `withdrawal` −, `payment`/`fee` 0 (catatan). View `finance_reconciliation` = saldo wallet − Σ ledger berarah.
- **Escrow tidak boleh macet (0029).** `release_escrow` mensyaratkan validasi admin `valid`, tetapi validasi lama hanya menerima deliverable `submitted` — bila UMKM menyetujui (atau auto-approve) sebelum admin memvalidasi, escrow tertahan selamanya (warisan sistem lama). Kini validasi menerima deliverable `approved` dan langsung mencairkan escrow di transaksi yang sama; urutan kunci diseragamkan order → deliverable.
- **Batal order** kini juga membatalkan payment pending di DB (transaksi sama) dan transaksi Snap di Midtrans (best-effort; gagal → `payment_events` `cancel_failed` + alert; settlement yang tetap masuk → `late_settlement` + alert).
- **`apply_payment_paid`** menolak (tanpa memindah uang) payment expired/cancelled atau order bukan `pending_payment` — dulu webhook mengabaikan diam-diam dan create-escrow memaksa order `in_progress`. Webhook mengubahnya jadi event + alert.
- **Refund/chargeback setelah paid** tidak lagi mengubah status menjadi `cancelled` diam-diam; dicatat + alert.
- **`refund_escrow`** juga menandai order `cancelled`. Ledger reward berstatus `completed` (dulu `matured`; tidak ada pending balance lagi).
- **Suspend/unsuspend wajib admin aktif** (function lama tidak mengecek pemanggil); admin tidak bisa men-suspend dirinya/admin lain. Sesi user yang di-suspend tidak dicabut (sama dengan lama) — semua route tulis menolak akun nonaktif.
- **Fee rate**: escrow memakai `private.finance_settings.fee_rate` (DB, default 0.02); `create_payment` campaign memakai env `FEE_RATE` (default 0.02) untuk fee buyer-side — keduanya 0.02, tapi dua sumber. Lihat Isu terbuka.
- **Penarikan UMKM**: sumber saldo cukup ledger `refund`; cabang lama "payment referenceType campaign" tidak pernah cocok (catatan Fase 2) sehingga tidak disalin.

## Hasil verifikasi
| Perintah / skenario | Hasil |
|---|---|
| `npx tsc --noEmit` (root / admin) | lulus / lulus |
| `npm run lint` (root / admin) | 4 error lama (file tak disentuh), 47 warning / 0 error, 6 warning lama |
| `npx vitest run` (root / admin) | 121 file, 984 test lulus / 16 file, 178 test lulus |
| pgTAP lokal setelah `supabase db reset` (23 file, termasuk 10 file `finance/`) | **577/577** — tiap RPC uang: panggilan kedua tidak mengubah saldo, saldo tidak bisa negatif, exception di tengah (trigger paksa) → rollback total, nominal salah ditolak, rekonsiliasi diff 0, anon/authenticated tidak bisa execute |
| `scripts/migration/finance-concurrency.ts` (DB lokal) | **8/8**: `release_escrow` 20× paralel → 1 `released` + 19 `already_released`; `credit_campaign_reward` 20× paralel → 1 `credited` + 19 `already_credited`; satu ledger per efek; saldo & budget berubah sekali; rekonsiliasi 0 |
| Staging: migration 0025–0029 | diterapkan (MCP), riwayat `0001…0029`; tidak ada fungsi SECURITY DEFINER baru yang bisa dieksekusi anon/authenticated (yang tersisa hanya helper RLS Fase 3 yang memang sengaja) |
| Staging: `cron.job` | `auto-approve-orders`, `expire-stale-claims`, `fee-rate-flip`, `reconcile-release-escrow` |
| Smoke uang `scripts/migration/smoke-finance.ts` (app user + admin `next dev` → staging; webhook ditandatangani kunci uji yang sama dengan `MIDTRANS_SERVER_KEY` app) | **34/34**: tanda tangan salah 401, nominal salah 409 (+ alert admin), settlement 200, settlement ulang tidak menambah budget dua kali; reward 5000 masuk wallet kreator & budget berkurang; order dibayar → escrow `held`; approve sebelum validasi → escrow tetap `held`; validasi admin → cair 147.000 (fee 2%) + order `completed`; review ulang tidak mengkredit lagi; penarikan → saldo −50.000, ulang idempoten, admin `fail` → saldo kembali, `fail` kedua 409, audit tercatat; selisih rekonsiliasi akun uji tidak berubah. Data uji dihapus dan saldo dikembalikan. |
| `smoke-order-flow.ts` (Fase 7) | tetap relevan; langkah `[stub]`-nya tidak memindah uang |

## Env / secret baru (nama saja)
- `MIDTRANS_SERVER_KEY` — wajib untuk pembayaran (tanpa ini route bayar/webhook 503).
- `MIDTRANS_IS_PRODUCTION` — default sandbox (fallback `MIDTRANS_ENV` lama).
- `NEXT_PUBLIC_MIDTRANS_CLIENT_KEY`, `NEXT_PUBLIC_MIDTRANS_ENV` — dipakai UI Snap (sudah ada).
- `FEE_RATE` — default 0.02 (fee buyer-side campaign).
- Penarikan (opsional, default = function lama): `MINIMUM_WITHDRAW`, `WITHDRAWAL_ADVANCED_GUARDS_ENABLED`, `KYC_THRESHOLD`, `WITHDRAW_PER_DAY_LIMIT`, `WITHDRAW_COOLING_DAYS`.

## Isu terbuka
- **E2E Midtrans sandbox sungguhan belum dijalankan** — kunci sandbox belum ada. Langkah pemilik: (1) Netlify site `marketiv-production` → env untuk Deploy Previews + Branch deploys (BUKAN Production): `MIDTRANS_SERVER_KEY`, `NEXT_PUBLIC_MIDTRANS_CLIENT_KEY`; (2) Midtrans Sandbox → Settings → Configuration → Payment Notification URL = `https://migrasi-supabase--marketiv-production.netlify.app/api/webhooks/midtrans`; (3) branch deploy saat ini dilindungi SSO tim Netlify (401) — Midtrans tidak bisa mengirim notifikasi sampai proteksi itu dibuka untuk path webhook/branch tersebut; (4) redeploy, lalu uji bayar order, top-up campaign, expire, cancel.
- **Fixture staging tidak konsisten dengan ledger** (dibuat `make-fixture.ts` Fase 2): creator1 dan creator2 punya saldo 150.000 / pending 25.000 tanpa ledger yang cocok → `finance_reconciliation` menunjukkan selisih untuk 2 akun itu. Bukan bug kode (view justru menangkapnya). Fase 9: saldo hasil muat harus dibangun dari ledger; produksi sendiri 0.
- **Dua sumber fee rate** (env `FEE_RATE` untuk fee buyer-side campaign, `private.finance_settings` untuk escrow). Usulan: `create_payment` memakai `public.get_fee_rate()`.
- Payment order yang Snap-nya gagal tetap `pending` → retry mendapat `payment_preparing` tanpa batas waktu (perilaku lama). Usulan: job expiry/rekonsiliasi status Midtrans.
- Belum ada UI admin untuk suspend/KYC/banding (route + test sudah ada).
- Validasi admin `invalid` atas deliverable yang sudah disetujui UMKM membuat escrow tetap `held`; penyelesaian (refund_escrow) saat ini keputusan manual admin — belum ada route admin untuk refund.

## Isu untuk fase lain
- **Fase 9:** bangun saldo wallet dari ledger hasil migrasi lalu `select * from finance_reconciliation where diff <> 0` harus kosong; `deliverables.file_url` / `user_files.shared_with_order_id` lama (Fase 6); hapus/benahi fixture staging sebelum muat data asli.
- **Fase 10:** isi env Midtrans **production** hanya di context Production saat cutover; ubah Notification URL Midtrans production ke domain baru.
- **Fase 11:** hapus `src/lib/appwrite/**`, `admin/src/lib/admin/{appwrite,execute-function}.ts` (sudah tidak dipakai kode app; `FUNCTION_IDS.reviewWithdrawal` sisa).

## Catatan serah-terima untuk fase berikutnya
- Smoke uang: `cd scripts/migration && BASE_URL=… ADMIN_BASE_URL=… SMOKE_MIDTRANS_SERVER_KEY=<sama dengan MIDTRANS_SERVER_KEY app> NODE_USE_ENV_PROXY=1 NO_PROXY=localhost,127.0.0.1 node smoke-finance.ts --confirm-ref <ref>`.
- Konkurensi: `cd scripts/migration && node finance-concurrency.ts` (DB lokal).
- RPC uang baru wajib memakai `private.post_ledger` dan urutan kunci di atas; tambah pgTAP di `supabase/tests/finance/`.
