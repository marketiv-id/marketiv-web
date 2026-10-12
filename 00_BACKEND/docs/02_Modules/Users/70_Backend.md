# Users — Backend

Dokumen ini khusus untuk Appwrite Functions dan aturan backend modul Users. Kontrak pemanggilan dari frontend dibahas di [60_API.md](60_API.md). Konfigurasi dari `appwrite.config.json` (canonical) & `appwrite/function-scopes.json`. Semua Function `node-22`.

## Ringkasan Function

| Function | Trigger | Execute | Scopes | Timeout |
| --- | --- | --- | --- | --- |
| `create-user-profile` | Event `users.*.create` + HTTP klien | `users` | documents.read/write | 15 |
| `update-profile` | HTTP klien (POST) | `users` | documents.read/write | 15 |
| `get-umkm-profile` | HTTP klien (GET/POST) | `users` | documents.read, users.read | 15 |
| `get-creator-profile` | HTTP klien (GET/POST) | `users` | documents.read, users.read | 15 |
| `get-creator-directory` | HTTP klien (GET/POST) | `users` | documents.read | 30 |
| `validate-and-upload` | HTTP klien (POST) | `users` | documents.read/write, files.read/write | 30 |
| `delete-file` | HTTP klien (POST/DELETE) | `users` | documents.read/write, files.read/write | 15 |
| `create-appeal` | HTTP klien | `users` | documents.read/write | 15 |
| `suspend-user` | HTTP server (API key) | `[]` | documents.read/write | 15 |
| `unsuspend-user` | HTTP server (API key) | `[]` | documents.read/write | 15 |
| `review-appeal` | HTTP server (API key) | `[]` | documents.read/write | 15 |
| `verify-kyc` | HTTP server (API key, POST) | `[]` | documents.read/write | 15 |

Identitas user pada Function klien selalu dari header `x-appwrite-user-id` (401 "Unauthorized" bila kosong), kecuali `create-user-profile` yang membaca `$id` dari body/event. Semua Function memakai API key dari header `x-appwrite-key` (fallback `APPWRITE_API_KEY`).

## Appwrite Functions

### create-user-profile

- **Trigger**: event `users.*.create` **dan** eksekusi sinkron dari frontend (`provisionUserProfile()`) setelah `account.updatePrefs()`.
- **Input**: objek user Auth / body `{ $id|id|userId, role?, email, name, phone?, prefs: { role, phone?, displayName?, ... } }`.
- **Validasi**: tanpa id → 400 "Missing user id in event payload"; role (`role || prefs.role || prefs.userRole || labels`) bukan `umkm|creator|admin` → 400 "Missing or invalid user role".
- **Aksi** (semua cek-dulu-baru-tulis via `findByUserId`):
  1. `ensureUserMirror` — buat `users` `{ userId, role, status: "active", email, phone, address ← prefs.address, createdAt, tos_version, tos_accepted_at }` dengan row perm read+update owner. T&C hanya terisi bila payload membawa `tos_version` (atau `tosVersion`, juga di prefs) yang sama dengan `CURRENT_TOS_VERSION`; selain itu `null`. Baris sudah ada → hanya backfill `phone` bila kolom kosong.
  2. `ensureUmkmProfile` (role umkm) — `businessName`, `category`, `city`, `description`, `tiktok`, `logoUrl` dari prefs (alias snake_case diterima), `isProfileCompleted: false`.
  3. `ensureCreatorProfile` (role creator) — `displayName ← prefs.displayName || name`, `bio`, `city`, `avatarUrl` dari prefs, counter 0, `isProfileCompleted: false`.
  4. `ensureStorageUsage` — `{ usedBytes: 0, quotaBytes: 104857600, fileCount: 0 }`, row perm read owner.
  - Profil memakai row perm `read(any)`, `update/delete(user:<userId>)`. Role `admin` hanya mendapat `users` + storage usage.
