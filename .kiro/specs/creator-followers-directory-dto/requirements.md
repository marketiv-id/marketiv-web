# 📋 REQUIREMENTS: Creator Followers & Directory DTO

> **Handoff frontend → backend. Butuh redeploy Function, tanpa perubahan skema.**
> **Lokasi**: Marketiv — Next.js (App Router) + Appwrite Cloud Functions
> **Tanggal**: 27 September 2026
> **Konteks**: hasil audit data live + perbaikan tampilan sisi UMKM

---

## 1. Latar belakang

Halaman detail kreator UMKM (`/dashboard/umkm/kreator/[id]`) sebelumnya menampilkan
data karangan: portofolio dan akun sosial di-hardcode di komponen, termasuk angka
follower palsu (`15.4K`, `9.8K`). Itu sudah diperbaiki: frontend sekarang membaca
`creator_portfolios` dan `creator_social_accounts` langsung (keduanya `read("any")`).

Perbaikan itu membuka satu blokir data yang butuh aksi backend:

- **Follower tidak punya jalur tulis sama sekali.** Form kreator hanya menulis
  `creatorId`, `platform`, dan `username` ke `creator_social_accounts`.
  Kolom `followers` dan `engagementRate` ada di skema tapi tidak pernah diisi.
- **`creator_profiles.totalFollowers` selalu 0** dan tidak pernah di-update
  oleh siapa pun (tidak ada `incrementColumn`, tidak ada job agregasi).
- **Direktori kreator tidak menerima follower** karena `get-creator-directory`
  hanya mengirim `username` + `engagementRate` dari akun sosial, tanpa angka follower.

Keputusan produk: **tidak memakai API platform** (TikTok/Instagram) karena biaya dan
persetujuan akses. Angka follower diisi **manual oleh kreator** lewat form profil.

---

## 2. Kondisi data live (diverifikasi 27 Sep 2026)

Query langsung ke Appwrite project (API key CLI, read-only):

| Koleksi | Hasil |
|---|---|
| `creator_profiles` | 21 baris; `rating`, `totalOrders`, `totalFollowers` **semuanya 0** |
| `creator_social_accounts` | 11 baris; **semuanya** `platform = "tiktok"`; `followers` dan `engagementRate` **semuanya 0** |
| `creator_portfolios` | **0 baris** (belum ada kreator mengisi) |
| `rate_cards` / `rate_card_packages` | 5 published / 5 paket |

Baca tanpa sesi (simulasi browser UMKM) berhasil untuk `creator_social_accounts`
(11/11 baris terlihat) dan `creator_portfolios` (HTTP 200), jadi RLS tidak menghalangi.

---

## 3. Requirement

### Req-1 — `get-creator-directory` mengirim angka follower

Function `00_BACKEND/functions/get-creator-directory/src/main.js` sudah membaca
`creator_social_accounts` (untuk `username` dan `engagementRate`) tapi tidak
mengirim `followers`. Tambahkan satu field ke DTO:

- `followers: number` — jumlah follower akun sosial kreator.

Aturan agregasi: **jumlahkan `followers` dari SEMUA akun sosial kreator**
(per `creatorId`), bukan hanya akun primer. Alasannya: `username` dan
`engagementRate` sengaja diambil dari satu akun agar konsisten, sedangkan
follower adalah total audiens lintas platform.

- Berlaku untuk respons daftar (`{ items, total, nextCursor }`) maupun
  respons tunggal (body `{ creatorId }`).
- Nilai `0` berarti belum ada data — **jangan** diisi default karangan.

### Req-2 — `get-creator-profile` menghitung followers dari akun sosial

Function `00_BACKEND/functions/get-creator-profile/src/main.js` saat ini mengirim
`followers: number(creatorProfile.totalFollowers)`, dan kolom itu selalu 0 sehingga
kreator tidak pernah melihat angka yang ia isi sendiri di halaman Pengaturan.

Ganti sumbernya menjadi jumlah `creator_social_accounts.followers` milik kreator
(aturan agregasi sama dengan Req-1).

### Req-3 — Tandai `creator_profiles.totalFollowers` sebagai deprecated

Setelah Req-1 dan Req-2, kolom `totalFollowers` menjadi sumber kedua yang bisa
menyimpang. Rekomendasi: biarkan kolom tetap ada (index `idx_totalFollowers` masih
dipakai untuk sorting internal) tetapi **dokumentasikan sebagai deprecated / cache**,
dan jangan dipakai sebagai sumber angka follower di DTO mana pun.

Alternatif yang juga dapat diterima: isi ulang `totalFollowers` sebagai cache lewat
job agregasi terjadwal. Pilih satu; jangan dua-duanya.

### Req-4 (opsional, di luar scope) — counter `totalOrders` dan `rating`

`creator_profiles.totalOrders` dan `rating` juga tidak pernah di-increment di backend.
Akibatnya `searchCreators` (`sortBy: orders_desc`, `rating_desc`) mengurutkan angka
yang selalu 0, dan halaman UMKM sekarang menampilkan `—` untuk keduanya.

Tidak dikerjakan di iterasi ini. Cukup dicatat: butuh agregasi order selesai, dan
`rating` butuh sistem ulasan yang belum ada (Function `get-umkm-ratecard-reviews`
adalah daftar pekerjaan milik UMKM sendiri, bukan ulasan rating publik).

---

## 4. Yang TIDAK berubah

- Tidak ada perubahan skema, index, atau permission (`creator_social_accounts` dan
  `creator_portfolios` sudah `read("any")` + row permission `read("any")` saat create).
- Tidak ada environment variable baru.
- Tidak ada perubahan pada sisi tulis frontend: `upsertCreatorSocialAccountInAppwrite`
  (`src/services/creator/creator-appwrite.service.ts`) sudah menulis `followers`
  hasil input manual kreator, dan itu tetap berlaku.

---

## 5. Sudah siap di frontend

Sisi klien sudah menerima DTO baru tanpa pekerjaan tambahan:

- `CreatorProfile.followers?: number` — `src/types/umkm-dashboard.types.ts`
- `toCreatorView()` memetakan `followers` → label terformat
  (`formatCompactNumber`), `"—"` bila 0 — `creators/creator.adapter.ts`
- Hero detail kreator memprioritaskan jumlah dari `creator_social_accounts`,
  dan memakai `CreatorProfile.followers` sebagai cadangan
  (`toFollowersLabel(accounts, fallbackFollowers)`)
- Kartu direktori memakai `toCreatorView()` yang sama

Selama Function belum di-redeploy, field `followers` tidak ada di respons dan UI
menampilkan `—` (gagal-tertutup, bukan angka karangan).

---

## 6. Keputusan yang masih terbuka

1. **`engagementRate` manual?** Kolom `creator_social_accounts.engagementRate` juga
   tidak pernah diisi, sehingga kotak "Engagement" di kartu direktori selalu `—`.
   Pilihan: (a) tambah input manual opsional di form kreator seperti followers,
   atau (b) hapus kotak Engagement dari kartu dan bersihkan `engagementRate` dari DTO.
   Rekomendasi: (a) — satu field tambahan di form yang sama, tanpa perubahan backend.
2. **`totalFollowers` deprecated vs cache agregasi** (Req-3): pilih satu sebelum
   implementasi supaya tidak ada dua sumber angka.
