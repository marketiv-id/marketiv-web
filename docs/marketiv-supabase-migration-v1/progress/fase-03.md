# Fase 03 — RLS, helper otorisasi, storage, realtime

- Tanggal: 2026-11-08
- PR: (diisi setelah PR dibuat)
- Status: selesai. Migration 0010–0013 lulus lokal (pgTAP 100/100, advisor lokal bersih) dan sudah diterapkan ke Supabase staging. Satu WARN advisor staging tersisa dan bukan dari skema: `auth_leaked_password_protection` (setelan Auth, lihat Isu terbuka).

## Status task

### Helper SQL (`0010_auth_helpers.sql`)
- [x] `private.current_user_row()`: `stable`, `security definer`, baris `users` milik `auth.uid()`
- [x] `private.is_admin()`: `app_metadata.role = 'admin'` **dan** `users.role = 'admin'` **dan** `users.status = 'active'`. Tidak membaca `user_metadata` / prefs
- [x] `private.is_conversation_participant(conv_id text)`
- [x] `private.is_order_party(order_id text)`

### Policy SELECT (`0011_rls_select.sql`)
- [x] Tidak ada policy INSERT, UPDATE, atau DELETE untuk `anon`/`authenticated` di tabel mana pun (celah #1 dan #2 tertutup)
- [x] Revoke `insert, update, delete, truncate, references, trigger` dari `anon, authenticated` di schema `public` + default privileges untuk tabel baru

### Storage (`0012_storage.sql`)
- [x] 8 bucket, ID sama dengan `user_files.bucket_id`, limit/MIME dari `appwrite.config.json` + `BUCKET_RULES` (dengan deviasi 50 MB, lihat bawah)
- [x] Format path `{user_id}/{file_id}.{ext}` (policy menolak subfolder)
- [x] Policy `storage.objects`: INSERT/SELECT/DELETE bucket publik hanya di folder `auth.uid()`; bucket privat tanpa policy client

### Realtime (`0013_realtime.sql`)
- [x] `alter publication supabase_realtime add table public.messages, public.notifications;`

### Test (`supabase/tests/rls.test.sql`, pgTAP, 71 assertion)
- [x] User A tidak bisa SELECT `wallets` / `messages` / `orders` milik user B
- [x] User A tidak bisa UPDATE `users.role` dan tidak bisa INSERT `campaigns`
- [x] Anon hanya melihat profil, rate card published, dan campaign non-draft
- [x] Upload ke `avatars/{uid_lain}/x.png` ditolak

## File dibuat / diubah
- `supabase/migrations/0010_auth_helpers.sql` — schema `private` + 4 helper `security definer`, `stable`, `search_path = ''`, grant eksplisit.
- `supabase/migrations/0011_rls_select.sql` — 32 policy SELECT (26 permissive, 6 restrictive deny untuk tabel server-only), revoke hak tulis, revoke SELECT anon di tabel yang butuh login, default privileges.
- `supabase/migrations/0012_storage.sql` — 8 bucket + 3 policy `storage.objects`.
- `supabase/migrations/0013_realtime.sql` — publikasi `messages`, `notifications`.
- `supabase/tests/rls.test.sql` — pgTAP baru (struktur, anon, user A/B/C, admin sah/palsu/suspended, storage, realtime).
- `supabase/tests/0001_schema_foundation.test.sql` — assertion "belum ada policy" (Fase 2) diganti "tidak ada policy tulis".
- `src/lib/appwrite/storage.ts` — `BUCKET_RULES.campaignAssets.maxBytes` 100 MB → 50 MB (dokumen fase: "BUCKET_RULES di UI ikut disesuaikan"). Komentar di `src/lib/validations/common.ts` ikut.
- `docs/marketiv-supabase-migration-v1/03-rls-storage.md` — checkbox + catatan schema `private`.

## Matriks akses final per tabel

Keterangan: **R** = boleh SELECT lewat RLS; **—** = tidak ada akses (tanpa hak tabel atau tanpa policy). Kolom "admin" = `private.is_admin()`. Tidak ada role client yang punya INSERT/UPDATE/DELETE/TRUNCATE di tabel mana pun; semua tulis lewat service role (route handler).

| Tabel | anon | authenticated | admin | Policy | Index yang dipakai |
|---|---|---|---|---|---|
| `umkm_profiles` | R semua | R semua | R | `umkm_profiles_select_public` | — |
| `creator_profiles` | R semua | R semua | R | `creator_profiles_select_public` | — |
| `creator_social_accounts` | R semua | R semua | R | `creator_social_accounts_select_public` | — |
| `creator_portfolios` | R semua | R semua | R | `creator_portfolios_select_public` | — |
| `rate_cards` | R `published` | R `published` + milik sendiri | R semua | `rate_cards_select_published_or_owner` | `rate_cards_status_idx`, `rate_cards_creator_id_idx` |
| `rate_card_packages` | R jika rate card induk terlihat | sama | R semua | `rate_card_packages_select_via_rate_card` | `rate_card_packages_rate_card_id_idx` |
| `campaigns` | R `status <> 'draft'` | R non-draft + milik sendiri (`umkm_id`) | R semua | `campaigns_select_published_or_owner` | `campaigns_status_idx`, `campaigns_umkm_id_idx` |
| `campaign_briefs` | R jika campaign terlihat | sama | R semua | `campaign_briefs_select_via_campaign` | unique `campaign_id` |
| `campaign_assets` | R jika campaign terlihat | sama | R semua | `campaign_assets_select_via_campaign` | `campaign_assets_campaign_id_idx` |
| `users` | — | R baris sendiri (`id`) | R semua | `users_select_own` | PK |
| `wallets` | — | R milik sendiri | R semua | `wallets_select_own` | unique `user_id` |
| `transactions` | — | R milik sendiri | R semua | `transactions_select_own` | `transactions_user_id_created_at_idx` |
| `payments` | — | R milik sendiri | R semua | `payments_select_own` | `payments_user_id_idx` |
| `withdrawals` | — | R milik sendiri | R semua | `withdrawals_select_own` | `withdrawals_user_id_idx` |
| `notifications` | — | R milik sendiri | R semua | `notifications_select_own` | `notifications_user_id_created_at_idx` |
| `user_files` | — | R milik sendiri | R semua | `user_files_select_own` | `user_files_user_id_status_idx` |
| `user_storage_usage` | — | R milik sendiri | R semua | `user_storage_usage_select_own` | unique `user_id` |
| `appeals` | — | R milik sendiri | R semua | `appeals_select_own` | `appeals_user_id_status_idx` |
| `campaign_claims` | — | R kreator pengklaim + UMKM pemilik campaign | R semua | `campaign_claims_select_creator_or_campaign_owner` | `campaign_claims_creator_id_idx`, `campaign_claims_campaign_id_idx`, `campaigns_umkm_id_idx` |
| `campaign_submissions` | — | R kreator + UMKM pemilik campaign | R semua | `campaign_submissions_select_creator_or_campaign_owner` | `campaign_submissions_creator_id_idx`, `campaign_submissions_campaign_id_idx` |
| `conversations` | — | R UMKM / kreator peserta | R semua | `conversations_select_participant` | unique `(umkm_id, creator_id)`, `conversations_creator_id_idx` |
| `messages` | — | R peserta percakapan (`is_conversation_participant`) | R semua | `messages_select_participant` | `messages_conversation_id_created_at_idx` |
| `offers` | — | R UMKM / kreator | R semua | `offers_select_party` | `offers_umkm_id_idx`, `offers_creator_id_idx` |
| `orders` | — | R UMKM / kreator | R semua | `orders_select_party` | `orders_umkm_id_idx`, `orders_creator_id_idx` |
| `deliverables` | — | R pihak order (`is_order_party`) | R semua | `deliverables_select_order_party` | `deliverables_order_id_idx` |
| `revisions` | — | R pihak order (`is_order_party`) | R semua | `revisions_select_order_party` | `revisions_order_id_idx` |
| `escrows` | — | — | — | `escrows_deny_client` (restrictive `false`) | — |
| `fraud_checks` | — | — | — | `fraud_checks_deny_client` | — |
| `ratecard_deliverable_validations` | — | — | — | `ratecard_deliverable_validations_deny_client` | — |
| `ai_requests` | — | — | — | `ai_requests_deny_client` | — |
| `otp_rate_limits` | — | — | — | `otp_rate_limits_deny_client` | — |
| `legacy_user_map` | — | — | — | `legacy_user_map_deny_client` | — |

Hak tabel (lapisan kedua):
- `anon`: SELECT hanya di 9 tabel publik (profil ×4, rate card ×2, campaign ×3). 17 tabel login-only dan 6 tabel server-only di-revoke.
- `authenticated`: SELECT di 26 tabel; tabel server-only di-revoke total.
- Default privileges `postgres` di `public`: tabel baru tanpa INSERT/UPDATE/DELETE/TRUNCATE untuk `anon`/`authenticated`; **fungsi baru tanpa EXECUTE untuk `public`/`anon`/`authenticated`**.

### Storage

| Bucket | Publik | Limit (byte) | MIME | Client (authenticated) |
|---|---|---|---|---|
| `avatars` | ya | 5.000.000 | jpeg, png, webp | INSERT/SELECT/DELETE di `{uid}/…` |
| `creator-banners` | ya | 5.000.000 | jpeg, png, webp | sama |
| `logos` | ya | 5.000.000 | jpeg, png, webp, svg+xml | sama |
| `portfolios` | ya | 50.000.000 | jpeg, png, webp, pdf, mp4 | sama |
| `campaign-assets` | ya | 50.000.000 (dulu 100 MB) | semua | sama |
| `deliverables` | tidak | 50.000.000 (dulu 500 MB) | semua | tidak ada (signed URL dari route) |
| `fraud-evidence` | tidak | 5.000.000 | jpeg, png, pdf | tidak ada |
| `user-files` | tidak | 20.971.520 (20 MiB) | jpeg, png, webp, gif, svg+xml, pdf, doc(x), xls(x), ppt(x), mp4, quicktime, x-msvideo | tidak ada |

## Keputusan & deviasi dari rencana
- **Helper di schema `private`, bukan `public`.** Dokumen fase menulis `public.*`. Fungsi `SECURITY DEFINER` di `public` otomatis menjadi endpoint RPC Data API untuk anon/authenticated (advisor `anon/authenticated_security_definer_function_executable`, rekomendasi resmi Supabase). `private` tidak diekspos (`[api].schemas` = public, graphql_public), tapi anon/authenticated tetap diberi USAGE + EXECUTE karena policy dievaluasi dengan hak role pemanggil. Terverifikasi: `POST /rest/v1/rpc/is_admin` → 404.
- **`is_admin()` memakai AND dari tiga syarat**: `auth.users.raw_app_meta_data->>'role' = 'admin'`, `public.users.role = 'admin'`, `public.users.status = 'active'`. Prompt Fase 3 menyebut hanya `users.role` + `status`; log Fase 0 & 2 (lebih baru) memutuskan admin hanya dari `app_metadata.role` dan `users.role` "bukan sumber otorisasi". Menggabungkan keduanya dengan AND tidak pernah lebih longgar dari salah satunya. `app_metadata` dibaca dari tabel `auth.users` (bukan `auth.jwt()`), jadi pencabutan admin berlaku seketika tanpa menunggu refresh token. **Dampak Fase 4/9:** akun admin wajib punya `app_metadata.role = 'admin'` **dan** `users.role = 'admin'`.
- **Akses admin baca semua** (opsional di dokumen) diaktifkan untuk 26 tabel non-server-only, digabung ke policy yang sama lewat `or (select private.is_admin())` (satu policy permissive per tabel → tidak ada advisor `multiple_permissive_policies`). Tabel server-only tetap tertutup bagi admin; baca lewat route.
- **Tabel server-only diberi policy RESTRICTIVE `using (false)`**, bukan "tanpa policy". Efek sama (tolak), tetapi niatnya eksplisit dan advisor `rls_enabled_no_policy` hilang. Ditambah `revoke all` dari anon/authenticated.
- **`rate_card_packages` mengikuti visibilitas rate card induk** (dokumen hanya menulis "publik"). Tanpa ini, paket rate card draft bocor ke anon.
- **Revoke SELECT dari `anon`** di 17 tabel login-only (di luar dokumen, lapisan ketiga) dan **default privileges fungsi** (fungsi baru di `public` tidak otomatis bisa dipanggil anon/authenticated). Fase 7/8: RPC uang otomatis hanya untuk `service_role`; bila suatu RPC memang harus dipanggil browser, `grant execute` eksplisit.
- **Policy SELECT storage di bucket publik** (dokumen hanya INSERT + DELETE): Storage API butuh SELECT untuk `remove()`. Dibatasi folder sendiri; isi bucket publik toh terbaca lewat URL publik. **Tidak ada policy UPDATE** → upsert/menimpa file dari browser ditolak; ganti file = upload file baru.
- **Batas 50 MB** untuk `campaign-assets` (100 → 50 MB) dan `deliverables` (500 → 50 MB), keputusan pemilik di Fase 0 (plan Free). Byte desimal, sama dengan `BUCKET_RULES`. `BUCKET_RULES.campaignAssets` di app ikut 50 MB.
- **MIME diterjemahkan dari ekstensi Appwrite.** `avi` → `video/x-msvideo`; `mov` → `video/quicktime`. `logos` & `user-files` tetap menerima `image/svg+xml` sesuai config lama (lihat Isu terbuka).
- **Realtime di file terpisah `0013_realtime.sql`** (dokumen tidak memberi nama file).
- **Migration di staging** diterapkan lewat MCP `apply_migration`, lalu versi di `supabase_migrations.schema_migrations` diubah ke `0010`…`0013` (pola sama dengan Fase 2).
- **Prompt meminta persetujuan rencana sebelum ubah kode.** Pemilik memberi instruksi "kerjakan fase 3 ini sampai tuntas", jadi rencana langsung dieksekusi; semua keputusan di atas dicatat di sini untuk review PR.

## Hasil verifikasi
| Perintah / skenario | Hasil |
|---|---|
| `supabase db reset` (lokal, CLI 3.0.0, Postgres 17) | lulus, 11 migration bersih |
| `supabase test db` | lulus: 2 file, 100 test (29 Fase 2 + 71 Fase 3) |
| `supabase db advisors --type all` (lokal) | tidak ada temuan |
| Advisor staging — security | 1 WARN `auth_leaked_password_protection` (setelan Auth, bukan skema). Tidak ada temuan RLS/fungsi/storage. Sebelumnya: 32 INFO `rls_enabled_no_policy` → hilang |
| Advisor staging — performance | hanya INFO `unused_index` (DB baru); tidak ada `auth_rls_initplan` / `multiple_permissive_policies` |
| Staging: cek SQL pasca-migration | 32 policy public (0 tulis), 3 policy storage, 8 bucket sesuai, realtime = messages,notifications, 0 tabel bisa ditulis anon/authenticated |
| `npm run db:types` | tidak ada perubahan tipe (`private` tidak di-generate) |
| E2E REST lokal: user A `PATCH users.role` | 403 `42501 permission denied` (celah #1) |
| E2E REST lokal: user A `POST campaigns` status active | 403 `42501` (celah #2) |
| E2E REST lokal: anon `GET users` | 401 `42501` |
| E2E REST lokal: `rpc/is_admin` | 404 (tidak terekspos) |
| E2E Storage lokal: upload `avatars/{uid}/f1.png` | 200; baca URL publik 200; hapus sendiri 200 |
| E2E Storage lokal: upload `avatars/{uid_lain}/f1.png` | 403 RLS |
| E2E Storage lokal: PDF ke `avatars` | 415 `invalid_mime_type` |
| E2E Storage lokal: upload langsung ke `deliverables` | 403 RLS |
| E2E Storage lokal: signed upload URL (service role) → `deliverables`, lalu signed download URL | 200 / 200 |
| `npm run typecheck` (root, setelah `npx next typegen`) | lulus |
| `npm run lint` (root) | **gagal**: 4 error, 48 warning — sama persis dengan Fase 0/2, di file yang tidak disentuh (`FloatingDemoBar.tsx`, `create-campaign.autodraft.ts`, `BriefGuidelineStep.tsx`, `BudgetQuotaStep.tsx`). `eslint` pada 2 file yang diubah: bersih |
| `npm test -- --run` (root) | lulus: 81 file, 448 test |
| `npm run typecheck` (admin) | lulus |
| `npm run lint` (admin) | 0 error, 6 warning (sama dengan sebelumnya) |
| `npm test -- --run` (admin) | lulus: 8 file, 77 test |

## Env / secret baru (nama saja)
- Tidak ada.

## Isu terbuka
- **Advisor `auth_leaked_password_protection` (WARN) di staging.** Setelan Auth (cek HaveIBeenPwned), bukan skema. Menurut dokumentasi Supabase fitur ini hanya tersedia di plan Pro ke atas, jadi kemungkinan tidak bisa diaktifkan di plan Free. Usulan: pemilik cek Dashboard → Authentication → Providers/Email (Password security). Bila tidak tersedia, terima sebagai risiko yang diketahui dan perketat aturan panjang/karakter password di Fase 4.
- **SVG di bucket publik `logos`** (ikut config lama). SVG bisa membawa script; disajikan dari domain Storage (beda origin dengan app), jadi dampaknya terbatas, tetapi lebih aman ditolak. Usulan: putuskan di Fase 6 (hapus `image/svg+xml` dari `logos` bila tidak ada logo SVG di produksi).
- **Supabase staging masih berisi fixture sintetis Fase 2** (tidak berubah di fase ini).

## Isu untuk fase lain
- **Fase 4:** akun admin wajib `app_metadata.role = 'admin'` **dan** `public.users.role = 'admin'` **dan** `status = 'active'` supaya `private.is_admin()` true. `requireActiveRole()` di route sebaiknya memakai logika yang sama (atau memanggil helper lewat service role dengan query SQL setara). Helper ada di schema `private`, tidak bisa dipanggil lewat `supabase.rpc()`.
- **Fase 5:** browser hanya bisa SELECT sesuai matriks di atas. Pola baca lama yang dicek (`creator-appwrite.service.ts`: klaim/submisi difilter `creatorId` sendiri) cocok. `campaign_claims`/`campaign_submissions` dulu `read("any")` di Appwrite; sekarang hanya kreator + UMKM pemilik campaign. Bila ada tampilan publik yang butuh daftar klaim/submisi orang lain (mis. leaderboard), lewat route. Tabel `users` hanya baris sendiri: nama/avatar pihak lain diambil dari `umkm_profiles`/`creator_profiles`.
- **Fase 6:** upload bucket publik dari browser hanya ke `{auth.uid}/{file_id}.{ext}` (tepat satu folder); tanpa upsert. Bucket privat (`deliverables`, `fraud-evidence`, `user-files`) hanya via `createSignedUploadUrl` / `createSignedUrl` dari route. Realtime: subscribe `postgres_changes` pada `messages` (filter `conversation_id=eq.…`) dan `notifications` (filter `user_id=eq.…`); RLS sudah membatasi baris yang dikirim.
- **Fase 7/8:** default privileges mencabut EXECUTE fungsi baru di `public` dari `public`/`anon`/`authenticated`. RPC uang otomatis hanya bisa dipanggil `service_role`. Tetap tambahkan `security definer` + `set search_path = ''` dan cek advisor.
- **Fase 9:** tidak ada perubahan pada loader; loader memakai service role (melewati RLS).

## Catatan serah-terima untuk fase berikutnya
- Stack lokal di sesi cloud: `dockerd` lalu `npx supabase@3.0.0 start -x studio,edge-runtime,imgproxy,logflare,vector,supavisor,mailpit,postgres-meta` (image `studio`/`edge-runtime` dari ghcr sering 403 lewat proxy; tidak dibutuhkan untuk test).
- `supabase test db` sekarang menjalankan 2 file: `0001_schema_foundation.test.sql` dan `rls.test.sql`. Pola simulasi sesi di `rls.test.sql` (`set local role` + `request.jwt.claims`) bisa dipakai ulang untuk test RPC Fase 7/8.
- Supabase staging (`zwrzwkesaetzbnajjxqc`): migration `0001`…`0007`, `0010`…`0013`.
- Tabel baru di migration berikutnya: aktifkan RLS, buat policy SELECT bila perlu dibaca browser, dan ingat anon/authenticated sudah tidak otomatis punya hak tulis. Bila tabel butuh dibaca anon, `grant select` tetap otomatis (default Supabase), hanya tulis yang dicabut.
