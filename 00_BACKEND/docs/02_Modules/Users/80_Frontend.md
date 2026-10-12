# Users — Frontend

## Halaman

### Onboarding (`/onboarding`)

- `OnboardingPage` memilih `UmkmOnboarding` atau `CreatorOnboarding` sesuai role sesi.
- UMKM (3 langkah): Nama Usaha, Kategori, Kota → Deskripsi (≥ 20) → Nomor WhatsApp (wajib), Alamat, TikTok, Logo (opsional).
- Creator (3 langkah): Display Name, Niche, Kota → Bio (≥ 20), Avatar (opsional) → TikTok (wajib).
- Tidak ada langkah portfolio maupun upload wajib.

### Pengaturan UMKM (`/dashboard/umkm/pengaturan`, `PengaturanClient`)

- Edit nama usaha, kategori, deskripsi, kota, alamat, TikTok (opsional), logo, nomor WhatsApp (via `update-profile`). Email hanya tampil.
- Tidak ada field website pada MVP.

### Pengaturan Creator (`/dashboard/kreator/settings`, `SettingsView`)

- Edit display name, niche, kota, bio, avatar, banner (via `update-profile`).
- TikTok (tautan/username) + jumlah followers (upsert `creator_social_accounts`).
- CRUD portfolio (title, portfolioUrl https wajib, description, thumbnail ke bucket `portfolios`).
- `/dashboard/kreator/profil` redirect ke halaman ini.

### Direktori Creator (`/dashboard/umkm/kreator`, `CreatorDirectoryPage`)

- Grid card Creator dari `get-creator-directory`.
- Search (nama/bio), filter niche, sort: rating, harga termurah, jumlah job, engagement — semuanya di klien.
- Filter kota & range harga belum ada.

### Detail Creator (`/dashboard/umkm/kreator/[id]`, `CreatorDetailPage`)

- Hero profil, statistik, akun sosial, portfolio, paket rate card (dari modul RateCards).

### Upload Deliverable (ruang negosiasi kreator, `NegosiasiRoomView`)

- Unggah file via `uploadUserFile` → `validate-and-upload` dengan `shareWithOrderId`.

### Belum Ada di Frontend

- File Manager (daftar file, indikator kuota, hapus file).
- Pengajuan banding (`create-appeal`) dan status banding.
- UI admin suspend/unsuspend/review banding/verify KYC (dipanggil dari aplikasi admin eksternal dengan API key, bukan dari repo ini).

## Komponen

- `UmkmOnboarding`, `CreatorOnboarding`, `OnboardingShell` — wizard onboarding.
- `PengaturanClient` — settings UMKM.
- `SettingsPageClient`, `SettingsView` — settings & portfolio Creator.
- `CreatorDirectoryPage`, `CreatorCard`, `CreatorToolbar`, `CreatorSummaryCards` — direktori.
- `CreatorDetailPage`, `CreatorProfileHero`, `CreatorSocialLinksCard`, `CreatorPortfolioSection`, `RateCardPackagesSection` — detail creator.
- `RoleGuard` — redirect ke `/onboarding` bila `isProfileCompleted === false` (kecuali dilewati di sesi ini).
