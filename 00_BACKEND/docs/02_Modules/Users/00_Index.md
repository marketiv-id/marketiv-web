# Users

Modul profil & identitas pengguna Marketiv: mirror `users` (role, status, T&C, KYC), profil UMKM dan Creator, akun sosial & portfolio creator, kuota file, serta status akun & banding. Pemilik seluruh collection identitas non-Auth.

## Dokumen

- [10_Overview.md](10_Overview.md) — Ringkasan peran & collection yang dimiliki.
- [20_Concepts.md](20_Concepts.md) — Istilah & konsep domain Users.
- [30_Business_Rules.md](30_Business_Rules.md) — Aturan kelengkapan profil, akun sosial, denormalisasi, storage kuota, status akun & banding, KYC.
- [40_User_Flow.md](40_User_Flow.md) — Alur onboarding UMKM & Creator, Settings, upload file, direktori kreator, banding.
- [50_Database.md](50_Database.md) — Skema: users, umkm_profiles, creator_profiles, creator_social_accounts, creator_portfolios, user_storage_usage, user_files, appeals, otp_rate_limits + bucket terkait.
- [60_API.md](60_API.md) — Kontrak service frontend & Functions profil/direktori/file/status akun.
- [70_Backend.md](70_Backend.md) — Appwrite Functions & aturan backend.
- [80_Frontend.md](80_Frontend.md) — Halaman & komponen profil.
- [90_Events.md](90_Events.md) — Event `users.*.create`, notifikasi status akun & tautan modul lain.
- [100_Testing.md](100_Testing.md) — Skenario uji profil, completion, file, direktori, status akun.
