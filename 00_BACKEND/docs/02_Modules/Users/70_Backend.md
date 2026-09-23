# Users — Backend

Dokumen ini khusus untuk Appwrite Functions dan aturan backend. Kontrak pemanggilan dari frontend dibahas di [60_API.md](60_API.md).

## Appwrite Functions

### create-user-profile

- **Trigger**: `users.create` (event) dan eksekusi sinkron dari frontend setelah `account.updatePrefs()`.
- **Aksi**: buat `umkm_profiles` atau `creator_profiles` sesuai role; inisialisasi `user_storage_usage` dengan `usedBytes = 0`, `quotaBytes = 104857600`, `fileCount = 0`.
- **Idempoten**: jika baris `users`, profil role, atau `user_storage_usage` sudah ada, Function memakai baris existing dan tidak membuat duplikat.
- **Recovery OAuth/legacy**: user Auth lama atau user Google OAuth yang belum punya mirror boleh menjalankan Function ini lagi setelah prefs role tersedia. Hasil `getSession()` `not_found` berarti mirror belum ada, bukan bukti credential salah.
- ⚠️ `user_storage_usage` dormant — tidak dipakai MVP.

### validate-and-upload ⚠️ DORMANT

- **Infrastruktur dormant — tidak aktif di MVP.** Diaktifkan jika feedback demo minggu pertama meminta file manager internal.
- **Trigger**: dipanggil API `uploadFile()`.
- **Execute**: authenticated users.
- **Input**: `{ fileName, mimeType, sizeBytes, contentBase64 }`.
- **Aksi**:
  1. Baca `user_storage_usage` milik user.
  2. Validasi kuota: `usedBytes + file.size ≤ quotaBytes`.
  3. Validasi batas file: `fileCount < 100`.
  4. Upload file ke Appwrite Storage bucket default File Manager.
  5. Buat metadata di `user_files` dengan `status = active`.
  6. Increment `usedBytes` dan `fileCount` di `user_storage_usage`.

### delete-file ⚠️ DORMANT

- **Infrastruktur dormant — tidak aktif di MVP.** Diaktifkan jika feedback demo minggu pertama meminta file manager internal.
- **Trigger**: dipanggil API `deleteFile()`.
- **Execute**: authenticated users.
- **Input**: `{ fileId }`.
- **Aksi**:
  1. Validasi `user_files.$id` milik user yang memanggil.
  2. Hapus file dari Appwrite Storage.
  3. Soft delete metadata `user_files` (`status = deleted`, set `deletedAt`).
  4. Decrement `usedBytes` dan `fileCount` di `user_storage_usage`.

### update-profile

- **Trigger**: dipanggil frontend (`executeFunction`) dari onboarding & Settings — SATU path untuk keduanya.
- **Execute**: authenticated users.
- **Input**: field profil whitelist per role (lihat `UMKM_PROFILE_FIELDS` / `CREATOR_PROFILE_FIELDS` di `functions/update-profile/src/main.js`). `isProfileCompleted` di body SELALU diabaikan.
- **Aksi**:
  1. Baca `users.role` (identitas dari header `x-appwrite-user-id`).
  2. Tulis field whitelist ke `umkm_profiles` / `creator_profiles`; `phone`/`address` UMKM ke `users`.
  3. Evaluasi completion (server-side source of truth — lihat [30_Business_Rules.md](30_Business_Rules.md)):
     - UMKM: `businessName`, `category`, `city`, `description` ≥ 20 char, `phone`.
     - Creator: `displayName`, `niche`, `city`, `bio` ≥ 20 char, TikTok username dari `creator_social_accounts`.
  4. Tulis `isProfileCompleted` **never downgrade**: `true` tetap `true`; `false` → `true` hanya jika evaluasi pass.
- **Output**: `{ success, role, isProfileCompleted, ...field }`.
- **Kenapa Function**: client tidak boleh menulis flag (RoleGuard, claim campaign, `get-creator-directory` bergantung padanya).

