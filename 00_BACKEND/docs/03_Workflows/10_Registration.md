# Workflow: Registration & Onboarding

> **Diverifikasi terhadap kode: 2026-10-12.** Sumber kebenaran: `src/services/auth/auth.service.ts`,
> `src/services/auth/oauth-callback.service.ts`, `src/services/auth/tos.service.ts`,
> `00_BACKEND/functions/{create-user-profile,create-user-wallet,user-email-verified,accept-tos,update-profile,request-password-otp,reset-password-with-otp}`,
> dan trigger/izin di `00_BACKEND/appwrite.config.json`.

## Purpose

Membawa user baru (UMKM atau Creator) dari form pendaftaran sampai akun siap pakai: akun Appwrite Auth + sesi, baris mirror `users`, profil per role, kuota storage, wallet, email terverifikasi, T&C disetujui, dan profil lengkap (`isProfileCompleted = true`).

## Modules Involved

- [Authentication](../02_Modules/Authentication/00_Index.md) — Appwrite Auth, sesi, prefs role, OTP email, pemulihan password, gate T&C.
- [Users](../02_Modules/Users/00_Index.md) — baris `users`, `umkm_profiles` / `creator_profiles`, `creator_social_accounts`, `user_storage_usage`.
- [Payments](../02_Modules/Payments/00_Index.md) — pembuatan `wallets`.
- [Notifications](../02_Modules/Notifications/00_Index.md) — **tidak ada** notifikasi welcome (lihat Notifikasi).

## Trigger

User submit form di `/register?role=umkm` atau `/register?role=creator` (`src/app/(auth)/register/page.tsx`), atau memulai Google OAuth (di balik flag `NEXT_PUBLIC_ENABLE_GOOGLE_OAUTH`, default mati).

## Data Model — Collection yang Terlibat

| Collection | Modul | Aksi | Ditulis oleh |
|---|---|---|---|
| Appwrite Auth (akun + prefs) | Authentication | `account.create`, `updatePrefs({ role, phone \| displayName })` | Browser (`auth.service.ts`) |
| `users` | Users | insert mirror `{ userId, role, status: "active", email, phone, address, createdAt, tos_version, tos_accepted_at }` | `create-user-profile` |
| `umkm_profiles` / `creator_profiles` | Users | insert `isProfileCompleted: false` | `create-user-profile` |
| `user_storage_usage` | Users | insert `{ usedBytes: 0, quotaBytes: 104857600, fileCount: 0 }` | `create-user-profile` |
| `wallets` | Payments | insert `{ userId, balance: 0, pendingBalance: 0 }` | `create-user-wallet` (event) |
| `users.email_verified_at` | Users | update | `user-email-verified` (event) |
| `users.tos_version` / `tos_accepted_at` | Users | update | `accept-tos` |
| `creator_social_accounts` | Users | upsert akun TikTok | Browser (`upsertCreatorSocialAccount`) |
| `otp_rate_limits` | Authentication | rate limit OTP reset password | `request-password-otp` |

## Step-by-step Flow

### Tahap 1: Register (browser, dua fase)

1. **Authentication** — User memilih role; form sesuai role:
   - UMKM: `registerUmkm({ email, phone, password })` — nama usaha & kategori **tidak** diminta di sini (diisi di onboarding).
   - Creator: `registerCreator({ displayName, email, password })`.
2. **Authentication** — Fase 1 (harus sukses): `account.create()` → `account.createEmailPasswordSession()` → `account.updatePrefs({ prefs: { role, phone | displayName } })`.
3. **Users** — Fase 2 (boleh gagal): browser memanggil **sinkron** `create-user-profile` (HTTP, `execute: ["users"]`) dengan payload `{ $id, role, email, name, phone, prefs }`. Function (idempoten, cek-dulu-baru-tulis):
   - `ensureUserMirror` → baris `users` (`status: "active"`). `tos_version`/`tos_accepted_at` hanya diisi bila payload membawa versi T&C aktif (`CURRENT_TOS_VERSION`, default `v3.1`); register saat ini **tidak** mengirimnya, jadi kolom kosong dan user diarahkan ke interstitial T&C (Tahap 4).
   - `ensureUmkmProfile` / `ensureCreatorProfile` → profil `isProfileCompleted: false`, permission `read(any)` + update/delete pemilik.
   - `ensureStorageUsage` → kuota 100 MB.
   - Kegagalan fase 2 dikembalikan sebagai sukses dengan `profileProvisioned: false` (akun & sesi sudah ada); login berikutnya melakukan self-heal (lihat Tahap 3).
