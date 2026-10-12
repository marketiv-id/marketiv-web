# Chat — Events

## Event yang Diterbitkan

| Event Appwrite | Sumber tulis | Efek |
| --- | --- | --- |
| `databases.<db>.tables.messages.rows.*.create` | `send-message` (text), `create-offer` (offer) | Function `send-chat-notification`; realtime ke participant (row `read`) |

- Update `messages.read_at` dan update `conversations` (last_message, archive, offer_id) tidak memicu Function apa pun.

## Event yang Dikonsumsi

- Tidak ada. Chat tidak mengonsumsi event modul lain. Perubahan offer/order terlihat lewat polling DTO negosiasi.

## Integrasi Notifications

- `send-chat-notification` membuat `notifications` tipe `chat_message` (judul "Pesan chat baru") untuk participant penerima dan mengirim push Appwrite Messaging jika target push ada. Detail: `70_Backend.md`.
- Offer baru tidak punya notifikasi khusus: kreator menerima notifikasi `chat_message` dari pesan `offer` (isi `Penawaran Khusus: {title}`).

## Lihat Juga

- Pesan tipe `offer` & `create-order` → `../Offers/90_Events.md`.
- Katalog notifikasi → `../Notifications/90_Events.md`.
