# Users — Database

Modul Users memiliki seluruh collection identitas non-Auth. Inilah satu-satunya lokasi skema untuk collection di bawah. Sumber: `appwrite.config.json` (canonical) & `appwrite/generate_appwrite_json.cjs` (blok "Modul Users"). Semua tabel memakai `rowSecurity: true`.

## Relasi Ringkas

```text
users (1) ──── (1) umkm_profiles            via userId
users (1) ──── (1) creator_profiles         via userId
users (1) ──── (N) creator_social_accounts  via creatorId = users.userId
users (1) ──── (N) creator_portfolios       via creatorId = users.userId
users (1) ──── (1) user_storage_usage       via userId
users (1) ──── (N) user_files               via userId
users (1) ──── (N) appeals                  via userId
```

> Semua kolom `userId`/`creatorId` berisi **`$id` akun Appwrite Auth**, bukan `$id` dokumen. Dokumen dibuat dengan `ID.unique()`, jadi lookup selalu `Query.equal("userId", ...)`.

---

## 1. `users`

Mirror identitas inti. Appwrite Auth menyimpan kredensial; tabel ini menyimpan role, status, T&C, verifikasi email, dan KYC.

### Attributes

| Attribute | Type | Required | Catatan |
| --- | --- | --- | --- |
| `userId` | string(255) | yes | `$id` Appwrite Auth user |
| `role` | string(50) | yes | `umkm` \| `creator` \| `admin` (validasi di `create-user-profile`, bukan enum DB) |
| `status` | enum | yes | `active` \| `suspended` \| `terminated`; dibuat `active` |
| `address` | string(500) | no | Alamat UMKM; ditulis `update-profile` |
| `email` | string(255) | yes | Dari akun Auth |
| `phone` | string(50) | no | Nomor WhatsApp; wajib di register UMKM (validasi aplikatif) |
| `createdAt` | datetime | no | Diisi `create-user-profile` |
| `suspended_at` | datetime | no | Diisi `suspend-user`; tidak dihapus saat unsuspend/banding disetujui |
| `tos_version` | string(20) | no | Versi T&C yang disetujui (lihat `accept-tos`) |
| `tos_accepted_at` | datetime | no | Waktu persetujuan T&C |
| `email_verified_at` | datetime | no | Diisi `user-email-verified` |
| `kyc_status` | enum | no | `none` \| `pending_wa` \| `verified` |
| `kyc_verified_at` | datetime | no | Diisi `verify-kyc` |

### Index

```text
idx_userId  unique (userId)
idx_email   unique (email)
idx_role    key    (role)
idx_status  key    (status)
```

### Permission

```text
Collection: []  (tanpa izin level koleksi)
Row (create-user-profile): read + update → user:<userId>
Server (API key Function): read/write
```

---

## 2. `umkm_profiles`

Relasi: `users` 1 ── 1 `umkm_profiles`.

### Attributes

| Attribute | Type | Required | Default | Catatan |
| --- | --- | --- | --- | --- |
| `userId` | string(255) | yes | — | |
| `businessName` | string(255) | yes | — | Dibuat `""`, diisi onboarding |
| `category` | string(100) | yes | — | Dibuat `""`, diisi onboarding |
| `description` | string(2000) | no | — | |
| `city` | string(100) | no | — | |
| `tiktok` | string(255) | no | — | Opsional, tidak menentukan completion |
| `logoUrl` | string(2048) | no | — | URL file di bucket `logos` |
| `isProfileCompleted` | boolean | no | `false` | Hanya ditulis Function `update-profile` |

- Tidak ada kolom `address` maupun `phone` di sini — keduanya di `users`.
- Website tidak menjadi field profil UMKM pada MVP.

### Index

```text
idx_userId              unique (userId)
idx_city                key    (city)
idx_category            key    (category)
idx_isProfileCompleted  key    (isProfileCompleted)
```

### Permission

```text
Collection: read("any"), create("users")
Row (create-user-profile): read any, update + delete → user:<userId>
```

---

## 3. `creator_profiles`

Relasi: `users` 1 ── 1 `creator_profiles`.

### Attributes