### get-umkm-profile

- **Trigger**: dipanggil frontend (`executeFunction`), bukan event.
- **Execute**: authenticated users.
- **Input**: tidak ada. Identitas diambil dari header `x-appwrite-user-id`, jadi userId tidak bisa dipalsukan klien.
- **Output**: `UmkmProfile` (camelCase) — join `users` + `umkm_profiles` + akun Appwrite Auth.
- **Aksi**:
  1. Baca `users` dan `umkm_profiles` lewat `userId`; 404 bila profil UMKM tidak ada.
  2. Tolak 403 bila `users.role !== "umkm"`.
  3. Petakan `ownerName` ← nama akun Auth, `whatsappNumber` ← `users.phone`.
- ⚠️ API key Function wajib punya scope `users.read`. Bila gagal dibaca, `ownerName` jatuh ke `businessName` dan sisa profil tetap dikembalikan.

**Keputusan skema** — `ownerName` dan `whatsappNumber` sengaja TIDAK dijadikan kolom `umkm_profiles`:

| Field | Sumber | Alasan |
| --- | --- | --- |
| `ownerName` | Appwrite Auth `name` | Sudah diisi saat registrasi dan sudah dipakai `create-user-profile` sebagai `displayName` kreator. Kolom baru akan jadi sumber kebenaran kedua yang basi begitu user ganti nama akun. |
| `whatsappNumber` | `users.phone` | Kolom sudah ada dan sudah terisi. MVP memakai satu nomor untuk login dan WhatsApp. |

Kolom `umkm_profiles.whatsappNumber` baru layak ditambahkan kalau nomor WhatsApp bisnis harus berbeda dari nomor login — perubahannya cukup di Function ini.

### get-creator-directory

- **Trigger**: dipanggil frontend (`executeFunction`), bukan event.
- **Execute**: authenticated users.
- **Input**: `{ creatorId?: string, limit?: number }`. Dengan `creatorId` mengembalikan satu objek; tanpa itu mengembalikan array.
- **Output**: `CreatorProfile` / `CreatorProfile[]` — lihat kontrak [08-frontend-data-contract.md §15](../../../../docs/marketiv-md/database/08-frontend-data-contract.md).
- **Aksi**:
  1. Ambil `creator_profiles` dengan `isProfileCompleted = true`, urut `rating` DESC.
  2. Join `creator_social_accounts` → `username` + `engagementRate`. Akun TikTok diprioritaskan (platform MVP), lalu follower terbanyak — supaya kedua field selalu merujuk akun yang sama.
  3. Join `rate_cards` (status `published`) → `rate_card_packages` → `startingPrice` = harga paket termurah. Rate card `draft` tidak boleh bocor ke UMKM.
- `id` pada hasil adalah `creator_profiles.userId`, **bukan** `$id` dokumen. Itu kunci yang dipakai `orders.creatorId`, `rate_cards.creatorId`, dan `wallets.userId`.
- Field sensitif (nomor WhatsApp, saldo, data bank) tidak pernah ikut — §15.

## Aturan Backend

- Setiap user memiliki satu wallet (dibuat oleh modul Payments).
- `isProfileCompleted` dihitung server-side oleh Function `update-profile` (never downgrade) — lihat [30_Business_Rules.md](30_Business_Rules.md).
- Search creator menggunakan query terindeks pada `creator_profiles` (city, rating, totalFollowers) dan `rate_cards` (price) milik modul [RateCards](../RateCards/50_Database.md).
- Data denormalisasi (`totalFollowers`, `totalOrders`, `rating`) diperbarui oleh event dari modul terkait (Orders, Campaigns).

## Cross-Module Dependencies

| Modul | Collection | Digunakan Untuk |
| --- | --- | --- |
| RateCards | `rate_cards` | Filter & sort harga pada search creator |

## Lihat Juga

- [RateCards/50_Database.md](../RateCards/50_Database.md) — skema `rate_cards`.
