# Users — Concepts

## Istilah

- **Users (mirror)** — record identitas inti: `userId` Auth + role/status, plus `tos_*`, `email_verified_at`, `kyc_*`.
- **UMKM Profile** — profil bisnis UMKM (nama usaha, kategori, kota, deskripsi, TikTok, logo).
- **Creator Profile** — profil Content Creator (display name, niche, bio, kota, avatar, banner, rating, dll).
- **Niche** — spesialisasi kreator: `kuliner | fashion | pariwisata | edukasi | kecantikan | lainnya`.
- **Social Account** — akun media sosial Creator. Untuk MVP hanya **TikTok**; platform lain rencana ekspansi.
- **Portfolio** — portofolio hasil kerja Creator (judul, tautan, deskripsi, thumbnail).
- **Profile Completion** — flag `isProfileCompleted` yang dihitung server-side; never downgrade.
- **Creator Directory** — daftar kreator ber-profil lengkap untuk UMKM, disusun `get-creator-directory` (join akun sosial & harga rate card termurah).
- **Storage Quota** — kuota file per user (`user_storage_usage`) untuk unggahan via `validate-and-upload`.
- **Account Status** — `active | suspended | terminated`.
- **Appeal (Banding)** — permohonan user non-active untuk memulihkan akun, maks 14 hari sejak `suspended_at`.
- **KYC** — verifikasi identitas manual via WhatsApp admin; `kyc_status` `none | pending_wa | verified`.

## Konsep

- Modul Users adalah pemilik seluruh collection identitas non-Auth.
- Satu user memiliki role: `umkm`, `creator`, atau `admin` (admin tidak punya tabel profil).
- Kunci relasi lintas collection adalah `userId` akun Auth — termasuk `creator_social_accounts.creatorId` dan `creator_portfolios.creatorId`. `id` yang dikembalikan Function profil/direktori juga `userId`.
- Profil komposit dibaca lewat Function (identitas dari header `x-appwrite-user-id`), bukan query langsung ke beberapa collection.
- Untuk MVP, Creator hanya menyimpan akun TikTok; struktur tetap extensible.
- Data denormalisasi (`totalFollowers`, `totalOrders`, `rating`) pada `creator_profiles` untuk performa dashboard.
