# Chat — API

Semua mutasi Chat lewat Appwrite Function yang dieksekusi user login (`execute: ["users"]`, POST, body JSON). Caller selalu dari header `x-appwrite-user-id`, bukan dari body. Respons error berbentuk `{ error: string }`.

---

## Appwrite Functions (dipanggil frontend)

### `create-conversation` — [Appwrite Function]

- **Input**: `{ creatorId: string }` — caller menjadi `umkm_id`.
- **Proses**: validasi → `requireActiveRole(umkm)` → cari pasangan `umkm_id + creator_id` → kembalikan yang ada atau buat baru (`last_message: ""`, `last_message_at: now`, `is_archived: false`, row `read` kedua participant). 409 unique index → baca ulang & kembalikan.
- **Return**: `{ conversationId }` (200, baik baru maupun lama).
- **Errors**:
  - `401 Unauthorized` — tanpa user.
  - `400 Kreator tidak valid.` / `Tidak bisa memulai percakapan dengan diri sendiri.` / `Profil kreator ini belum tertaut ke akun yang sah.` (format user ID).
  - `404 Profil Pengguna tidak ditemukan.` — baris `users` caller tidak ada.
  - `403 Akun Anda sedang tidak aktif.` / `Hanya UMKM yang dapat memulai percakapan.`
  - `405` non-POST, `500` lainnya.
- **Akses**: UMKM aktif.

### `send-message` — [Appwrite Function]

- **Input**: `{ conversationId: string, content: string }`. Tipe selalu `text`; field `type`/`offerId` tidak didukung.
- **Proses**: trim → validasi → cek participant → `messages.create` (row `read` kedua participant) → update `last_message` (≤1000) & `last_message_at` (gagal = hanya log).
- **Return** (bentuk `ChatMessage` frontend): `{ id, conversationId, senderId, senderRole: "umkm"|"creator", type: "text", content, isRead: false, createdAt }`.
- **Errors**: `401`; `400 Percakapan tidak valid.`; `400 Pesan tidak boleh kosong.`; `400 Pesan maksimal 2000 karakter.`; `404 Percakapan tidak ditemukan.` (tidak ada / bukan participant); `405`; `500`.
- **Akses**: participant (tanpa cek role/status akun).

### `mark-conversation-read` — [Appwrite Function]

- **Input**: `{ conversationId: string }`.
- **Proses**: cek participant → list maks 100 pesan `conversation_id = id`, `sender_id != caller`, `read_at IS NULL` → update `read_at = now` satu per satu.
- **Return**: `{ ok: true, updated: number }`.
- **Errors**: `401`; `400 Conversation ID wajib diisi.`; `404 Percakapan tidak ditemukan.`; `405`; `500` (termasuk body JSON tidak valid).
- **Akses**: participant.
- **Catatan**: dipakai `00_BACKEND/src/services/chat.service.ts` (`markConversationAsRead`). Frontend root belum memanggilnya (lihat `80_Frontend.md`).

### `patch-conversation-archive` — [Appwrite Function]

- **Input**: `{ conversationId: string, isArchived: boolean }`.
- **Proses**: load conversation → caller = `umkm_id` → update `umkm_archived`; caller = `creator_id` → update `creator_archived`. Tidak menerima role frontend, tidak menyentuh `is_archived`.
- **Return**: `{ ok: true, conversationId, isArchived }`.
- **Errors**: `401`; `400 Conversation ID wajib diisi.`; `400 isArchived wajib boolean.`; `404 Percakapan tidak ditemukan.` (tidak ada / non-participant, tanpa mutasi); `405`; `500`.
- **Akses**: participant.

### `get-umkm-negotiations` / `get-creator-negotiations` — [Appwrite Function]

DTO baca ruang negosiasi (read-only, scope `documents.read`). Kontrak lengkap field offer/order: lihat juga `../Offers/60_API.md`.

- **Input**: body opsional `{ conversationId?: string }`. Method POST atau GET.
- **Proses**: query `conversations` dengan filter `umkm_id = caller` (UMKM) atau `creator_id = caller` (Creator), `orderDesc($createdAt)`; join messages, offers (terbaru per conversation), orders (`offerId`), escrows, deliverables (versi tertinggi), `ratecard_deliverable_validations`, `rate_card_packages`, profil lawan bicara. Urut akhir `lastMessageAt` DESC di memori.
- **Return**: array DTO, atau satu objek bila `conversationId` dikirim. Field chat:
  - `id` = `conversationId` = `conversations.$id`.
  - `stage` — lihat `../Offers/30_Business_Rules.md`.
  - UMKM: `creatorId`, `creatorName` (`creator_profiles.displayName`), `creatorAvatarUrl` (`avatarUrl`). Creator: `umkmId`, `umkmName` (`umkm_profiles.businessName`), `umkmAvatarUrl` (`logoUrl`).
  - `lastMessage`, `lastMessageAt`, `unreadCount` (pesan lawan bicara dengan `read_at` kosong).
  - `isArchived` = `Boolean(umkm_archived)` (UMKM) / `Boolean(creator_archived)` (Creator). Tidak ada fallback ke `is_archived`; nama kolom internal tidak diekspos.
- **Errors**: `401`; `404 Negotiation not found` (conversationId bukan milik caller); `405` selain POST/GET; `500`.
- **Akses**: participant (kepemilikan ditegakkan lewat filter query).

---

## Service Layer — Client SDK (baca langsung)

### `getMessagesByConversationIdInAppwrite(conversationId)` — [Client SDK] (`src/services/shared/conversation-appwrite.service.ts`)

- Baca `conversations` (cek participant) → `messages` (`orderAsc($createdAt)`, limit 200) + `offers` per conversation (limit 100).
- Output `ChatMessage[]`: `senderRole` (`system` jika tipe `system`, selain itu dari `umkm_id`), `offerData` (join offer: `offerId`, `title`, `finalPrice`, `scope`, `deadline`, `revisionCount`), `isRead = read_at != ""`.

### `markConversationReadInAppwrite(conversationId)` — [Client SDK]

- Update `read_at` langsung dari browser untuk maks 200 pesan lawan bicara yang belum dibaca (`Promise.allSettled`). Hanya berhasil untuk row yang memberi `update` (pesan `offer`). Lihat celah di `30_Business_Rules.md`.

### Legacy (`00_BACKEND/src/services/chat.service.ts`)

- `createConversation`, `sendMessage`, `markConversationAsRead`, `archiveConversation`/`unarchiveConversation` → membungkus Function di atas.
- `getConversations({ limit, includeArchived })` — **legacy**: memfilter `is_archived` dan `orderDesc('last_message_at')` (kolom tanpa index). Tidak dipakai frontend; jangan dijadikan acuan status arsip.

---

## Realtime & Push

- Ruang negosiasi subscribe channel tabel `messages` (lihat `70_Backend.md`) dan memfilter `payload.conversation_id` di klien.
- Setiap `messages` create memicu `send-chat-notification` (notifikasi `chat_message` + push). Lihat `70_Backend.md`.

---

## Lihat Juga

- [50_Database.md](50_Database.md) — skema data
- [30_Business_Rules.md](30_Business_Rules.md) — aturan validasi
- [../Offers/60_API.md](../Offers/60_API.md) — `create-offer`, accept/reject
