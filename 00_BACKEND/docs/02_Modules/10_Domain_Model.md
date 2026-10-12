# Domain Model — ERD Tingkat Tinggi

Gambaran model data Marketiv dikelompokkan per domain. Dokumen ini hanya menyajikan peta tabel, kepemilikan modul, dan relasi. **Skema detail (kolom, index, permission) ada di `50_Database.md` modul pemilik, bukan di sini.** Sumber fakta: `00_BACKEND/appwrite.config.json` — satu database `db_marketiv` (`6a4c8598001da3b0d7f0`), **32 tabel**, semuanya `rowSecurity: true`. Model permission: [`../01_Global/50_Security_Guidelines.md`](../01_Global/50_Security_Guidelines.md).

## Kelompok Domain & Modul Pemilik

| Domain | Tabel | Modul Pemilik |
| --- | --- | --- |
| Identity | `users`, `umkm_profiles`, `creator_profiles`, `creator_social_accounts`, `creator_portfolios` | [Users](Users/50_Database.md) |
| Moderasi | `appeals` | [Users](Users/50_Database.md) |
| Storage | `user_storage_usage`, `user_files` (aktif — kuota bucket `user-files`) | [Users](Users/50_Database.md) |
| Auth support | `otp_rate_limits` | [Authentication](Authentication/70_Backend.md) (modul tanpa `50_Database.md`) |
| Campaign / PPV | `campaigns`, `campaign_assets`, `campaign_briefs_v2` (`$id` `6ab530d00018edb50097`), `campaign_briefs` (legacy), `campaign_claims`, `campaign_submissions`, `fraud_checks` | [Campaigns](Campaigns/50_Database.md) |
| RateCard | `rate_cards`, `rate_card_packages` | [RateCards](RateCards/50_Database.md) |
| Chat | `conversations`, `messages` | [Chat](Chat/50_Database.md) |
| Offer | `offers` | [Offers](Offers/50_Database.md) |
| Order | `orders`, `deliverables`, `revisions`, `ratecard_deliverable_validations` | [Orders](Orders/50_Database.md) |
| Payment | `payments`, `wallets`, `transactions`, `escrows`, `withdrawals` | [Payments](Payments/50_Database.md) |
| AI | `ai_requests` | [AI](AI/50_Database.md) |
| Notification | `notifications` | [Notifications](Notifications/50_Database.md) |

Catatan:

- Appwrite Auth menyimpan kredensial user; baris `users` adalah cermin akun Auth (`users.userId` = `$id` akun Auth).
- `campaign_briefs` (legacy, `$id` = nama) masih ada di config tetapi **tidak dipakai kode**; seluruh pembaca/penulis brief (`ai-brief`, `ai-fraud-precheck`, `patch-campaign-status`, frontend) memakai `6ab530d00018edb50097` (`campaign_briefs_v2`).
- `ratecard_deliverable_validations` hanya ditulis Function `review-ratecard-deliverable` (Admin) dan dibaca `release-escrow`.

## Konvensi Referensi

- Kolom referensi user (`userId`, `umkmId`, `creatorId`, `requestedBy`, `reviewedBy`, `user_id`, `umkm_id`, `creator_id`, `sender_id`) berisi **ID akun Auth** (= `users.userId`), bukan `$id` baris profil.
- Referensi antar baris lain berisi `$id` baris tujuan. Appwrite tidak memakai relationship attribute; integritas dijaga Function + unique index.

## Relasi (FK-like)

