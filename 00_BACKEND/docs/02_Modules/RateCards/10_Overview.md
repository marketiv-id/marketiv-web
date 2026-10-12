# Rate Cards — Overview

Rate card adalah etalase layanan Creator. Di aplikasi saat ini Creator mengelola **paket** (maks 3, mis. dasar/gabungan/premium); setiap paket disimpan sebagai **satu baris `rate_cards` (parent, membawa status) + satu baris `rate_card_packages` (detail)**.

## Alur

1. **Kelola Paket** — Creator membuat paket (`/dashboard/kreator/rate-card`), langsung `published` atau `draft` sesuai toggle.
2. **Publish/Draft** — Toggle per paket mengubah `rate_cards.status`. Hanya `published` yang tampil ke UMKM.
3. **Discovery** — UMKM membuka direktori Creator (`get-creator-directory`); harga mulai = paket `published` termurah. Filter/sort dilakukan di klien (lihat `80_Frontend.md`).
4. **Pilih Paket** — Di profil Creator, "Pilih Paket Ini" membuka ruang negosiasi dengan `?packageId=`. UMKM mengirim offer yang membawa `packageId` sebagai provenance → Creator accept → order (modul Orders/Offers).

## Aktor

- **Content Creator** — pemilik & pengelola paket.
- **UMKM** — membaca paket published dan memakainya sebagai acuan offer.

## Koleksi yang Dimiliki

`rate_cards`, `rate_card_packages`. Skema di `50_Database.md`.

## Ketergantungan

- `create-offer` memvalidasi `packageId` (paket ada, milik Creator lawan bicara, parent `published`) — `../Offers/`.
- Order menyimpan `packageId` + snapshot nama/harga — `../Orders/50_Database.md`.
- Discovery & profil Creator (`get-creator-directory`, `get-creator-profile`) — `../Users/`.

> Direct Order (pesan paket tanpa offer) **belum diimplementasikan**.
