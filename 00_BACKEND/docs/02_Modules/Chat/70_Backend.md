# Chat — Backend

Dokumen ini khusus untuk Appwrite Functions, Realtime, dan aturan backend. Kontrak request/response dibahas di [60_API.md](60_API.md).

## Kenapa Tulis Lewat Function

- Appwrite melarang klien memasang permission untuk user lain (`Permissions must be one of: (any, users, user:<diri sendiri>, ...)`).
- `conversations`/`messages` tidak punya `read` di level tabel, jadi lawan bicara hanya bisa membaca lewat row permission. Kedua syarat hanya bisa dipenuhi dengan API key → Function.

## Konfigurasi Function (`appwrite.config.json`)

| Function | Trigger | Execute | Scopes | Timeout |
| --- | --- | --- | --- | --- |
| `create-conversation` | HTTP (execution) | `users` | `documents.read`, `documents.write` | 15s |
| `send-message` | HTTP | `users` | `documents.read`, `documents.write` | 15s |
| `mark-conversation-read` | HTTP | `users` | `documents.read`, `documents.write` | 15s |
| `patch-conversation-archive` | HTTP | `users` | `documents.read`, `documents.write` | 15s |
| `send-chat-notification` | event `databases.<db>.tables.messages.rows.*.create` | — | `documents.read`, `documents.write`, `messages.write` | 15s |
| `get-umkm-negotiations` | HTTP (POST/GET) | `users` | `documents.read` | 30s |
| `get-creator-negotiations` | HTTP (POST/GET) | `users` | `documents.read` | 30s |

- Runtime `node-22`. `create-conversation` memakai `path: "functions"` + entrypoint `create-conversation/src/main.js` karena mengimpor `functions/_shared/require-active-role.js`; lainnya `path: functions/<id>`, entrypoint `src/main.js`.
- API key: header dinamis `x-appwrite-key`, fallback legacy `APPWRITE_API_KEY`.

## Env (`functions/<id>/.env.example`)

- Semua: `APPWRITE_FUNCTION_API_ENDPOINT`, `APPWRITE_FUNCTION_PROJECT_ID` (injected), fallback `APPWRITE_ENDPOINT`, `APPWRITE_PROJECT_ID`, `APPWRITE_API_KEY`; database `APPWRITE_DATABASE_ID` | `NEXT_PUBLIC_DB_ID`.
- `CONVERSATIONS_COLLECTION_ID` | `NEXT_PUBLIC_CONVERSATION_COLLECTION` (default `conversations`; `send-chat-notification` hanya `CONVERSATIONS_COLLECTION_ID`).
- `MESSAGES_COLLECTION_ID` (default `messages`; DTO juga `NEXT_PUBLIC_MESSAGE_COLLECTION`).
- `create-conversation`: `USERS_COLLECTION_ID` (default `users`).
- `send-chat-notification`: `NOTIFICATIONS_COLLECTION_ID` (default `notifications`).
- DTO negosiasi: `OFFERS_COLLECTION_ID`, `ORDERS_COLLECTION_ID`, `ESCROWS_COLLECTION_ID`, `DELIVERABLES_COLLECTION_ID`, `RATECARD_DELIVERABLE_VALIDATIONS_COLLECTION_ID`, `RATE_CARD_PACKAGES_COLLECTION_ID`, `CREATOR_PROFILES_COLLECTION_ID` (UMKM) / `UMKM_PROFILES_COLLECTION_ID` + `FEE_RATE` (Creator, default `0.02`), plus fallback `NEXT_PUBLIC_*`.

## send-chat-notification

- **Trigger**: setiap row `messages` dibuat (termasuk pesan `offer` dari `create-offer`).
- **Input**: payload row (`conversation_id`, `sender_id`, `$id`, `content`, `message_type`); tanpa `conversation_id`/`sender_id` → `400`.
- **Penerima**: participant conversation yang bukan `sender_id` (cek `umkm_id` dulu, lalu `creator_id`). Tidak ada → `{ status: "skipped", reason: "receiver_not_found" }`.
- **Notifikasi in-app**: `notifications` dengan ID deterministik `ntf` + 29 hex `sha256("{messageId}:chat_message")`; `{ userId, title: "Pesan chat baru", message, type: "chat_message", isRead: false, createdAt }`; row `read` + `update` penerima. `409` (event ulang) → skip.
- **Isi `message`**: `content` dipotong 120 karakter; tanpa content → `offer`: "Offer baru dikirim di chat.", `image`/`file`: "Attachment baru dikirim di chat.", lainnya "Buka chat untuk melihat pesan baru.". Pesan offer dari `create-offer` selalu ber-content `Penawaran Khusus: {title}`.
- **Push**: `messaging.createPush` ke `users: [receiverId]` dengan data `{ type: "chat_message", conversationId, messageId }`. Gagal/target tidak ada → hanya log, `pushSent: false`.
- **Return**: `{ status: "ok", notificationId, pushSent }`.
- Function tidak memverifikasi bahwa `sender_id` adalah participant.

## Appwrite Realtime

- Frontend subscribe ke `tableChannels("messages")` (`src/lib/appwrite/realtime.ts`): dua nama channel sekaligus, `databases.{db}.tables.messages.rows` dan `databases.{db}.collections.messages.documents`, karena bentuk channel yang benar di server 1.9.x belum terverifikasi.
- Event hanya terkirim ke participant yang punya row `read`. Klien memfilter `payload.conversation_id`, lalu memuat ulang DTO + riwayat pesan (bukan append payload).
- Tidak ada realtime untuk `conversations`, `offers`, atau `orders`; perubahan stage diambil lewat polling DTO (lihat `80_Frontend.md`).

## Aturan Backend

- Validasi participant di setiap Function; non-participant → `404`.
- Unique index `idx_umkm_creator` sebagai penjaga satu percakapan per pasangan; 409 diperlakukan sebagai sukses.
- `last_message` diperbarui setelah pesan tersimpan; kegagalannya tidak menggagalkan request.
- `is_archived` deprecated; `umkm_archived`/`creator_archived` authoritative sesuai sisi pembaca.
- Mutasi archive tidak menyentuh messages, offers, orders, escrow, atau stage.
- DTO: paginasi cursor 100/halaman, maks 5000 dokumen per query; filter `Query.equal` array dipecah per 100 ID.
