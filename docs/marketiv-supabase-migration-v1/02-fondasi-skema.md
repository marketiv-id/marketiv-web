# Fase 2 — Fondasi Supabase + skema database

**Bobot:** M

## Tujuan

- Supabase sudah bisa dipakai dari kode.
- Skema Postgres untuk 32 tabel siap, lengkap dengan FK dan constraint.
- Dump data Appwrite bisa dimuat ke staging.

## Task

### Tooling & helper
- [ ] `supabase init` → `supabase/config.toml`, `supabase/migrations/`, `supabase/seed.sql`, `supabase/tests/`
- [ ] `npm i @supabase/supabase-js @supabase/ssr` di root dan `admin/`
- [ ] `src/lib/supabase/client.ts` — `createBrowserClient`
- [ ] `src/lib/supabase/server.ts` — `createServerClient` dengan `cookies()`, untuk RSC dan route handler
- [ ] `src/lib/supabase/admin.ts` — client service role, `import "server-only"`
- [ ] Padanan helper di `admin/src/lib/supabase/*`
- [ ] Tambah env ke `.env.example`: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `CRON_SECRET`

### Skema
Sumbernya `00_BACKEND/appwrite.config.json`. Satu file migration per domain:

- [ ] `0001_core_users.sql`
  - `users`: `id uuid` pk, FK ke `auth.users`
  - `legacy_user_map`, `otp_rate_limits`, `appeals`, `notifications`, `ai_requests`
- [ ] `0002_profiles.sql`: `umkm_profiles`, `creator_profiles`, `creator_social_accounts` (unique `(creator_id, platform)`), `creator_portfolios`
- [ ] `0003_files.sql`: `user_storage_usage`, `user_files`
- [ ] `0004_campaigns.sql`
  - `campaigns`, dengan `platforms text[]`
  - `campaign_briefs`: **gabungan** `campaign_briefs` + `6ab530d00018edb50097`, dengan `do_and_dont`/`materials` bertipe `jsonb`
  - `campaign_assets`, `campaign_claims` (unique `(campaign_id, creator_id)` untuk klaim aktif), `campaign_submissions`, `fraud_checks`
- [ ] `0005_ratecards_chat.sql`
  - `rate_cards`, `rate_card_packages`, `conversations`, `messages`
  - `offers`, dengan `deadline timestamptz`
  - FK `conversations.offer_id` ↔ `offers` dibuat `DEFERRABLE INITIALLY DEFERRED`
- [ ] `0006_orders.sql`: `orders`, `deliverables`, `revisions`, `ratecard_deliverable_validations`
- [ ] `0007_finance.sql`: `wallets`, `payments`, `transactions`, `escrows`, `withdrawals`

### Konvensi skema
- Row PK: `id text primary key default gen_random_uuid()::text`. Saat migrasi, ID Appwrite lama dipertahankan.
- Kolom yang merujuk user bertipe `uuid` dengan FK ke `public.users(id)`.
- Uang bertipe `bigint not null default 0 check (… >= 0)`.
- Enum ditulis sebagai `text` + `CHECK (col in (...))`. Daftar nilainya diambil dari kode, termasuk string yang di Appwrite tidak pernah divalidasi.
- `created_at` / `updated_at` bertipe `timestamptz`, ditambah trigger `set_updated_at()`.
- Semua unique index lama dipertahankan:
  - `users.email`
  - `orders.offer_id`
  - `escrows.order_id`
  - `payments.gateway_reference`
  - `payments.order_payment_key` (partial, not null)
  - `campaign_submissions.claim_id`
  - `ratecard_deliverable_validations.deliverable_id`
  - `conversations(umkm_id, creator_id)`
- `transactions.reference_id` polimorfik, jadi tanpa FK. Tambahkan unique `(reference_type, reference_id, type)` untuk idempotensi.
- `alter table … enable row level security` di semua tabel. Policy-nya dibuat di Fase 3.

### Tipe & export
- [ ] `supabase gen types typescript --local > src/types/supabase.ts`, lalu tambah script `npm run db:types`.
- [ ] `scripts/migration/export-appwrite.ts`: memakai `node-appwrite` + API key, export semua tabel ke `JSONL` dengan paginasi cursor. Dipakai untuk seed staging dan nanti di Fase 9.

## Verifikasi
- `supabase db reset` lokal berjalan bersih.
- Tipe ter-generate dan `npm run typecheck` lulus.
- Dump staging Appwrite bisa dimuat tanpa pelanggaran FK, memakai loader sederhana yang nanti dimatangkan di Fase 9.
