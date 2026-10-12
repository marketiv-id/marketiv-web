# Modul Rate Cards

Creator mempublikasikan paket layanan (maks 3 paket, satu baris `rate_cards` per paket); UMKM melihat paket di profil Creator lalu memulai negosiasi dengan paket sebagai acuan offer. Modul ini memiliki data `rate_cards` dan `rate_card_packages`.

> Pemesanan langsung paket tanpa negosiasi (Direct Order) **belum diimplementasikan**; order selalu lahir dari offer (lihat `../Orders/`).

## Daftar Dokumen

- `10_Overview.md` — Peran rate card, model data 1:1 rate card ↔ paket, alur publish & discovery.
- `20_Concepts.md` — Istilah & konsep domain Rate Cards.
- `30_Business_Rules.md` — Status draft/published, batas 3 paket, field wajib & validasi, hapus, fee.
- `40_User_Flow.md` — Alur kelola paket (Creator) & pilih paket → negosiasi (UMKM).
- `50_Database.md` — Skema, relasi, index, dan permission `rate_cards`, `rate_card_packages`.
- `60_API.md` — Kontrak service frontend rate card & Functions yang membaca rate card.
- `70_Backend.md` — Aturan backend & Functions yang memakai data rate card.
- `80_Frontend.md` — Halaman & komponen rate card (Creator & UMKM).
- `90_Events.md` — Event (tidak ada consumer) & keterkaitan dengan Offers/Orders.
- `100_Testing.md` — Skenario uji CRUD paket, publish, akses, discovery.