- **Output**: `{ status: "ok", userId, role }`; error → 500 "Internal server error".
- **Env**: `APPWRITE_DATABASE_ID`/`NEXT_PUBLIC_DB_ID`, `USERS_COLLECTION_ID`, `UMKM_PROFILES_COLLECTION_ID`, `CREATOR_PROFILES_COLLECTION_ID`, `USER_STORAGE_USAGE_COLLECTION_ID`, `CURRENT_TOS_VERSION` (default `v3.1`).
- **Catatan**: eksekusi via event selalu gagal 400 saat register normal (prefs belum ada) — lihat [Authentication/90_Events.md](../Authentication/90_Events.md).

### update-profile

- **Trigger**: dipanggil frontend dari onboarding & Settings — SATU path untuk keduanya. Hanya `POST` (405).
- **Input**: field whitelist per role (`functions/update-profile/src/main.js`):
  - UMKM → `umkm_profiles`: `businessName`, `category`, `city`, `description`, `tiktok`, `logoUrl`; → `users`: `phone`, `address`.
  - Creator → `creator_profiles`: `displayName`, `niche`, `city`, `bio`, `avatarUrl`, `bannerUrl`.
  - Field lain (termasuk `isProfileCompleted`) diabaikan.
- **Aksi**:
  1. Baca `users` by `userId` (404 "Profil pengguna tidak ditemukan."); role selain umkm/creator → 400.
  2. Baca profil role (404 "Profil UMKM/kreator tidak ditemukan.").
  3. Tulis field whitelist; evaluasi memakai hasil `updateDocument` (bukan re-read `listDocuments` yang bisa stale).
  4. Creator: baca `creator_social_accounts` `creatorId = userId`, `platform = tiktok`.
  5. Evaluasi completion (`completion.js`, lihat [30_Business_Rules.md](30_Business_Rules.md)) → `nextProfileCompleted` never downgrade → tulis flag bila berubah. UMKM gagal → log nama field yang gagal.
- **Output UMKM**: `{ success, role: "umkm", isProfileCompleted, businessName, category, city, description, tiktok, logoUrl, address, phone }`.
- **Output Creator**: `{ success, role: "creator", isProfileCompleted, displayName, niche, city, bio, avatarUrl, bannerUrl, tiktokUsername }`.
- **Env**: tambahan `CREATOR_SOCIAL_ACCOUNT_COLLECTION_ID` (nama live) atau `CREATOR_SOCIAL_ACCOUNTS_COLLECTION_ID`.
- **Catatan**: tidak memakai guard status akun — user non-active tetap bisa memperbarui profil.

### get-umkm-profile

- **Input**: tidak ada (identitas dari header).
- **Aksi**: baca paralel `users`, `umkm_profiles`, dan akun Auth (`users.get`, gagal → `null`). Profil UMKM tidak ada → 404 "UMKM profile not found"; mirror ada dengan role ≠ umkm → 403 "User is not an UMKM account".
- **Output**: `{ id, businessName, ownerName, email, whatsappNumber, location, avatarUrl, isVerified }` (lihat [60_API.md](60_API.md)).

**Keputusan skema** — `ownerName` dan `whatsappNumber` sengaja TIDAK dijadikan kolom `umkm_profiles`:

| Field | Sumber | Alasan |
| --- | --- | --- |
| `ownerName` | Appwrite Auth `name` (fallback `businessName`) | Kolom baru akan jadi sumber kebenaran kedua yang basi begitu user ganti nama akun. |
| `whatsappNumber` | `users.phone` (fallback phone akun Auth) | MVP memakai satu nomor untuk login dan WhatsApp. |

### get-creator-profile

- **Input**: tidak ada (identitas dari header; versi pemilik).
- **Aksi**: baca `users`, `creator_profiles`, akun Auth, seluruh `creator_social_accounts` (`creatorId = userId`). Profil tidak ada → 404; role ≠ creator → 403.
  - Akun sosial utama: TikTok diprioritaskan, lalu followers terbanyak (sama dengan direktori).
  - `startingPrice`: paket termurah (`price > 0`) dari `rate_cards` berstatus `published` → `rate_card_packages`.
  - `instagramUrl`/`tiktokUrl` disusun dari username per platform.
