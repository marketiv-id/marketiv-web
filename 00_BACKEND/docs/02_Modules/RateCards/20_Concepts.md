# Rate Cards — Concepts

## Istilah

- **Rate Card** — baris `rate_cards` milik Creator yang memegang `status` (`draft|published`). Di UI aktif, satu rate card = satu paket (judul rate card = nama paket).
- **Package** — baris `rate_card_packages` berisi detail layanan: nama, deskripsi, output, durasi (hari), harga, batas revisi.
- **Harga Mulai** (`startingPrice`) — harga paket termurah (> 0) dari rate card `published` milik Creator; dihitung server di `get-creator-directory`/`get-creator-profile`.
- **Paket acuan offer** — `packageId` opsional di offer/order. Harga final tetap `offer.price` hasil negosiasi; `packageNameSnapshot`/`packagePriceSnapshot` hanya provenance.
- **Direct Order** — pemesanan paket tanpa negosiasi; **belum diimplementasikan**.

## Status Rate Card

`draft | published` (string, dijaga kode).

## Konsep

- Hanya Creator yang memiliki rate card (`creatorId` = Auth user ID).
- Maksimal 3 paket per Creator (dihitung dari jumlah baris `rate_cards` milik Creator).
- Setiap paket wajib: name, description, output, deliveryDays, price, revisionLimit.
- `revisionLimit` paket menjadi nilai awal batas revisi; offer membawa `revisionLimit` sendiri yang dipakai order.
- Paket `published` tampil di profil Creator & dihitung untuk harga mulai di direktori.
