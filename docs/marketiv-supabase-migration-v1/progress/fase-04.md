# Fase 04 — Auth & guard

- Tanggal: 2026-11-08
- PR: (diisi setelah PR dibuat)
- Status: sebagian.
  - Semua kode selesai dan terverifikasi end-to-end di Supabase **lokal**: browser Chromium + Mailpit, 30/30 skenario QA lulus.
  - Migration `0014` sudah diterapkan ke Supabase staging.
  - **QA manual di preview staging belum bisa dilakukan.** Langkahnya diblokir aksi dashboard pemilik: SMTP, URL Configuration, template email, setelan Auth, dan secret Netlify. Daftarnya ada di bagian "Aksi pemilik".

## Status task
- [x] Port `auth.service.ts` dan `session.service.ts`. Bentuk return tetap sama: form, `AuthProvider`, dan `RoleGuard` tidak berubah logikanya.
- [x] `src/server/auth/require-user.ts` (port `require-active-role.js`): `requireUser()` dan `requireAuthUser()` → `{ user, userRow }` atau `HttpError` 401/403/404.
- [x] `src/proxy.ts` (Next 16): refresh sesi `@supabase/ssr`, `/dashboard/*` dan `/onboarding` → `/login?next=` bila tanpa sesi.
- [x] `RoleGuard` tetap untuk UX (role salah, suspended, profil belum lengkap).
- [x] Chatbot: `chatbot-auth.ts` membaca sesi dari cookie (`createServerClient`); `createJWT` dihapus dari `ChatbotPanel.tsx`.
- [x] `oauth-callback.service.ts` dipakai ulang; `setOAuthAccountPrefs` diganti `POST /api/auth/provision`.
- [x] Admin app:
  - `admin/src/lib/admin/auth.ts` di-port.
  - Admin = `users.role = 'admin'` **dan** `app_metadata.role = 'admin'`, status `active`. Fallback label dan `prefs.role` dihapus.
  - `admin/src/proxy.ts` ditambahkan.
- [ ] Template email Bahasa Indonesia:
  - [x] Disiapkan sebagai file di repo: `supabase/templates/{confirmation,magic_link,recovery,email_change}.html`, terpasang di `config.toml` lokal.
  - [ ] Dipasang di Dashboard staging (aksi pemilik).
- [ ] Site URL dan Redirect URLs:
  - [x] Lokal (`config.toml`).
  - [ ] Dashboard staging/prod (aksi pemilik).
- [ ] QA manual di preview staging (menunggu aksi pemilik). Padanannya di lokal sudah lulus, lihat Hasil verifikasi.

## File dibuat / diubah

### Database
- `supabase/migrations/0014_auth_provisioning.sql` — dua RPC `SECURITY DEFINER`, hanya bisa dipanggil `service_role`:
  - `provision_user(uid, role, email, phone, display_name, email_verified)`: membuat `users` + profil + `wallets` + `user_storage_usage` dalam satu transaksi. Idempoten, role di-whitelist `umkm`/`creator`, dan role baris lama tidak pernah diubah.
  - `hit_otp_rate_limit(key, email, ip, max, window)`: rate limit atomik (upsert) di `otp_rate_limits`.
- `supabase/tests/auth_provisioning.test.sql` — pgTAP 22 assertion.
- `supabase/tests/rls.test.sql` — assertion "tanpa SECURITY DEFINER di public" diubah menjadi "tidak ada SECURITY DEFINER di public yang bisa dieksekusi anon/authenticated".
- `supabase/config.toml` — setelan Auth lokal:
  - `site_url` dan redirect lokal
  - `minimum_password_length = 8`
  - `otp_expiry = 900`
  - 4 template email
- `supabase/templates/*.html` — template email Bahasa Indonesia. Kode OTP 6 digit memakai `{{ .Token }}`.