- **Output**: lihat [60_API.md](60_API.md). `isVerified` & `isOnboarded` = `isProfileCompleted`.

### get-creator-directory

- **Input**: `{ creatorId?: string, limit?: number, cursor?: string }`. `limit` default 100, di-clamp ke maks 5000, tetapi satu halaman maks 100 dokumen.
- **Aksi**:
  1. Dengan `creatorId`: ambil `creator_profiles` by `userId` (tanpa filter `isProfileCompleted`); tidak ada → 404 "Creator not found".
  2. Tanpa `creatorId`: satu halaman `creator_profiles` `isProfileCompleted = true`, `orderDesc(rating)`, `cursorAfter(cursor)`.
  3. Join `creator_social_accounts` → `username` + `engagementRate` dari akun utama (TikTok dulu, lalu followers terbanyak).
  4. Join `rate_cards` (`status = published`) → `rate_card_packages` → `startingPrice` termurah (`price > 0`). Draft tidak bocor.
  5. `total` = jumlah seluruh profil lengkap (dibaca ulang tiap panggilan, cap 5000); `nextCursor` = `$id` dokumen terakhir bila jumlah item = `limit`.
- **Output**: objek tunggal (dengan `creatorId`) atau `{ items, total, nextCursor }`.
- `id` = `creator_profiles.userId`, bukan `$id` dokumen. Field sensitif (WhatsApp, saldo, bank) tidak pernah ikut.
- `niche` tidak valid → `lainnya`.

### validate-and-upload

- **Input**: `{ fileName, mimeType, sizeBytes, contentBase64, shareWithOrderId? }`. Hanya `POST`.
- **Validasi** (400): field wajib, MIME diizinkan (`image/*`, `video/*`, pdf, msword, OOXML docx/xlsx/pptx), ukuran > 0 dan ≤ 20 MB, panjang buffer = `sizeBytes`.
- **Aksi**:
  1. Baca `user_storage_usage` (404 "Storage usage not found").
  2. `fileCount >= 100` → 409 "Active file limit reached"; `usedBytes + size > quotaBytes` → 409 "Storage quota exceeded".
  3. `shareWithOrderId` → baca `orders`; bila pengunggah = `creatorId` maka bagikan ke `umkmId` (dan sebaliknya). Bukan peserta / order tak terbaca → tidak dibagikan (upload tetap jalan).
  4. Upload ke bucket `DEFAULT_STORAGE_BUCKET_ID` (`user-files`), perm read+delete pemilik (+ read pihak lawan).
  5. Buat `user_files` (`status: active`), perm read pemilik (+ pihak lawan).
  6. Increment `usedBytes` & `fileCount`.
- **Output**: `{ status: "ok", file, storageFile }`.
- **Env**: `DEFAULT_STORAGE_BUCKET_ID` (fallback `NEXT_PUBLIC_STORAGE_BUCKET`), `USER_FILES_COLLECTION_ID`, `USER_STORAGE_USAGE_COLLECTION_ID`, `ORDERS_COLLECTION_ID`/`NEXT_PUBLIC_ORDER_COLLECTION`.

### delete-file

- **Input**: `{ fileId }` (`$id` `user_files`). Method `POST` atau `DELETE`.
- **Aksi**: baca `user_files` (404 "File not found"); bukan milik pemanggil → 403; sudah `deleted` → 200 idempoten. Hapus file Storage (404 diabaikan), soft delete (`status: deleted`, `deletedAt`), decrement usage (min 0).
- **Output**: `{ status: "ok", file }`.
- Belum dipanggil frontend.

### suspend-user

