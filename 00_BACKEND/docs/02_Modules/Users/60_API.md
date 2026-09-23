# Users — API

## Service Layer (Client SDK)

Fungsi-fungsi berikut dipanggil langsung dari frontend Next.js via **Appwrite Client SDK (Database, Storage)**. Berjalan di browser user.

---

### `getProfile(userId)` — [Client SDK]

Mengembalikan profil sesuai role (umkm/creator).

### `updateProfile()` — via Function `update-profile`

Memperbarui field profil (deskripsi, kota, logo/avatar, phone UMKM, dll.) lewat Function `update-profile`, bukan `updateDocument` langsung. Flag `isProfileCompleted` dihitung server-side (lihat [30_Business_Rules.md](30_Business_Rules.md)). Onboarding dan Settings memanggil path yang sama.

---

### `addSocialAccount()` — [Client SDK]

### `removeSocialAccount()` — [Client SDK]

Mengelola entri `creator_social_accounts`. Pada MVP hanya `platform = "tiktok"` yang boleh dibuat; platform lain ditolak sampai fase ekspansi multi-platform.

---

### `searchCreators(filter)` — [Client SDK]

```typescript
type SearchFilter = {
  city?: string;
  minPrice?: number;
  maxPrice?: number;
  sortBy?: 'price_asc' | 'price_desc' | 'rating_desc' | 'orders_desc';
};
```

Contoh:

```json
{
  "city": "sukabumi",
  "sortBy": "rating_desc"
}
```

Memakai index pada `creator_profiles` (city, rating, totalFollowers) dan `rate_card_packages` (price). Filter platform tidak diperlukan karena MVP hanya TikTok.

⚠️ Untuk daftar/detail kreator yang butuh `username`, `engagementRate`, dan `startingPrice`, gunakan Function `get-creator-directory` — bukan query Client SDK. Ketiga field itu berada di `creator_social_accounts` dan `rate_cards` → `rate_card_packages`, sehingga tidak bisa dipetakan setia dari satu collection. Lihat [70_Backend.md](70_Backend.md).

---

### `uploadFile()` — [Client SDK] ⚠️ DORMANT

- **Infrastruktur dormant — tidak aktif di MVP.** Semua aset pakai external URL. Diaktifkan jika feedback demo minggu pertama meminta file manager internal.
- **Input**: `{ file }`
- **Proses**: validasi kuota → upload ke Appwrite Storage → catat metadata ke `user_files` → update `user_storage_usage`.
- **Validasi**:
  - `usedBytes + file.size ≤ quotaBytes`.
  - Maks ukuran satu file: 20 MB.
  - Maks jumlah file: 100.
  - File type allowed: `image/*`, `video/*`, `application/pdf`, `application/msword`, `application/vnd.openxmlformats-officedocument.*`.
- **Akses**: Authenticated user (owner).

### `deleteFile()` — [Client SDK] ⚠️ DORMANT

- **Input**: `{ fileId }`
- **Proses**: validasi kepemilikan → hapus dari Appwrite Storage → soft delete metadata `user_files` (`status = deleted`, set `deletedAt`) → update `user_storage_usage`.
- **Akses**: Authenticated user (owner).

### `getMyFiles(filter)` — [Client SDK] ⚠️ DORMANT

- **Input**: `{ status? }`
- **Proses**: list file milik user.
- **Akses**: Authenticated user (owner).

### `getStorageUsage()` — [Client SDK] ⚠️ DORMANT

- **Proses**: return `{ usedBytes, quotaBytes, fileCount }` untuk user.
- **Akses**: Authenticated user (owner).

---

## Appwrite Functions (Server-side)

Module ini tidak memiliki REST API publik sendiri. Operasi server-side yang diperlukan module Users dijalankan lewat Appwrite Functions dan didokumentasikan di [70_Backend.md](70_Backend.md).

---

## Lihat Juga

- [50_Database.md](50_Database.md) — skema & index yang mendukung query ini.
- [30_Business_Rules.md](30_Business_Rules.md) — aturan profil & storage kuota.
