# Modul Offers

Custom offer (Penawaran Khusus) yang dikirim UMKM di dalam ruang negosiasi (conversation) untuk menyepakati judul, lingkup, harga, deadline, dan batas revisi dengan creator. Dibuat lewat Function `create-offer`; creator accept/reject lewat update row; event update offer memicu `create-order`. Modul ini memiliki data `offers`.

## Daftar Dokumen

- `10_Overview.md` — Peran custom offer dalam Rate Card Jalur B.
- `20_Concepts.md` — Istilah: offer, status, tarik offer, deal aktif, provenance paket.
- `30_Business_Rules.md` — Status offer, validasi, guard offer pending & deal aktif, accept → order, stage negosiasi.
- `40_User_Flow.md` — Alur kirim, tarik, terima/tolak offer hingga order.
- `50_Database.md` — Skema, index, dan permission tabel `offers`.
- `60_API.md` — Kontrak Function `create-offer`, aksi Client SDK accept/reject/delete, field offer di DTO negosiasi.
- `70_Backend.md` — `create-offer`, `create-order` (bagian offer), env & aturan backend.
- `80_Frontend.md` — Modal kirim offer, kartu offer, aksi kreator.
- `90_Events.md` — Event update `offers` → `create-order`.
- `100_Testing.md` — Skenario uji create-offer, guard, accept/reject, order creation.
