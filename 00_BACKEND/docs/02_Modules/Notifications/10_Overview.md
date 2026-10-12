# Notifications — Overview

## Ringkasan

- Menyampaikan pemberitahuan ke pengguna lewat kanal **in-app** (notification center + badge). Push Appwrite Messaging hanya untuk pesan chat. Email **belum diimplementasikan**.
- Bersifat reaktif: dipicu oleh event/aksi di modul lain (Offers, Orders, Payments, Campaigns, Chat, Users/Admin), tidak pernah diinisiasi modul ini sendiri.
- **Tidak ada service/Function pusat.** Setiap Function penulis menulis baris `notifications` sendiri lewat helper `notify()` yang di-copy per folder Function (deploy root Appwrite = `functions/<id>/`, jadi tidak ada modul bersama). Pola helper seragam: id deterministik, permission baris owner `read` + `update`, kegagalan tidak menggagalkan pemanggil (lihat [30_Business_Rules.md](30_Business_Rules.md)).
- Rencana function global `send-notification` (fan-out ke email/push) — **belum diimplementasikan**; tidak ada folder `functions/send-notification/` dan tidak ada entri di `appwrite.config.json`.

## Collection yang Dimiliki

- `notifications` — lihat [50_Database.md](50_Database.md).

## Function Milik Modul

- `send-chat-notification` — event `messages.rows.*.create` → notifikasi `chat_message` + push.
- `notify-order-activity` — event `deliverables.rows.*.create` & `revisions.rows.*.create` → notifikasi `deliverable_submitted` / `revision_requested`.
- `mark-notifications-read` — dipanggil klien (execute `users`) untuk "Tandai Semua Dibaca".

Function lain (Payments, Campaigns, Orders, Users/Admin) juga menulis ke `notifications` — katalog di [90_Events.md](90_Events.md).

## Arsitektur (sesuai kode)

```text
Event DB / cron / panggilan HTTP di modul X
↓
Appwrite Function modul X (pakai API key)
↓
notify(): createDocument("notifications", ntf<hash>, {...},
          [read(user:<penerima>), update(user:<penerima>)])
↓
Frontend: NotificationProvider
  ├─ listDocuments(userId = me)  (Client SDK)
  └─ Realtime subscribe tabel notifications → reload

Khusus chat: send-chat-notification → juga messaging.createPush(users: [penerima])
Email / WhatsApp: belum diimplementasikan
```

## Lihat Juga

- [90_Events.md](90_Events.md) — daftar event sumber notifikasi.
- [70_Backend.md](70_Backend.md) — detail Function.