### Server (app user)
- `src/server/auth/http-error.ts` — `HttpError`, `errorResponse()` (bentuk `{ error, code }`), `readJsonBody()`.
- `src/server/auth/require-user.ts` — guard semua route berikutnya.
- `src/server/auth/provision.ts` — panggil RPC `provision_user`, whitelist role, nama tampilan dari metadata, verifikasi email otomatis untuk Google.
- `src/server/auth/otp-rate-limit.ts` — IP klien (`x-nf-client-connection-ip` / `x-forwarded-for`), kunci sha256, 3 permintaan per 10 menit.
- `src/server/auth/validate.ts` — validasi body memakai skema Zod yang sama dengan form.
- `src/lib/supabase/stateless.ts` — client anon tanpa cookie/sesi, untuk kirim dan verifikasi OTP di server.
- `src/lib/supabase/proxy.ts` dan `admin/src/lib/supabase/proxy.ts` — `updateSession()` (pola resmi `@supabase/ssr`, `getClaims()`).
- `src/lib/auth/auth-error.ts` — error Supabase Auth → pesan Indonesia + `ServiceErrorCode`.

### Route Handler
| Route | Fungsi | Pengganti |
|---|---|---|
| `POST /api/auth/register` | whitelist role → `signUp` (cookie) → `provision_user` | `account.create` + `updatePrefs` + `create-user-profile` + `create-user-wallet` |
| `POST /api/auth/provision` | provision akun yang login; role dari body/`user_metadata`, whitelist, admin ditolak | `setOAuthAccountPrefs` + `create-user-profile` |
| `POST /api/auth/email-otp` | rate limit → `signInWithOtp` (email dari sesi) | `account.createEmailToken` |
| `POST /api/auth/verify-email` | `verifyOtp(type: 'email')` tanpa cookie → `users.email_verified_at` | `account.createSession` + event `user-email-verified` |
| `POST /api/auth/password-otp` | rate limit `otp_rate_limits` → `resetPasswordForEmail` | Function `request-password-otp` |
| `POST /api/auth/password-reset` | `verifyOtp(type: 'recovery')` → `admin.updateUserById` → `admin.signOut(global)` | Function `reset-password-with-otp` |
| `GET /auth/callback` | `exchangeCodeForSession` (PKCE) → `/auth/complete?role&next` | success URL `createOAuth2Session` |

### Frontend
- `src/services/auth/auth.service.ts`, `session.service.ts` — Supabase. `auth-api.ts` membungkus pemanggilan `/api/auth/*`.
- `src/app/(auth)/auth/callback/page.tsx` → dipindah ke `src/app/(auth)/auth/complete/page.tsx`. `callback` sekarang Route Handler.
- `src/components/features/auth/OAuthCallback.tsx` — `provisionUserProfile(role)`.
- `src/services/chatbot/chatbot-auth.ts`, `src/app/api/chat/route.ts`, `ChatbotPanel.tsx` — sesi dari cookie.
- `src/proxy.ts`, `admin/src/proxy.ts`.
- `admin/src/lib/admin/auth.ts` (+ test), `admin/src/app/login/page.tsx` (teks ditolak).

### Test dan konfigurasi
- `src/services/auth/__tests__/register-umkm.contract.test.ts`, `session-tos.integration.test.ts` — di-port ke Supabase.
- `src/server/auth/__tests__/require-user.test.ts`, `src/app/api/auth/__tests__/role-whitelist.test.ts` — baru.
- `src/services/chatbot/__tests__/chatbot-guardrails.test.ts` — `readBearerToken` diganti `parseChatRole`.
- `vitest.config.mts` — alias `server-only` → `src/test/server-only-stub.ts`, include `src/server/**` dan `src/app/api/**`.
- `netlify.toml`, `admin/netlify.toml` — env publik Supabase staging (URL + publishable key) untuk `deploy-preview` dan `[context.migrasi-supabase.environment]`.
- `src/types/supabase.ts`, `admin/src/types/supabase.ts` — regenerate (2 RPC baru).

## Keputusan & deviasi dari rencana

### Verifikasi email
- **"Confirm email" Supabase dimatikan.** Verifikasi email dikelola aplikasi lewat `users.email_verified_at`.
  - Alasan: alur lama membuat akun langsung login dan punya tombol "Lewati dulu, verifikasi nanti". Kalau "Confirm email" aktif, `signUp` tidak memberi sesi sampai email dikonfirmasi, sehingga bentuk return register dan UX ikut berubah.
  - Dengan "Confirm email" mati, Supabase menandai `email_confirmed_at` otomatis, jadi kolom itu tidak bisa dipakai sebagai bukti verifikasi.
  - OTP dikirim lewat `signInWithOtp` (template Magic Link) dan diverifikasi di server. Server lalu mengisi `users.email_verified_at`.
  - Dokumen fase menulis "baca `email_confirmed_at` saat getSession". Itu diganti `users.email_verified_at`.
  - Dampak Fase 9: isi `email_verified_at` dari `emailVerification` Appwrite.