- **Input**: `{ userId, status: "suspended" | "terminated", reason }` (400 bila kurang / status invalid).
- **Aksi**: user tidak ada → 404; status sudah non-active → 409. Set `status` + `suspended_at = now`. Notifikasi `type: system` ("Akun Ditangguhkan"/"Akun Dihentikan") berisi alasan & batas banding 14 hari.
- **Output**: `{ status, deadlineAt, notificationId }`.

### unsuspend-user

- **Input**: `{ userId, note? }`.
- **Aksi**: 404 bila user tidak ada; 409 bila `terminated` ("Cannot unsuspend terminated user directly") atau sudah `active`. Set `status: active` (`suspended_at` tidak dihapus). Notifikasi "Akun Dipulihkan".
- **Output**: `{ status: "active", notificationId }`.

### create-appeal

- **Input**: `{ reason, evidence?, actionRef? }` (400 "Missing reason").
- **Aksi**: user tidak ada → 404; status `active` → 403; `suspended_at` kosong → 400; lewat `suspended_at + 14 hari` → 403 "Batas waktu banding telah berakhir."; sudah ada banding `submitted|under_review` → 409. Buat `appeals` (`status: submitted`, `actionRef` default `"unknown"`, `deadlineAt`, `slaDecidedAt = now + 7 hari`), row perm read+update owner. Notifikasi "Banding Diterima".
- **Output**: `{ appealId, status: "submitted", slaDecidedAt, notificationId }`.

### review-appeal

- **Input**: `{ appealId, decision: "approved" | "rejected", note? }`.
- **Aksi**: appeal tidak ada → 404; sudah `approved/rejected` → 409. Update `status`, `decision = note || ""`, `decidedAt`. `approved` → `users.status = active` bila belum (langsung `updateDocument`, tidak memanggil `unsuspend-user`), notifikasi "Banding Disetujui". `rejected` → notifikasi "Banding Ditolak".
- **Output**: `{ status, notificationId }`.

### verify-kyc

- **Input**: `{ userId }` (400 bila kosong / body kosong / JSON invalid). Hanya `POST`.
- **Aksi**: user tidak ada → 404; sudah `verified` → 200 tanpa mutasi. Set `kyc_status: verified`, `kyc_verified_at`; notifikasi `type: keuangan` "Verifikasi KYC Disetujui".
- **Output**: `{ status: "ok", userId, kyc_status: "verified" }`.

### Notifikasi status akun

Semua notifikasi di atas memakai ID deterministik `ntf` + sha256(`sourceId:kind`)[0..29]; konflik 409 diabaikan (idempoten). `sourceId` = `$id` baris `users` (suspend/unsuspend/KYC) atau `$id` appeal.

## Helper Bersama

- `functions/_shared/require-active-role.js` — `requireActiveRole({ databases, databaseId, usersCollectionId, userId, role, Query, ... })`: 404 bila baris `users` tidak ada, 403 bila `status` terisi dan ≠ `active`, 403 bila `role` ≠ yang diminta. Saat ini dipakai `create-offer` dan `create-conversation`.

## Aturan Backend

- Setiap user memiliki satu wallet (dibuat modul Payments, event `users.*.create`).
- `isProfileCompleted` dihitung server-side oleh `update-profile` (never downgrade).
- Lookup baris identitas selalu `Query.equal("userId", ...)`; dokumen dibuat dengan `ID.unique()`.
- Data denormalisasi (`totalFollowers`, `totalOrders`, `rating`) belum punya penulis setelah pembuatan profil.

## Cross-Module Dependencies

| Modul | Collection | Digunakan Untuk |
| --- | --- | --- |
| RateCards | `rate_cards`, `rate_card_packages` | `startingPrice` di direktori & profil kreator |
| Orders | `orders` | Menentukan pihak lawan saat `shareWithOrderId` |
| Notifications | `notifications` | Notifikasi status akun, banding, KYC |

## Lihat Juga

- [RateCards/50_Database.md](../RateCards/50_Database.md) — skema `rate_cards`.
