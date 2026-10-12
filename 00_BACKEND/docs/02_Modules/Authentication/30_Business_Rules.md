# Authentication — Business Rules

## Role & Routing

- Role registrasi ditentukan lewat query string `/register?role=umkm` atau `/register?role=creator`. Tanpa role valid, halaman menampilkan `RoleChooser` (`src/app/(auth)/register/page.tsx`).
- Hanya `umkm` dan `creator` yang boleh register sendiri (`registrableRoleSchema`). `admin` dibuat lewat konsol.
- Role disimpan ke Appwrite prefs (`account.updatePrefs({ prefs: { role, ... } })`) lalu ke `users.role` oleh `create-user-profile`. Function membaca role dari `body.role || prefs.role || prefs.userRole || labels`; tanpa role → 400.
- Login: `/login?role=umkm|creator` hanya memilih tab portal (default `umkm`). Role yang dipakai tetap `users.role`. Bila role akun ≠ tab portal (atau role `admin`), `LoginForm` mengakhiri sesi dan menampilkan banner mismatch (`portalRoleMismatchMessage`).
- Sumber role/status untuk UI adalah baris `users` lewat `getSession()`, bukan `account.get()`.

## Data Registrasi per Role

- **UMKM** (`registerUmkmSchema`): Email, **Nomor HP/WhatsApp** (format Indonesia, `indonesianPhone`), Password.
  - Nama Usaha & Kategori **tidak** dikumpulkan saat register — diisi di wizard `/onboarding`.
  - Nomor HP **wajib** untuk UMKM.
- **Creator** (`registerCreatorSchema`): Nama Lengkap (`displayName`, maks 255), Email, Password. Tanpa nomor HP.
- Password register/reset: 8–256 karakter (batas Appwrite Auth). Login hanya mewajibkan password terisi (tidak memaksa panjang minimum).

### Alur Data Registrasi → Profil

1. UMKM: prefs `{ role: "umkm", phone }`. Creator: prefs `{ role: "creator", displayName }`; nama juga dikirim sebagai `name` akun Auth.
2. Klien memanggil `create-user-profile` dengan body `{ $id, role, email, name, phone, prefs }` (`provisionUserProfile()`).
3. Function membuat:
   - `users`: `{ userId, role, status: "active", email, phone ← body.phone || prefs.phone, address ← prefs.address, createdAt, tos_version, tos_accepted_at }`.
   - `umkm_profiles`: `businessName`/`category` dari prefs (kosong `""` untuk register saat ini), `isProfileCompleted: false`.
   - `creator_profiles`: `displayName ← prefs.displayName || name`, `totalFollowers/totalOrders/rating = 0`, `isProfileCompleted: false`.
   - `user_storage_usage`: `usedBytes 0`, `quotaBytes 104857600`, `fileCount 0`.
4. Bila baris `users` sudah ada tetapi `phone` kosong, Function mengisi `phone` dari body/prefs (backfill, tidak pernah menimpa).

## Kegagalan Provisioning

- Register dua fase: fase 1 (`account.create` → `createEmailPasswordSession` → `updatePrefs`) wajib sukses; fase 2 (`create-user-profile`) boleh gagal. Kegagalan fase 2 dikembalikan sebagai sukses dengan `profileProvisioned: false` supaya user tidak mendaftar ulang dan kena 409.
- Login: bila `getSession()` → `not_found`, `login()` memanggil `provisionUserProfile()` sekali lalu membaca ulang sesi (self-heal).
- `RoleGuard` menampilkan kartu "Profil Belum Selesai Dibuat" (coba lagi / keluar) untuk sesi tanpa baris `users`, bukan redirect ke `/login`.

## Verifikasi Email

- Setelah register sukses, form langsung meminta OTP verifikasi (`requestEmailOtp` → `account.createEmailToken`).
- `confirmEmailOtp` menghapus sesi password, menukar OTP via `account.createSession(userId, code)`; bila OTP salah, sesi password dipulihkan lewat `createEmailPasswordSession`.
- Halaman register (`RedirectIfAuthenticated preserveUnverifiedSession`) menahan user yang belum terverifikasi di layar OTP. Halaman login **tidak** memaksa verifikasi email.
- Verifikasi email disinkronkan ke `users.email_verified_at` oleh `user-email-verified`. Gate "email terverifikasi sebelum withdrawal pertama" di `request-withdrawal` hanya aktif bila `WITHDRAWAL_ADVANCED_GUARDS_ENABLED=true`.

