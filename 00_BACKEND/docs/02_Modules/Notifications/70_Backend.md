# Notifications — Backend

Dokumen ini khusus untuk Appwrite Functions dan aturan backend. Kontrak pemanggilan dari frontend dibahas di [60_API.md](60_API.md). Konfigurasi kanonik: `appwrite.config.json` (`appwrite.json` usang).

## Appwrite Functions Milik Modul

### send-chat-notification

- **Trigger**: event `databases.<db>.tables.messages.rows.*.create`. `execute: []`, timeout 15 s.
- **Scopes**: `documents.read`, `documents.write`, `messages.write`.
- **Proses**:
  1. Payload = baris `messages` (`conversation_id`, `sender_id` wajib → 400 bila kosong).
  2. Baca `conversations`; penerima = `umkm_id` atau `creator_id` yang bukan pengirim (tidak ada → `skipped`).
  3. Tulis `notifications` `{ title: "Pesan chat baru", message: <body>, type: "chat_message" }`, id `ntf` + sha256(`${message.$id}:chat_message`), permission read+update penerima. 409 → skip.
  4. Body: `content` dipangkas 120 karakter; tanpa `content` → `"Offer baru dikirim di chat."` (`message_type: offer`), `"Attachment baru dikirim di chat."` (`image`/`file`), selain itu `"Buka chat untuk melihat pesan baru."`.
  5. `messaging.createPush(ID.unique(), title, body, topics: [], users: [receiverId], targets: [], data: { type: "chat_message", conversationId, messageId })`.
- **Ketahanan**: gagal push hanya di-log (`pushSent: false`); notifikasi in-app tetap ada. Gagal tulis notifikasi non-409 → 500.
- **Return**: `{ status: "ok", notificationId, pushSent }`.
- **Env**: `APPWRITE_DATABASE_ID`/`NEXT_PUBLIC_DB_ID`, `CONVERSATIONS_COLLECTION_ID` (default `conversations`), `NOTIFICATIONS_COLLECTION_ID` (default `notifications`), API key dari header `x-appwrite-key` / `APPWRITE_API_KEY`.

### notify-order-activity

- **Trigger**: event `deliverables.rows.*.create` **dan** `revisions.rows.*.create`. `execute: []`, timeout 15 s, scopes `documents.read`, `documents.write`.
- **Pembeda payload**: ada `version` → deliverable; ada `requestedBy` → revisi; lainnya → `ignored`. Header `x-appwrite-event` sengaja tidak dipakai.
- **Proses**:
  - Deliverable → UMKM (`orders.umkmId`): `type/kind: deliverable_submitted`, "Hasil Kerja Masuk", pesan menyebut versi.
  - Revisi → Kreator (`orders.creatorId`): `type/kind: revision_requested`, "UMKM Minta Revisi", pesan = kutipan `revisions.message` (dipangkas 900).
  - `sourceId` = `$id` baris pemicu. Gagal tulis di-log, tidak menggagalkan.
- **Env**: `APPWRITE_DATABASE_ID`/`NEXT_PUBLIC_DB_ID`, `ORDERS_COLLECTION_ID`/`NEXT_PUBLIC_ORDER_COLLECTION` (default `orders`), `NOTIFICATIONS_COLLECTION_ID`.
- **Catatan**: menggantikan `notify-client-review` yang pernah disebut dokumen tapi tidak pernah dibuat.

### mark-notifications-read

- **Trigger**: HTTP (Client SDK `createExecution`), `execute: ["users"]`, timeout 15 s, scopes `documents.read`, `documents.write`.
- **Proses**: lihat kontrak di [60_API.md](60_API.md). Update dilakukan satu per satu (sekuensial) setelah `getDocument` paralel.
- **Env**: `APPWRITE_DATABASE_ID`/`NEXT_PUBLIC_DB_ID`, `NOTIFICATIONS_COLLECTION_ID`.

### send-notification

- **Belum diimplementasikan** — tidak ada `functions/send-notification/`, tidak ada entri config. Tidak ada fan-out email/push terpusat.

## Pola Function Penulis (lintas modul)

Semua Function yang menulis notifikasi (katalog di [90_Events.md](90_Events.md)) memakai helper lokal yang sama:

```text
notify(databases, env, { userId, sourceId, kind, title, message, type }, log)
↓
createDocument(db, NOTIFICATIONS_COLLECTION_ID || "notifications",
  "ntf" + sha256(`${sourceId}:${kind}`).slice(0, 29),
  { userId, title, message, type, isRead: false, createdAt: now },
  [read(user:userId), update(user:userId)])
↓
409 → diam (sudah ada) · error lain → log, tidak throw
```

- Env yang dibaca: `NOTIFICATIONS_COLLECTION_ID` (beberapa juga `NEXT_PUBLIC_NOTIFICATION_COLLECTION`), default `notifications`. `auto-approve-orders` meng-hardcode `notifications`.
- `fee-rate-flip` juga membaca `ADMIN_NOTIFY_USER_ID` (penerima alert; tanpa itu hanya log).
- Penyimpangan dari pola: `expire-stale-claims` (`ID.unique()`, tanpa try/catch), `auto-approve-orders` (inline, `catch {}` kosong), `mature-pending-balance` (prefix `tx`, error non-409 di-throw), `review-withdrawal` (`type` di-hardcode `keuangan`).

## Arsitektur

```text
Modul X (event DB / cron / HTTP) → Function X → notifications (in-app)
messages.create → send-chat-notification → notifications + Appwrite Messaging push
deliverables/revisions.create → notify-order-activity → notifications
Klien → mark-notifications-read → isRead = true
```

## Integrasi Eksternal

- **Appwrite Messaging** — push untuk pesan chat (`send-chat-notification`). Frontend belum mendaftarkan push target.
- **SMTP / Email Service** — **belum diimplementasikan**; tidak ada Function pengirim email notifikasi.
- **WhatsApp** — future, belum diimplementasikan di MVP.
