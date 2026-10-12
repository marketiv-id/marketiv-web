# Offers — Overview

Custom offer adalah penawaran yang dikirim UMKM di dalam sebuah **conversation** (lihat `../Chat/`) untuk menyepakati detail pekerjaan dengan creator sebelum order dibuat (Rate Card Jalur B).

## Inti

- Hanya **UMKM aktif** pemilik conversation yang dapat mengirim offer (Function `create-offer`).
- Offer berisi kontrak final: `title`, `description`, `price`, `deadline`, `revisionLimit`. Paket rate card (`packageId`) opsional sebagai provenance; harga final tetap `price` offer.
- Satu conversation dapat punya banyak offer berurutan, tetapi hanya satu yang `pending` dan tidak boleh ada deal aktif paralel.
- Creator menerima (`accepted`) atau menolak (`rejected`) dengan update row langsung dari browser.
- UMKM dapat **menarik** offer `pending` (hapus row).
- Update offer memicu `create-order`: `accepted` → order `pending_payment` (jika creator sudah setuju T&C terbaru); `rejected` → notifikasi ke UMKM.

## Alur

```text
UMKM kirim custom offer (create-offer) → offers pending + pesan offer di chat
↓
Creator Accept / Reject (update offers.status)
↓
Event offers.rows.*.update → create-order
  ├─ accepted → order pending_payment + notifikasi UMKM
  └─ rejected → notifikasi UMKM; UMKM boleh menawar ulang
```

## Tautan

- Percakapan tempat offer dibuat → `../Chat/`.
- Order yang terbentuk → `../Orders/`.
- Skema & permission → `50_Database.md`.
- Alur lintas modul → `../../03_Workflows/30_RateCard_Order.md`.
