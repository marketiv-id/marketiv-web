# 50_Security_Guidelines

**Pemilik tunggal model permission Marketiv.** Appwrite memakai permission level tabel + level baris (row security), bukan role-based ala Laravel. Modul mengacu ke sini. Sumber fakta: `00_BACKEND/appwrite.config.json` (level tabel/bucket) dan kode yang memanggil `createDocument(..., permissions)` (level baris).

## Tier Akses

- **Guest**: Landing, halaman publik, baca data ber-`read("any")` (campaign, profil, rate card).
- **Creator**: Claim campaign, submit bukti, rate card, kirim deliverable, accept/reject offer, withdraw.
- **UMKM**: Campaign (draft, bayar, jeda/aktif), buka percakapan, buat offer, bayar order, approve/revisi deliverable, withdraw (refund/sisa budget).
- **Admin** (`users.role = "admin"`, app `admin/`): validasi submission, validasi deliverable rate card, proses withdrawal, moderasi, KYC.
- **Function**: Operasi sensitif (uang, status lintas user, permission untuk user lain) dengan API key dinamis per Function.

## Status Akun & Role Guard

- `users.status` ∈ `active | suspended | terminated`. Function sensitif memeriksa role/status dan menolak akun non-`active` — Function yang dipanggil user membalas 403 (mis. `create-payment`, `request-withdrawal`, `submit-campaign-proof`, `unclaim-campaign`, `cancel-order`), Function event mengabaikan (`create-order`, `campaign-published`).
- Helper bersama: `functions/_shared/require-active-role.js` → 404 bila baris `users` tidak ada, 403 bila status non-`active` atau role salah. Saat ini dipakai `create-conversation` dan `create-offer`; Function lain memeriksa inline.
- Admin dikenali dari baris `users` (`role = "admin"`, status `active`). Fallback ke label/prefs Auth di beberapa Function (`review-submission`, `review-ratecard-deliverable`, `get-admin-*`) memanggil Users API, tetapi Function tersebut tidak punya scope `users.read`, sehingga fallback itu praktis tidak berfungsi.
- Identitas pemanggil diambil dari header `x-appwrite-user-id` yang diisi Appwrite — **bukan** dari body.

## Permission Level Tabel (config)

Semua 32 tabel memakai `rowSecurity: true`. Tidak ada tabel dengan `update`/`delete` di level tabel.

| Permission level tabel | Tabel |
| --- | --- |
| `read("any")`, `create("users")` | `umkm_profiles`, `creator_profiles`, `creator_social_accounts`, `creator_portfolios`, `campaigns`, `campaign_assets`, `campaign_briefs`, `campaign_briefs_v2` (`6ab530d00018edb50097`), `campaign_claims`, `campaign_submissions`, `rate_cards`, `rate_card_packages` |
| `create("users")` saja | `appeals`, `conversations`, `messages`, `offers`, `withdrawals` |
| `[]` (hanya baris / Function) | `users`, `otp_rate_limits`, `user_storage_usage`, `user_files`, `fraud_checks`, `orders`, `deliverables`, `revisions`, `ratecard_deliverable_validations`, `wallets`, `payments`, `transactions`, `escrows`, `notifications`, `ai_requests` |

## Aturan Level Tabel — permission Appwrite bersifat UNION

Dengan row security aktif, Appwrite memberi akses bila izin ada di level
**tabel ATAU** level baris. Jadi izin level tabel adalah **lantai**, bukan
batas atas: `update("users")` di level tabel berarti *setiap user yang login
boleh mengubah baris siapa pun*, dan seluruh permission per-baris menjadi tidak berarti.

**Tidak boleh ada tabel dengan `update("users")` di level tabel.** Config saat ini bersih
untuk ke-32 tabel; pencabutan di live dijalankan lewat `appwrite/ops/harden-permissions.mjs`
(gelombang 1–5).

Aturan ini ditulis setelah audit menemukan dua jalur eksploitasi nyata yang
lolos justru karena permission per-barisnya sudah benar tapi level tabelnya
longgar:

- `campaign_submissions` — akun mana pun bisa menulis `status: "approved"` ke
  submission siapa pun, memicu `calculate-campaign-reward` mengkredit wallet
  kreator, lalu dicairkan lewat `request-withdrawal`.
- `campaigns` — akun mana pun bisa menulis `status: "active"` +
  `remainingBudget`, melewati Midtrans dan `create-escrow` sekaligus.

`read("any")` di level tabel sah untuk data yang memang publik (campaign, profil,
rate card) — Job Pool, direktori kreator, dan katalog rate card bergantung padanya.
Catatan: `campaign_claims` dan `campaign_submissions` juga ber-`read("any")`, sehingga
`fraudScore`, `reviewNotes`, dan URL bukti terbaca publik.

## Pola Permission Level Baris (kondisi kode saat ini)

