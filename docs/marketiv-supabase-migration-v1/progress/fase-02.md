# Fase 02 — Fondasi Supabase + skema database

- Tanggal: 2026-11-08
- PR: PR_LINK
- Status: sebagian. Semua task kode selesai dan terverifikasi; skema sudah diterapkan ke Supabase staging. Satu verifikasi diblokir: export data **asli** Appwrite staging gagal karena kuota billing project Appwrite staging habis (`402 billing_limit_exceeded`). Loader sudah diuji dengan fixture sintetis.

## Status task

### Tooling & helper
- [x] `supabase init` → `supabase/config.toml` (Postgres 17, sama dengan staging), `supabase/migrations/`, `supabase/seed.sql` (kosong, disengaja), `supabase/tests/`
- [x] `@supabase/supabase-js` 2.119.0 + `@supabase/ssr` 0.12.7 (versi dipin) di root dan `admin/`, plus `server-only` 0.0.1
- [x] `src/lib/supabase/client.ts` — `createBrowserClient`
- [x] `src/lib/supabase/server.ts` — `createServerClient` + `cookies()` (async, Next 16)
- [x] `src/lib/supabase/admin.ts` — service role, `import "server-only"`
- [x] Padanan di `admin/src/lib/supabase/*` (isi identik)
- [x] `.env.example` dan `admin/.env.example`: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `CRON_SECRET`

### Skema
- [x] `0001_core_users.sql` — `set_updated_at()`, `users`, `legacy_user_map`, `otp_rate_limits`, `appeals`, `notifications`, `ai_requests`
- [x] `0002_profiles.sql` — `umkm_profiles`, `creator_profiles`, `creator_social_accounts` (unique `(creator_id, platform)`), `creator_portfolios`
- [x] `0003_files.sql` — `user_storage_usage`, `user_files`
- [x] `0004_campaigns.sql` — `campaigns` (`platforms text[]`), `campaign_briefs` (gabungan lama + v2, `jsonb`), `campaign_assets`, `campaign_claims` (unique parsial klaim aktif), `campaign_submissions`, `fraud_checks`
- [x] `0005_ratecards_chat.sql` — `rate_cards`, `rate_card_packages`, `conversations`, `offers` (`deadline timestamptz`), `messages`; FK `conversations.offer_id` DEFERRABLE INITIALLY DEFERRED
- [x] `0006_orders.sql` — `orders`, `deliverables`, `revisions`, `ratecard_deliverable_validations`
- [x] `0007_finance.sql` — `wallets`, `payments`, `transactions` (unique `(reference_type, reference_id, type)`), `escrows`, `withdrawals`
- [x] RLS aktif di 32 tabel, tanpa policy

### Tipe & export
- [x] `npm run db:types` → `src/types/supabase.ts` (+ salinan `admin/src/types/supabase.ts`)
- [x] `scripts/migration/export-appwrite.ts` (node-appwrite 31.1.0, cursor, JSONL per tabel + akun Auth, output `.data/` di-.gitignore)
  - [ ] Berjalan pada Appwrite staging — **diblokir** `402 billing_limit_exceeded` (lihat Isu terbuka)

### Tambahan (di luar daftar, mendukung verifikasi)
- [x] `scripts/migration/load-staging.ts` — loader sederhana (lokal/staging), laporan penolakan per baris
- [x] `scripts/migration/mapping.ts` — peta kolom Appwrite → Postgres (sumber tabel pemetaan di bawah)
- [x] `scripts/migration/make-fixture.ts` — fixture sintetis 32 tabel (mode bersih + anomali)
- [x] `supabase/tests/0001_schema_foundation.test.sql` — pgTAP 29 assertion

## File dibuat / diubah
- `supabase/config.toml`, `supabase/.gitignore`, `supabase/seed.sql` — hasil `supabase init` (CLI 3.0.0), `project_id = "marketiv"`.
- `supabase/migrations/0001…0007_*.sql` — skema 32 tabel.
- `supabase/tests/0001_schema_foundation.test.sql` — pgTAP: jumlah tabel, RLS, tanpa policy, trigger, tipe uuid/bigint/jsonb, semua unique, FK deferred, perilaku CHECK/FK.
- `src/lib/supabase/{env,client,server,admin}.ts`, `admin/src/lib/supabase/{env,client,server,admin}.ts` — helper. Env divalidasi saat client dibuat (bukan saat import) supaya app Appwrite tetap jalan tanpa env Supabase.
- `src/types/supabase.ts`, `admin/src/types/supabase.ts` — tipe hasil generate (diformat `oxfmt`).
- `package.json` (root) — dependensi Supabase + `server-only`, script `db:types`. `admin/package.json` — dependensi yang sama. Lockfile ikut berubah.
- `tsconfig.json` (root) — `scripts/migration` dikecualikan (punya `tsconfig.json` sendiri).
- `.env.example`, `admin/.env.example` — env Supabase + `CRON_SECRET`.
- `.gitignore` — `scripts/migration/.data/`.
- `scripts/migration/{package.json,package-lock.json,tsconfig.json,README.md,export-appwrite.ts,load-staging.ts,mapping.ts,make-fixture.ts}` — tooling migrasi terisolasi.
- `docs/marketiv-supabase-migration-v1/02-fondasi-skema.md` — checkbox.

