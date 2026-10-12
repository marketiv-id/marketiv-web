# Offers — Concepts

## Istilah

- **Custom Offer / Penawaran Khusus** — baris `offers` yang dikirim UMKM ke creator dalam satu conversation.
- **Accept** — creator mengubah `status` menjadi `accepted`; memicu `create-order`.
- **Reject** — creator mengubah `status` menjadi `rejected`; UMKM diberi notifikasi dan boleh menawar ulang.
- **Tarik Offer** — UMKM menghapus offer yang masih `pending` (hard delete; tidak ada status `withdrawn`).
- **Offer Aktif** — offer dengan `$createdAt` terbaru dalam conversation; dipakai DTO negosiasi.
- **Deal Aktif** — offer terbaru `accepted` yang belum punya order, atau order terbaru dalam conversation yang statusnya bukan `completed`/`cancelled`.
- **Provenance Paket** — `packageId`, `packageNameSnapshot`, `packagePriceSnapshot`: paket rate card acuan yang di-snapshot saat offer dibuat. Bukan kontrak.

## Status Offer

`pending → accepted | rejected` (atau dihapus saat `pending`).

## Konsep

- Offer menjembatani negosiasi (chat) dan eksekusi (order).
- Satu offer → maks satu order (unique index `orders.idx_offerId`).
- Order dibuat asinkron oleh `create-order`; selama order belum ada, stage negosiasi `awaiting_order`.
- Snapshot paket immutable: perubahan paket setelah offer dibuat tidak mengubah riwayat offer/order.
