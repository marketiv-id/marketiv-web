# Modul Chat

Ruang negosiasi UMKM ↔ Content Creator (Rate Card Jalur B). Satu percakapan per pasangan UMKM+creator, dibuka oleh UMKM. Semua tulis (`conversations`, `messages`) lewat Appwrite Function karena row permission harus menyebut kedua participant. Pesan yang diimplementasikan: `text` (dari `send-message`) dan `offer` (dari `create-offer`). Modul ini memiliki data `conversations` dan `messages`.

## Daftar Dokumen

- `10_Overview.md` — Peran chat sebagai ruang negosiasi, tipe pesan, batasan MVP.
- `20_Concepts.md` — Istilah: conversation, stage negosiasi, unread, arsip per-participant.
- `30_Business_Rules.md` — Satu percakapan per pasangan, siapa boleh menulis, denormalisasi `last_message`, read receipt, arsip per-participant.
- `40_User_Flow.md` — Alur buka ruang negosiasi, kirim pesan, buka ruang (tandai dibaca), arsip.
- `50_Database.md` — Skema, index, dan permission `conversations`, `messages`.
- `60_API.md` — Kontrak Function `create-conversation`, `send-message`, `mark-conversation-read`, `patch-conversation-archive`, DTO `get-{umkm,creator}-negotiations`.
- `70_Backend.md` — Konfigurasi Function, env, notifikasi chat, realtime, aturan backend.
- `80_Frontend.md` — Route, komponen, service frontend, realtime & polling.
- `90_Events.md` — Event `messages` → `send-chat-notification`, tautan ke Offers/Notifications.
- `100_Testing.md` — Skenario uji Function, archive, DTO, realtime, notifikasi.
