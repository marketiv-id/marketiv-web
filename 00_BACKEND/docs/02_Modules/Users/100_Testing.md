# Users — Testing

## Service Layer (`user.service.ts`)

### Profil

- `getProfile(userId, role)` → return profil sesuai role (umkm/creator).
- `getProfile(userId)` tanpa role → role di-resolve dari user mirror.
- Profil UMKM terbuat dengan data pre-filled dari register.
- Profil Creator terbuat dengan data pre-filled dari register.
- `userId` kosong → throw `UserServiceError('validation', 'User ID wajib diisi.')`.

### Update Profil (`updateProfile`)

- Update field profil → tersimpan dengan benar (hanya field allowed untuk role).
- UMKM: allowed fields `businessName`, `category`, `description`, `city`, `address`, `tiktok`, `logoUrl`.
- Creator: allowed fields `displayName`, `bio`, `city`, `avatarUrl`.
- `isProfileCompleted` TIDAK ada di allow-list — flag hanya ditulis Function `update-profile`.
- Tidak ada field valid → throw `UserServiceError('validation', 'Tidak ada data profil untuk diperbarui.')`.

### Upload File (`uploadFile`)

Catatan: `uploadFile()` memanggil Appwrite Function `validate-and-upload` (bukan langsung ke Storage bucket).

- File valid → Base64 dikirim ke function → return `UserFile` dari response.
- Function gagal (`execution.status === 'failed'`) → throw `UserServiceError('server', 'Upload file gagal.')`.
- Response kosong → throw `UserServiceError('server', 'Response function kosong.')`.
- Response invalid JSON → throw `UserServiceError('server', 'Response function tidak valid.')`.

### Delete File (`deleteFile`)

- `fileId` valid → panggil function `delete-file` → return `UserFile` terupdate status `deleted`.
- `fileId` kosong → throw `UserServiceError('validation', 'File ID wajib diisi.')`.

### Get My Files (`getMyFiles`)

- User login → list file milik sendiri, filter `status` opsional.

### Get Storage Usage (`getStorageUsage`)

- User login → return `{ usedBytes, quotaBytes, fileCount }`.
- Data tidak ada → throw `UserServiceError('not_found', 'Data penggunaan storage tidak ditemukan.')`.

### Onboarding

- UMKM dapat menyelesaikan onboarding tanpa upload logo.
- Creator dapat menyelesaikan onboarding tanpa menambah portfolio.
- Logo UMKM dan portfolio Creator dapat ditambahkan dari halaman profil setelah onboarding.

### Social Accounts (`addSocialAccount`, `removeSocialAccount`)

- Creator menambah akun TikTok → tersimpan (`creator_social_accounts`).
- Creator menambah platform selain `tiktok` → throw `UserServiceError('validation', 'MVP hanya mendukung akun TikTok.')`.
- `username` kosong → throw `UserServiceError('validation', 'Username akun sosial wajib diisi.')`.
- Creator menghapus akun TikTok → terhapus (`deleteDocument`).
- `id` kosong → throw `UserServiceError('validation', 'ID akun sosial wajib diisi.')`.

### Discovery (`searchCreators`)

- Pencarian Creator berdasarkan kota (`city`) → hasil sesuai (`Query.equal('city', ...)`).
- Pencarian Creator berdasarkan range harga (`minPrice`/`maxPrice`) → filter via `rate_card_packages` price, `getCreatorIdsByRateCardPrice()`.
- Sort `rating_desc` / `orders_desc` → urut via `creator_profiles`.
- Sort `price_asc` / `price_desc` → urut via `rate_card_packages` price.
- Hanya creator dengan `isProfileCompleted === true` yang muncul.
- Creator dengan profil tidak lengkap tidak muncul di discovery.
- Data denormalisasi (`totalFollowers`, `totalOrders`, `rating`) akurat setelah event.
