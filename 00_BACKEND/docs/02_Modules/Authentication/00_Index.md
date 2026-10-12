# Authentication

Modul registrasi, verifikasi email (OTP), login, reset password (OTP), dan persetujuan T&C Marketiv. Memakai **Appwrite Auth** sebagai sumber kredensial — modul ini **tidak memiliki collection profil sendiri**; baris `users` & profil dimiliki modul [Users](../Users/00_Index.md), wallet milik Payments. Satu tabel pendukung, `otp_rate_limits` (rate limit OTP reset password), skemanya ada di [Users/50_Database.md](../Users/50_Database.md).

## Dokumen

- [10_Overview.md](10_Overview.md) — Ringkasan peran modul & ketergantungannya.
- [20_Concepts.md](20_Concepts.md) — Istilah & konsep autentikasi (mirror `users`, provisioning, OTP, T&C).
- [30_Business_Rules.md](30_Business_Rules.md) — Aturan role, data registrasi, OAuth, verifikasi email, reset password, status akun, T&C.
- [40_User_Flow.md](40_User_Flow.md) — Alur register, verifikasi OTP, login, OAuth, lupa password, re-consent T&C.
- [60_API.md](60_API.md) — Kontrak service frontend (`src/services/auth/*`) & Functions auth.
- [70_Backend.md](70_Backend.md) — Appwrite Auth SDK & Functions (`request-password-otp`, `reset-password-with-otp`, `accept-tos`, `user-email-verified`).
- [80_Frontend.md](80_Frontend.md) — Route & komponen autentikasi.
- [90_Events.md](90_Events.md) — Event registrasi & verifikasi email serta efek lintas modul.
- [100_Testing.md](100_Testing.md) — Skenario uji register, login, OAuth, OTP, T&C.