## Keputusan & deviasi dari rencana
- **32 tabel Postgres = 32 tabel Appwrite − 1 (dua tabel brief digabung) + `legacy_user_map`.**
- **Nama migration `0001_…` dipakai persis seperti dokumen.** Di Supabase staging, migration diterapkan lewat MCP (`apply_migration` memberi versi timestamp), lalu versi di `supabase_migrations.schema_migrations` diubah ke `0001`…`0007` supaya cocok dengan nama file repo. `supabase db push` berikutnya tidak akan menerapkan ulang.
- **`public.users`:** PK = `auth.users.id`; `userId` lama → `legacy_user_map`; `$id` lama baris users disimpan di `legacy_user_map.legacy_users_row_id` (hanya audit). `legacy_user_map.user_id` merujuk `auth.users`, bukan `public.users`, karena ada akun Auth tanpa baris users (A5).
- **`users.role` tetap ada tapi bukan sumber otorisasi** (komentar kolom). Role admin dari `app_metadata` di Fase 4. Loader TIDAK mengisi `app_metadata.role`.
- **Kolom `createdAt` buatan app digabung ke `created_at`** (`createdAt ?? $createdAt`); `otp_rate_limits.updatedAt` → `updated_at`. Mapper DTO Fase 5 memetakan `created_at` kembali ke `createdAt`/`$createdAt`.
- **FK `on delete`:** profil/notifikasi/chat `cascade`; data uang dan order (`orders`, `payments`, `transactions`, `escrows`, `withdrawals`, `wallets`, `campaigns.umkm_id`, `campaign_submissions`) `restrict`; referensi ke offer/paket yang bisa dihapus (`conversations.offer_id`, `messages.offer_id`, `offers.package_id`, `orders.package_id`) `set null` — "tarik penawaran" menghapus baris offer.
- **Unique klaim aktif:** `campaign_claims (campaign_id, creator_id) where status <> 'expired'`, sesuai guard kode lama ("klaim non-expired tetap menghalangi duplikasi").
- **Kolom kategori dibiarkan teks bebas** (`campaigns.category`, `umkm_profiles.category`): kode hanya memvalidasi panjang, dan `create-user-profile` menulis `''`. Bukan enum.
- **Boolean opsional Appwrite → `not null default false`**; angka opsional dengan default Appwrite → `not null default …`. Loader mengirim `null` sebagai "pakai default".
- **Batas panjang string Appwrite dipertahankan** sebagai `check (char_length(..) <= N)`, kecuali `do_and_dont`/`materials` (sekarang jsonb; batas 400 char lama dibuang).
- **`user_storage_usage` & `user_files.size_bytes` → bigint** (batas integer Appwrite 999.999.999 tidak relevan).
- **`escrows.fee_rate numeric(5,4)` 0..1**, `creator_profiles.rating numeric(4,2)`, `creator_social_accounts.engagement_rate numeric(7,4)`.
- **Hak akses:** `legacy_user_map` dan `otp_rate_limits` di-`revoke` dari `anon`/`authenticated` (tabel internal). Grant tabel lain dibiarkan default Supabase; RLS tanpa policy menutup akses sampai Fase 3.
- **Helper `env.ts` tambahan** (di luar daftar) dipakai bersama `client/server/admin`.
- **Supabase CLI tidak dijadikan dependensi** root (biner diunduh saat install, memberatkan build Netlify). `db:types` memakai `npx --yes supabase@3.0.0` dan `oxfmt@0.77.0`.
- **Data uji staging = fixture sintetis**, bukan data Appwrite asli (lihat Isu terbuka). Akun fixture `@example.test`, tanpa password.
- **Export produksi tidak dijalankan.** Sesi ini tidak diizinkan membaca Appwrite produksi; prompt fase meminta dump **staging**.

## Daftar nilai enum (CHECK) dan sumbernya
Nilai diambil dari kode (ditulis, dibandingkan, atau tipe TS), bukan hanya config Appwrite. Bukti file:line ada di riwayat sesi; ringkasan:

