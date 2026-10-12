# Authentication — Frontend

Route group `src/app/(auth)/`; komponen di `src/components/features/auth/` dan `src/components/auth/`.

## Halaman

### Landing Page

- CTA "Daftar UMKM" → `/register?role=umkm`, "Daftar Creator" → `/register?role=creator`, "Login" → `/login`.

### Register (`/register`)

- Tanpa `role` valid → `RoleChooser`.
- `role=umkm` → `RegisterUmkmForm`: Email, Nomor WhatsApp, Password.
- `role=creator` → `RegisterCreatorForm`: Nama Lengkap, Email, Password.
- Setelah submit sukses → `EmailVerificationPending` (input OTP 6 digit + kirim ulang) → `/onboarding`.
- Dibungkus `RedirectIfAuthenticated preserveUnverifiedSession` (user yang belum verifikasi email tidak dilempar keluar dari layar OTP).

### Login (`/login`)

- `LoginForm` dengan tab role (`?role=umkm|creator`, default `umkm`), email + password, dan `GoogleButton` (hanya dirender bila `NEXT_PUBLIC_ENABLE_GOOGLE_OAUTH=true`).
- Query `next` (path internal), `error=role_mismatch&actualRole=` menampilkan banner mismatch.
- Akun suspended → tampilan "Akun Ditangguhkan".

### OAuth Callback (`/auth/callback`)

- `OAuthCallback`: menjalankan `resolveOAuthCallbackDecision` (redirect / provision / recovery / role mismatch).

### Forgot Password (`/forgot-password`)

- `ForgotPasswordForm`: input email → Function `request-password-otp` → layar "Cek email kamu" + tombol ke `/reset-password?email=<email>`.
- Tidak dibungkus `RedirectIfAuthenticated`.

### Reset Password (`/reset-password`)

- `ResetPasswordForm` mode OTP (default): Email Akun, Kode OTP 6 digit, Password Baru, Ulangi Password → Function `reset-password-with-otp` → logout → `/login`.
- Mode legacy bila query `userId` + `secret` ada: hanya password baru → `account.updateRecovery`.

### Onboarding (`/onboarding`)

- Wizard profil — lihat [Users/80_Frontend.md](../Users/80_Frontend.md).

## Komponen

- `RoleChooser`, `RegisterUmkmForm`, `RegisterCreatorForm`, `LoginForm`, `LoginRoleHub` — form registrasi/login per role.
- `EmailVerificationPending` — input OTP verifikasi email.
- `GoogleButton` — tombol OAuth Google (role diteruskan ke callback).
- `OAuthCallback`, `ProfileProvisionNotice` — penanganan provisioning/recovery.
- `ForgotPasswordForm`, `ResetPasswordForm` (`OtpResetPasswordForm`, alias `InvalidRecoveryLink`).
- `RoleGuard` (`src/components/auth/`) — guard dashboard: tanpa sesi → `/login?next=`, profil hilang → kartu recovery, role salah → dashboard role yang benar, `suspended` → blokir, profil belum lengkap → `/onboarding`, lalu `TosConsentGate`.
- `RedirectIfAuthenticated` — mengalihkan user yang sudah login dari halaman auth.
- `TosConsentGate` (`src/components/providers/TosConsentProvider.tsx`) — interstitial re-consent T&C.
