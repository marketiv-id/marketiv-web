# Fase 3 — RLS, helper otorisasi, storage, realtime

**Bobot:** M

## Tujuan
- Browser hanya bisa **membaca** data yang memang haknya.
- Semua tulis wajib lewat route, memakai service role.
- Bucket storage dan publikasi realtime siap dipakai.

## Task

### Helper SQL (`0010_auth_helpers.sql`)
- [ ] `public.current_user_row()`: `stable`, `security definer`. Mengembalikan baris `users` milik `auth.uid()`.
- [ ] `public.is_admin()`: `users.role = 'admin'` dan `status = 'active'`. **Tidak** membaca `user_metadata` / prefs.
- [ ] `public.is_conversation_participant(conv_id text)`
- [ ] `public.is_order_party(order_id text)`

### Policy SELECT (`0011_rls_select.sql`)

| Akses | Tabel |
|---|---|
| Publik (anon + authenticated) | `umkm_profiles`, `creator_profiles`, `creator_social_accounts`, `creator_portfolios`, `rate_cards` (status `published`, atau pemilik), `rate_card_packages` |
| Publik setelah publish | `campaigns` (`status <> 'draft'`, atau `umkm_id = auth.uid()`), `campaign_briefs` / `campaign_assets` (ikut status campaign-nya) |
| Pemilik | `users`, `wallets`, `transactions`, `payments`, `withdrawals`, `notifications`, `user_files`, `user_storage_usage`, `appeals` |
| Kreator + UMKM campaign | `campaign_claims`, `campaign_submissions` |
| Dua pihak | `conversations`, `messages`, `offers`, `orders`, `deliverables`, `revisions` |
| Admin | `is_admin()` membaca semua tabel. Opsional, karena antrean admin lewat route |
| Server-only (tanpa policy) | `escrows`, `fraud_checks`, `ratecard_deliverable_validations`, `ai_requests`, `otp_rate_limits`, `legacy_user_map` |

- [ ] **Tidak ada** policy INSERT, UPDATE, atau DELETE untuk `authenticated`/`anon` di tabel mana pun.
  - Ini menutup celah #1: user tidak bisa mengubah `role` sendiri.
  - Ini juga menutup celah #2: campaign aktif tidak bisa dibuat dari browser.
- [ ] Revoke `insert, update, delete` dari `anon, authenticated` di schema `public` sebagai lapisan kedua.

### Storage (`0012_storage.sql`)
- [ ] Buat 8 bucket dengan `file_size_limit` dan `allowed_mime_types` yang sama dengan `BUCKET_RULES` di `src/lib/appwrite/storage.ts`.
  - **Publik:** `avatars`, `creator-banners`, `logos` (5 MB), `portfolios` (50 MB), `campaign-assets` (100 MB)
  - **Privat:** `deliverables` (500 MB), `fraud-evidence` (5 MB), `user-files` (20 MiB)
- [ ] Format path: `{user_id}/{file_id}.{ext}`
- [ ] Policy `storage.objects`:
  - INSERT dan DELETE bucket publik hanya bila `(storage.foldername(name))[1] = auth.uid()::text`
  - Bucket privat tanpa policy client, akses hanya lewat signed URL dari route

### Realtime
- [ ] `alter publication supabase_realtime add table public.messages, public.notifications;`

### Test (`supabase/tests/rls.test.sql`, pgTAP)
- [ ] User A tidak bisa SELECT `wallets` / `messages` / `orders` milik user B
- [ ] User A tidak bisa UPDATE `users.role` dan tidak bisa INSERT `campaigns`
- [ ] Anon hanya melihat profil, rate card published, dan campaign non-draft
- [ ] Upload ke `avatars/{uid_lain}/x.png` ditolak

## Verifikasi
- `supabase test db` lulus.
- `get_advisors` (security) tanpa temuan.