| Kolom | Nilai | Catatan |
|---|---|---|
| `users.role` | umkm, creator, admin | kode lama toleran kapital → loader me-lowercase |
| `users.status` | active, suspended, terminated | |
| `users.kyc_status` | none, pending_wa, verified | null lama → `none` (default) |
| `appeals.status` | submitted, under_review, approved, rejected | `under_review` hanya dibandingkan |
| `creator_profiles.niche` | kuliner, fashion, pariwisata, edukasi, kecantikan, lainnya | nullable; loader me-lowercase |
| `creator_social_accounts.platform`, `campaign_submissions.platform`, elemen `campaigns.platforms` | tiktok, instagram, youtube | |
| `user_files.status` | active, deleted | |
| `user_files.bucket_id` | 8 ID bucket lama | |
| `campaigns.type` | ugc, clipping | |
| `campaigns.status` | draft, active, paused, completed, cancelled | `cancelled` hanya dibandingkan refund-order; `full` hanya tab UI (tidak masuk) |
| `campaign_assets.source` | external, external_url, storage | `external` vs `external_url` = makna sama, normalisasi Fase 7 |
| `campaign_assets.type` | link, image, video, document | |
| `campaign_claims.status` | claimed, submitted, approved, rejected, expired | |
| `campaign_submissions.status` | pending, approved, rejected | |
| `campaign_submissions.fraud_status`, `fraud_checks.result` | safe, review, rejected | |
| `campaign_submissions.views_source` | api, scrape, manual_admin | |
| `notifications.type` | 23 nilai (lihat `0001_core_users.sql`) | termasuk yang hanya dibandingkan UI: submission_approved, offer_created, withdrawal, payment |
| `ai_requests.feature` | brief, fraud, landing | |
| `rate_cards.status` | draft, published | |
| `messages.message_type` | text, offer, system, image, file | 3 terakhir hanya dibandingkan |
| `offers.status` | pending, accepted, rejected | tarik penawaran = hapus baris |
| `orders.status` | pending_payment, escrow, in_progress, revision, approved, completed, cancelled, expired | escrow/approved/expired hanya dibandingkan |
| `deliverables.source`, `…validations.source_snapshot` | storage, external_url | |
| `deliverables.status` | submitted, revision_requested, approved, delivered | `delivered` legacy |
| `revisions.status` | open, resolved | |
| `ratecard_deliverable_validations.status` | valid, invalid | `pending` hanya default DTO |
| `payments.purpose` | order, campaign, topup | `topup` hanya tipe TS |
| `payments.status` | pending, paid, failed, expired, cancelled | |
| `payments.gateway` | midtrans, manual-dev, manual-smoke | dua terakhir dari skrip ops staging |
| `transactions.type` | payment, release, fee, refund, mature, withdrawal, withdrawal_reversal | |
| `transactions.status` | pending, processing, completed, matured, failed | |
| `transactions.reference_type` | order, payment, escrow, campaign, campaign_submission, transaction, withdrawal | |
| `escrows.status` | held, releasing, released, refunded | |
| `withdrawals.status` | requested, processing, succeeded, failed, reversed | `processed` legacy sengaja ditolak |
| `withdrawals.payout_method` | bank, ewallet | |
| `withdrawals.requester_role` | creator, umkm | nullable (baris lama) |
| `withdrawals.source_origin` | creator, umkm_refund, umkm_budget | nullable |

## Hasil verifikasi
| Perintah / skenario | Hasil |
|---|---|
| `supabase db reset` (lokal, CLI 3.0.0, Postgres 17) | lulus, 7 migration bersih |
| `supabase test db` (pgTAP) | lulus 29/29 |
| `supabase db advisors --type all` (lokal) | tidak ada temuan |
| Advisor Supabase staging — security | hanya INFO `rls_enabled_no_policy` ×32 (diharapkan; policy di Fase 3) |
| Advisor Supabase staging — performance | hanya INFO `unused_index` (DB baru) |
| `npm run db:types` | lulus; `src/types/supabase.ts` = `admin/src/types/supabase.ts` |
| `npm run typecheck` (root) | lulus (setelah `npx next typegen`) |
| `npm run typecheck` (admin) | lulus (setelah `npx next typegen`) |
| `npm run typecheck` (`scripts/migration`) | lulus |
| `npm run lint` (root) | **gagal**: 4 error, 48 warning — semuanya sudah ada sejak Fase 0, di file app yang tidak disentuh. File baru (`src/lib/supabase`, `src/types/supabase.ts`) bersih. |
| `npm run lint` (admin) | 0 error, 6 warning — sama persis dengan sebelum perubahan |
| `npm test -- --run` (root) | lulus: 81 file, 448 test |
| `npm test -- --run` (admin) | lulus: 8 file, 77 test |
| `export-appwrite.ts --target staging` | **gagal**: Appwrite `402 billing_limit_exceeded` (kuota project staging habis) |
| Loader, fixture bersih → Supabase lokal | 6 akun Auth + 50 baris di 32 tabel, **0 ditolak, 0 FK** |
| Loader dijalankan ulang (idempotensi) | 0 ditolak; akun Auth dipakai ulang dari `legacy_user_map` |
| Loader, fixture anomali → lokal | 9/9 baris rusak ditolak dengan alasan yang diharapkan (FK, unique, CHECK, user tak dikenal, tanggal tak valid) |
| Loader, fixture bersih → Supabase staging | 0 ditolak, 0 FK; `conversations.offer_id` tertaut |

