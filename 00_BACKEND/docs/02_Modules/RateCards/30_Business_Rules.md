# Rate Cards — Business Rules

## 1. Model Data

1. Satu paket UI = satu baris `rate_cards` (parent) + satu baris `rate_card_packages` (child). Parent menyimpan `status`; `title` = nama paket, `description` = deskripsi paket.
2. Update paket **tidak pernah** delete-recreate — baris child di-update in place agar `orders.packageId`/`offers.packageId` tetap valid.
3. Bila create child gagal, parent yang baru dibuat dihapus (tidak ada rate card tanpa paket).

## 2. Status Rate Card

`draft | published`

- Status dipilih saat membuat paket (toggle "aktif") dan dapat diubah kapan saja lewat toggle publish/draft per paket.
- Tidak ada syarat tambahan untuk publish selain paket valid (setiap rate card selalu punya tepat satu paket).
- `draft` **tidak tampil** ke UMKM: tidak ikut `getCreatorRateCards`, tidak dihitung harga mulai, dan ditolak `create-offer` sebagai paket acuan (422).
- `published` tampil di profil Creator & dihitung harga mulai direktori.
- Paket published tetap bisa diedit; perubahan tidak memengaruhi offer/order yang sudah ada (offer/order menyimpan harga & snapshot sendiri).
- Tidak ada auto-publish.

## 3. Batas Paket

- Maksimal **3** rate card/paket per Creator. Create ditolak bila jumlah `rate_cards` milik Creator ≥ 3 ("Maksimal 3 paket. Hapus satu paket dulu."). Batas dijaga service frontend, bukan server.

## 4. Field Wajib & Validasi Paket

Validasi klien (`src/lib/validations/rate-card.schema.ts`):

| Field | Aturan |
| --- | --- |
| `name` | wajib, ≤ 100 karakter |
| `description` | wajib, ≤ 2000 karakter |
| `output` | wajib, ≤ 2000 karakter (hasil kerja yang didapat UMKM) |
| `deliveryDays` | integer ≥ 1 |
| `price` | integer > 0 dan ≥ Rp1.000 |
| `revisionLimit` | integer ≥ 0 |

Constraint skema: integer 0–999.999.999 untuk `deliveryDays`, `price`, `revisionLimit`. Tidak ada validasi server-side tambahan (CRUD langsung Client SDK).

## 5. Kepemilikan & Akses

- Baris dibuat dengan permission `read("any")`, `update("user:<creatorId>")`, `delete("user:<creatorId>")`.
- Service memastikan rate card milik caller (`Query.equal("creatorId", uid)`) sebelum update/status/hapus.
- UMKM hanya membaca paket `published` (perlu sesi login di service frontend).

## 6. Hapus Paket

- Boleh untuk status apa pun (draft maupun published).
- Ditolak bila ada order dengan `packageId` paket ini berstatus `pending_payment|escrow|in_progress|revision|approved` → saran "Jadikan Draft saja".
- Urutan hapus: package lalu rate card.
- Baris lama tanpa permission `delete` → 401/403 → pesan "tidak bisa dihapus... Jadikan Draft saja".

## 7. Paket sebagai Acuan Offer

- `create-offer` menerima `packageId` opsional; valid hanya bila paket ada, parent `rate_cards.creatorId` = Creator lawan bicara, dan parent `published` (else 422).
- Offer menyimpan `packageId`, `packageNameSnapshot`, `packagePriceSnapshot`; `price`, `revisionLimit`, `deadline` tetap milik offer (diprefill dari paket di UI, dapat diubah UMKM).
- Order mewarisi `packageId` + snapshot; `amount = offer.price`.

## 8. Platform Fee (seller-side, ADR-008)

```text
UMKM bayar: order.amount (= harga final offer)
fee        = floor(escrow.amount × escrow.fee_rate)
Creator    = escrow.amount − fee
```

- `fee_rate` di-snapshot ke escrow saat `create-escrow` dari env `FEE_RATE` (default `0.02`); escrow tanpa snapshot memakai `0.02`.
- UMKM tidak membayar biaya tambahan.
- Fee dicatat sebagai transaksi `fee` di ledger. Detail → `../Payments/30_Business_Rules.md`.
- Creator perlu memperhitungkan fee saat menentukan harga paket.
