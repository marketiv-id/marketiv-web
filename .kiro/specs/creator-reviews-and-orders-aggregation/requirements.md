# 📋 REQUIREMENTS: Creator Reviews & Orders Aggregation

> **Handoff frontend → backend + pemilik produk. Butuh koleksi baru, kolom baru, dan Function baru.**
> **Lokasi**: Marketiv — Appwrite Cloud Functions + skema `appwrite.config.json`
> **Tanggal**: 27 September 2026
> **Prasyarat**: `creator-followers-directory-dto` (field `followers`) sudah ada di rencana redeploy yang sama

---

## 1. Masalah yang diselesaikan

Dua angka di profil kreator saat ini **selalu 0 karena tidak ada yang menghitungnya**:

| Field | Kondisi | Akibat di UI |
|---|---|---|
| `creator_profiles.totalOrders` | Tidak ada `incrementColumn`, tidak ada job agregasi. Hanya diinisialisasi 0 oleh `create-user-profile` | Hero dan kartu kreator menampilkan `—` untuk "Order Selesai" |
| `creator_profiles.rating` | Tidak ada koleksi ulasan sama sekali, jadi tidak ada sumber nilai | Bintang rating disembunyikan (nilai 0 berarti "belum ada data", bukan "jelek") |

Dampak lanjutan yang perlu diketahui pemilik produk:

- `searchCreators` (`00_BACKEND/src/services/user.service.ts:351-361`) sudah punya
  `sortBy: 'rating_desc'` dan `'orders_desc'`, tapi mengurutkan angka yang selalu 0
  sehingga urutannya tidak bermakna.
- Klaim "Rating dari Klien" di dashboard kreator tidak pernah bisa benar tanpa
  sistem ulasan.

Frontend sudah gagal-tertutup: nilai 0 ditampilkan `—`, bintang disembunyikan.
Iterasi ini mengisi datanya, bukan mengubah perilaku UI gagal-tertutup itu.

---

## 2. Fakta teknis (dari audit kode, bukan asumsi)

- Order rate card menjadi `completed` **hanya** di
  `00_BACKEND/functions/release-escrow/src/main.js:237-240` (`updateOrderCompleted`),
  yang dipicu saat deliverable `approved` + validasi `valid`.
- Status order: `pending_payment | escrow | in_progress | revision | approved | completed | cancelled`
  (`00_BACKEND/src/services/order.service.ts:4`).
- Pekerjaan Campaign Mode **tidak masuk `orders`**. Alurnya terpisah:
  `campaign_claims` → `campaign_submissions` (status `approved`). Artinya
  "Order Selesai" saat ini hanya mencakup pekerjaan Rate Card.
- Function `get-umkm-ratecard-reviews` **bukan** sistem ulasan bintang: itu daftar
  pekerjaan milik UMKM sendiri (`Query.equal("umkmId", callerId)`), berisi
  deliverable, validasi, dan riwayat revisi. Tidak ada field rating di sana.
- Data live 27 Sep 2026: 21 baris `creator_profiles`, `rating` dan `totalOrders`
  semuanya 0; `orders` belum dipakai untuk Rate Card (kolom `rate_cards` 5 published).

---

## 3. Requirement

### Req-1 — `Order Selesai` dihitung dari sumber nyata

Sumber tunggal: `orders` dengan `status = "completed"`, dikelompokkan per `creatorId`.

DTO yang mengirim `completedJobs`:

- `get-creator-directory` → `completedJobs`
- `get-creator-profile` → `completedJobs`

Cara menghitung (rekomendasi): **hitung saat baca**, sama seperti pola `followers` di
spec sebelumnya. `listDocuments` sudah mengembalikan `total`, jadi cukup:

```js
const res = await databases.listDocuments(db, "orders", [
  Query.equal("creatorId", creatorId),
  Query.equal("status", "completed"),
  Query.limit(1),          // hanya butuh total, bukan dokumennya
]);
const completedOrders = res.total;
```

Alasan tidak memakai counter + `incrementColumn`:

- `release-escrow` bisa dipanggil ulang (retry/manual) dan **tidak idempoten untuk
  counter**: increment bisa dobel, sedangkan hitung-saat-baca tidak bisa dobel.
- Butuh backfill untuk order lama, jadi tetap perlu jalur hitung sebagai pembanding.
- Volume order per kreator masih kecil; `total` dari query ber-indeks jauh lebih murah
  daripada biaya salah hitung yang tidak terlihat.

Jika nanti volume melampaui batas ini, cache boleh ditambahkan **setelah** ada job
rekonsiliasi yang membandingkan cache dengan hasil hitung.

### Req-2 — Definisi `completedJobs` harus diputuskan (keputusan produk)

Saat ini `completedJobs` hanya berarti "order Rate Card selesai". Pekerjaan Campaign
(tayangan PPV yang di-approve) tidak terhitung. Pilih satu:

- **Opsi A (rekomendasi, paling jujur):** pisahkan metrik.
  `completedOrders` (Rate Card) dan `approvedSubmissions` (Campaign) ditampilkan
  sebagai dua angka terpisah. Tidak ada angka gabungan yang menyesatkan.
