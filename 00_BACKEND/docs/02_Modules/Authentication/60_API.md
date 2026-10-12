# Authentication — API

## Service Layer (Client SDK)

Fungsi berikut dipanggil dari frontend Next.js lewat **Appwrite Client SDK** (berjalan di browser) di `src/services/auth/`. Semua mengembalikan `ServiceResult<T>` (`{ success, data, error?, code? }`) dan punya cabang mock (`DATA_SOURCE_CONFIG.useMockData`). Komponen tidak boleh memanggil `account` langsung.

> `00_BACKEND/src/services/auth.service.ts` (`registerUMKM`, `registerCreator`, `registerUser`, `loginUser`, `forgotPassword` via `account.createRecovery`, `resetPassword`) adalah service referensi lama yang hanya dipakai unit test `tests/unit/auth.service.test.ts`; **tidak** dipakai frontend. Kontrak di bawah adalah yang berjalan.

---

### `registerUmkm(input)` — [Client SDK] `auth.service.ts`

Input (`registerUmkmSchema`):

```json
{
  "email": "",
  "phone": "08xxxxxxxxxx",
  "password": "min 8, maks 256"
}
```

Proses: `account.create` → `createEmailPasswordSession` → `updatePrefs({ prefs: { role: "umkm", phone } })` → `provisionUserProfile()`.

Return:

```json
{
  "user": "SessionUser",
  "profileProvisioned": true,
  "provisionErrorCode": "auth | forbidden | ... (bila profileProvisioned false)"
}
```

### `registerCreator(input)` — [Client SDK] `auth.service.ts`

Input (`registerCreatorSchema`):

```json
{
  "displayName": "",
  "email": "",
  "password": ""
}
```

`displayName` dikirim sebagai `name` akun Auth dan sebagai `prefs.displayName`; Function `create-user-profile` menuliskannya ke `creator_profiles.displayName`. Return sama dengan `registerUmkm`.

### `provisionUserProfile()` — [Client SDK → Appwrite Function]

Membaca `account.get()` lalu mengeksekusi `create-user-profile` dengan body `{ $id, role: prefs.role, email, name, phone, prefs }`. Dipakai di akhir register, tombol "coba lagi", self-heal login, dan callback OAuth. 401/403 dipetakan ke pesan "izin Function create-user-profile belum aktif".

### `login(input)` — [Client SDK]

Input: `{ email, password }`. Proses: `createEmailPasswordSession` → `getSession()` → self-heal `provisionUserProfile()` bila `not_found` → tolak `suspended` (hapus sesi, `code: "forbidden"`). Return: `SessionUser`.

### `getSession()` — [Client SDK] `session.service.ts`

`account.get()` + baris `users` (query kolom `userId`) + `isProfileCompleted` dari profil role. Return:

```json
{
  "userId": "",
  "email": "",
  "role": "umkm | creator | admin",
  "status": "active | suspended | terminated",
  "name": "nama akun Auth",
  "phone": "users.phone",
  "emailVerified": true,
  "tosVersion": "v3.1",
  "tosAcceptedAt": "",
  "isProfileCompleted": false
}
```

Baris `users` tidak ada → `{ success: false, code: "not_found" }`. Sesi tidak ada → `code: "auth"`.

### `logout()` — [Client SDK] `session.service.ts`

`account.deleteSession({ sessionId: "current" })`.

---

### `requestEmailOtp({ userId, email })` — [Client SDK]

`account.createEmailToken` — kirim OTP verifikasi email setelah register (dan tombol "kirim ulang").

### `confirmEmailOtp({ userId, email, password, code })` — [Client SDK]

Hapus sesi aktif → `account.createSession({ userId, secret: code })`. Gagal → pulihkan sesi via `createEmailPasswordSession(email, password)` dan kembalikan error.

---

### `requestPasswordRecovery({ email })` — [Appwrite Function `request-password-otp`]

