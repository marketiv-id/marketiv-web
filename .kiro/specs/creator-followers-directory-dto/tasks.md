# ✅ TASKS: Creator Followers & Directory DTO

> Checklist untuk tim backend. Semua item bersifat additive — tidak ada perubahan
> skema/permission/env. Frontend sudah siap menerima hasilnya.

---

## 1. Perubahan Function `get-creator-directory`

- [ ] Tambah helper `resolveFollowerTotals(databases, env, creatorIds)` yang
      menjumlahkan `creator_social_accounts.followers` per `creatorId`
      (pakai `listByIds`, bukan `listDocuments` langsung).
- [ ] Sisipkan helper itu ke `Promise.all` yang sudah ada bersama
      `resolvePrimarySocialAccounts()` dan `resolveStartingPrices()`.
- [ ] Tambah `followers: <total> ?? 0` ke objek DTO di dalam `profiles.map(...)`.
- [ ] Pastikan respons tunggal (`body.creatorId`) dan respons daftar
      (`{ items, total, nextCursor }`) dua-duanya membawa `followers`.
- [ ] Jangan mengubah pemilihan akun primer untuk `username` + `engagementRate`.

## 2. Perubahan Function `get-creator-profile`

- [ ] Ganti `followers: number(creatorProfile.totalFollowers)` menjadi jumlah
      `followers` dari `socialAccounts` yang sudah dimuat Function tersebut.
- [ ] Hapus ketergantungan pada `creatorProfile.totalFollowers` di DTO ini.

## 3. Deploy

- [ ] `git pull` branch `staging` (frontend sudah push; spec ini ikut di dalamnya).
- [ ] Deploy ulang Function `get-creator-directory`.
- [ ] Deploy ulang Function `get-creator-profile`.
- [ ] Konfirmasi tidak ada error di log eksekusi pertama kedua Function.
- [ ] Tidak ada deploy lain yang diperlukan (skema, permission, env: tidak berubah).

## 4. Verifikasi pasca-deploy

- [ ] `get-creator-directory` body `{}` → setiap item punya `followers` (number).
- [ ] `get-creator-directory` body `{ creatorId }` → `followers` = jumlah akun
      sosial kreator tersebut.
- [ ] `get-creator-profile` sebagai kreator yang pernah mengisi followers →
      angkanya muncul (sebelumnya selalu 0).
- [ ] Regresi: `username`, `engagementRate`, `startingPrice`, `total`,
      `nextCursor` tidak berubah nilainya.
- [ ] Kreator tanpa data sosial tetap mengembalikan `0` (bukan angka karangan).

## 5. Verifikasi end-to-end di UI (tanpa perubahan kode frontend)

- [ ] `/dashboard/umkm/kreator` → kartu menampilkan follower ringkas (mis. `15,4 rb`).
- [ ] `/dashboard/umkm/kreator/[id]` → hero menampilkan angka yang sama.
- [ ] Kreator tanpa data → `—`.
- [ ] `/dashboard/kreator/pengaturan` → baris "Total Followers Gabungan"
      menampilkan angka hasil input manual kreator.

## 6. Setelah deploy (opsional, iterasi berikutnya)

- [ ] Putuskan `creator_profiles.totalFollowers`: deprecated atau cache agregasi
      terjadwal (jangan dua-duanya).
- [ ] Putuskan `engagementRate`: input manual opsional, atau hapus dari DTO + UI.
- [ ] `totalOrders` dan `rating` belum pernah di-increment — butuh agregasi
      order selesai dan sistem ulasan (terpisah dari Function
      `get-umkm-ratecard-reviews` yang berisi pekerjaan UMKM sendiri).