| Dari | Kolom | Ke | Kardinalitas / index |
| --- | --- | --- | --- |
| `umkm_profiles`, `creator_profiles` | `userId` | `users.userId` | 1:1 (unique) |
| `wallets`, `user_storage_usage` | `userId` | `users.userId` | 1:1 (unique) |
| `user_files`, `notifications`, `appeals`, `ai_requests`, `transactions`, `withdrawals` | `userId` | `users.userId` | N:1 |
| `payments` | `user_id` | `users.userId` | N:1 |
| `otp_rate_limits` | `email`, `ip` | (tanpa FK) | `key` unique |
| `creator_social_accounts`, `creator_portfolios`, `rate_cards` | `creatorId` | `users.userId` (creator) | N:1 |
| `rate_card_packages` | `rateCardId` | `rate_cards.$id` | N:1 |
| `campaigns` | `umkmId` | `users.userId` (UMKM) | N:1 |
| `campaign_assets` | `campaignId` | `campaigns.$id` | N:1 |
| `campaign_briefs_v2` / `campaign_briefs` | `campaignId` | `campaigns.$id` | 1:1 (unique) |
| `campaign_claims` | `campaignId`, `creatorId` | `campaigns.$id`, `users.userId` | N:1 |
| `campaign_submissions` | `claimId` | `campaign_claims.$id` | 1:1 (unique) |
| `campaign_submissions` | `campaignId`, `creatorId` | `campaigns.$id`, `users.userId` | N:1 (denormalisasi) |
| `fraud_checks` | `submissionId` | `campaign_submissions.$id` | N:1 |
| `conversations` | `umkm_id`, `creator_id` | `users.userId` | pasangan unique (`idx_umkm_creator`) |
| `conversations` | `offer_id` | `offers.$id` | opsional |
| `messages` | `conversation_id` | `conversations.$id` | N:1 |
| `messages` | `sender_id`, `offer_id` | `users.userId`, `offers.$id` | `offer_id` untuk `message_type = offer` |
| `offers` | `conversationId` | `conversations.$id` | N:1 |
| `offers` | `umkmId`, `creatorId` | `users.userId` | N:1 |
| `offers` | `packageId` | `rate_card_packages.$id` | opsional (+ snapshot nama/harga) |
| `orders` | `offerId` | `offers.$id` | 1:1 (unique) |
| `orders` | `packageId`, `umkmId`, `creatorId` | `rate_card_packages.$id`, `users.userId` | N:1 |
| `deliverables`, `revisions` | `orderId` | `orders.$id` | N:1 (`deliverables.version` berurutan) |
| `ratecard_deliverable_validations` | `deliverableId` | `deliverables.$id` | 1:1 (unique) |
| `ratecard_deliverable_validations` | `orderId` | `orders.$id` | N:1 |
| `escrows` | `orderId` | `orders.$id` | 1:1 (unique) |
| `payments` | `order_id` / `campaign_id` | `orders.$id` / `campaigns.$id` | per `purpose` (`order`/`campaign`); `order_payment_key`, `gateway_reference` unique |
| `transactions` | `referenceId` + `referenceType` | polimorfik: `escrow`, `withdrawal`, `payment`, `order`, `campaign`, `campaign_submission`, `transaction` | ledger append-only |

## ERD Sederhana (Relationship Tree)

```text
AUTH ACCOUNT ($id) ══ USERS.userId
 ├── UMKM_PROFILES (1:1)
 ├── CREATOR_PROFILES (1:1)
 │     ├── CREATOR_SOCIAL_ACCOUNTS
 │     ├── CREATOR_PORTFOLIOS
 │     └── RATE_CARDS
 │           └── RATE_CARD_PACKAGES
 ├── WALLETS (1:1)
 ├── USER_STORAGE_USAGE (1:1)
 ├── USER_FILES
 ├── TRANSACTIONS
 ├── WITHDRAWALS
 ├── PAYMENTS
 ├── NOTIFICATIONS
 ├── APPEALS
 └── AI_REQUESTS

CAMPAIGNS (umkmId)
 ├── CAMPAIGN_ASSETS
 ├── CAMPAIGN_BRIEFS_V2 (1:1)
 ├── PAYMENTS (purpose=campaign) ──► remainingBudget
 └── CAMPAIGN_CLAIMS (creatorId)
        └── CAMPAIGN_SUBMISSIONS (1:1)
               └── FRAUD_CHECKS

CONVERSATIONS (umkm_id + creator_id, unique)
 ├── MESSAGES (text | offer)
 └── OFFERS (packageId? → RATE_CARD_PACKAGES)
        └── ORDERS (1:1)
               ├── PAYMENTS (purpose=order)
               ├── ESCROWS (1:1)
               ├── REVISIONS
               └── DELIVERABLES (versioned)
                      └── RATECARD_DELIVERABLE_VALIDATIONS (1:1, Admin)

TRANSACTIONS ──referenceType/referenceId──► ESCROWS | WITHDRAWALS | PAYMENTS | ORDERS | CAMPAIGNS | CAMPAIGN_SUBMISSIONS
```

## Catatan Pemodelan

- **One fact = one location.** Setiap tabel didokumentasikan penuh hanya di modul pemiliknya; modul lain melakukan cross-link.
- **Denormalisasi disengaja** untuk kecepatan dashboard (mis. `campaigns.totalClaims/spentAmount/remainingBudget`, `creator_profiles.totalFollowers/totalOrders/rating`, `conversations.last_message/last_message_at`, snapshot paket di `offers`/`orders`). Lihat [ADR-005](../04_Decisions/ADR-005.md).
- **Budget campaign tidak memakai `escrows`** — dana campaign dicatat di `campaigns.remainingBudget`; `escrows` khusus order rate card.
- Penamaan kolom campuran camelCase/snake_case — lihat [`../01_Global/30_Naming_Convention.md`](../01_Global/30_Naming_Convention.md).
- `appwrite.json` (basi) belum memuat `otp_rate_limits` dan `ratecard_deliverable_validations`; gunakan `appwrite.config.json`.
