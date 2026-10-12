# Payments — Business Rules

## Payment Gateway

- Marketiv menggunakan **Midtrans Snap** sebagai payment gateway resmi untuk MVP.
- Frontend tidak memegang `MIDTRANS_SERVER_KEY`; frontend hanya memakai `NEXT_PUBLIC_MIDTRANS_CLIENT_KEY` untuk memuat `snap.js`. Semua pembuatan transaksi lewat Function `create-payment`.
- `purpose` hanya `order` (Rate Card) atau `campaign` (pendanaan campaign). `topup` ditolak `400` (T-19).
- Payment dibuat dengan `status = pending`, `gateway = midtrans`, dan `gateway_reference = <ord|cmp>-<paymentId>` (unik, ≤ 50 karakter).
- Status `paid` hanya diset `midtrans-webhook` setelah signature valid dan `gross_amount` = `payments.total_amount` (fallback `amount` untuk baris lama).
- Signature: `SHA512(order_id + status_code + gross_amount + MIDTRANS_SERVER_KEY)` dibandingkan timing-safe dengan `signature_key`.
- Notifikasi test dashboard Midtrans (`order_id` berawalan `payment_notif_test_`) yang lolos signature dijawab `200 { status: "ok", test: true }` tanpa mutasi.
- Webhook idempotent: status sama → `200` tanpa update; payment yang sudah terminal (`paid|failed|expired|cancelled`) **tidak pernah diubah** lagi (termasuk `refund`/`chargeback` setelah `paid` — tidak ada reversal otomatis escrow/budget).
- Mapping status internal (`midtrans-webhook`):
  - `settlement` → `paid`.
  - `capture` + `fraud_status = accept` → `paid`.
  - `capture` + `fraud_status = challenge` → `pending`.
  - `capture` + fraud_status lain/kosong → `failed`.
  - `pending` → `pending`.
  - `deny` / `failure` → `failed`.
  - `expire` → `expired`.
  - `cancel` / `refund` / `partial_refund` / `chargeback` / `partial_chargeback` → `cancelled`.
  - status lain → diabaikan (`200 { status: "ignored" }`).

### Rate Card order payment lock

- Satu order hanya boleh punya satu payment `pending|paid`, dikunci `order_payment_key = order:<orderId>` (unique index).
- Payment `pending` yang sudah punya `snap_token`/`redirect_url` di-reuse (`reused: true`); belum punya → `409 payment_preparing`. Payment `paid` → `409 payment_already_paid`.
- Kegagalan setelah request Snap dimulai **tidak** menandai payment order `failed` dan tidak membuka kunci (Snap mungkin sudah terbentuk).
- Kunci hanya dilepas webhook terminal `failed|expired|cancelled`. `cancel-payment` menolak order dengan `409 gateway_cancellation_required`.

### Campaign payment

- Campaign wajib `draft`, milik pemanggil, dan `amount === campaigns.budget`.
- Tidak ada kunci unik per campaign: beberapa payment `pending` untuk satu campaign dapat terbentuk.
- Gagal membuat Snap → payment campaign ditandai `failed`. `cancel-payment` boleh membatalkan payment campaign `pending` secara lokal (tanpa memanggil Midtrans).

## Balance vs Pending Balance

- `balance` — saldo tersedia; satu-satunya kolom yang dibaca `request-withdrawal`.
- `pendingBalance` — **legacy**. Tidak ada jalur aktif yang mengisinya; dipertahankan untuk historical compatibility/reconciliation. `get-creator-dashboard-summary` masih menampilkannya sebagai `pendingPayouts`.
- Sumber kredit `balance`:
  - Reward Campaign (`calculate-campaign-reward`) — langsung ke `balance`, ledger `release` `status: "matured"` (tidak masuk jalur maturation).
  - Rilis escrow Rate Card (`release-escrow`) — nominal bersih setelah fee.
  - Refund UMKM (`refund-escrow`, `refund-order`).
  - Reversal withdrawal (`review-withdrawal` action `fail`).
