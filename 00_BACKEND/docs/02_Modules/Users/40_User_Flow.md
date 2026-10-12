# Users — User Flow

## Onboarding UMKM (`/onboarding`, `UmkmOnboarding`)

```text
Register → Verifikasi OTP email
↓
Langkah 1: Nama Usaha, Kategori, Kota
Langkah 2: Deskripsi (≥ 20 karakter)
Langkah 3: Nomor WhatsApp (wajib), Alamat (opsional), TikTok (opsional), Logo (opsional → bucket logos)
↓
update-profile (satu panggilan)
  ├─ umkm_profiles: businessName, category, city, description, tiktok, logoUrl
  └─ users: phone, address
↓
Server evaluasi completion → isProfileCompleted = true bila lolos
↓
Dashboard UMKM
```

## Onboarding Creator (`/onboarding`, `CreatorOnboarding`)

```text
Register → Verifikasi OTP email
↓
Langkah 1: Display Name, Niche, Kota
Langkah 2: Bio (≥ 20 karakter), Avatar (opsional → bucket avatars)
Langkah 3: Akun TikTok (wajib, tautan/username)
↓
upsert creator_social_accounts (platform tiktok)      ← lebih dulu
↓
update-profile (displayName, niche, city, bio, avatarUrl)
↓
Server evaluasi completion (termasuk TikTok) → isProfileCompleted = true bila lolos
↓
Dashboard Creator
```

- Portfolio tidak ada di wizard; ditambahkan dari Settings.
- Wizard bisa dilewati per sesi; `RoleGuard` menawarkan lagi di sesi berikutnya selama flag `false`.

## Settings / Edit Profil

- UMKM (`/dashboard/umkm/pengaturan`): edit field profil + phone/address + logo → `update-profile`.
- Creator (`/dashboard/kreator/settings`; `/dashboard/kreator/profil` redirect ke sini): edit profil, avatar, banner (bucket `creator-banners`), TikTok username & followers, CRUD portfolio + thumbnail (bucket `portfolios`).
- Setelah simpan, frontend membaca ulang DTO (`get-creator-profile` / profil UMKM).

## Upload File (File Manager via Function)

Dipakai saat kreator mengunggah deliverable di ruang negosiasi rate card (`NegosiasiRoomView`).

```text
Pilih file (≤ 20 MB, tipe diizinkan)
↓
uploadUserFile → validate-and-upload (base64, opsional shareWithOrderId)
  ├─ cek kuota (usedBytes + size ≤ quotaBytes) & fileCount < 100
  ├─ simpan ke bucket user-files (read: pemilik + pihak lawan order)
  ├─ catat user_files (status active)
  └─ increment user_storage_usage
↓
fileId (= $id user_files) dipakai deliverables
```

- Hapus file (`delete-file`) dan daftar file/indikator kuota **belum ada di UI frontend**.

## Direktori Creator (UMKM)

```text
UMKM buka /dashboard/umkm/kreator
↓
get-creator-directory { limit, cursor } → { items, total, nextCursor }
↓
Filter & urut di klien: cari nama/bio, niche, sort rating / harga termurah / jobs / engagement
↓
Card Creator (avatar, nama, username, niche, lokasi, rating, startingPrice, engagement)
↓
Klik → /dashboard/umkm/kreator/[id] → get-creator-directory { creatorId } + rate card + portfolio + akun sosial
```

- Filter kota/range harga di server **belum diimplementasikan** (Function tidak menerima parameter filter).

## Status Akun & Banding

```text
Admin (API key) → suspend-user { userId, status: suspended|terminated, reason }
↓ users.status berubah, suspended_at = now, notifikasi account_suspended/terminated (deadline 14 hari)
↓
User → create-appeal { reason, evidence?, actionRef? }   (belum ada UI frontend)
↓ appeal submitted, notifikasi appeal_submitted (SLA 7 hari)
↓
Admin → review-appeal { appealId, decision: approved|rejected, note? }
  ├─ approved → users.status = active, notifikasi "Banding Disetujui"
  └─ rejected → status tetap, notifikasi "Banding Ditolak"

Alternatif admin: unsuspend-user { userId, note? } (hanya dari suspended)
```
