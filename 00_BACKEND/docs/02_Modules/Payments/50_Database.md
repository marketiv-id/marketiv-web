# Payments — Database

Sumber kebenaran skema koleksi milik modul Payments. Satu fakta = satu lokasi. Payments, escrow & transactions sengaja **dipisah**.

Skema kanonik: `00_BACKEND/appwrite.config.json` (`tables`), dihasilkan oleh `00_BACKEND/appwrite/generate_appwrite_json.cjs`. Database `db_marketiv`.

> **Tipe kolom:** kecuali disebut `enum`, kolom status/tipe di bawah adalah `string` biasa (bukan enum Appwrite). Nilai yang tercantum adalah nilai yang **ditulis oleh kode**, bukan batasan skema.
>
> **Tanggal:** tidak ada kolom `createdAt` sendiri; semua query urut waktu memakai `$createdAt` bawaan Appwrite.

---

## wallets

Satu wallet per user. Relasi: User (1) → Wallet (1); Wallet (1) → Transactions (N).

| Attribute      | Type    | Required | Catatan                                                                 |
| -------------- | ------- | -------- | ----------------------------------------------------------------------- |
| userId         | string(255) | yes  | id akun Auth pemilik (unik)                                             |
| balance        | integer | no       | default `0`, min `0`, max `999999999` — saldo tersedia, dapat ditarik    |
| pendingBalance | integer | no       | default `0`, min `0`, max `999999999` — **legacy**, tidak diisi oleh jalur aktif (lihat `30_Business_Rules.md`) |

**Index**: `idx_userId` — `userId` (unique).

**Permission**: table `$permissions: []` + `rowSecurity: true`. Baris dibuat dengan `read("user:<userId>")` saja. Tidak ada izin tulis dari browser; mutasi saldo hanya lewat Function (API key) memakai increment/decrement atomik (`functions/*/src/atomic.js`).

**Pembuat baris**: `create-user-wallet`; `refund-escrow`, `refund-order`, dan `calculate-campaign-reward` membuat wallet bila belum ada (`findOrCreateWallet`).

---

## payments

Payment intent lokal untuk pembayaran yang diproses Midtrans. Relasi: Order (1) → Payments (N, maksimal satu `pending|paid` per order), Campaign (1) → Payments (N), User/UMKM (1) → Payments (N).

| Attribute         | Type          | Required | Catatan                                                              |
| ----------------- | ------------- | -------- | -------------------------------------------------------------------- |
| user_id           | string(255)   | yes      | id akun pembayar (UMKM)                                              |
| order_id          | string(255)   | no       | FK → orders untuk `purpose = order`                                  |
| order_payment_key | string(255)   | no       | `order:<orderId>` — kunci unik Rate Card; diisi saat create, di-`null`-kan webhook saat status `failed\|expired\|cancelled` |
| campaign_id       | string(255)   | no       | FK → campaigns untuk `purpose = campaign`                            |
| amount            | integer       | yes      | nominal dasar (harga order / budget campaign), min 0                 |
| total_amount      | integer       | yes      | yang ditagih ke Midtrans = `amount + fee_amount`                     |
| fee_amount        | integer       | no       | default `0`; `floor(amount × FEE_RATE)` untuk campaign, `0` untuk order |
| purpose           | string(50)    | yes      | `order \| campaign`                                                  |
| gateway           | string(50)    | no       | default `midtrans`; ops dev `fund-campaign.mjs` menulis `manual-dev` |
| gateway_reference | string(255)   | yes      | `order_id` Midtrans: `ord-<paymentId>` / `cmp-<paymentId>` (24 karakter, batas Midtrans 50) |
| snap_token        | string(255)   | no       | token Snap Midtrans                                                  |
| redirect_url      | string(2048)  | no       | URL pembayaran Midtrans                                              |
| status            | string(50)    | yes      | `pending \| paid \| failed \| expired \| cancelled`                  |
| paid_at           | datetime      | no       | dari `settlement_time`/`transaction_time` Midtrans (WIB → ISO)       |

**Index**: `idx_gateway_reference` (unique), `idx_order_payment_key` (unique), `idx_order_id`, `idx_campaign_id`, `idx_user_id`, `idx_status`, `idx_purpose`. Tidak ada index `$createdAt`.

**Permission**: table `$permissions: []` + `rowSecurity: true`. Baris dibuat `create-payment` dengan `read("user:<user_id>")`. Tulis hanya via Function (`create-payment`, `cancel-payment`, `midtrans-webhook`).

---

## transactions

Ledger mutasi uang. Relasi: User (1) → Transactions (N). Ledger append-only: koreksi = baris baru (T-17); pengecualian: baris `pending` milik refund dihapus saat kredit gagal (rollback).