| Attribute | Type | Required | Default | Catatan |
| --- | --- | --- | --- | --- |
| `userId` | string(255) | yes | — | |
| `displayName` | string(255) | yes | — | Dari `prefs.displayName` / nama akun Auth |
| `bio` | string(2000) | no | — | |
| `city` | string(100) | no | — | |
| `avatarUrl` | string(2048) | no | — | Bucket `avatars` |
| `bannerUrl` | string(2048) | no | — | Bucket `creator-banners` |
| `niche` | enum | no | — | `kuliner` \| `fashion` \| `pariwisata` \| `edukasi` \| `kecantikan` \| `lainnya` |
| `totalFollowers` | integer | no | `0` | Denormalisasi |
| `totalOrders` | integer | no | `0` | Denormalisasi |
| `rating` | double | no | `0` | Denormalisasi |
| `isProfileCompleted` | boolean | no | `false` | Hanya ditulis Function `update-profile` |

`niche` kosong/tidak valid dibaca sebagai `lainnya` oleh `get-creator-directory` dan `get-creator-profile`. `campaigns.category` menggambarkan kategori usaha UMKM, bukan spesialisasi kreator, jadi tidak dipakai menurunkan `niche`.

### Index

```text
idx_userId              unique (userId)
idx_displayName         key    (displayName)
idx_city                key    (city)
idx_niche               key    (niche)
idx_rating              key    (rating)
idx_totalFollowers      key    (totalFollowers)
idx_isProfileCompleted  key    (isProfileCompleted)
```

### Permission

```text
Collection: read("any"), create("users")
Row (create-user-profile): read any, update + delete → user:<userId>
```

---

## 4. `creator_social_accounts`

Relasi: `users` (creator) 1 ── N `creator_social_accounts`. Untuk MVP hanya akun TikTok yang ditulis frontend. Struktur N dipertahankan untuk ekspansi platform lain.

### Attributes

| Attribute | Type | Required | Default | Catatan |
| --- | --- | --- | --- | --- |
| `creatorId` | string(255) | yes | — | `userId` kreator (bukan `$id` `creator_profiles`) |
| `platform` | string(50) | yes | — | MVP: `tiktok` |
| `username` | string(255) | yes | — | |
| `followers` | integer | no | `0` | Input manual kreator |
| `engagementRate` | double | no | `0` | Belum ada jalur tulis di frontend |

Tidak ada unique index `(creatorId, platform)`; frontend melakukan list-dulu-lalu-upsert.

### Index

```text
idx_creatorId  key (creatorId)
idx_platform   key (platform)
idx_followers  key (followers)
```

### Permission

```text
Collection: read("any"), create("users")
Row (dipasang klien): read any, update + delete → user:<creatorId>
```

---

## 5. `creator_portfolios`

Relasi: `users` (creator) 1 ── N `creator_portfolios`. Opsional; dikelola dari halaman Settings kreator.

### Attributes

| Attribute | Type | Required | Catatan |
| --- | --- | --- | --- |
| `creatorId` | string(255) | yes | `userId` kreator |
| `title` | string(255) | yes | |
| `description` | string(2000) | no | |
| `thumbnailUrl` | string(2048) | no | Bucket `portfolios` |
| `portfolioUrl` | string(2048) | no | Wajib di form frontend |

### Index

```text
idx_creatorId key (creatorId)
```

### Permission

```text
Collection: read("any"), create("users")
Row (dipasang klien): read any, update + delete → user:<creatorId>
```

---

## 6. `user_storage_usage`

Relasi: `users` 1 ── 1 `user_storage_usage`. **Aktif** — kuota per-user ditegakkan `validate-and-upload`.

### Attributes

| Attribute | Type | Required | Default | Catatan |
| --- | --- | --- | --- | --- |
| `userId` | string(255) | yes | — | |
| `usedBytes` | integer | no | `0` | Total ukuran file aktif |
| `quotaBytes` | integer | no | `104857600` | 100 MB |
| `fileCount` | integer | no | `0` | Jumlah file aktif |

### Index

```text
idx_userId unique (userId)
```

### Permission

```text
Collection: []
Row (create-user-profile): read → user:<userId>
Write: hanya Function (API key)
```

---

## 7. `user_files`

Metadata setiap file yang diupload lewat `validate-and-upload` ke bucket `user-files`. Relasi: `users` 1 ── N `user_files`. **Aktif** — dipakai deliverable rate card (`deliverables.fileId` menyimpan `$id` baris ini).

### Attributes

