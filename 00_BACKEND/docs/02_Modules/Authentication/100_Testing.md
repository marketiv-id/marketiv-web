# Authentication — Testing

Lokasi test: `00_BACKEND/tests/` (Vitest + Playwright). Test komponen frontend ada di `src/**/__tests__/`.

## Service Referensi Lama (`00_BACKEND/src/services/auth.service.ts`) — `tests/unit/auth.service.test.ts`

Service ini tidak dipakai frontend, tetapi masih diuji:

- `registerUMKM` menerima data akun tanpa field profil bisnis (email, phone, password).
- `registerUMKM` tanpa `phone` → `AuthServiceError('validation', 'Nomor HP wajib diisi.')`.
- `registerUMKM` tanpa email → `'Email wajib diisi.'`; tanpa password → `'Password wajib diisi.'`.
- `registerCreator` tanpa `name` → `'Nama creator wajib diisi.'`.
- `loginUser` tanpa email / password → validation.
- `forgotPassword` (legacy `account.createRecovery`) tanpa email → `'Email wajib diisi.'`.
- `resetPassword` tanpa `userId` → `'User ID wajib diisi.'`; tanpa `secret` → `'Secret reset password wajib diisi.'`; tanpa password → `'Password baru wajib diisi.'`.
- `mapError`: 409 → `conflict` ("Email sudah terdaftar."), 401 → `auth`.
- `registerUser` dengan role tidak valid → throw `AuthServiceError`.
- `tests/integration/services.test.ts`: `registerUMKM` membuat akun + sesi + profil; `loginUser` mengembalikan `{ profile, wallet }`; `getCurrentUser` → `null` saat 401.

## OAuth Callback (`resolveOAuthCallbackDecision`) — `tests/unit/oauth-callback.service.test.ts`

- User dengan mirror & role cocok → `redirect` ke `next` yang aman.
- UMKM `not_found` → `provision`; setelah provisioning sukses → `redirect /onboarding`.
- Creator `not_found` → `provision`; provisioning gagal → `show_recovery`.
- Error selain `not_found` → `redirect /login?error=oauth`.
- Skenario tambahan (belum ada test): user dengan role berbeda → `role_mismatch`; `not_found` tanpa role → `/register?error=profile_missing`.

## Functions — `tests/integration/functions.test.ts`

### `user-email-verified`

- Payload Auth `emailVerification: true` → `users.email_verified_at` terisi, body `success: true`.
- Payload tanpa verifikasi → `res.empty()`, kolom tetap `null`.
- (Kode) baris sudah punya `email_verified_at` → no-op idempoten.

### `request-password-otp`

- Email terdaftar → `account.createEmailToken(userId, email)` dipanggil dan state `otp_rate_limits` tercatat.
- Permintaan ke-4 per email+IP dalam 10 menit → 429, OTP tidak dikirim.
- ⚠️ Test saat ini mengharapkan body `{ success: true, userId: 'auth-1' }`, sedangkan kode mengembalikan `{ success: true }` saja (tanpa `userId`). Kode adalah acuan; test perlu disesuaikan.
- Email tidak terdaftar → `{ success: true }` tanpa OTP (belum ada test).
- Email kosong/invalid → 400 (belum ada test).

### `reset-password-with-otp`

- Input valid (`email`, OTP 6 digit, password baru) → `account.createSession(userId, otp)` lalu `users.updatePassword()`; body `{ success: true }`.
- Memakai header `x-appwrite-key` di atas `APPWRITE_API_KEY` untuk SDK admin.
- OTP gagal → 401, password tidak berubah.
- OTP bukan 6 digit / password < 8 → 400 (belum ada test).
- `tests/integration/function-inventory.test.ts`: scopes `reset-password-with-otp` selaras antara `function-scopes.json` dan config.

## `accept-tos` — `tests/integration/accept-tos.test.ts`

- `action: "status"` untuk user belum setuju / versi aktif / versi lama → status benar tanpa mutasi.
- Versi cocok tanpa `tos_accepted_at` → `needsConsent: true`.
- Payload legacy (`tos_version` tanpa `action`) dan `action: "accept"` → diterima.
- Versi sama sudah diterima → tidak ada update; timestamp kosong → di-backfill.
- Versi basi → 400 tanpa update; action tidak dikenal → 400.

## E2E — `tests/e2e/auth-otp.spec.ts` (hanya bila `AUTH_E2E_RUN_LIVE=true`)

- Register UMKM → OTP email → `/onboarding`.
  - ⚠️ Spec masih mengisi label "Nama Usaha" & "Kategori Usaha", padahal `RegisterUmkmForm` kini hanya punya Email, Nomor WhatsApp, Password. Spec perlu diperbarui.
- Reset password: `/forgot-password` → OTP → `/reset-password` (Email Akun, OTP, password baru) → `/login` → login dengan password baru.

## Skenario Acceptance (frontend `src/services/auth/auth.service.ts`)

- Register sukses tapi `create-user-profile` gagal → `profileProvisioned: false`, bukan error.
- Login dengan sesi tanpa baris `users` → self-heal `provisionUserProfile()` sekali.
- Login akun `suspended` → sesi dihapus, `code: "forbidden"`.
- Login dengan role akun ≠ tab portal → logout + banner mismatch.
- OTP verifikasi email salah → sesi password dipulihkan, error ditampilkan.
- Dashboard dengan `needsConsent: true` → interstitial T&C; konten tidak dirender sebelum `accept-tos` sukses.