| Attribute     | Type        | Required | Catatan                                                       |
| ------------- | ----------- | -------- | ------------------------------------------------------------- |
| userId        | string(255) | yes      | pemilik baris (UMKM, Creator)                                 |
| amount        | integer     | yes      | **selalu positif** (min 0); arah uang dibaca dari `type`      |
| type          | string(50)  | yes      | `payment \| release \| fee \| refund \| withdrawal \| withdrawal_reversal \| mature` (legacy) |
| referenceId   | string(255) | no       | id order / payment / escrow / campaign / submission / withdrawal / transaction |
| referenceType | string(50)  | no       | `order \| payment \| escrow \| campaign \| campaign_submission \| withdrawal \| transaction` |
| status        | string(50)  | yes      | `pending \| processing \| completed \| failed \| matured`     |

Kombinasi yang ditulis kode dijelaskan di `30_Business_Rules.md` → Tipe Transaksi.

**Index**: `idx_userId`, `idx_referenceId`, `idx_referenceType`, `idx_status`. **Tidak ada** unique index (referenceId, type) — idempotensi memakai document id deterministik `tx` + sha256.

**Permission**: table `$permissions: []` + `rowSecurity: true`. Baris dibuat dengan `read("user:<userId>")`. Tulis hanya via Function.

---

## escrows

Dana Rate Card order yang ditahan. Relasi: Order (1) → Escrow (1). Campaign **tidak** memakai `escrows`; dananya ada di `campaigns.remainingBudget`.

| Attribute | Type        | Required | Catatan                                                          |
| --------- | ----------- | -------- | ---------------------------------------------------------------- |
| orderId   | string(255) | yes      | FK → orders (unik)                                               |
| amount    | integer     | yes      | = `payments.amount` (harga order, tanpa fee)                     |
| status    | string(50)  | yes      | `held \| releasing \| released \| refunded`                      |
| fee_rate  | double      | no       | default `0`; snapshot `FEE_RATE` saat `create-escrow`. `release-escrow` memakai `fee_rate \|\| 0.02` |

Tidak ada kolom `umkmId`/`creatorId`; kepemilikan diturunkan lewat `orders`.

**Index**: `idx_orderId` (unique), `idx_status`.

**Permission**: table `$permissions: []` + `rowSecurity: true`, baris dibuat **tanpa** row permission → tidak terbaca/tertulis dari browser. Hanya Function (API key).

---

## withdrawals

Riwayat pencairan dana. Alur manual Admin: `requested → processing → succeeded`, atau `requested|processing → reversed` (`30_Business_Rules.md`).

| Attribute          | Type         | Required | Catatan                                                     |
| ------------------ | ------------ | -------- | ----------------------------------------------------------- |
| userId             | string(255)  | yes      | pemohon                                                     |
| amount             | integer      | yes      | Rupiah, min 0                                               |
| payoutMethod       | string(50)   | yes      | `bank \| ewallet` (divalidasi Function, bukan enum skema)   |
| providerName       | string(100)  | yes      | nama bank / provider e-wallet                               |
| accountNumber      | string(100)  | yes      | Function menerima digit saja, 6–20 karakter                 |
| accountName        | string(255)  | yes      | nama pemilik rekening/akun                                  |
| status             | enum         | yes      | `requested \| processing \| succeeded \| failed \| reversed`. `failed` = marker internal/legacy (lihat bawah) |
| processing_at      | datetime     | no       | waktu Admin `start_processing`                              |
| processedAt        | datetime     | no       | waktu final (`succeeded` atau `reversed`)                   |
| processed_by       | string(255)  | no       | user id Admin terakhir yang memproses                       |
| transfer_reference | string(255)  | no       | wajib saat `mark_succeeded`                                 |
| admin_note         | string(1000) | no       | catatan Admin opsional                                      |
| failure_reason     | string(500)  | no       | alasan `fail`; juga marker internal `withdrawal_atomic_reserve_pending` / `withdrawal_reserve_pending` / `withdrawal_ledger_pending` |
| reversed_at        | datetime     | no       | waktu kredit balik                                          |
| requester_role     | string(20)   | no       | `creator \| umkm`                                           |
| source_origin      | enum         | no       | `creator \| umkm_refund \| umkm_budget`                     |
| kyc_status         | enum         | no       | snapshot `none \| pending_wa \| verified` saat request      |
| iris_reference     | string(255)  | no       | legacy `reference_no` Iris; hanya untuk audit historis      |

**Status `failed`**: dipakai `request-withdrawal` sebagai klaim sementara (`failed` + `failure_reason` internal) sebelum reserve atomik commit, dan oleh `withdrawal-callback` legacy. Jalur Admin aktif tidak pernah menulis `failed`; `fail` langsung menjadi `reversed`.

**Index**: `idx_userId`, `idx_status`. Tidak ada index `iris_reference` maupun `$createdAt`.

**Permission**: table `$permissions: ["create(\"users\")"]` + `rowSecurity: true`. Baris dari `request-withdrawal` diberi `read("user:<userId>")`. Update/delete hanya via Function (`request-withdrawal`, `review-withdrawal`). Catatan: izin `create("users")` di level tabel masih ada walau jalur resmi selalu lewat Function.

---

> `orderId` merujuk koleksi milik modul Orders (`../Orders/50_Database.md`); `campaigns.remainingBudget`/`spentAmount` milik modul Campaigns. Aturan saldo, tipe transaksi, status escrow & withdraw: `30_Business_Rules.md`.