4. **Event `users.*.create`** (dipicu `account.create`):
   - `create-user-wallet` → buat `wallets` bila belum ada (idempoten).
   - `create-user-profile` juga terdaftar pada event ini, tetapi saat event menyala prefs belum berisi role → Function membalas 400 "Missing or invalid user role". Jalur efektifnya adalah eksekusi sinkron di langkah 3.

### Tahap 2: Verifikasi Email (OTP)

5. **Authentication** — Setelah register sukses, form memanggil `requestEmailOtp()` → `account.createEmailToken()` (kode 6 digit ke email) dan menampilkan `EmailVerificationPending`.
6. **Authentication** — `confirmEmailOtp()` menghapus sesi password, lalu `account.createSession({ userId, secret: code })`. Sukses → akun Auth `emailVerification = true`. Kode salah → sesi password dipulihkan.
7. **Event `users.*.update`** → `user-email-verified` mengisi `users.email_verified_at` sekali (tidak menimpa). Dipakai gate penarikan pertama di `request-withdrawal` (hanya aktif bila `WITHDRAWAL_ADVANCED_GUARDS_ENABLED=true`).
8. Setelah verifikasi, redirect ke `/onboarding`.

### Tahap 3: Login

9. `login({ email, password })` → `createEmailPasswordSession` → `getSession()` (baca `account.get()` + baris `users` + `isProfileCompleted` dari tabel profil role).
10. Self-heal: bila baris `users` belum ada (`not_found`), `provisionUserProfile()` dijalankan sekali lalu sesi dibaca ulang.
11. `status = "suspended"` → sesi dihapus, login ditolak (`forbidden`).
12. Login membersihkan penanda skip onboarding (`clearOnboardingSkip()`).

### Tahap 4: Persetujuan T&C

13. `TosConsentProvider` (dipasang di `RoleGuard`) memanggil `accept-tos` `{ action: "status" }` → `{ currentVersion, acceptedVersion, acceptedAt, needsConsent }`.
14. Bila `needsConsent`, dialog interstitial memblokir dashboard sampai user memanggil `accept-tos` `{ action: "accept", tos_version }`. Versi harus sama dengan `CURRENT_TOS_VERSION`; idempoten.
15. T&C yang belum disetujui memblokir: `request-withdrawal` (403) dan `create-order` (kreator belum setuju → order tidak dibuat).

### Tahap 5: Onboarding (`/onboarding`)

16. **Users** — Wizard 3 langkah per role (`src/components/features/onboarding/`):
    - UMKM: nama usaha + kategori + kota → deskripsi + logo → alamat & TikTok (opsional).
    - Creator: nama display + niche + kota → bio + avatar → akun TikTok (**wajib**) & Instagram (opsional). TikTok di-upsert ke `creator_social_accounts` **sebelum** profil dikirim.
17. **Users** — Simpan lewat `update-profile` (HTTP). Function memakai whitelist field per role, menulis `phone`/`address` UMKM ke `users`, lalu mengevaluasi completion dari hasil write (`completion.js`):
    - UMKM: `businessName`, `category`, `city`, `description` ≥ 20 karakter, `phone` valid (`^(\+62|62|0)8[0-9]{8,11}$`).
    - Creator: `displayName`, `niche`, `city`, `bio` ≥ 20 karakter, username TikTok di `creator_social_accounts`.
    - `isProfileCompleted` dari body selalu diabaikan; flag hanya naik `false → true` (never downgrade).

> **Wajib, bukan kosmetik.** Selama flag `false`, kreator tidak muncul di
> `get-creator-directory`, tidak dinotifikasi `campaign-published` (query
> `isProfileCompleted = true`), dan ditolak saat klaim campaign (guard di
> `claimCampaignInAppwrite`).

### Jalur Alternatif: Google OAuth (flag, default mati)

- `startGoogleOAuth(role)` → callback `/auth/callback` → `resolveOAuthCallbackDecision()`:
  - user sudah punya baris `users` dengan role sama → redirect dashboard; role berbeda → `role_mismatch`.
  - belum punya (`not_found`) + role `umkm|creator` → `setOAuthAccountPrefs(role)` → `provisionUserProfile()` → `/onboarding`. UMKM dan Creator kini simetris (form perantara `/auth/oauth-complete` dihapus).

### Jalur Alternatif: Lupa Password (OTP)

