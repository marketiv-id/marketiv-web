# Workflow: Withdrawal

> **Diverifikasi terhadap kode: 2026-10-12.** Sumber kebenaran:
> `00_BACKEND/functions/{request-withdrawal,get-admin-withdrawal-queue,review-withdrawal,verify-kyc,user-email-verified,accept-tos,withdrawal-callback,mature-pending-balance}`,
> `admin/src/features/admin/withdrawals/`, izin di `00_BACKEND/appwrite.config.json`.

## Purpose

Creator (atau UMKM dengan saldo refund) menarik `wallet.balance`. Saldo di-reserve atomik saat request, lalu Admin Marketiv memproses transfer manual di luar sistem dan mencatat hasilnya. Tidak ada payout provider otomatis.

## Modules Involved

- [Payments](../02_Modules/Payments/00_Index.md) — `wallets`, `withdrawals`, `transactions`.
- [Users](../02_Modules/Users/00_Index.md) — `users.role/status`, T&C, `email_verified_at`, `kyc_status`.
- [Notifications](../02_Modules/Notifications/00_Index.md) — notifikasi tiap transisi.

## Trigger

Creator/UMKM mengirim form penarikan dari halaman Keuangan (dibungkus `TosConsentProvider`), yang memanggil `request-withdrawal`.

## Data Model — Collection yang Terlibat

| Collection | Aksi | Ditulis oleh |
|---|---|---|
| `withdrawals` | insert (id deterministik `wd` + sha256(userId:requestKey)); update status | `request-withdrawal`, `review-withdrawal` |
| `wallets` | `balance -= amount` (reserve); `balance += amount` (reversal) | `request-withdrawal`, `review-withdrawal` |
| `transactions` | ledger `withdrawal` (`pending → completed \| failed`); ledger `withdrawal_reversal` (`completed`) | `request-withdrawal`, `review-withdrawal` |
| `users` | baca role/status/T&C/email/KYC; `kyc_status` | `verify-kyc`, `request-withdrawal` (hanya mode guard lanjutan) |
| `notifications` | insert | `request-withdrawal`, `review-withdrawal`, `verify-kyc` |

## Step-by-step Flow

### Tahap 1: Saldo Tersedia

1. Reward Campaign (`calculate-campaign-reward`) dan rilis escrow Rate Card (`release-escrow`) langsung menambah `wallet.balance`. Refund escrow/sisa budget menambah `wallet.balance` UMKM.
2. `pendingBalance` tetap ada di skema untuk kompatibilitas; `mature-pending-balance` **disabled** dan tidak dijadwalkan.

### Tahap 2: Request (`request-withdrawal`, HTTP `users`)

3. Validasi payload: `amount` integer ≥ `MINIMUM_WITHDRAW` (env, default 50.000); `payoutMethod ∈ { bank, ewallet }`; `providerName`, `accountNumber` (6–20 digit), `accountName` wajib; `requestKey` `[A-Za-z0-9-]{8,64}`.
4. Gate peran:
   - `creator` → `source_origin = "creator"`.
   - `umkm` → wajib `sourceOrigin ∈ { umkm_refund, umkm_budget }` **dan** ledger sumber (baris `transactions` `type: "refund"`, atau `type: "payment"` + `referenceType: "campaign"`).
   - Role lain → 403.
5. Gate akun: `users.status = active`; T&C aktif disetujui (`tos_version` = `CURRENT_TOS_VERSION` + `tos_accepted_at`).
6. Guard lanjutan — **hanya bila `WITHDRAWAL_ADVANCED_GUARDS_ENABLED=true`** (default mati):
   - penarikan pertama wajib `users.email_verified_at`;
   - `amount ≥ KYC_THRESHOLD` (default 5.000.000) wajib `kyc_status = verified` (bila `none` → di-set `pending_wa`);
   - maksimal `WITHDRAW_PER_DAY_LIMIT` (default 3) per hari;
   - cooling `WITHDRAW_COOLING_DAYS` (default 3) bila rekening berbeda dari withdrawal aktif terbaru.
7. Guard selalu aktif: duplikat (`amount` sama < 60 detik) → 409; marker internal yang belum selesai → 409; `wallet.balance < amount` → 409.
8. Klaim baris `withdrawals` dengan `status: "failed"` + `failure_reason: "withdrawal_atomic_reserve_pending"` (marker internal), lalu **satu transaksi database TablesDB**: `wallets.balance` decrement (min 0) + ledger `withdrawal` `pending` (id deterministik) + `withdrawals.status → requested`. Commit atau rollback bersama.
9. Notifikasi `withdrawal` ("Pengajuan Penarikan Diterima … umumnya diproses dalam 1–2 hari kerja"). Response: `{ withdrawalId, amount, status: "requested", balanceAfter, transactionId }`.
10. Retry dengan `requestKey` sama → receipt yang sama (idempoten) atau rekonsiliasi marker; data berbeda → 409.

### Tahap 3: Proses Admin

