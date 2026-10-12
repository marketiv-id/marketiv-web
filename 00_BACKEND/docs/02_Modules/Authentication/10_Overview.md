# Authentication — Overview

## Ringkasan

- Mengelola identitas masuk pengguna Marketiv dengan dua role yang bisa mendaftar sendiri: **UMKM** dan **Creator**. Role `admin` tidak bisa didaftarkan lewat form (`registrableRoleSchema` hanya `umkm | creator`, `src/lib/validations/auth.schema.ts`).
- Dibangun di atas **Appwrite Auth** — kredensial, sesi, dan token OTP disimpan Appwrite Auth.
- Tanggung jawab:
  - Registrasi manual (email + password) dan Google OAuth (di balik flag `NEXT_PUBLIC_ENABLE_GOOGLE_OAUTH`, default mati).
  - Verifikasi email lewat **OTP 6 digit** (Appwrite Email Token) setelah register.
  - Login, self-heal profil yang belum terbentuk, logout.
  - Reset password lewat **OTP 6 digit** (Function `request-password-otp` + `reset-password-with-otp`). Jalur tautan recovery legacy (`account.updateRecovery`) masih ada di kode.
  - Persetujuan/re-consent T&C (Function `accept-tos`).
  - Gate status akun saat login (akun `suspended` ditolak).

## Batasan Kepemilikan

- **Tidak memiliki** collection profil. Kredensial disimpan oleh Appwrite Auth.
- `otp_rate_limits` (dipakai `request-password-otp`) didefinisikan di blok Modul Users pada `appwrite/generate_appwrite_json.cjs`; skemanya di [Users/50_Database.md](../Users/50_Database.md).
- Saat registrasi, modul ini **memicu** pembuatan record di modul lain:
  - Baris `users` + profil + `user_storage_usage` → milik [Users](../Users/70_Backend.md) (Function `create-user-profile`, dieksekusi sinkron dari klien).
  - Wallet → milik [Payments](../Payments/70_Backend.md) (Function `create-user-wallet`, event `users.*.create`).

## Ketergantungan

- **Users** — `create-user-profile` membuat mirror `users`, profil role, dan `user_storage_usage`; `getSession()` membaca role/status/T&C dari baris `users`.
- **Payments** — wallet dibuat otomatis lewat event `users.*.create`; gate T&C/email/KYC dibaca `request-withdrawal`.
- **Orders** — `create-order` menolak order bila kreator belum menyetujui T&C versi aktif.
- **Notifications** — tidak ada welcome notification (lihat [90_Events.md](90_Events.md)).

## Lihat Juga

- [90_Events.md](90_Events.md) — efek event registrasi & verifikasi email.