### Admin
- **Admin = `users.role = 'admin'` AND `app_metadata.role = 'admin'`**, status `active`.
  - Dokumen dan prompt Fase 4 menulis "hanya `users.role`", sedangkan log Fase 0/2/3 memakai `app_metadata`. Keduanya digabung dengan AND supaya sama persis dengan `private.is_admin()` (RLS). Tanpa itu, admin bisa login tetapi RLS tidak memberinya akses baca.
  - Dampak Fase 9: akun allowlist wajib diberi keduanya.

### OAuth dan OTP
- **OAuth Google:** `/auth/callback` sekarang Route Handler (Next tidak mengizinkan `page.tsx` dan `route.ts` di segmen yang sama). Halaman keputusan pindah ke `/auth/complete`. `redirectTo` tetap `AUTH_CONFIG.oauthSuccessPath` (`/auth/callback`).
- **Verifikasi OTP di server memakai client tanpa cookie.** Sesi browser tidak dihapus atau dibuat ulang lagi; dulu Appwrite memaksa itu. Sesi sementara hasil `verifyOtp` langsung dicabut.
- **Reset password mencabut semua sesi** (`admin.signOut(token, 'global')`). Terverifikasi: setelah reset, hanya sesi login baru yang tersisa di `auth.sessions`.
- **Tautan pemulihan lama (`userId` + `secret` Appwrite)** tidak berlaku lagi. `completePasswordRecovery` sekarang mengembalikan pesan "minta kode OTP baru".

### Rate limit dan proxy
- **Rate limit OTP lewat RPC atomik**, bukan get-lalu-update seperti Function lama (ada race). Batas sama: 3 permintaan per 10 menit per email+IP. Berlaku juga untuk OTP verifikasi email.
- **Matcher proxy app user sempit** (`/dashboard/*`, `/onboarding`) supaya hemat eksekusi function di Netlify Free. Halaman publik tidak butuh refresh sesi; browser client me-refresh token sendiri, dan Route Handler me-refresh sesinya sendiri. Proxy admin mencakup semua halaman kecuali `/login` dan aset statis.

### Guard dan sesi
- **`requireUser` membaca baris `users` dengan service role**, setelah identitas diverifikasi `auth.getUser()`, supaya guard tidak bergantung pada policy RLS.
- **Status `terminated` dipetakan ke `suspended` di `SessionUser`.** Tipe UI hanya punya `active`/`suspended`; tanpa pemetaan ini akun `terminated` lolos dari `RoleGuard`.
- **`logout()` memakai `signOut({ scope: 'local' })`**, setara `deleteSession('current')`.
- **Pesan error Supabase Auth dipetakan ke teks Indonesia** di `src/lib/auth/auth-error.ts`. `code` tetap `ServiceErrorCode`.

### Di luar lingkup fase ini
- **T&C (`accept-tos`) dan semua bacaan data masih Appwrite** (Fase 5/6). Di preview `migrasi-supabase`, setelah login dashboard akan menampilkan dialog error T&C atau data kosong. Ini diharapkan sampai Fase 5/6, bukan bug Fase 4.

