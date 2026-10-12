# Authentication — Backend

Dokumen ini khusus untuk Appwrite Auth SDK dan Appwrite Functions modul Authentication. Kontrak pemanggilan dari frontend dibahas di [60_API.md](60_API.md).

## Appwrite Auth SDK

Client-side (`src/services/auth/*`):

- `account.create()` — register user baru (Creator ikut mengirim `name`).
- `account.createEmailPasswordSession()` — login email + password.
- `account.updatePrefs()` — simpan `role` + `phone`/`displayName` ke prefs.
- `account.createEmailToken()` — kirim OTP email 6 digit (verifikasi email).
- `account.createSession(userId, secret)` — tukar OTP jadi sesi (menandai email terverifikasi).
- `account.createOAuth2Session()` — login Google OAuth.
- `account.deleteSession('current')` — logout / tolak akun suspended.
- `account.updateRecovery()` — reset password via tautan recovery legacy.

Server-side (di dalam Function):

- `users.list([...], email)` — lookup akun Auth berdasarkan email (`request-password-otp`, `reset-password-with-otp`).
- `account.createEmailToken()` — kirim OTP reset (client tanpa API key, locale `id`).
- `account.createSession()` — verifikasi OTP reset.
- `users.updatePassword()` — ganti password setelah OTP valid.
- `users.deleteSession()` — hapus sesi OTP sementara.

## Appwrite Functions

Konfigurasi dari `appwrite.config.json` (canonical) dan `appwrite/function-scopes.json`.

| Function | Trigger | Execute | Scopes |
| --- | --- | --- | --- |
| `request-password-otp` | HTTP (klien) | `any` | `documents.read`, `documents.write`, `users.read` |
| `reset-password-with-otp` | HTTP (klien) | `any` | `users.read`, `users.write`, `sessions.write` |
| `accept-tos` | HTTP (klien, POST) | `users` | `documents.read`, `documents.write` |
| `user-email-verified` | Event `users.*.update` | `[]` | `documents.read`, `documents.write` |

### request-password-otp

- **Input**: `{ email }` — dinormalisasi (trim, lowercase, regex email).
- **Aksi**:
  1. Validasi email (400 bila kosong/invalid).
  2. Rate limit di `otp_rate_limits`: dokumen ID = key = sha256(`email|ip`).slice(0, 36). IP dari `x-forwarded-for` (elemen pertama) → `x-real-ip` → `x-appwrite-user-ip` → `"unknown"`. Jendela 10 menit, maks 3; jendela kedaluwarsa di-reset ke `count: 1`. Terblokir → 429 + `retryAfterSeconds`.
  3. Lookup akun Auth via `users.list` (search email, limit 10, cocok persis). Tidak ada → `{ success: true }` tanpa kirim OTP (anti-enumerasi).
  4. `account.createEmailToken(authUser.$id, email)`.
- **Output**: `{ success: true }` — tidak pernah memuat `userId` maupun OTP.
- **Env**: `APPWRITE_FUNCTION_API_ENDPOINT`/`APPWRITE_ENDPOINT`, `APPWRITE_FUNCTION_PROJECT_ID`/`APPWRITE_PROJECT_ID`, API key dari header `x-appwrite-key` (fallback `APPWRITE_API_KEY`), `APPWRITE_DATABASE_ID`/`NEXT_PUBLIC_DB_ID`, `USERS_COLLECTION_ID`, `OTP_RATE_LIMITS_COLLECTION_ID` (default `otp_rate_limits`).

### reset-password-with-otp

- **Input**: `{ email, otpCode, password }` — **bukan** `userId`.
- **Validasi**: email valid, `otpCode` tepat 6 digit angka, password 8–256 karakter (400).
- **Aksi**:
  1. Lookup akun Auth by email; tidak ada → 401 pesan OTP generik.
  2. `account.createSession(userId, otpCode)`; gagal → 401 "Kode OTP salah atau kedaluwarsa. Minta kode baru."
  3. `users.updatePassword(userId, password)`.
  4. `users.deleteSession(userId, session.$id)` best-effort (kegagalan diabaikan).
- **Output**: `{ success: true }`.
- **Catatan**: Function ini tidak memakai `otp_rate_limits`; percobaan OTP hanya dibatasi oleh Appwrite Auth.

### accept-tos

- **Identitas**: header `x-appwrite-user-id` (401 bila kosong). Hanya `POST` (405 lainnya).
- **Input**: `{ action?: "status" | "accept", tos_version? }`. `action` default `"accept"`.
- **Aksi**:
  - Cari baris `users` by `userId` (404 bila tidak ada).
  - `status` → `{ currentVersion, acceptedVersion, acceptedAt, needsConsent }`, tanpa mutasi.
  - `accept` → `tos_version` wajib dan harus sama dengan `CURRENT_TOS_VERSION` (400). Bila versi sama & `tos_accepted_at` sudah ada → `{ success: true, alreadyAccepted: true }` tanpa update. Selain itu tulis `tos_accepted_at = now` (+ `tos_version` bila berbeda) → `alreadyAccepted: false`.
- **Kenapa Function**: baris `users` ditulis server-side; collection `users` tidak punya `update("users")` di level koleksi.
- **Env**: koneksi standar + `USERS_COLLECTION_ID`/`NEXT_PUBLIC_USER_COLLECTION`, `CURRENT_TOS_VERSION` (default `v3.1`).

### user-email-verified

- **Trigger**: event `users.*.update` (tidak ada execute role; bukan jalur klien).
- **Aksi**: payload = akun Auth. Tanpa `$id` atau `emailVerification !== true` → `res.empty()`. Cari baris `users` by `userId`; tidak ada atau `email_verified_at` sudah terisi → no-op. Selain itu tulis `email_verified_at = now`.
- **Output**: `{ success: true, userId }` saat menulis; 500 `{ success: false, error }` saat gagal.
- **Konsumen**: gate withdrawal pertama di `request-withdrawal` (hanya bila `WITHDRAWAL_ADVANCED_GUARDS_ENABLED=true`).

### Function terkait di modul lain

- `create-user-profile` (provisioning mirror `users` + profil + storage usage, juga menulis `tos_version`/`tos_accepted_at` awal) — [Users/70_Backend.md](../Users/70_Backend.md).
- `create-user-wallet` (event `users.*.create`) — [Payments/70_Backend.md](../Payments/70_Backend.md).

## Aturan Implementasi

- Role tidak dibaca dari query string oleh backend. Frontend menerjemahkan `?role=` menjadi `prefs.role` + body `role`; `create-user-profile` membaca `role || prefs.role || prefs.userRole || labels`.
- Nomor HP UMKM wajib di form register (`indonesianPhone`); Creator tidak punya field HP.
- Data registrasi (`role`, `phone`, `displayName`) disimpan ke Appwrite `prefs` lewat `account.updatePrefs()` sebelum `create-user-profile` dipanggil.
- Client-side state (`email` di query, form) bukan sumber kepercayaan untuk reset password. Reset hanya terjadi setelah Appwrite memvalidasi OTP terhadap akun hasil lookup email di server.

## Lihat Juga

- Mekanisme provisioning profil: [Users/70_Backend.md](../Users/70_Backend.md).
- Pembuatan wallet: [Payments/70_Backend.md](../Payments/70_Backend.md).