- Debit `balance` hanya oleh `request-withdrawal` (reserve atomik, `min: 0`).
- Audit staging 2026-08-25: zero `pendingBalance > 0` dan zero campaign release belum matured; `mature-pending-balance` dinonaktifkan (source disimpan untuk audit).

## Pendanaan Campaign (Top-up)

- Tidak ada top-up ke wallet UMKM. "Top-up" = membayar budget campaign via Midtrans.
- Saat payment campaign `paid`, `create-escrow` mengkredit **`campaigns.remainingBudget`** sebesar `payments.amount` (budget bersih, tanpa fee) secara atomik.
- Ledger: `type: payment`, `referenceType: payment`, `referenceId: <paymentId>`, `amount = payments.amount`, `pending → completed`.
- Status campaign tidak diubah; penerbitan (`draft → active`) dilakukan modul Campaigns (`patch-campaign-status`, guard dana masuk).

## Tipe Transaksi

Semua `amount` positif; arah uang dari `type`.

| type | Ditulis oleh | userId | referenceType / referenceId | status |
|---|---|---|---|---|
| `payment` | `create-escrow` (order) | UMKM | `order` / orderId | `completed` |
| `payment` | `create-escrow` (campaign) | UMKM | `payment` / paymentId | `pending → completed` |
| `release` | `release-escrow` | Creator | `escrow` / escrowId | `processing → completed` (nominal bersih) |
| `fee` | `release-escrow` | Creator | `escrow` / escrowId | `processing → completed` (hanya bila fee > 0) |
| `release` | `calculate-campaign-reward` | Creator | `campaign_submission` / submissionId | `matured` |
| `refund` | `refund-escrow`, `refund-order` | UMKM | `escrow` / escrowId | `pending → completed` |
| `refund` | `refund-order` (campaign) | UMKM | `campaign` / campaignId | `pending → completed` |
| `withdrawal` | `request-withdrawal` | pemohon | `withdrawal` / withdrawalId | `pending → completed` (succeeded) / `failed` (reversed) |
| `withdrawal_reversal` | `review-withdrawal` (`fail`) | pemohon | `withdrawal` / withdrawalId | `completed` |
| `mature` | `mature-pending-balance` (legacy, retired) | Creator | `transaction` / id ledger reward | `pending → completed` |

- Pendapatan creator = `release` saja (`get-creator-dashboard-summary`), dibedakan lewat `referenceType` (`escrow` vs `campaign_submission`). `mature` dan `withdrawal_reversal` bukan pendapatan/pencairan baru.
- Tidak ada tipe `deposit`.
- Fee buyer-side campaign **tidak** dicatat di `transactions`; hanya di `payments.fee_amount`.

## Escrow

- Hanya untuk Rate Card order. Status `held | releasing | released | refunded`.
- `held` — dibuat `create-escrow` saat payment order `paid`; order diset `in_progress`.
- `releasing` — penanda sementara `release-escrow` sebelum kredit wallet; diselesaikan retry event atau cron `reconcile-release-escrow`.
- `released` — dana bersih sudah masuk `balance` creator; order `completed`.
- `refunded` — dana dikembalikan ke wallet UMKM.
- Syarat rilis: order `in_progress|revision`, deliverable `approved` dan versi terbaru, serta `ratecard_deliverable_validations` `status: valid` yang snapshot-nya (`orderId`, `deliverableVersion`, `sourceSnapshot`, `evidenceUrlSnapshot`) cocok.
- Hanya `held` yang bisa di-refund. Escrow tidak bisa disentuh user (tanpa row permission).

## Refund (Pasal 15 T&C)

Refund mengembalikan dana ke **Wallet UMKM** (`wallets.balance`, Opsi B). Fee platform **tidak dikembalikan** (CTO-26).

### Pemicu Refund