## Hasil verifikasi
| Perintah / skenario | Hasil |
|---|---|
| `supabase db reset` (lokal) | lulus, 12 migration |
| `supabase test db` | lulus: 3 file, 122 test |
| `supabase db advisors --type all` (lokal) | tidak ada temuan |
| Advisor staging — security (setelah `0014`) | hanya WARN `auth_leaked_password_protection` (setelan Auth, sama dengan Fase 3) |
| `npm run typecheck` (root) | lulus |
| `npm run lint` (root) | **gagal**: 4 error, 48 warning. Sama persis dengan baseline Fase 0–3, di file yang tidak disentuh. `eslint` di semua file yang diubah bersih. |
| `npm test -- --run` (root) | lulus: 83 file, 467 test |
| `npm run typecheck` (admin) | lulus |
| `npm run lint` (admin) | 0 error, 6 warning (sama dengan sebelumnya) |
| `npm test -- --run` (admin) | lulus: 8 file, 76 test (test label/prefs lama dihapus karena fallback-nya dihapus) |
| `next build` root / admin | lulus (keduanya mendeteksi `ƒ Proxy (Middleware)`; 6 route `/api/auth/*` + `/auth/callback` dinamis) |
| **E2E lokal** (Next dev + Supabase lokal + Mailpit, Chromium) | **30/30 PASS** |
| — proxy: `/dashboard/umkm`, `/onboarding` tanpa sesi → `/login?next=` | PASS |
| — register UMKM → OTP email (template Indonesia) → OTP salah 400 → OTP benar → `/onboarding`, `email_verified_at` terisi | PASS |
| — `provision_user`: users (role, phone) + profil + wallet + kuota | PASS |
| — register kreator (display_name) → "Lewati dulu" → `/onboarding` | PASS |
| — register email duplikat → "sudah terdaftar" | PASS |
| — login salah → "tidak cocok"; login benar → cookie `sb-*`, proxy meloloskan | PASS |
| — `/api/chat` membaca sesi dari cookie (tanpa header) | PASS |
| — lupa password → OTP → reset → login password baru; sesi lama dicabut | PASS |
| — rate limit password OTP: permintaan ke-4 → 429 | PASS |
| — akun suspended ditolak saat login, sesi dihapus | PASS |
| — admin: proxy → `/login`; admin sah → `/dashboard`; kreator ditolak (sesi dihapus); `users.role=admin` tanpa `app_metadata` ditolak | PASS |
| QA manual di preview staging | **belum** — menunggu aksi pemilik |

## Env / secret baru (nama saja)
- Tidak ada nama env baru. `SUPABASE_SERVICE_ROLE_KEY` (Fase 2) **sekarang wajib saat runtime** untuk route `/api/auth/*`.
- `NEXT_PUBLIC_SUPABASE_URL` dan `NEXT_PUBLIC_SUPABASE_ANON_KEY` (publishable key staging) sekarang ada di `netlify.toml` / `admin/netlify.toml` untuk konteks non-produksi.

## Aksi pemilik (wajib sebelum QA preview staging)

### A. Supabase staging (`zwrzwkesaetzbnajjxqc`) → Dashboard
1. **Authentication → Sign In / Providers → Email**:
   - **Confirm email: OFF**
   - Secure email change: ON
   - Minimum password length: **8**
   - Email OTP expiration: **900** detik
   - Email OTP length: **6**
2. **Authentication → URL Configuration**:
   - Site URL: `https://migrasi-supabase--marketiv-production.netlify.app`
   - Redirect URLs, tambahkan:
     - `https://migrasi-supabase--marketiv-production.netlify.app/**`
     - `https://deploy-preview-*--marketiv-production.netlify.app/**`
     - `http://localhost:3000/**`
3. **Authentication → Emails → SMTP Settings**: aktifkan custom SMTP (staging: Mailtrap, sesuai rencana Fase 0). SMTP bawaan Supabase hanya mengirim ke anggota tim, 2 email/jam.
4. **Authentication → Emails → Templates**: tempel isi file repo (pilih tampilan HTML/source):

   | Template | Subject | File |
   |---|---|---|
   | Confirm signup | Kode konfirmasi email Marketiv | `supabase/templates/confirmation.html` |
   | Magic Link | Kode verifikasi Marketiv | `supabase/templates/magic_link.html` |
   | Reset Password | Kode reset password Marketiv | `supabase/templates/recovery.html` |
   | Change Email Address | Konfirmasi perubahan email Marketiv | `supabase/templates/email_change.html` |

5. **Authentication → Rate Limits**: naikkan "Sign-ups and sign-ins" dan "Token verifications" (mis. 100 per 5 menit). Register dan verifikasi OTP berjalan dari server Netlify, jadi semua user berbagi IP server di mata Supabase.
6. Opsional, Google OAuth: **Authentication → Providers → Google** (client ID/secret dari Google Cloud; redirect `https://zwrzwkesaetzbnajjxqc.supabase.co/auth/v1/callback`). Lalu set `NEXT_PUBLIC_ENABLE_GOOGLE_OAUTH = "true"` di `netlify.toml` konteks `migrasi-supabase`.

### B. Netlify
1. Situs **marketiv-production**: Site configuration → Environment variables → **Add a variable** `SUPABASE_SERVICE_ROLE_KEY`:
   - Nilai: service role key staging (Supabase → Project Settings → API Keys → `service_role` / secret key).
   - Centang **Contains secret values**.
   - Scope: Functions (runtime).
   - Deploy contexts: **Deploy Previews** dan **Branch deploys** (atau branch `migrasi-supabase`). **JANGAN Production.**