## Env / secret baru (nama saja)
- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` — helper `src/lib/supabase/*` (root + admin).
- `SUPABASE_SERVICE_ROLE_KEY` — `src/lib/supabase/admin.ts` (server only).
- `CRON_SECRET` — endpoint `/api/cron/*` yang dipanggil `pg_cron`/`pg_net` (dipakai Fase 7/8).
- Tooling: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` (loader); `APPWRITE_*` / `APPWRITE_STAGING_*` (+ opsional `APPWRITE_STAGING_DATABASE_ID`) untuk export.

## Isu terbuka
- **Appwrite staging kena batas billing** (`402 billing_limit_exceeded` saat `listTables`). Export data asli staging dan uji muatnya belum bisa. Usulan: pemilik memulihkan kuota/plan project staging `69f9d45b00315cb0ec2f` (atau menunggu siklus billing berikutnya), lalu jalankan:
  `node export-appwrite.ts --target staging` → `node load-staging.ts --target local --dir .data/export-staging-…` → bila 0 FK, `--target staging --confirm-ref zwrzwkesaetzbnajjxqc`.
  Alternatif: pemilik mengizinkan export produksi read-only (`--target prod`) untuk uji muat ke DB **lokal** saja (bukan staging, karena berisi PII dan hash password asli).
- **Supabase staging berisi fixture sintetis** (6 akun `@example.test`, 50 baris). Hapus sebelum memuat data asli bila tidak diinginkan: `delete from auth.users where raw_app_meta_data->>'migrated_from' = 'appwrite' and email like '%@example.test'` (cascade ke `public.users`; tabel uang memakai RESTRICT, jadi kosongkan dulu `transactions`, `payments`, `escrows`, `withdrawals`, `wallets`, `orders`, `campaign_submissions`, `campaigns`).
- **Duplikat ledger lama** `(campaign_submission, X, release)` dari race `calculate-campaign-reward` akan ditolak unique `transactions`. Produksi saat ini 0 ledger, jadi belum berdampak.

## Isu untuk fase lain
- **Fase 3:** buat policy untuk 32 tabel (advisor INFO `rls_enabled_no_policy` sampai saat itu). `legacy_user_map` dan `otp_rate_limits` sudah di-revoke dari `anon`/`authenticated`; biarkan tanpa policy. Bucket Supabase dibuat dengan ID yang sama dengan `user_files.bucket_id`.
- **Fase 4:** `users.role` hanya data profil. Admin dari `app_metadata.role` (allowlist). Loader tidak mengisi `app_metadata.role`; akun migrasi punya `app_metadata.legacy_user_id` dan `migrated_from = 'appwrite'`. Middleware perlu me-refresh sesi karena `server.ts` mengabaikan `setAll` dari Server Component.
- **Fase 5:** mapper DTO: `created_at` → `createdAt`/`$createdAt`, `id` → `$id`, snake_case → camelCase sesuai tabel pemetaan; `do_and_dont` sekarang objek (dulu JSON string), `materials` array; ID user sekarang UUID (DTO yang menampilkan ID Appwrite lama perlu `legacy_user_map`).
- **Fase 7:** normalisasi `campaign_assets.source` (`external` vs `external_url`). Status `cancelled` campaign dan `escrow`/`approved`/`expired` order belum pernah ditulis kode; putuskan apakah tetap dipakai. Siklus conversation ↔ offer bisa dibuat dalam satu RPC berkat FK deferred.
- **Fase 8:** `transactions` sudah unique `(reference_type, reference_id, type)`; RPC uang cukup `insert … on conflict do nothing`. `request-withdrawal` lama mencari `type=payment and referenceType=campaign`, padahal top-up campaign ditulis `referenceType=payment` (query lama tidak pernah cocok) — jangan disalin.
- **Fase 9:** `mapping.ts` + `load-staging.ts` adalah dasar transform. Transform A1 (campaign aktif tanpa dana → draft), allowlist admin, `--with-passwords`, dedup ledger lama, dan normalisasi kapital belum ada di loader. Loader memakai REST (service role), jadi lambat untuk data besar; data produksi hanya ~95 baris.

## Catatan serah-terima untuk fase berikutnya
- Supabase CLI: `npx supabase@3.0.0` (bukan dependensi). Lokal: `supabase start` lalu `supabase db reset`; di sesi cloud jalankan `dockerd` dulu bila daemon belum hidup. `supabase test db` butuh image `pg_prove`.
- Setelah mengubah skema: `npm run db:types` (butuh stack lokal hidup) — menulis tipe ke root dan `admin/`.
- Supabase staging (`zwrzwkesaetzbnajjxqc`) sudah berisi skema 0001–0007 + fixture sintetis. Riwayat migration memakai versi `0001`…`0007`.
- Tooling migrasi di `scripts/migration/` (paket sendiri, `npm ci` di folder itu). Node ≥ 22.18. Di sesi cloud: `NODE_USE_ENV_PROXY=1`.
- Helper Supabase belum dipakai kode app mana pun; app masih Appwrite.

## Tabel pemetaan kolom Appwrite → Postgres
Dibuat dari `scripts/migration/mapping.ts`. Aturan umum: `$permissions`, `$sequence`, `$tableId`, `$databaseId` dibuang (diganti RLS). Kolom user (`*_id` bertipe uuid) dipetakan dari ID Auth Appwrite lewat `legacy_user_map`. `conversations.offer_id` dimuat di lintasan kedua (setelah `offers`).

#### `users` ← `users`

| Appwrite | Postgres | Tipe |
|---|---|---|
| `userId` | `id` (PK) | uuid = auth.users.id (via legacy_user_map) |
| `$id` | `legacy_user_map.legacy_users_row_id` | text (audit saja) |
| `role` | `role` | text (lowercase) |
| `status` | `status` | text (lowercase) |
| `email` | `email` | text |
| `phone` | `phone` | text |
| `address` | `address` | text |
| `suspended_at` | `suspended_at` | timestamptz |
| `tos_version` | `tos_version` | text |
| `tos_accepted_at` | `tos_accepted_at` | timestamptz |
| `email_verified_at` | `email_verified_at` | timestamptz |
| `kyc_status` | `kyc_status` | text (lowercase) |
| `kyc_verified_at` | `kyc_verified_at` | timestamptz |
| `createdAt` ?? `$createdAt` | `created_at` | timestamptz |
| `$updatedAt` | `updated_at` | timestamptz |

#### `otp_rate_limits` ← `otp_rate_limits`

| Appwrite | Postgres | Tipe |
|---|---|---|
| `$id` | `id` | text (dipertahankan) |
| `key` | `key` | text |
| `email` | `email` | text |
| `ip` | `ip` | text |
| `count` | `count` | integer |
| `windowStart` | `window_start` | timestamptz |
| `$createdAt` | `created_at` | timestamptz |
| `updatedAt` ?? `$updatedAt` | `updated_at` | timestamptz |

#### `appeals` ← `appeals`

| Appwrite | Postgres | Tipe |
|---|---|---|
| `$id` | `id` | text (dipertahankan) |
| `userId` | `user_id` | uuid → users (via legacy_user_map) |
| `actionRef` | `action_ref` | text |
| `reason` | `reason` | text |
| `evidence` | `evidence` | text |
| `deadlineAt` | `deadline_at` | timestamptz |
| `slaDecidedAt` | `sla_decided_at` | timestamptz |
| `status` | `status` | text |
| `decision` | `decision` | text |
| `decidedAt` | `decided_at` | timestamptz |
| `$createdAt` | `created_at` | timestamptz |
| `$updatedAt` | `updated_at` | timestamptz |

#### `notifications` ← `notifications`

| Appwrite | Postgres | Tipe |
|---|---|---|
| `$id` | `id` | text (dipertahankan) |
| `userId` | `user_id` | uuid → users (via legacy_user_map) |
| `title` | `title` | text |
| `message` | `message` | text |
| `type` | `type` | text |
| `isRead` | `is_read` | boolean |
| `createdAt` ?? `$createdAt` | `created_at` | timestamptz |
| `$updatedAt` | `updated_at` | timestamptz |

#### `ai_requests` ← `ai_requests`

| Appwrite | Postgres | Tipe |
|---|---|---|
| `$id` | `id` | text (dipertahankan) |
| `userId` | `user_id` | uuid → users (via legacy_user_map) |
| `feature` | `feature` | text |
| `prompt` | `prompt` | text |
| `response` | `response` | text |
| `createdAt` ?? `$createdAt` | `created_at` | timestamptz |
| `$updatedAt` | `updated_at` | timestamptz |

#### `umkm_profiles` ← `umkm_profiles`

| Appwrite | Postgres | Tipe |
|---|---|---|
| `$id` | `id` | text (dipertahankan) |
| `userId` | `user_id` | uuid → users (via legacy_user_map) |
| `businessName` | `business_name` | text |
| `category` | `category` | text |
| `description` | `description` | text |
| `city` | `city` | text |
| `tiktok` | `tiktok` | text |
| `logoUrl` | `logo_url` | text |
| `isProfileCompleted` | `is_profile_completed` | boolean |
| `$createdAt` | `created_at` | timestamptz |
| `$updatedAt` | `updated_at` | timestamptz |

#### `creator_profiles` ← `creator_profiles`

| Appwrite | Postgres | Tipe |
|---|---|---|
| `$id` | `id` | text (dipertahankan) |
| `userId` | `user_id` | uuid → users (via legacy_user_map) |
| `displayName` | `display_name` | text |
| `bio` | `bio` | text |
| `city` | `city` | text |
| `avatarUrl` | `avatar_url` | text |
| `bannerUrl` | `banner_url` | text |
| `niche` | `niche` | text (lowercase) |
| `totalFollowers` | `total_followers` | integer |
| `totalOrders` | `total_orders` | integer |
| `rating` | `rating` | numeric |
| `isProfileCompleted` | `is_profile_completed` | boolean |
| `$createdAt` | `created_at` | timestamptz |
| `$updatedAt` | `updated_at` | timestamptz |

#### `creator_social_accounts` ← `creator_social_accounts`

| Appwrite | Postgres | Tipe |
|---|---|---|
| `$id` | `id` | text (dipertahankan) |
| `creatorId` | `creator_id` | uuid → users (via legacy_user_map) |
| `platform` | `platform` | text (lowercase) |
| `username` | `username` | text |
| `followers` | `followers` | integer |
| `engagementRate` | `engagement_rate` | numeric |
| `$createdAt` | `created_at` | timestamptz |
| `$updatedAt` | `updated_at` | timestamptz |

#### `creator_portfolios` ← `creator_portfolios`

| Appwrite | Postgres | Tipe |
|---|---|---|
| `$id` | `id` | text (dipertahankan) |
| `creatorId` | `creator_id` | uuid → users (via legacy_user_map) |
| `title` | `title` | text |
| `description` | `description` | text |
| `thumbnailUrl` | `thumbnail_url` | text |
| `portfolioUrl` | `portfolio_url` | text |
| `$createdAt` | `created_at` | timestamptz |
| `$updatedAt` | `updated_at` | timestamptz |

#### `user_storage_usage` ← `user_storage_usage`

| Appwrite | Postgres | Tipe |
|---|---|---|
| `$id` | `id` | text (dipertahankan) |
| `userId` | `user_id` | uuid → users (via legacy_user_map) |
| `usedBytes` | `used_bytes` | bigint |
| `quotaBytes` | `quota_bytes` | bigint |
| `fileCount` | `file_count` | integer |
| `$createdAt` | `created_at` | timestamptz |
| `$updatedAt` | `updated_at` | timestamptz |

#### `user_files` ← `user_files`

| Appwrite | Postgres | Tipe |
|---|---|---|
| `$id` | `id` | text (dipertahankan) |
| `userId` | `user_id` | uuid → users (via legacy_user_map) |
| `storageFileId` | `storage_file_id` | text |
| `bucketId` | `bucket_id` | text |
| `fileName` | `file_name` | text |
| `mimeType` | `mime_type` | text |
| `sizeBytes` | `size_bytes` | bigint |
| `status` | `status` | text |
| `deletedAt` | `deleted_at` | timestamptz |
| `createdAt` ?? `$createdAt` | `created_at` | timestamptz |
| `$updatedAt` | `updated_at` | timestamptz |

#### `campaigns` ← `campaigns`

| Appwrite | Postgres | Tipe |
|---|---|---|
| `$id` | `id` | text (dipertahankan) |
| `umkmId` | `umkm_id` | uuid → users (via legacy_user_map) |
| `title` | `title` | text |
| `category` | `category` | text |
| `type` | `type` | text (lowercase) |
| `platforms` | `platforms` | text[] |
| `description` | `description` | text |
| `budget` | `budget` | bigint |
| `rewardPer1000Views` | `reward_per_1000_views` | bigint |
| `status` | `status` | text |
| `claimLimit` | `claim_limit` | integer |
| `submissionDays` | `submission_days` | integer |
| `totalClaims` | `total_claims` | integer |
| `spentAmount` | `spent_amount` | bigint |
| `remainingBudget` | `remaining_budget` | bigint |
| `publishedAt` | `published_at` | timestamptz |
| `thumbnailUrl` | `thumbnail_url` | text |
| `$createdAt` | `created_at` | timestamptz |
| `$updatedAt` | `updated_at` | timestamptz |

#### `campaign_briefs` ← `campaign_briefs` + `6ab530d00018edb50097` (v2)

| Appwrite | Postgres | Tipe |
|---|---|---|
| `$id` | `id` | text (dipertahankan) |
| `campaignId` | `campaign_id` | text |
| `objective` | `objective` | text |
| `contentAngle` | `content_angle` | text |
| `cta` | `cta` | text |
| `briefDetail` | `brief_detail` | text |
| `doAndDont` | `do_and_dont` | jsonb object |
| `materialsJson` | `materials` | jsonb array |
| `generatedByAi` | `generated_by_ai` | boolean |
| `$createdAt` | `created_at` | timestamptz |
| `$updatedAt` | `updated_at` | timestamptz |

#### `campaign_assets` ← `campaign_assets`

| Appwrite | Postgres | Tipe |
|---|---|---|
| `$id` | `id` | text (dipertahankan) |
| `campaignId` | `campaign_id` | text |
| `source` | `source` | text |
| `type` | `type` | text |
| `fileUrl` | `file_url` | text |
| `fileName` | `file_name` | text |
| `$createdAt` | `created_at` | timestamptz |
| `$updatedAt` | `updated_at` | timestamptz |

#### `campaign_claims` ← `campaign_claims`

| Appwrite | Postgres | Tipe |
|---|---|---|
| `$id` | `id` | text (dipertahankan) |
| `campaignId` | `campaign_id` | text |
| `creatorId` | `creator_id` | uuid → users (via legacy_user_map) |
| `status` | `status` | text |
| `claimedAt` | `claimed_at` | timestamptz |
| `$createdAt` | `created_at` | timestamptz |
| `$updatedAt` | `updated_at` | timestamptz |

#### `campaign_submissions` ← `campaign_submissions`

| Appwrite | Postgres | Tipe |
|---|---|---|
| `$id` | `id` | text (dipertahankan) |
| `claimId` | `claim_id` | text |
| `campaignId` | `campaign_id` | text |
| `creatorId` | `creator_id` | uuid → users (via legacy_user_map) |
| `platform` | `platform` | text (lowercase) |
| `postUrl` | `post_url` | text |
| `caption` | `caption` | text |
| `views` | `views` | bigint |
| `views_count` | `views_count` | bigint |
| `views_captured_at` | `views_captured_at` | timestamptz |
| `views_source` | `views_source` | text |
| `views_final` | `views_final` | boolean |
| `engagement` | `engagement` | bigint |
| `fraudScore` | `fraud_score` | integer |
| `fraudStatus` | `fraud_status` | text |
| `status` | `status` | text |
| `reviewNotes` | `review_notes` | text |
| `creatorCredit` | `creator_credit` | text |
| `aiGenerated` | `ai_generated` | boolean |
| `aiDisclosed` | `ai_disclosed` | boolean |
| `$createdAt` | `created_at` | timestamptz |
| `$updatedAt` | `updated_at` | timestamptz |

#### `fraud_checks` ← `fraud_checks`

| Appwrite | Postgres | Tipe |
|---|---|---|
| `$id` | `id` | text (dipertahankan) |
| `submissionId` | `submission_id` | text |
| `score` | `score` | integer |
| `result` | `result` | text |
| `reason` | `reason` | text |
| `createdAt` ?? `$createdAt` | `created_at` | timestamptz |
| `$updatedAt` | `updated_at` | timestamptz |

#### `rate_cards` ← `rate_cards`

| Appwrite | Postgres | Tipe |
|---|---|---|
| `$id` | `id` | text (dipertahankan) |
| `creatorId` | `creator_id` | uuid → users (via legacy_user_map) |
| `title` | `title` | text |
| `description` | `description` | text |
| `status` | `status` | text |
| `createdAt` ?? `$createdAt` | `created_at` | timestamptz |
| `$updatedAt` | `updated_at` | timestamptz |

#### `rate_card_packages` ← `rate_card_packages`

| Appwrite | Postgres | Tipe |
|---|---|---|
| `$id` | `id` | text (dipertahankan) |
| `rateCardId` | `rate_card_id` | text |
| `name` | `name` | text |
| `description` | `description` | text |
| `output` | `output` | text |
| `deliveryDays` | `delivery_days` | integer |
| `price` | `price` | bigint |
| `revisionLimit` | `revision_limit` | integer |
| `$createdAt` | `created_at` | timestamptz |
| `$updatedAt` | `updated_at` | timestamptz |

#### `conversations` ← `conversations`

| Appwrite | Postgres | Tipe |
|---|---|---|
| `$id` | `id` | text (dipertahankan) |
| `umkm_id` | `umkm_id` | uuid → users (via legacy_user_map) |
| `creator_id` | `creator_id` | uuid → users (via legacy_user_map) |
| `offer_id` | `offer_id` | text |
| `last_message` | `last_message` | text |
| `last_message_at` | `last_message_at` | timestamptz |
| `umkm_archived` | `umkm_archived` | boolean |
| `creator_archived` | `creator_archived` | boolean |
| `is_archived` | `is_archived` | boolean |
| `$createdAt` | `created_at` | timestamptz |
| `$updatedAt` | `updated_at` | timestamptz |

#### `offers` ← `offers`

| Appwrite | Postgres | Tipe |
|---|---|---|
| `$id` | `id` | text (dipertahankan) |
| `conversationId` | `conversation_id` | text |
| `umkmId` | `umkm_id` | uuid → users (via legacy_user_map) |
| `creatorId` | `creator_id` | uuid → users (via legacy_user_map) |
| `title` | `title` | text |
| `description` | `description` | text |
| `price` | `price` | bigint |
| `deadline` | `deadline` | timestamptz (parse longgar) |
| `revisionLimit` | `revision_limit` | integer |
| `packageId` | `package_id` | text |
| `packageNameSnapshot` | `package_name_snapshot` | text |
| `packagePriceSnapshot` | `package_price_snapshot` | bigint |
| `status` | `status` | text |
| `createdAt` ?? `$createdAt` | `created_at` | timestamptz |
| `$updatedAt` | `updated_at` | timestamptz |

#### `messages` ← `messages`

| Appwrite | Postgres | Tipe |
|---|---|---|
| `$id` | `id` | text (dipertahankan) |
| `conversation_id` | `conversation_id` | text |
| `sender_id` | `sender_id` | uuid → users (via legacy_user_map) |
| `message_type` | `message_type` | text |
| `content` | `content` | text |
| `offer_id` | `offer_id` | text |
| `read_at` | `read_at` | timestamptz |
| `$createdAt` | `created_at` | timestamptz |
| `$updatedAt` | `updated_at` | timestamptz |

#### `orders` ← `orders`

| Appwrite | Postgres | Tipe |
|---|---|---|
| `$id` | `id` | text (dipertahankan) |
| `offerId` | `offer_id` | text |
| `packageId` | `package_id` | text |
| `packageNameSnapshot` | `package_name_snapshot` | text |
| `packagePriceSnapshot` | `package_price_snapshot` | bigint |
| `creatorId` | `creator_id` | uuid → users (via legacy_user_map) |
| `umkmId` | `umkm_id` | uuid → users (via legacy_user_map) |
| `amount` | `amount` | bigint |
| `status` | `status` | text |
| `review_deadline_at` | `review_deadline_at` | timestamptz |
| `auto_approved` | `auto_approved` | boolean |
| `revision_count` | `revision_count` | integer |
| `revision_limit` | `revision_limit` | integer |
| `reminder_sent_at` | `reminder_sent_at` | timestamptz |
| `createdAt` ?? `$createdAt` | `created_at` | timestamptz |
| `$updatedAt` | `updated_at` | timestamptz |

#### `deliverables` ← `deliverables`

| Appwrite | Postgres | Tipe |
|---|---|---|
| `$id` | `id` | text (dipertahankan) |
| `orderId` | `order_id` | text |
| `source` | `source` | text |
| `fileUrl` | `file_url` | text |
| `fileId` | `file_id` | text |
| `notes` | `notes` | text |
| `version` | `version` | integer |
| `status` | `status` | text |
| `creatorCredit` | `creator_credit` | text |
| `aiGenerated` | `ai_generated` | boolean |
| `createdAt` ?? `$createdAt` | `created_at` | timestamptz |
| `$updatedAt` | `updated_at` | timestamptz |

#### `revisions` ← `revisions`

| Appwrite | Postgres | Tipe |
|---|---|---|
| `$id` | `id` | text (dipertahankan) |
| `orderId` | `order_id` | text |
| `requestedBy` | `requested_by` | uuid → users (via legacy_user_map) |
| `message` | `message` | text |
| `status` | `status` | text |
| `$createdAt` | `created_at` | timestamptz |
| `$updatedAt` | `updated_at` | timestamptz |

#### `ratecard_deliverable_validations` ← `ratecard_deliverable_validations`

| Appwrite | Postgres | Tipe |
|---|---|---|
| `$id` | `id` | text (dipertahankan) |
| `deliverableId` | `deliverable_id` | text |
| `orderId` | `order_id` | text |
| `deliverableVersion` | `deliverable_version` | integer |
| `sourceSnapshot` | `source_snapshot` | text |
| `evidenceUrlSnapshot` | `evidence_url_snapshot` | text |
| `status` | `status` | text |
| `reviewedBy` | `reviewed_by` | uuid → users (via legacy_user_map) |
| `reviewNotes` | `review_notes` | text |
| `reviewedAt` | `reviewed_at` | timestamptz |
| `$createdAt` | `created_at` | timestamptz |
| `$updatedAt` | `updated_at` | timestamptz |

#### `wallets` ← `wallets`

| Appwrite | Postgres | Tipe |
|---|---|---|
| `$id` | `id` | text (dipertahankan) |
| `userId` | `user_id` | uuid → users (via legacy_user_map) |
| `balance` | `balance` | bigint |
| `pendingBalance` | `pending_balance` | bigint |
| `$createdAt` | `created_at` | timestamptz |
| `$updatedAt` | `updated_at` | timestamptz |

#### `payments` ← `payments`

| Appwrite | Postgres | Tipe |
|---|---|---|
| `$id` | `id` | text (dipertahankan) |
| `user_id` | `user_id` | uuid → users (via legacy_user_map) |
| `order_id` | `order_id` | text |
| `order_payment_key` | `order_payment_key` | text |
| `campaign_id` | `campaign_id` | text |
| `amount` | `amount` | bigint |
| `total_amount` | `total_amount` | bigint |
| `fee_amount` | `fee_amount` | bigint |
| `purpose` | `purpose` | text |
| `gateway` | `gateway` | text |
| `gateway_reference` | `gateway_reference` | text |
| `snap_token` | `snap_token` | text |
| `redirect_url` | `redirect_url` | text |
| `status` | `status` | text |
| `paid_at` | `paid_at` | timestamptz |
| `$createdAt` | `created_at` | timestamptz |
| `$updatedAt` | `updated_at` | timestamptz |

#### `transactions` ← `transactions`

| Appwrite | Postgres | Tipe |
|---|---|---|
| `$id` | `id` | text (dipertahankan) |
| `userId` | `user_id` | uuid → users (via legacy_user_map) |
| `amount` | `amount` | bigint |
| `type` | `type` | text |
| `referenceId` | `reference_id` | text |
| `referenceType` | `reference_type` | text |
| `status` | `status` | text |
| `$createdAt` | `created_at` | timestamptz |
| `$updatedAt` | `updated_at` | timestamptz |

#### `escrows` ← `escrows`

| Appwrite | Postgres | Tipe |
|---|---|---|
| `$id` | `id` | text (dipertahankan) |
| `orderId` | `order_id` | text |
| `amount` | `amount` | bigint |
| `status` | `status` | text |
| `fee_rate` | `fee_rate` | numeric |
| `$createdAt` | `created_at` | timestamptz |
| `$updatedAt` | `updated_at` | timestamptz |

#### `withdrawals` ← `withdrawals`

| Appwrite | Postgres | Tipe |
|---|---|---|
| `$id` | `id` | text (dipertahankan) |
| `userId` | `user_id` | uuid → users (via legacy_user_map) |
| `amount` | `amount` | bigint |
| `payoutMethod` | `payout_method` | text |
| `providerName` | `provider_name` | text |
| `accountNumber` | `account_number` | text |
| `accountName` | `account_name` | text |
| `status` | `status` | text |
| `processing_at` | `processing_at` | timestamptz |
| `processedAt` | `processed_at` | timestamptz |
| `processed_by` | `processed_by` | uuid → users (via legacy_user_map) |
| `transfer_reference` | `transfer_reference` | text |
| `admin_note` | `admin_note` | text |
| `failure_reason` | `failure_reason` | text |
| `reversed_at` | `reversed_at` | timestamptz |
| `requester_role` | `requester_role` | text |
| `source_origin` | `source_origin` | text |
| `kyc_status` | `kyc_status` | text |
| `iris_reference` | `iris_reference` | text |
| `$createdAt` | `created_at` | timestamptz |
| `$updatedAt` | `updated_at` | timestamptz |