- **Opsi B:** definisikan `completedJobs = completedOrders + approvedSubmissions`
  dan ubah label UI menjadi "Pekerjaan Selesai" yang memang berarti gabungan.

Jangan menampilkan satu angka "Order Selesai" yang diam-diam menjumlahkan dua alur
berbeda tanpa menjelaskannya ke UMKM.

### Req-3 — Koleksi ulasan + agregasi rating

Buat koleksi baru `creator_reviews`:

| Kolom | Tipe | Wajib | Catatan |
|---|---|---|---|
| `orderId` | string | ya | satu ulasan per order |
| `creatorId` | string | ya | userId kreator (konvensi `creatorId` di repo) |
| `umkmId` | string | ya | userId UMKM pemberi ulasan |
| `rating` | integer | ya | 1..5 |
| `comment` | string(1000) | tidak | opsional, boleh kosong |
| `$createdAt` | bawaan | ya | dipakai untuk urutan |

Permission:

- Koleksi: `read("any")` (agregat rating dipakai di pasar), `create` **tidak** untuk klien
  (hanya lewat Function) agar validasi tidak bisa dilewati.
- Baris: `read("any")`, `update`/`delete` hanya `user:<umkmId>` (pemberi ulasan).

Agregasi: `creator_profiles.rating` = rata-rata rating (1 desimal) dan kolom baru
`creator_profiles.ratingCount` = jumlah ulasan. Kolom `ratingCount` dibutuhkan karena
**rata-rata tanpa jumlah tidak bisa dibedakan dari "belum ada ulasan"** — persis masalah
0 vs tidak diketahui yang sudah terjadi di `followers`.

### Req-4 — Function `create-review` (satu pintu tulis + agregasi)

Jenis: HTTP Function, `execute: ["users"]`, dipanggil dari halaman UMKM.

Validasi wajib (semua di Function, bukan di klien):

1. Ada `x-appwrite-user-id` (kalau tidak → 401).
2. `orderId` ada di `orders` dan `order.umkmId === callerId` (kalau bukan → 404, jangan 403,
   supaya tidak membocorkan keberadaan order orang lain — pola sama dengan
   `get-umkm-ratecard-reviews`).
3. `order.status === "completed"`.
4. `rating` bilangan bulat 1..5.
5. Belum ada `creator_reviews` dengan `orderId` ini (idempoten: panggilan kedua → 409
   atau kembalikan ulasan yang sudah ada).

Aksi setelah validasi:

1. `createDocument` di `creator_reviews` dengan permission
   `read("any")`, `update/delete` untuk `user:<umkmId>`.
2. Hitung ulang agregat kreator: list `creator_reviews` milik `creatorId`
   (`Query.limit` yang cukup + paginasi bila perlu), lalu tulis
   `rating = round(avg * 10) / 10`, `ratingCount = jumlah`.
3. Kembalikan `{ ok: true, rating, ratingCount }`.

Alasan agregasi ditulis di Function, bukan event listener: satu tempat, teruji,
dan tidak ada dua penulis untuk kolom yang sama. Efek sampingnya, `rating` boleh
diperbaiki (misal ulasan dihapus admin) dengan memanggil ulang jalur agregasi.

### Req-5 — Aturan ulasan (keputusan produk)

- Boleh ulang kapan saja untuk order yang pernah selesai (tanpa batas waktu), supaya
  order lama bisa menambah data historis dan tidak perlu backfill buatan.
- Revisi ulasan diizinkan lewat `update` oleh pemilik ulasan, dan **wajib** memicu
  hitung ulang agregat (Function `update-review` atau `create-review` dengan mode upsert).
- Ulasan tidak boleh dihapus oleh kreator (mereka pihak yang dinilai).

### Req-6 — Tampilan

Tidak ada pekerjaan UI baru yang besar, cukup pakai data yang sudah ada:

- Kartu direktori & hero kreator: angka "Order Selesai" muncul otomatis begitu
  `completedJobs > 0`.
- Bintang rating muncul otomatis begitu `rating > 0`; tambahkan jumlah ulasan
  (`ratingCount`) di hero: `4.8 (12 Ulasan)`. **Baru di titik ini** label "Ulasan"
  boleh dipakai — sebelumnya label itu dihapus karena tidak ada sumbernya.
- Daftar ulasan (komentar) di halaman detail kreator: **belum** di iterasi ini.
  Bila diminta, butuh endpoint pembaca terpisah.

---

## 4. Yang belum diputuskan (butuh jawaban pemilik produk)

1. **Req-2:** Opsi A (dua metrik terpisah) atau Opsi B (satu angka gabungan)?
2. **Req-5:** apakah ulasan boleh diubah, dan siapa yang boleh menghapus (admin saja)?
3. Apakah komentar ulasan ditampilkan ke UMKM lain di masa depan? Menentukan apakah
   `comment` perlu moderasi (fraud/abuse) sebelum dipublikasikan.
4. Apakah `rating` lama (jika ada data historis dari Mock/demo) perlu direset ke 0
   agar tidak ada angka warisan tanpa sumber.
