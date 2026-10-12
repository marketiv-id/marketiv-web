# Users — API

## Service Layer (Client SDK)

Dipanggil dari frontend Next.js (`src/services/umkm/*`, `src/services/creator/*`, `src/services/shared/*`) via **Appwrite Client SDK** di browser. Semua mengembalikan `ServiceResult<T>`. Function dipanggil lewat `executeFunction(FUNCTION_IDS.*)` (`src/lib/appwrite/functions.ts`); status 400/409/422 dipetakan ke `code: "validation"`.

> `00_BACKEND/src/services/user.service.ts` (`getProfile`, `updateProfile`, `addSocialAccount`, `removeSocialAccount`, `searchCreators`, `uploadFile`, `deleteFile`, `getMyFiles`, `getStorageUsage`) adalah service referensi lama: tidak dipakai frontend, dan `updateProfile`-nya masih menulis `updateDocument` langsung (bukan lewat `update-profile`). Kontrak di bawah adalah yang berjalan.

---

### Profil UMKM

#### `getUmkmProfileFromAppwrite()` — [Appwrite Function `get-umkm-profile`]

Tanpa input. Return `UmkmProfile`:

```json
{
  "id": "userId",
  "businessName": "",
  "ownerName": "nama akun Auth || businessName",
  "email": "",
  "whatsappNumber": "users.phone || auth.phone",
  "location": "umkm_profiles.city",
  "avatarUrl": "umkm_profiles.logoUrl",
  "isVerified": "isProfileCompleted"
}
```

#### `getUmkmSettingsProfileFromAppwrite()` — [Client SDK]

Query langsung `umkm_profiles` + `users` (by `userId`) → `{ docId, userId, businessName, category, description, city, address, tiktok, logoUrl, isProfileCompleted }`.

#### `updateUmkmProfileInAppwrite(input)` — [Appwrite Function `update-profile`]

Field yang dikirim: `businessName`, `category`, `description`, `city`, `address`, `tiktok`, `logoUrl`, `phone`. Lalu membaca ulang profil Settings.

#### `uploadUmkmLogoInAppwrite(file)` — [Client SDK Storage]

Upload ke bucket `logos` (5 MB) → URL publik.

---

### Profil Creator

#### `getCreatorProfileFromAppwrite()` — [Appwrite Function `get-creator-profile`]

Tanpa input (retry sekali setelah 350 ms bila 404/5xx). Return `CreatorProfile`:

```json
{
  "id": "userId",
  "name": "nama akun Auth || displayName",
  "username": "akun sosial utama",
  "avatarUrl": "", "bannerUrl": "",
  "niche": "kuliner|fashion|pariwisata|edukasi|kecantikan|lainnya",
  "bio": "", "location": "city",
  "followers": "totalFollowers",
  "startingPrice": 0,
  "rating": 0, "completedJobs": "totalOrders",
  "engagementRate": 0,
  "instagramUrl": "https://www.instagram.com/<u> | undefined",
  "tiktokUrl": "https://www.tiktok.com/@<u> | undefined",
  "isVerified": "isProfileCompleted",
  "isOnboarded": "isProfileCompleted"
}
```

#### `updateCreatorProfileInAppwrite(input)` — [Appwrite Function `update-profile`]

Field: `displayName`, `bio`, `city`, `avatarUrl`, `bannerUrl`, `niche`. Payload kosong → validation "Tidak ada perubahan untuk disimpan.". Lalu membaca ulang `get-creator-profile`.

#### `uploadCreatorAvatarInAppwrite(file)` / `uploadCreatorBannerInAppwrite(file)` — [Client SDK Storage]

Bucket `avatars` / `creator-banners` (5 MB) → URL publik.

#### `upsertCreatorSocialAccountInAppwrite({ platform: "tiktok", username, followers? })` — [Client SDK]

List `creator_social_accounts` by `creatorId = userId` + `platform`; update bila ada, create bila belum (row perm read any, update/delete owner). `followers` harus bilangan bulat ≥ 0. Tidak ada fungsi hapus akun sosial di frontend.

#### Portfolio — [Client SDK]

- `getCreatorPortfolioFromAppwrite()` — list `creator_portfolios` by `creatorId`.
- `createCreatorPortfolioInAppwrite({ title, portfolioUrl, description?, thumbnailUrl? })`.
- `updateCreatorPortfolioInAppwrite(id, input)`.
- `deleteCreatorPortfolioInAppwrite(id)` — 401/403 → pesan "dibuat sebelum fitur ini aktif".
- `uploadCreatorPortfolioThumbnailInAppwrite(file)` — bucket `portfolios` (50 MB).

---

### Direktori Creator

#### `getCreatorsFromAppwrite(limit = 100, cursor?)` — [Appwrite Function `get-creator-directory`]

Body `{ limit, cursor }`. Return:

```json
{
  "items": [
    {
      "id": "userId", "name": "", "username": "", "avatarUrl": "", "bannerUrl": "",
      "niche": "", "bio": "", "location": "", "startingPrice": 0, "rating": 0,
      "completedJobs": 0, "engagementRate": 0, "isVerified": true
    }
  ],
  "total": 0,
  "nextCursor": "creator_profiles.$id | null"
}
```

#### `getCreatorByIdFromAppwrite(id)` — [Appwrite Function `get-creator-directory`]

Body `{ creatorId }` → satu objek item; 404 → `code: "not_found"`.

> Filter kota / range harga / sort server-side (`searchCreators` di dokumen lama) **belum diimplementasikan** di Function; filter & sort dilakukan di klien (`CreatorDirectoryPage`).

---

### File Manager

#### `uploadUserFileInAppwrite({ file, shareWithOrderId? })` — [Appwrite Function `validate-and-upload`]

Validasi klien: file tidak kosong, ≤ 20 MB. Body: `{ fileName, mimeType, sizeBytes, contentBase64, shareWithOrderId? }`. Return `{ fileId (=$id user_files), fileUrl, fileName }`.

#### `deleteFile` / `getMyFiles` / `getStorageUsage` — belum ada di frontend

Hanya ada di service referensi lama `00_BACKEND/src/services/user.service.ts`. Function `delete-file` tersedia (lihat [70_Backend.md](70_Backend.md)).

---

### Status Akun, Banding, KYC

Belum ada service frontend. `create-appeal` bisa dieksekusi user login; `suspend-user`, `unsuspend-user`, `review-appeal`, `verify-kyc` hanya dengan API key (execute `[]`). Kontrak di [70_Backend.md](70_Backend.md).

---

## Appwrite Functions (Server-side)

Module ini tidak memiliki REST API publik sendiri. Detail Function di [70_Backend.md](70_Backend.md).

---

## Lihat Juga

- [50_Database.md](50_Database.md) — skema & index yang mendukung query ini.
- [30_Business_Rules.md](30_Business_Rules.md) — aturan profil & storage kuota.
