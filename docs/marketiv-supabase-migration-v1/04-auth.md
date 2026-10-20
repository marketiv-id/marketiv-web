# Fase 4 — Auth & guard

**Bobot:** M

## Tujuan

Semua alur auth (user dan admin) jalan di Supabase Auth.

Mulai fase ini:
- Sesi disimpan di cookie.
- Ada guard di sisi server.

## Pemetaan API

| Appwrite (sekarang) | Supabase |
|---|---|
| `account.create` + `updatePrefs({role})` + function `create-user-profile` | `POST /api/auth/register` → `auth.signUp` (role di-whitelist `umkm`/`creator`) → RPC `provision_user(uid, role, …)`: membuat `users`, profil, `wallets`, `user_storage_usage` dalam satu transaksi |
| event `users.*.create` (`create-user-profile`, `create-user-wallet`) | diganti RPC `provision_user` (dipanggil eksplisit, idempoten) |
| `createEmailPasswordSession` | `signInWithPassword` |
| `createEmailToken` / `createSession({userId, secret})` | `signInWithOtp({email})` / `verifyOtp({email, token, type:'email'})` |
| `request-password-otp` / `reset-password-with-otp` | `POST /api/auth/password-otp` (rate limit `otp_rate_limits`) dan `POST /api/auth/password-reset` → `auth.admin.updateUserById` + `auth.admin.signOut(uid)` |
| `account.updateRecovery` (link lama) | `resetPasswordForEmail` + halaman update password |
| event `user-email-verified` | baca `email_confirmed_at` saat `getSession`, lalu sinkronkan ke `users` |
| `createOAuth2Session` (Google) | `signInWithOAuth({provider:'google', redirectTo:'/auth/callback?role=&next='})`, route `src/app/(auth)/auth/callback/route.ts` → `exchangeCodeForSession` |
| `account.createJWT` (chatbot) | tidak perlu; `/api/chat` membaca sesi dari cookie |
| `account.deleteSession('current')` | `signOut()` |

## Task
- [ ] Port `src/services/auth/auth.service.ts` dan `session.service.ts`. **Bentuk return tetap sama**, sehingga form dan `AuthProvider` tidak berubah.
- [ ] `src/server/auth/require-user.ts`: port `00_BACKEND/functions/_shared/require-active-role.js`, mengembalikan `{ user, userRow }` atau melempar 401/403.
- [ ] `src/proxy.ts` (Next 16):
  - Refresh sesi lewat `@supabase/ssr`.
  - Redirect `/dashboard/*` dan `/onboarding` ke `/login?next=` bila tidak ada sesi.
- [ ] `RoleGuard` tetap dipakai untuk UX (role salah, suspended, profil belum lengkap).
- [ ] Ganti `src/services/chatbot/chatbot-auth.ts` agar memakai `createServerClient` dari cookie. Hapus `createJWT` di `ChatbotPanel.tsx`.
- [ ] `oauth-callback.service.ts` (logika keputusan) dipakai ulang. Ganti `setOAuthAccountPrefs` dengan `POST /api/auth/provision`.
- [ ] Admin app:
  - Port `admin/src/lib/admin/auth.ts`.
  - Admin **hanya** dikenali dari `users.role = 'admin'`. Fallback label dan `prefs.role` dihapus.
  - Tambah `admin/src/proxy.ts`.
- [ ] Template email Bahasa Indonesia di Supabase Auth: Confirm signup, Magic Link/OTP, Reset Password, Change Email.
- [ ] Atur Site URL dan Redirect URLs (staging, prod, preview `*.vercel.app`).

## Verifikasi
- Port test di `src/services/auth/__tests__/*` dan `admin/src/lib/admin/auth.test.ts`.
- QA manual di staging:
  - Register UMKM
  - Register kreator
  - Login
  - Verifikasi OTP
  - Lupa password
  - Login Google (bila flag aktif)
  - Akun suspended ditolak
  - Admin login
  - Non-admin ditolak di admin app
