# 30_Naming_Convention

Konvensi penamaan Marketiv. Struktur folder di [`40_Folder_Structure.md`](40_Folder_Structure.md), daftar tabel di [`../02_Modules/10_Domain_Model.md`](../02_Modules/10_Domain_Model.md).

## Tabel (Appwrite TablesDB)

- `snake_case` jamak (plural); `$id` tabel = nama tabel.
- Contoh: `users`, `umkm_profiles`, `creator_profiles`, `campaigns`, `campaign_claims`, `campaign_submissions`, `rate_card_packages`, `ratecard_deliverable_validations`, `otp_rate_limits`.
- **Pengecualian**: tabel brief aktif ber-`$id` acak `6ab530d00018edb50097` (nama `campaign_briefs_v2`). Selalu rujuk lewat env `CAMPAIGN_BRIEFS_COLLECTION_ID` / konstanta `campaignBriefs`, jangan hardcode nama.

## Kolom (Attribute)

- **Standar untuk kolom baru: `camelCase`** — mayoritas tabel (`userId`, `businessName`, `rewardPer1000Views`, `fraudScore`, `pendingBalance`, `isProfileCompleted`).
- Field bawaan Appwrite memakai prefiks `$` (`$id`, `$createdAt`, `$permissions`).
- **Pengecualian `snake_case` yang sudah ada (jangan di-rename tanpa migrasi):**
  - Tabel `conversations` (`umkm_id`, `creator_id`, `offer_id`, `last_message_at`, `umkm_archived`, …), `messages` (`conversation_id`, `sender_id`, `message_type`, `read_at`), `payments` (`user_id`, `order_id`, `gateway_reference`, `snap_token`, `paid_at`, …).
  - Kolom tambahan belakangan: `users.suspended_at|tos_version|tos_accepted_at|email_verified_at|kyc_status|kyc_verified_at`, `campaign_submissions.views_count|views_captured_at|views_source|views_final`, `orders.review_deadline_at|auto_approved|revision_count|revision_limit|reminder_sent_at`, `escrows.fee_rate`, `withdrawals.processing_at|processed_by|transfer_reference|…`.
- Boolean: preferensi prefiks `is`/`has` (`isRead`, `isProfileCompleted`); pengecualian yang ada: `generatedByAi`, `aiGenerated`, `aiDisclosed`, `auto_approved`, `views_final`, `umkm_archived`, `creator_archived`, `is_archived`.
- Referensi ke user (`userId`, `umkmId`, `creatorId`, `user_id`, `sender_id`, …) selalu berisi **ID akun Appwrite Auth** (= `users.userId`), bukan `$id` baris profil.

## File & Komponen Frontend

- Komponen React: **PascalCase** `.tsx` → `CampaignCard.tsx`, `NegotiationRoomPage.tsx`, `RoleGuard.tsx`.
- File khusus App Router lowercase → `page.tsx`, `layout.tsx`, `loading.tsx`, `error.tsx`, `route.ts`. Folder segmen = URL (`[id]`, `[campaignId]`, `[id_conversation]` untuk dinamis).
- Service: kebab-case + `.service.ts` → `auth.service.ts`, `umkm-appwrite.service.ts`, `ratecard-review.service.ts`.
- Schema (Zod): kebab-case + `.schema.ts` → `campaign.schema.ts`.
- Tipe: `src/types/<domain>.ts` atau `<domain>.types.ts`.
- Konfigurasi: `<area>.config.ts` (`src/config/`).
- Test: `__tests__/<name>.test.ts(x)` di samping kode.

## Route (Next.js App Router)

- `kebab-case`, lowercase, berbahasa Indonesia, di-namespace per role di bawah `/dashboard`.
- Publik: `/`, `/jelajah`, `/panduan`, `/tentang-kami`, `/syarat-ketentuan`, `/kebijakan-privasi`, `/onboarding`.
- Auth (route group `(auth)`): `/login`, `/register`, `/forgot-password`, `/reset-password`, `/auth/callback`.
- UMKM: `/dashboard/umkm`, `/dashboard/umkm/campaign/buat`, `/dashboard/umkm/campaign/[campaignId]`, `/dashboard/umkm/kreator/[id]`, `/dashboard/umkm/negosiasi/[id_conversation]`, `/dashboard/umkm/review-rate-card/[orderId]`, `/dashboard/umkm/keuangan`.
- Creator: `/dashboard/kreator`, `/dashboard/kreator/job-pool/[id]`, `/dashboard/kreator/pekerjaan-aktif/[id]`, `/dashboard/kreator/rate-card`, `/dashboard/kreator/negosiasi/[id_conversation]`, `/dashboard/kreator/keuangan`.
- Admin: aplikasi terpisah `admin/` — `/dashboard`, `/submissions`, `/rate-card-validations`, `/withdrawals`, `/login`.
- API route: `/api/chat` (chatbot).

## Appwrite Function

- `$id` = nama folder = `kebab-case`. Pola yang dipakai:
  - **Aksi user** `verb-noun`: `create-offer`, `submit-campaign-proof`, `request-withdrawal`, `cancel-order`.
  - **Patch terbatas**: `patch-<entity>-<aspek>` (`patch-campaign-draft`, `patch-campaign-status`, `patch-conversation-archive`).
  - **Baca DTO**: `get-<role>-<view>` (`get-umkm-dashboard-summary`, `get-admin-submission-queue`, `get-creator-negotiations`).
  - **Event-driven** sering berbentuk past tense: `campaign-published`, `campaign-claimed`, `user-email-verified`.
- `name` di config Title Case (`Create Offer`); dua Function masih ber-`name` kebab-case (`track-order-review`, `auto-approve-orders`).
- Katalog lengkap: [`../02_Modules/00_Index.md`](../02_Modules/00_Index.md#katalog-appwrite-function).

## Environment Variable

- Frontend publik: prefiks `NEXT_PUBLIC_` (`NEXT_PUBLIC_APPWRITE_ENDPOINT`, `NEXT_PUBLIC_APPWRITE_BUCKET_*`).
- Function: `<TABEL>_COLLECTION_ID` (mis. `ORDERS_COLLECTION_ID`), dengan fallback lama `NEXT_PUBLIC_<X>_COLLECTION` masih dibaca di sebagian Function.
