# Users — Business Rules

## Kelengkapan Profil

- Setiap profil memiliki flag `isProfileCompleted`.
- **Flag hanya ditulis server-side** oleh Function `update-profile`. Client tidak boleh mengirim/menulis field ini (whitelist FE & `user.service.updateProfile` tidak menyertakannya).
- **Aturan evaluasi (canonical, source of truth):**
  - **UMKM**: `businessName`, `category`, `city`, `description` ≥ 20 char, `phone` (di `users.phone`). TikTok UMKM opsional — tidak menentukan completion.
  - **Creator**: `displayName`, `niche`, `city`, `bio` ≥ 20 char, TikTok username (di `creator_social_accounts`).
- **Never downgrade**: flag hanya false→true. Profil yang sudah `true` tidak pernah turun walau field diubah jadi kosong.
- Onboarding dan Settings memanggil Function yang sama — aturan completion identik.
- Profil yang belum lengkap dapat memblokir aksi tertentu (mis. claim campaign membutuhkan profil lengkap).

## Atribut Opsional di Onboarding

- Upload logo UMKM bersifat opsional saat onboarding.
- Tambah portfolio Creator bersifat opsional saat onboarding.
- Kedua data tersebut dapat dilengkapi nanti dari halaman profil.

## Data Registrasi dan Onboarding

- **UMKM Register**: hanya menyimpan `email`, `phone`, dan kredensial. `businessName` dan `category` tidak disimpan di Auth prefs.
- **UMKM Onboarding**: menyimpan `businessName`, `category`, dan `city` ke `umkm_profiles`.
- **Kompatibilitas**: data UMKM lama di `umkm_profiles` dipakai sebagai prefill onboarding dan tetap dapat diedit.

## Social Media UMKM

- Social media UMKM bersifat **opsional** karena tidak semua UMKM memiliki akun social media saat mendaftar.
- Untuk MVP, field social media UMKM yang tersedia hanya TikTok.
- Kelengkapan profil UMKM tidak boleh bergantung pada ada/tidaknya akun TikTok.
- Website tidak menjadi field profil UMKM pada MVP.

## Akun Sosial Creator

- Untuk MVP, satu creator hanya dapat memiliki **akun TikTok** pada `creator_social_accounts`.
- Platform selain TikTok (Instagram, Facebook, YouTube, dan lainnya) tidak dapat dipilih atau disimpan pada MVP; platform tersebut masuk future scope.
- Collection tetap menggunakan pola satu akun per platform agar ekspansi multi-platform setelah MVP tetap mudah.
- Tiap akun menyimpan `followers` dan `engagementRate`.

## Data Denormalisasi (disengaja)

Disimpan langsung di `creator_profiles` agar dashboard & browse cepat, walau bisa dihitung dari collection lain:

- `totalFollowers` — agregat followers seluruh akun sosial.
- `totalOrders` — jumlah order selesai.
- `rating` — rating creator.

## Storage Kuota [DORMANT — post-MVP]

- **Infrastruktur ini dormant.** File Manager berbasis `user_files` & `user_storage_usage` tidak diaktifkan di MVP. Semua aset menggunakan external URL (Google Drive). Infrastruktur siap diaktifkan jika feedback demo minggu pertama meminta file manager internal.
- Setiap user memiliki kuota penyimpanan default **100 MB** (104.857.600 bytes) untuk file yang diupload ke Appwrite Storage.
- Kuota dihitung dari total `sizeBytes` seluruh `user_files` berstatus `active`.
- Upload ditolak jika `usedBytes + file.size > quotaBytes`.
- Maks ukuran satu file: **20 MB**.
- Maks jumlah file: **100** file aktif.
- File yang dihapus (soft delete) tidak dihitung dalam kuota dan jumlah file.
- Kuota dapat dinaikkan berdasarkan plan/subscription di masa depan.
- External URL (Google Drive, Dropbox, dll.) tidak terikat kuota — dikelola via modul Campaigns (`campaign_assets.source = external_url`).

## Lihat Juga

- [50_Database.md](50_Database.md) — atribut & index.
- [60_API.md](60_API.md) — operasi profil, pencarian creator, & file manager.

## Status Akun & Banding (Appeals)

- Status akun: `active` (default), `suspended`, `terminated`.
- Akun yang berstatus non-active diblokir dari aksi finansial dan platform (withdrawal, payment baru, offer baru, order baru, claim, submit bukti kerja).
- Guard untuk Claim Campaign dan Submit Bukti Kerja ditangani oleh tim frontend/klien pada sprint T-16 (Client-side / API guards).
- User dapat mengajukan banding dalam waktu 14 hari sejak status akun diubah menjadi suspended/terminated. Jika melewati 14 hari, banding ditolak.
- Akun tetap dalam status suspended/terminated selama proses banding berlangsung. SLA proses banding adalah 7 hari kerja.
- Jika banding disetujui, status dikembalikan menjadi `active`.
- Tidak bisa mengajukan lebih dari satu banding yang sedang diproses.
