# Users — Business Rules

## Kelengkapan Profil

- Setiap profil (`umkm_profiles`, `creator_profiles`) memiliki flag `isProfileCompleted` (default `false`).
- **Flag hanya ditulis server-side** oleh Function `update-profile`. Body `isProfileCompleted` selalu diabaikan; allow-list frontend (`UMKM_PROFILE_WRITABLE`, `CREATOR_PROFILE_WRITABLE`) tidak menyertakannya.
- **Aturan evaluasi (canonical, `functions/update-profile/src/completion.js`):**
  - **UMKM**: `businessName`, `category`, `city` tidak kosong; `description` ≥ 20 karakter (setelah trim); `phone` di `users.phone` cocok format HP Indonesia `^(\+62|62|0)8[0-9]{8,11}$`. TikTok UMKM opsional.
  - **Creator**: `displayName`, `niche`, `city` tidak kosong; `bio` ≥ 20 karakter; ada `username` TikTok di `creator_social_accounts` (`creatorId = userId`, `platform = "tiktok"`).
- **Never downgrade**: flag hanya `false → true`. Profil yang sudah `true` tidak pernah turun walau field dikosongkan.
- Evaluasi hanya terjadi saat `update-profile` dipanggil. Mengubah akun TikTok saja (`creator_social_accounts`) tidak mengevaluasi ulang flag; wizard kreator karena itu menulis akun TikTok **sebelum** memanggil `update-profile`.
- Onboarding dan Settings memanggil Function yang sama — aturan completion identik.
- Profil belum lengkap berdampak: `RoleGuard` mengarahkan ke `/onboarding` (bisa dilewati per sesi), kreator tidak muncul di daftar `get-creator-directory`, tidak dinotifikasi `campaign-published` (query `isProfileCompleted = true`), dan klaim campaign ditolak oleh cek client-side di `claimCampaignInAppwrite` (Function `campaign-claimed` tidak mengecek flag ini).

## Atribut Opsional

- Upload logo UMKM opsional (onboarding & Settings).
- Avatar kreator opsional saat onboarding; banner hanya dari Settings.
- Portfolio kreator **tidak** ada di wizard onboarding; ditambah/diubah/dihapus dari Settings kreator.

## Data Registrasi dan Onboarding

- **UMKM Register**: hanya `email`, `phone`, dan kredensial. `businessName`/`category` dibuat `""` oleh `create-user-profile`.
- **UMKM Onboarding**: `businessName`, `category`, `city`, `description` → `umkm_profiles`; `phone`, `address` → `users`; `tiktok`, `logoUrl` → `umkm_profiles`.
- **Creator Register**: `displayName` (juga nama akun Auth).
- **Creator Onboarding**: `displayName`, `niche`, `city`, `bio`, `avatarUrl` → `creator_profiles`; TikTok username → `creator_social_accounts`.
- **Kompatibilitas**: data UMKM lama di `umkm_profiles`/`users` dipakai sebagai prefill onboarding dan tetap dapat diedit.

## Social Media UMKM

- Opsional; untuk MVP hanya TikTok (`umkm_profiles.tiktok`, string bebas).
- Kelengkapan profil UMKM tidak bergantung pada akun TikTok.
- Website tidak menjadi field profil UMKM pada MVP.

## Akun Sosial Creator

- Untuk MVP frontend hanya menulis `platform = "tiktok"`, satu baris per platform (upsert by `creatorId` + `platform`; tidak ada unique index di DB).
- `creatorId` = `userId` akun Auth (bukan `$id` dokumen `creator_profiles`).
- `followers` diisi manual oleh kreator (Settings); `engagementRate` belum punya jalur tulis di frontend (default `0`).
- Akun TikTok **wajib** untuk completion kreator.

## Data Denormalisasi (disengaja)

Disimpan langsung di `creator_profiles` agar dashboard & browse cepat:

- `totalFollowers`, `totalOrders`, `rating` — default `0` saat profil dibuat.
- ⚠️ Pemutakhiran **belum diimplementasikan**: tidak ada Function (di modul mana pun) yang menulis ulang ketiga kolom ini setelah `create-user-profile` mengisinya `0`. `get-creator-directory`/`get-creator-profile` hanya membacanya.

## Storage Kuota (aktif)

- File Manager internal **aktif** untuk unggahan lewat `validate-and-upload` (dipakai deliverable rate card di ruang negosiasi kreator).
- Kuota default **100 MB** (104.857.600 bytes) per user di `user_storage_usage`, dibuat oleh `create-user-profile`.
- Upload ditolak bila `usedBytes + ukuran > quotaBytes` (409 "Storage quota exceeded") atau `fileCount >= 100` (409 "Active file limit reached").
- Maks ukuran satu file: **20 MB**. Tipe diizinkan: `image/*`, `video/*`, `application/pdf`, `application/msword`, dan OOXML word/spreadsheet/presentation.
- File yang dihapus (`delete-file`, soft delete) mengurangi `usedBytes` & `fileCount`. `delete-file` belum dipanggil frontend.
- Unggahan ke bucket publik (`avatars`, `creator-banners`, `logos`, `portfolios`) tidak lewat Function dan tidak dihitung kuota.
- Aset campaign berbasis external URL dikelola modul Campaigns.

## Status Akun & Banding (Appeals)

- Status akun: `active` (default), `suspended`, `terminated`.
- Perubahan status hanya lewat Function server-side tanpa execute role klien: `suspend-user`, `unsuspend-user`, `review-appeal` (dipanggil dengan API key, mis. dari aplikasi admin).
- `suspend-user` hanya dari status `active` (409 bila sudah non-active); mengisi `suspended_at`.
- `unsuspend-user` hanya untuk `suspended` (409 untuk `terminated` atau `active`); `suspended_at` dibiarkan.
- Akun non-active diblokir di Function yang mengecek `status !== "active"`: `create-payment`, `request-withdrawal`, `submit-campaign-proof`, `unclaim-campaign`, `cancel-order`, `create-offer` & `create-conversation` (via `_shared/require-active-role.js`). Login frontend & `RoleGuard` hanya memblokir `suspended`.
- User dapat mengajukan banding (`create-appeal`) bila status non-active, `suspended_at` terisi, dan masih dalam **14 hari** sejak `suspended_at`; lewat batas → 403.
- Hanya satu banding terbuka (`submitted`/`under_review`) per user (409).
- SLA keputusan dicatat `slaDecidedAt = pengajuan + 7 hari` (hari kalender di kode).
- Akun tetap non-active selama banding diproses. Banding `approved` → `users.status = "active"` (termasuk dari `terminated`); `rejected` → status tidak berubah. Banding yang sudah diputuskan tidak bisa diputus ulang (409).
- Belum ada UI frontend untuk mengajukan banding.

## KYC

- `users.kyc_status`: `none` | `pending_wa` | `verified`. Dokumen KYC diverifikasi manual via WhatsApp admin.
- `verify-kyc` (execute `[]`, API key saja) menandai `verified` + `kyc_verified_at` dan mengirim notifikasi `kyc_verified`. Idempoten.
- `pending_wa` ditulis `request-withdrawal` hanya bila `WITHDRAWAL_ADVANCED_GUARDS_ENABLED=true` dan nominal ≥ `KYC_THRESHOLD` (default 5.000.000) — lihat modul Payments.

## Lihat Juga

- [50_Database.md](50_Database.md) — atribut & index.
- [60_API.md](60_API.md) — operasi profil, direktori creator, & file manager.