11. Admin membuka antrean `get-admin-withdrawal-queue` (filter status; default `requested`).
12. `review-withdrawal` `{ withdrawalId, action, transferReference?, failureReason?, adminNote? }` — tiap transisi dijalankan sebagai transaksi TablesDB atomik:
    - `start_processing`: `requested → processing` (`processing_at`, `processed_by`). Notifikasi `withdrawal_processing`.
    - Admin mentransfer manual di luar Marketiv.
    - `mark_succeeded`: `processing → succeeded`, wajib `transferReference`; ledger `withdrawal` `pending → completed`; wallet tidak berubah. Notifikasi `withdrawal_succeeded`.
    - `fail`: `requested | processing → reversed`, wajib `failureReason`; ledger `withdrawal` → `failed`; ledger `withdrawal_reversal` (`completed`, id deterministik) dibuat; `wallets.balance += amount` tepat sekali. Notifikasi `withdrawal_reversed`.
13. Commit ambigu → Function membuktikan state kanonik; bila tidak terbukti, Admin diminta memuat ulang antrean sebelum mencoba lagi.

### Tahap 4: KYC (opsional, manual)

14. Dokumen KYC dikirim via WhatsApp Admin (di luar sistem). Admin memanggil `verify-kyc` `{ userId }` (`execute: []`, hanya API key/Console) → `kyc_status: verified`, `kyc_verified_at`, notifikasi `kyc_verified`.

## State Machine

```text
(failed + marker internal) ──reserve atomik──→ requested
requested ──start_processing──→ processing ──mark_succeeded──→ succeeded
requested | processing ──fail──→ reversed
```

- Terminal: `succeeded`, `reversed`. `requested → succeeded` langsung tidak diizinkan.
- `failed` dipakai sebagai marker internal (`withdrawal_atomic_reserve_pending`, `withdrawal_reserve_pending`, `withdrawal_ledger_pending`) dan state legacy; bukan hasil aksi Admin.

| Status | Arti | Wallet | Ledger `withdrawal` |
|---|---|---|---|
| `requested` | Saldo sudah di-reserve | sudah didebit | `pending` |
| `processing` | Admin sedang transfer | — | `pending` |
| `succeeded` | Transfer berhasil (`transfer_reference`) | — | `completed` |
| `reversed` | Gagal/ditolak, saldo dikembalikan | dikredit balik | `failed` + `withdrawal_reversal` `completed` |

## Events / Functions

| Caller | Function | Tanggung jawab |
|---|---|---|
| Creator/UMKM (`users`) | `request-withdrawal` | Validasi + reserve atomik + ledger `pending` |
| Admin (`users`, dicek di Function) | `get-admin-withdrawal-queue` | Antrean |
| Admin (`users`, dicek di Function) | `review-withdrawal` | `start_processing` / `mark_succeeded` / `fail` |
| API key / Console (`execute: []`) | `verify-kyc` | Tandai KYC `verified` |
| `users.*.update` | `user-email-verified` | `users.email_verified_at` (dipakai guard lanjutan) |
| Disabled | `withdrawal-callback` | Legacy callback Iris; `enabled: false`, `execute: []` |
| Disabled | `mature-pending-balance` | Legacy pematangan `pendingBalance`; `enabled: false`, tanpa schedule |

Browser tidak dapat menulis `wallets`, `transactions`, atau status final `withdrawals` (tanpa permission update).

## Validation Rules per Langkah

| Langkah | Validasi | Gagal → |
|---|---|---|
| Request | Payload valid; minimum Rp50.000 (default) | 400 |
| Request | Role creator / UMKM dengan sumber ledger | 403 |
| Request | Akun aktif; T&C aktif | 403 |
| Request | Guard lanjutan (bila diaktifkan) | 403 / 429 |
| Request | Saldo cukup; bukan duplikat | 409 |
| Review | Admin aktif: `users.role = admin` + `status = active`, atau label Auth `admin` | 403 |
| `mark_succeeded` | Status `processing`; `transferReference`; ledger `pending` tunggal | 400 / 409 |
| `fail` | Status `requested|processing`; `failureReason`; ledger `pending`; wallet ada | 400 / 409 |

## Notifikasi

| Titik | Kind | Penerima |
|---|---|---|
| Request diterima | `withdrawal` | Pemohon |
| Mulai diproses | `withdrawal_processing` | Pemohon |
| Berhasil | `withdrawal_succeeded` | Pemohon |
| Dikembalikan | `withdrawal_reversed` | Pemohon |
| KYC terverifikasi | `kyc_verified` | User |

## Provider Boundaries

- Withdrawal baru tidak memanggil Midtrans Iris atau payout provider lain.
- `withdrawal-callback` legacy dinonaktifkan (audit staging 2026-08-25: nol withdrawal `processing` dan nol `iris_reference`).
- `midtrans-webhook` tetap aktif hanya untuk pembayaran Snap UMKM.

## Edge Cases

- Commit reserve terputus (non-409) → klaim marker dipertahankan; ulangi dengan `requestKey` yang sama untuk rekonsiliasi.
- Reserve gagal sebelum commit → baris withdrawal dihapus (rollback), saldo utuh.
- Dua `requestKey` berbeda bersamaan → hanya marker tertua yang lanjut, yang lain 409.
- Copy "1–2 hari kerja" adalah panduan operasional, bukan SLA.

## Links

- [Payments business rules](../02_Modules/Payments/30_Business_Rules.md)
- [Payments backend](../02_Modules/Payments/70_Backend.md)
- [Registration workflow](10_Registration.md) — T&C & verifikasi email
- [ADR-007](../04_Decisions/ADR-007.md)
