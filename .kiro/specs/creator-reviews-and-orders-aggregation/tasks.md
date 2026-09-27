# ✅ TASKS: Creator Reviews & Orders Aggregation

> Checklist backend + pemilik produk. Kerjakan bersama spec
> `creator-followers-directory-dto` supaya Function di-redeploy sekali saja.

---

## 0. Keputusan yang harus diambil lebih dulu

- [ ] Req-2: metrik `completedJobs` dipisah (Opsi A) atau digabung (Opsi B)?
- [ ] Req-5: ulasan boleh diubah? siapa yang boleh menghapus?
- [ ] Komentar ulasan akan ditampilkan ke publik (butuh moderasi) atau hanya dipakai
      sebagai agregat rating?
- [ ] Data `rating`/`totalOrders` warisan (kalau ada) direset ke 0?

## 1. Skema

- [ ] Tambah koleksi `creator_reviews` di `appwrite/generate_appwrite_json.cjs`
      (kolom: `orderId`, `creatorId`, `umkmId`, `rating`, `comment`).
- [ ] Index: `idx_orderId` (unique), `idx_creatorId`, `idx_creatorId_createdAt`.
- [ ] Permission koleksi: `read("any")`, tanpa `create` untuk klien.
- [ ] Tambah kolom `creator_profiles.ratingCount` (integer, default 0).
- [ ] `appwrite push` skema, lalu verifikasi lewat console.

## 2. Function `create-review` (baru)

- [ ] Buat `00_BACKEND/functions/create-review/` sesuai struktur Function repo.
- [ ] Validasi: auth → format id → rating 1..5 → kepemilikan order (404 bila bukan
      milik pemanggil) → status `completed` (409) → belum pernah diulas.
- [ ] `createDocument` di `creator_reviews` dengan permission
      `read("any")` + `update`/`delete` untuk `user:<umkmId>`.
- [ ] Agregasi ulang: rata-rata 1 desimal + jumlah, tulis **bersama** ke
      `creator_profiles.rating` dan `ratingCount`.
- [ ] Kalau `creator_profiles` tidak ada, jangan buat dokumen dan tetap balas 200.
- [ ] Daftarkan fungsi di `appwrite.config.json` (`execute: ["users"]`).
- [ ] Idempotensi diuji: dua panggilan dengan `orderId` sama tidak menambah ulasan.

## 3. Function pembaca (update)

- [ ] `get-creator-directory`: `completedJobs` dihitung dari `orders` berstatus
      `completed` (bukan `creator_profiles.totalOrders`); tambah `ratingCount`.
- [ ] `get-creator-profile`: sama, plus `ratingCount`.
- [ ] Putuskan cara hitung (query `total` per kreator atau satu query batch + hitung di
      memori untuk respons daftar) dan tulis alasannya sebagai komentar di kode.

## 4. Deploy

- [ ] `appwrite push` untuk skema (koleksi + kolom).
- [ ] Deploy ulang `get-creator-directory`.
- [ ] Deploy ulang `get-creator-profile`.
- [ ] Deploy `create-review`.
- [ ] Deploy `update-review` / `delete-review` bila Req-5 disetujui.

## 5. Verifikasi backend

- [ ] Kreator dengan order completed → `completedJobs` sesuai jumlah di `orders`.
- [ ] Kreator tanpa order completed → `0`, bukan angka karangan.
- [ ] `create-review` rating 5 → `rating = 5`, `ratingCount = 1`.
- [ ] Ulasan kedua rating 4 (order lain, kreator sama) → `rating = 4.5`, `ratingCount = 2`.
- [ ] Panggilan ulang `orderId` sama → tidak ada dokumen kedua.
- [ ] UMKM lain / tanpa sesi / rating tidak valid → 404 / 401 / 400, tanpa dokumen baru.
- [ ] Order belum `completed` → 409.
- [ ] Regresi: `followers`, `username`, `engagementRate`, `startingPrice`, paginasi utuh.

## 6. Verifikasi UI (butuh satu perubahan kecil frontend)

- [ ] Tambah `ratingCount?: number` di tipe `CreatorProfile` UMKM.
- [ ] Hero menampilkan `4.8 (12 Ulasan)` hanya bila `ratingCount > 0`.
- [ ] Kartu direktori & hero: "Order Selesai" muncul begitu `completedJobs > 0`.
- [ ] Pastikan tampilan `—` tetap berlaku saat 0.
- [ ] Cek `searchCreators` dengan filter urutan rating/order menghasilkan urutan
      yang masuk akal setelah data terisi.

## 7. Tidak dilakukan di iterasi ini

- [ ] Daftar komentar ulasan di halaman detail kreator (butuh endpoint pembaca + UI).
- [ ] Moderasi/abuse handling untuk `comment`.
- [ ] Hitung pekerjaan Campaign (`campaign_submissions` approved) — menunggu jawaban
      Req-2.