| Attribute | Type | Required | Catatan |
| --- | --- | --- | --- |
| `userId` | string(255) | yes | Pengunggah |
| `storageFileId` | string(255) | yes | Appwrite Storage file ID |
| `bucketId` | string(255) | yes | `DEFAULT_STORAGE_BUCKET_ID` (`user-files`) |
| `fileName` | string(255) | yes | |
| `mimeType` | string(100) | yes | |
| `sizeBytes` | integer | yes | |
| `status` | string(50) | yes | `active` \| `deleted` (bukan enum DB) |
| `createdAt` | datetime | no | |
| `deletedAt` | datetime | no | `null` jika aktif |

### Index

```text
idx_userId_status       key    (userId ASC, status ASC)
idx_storageFileId       unique (storageFileId)
idx_status_createdAt    key    (status ASC, createdAt DESC)
```

### Permission

```text
Collection: []
Row (validate-and-upload): read → user:<userId> (+ pihak lawan order bila shareWithOrderId valid)
Write: hanya Function (API key)
```

---

## 8. `appeals`

Banding akun yang `suspended`/`terminated`.

### Attributes

| Attribute | Type | Required | Catatan |
| --- | --- | --- | --- |
| `userId` | string(255) | yes | Pemohon |
| `actionRef` | string(255) | yes | Referensi tindakan; default `"unknown"` |
| `reason` | string(1000) | yes | |
| `evidence` | string(2048) | no | |
| `deadlineAt` | datetime | yes | `suspended_at + 14 hari` |
| `slaDecidedAt` | datetime | yes | `waktu pengajuan + 7 hari` |
| `status` | enum | yes | `submitted` \| `under_review` \| `approved` \| `rejected` |
| `decision` | string(1000) | no | Catatan reviewer (`note`) |
| `decidedAt` | datetime | no | |

`under_review` ada di enum tetapi belum ada Function yang menulisnya.

### Index

```text
idx_userId         key (userId)
idx_status         key (status)
idx_userId_status  key (userId, status)
```

### Permission

```text
Collection: create("users")
Row (create-appeal): read + update → user:<userId>
```

---

## 9. `otp_rate_limits`

Rate limit permintaan OTP reset password (`request-password-otp`, modul [Authentication](../Authentication/70_Backend.md)). Didefinisikan di blok Modul Users pada generator.

### Attributes

| Attribute | Type | Required | Catatan |
| --- | --- | --- | --- |
| `key` | string(64) | yes | sha256(`email|ip`) 36 karakter; sama dengan `$id` dokumen |
| `email` | string(255) | yes | Email ternormalisasi |
| `ip` | string(100) | yes | |
| `count` | integer | yes | Permintaan dalam jendela aktif |
| `windowStart` | datetime | yes | Awal jendela 10 menit |
| `updatedAt` | datetime | yes | |

### Index

```text
idx_key        unique (key)
idx_email      key    (email)
idx_ip         key    (ip)
idx_updatedAt  key    (updatedAt)
```

### Permission

```text
Collection: []  — hanya Function (API key)
```

---

## Storage Buckets Terkait

| Bucket | Permission | `fileSecurity` | Maks ukuran | Ekstensi | Dipakai untuk |
| --- | --- | --- | --- | --- | --- |
| `avatars` | read any; create/update/delete users | false | 5 MB | jpg, jpeg, png, webp | `creator_profiles.avatarUrl` |
| `creator-banners` | read any; create/update/delete users | false | 5 MB | jpg, jpeg, png, webp | `creator_profiles.bannerUrl` |
| `logos` | read any; create/update/delete users | false | 5 MB | jpg, jpeg, png, webp, svg | `umkm_profiles.logoUrl` |
| `portfolios` | read any; create/update/delete users | false | 50 MB | jpg, jpeg, png, webp, pdf, mp4 | `creator_portfolios.thumbnailUrl` |
| `user-files` | create users | true | 20 MB (20971520) | jpg, jpeg, png, webp, gif, svg, pdf, doc, docx, xls, xlsx, ppt, pptx, mp4, mov, avi | `user_files` via `validate-and-upload` |

Bucket publik (`avatars`, `creator-banners`, `logos`, `portfolios`) diunggah langsung dari klien (`uploadPublicFile`, `src/lib/appwrite/storage.ts`) dan tidak dihitung ke kuota `user_storage_usage`.

---

## Lihat Juga

- [30_Business_Rules.md](30_Business_Rules.md) — aturan kelengkapan profil, denormalisasi, storage kuota, status akun.
- [60_API.md](60_API.md) — operasi terhadap collection ini.