| Tabel | Dibuat oleh | Permission baris |
| --- | --- | --- |
| `users` | `create-user-profile` | read + update pemilik ⚠️ |
| `umkm_profiles` / `creator_profiles` | `create-user-profile` | read any, update + delete pemilik |
| `user_storage_usage` | `create-user-profile` | read pemilik |
| `wallets` | `create-user-wallet` | read pemilik |
| `campaigns` | klien (`umkm-appwrite.service.ts`) | read + delete pemilik — **tanpa update**; semua perubahan lewat `patch-campaign-draft` / `patch-campaign-status` |
| `campaign_assets`, brief | klien | read any, update + delete pemilik |
| `campaign_claims` | klien (creator) | read + update + delete creator; UMKM membaca via `read("any")` tabel; status diubah Function |
| `campaign_submissions` | `submit-campaign-proof` | read creator + read UMKM — **tanpa update**; keputusan oleh Admin via `review-submission` |
| `rate_cards`, `rate_card_packages`, `creator_social_accounts`, `creator_portfolios` | klien (creator) | read any, update + delete pemilik |
| `conversations` | `create-conversation` | read UMKM + creator; arsip via `patch-conversation-archive` |
| `messages` | `send-message` (`text`), `create-offer` (`offer`) | read UMKM + creator |
| `offers` | `create-offer` | read UMKM + creator, update creator (accept/reject), delete UMKM |
| `orders` | `create-order` | read UMKM + creator |
| `deliverables` | `submit-ratecard-deliverable` | read creator + UMKM, update UMKM (approve) — kreator **tidak** diberi update |
| `revisions` | `request-ratecard-revision` | read creator + UMKM |
| `payments`, `withdrawals`, `transactions` | Function terkait | read pemilik |
| `escrows` | `create-escrow` | tanpa permission baris — hanya Function; user membaca status escrow lewat DTO (`get-*-negotiations`, `get-umkm-finance-summary`) |
| `notifications` | Function (`notify` helper) | read + update penerima |
| `appeals` | `create-appeal` | read + update pemohon |
| `user_files` / berkas `user-files` | `validate-and-upload` | read pengunggah (+ pihak lawan order via `shareWithOrderId`), delete pengunggah |

Aturan:

- Klien **tidak bisa** memasang permission untuk user lain (Appwrite menolak role selain `any`, `users`, dan diri sendiri). Baris yang harus dibaca dua pihak wajib dibuat oleh Function.
- Pihak yang keputusannya memicu uang **tidak boleh** punya `update` atas baris itu (kreator atas submission/deliverable-nya sendiri).
- Chat tidak mendukung attachment; hanya pesan `text` dan `offer`.

> ⚠️ **Risiko terbuka — `users` self-update.** `create-user-profile` memberi
> `Permission.update(Role.user(userId))` pada baris `users`. Akibatnya pemilik bisa menulis
> kolom mana pun di barisnya sendiri dari browser, termasuk `role` (mis. `"admin"`, yang
> menjadi dasar guard admin), `status` (keluar dari suspend), `kyc_status`,
> `email_verified_at`, dan `tos_version`. Ini bertentangan dengan asumsi di header
> `accept-tos` bahwa baris `users` tidak bisa di-update dari browser. Perlu diperbaiki di
> kode + backfill permission baris lama.

> ⚠️ **Risiko — `create("users")` level tabel.** `messages`, `offers`, `conversations`,
> `withdrawals`, `appeals` masih menerima create langsung dari klien walau jalur resminya
> Function. Function event-driven (mis. `send-chat-notification` pada `messages.*.create`)
> memproses baris semacam itu tanpa memverifikasi pengirim.

## Storage

- Bucket publik (`avatars`, `creator-banners`, `logos`, `portfolios`, `campaign-assets`): `fileSecurity: false`, permission bucket `read("any")` + CRUD `users` — permission per-berkas diabaikan server.
- Bucket privat (`user-files`, `deliverables`, `fraud-evidence`): `fileSecurity: true`. Unggahan privat wajib lewat `validate-and-upload`.
- Detail per bucket: [`40_Folder_Structure.md`](40_Folder_Structure.md#storage-buckets).

## Function API Key Scope

Tidak memakai satu API key bersama. Setiap Function memakai **API key dinamis** dari header `x-appwrite-key` dengan scope per Function yang didefinisikan di `appwrite/function-scopes.json` (disalin ke `appwrite.config.json` oleh generator).

| Scope | Jumlah Function | Contoh |
| --- | --- | --- |
| `documents.read`, `documents.write` | 47 | mayoritas Function tulis |
| `documents.read` | 10 | `get-*` DTO |
| `documents.read`, `users.read` | 3 | `get-umkm-profile`, `get-creator-profile`, `get-admin-withdrawal-queue` |
| + `files.read`, `files.write` | 2 | `validate-and-upload`, `delete-file` |
| + `rows.write` | 2 | `request-withdrawal`, `review-withdrawal` (+ `users.read`) |
| + `users.read` | 1 | `request-password-otp` |
| `sessions.write`, `users.read`, `users.write` | 1 | `reset-password-with-otp` |
| + `messages.write` | 1 | `send-chat-notification` |

Aturan keras:

- `scopes` baru berlaku setelah deploy ulang Function (`appwrite push functions`). Lihat [`80_Deployment.md`](80_Deployment.md).
- JANGAN pernah expose API key ke frontend; frontend hanya memakai `NEXT_PUBLIC_*`.
- Operasi yang bypass permission user (escrow, wallet, release, withdraw, fraud update, notifikasi lintas user) HANYA via Function.
- Function internal tanpa `execute` (hanya API key/Console): `suspend-user`, `unsuspend-user`, `review-appeal`, `verify-kyc`, `refund-escrow`, `sync-order-revision`, `mature-pending-balance`, `withdrawal-callback`, serta seluruh Function event/cron kecuali `create-user-profile` (event `users.*.create` **dan** `execute: ["users"]`, karena juga dipanggil sinkron dari klien saat register).
- Function publik (`execute: ["any"]`): `request-password-otp`, `reset-password-with-otp` (dilindungi rate limit `otp_rate_limits`), `midtrans-webhook` (verifikasi signature Midtrans).

## Secret

- Secret (API key, `MIDTRANS_SERVER_KEY`, `GEMINI_API_KEY`, `VERTEX_AI_PRIVATE_KEY`, `OPENROUTER_API_KEY`, `IRIS_CALLBACK_SECRET`) hanya di variabel Function atau env server Next.js — tidak pernah di `NEXT_PUBLIC_*` dan tidak di-commit (`functions/<id>/.env` di-gitignore; hanya `.env.example` yang di-commit).
