# Rate Cards — Frontend

## Halaman Creator

### Paket Harga — `/dashboard/kreator/rate-card`

- `RateCardPageClient` memuat `getCreatorRateCardPackages()` + metrik (`negotiationOrdersCount`) lalu merender `RateCardView`.
- Ringkasan: Paket Aktif, Harga Mulai Dari, Pesanan Jasa Masuk.
- Kartu paket: status, toggle "Tayangkan paket" / "Jadikan draf", Edit, Hapus.
- Tombol tambah paket per slot (mis. "Tambah Paket Gabungan", "Tambah Paket Premium"); setelah 3 paket muncul "Maksimal 3 paket telah tercapai."
- Form paket: nama, output/hasil kerja, deskripsi, durasi (hari), harga, jumlah revisi, toggle aktif. Validasi `rateCardPackageSchema`.
- Dialog hapus "Hapus Paket Jasa?" dengan opsi alternatif menjadikan draft.

## Halaman UMKM

### Direktori Kreator — `/dashboard/umkm/kreator`

- `CreatorDirectoryPage`: data dari `get-creator-directory` (100 kreator), filter & sort di klien.
- Filter: pencarian nama/bio, kategori niche. Sort: Peringkat Tertinggi, Harga Terendah (`startingPrice`), Pesanan Terbanyak, Tingkat Keterlibatan Tertinggi.
- Ringkasan menampilkan harga mulai terendah.
- Filter kota & rentang harga (`minPrice`–`maxPrice`) serta sort harga tertinggi **belum diimplementasikan** di UI aktif.

### Profil Kreator — `/dashboard/umkm/kreator/[id]`

- `CreatorDetailPage` → `RateCardPackagesSection` → `RateCardPackageCard` (paket published dari `getCreatorRateCards`).
- Tombol "Pilih Paket Ini" → `StartNegotiationModal` → `createConversation` → redirect ruang negosiasi `?packageId=`.

### Ruang Negosiasi (prefill offer)

- `NegotiationRoomPage` membaca `?packageId=`, memuat paket published Creator, dan memprefill `SendCustomOfferModal` (harga, ruang lingkup, revisi, deadline). Paket tidak tersedia → peringatan, offer tetap bisa dikirim tanpa paket.

## Komponen

- `RateCardPageClient`, `RateCardView` — kelola paket Creator.
- `CreatorDirectoryPage`, `CreatorToolbar` — direktori UMKM.
- `CreatorDetailPage`, `RateCardPackagesSection`, `RateCardPackageCard`, `StartNegotiationModal` — profil Creator & pilih paket.
- `SendCustomOfferModal` — offer dengan konteks paket (modul Offers).