| Pemicu | Jalur | Kredit ke UMKM |
|--------|-------|----------------|
| Order jadi `cancelled`/`expired` | Otomatis: event `orders.rows.*.update` → `refund-order` | `escrow.amount` (utuh) |
| Dispute admin | Manual Console/CLI → `refund-escrow` (`{ escrowId }`/`{ orderId }`) atau `refund-order` (`{ orderId }`) | `escrow.amount` (utuh) |
| Sisa budget campaign `cancelled`/`completed` | Manual → `refund-order` (`{ campaignId }`) | `remainingBudget` (utuh), lalu budget di-nol-kan |

### Aturan Refund

- **Fee tidak dikembalikan**: escrow berisi harga order persis (fee seller-side dipotong saat release); fee buyer-side campaign tidak pernah masuk `remainingBudget`.
- **Escrow**: `held → refunded` (flip-first). Status lain → `200 ignored`.
- **Manual `orderId`** pada order yang bukan `cancelled`/`expired` → `409`.
- **Ledger**: entry `refund` baru, id deterministik `tx` + sha256(`${escrowId|campaignId}:refund`); create kedua `409` → `already_processed`.
- **Rollback**: kredit gagal → baris ledger `pending` dihapus dan Function mengembalikan `500`.
- Notifikasi UMKM `type: refund` (kind `refund_escrow` / `refund_campaign`).

## Platform Fee

Biaya platform default **2%** dengan model berbeda per modul (ADR-008). Nilai dibaca dari env Function `FEE_RATE` (default `0.02`), bukan konstanta kode.

### Rate Card Order (Seller Side)

UMKM membayar harga rate card persis (`fee_amount = 0`). Fee dipotong dari pendapatan creator saat release memakai snapshot `escrows.fee_rate` (diambil dari `FEE_RATE` saat `create-escrow`; fallback `0.02` bila kosong/0).

```text
UMKM bayar:  Rp200.000 (harga paket)
Escrow:      Rp200.000
Saat rilis:
  Creator:   Rp200.000 - floor(Rp200.000 × 2%) = Rp196.000  (ledger release)
  Platform:  Rp4.000                                          (ledger fee)
```

### Campaign Top-Up (Buyer Side)

Fee ditambahkan ke total yang ditagih Midtrans: `fee_amount = floor(amount × FEE_RATE)` pada saat `create-payment`.

```text
UMKM bayar:  Rp100.000 + Rp2.000 = Rp102.000  (payments.total_amount)
Budget:      Rp100.000 (campaigns.remainingBudget)
Platform:    Rp2.000   (payments.fee_amount)
```

### Fee rate flip

- `fee-rate-flip` (cron harian `0 0 * * *` UTC) menghitung semua `transactions` `status = completed`.
- Bila ≥ **1.000**: log alert + notifikasi ke `ADMIN_NOTIFY_USER_ID` (bila di-set) agar Admin mengubah `FEE_RATE` menjadi `0.05` **manual** di Console.
- Function tidak mengubah env apa pun. Order lama tetap memakai `escrows.fee_rate` snapshot-nya.
- `FEE_RATE` dibaca terpisah oleh `create-payment`, `create-escrow`, `fee-rate-flip`, dan `get-creator-negotiations`; perubahan harus diterapkan konsisten di env setiap Function.

## Minimum Campaign Budget

- Minimum budget **Rp50.000**: divalidasi frontend (`src/lib/validations/campaign.schema.ts`, `MINIMUM_CAMPAIGN_BUDGET`) dan Function `patch-campaign-draft` (`MIN_BUDGET = 50000`).
- `create-payment` tidak memeriksa minimum; ia hanya mewajibkan `amount === campaigns.budget`.

## Withdraw

Divalidasi `request-withdrawal` (server):