Input: `{ "email": "user@example.com" }`.

Return Function (selalu tanpa `userId`, tanpa OTP mentah):

```json
{ "success": true }
```

| Status | Body |
| --- | --- |
| 400 | `{ success: false, error: "Email wajib diisi." }` (juga untuk format email invalid) |
| 429 | `{ success: false, error: "Terlalu banyak permintaan OTP. Tunggu beberapa menit lalu coba lagi.", retryAfterSeconds }` |
| 500 | `{ success: false, error: "Gagal mengirim kode OTP. Coba lagi." }` |

### `completePasswordRecoveryWithOtp({ email, otpCode, password, passwordConfirm })` — [Appwrite Function `reset-password-with-otp`]

Body yang dikirim ke Function:

```json
{
  "email": "user@example.com",
  "otpCode": "123456",
  "password": "new-password"
}
```

Return `{ "success": true }`.

| Status | Pesan |
| --- | --- |
| 400 | `Email wajib diisi.` · `Masukkan kode OTP 6 digit.` · `Password baru wajib diisi.` · `Password minimal 8 karakter.` · `Password maksimal 256 karakter.` |
| 401 | `Kode OTP salah atau kedaluwarsa. Minta kode baru.` (email tak dikenal atau OTP gagal) |
| 500 | `Gagal mengatur ulang password. Coba lagi.` |

### `completePasswordRecovery({ userId, secret, password, passwordConfirm })` — [Client SDK, legacy]

`account.updateRecovery` untuk tautan recovery lama (`/reset-password?userId=&secret=`). Tidak ada lagi jalur frontend yang mengirim tautan ini.

---

### `startGoogleOAuth(role?, next?)` — [Client SDK]

`account.createOAuth2Session({ provider: Google, success: <origin>/auth/callback?next&role, failure: <origin>/login?error=oauth })`. No-op bila `isGoogleOAuthEnabled()` false.

### `setOAuthAccountPrefs(role, extra?)` — [Client SDK]

`account.updatePrefs({ prefs: { role, ...extra } })` untuk akun OAuth baru sebelum provisioning.

### `resolveOAuthCallbackDecision(input)` — [pure] `oauth-callback.service.ts`

Return salah satu: `{ action: "redirect", href }`, `{ action: "provision" }`, `{ action: "show_recovery" }`, `{ action: "role_mismatch", actualRole }`. Lihat [40_User_Flow.md](40_User_Flow.md).

---

### `getTosStatus()` — [Appwrite Function `accept-tos`] `tos.service.ts`

Body `{ "action": "status" }`. Return:

```json
{
  "currentVersion": "v3.1",
  "acceptedVersion": "v3.1 | null",
  "acceptedAt": "ISO | null",
  "needsConsent": false
}
```

### `acceptCurrentTos(version)` — [Appwrite Function `accept-tos`]

Body `{ "action": "accept", "tos_version": "v3.1" }`. Return `{ success: true, alreadyAccepted: boolean, tos_version }`.

| Status | Pesan |
| --- | --- |
| 400 | `Action tidak didukung.` · `tos_version wajib diisi.` · `Versi T&C tidak sesuai dengan versi aktif.` |
| 401 | `Unauthorized` (tanpa header `x-appwrite-user-id`) |
| 404 | `Profil pengguna tidak ditemukan.` |
| 405 | `Method not allowed` (selain POST) |

---

## Appwrite Functions (Server-side)

Module ini tidak memiliki REST API publik sendiri. Detail Function (`request-password-otp`, `reset-password-with-otp`, `accept-tos`, `user-email-verified`) ada di [70_Backend.md](70_Backend.md). `create-user-profile` didokumentasikan di [Users/70_Backend.md](../Users/70_Backend.md).

---

## Lihat Juga

- [30_Business_Rules.md](30_Business_Rules.md) — aturan validasi input.
- Skema `users` & profil: [Users/50_Database.md](../Users/50_Database.md).