- `request-password-otp` (HTTP, `execute: ["any"]`): rate limit 3 permintaan / 10 menit per (email, IP) di `otp_rate_limits`; email tak terdaftar tetap dibalas sukses (anti-enumerasi); kirim OTP via `createEmailToken`.
- `reset-password-with-otp` (HTTP, `execute: ["any"]`): tukar OTP → sesi sementara, `users.updatePassword`, hapus sesi. Password 8–256 karakter.
- Catatan: `completePasswordRecovery()` (tautan `updateRecovery`) masih ada di service, tetapi alur UI utama memakai OTP.

## State Transitions

```text
Form Submitted → Auth account + session + prefs(role)
      → create-user-profile (sinkron) → users(active) + profil(isProfileCompleted=false) + storage
      → users.*.create → create-user-wallet → wallets(balance=0)
      → OTP email → users.*.update → users.email_verified_at
      → accept-tos → users.tos_version/tos_accepted_at
      → update-profile → isProfileCompleted: false → true
```

`users.status`: `active` → `suspended` | `terminated` (lihat [60_Dispute](60_Dispute.md)).

## Events / Functions

| Trigger | Function | Aksi |
|---|---|---|
| HTTP (browser, `users`) | `create-user-profile` | Mirror `users` + profil + `user_storage_usage` (jalur efektif) |
| `users.*.create` | `create-user-profile` | Terdaftar, tetapi gagal 400 karena prefs belum berisi role |
| `users.*.create` | `create-user-wallet` | Buat wallet (idempoten) |
| `users.*.update` | `user-email-verified` | Isi `users.email_verified_at` saat `emailVerification = true` |
| HTTP (`users`) | `accept-tos` | `status` / `accept` T&C |
| HTTP (`users`) | `update-profile` | Update profil + evaluasi completion |
| HTTP (`any`) | `request-password-otp`, `reset-password-with-otp` | Pemulihan password via OTP |

- Lihat: [Authentication/90_Events](../02_Modules/Authentication/90_Events.md), [Users/70_Backend](../02_Modules/Users/70_Backend.md), [Payments/90_Events](../02_Modules/Payments/90_Events.md).

## Validation Rules per Langkah

| Langkah | Validasi | Gagal → |
|---|---|---|
| Register UMKM | `email`, `phone` (format Indonesia), `password` (Zod `registerUmkmSchema`) | Error form |
| Register Creator | `displayName`, `email`, `password` | Error form |
| Register | Email unik (Appwrite Auth) | "Email ini sudah terdaftar…" |
| `create-user-profile` | Role ∈ `umkm \| creator \| admin`; idempoten per `userId` | 400 / no-op |
| `create-user-wallet` | Idempoten per `userId` | `created: false` |
| Login | Kredensial cocok; `users.status` ≠ `suspended` | Error login / `forbidden` |
| `accept-tos` | `tos_version` = versi aktif | 400 |
| `update-profile` | Role `umkm \| creator`; whitelist field | 400/404 |
| Reset password OTP | Rate limit 3/10 menit; OTP 6 digit; password 8–256 | 429 / 401 / 400 |

## Notifikasi

| Titik | Notifikasi | Penerima |
|---|---|---|
| Registrasi selesai | **Belum diimplementasikan** — tidak ada Function yang menulis notifikasi "Selamat datang" (`create-user-wallet` hanya membuat wallet) | — |
| Email OTP / reset OTP | Email native Appwrite (`createEmailToken`) | User |

## Edge Cases

- Email sudah terdaftar → ditolak Appwrite Auth.
- Fase 2 register gagal (mis. izin Function) → akun & sesi tetap ada, `profileProvisioned: false`; UI menawarkan "coba lagi" dan login berikutnya self-heal.
- Event `users.*.create` untuk `create-user-profile` selalu gagal 400 (prefs kosong) — perilaku yang diketahui, tidak berbahaya karena jalur sinkron.
- Baris `users` sudah ada tetapi `phone` kosong (mis. daftar via Google) → `create-user-profile` mem-backfill `phone` dari `prefs.phone`, tidak menimpa nilai lama.
- Onboarding boleh dilewati; penanda skip disimpan per sesi (`sessionStorage`, `src/lib/onboarding-skip.ts`), sehingga login berikutnya menawarkan wizard lagi.
- OTP verifikasi salah → sesi password dipulihkan agar user tidak ter-logout.

## Links

- [Authentication](../02_Modules/Authentication/00_Index.md)
- [Users](../02_Modules/Users/00_Index.md)
- [Payments](../02_Modules/Payments/00_Index.md)
- [Campaign PPV workflow](20_Campaign_PPV.md)
- [Withdrawal workflow](50_Withdrawal.md) — gate T&C, email, KYC