- `amount` integer > 0 dan ≥ `MINIMUM_WITHDRAW` (env, default `50000`; ADR-007).
- `payoutMethod ∈ {bank, ewallet}`; `providerName` (≤100), `accountNumber` (digit 6–20), `accountName` (≤255) wajib.
- `requestKey` wajib, regex `^[A-Za-z0-9-]{8,64}$`.
- Role `users.role`: `creator` → `source_origin = creator`; `umkm` → lihat UMKM di bawah; role lain → `403`.
- Akun `users.status` harus `active`.
- T&C: `users.tos_version === CURRENT_TOS_VERSION` (default `v3.1`) dan `tos_accepted_at` terisi (T-14).
- `wallets.balance ≥ amount` (else `409 Saldo tidak mencukupi`).
- Tidak ada biaya penarikan; debit = `amount`.

### Alur manual Admin

- `requested` — saldo sudah di-reserve atomik; ledger `withdrawal` `pending`.
- `processing` — Admin `start_processing` (hanya dari `requested`).
- `succeeded` — Admin `mark_succeeded` (hanya dari `processing`), wajib `transfer_reference`; ledger awal `completed`. Saldo tidak berubah lagi.
- `reversed` — Admin `fail` dari `requested|processing`, wajib `failure_reason`; ledger awal `failed`, ledger `withdrawal_reversal` `completed`, `balance` dikredit balik tepat sekali.
- `requested → succeeded` langsung ditolak `409`. Transisi dari state terminal ditolak `409`.
- Tidak ada pemanggilan Iris/payout provider.

Copy user-facing: **“umumnya diproses dalam 1–2 hari kerja”**. Jangan menjanjikan SLA keras.

### Advanced Guards

- Hanya hard-block bila `WITHDRAWAL_ADVANCED_GUARDS_ENABLED=true` (default: nonaktif):
  - penarikan pertama wajib `users.email_verified_at` (T-15);
  - `amount ≥ KYC_THRESHOLD` (default `5000000`) wajib `kyc_status = verified`; bila `none` di-set `pending_wa`;
  - maksimal `WITHDRAW_PER_DAY_LIMIT` (default 3) per hari → `429`;
  - rekening berbeda dari withdrawal aktif/sukses dalam `WITHDRAW_COOLING_DAYS` (default 3) hari → `429`.
- Selalu aktif: auth, role/provenance, akun aktif, T&C, minimum, data tujuan, saldo cukup, idempotensi `requestKey`, reserve atomik, duplicate guard 60 detik (nominal sama) → `409`.

### UMKM (Pasal 15.1.c)

- UMKM boleh menarik saldo yang berasal dari **refund** atau **sisa budget campaign**.
- Wajib kirim `sourceOrigin ∈ {umkm_refund, umkm_budget}` DAN ledger membuktikan sumber: ada `transactions` `type: refund`, ATAU `type: payment` + `referenceType: campaign`.
- Catatan implementasi: ledger top-up campaign ditulis dengan `referenceType: payment`, sehingga cabang kedua saat ini tidak pernah cocok — praktis hanya ledger `refund` (termasuk refund sisa budget campaign) yang lolos.
- UI withdrawal UMKM **belum diimplementasikan** di frontend; hanya Function yang mendukung.

### Idempotensi & Atomisitas

- Document id deterministik `wd` + sha256(`${userId}:${requestKey}`). Retry dengan key + data sama mengembalikan receipt yang sama; data berbeda → `409`.
- Klaim dibuat dulu sebagai `failed` + `failure_reason: withdrawal_atomic_reserve_pending`; hanya satu klaim internal tertua per user yang boleh lanjut.
- Reserve = satu transaksi Appwrite TablesDB: decrement `balance` (`min: 0`) + ledger `withdrawal` `pending` + status `requested`, commit/rollback bersama.
- Commit ambigu (network / HTTP ≠ 409) → klaim dipertahankan; retry dengan `requestKey` sama merekonsiliasi tanpa debit kedua.
- Reversal: transaksi Appwrite yang membuat ledger `withdrawal_reversal` id `tx` + sha256(`${withdrawalId}:reversal`) **sebelum** increment `balance`; percobaan kedua gagal di create ledger sehingga kredit tidak pernah dobel.

> Escrow & transactions disimpan terpisah (`50_Database.md`). Aggregate order: `../../04_Decisions/ADR-003.md`.
