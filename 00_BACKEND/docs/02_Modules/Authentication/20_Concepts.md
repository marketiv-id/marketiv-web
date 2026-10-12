# Authentication — Concepts

## Istilah

- **Appwrite Auth** — layanan autentikasi Appwrite yang mengelola kredensial, sesi, prefs, dan token.
- **Role** — tipe pengguna: `umkm`, `creator`, atau `admin` (admin tidak bisa register lewat form).
- **Prefs** — `account.prefs` Appwrite Auth. Klien menulis `{ role, phone }` (UMKM) atau `{ role, displayName }` (Creator) lewat `account.updatePrefs()`; `create-user-profile` membacanya untuk membentuk baris `users` & profil.
- **Mirror `users`** — baris di collection `users` (milik modul Users) yang menyimpan `userId` Auth, `role`, `status`, `email`, `phone`, T&C, verifikasi email, KYC. Sumber kebenaran role/status untuk UI (bukan `account.get()`).
- **Provisioning** — eksekusi `create-user-profile` yang membuat mirror `users`, profil role, dan `user_storage_usage`. Idempoten.
- **Profile missing** — sesi Auth valid tetapi baris `users` belum ada (`getSession()` → `code: "not_found"`). Bukan kegagalan login.
- **Email OTP** — kode 6 digit dari `account.createEmailToken()`; ditukar jadi sesi lewat `account.createSession(userId, code)`. Dipakai untuk verifikasi email setelah register dan (di server) untuk membuktikan OTP reset password.
- **Google OAuth** — login/daftar via akun Google untuk UMKM dan Creator; tombol hanya dirender bila `NEXT_PUBLIC_ENABLE_GOOGLE_OAUTH=true`.
- **Reset Password OTP** — pemulihan password dengan email + OTP 6 digit + password baru, diverifikasi server-side.
- **T&C (ToS) version** — versi syarat & ketentuan aktif (`CURRENT_TOS_VERSION`, default `v3.1`). Persetujuan dicatat di `users.tos_version` & `users.tos_accepted_at`.

## Konsep

- Role ditentukan saat registrasi lewat route `/register?role=umkm` atau `/register?role=creator`, lalu disimpan ke prefs dan ke `users.role` oleh `create-user-profile`.
- Autentikasi hanya mengelola kredensial; data profil disimpan di modul Users.
- `create-user-profile` dijalankan **sinkron dari klien** setelah prefs terpasang. Trigger event `users.*.create` tetap ada sebagai jaring pengaman, tapi saat itu prefs masih kosong sehingga eksekusi event gagal 400 (lihat [90_Events.md](90_Events.md)).
- Wallet pengguna dibuat otomatis saat registrasi (event `users.*.create` → `create-user-wallet`).
- Persetujuan T&C tidak dikumpulkan di form register; user menyetujuinya lewat interstitial di dashboard (`accept-tos`).
