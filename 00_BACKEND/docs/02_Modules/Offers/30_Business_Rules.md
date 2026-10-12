# Offers — Business Rules

## Rules

1. Hanya **UMKM aktif** (`users.role = umkm`, `users.status = active`) yang dapat membuat offer, dan hanya pada conversation dengan `umkm_id` = caller.
2. `umkmId` dan `creatorId` offer diambil dari conversation, bukan dari body. `creatorId` di body (opsional) harus sama dengan `conversation.creator_id`.
3. Tidak boleh ada offer kedua selama masih ada offer `pending` di conversation yang sama (`409`). UMKM harus menarik offer lama dulu.
4. **Guard deal aktif**: offer baru ditolak (`409`) jika offer terbaru `accepted` belum punya order, atau order terbaru conversation (dari semua offer-nya) berstatus selain `completed`/`cancelled`. Guard ditegakkan di Function; UI hanya menyembunyikan aksi.
5. Offer baru boleh dibuat saat stage `chatting`, `offer_rejected`, `completed`, atau `cancelled`.
6. Hanya **creator** penerima yang dapat accept/reject (row `update` hanya untuk creator).
7. Hanya **UMKM** pembuat yang dapat menarik (menghapus) offer (row `delete` hanya untuk UMKM). UMKM tidak punya `update`: harga offer yang sudah dikirim tidak boleh diubah.
8. Accept/reject/hapus hanya untuk offer `pending` — **ditegakkan di klien saja** (`setOfferStatusInAppwrite`, `deleteOfferInAppwrite`). Row permission tidak membatasi kolom/status, jadi tidak ada penegakan server.
9. Saat `accepted`, order dibuat dengan `amount = offer.price` dan provenance paket disalin dari offer (lihat Accept → Create Order).

## Statuses / Enums

- **`status`**: `pending` → `accepted` | `rejected`.
  - `pending` — dibuat `create-offer`, menunggu jawaban creator.
  - `accepted` — creator setuju; memicu `create-order`.
  - `rejected` — creator menolak; UMKM diberi notifikasi `offer_rejected`.
  - Tarik offer = hapus row (tidak ada status `withdrawn`/`cancelled`).
- Kolom `status` bertipe string(50) tanpa enum di skema.

## Validations

Function `create-offer` (otoritatif):

- `conversationId` wajib.
- `title` wajib setelah trim, maks 255.
- `description` opsional, maks 2000.
- `deadline` wajib, string tanggal yang dapat di-parse, tidak sebelum hari ini (00:00 UTC). Disimpan sebagai string, bukan datetime.
- `price` integer `1 … 999.999.999`.
- `revisionLimit` integer `≥ 0`.
- `packageId` opsional: paket harus ada, `rate_cards` induknya milik creator lawan bicara, dan `rate_cards.status = published`; selain itu `422`.

Frontend (`src/lib/validations/offer.schema.ts`, lebih ketat): `price` minimal Rp50.000, `revisionLimit` maks 10, `deadline` harus setelah sekarang.

## Accept → Create Order

- Dipicu event update row `offers` (bukan transisi; event tidak membawa nilai lama). `create-order` hanya memeriksa status akhir.
- `accepted` + creator sudah setuju T&C terbaru (`users.tos_version = CURRENT_TOS_VERSION` dan `tos_accepted_at` terisi) → buat `orders` `{ offerId, creatorId, umkmId, packageId?, packageNameSnapshot?, packagePriceSnapshot?, amount: price, status: pending_payment }`.
- Creator belum setuju T&C → order tidak dibuat, UMKM diberi notifikasi `order_tos_blocked`. Offer tetap `accepted` (stage `awaiting_order`).
- Event ulang setelah order ada → unique `idx_offerId` menolak; dianggap `already_exists`.
- `rejected` → notifikasi `offer_rejected` ke UMKM, tidak ada order.
- Detail order: `../Orders/` dan `../../04_Decisions/ADR-003.md`.

## Stage Negosiasi (DTO)

Diturunkan `deriveStage(offer, order)` di `get-{umkm,creator}-negotiations` dari offer terbaru:

- Order ada → `order.status`.
- Tanpa offer → `chatting`.
- `accepted` tanpa order → `awaiting_order`.
- `rejected` → `offer_rejected`.
- Selain itu → `offer_pending`.

## Invariants

- Maks satu offer `pending` per conversation (ditegakkan `create-offer`, bukan index).
- Maks satu order per offer (`orders.idx_offerId` unique).
- Harga order = `offer.price`, bukan harga paket.