2. Situs **marketiv-admin**: belum butuh secret. Admin hanya memakai URL + publishable key yang sudah ada di `admin/netlify.toml`.
3. Pastikan branch deploy `migrasi-supabase` aktif di kedua situs (Fase 1 runbook), lalu redeploy.

### C. Akun admin staging (untuk QA "admin login")
Di Supabase SQL editor staging, ganti `<email>` dengan email akun Auth yang sudah ada:
```sql
update auth.users set raw_app_meta_data = raw_app_meta_data || '{"role":"admin"}' where email = '<email>';
insert into public.users (id, role, status, email)
select id, 'admin', 'active', email from auth.users where email = '<email>'
on conflict (id) do update set role = 'admin', status = 'active';
```

## Isu terbuka
- **QA preview staging** menunggu aksi A dan B.
- **Rate limit Supabase per IP** untuk sign-up dan verifikasi token. Semua permintaan dari server Netlify (US East) terlihat sebagai satu IP. Mitigasi: naikkan batas (aksi A.5). Bila trafik membesar, pertimbangkan `signUp` dari browser + `POST /api/auth/provision` (role tetap di-whitelist server).
- **Env shell sesi cloud** berisi `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, dan `SUPABASE_ANON_KEY` milik **staging**. `SUPABASE_SERVICE_ROLE_KEY` mengalahkan `.env.local` saat `next dev`/`next build`. Jalankan app lokal dengan `env -u SUPABASE_SERVICE_ROLE_KEY -u SUPABASE_URL -u SUPABASE_ANON_KEY npx next dev`. Tanpa itu, key staging terkirim ke stack lokal (ditolak 401). Kalau URL juga staging, route akan menulis ke staging.
- **`auth_leaked_password_protection`** (WARN staging): tetap dari Fase 3. Fitur plan Pro.

## Isu untuk fase lain
- **Fase 5:**
  - Semua bacaan masih Appwrite, dan Appwrite SDK sekarang tanpa sesi. Halaman dashboard di preview akan kosong/error sampai di-port.
  - `getSession()` sudah Supabase; `requireUserId()` di `service-result.ts` sekarang mengembalikan UUID Supabase.
- **Fase 6:**
  - `tos.service.ts` masih memanggil Function `accept-tos`. Port ke `POST /api/tos` (dokumen 06), kalau tidak `TosConsentGate` selalu error di preview.
  - Route baru pakai `requireUser({ role })` + `errorResponse()` dari `src/server/auth/*`.
- **Fase 9:**
  - Isi `users.email_verified_at` dari `emailVerification` Appwrite.
  - Akun allowlist admin: `app_metadata.role = 'admin'` + `users.role = 'admin'`.
  - User migrasi login dengan password lama (Spike 1). `provision_user` tidak dipakai loader.
- **Fase 10:**
  - Ulangi aksi A di Supabase prod (Site URL produksi, redirect `https://marketiv.id/**`, SMTP produksi, template, rate limit).
  - Set `SUPABASE_SERVICE_ROLE_KEY` prod di konteks Production Netlify.

## Catatan serah-terima untuk fase berikutnya
- Pola route:
  ```ts
  try {
    const { user, userRow } = await requireUser({ role: "creator" });
    /* ... service role / rpc ... */
  } catch (e) {
    return errorResponse(e, "scope");
  }
  ```
  - Body: `readJsonBody()` + `parseBody(schema, body, fallback)`.
  - Browser: `postAuthApi()` di `src/services/auth/auth-api.ts` (bisa dipakai ulang atau dicontoh untuk service lain).
- Test route: lihat `src/app/api/auth/__tests__/role-whitelist.test.ts` (mock `@/lib/supabase/*`). Alias `server-only` sudah ada di Vitest root.
- E2E lokal:
  - `supabase start -x studio,edge-runtime,imgproxy,logflare,vector,supavisor,postgres-meta` (Mailpit tetap hidup, port 54324).
  - `.env.local` berisi key lokal dari `supabase status -o env` (gitignored).
  - `next dev` dengan `env -u` di atas.
- Supabase staging: migration `0001`…`0007`, `0010`…`0014`.