## Google OAuth

- Tersedia untuk **UMKM** dan **Creator**, hanya bila `NEXT_PUBLIC_ENABLE_GOOGLE_OAUTH === "true"` (default mati; `startGoogleOAuth` no-op bila mati).
- Role diteruskan via query string ke success URL `/auth/callback?role=...&next=...`; failure URL `/login?error=oauth`.
- Akun OAuth baru tanpa mirror `users`: UMKM & Creator **simetris** — `setOAuthAccountPrefs(role)` → `create-user-profile` → `/onboarding`. Tidak ada form data tambahan terpisah; data usaha UMKM (termasuk Nomor WhatsApp) diisi di wizard `/onboarding`.
- Akun yang sudah punya mirror dengan role berbeda dari `role` callback → keputusan `role_mismatch`.
- Callback tanpa sesi valid (bukan `not_found`) → redirect `/login?error=oauth`. `not_found` tanpa role → `/register?error=profile_missing`.

## Reset Password (OTP)

- Alur utama: email → OTP 6 digit → password baru, lewat Function server-side (`request-password-otp`, `reset-password-with-otp`).
- Rate limit server-side: maks **3 permintaan OTP per 10 menit per kombinasi email+IP** (tabel `otp_rate_limits`, key = sha256(`email|ip`) 36 karakter). Melebihi → 429 + `retryAfterSeconds`.
- Anti-enumerasi: email tidak terdaftar tetap dijawab `{ success: true }` tanpa mengirim OTP; OTP salah dan email tak dikenal dijawab pesan 401 yang sama.
- Reset hanya terjadi setelah Appwrite memvalidasi OTP (`account.createSession`) di server; sesi OTP dihapus best-effort setelahnya.
- Jalur legacy tautan recovery (`/reset-password?userId=&secret=` → `account.updateRecovery`) masih didukung `ResetPasswordForm`, tetapi `ForgotPasswordForm` tidak lagi mengirim tautan.

## Status Akun

- Status di `users.status`: `active` | `suspended` | `terminated`. User baru selalu `active`.
- Perubahan status dilakukan modul Users (`suspend-user`, `unsuspend-user`, `review-appeal`) — lihat [Users/30_Business_Rules.md](../Users/30_Business_Rules.md).
- Login frontend menolak akun **`suspended`**: sesi dihapus dan `login()` mengembalikan `code: "forbidden"`. `RoleGuard` juga memblokir dashboard untuk `suspended`.
- ⚠️ Status `terminated` **belum** diblokir oleh `login()` maupun `RoleGuard` (keduanya hanya mengecek `suspended`); aksi finansial/transaksi tetap ditolak di Function yang mengecek `status !== "active"`.

## Persetujuan T&C

- Versi aktif: env `CURRENT_TOS_VERSION` (default `v3.1`), harus sama dengan `TERMS_VERSION` frontend (`src/content/terms.ts`).
- Form register tidak mengirim versi T&C, sehingga `create-user-profile` menulis `tos_version`/`tos_accepted_at` = `null` (Function hanya mengisinya bila payload membawa versi yang sama dengan versi aktif).
- Dashboard (di dalam `RoleGuard`) dibungkus `TosConsentGate`: memanggil `accept-tos` `{ action: "status" }`; bila `needsConsent`, user harus menyetujui (`{ action: "accept", tos_version }`) sebelum konten dirender.
- `needsConsent = acceptedVersion !== currentVersion || !acceptedAt`.
- Konsumen gate: `request-withdrawal` (403 "Setujui T&C terbaru terlebih dahulu.") dan `create-order` (order tidak dibuat bila kreator belum setuju; UMKM dinotifikasi `order_tos_blocked`).

## Lihat Juga

- [40_User_Flow.md](40_User_Flow.md) — urutan langkah lengkap.
- Alur data ke profil: [Users/70_Backend.md](../Users/70_Backend.md).
