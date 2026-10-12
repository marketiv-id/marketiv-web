# Offers — Events

Automasi modul Offers berjalan event-driven via Appwrite Functions. Aksi yang memicu ada di `60_API.md`.

---

## Event yang Diterbitkan

| Event Appwrite | Sumber | Function | Efek |
| --- | --- | --- | --- |
| `databases.<db>.tables.offers.rows.*.update` | creator accept/reject (Client SDK) | `create-order` | `accepted` → order `pending_payment` / blokir T&C; `rejected` → notifikasi UMKM |
| `databases.<db>.tables.messages.rows.*.create` (pesan tipe `offer`) | `create-offer` | `send-chat-notification` | notifikasi `chat_message` + push ke creator |

- Pembuatan row `offers` (`create`) dan penghapusan (`delete`) tidak memicu Function apa pun.
- Setiap update offer (termasuk update ulang setelah `accepted`) memicu `create-order`; duplikat order ditolak unique `orders.idx_offerId`.

## Offer Accepted

- **Kondisi**: status akhir `accepted` (bukan cek transisi).
- **Aksi**: cek T&C creator → buat `orders` (`amount = price`, status `pending_payment`, provenance paket disalin) → notifikasi UMKM `order_created` "Penawaran Diterima".
- **Gagal T&C**: notifikasi UMKM `order_tos_blocked`, order tidak dibuat.
- **Link**: `../Orders/90_Events.md`; ADR → `../../04_Decisions/ADR-003.md`.

## Offer Rejected

- **Aksi**: notifikasi UMKM `offer_rejected` "Penawaran Ditolak" (lihat catatan cabang status akun di `70_Backend.md`). Tidak ada order.

## Notifikasi Offer Baru

- Tidak ada notifikasi khusus "offer received"; creator diberi tahu lewat notifikasi chat dari pesan `offer`.
