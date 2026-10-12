# Chat — Testing

Test otomatis Function ada di `00_BACKEND/tests/integration/functions.test.ts`; skema di `function-inventory.test.ts`; frontend di `src/services/shared/__tests__/` dan `src/lib/negotiation/__tests__/`. Item bertanda *(belum ada test)* perlu ditambahkan.

## `create-conversation`

- Pasangan baru → `conversations` terbuat dengan row `read` kedua participant saja (tanpa `update`). ✅ test
- Pasangan yang sudah ada → kembalikan `conversationId` lama, tidak membuat baris baru. *(belum ada test)*
- Race 409 unique index → kembalikan baris yang ada. *(belum ada test)*
- `creatorId` kosong / sama dengan caller / format tidak sah → `400`.
- Caller bukan UMKM → `403 Hanya UMKM yang dapat memulai percakapan.`; akun non-active → `403`; profil `users` tidak ada → `404`.

## `send-message`

- Participant kirim teks → `messages` tipe `text`, row `read` kedua participant saja; `last_message`/`last_message_at` diperbarui. ✅ test
- Content kosong/whitespace → `400 Pesan tidak boleh kosong.`; >2000 karakter → `400`.
- Non-participant atau conversation tidak ada → `404 Percakapan tidak ditemukan.`
- Update ringkasan gagal → tetap `200`, pesan tersimpan.
- Respons berbentuk `ChatMessage` (`senderRole` sesuai sisi caller, `isRead: false`).

## `mark-conversation-read`

- Hanya pesan lawan bicara yang ditandai `read_at`; pesan sendiri tetap `null`. ✅ test
- Non-participant → `404`; `conversationId` kosong → `400`.
- Lebih dari 100 pesan belum dibaca → hanya 100 yang ditandai per panggilan.

## Archive per Participant (`patch-conversation-archive`)

- UMKM archive hanya mengubah `umkm_archived`; payload role frontend diabaikan. ✅ test
- Creator archive hanya mengubah `creator_archived`. ✅ test
- UMKM unarchive tidak mengubah `creator_archived`; Creator unarchive tidak mengubah `umkm_archived`. ✅ test
- Non-participant → `404`, kedua kolom tidak berubah. ✅ test
- `isArchived` bukan boolean → `400`.
- Frontend mendelegasikan archive/unarchive ke Function tanpa `updateDocument` browser; penolakan non-participant diteruskan. ✅ test (`conversation-appwrite.service.archive.test.ts`)
- Skema mempertahankan `umkm_archived`, `creator_archived`, dan `is_archived`. ✅ test (`function-inventory.test.ts`)

## DTO Negosiasi

- DTO UMKM hanya membaca `umkm_archived`; DTO Creator hanya `creator_archived`; legacy `is_archived = true` diabaikan. ✅ test
- `conversationId` milik user lain → `404 Negotiation not found`.
- `unreadCount` = pesan lawan bicara dengan `read_at` kosong.
- Urutan daftar = `lastMessageAt` DESC.

## Realtime

- Pesan baru dari lawan bicara memicu muat ulang ruang yang sedang terbuka (channel `messages`, filter `conversation_id`).
- Non-participant tidak menerima event (row tanpa `read`).

## Notifikasi (`send-chat-notification`)

- Pesan baru → `notifications` tipe `chat_message` untuk penerima, ID deterministik; event ulang → tidak dobel (409 di-skip).
- Push terkirim jika penerima punya target push; kegagalan push tidak membatalkan notifikasi in-app (`pushSent: false`).
- Pesan `offer` → notifikasi dengan isi `Penawaran Khusus: {title}`.

## Regresi yang Diketahui

- Membuka ruang tidak menurunkan `unreadCount` untuk pesan `text` (frontend update `read_at` via Client SDK pada row read-only). Test perlu ditambahkan setelah frontend memakai `mark-conversation-read`.

## Di Luar MVP

- Lampiran gambar/file, typing indicator, pesan `system` otomatis.
