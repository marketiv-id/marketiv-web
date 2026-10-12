# Users — Overview

## Ringkasan

- Mengelola data pengguna setelah autentikasi: mirror `users`, profil UMKM, profil Creator, akun sosial & portfolio creator.
- Menghitung kelengkapan profil (`isProfileCompleted`) secara server-side (`update-profile`).
- Sumber data Creator Directory untuk UMKM (`get-creator-directory`) dan profil komposit (`get-umkm-profile`, `get-creator-profile`).
- Kuota file pengguna (`validate-and-upload`, `delete-file`).
- Status akun (`suspend-user`, `unsuspend-user`), banding (`create-appeal`, `review-appeal`), dan penandaan KYC (`verify-kyc`).

## Collection yang Dimiliki

- `users` — record identitas inti (mirror Appwrite Auth + role/status/T&C/verifikasi email/KYC).
- `umkm_profiles` — profil bisnis UMKM.
- `creator_profiles` — profil creator.
- `creator_social_accounts` — akun sosial creator (1 creator → banyak akun; MVP TikTok).
- `creator_portfolios` — portfolio creator (1 creator → banyak portfolio).
- `user_storage_usage` — kuota & pemakaian storage per user (aktif).
- `user_files` — metadata file unggahan via `validate-and-upload` (aktif).
- `appeals` — banding status akun.
- `otp_rate_limits` — rate limit OTP reset password (dipakai modul Authentication).

Skema lengkap di [50_Database.md](50_Database.md).

## Ketergantungan

- **Authentication** — memicu `create-user-profile` saat registrasi/login/OAuth.
- **RateCards** — `rate_cards` & `rate_card_packages` untuk `startingPrice` di direktori/profil kreator.
- **Orders** — `validate-and-upload` membaca `orders` untuk berbagi file ke pihak lawan (`shareWithOrderId`).
- **Notifications** — `suspend-user`, `unsuspend-user`, `create-appeal`, `review-appeal`, `verify-kyc` menulis baris `notifications`.
- **Payments**, **Orders**, **Campaigns**, **Chat/Offers** — membaca `users.status`/`role`/T&C/KYC sebagai gate.

## Lihat Juga

- [Domain Model](../10_Domain_Model.md) — domain Identity.
