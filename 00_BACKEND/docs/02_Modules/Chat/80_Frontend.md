# Chat — Frontend

## Route

| Route | Role | Komponen |
| --- | --- | --- |
| `/dashboard/umkm/negosiasi` | UMKM | `NegotiationListPage` |
| `/dashboard/umkm/negosiasi/[id_conversation]` | UMKM | `NegotiationRoomPage` |
| `/dashboard/kreator/negosiasi` | Creator | `NegosiasiView` |
| `/dashboard/kreator/negosiasi/[id_conversation]` | Creator | `NegosiasiRoomView` |

- `id_conversation` = `conversations.$id` (= `id` DTO negosiasi).
- Data diambil di komponen klien, bukan Server Component: DTO butuh header `x-appwrite-user-id` dari sesi browser (SSR → 401).

## Halaman

### Daftar Negosiasi (Inbox + Arsip)

- Sumber: `get-umkm-negotiations` / `get-creator-negotiations` (tanpa body).
- Tab **Kotak Masuk** (`isArchived = false`) dan **Arsip** (`isArchived = true`), filter di klien atas public DTO `isArchived`. Hitungan status mengikuti tab aktif.
- Tampilkan: nama & avatar lawan bicara, judul proyek, `lastMessage`, `lastMessageAt`, badge `unreadCount`, `stage`.
- Filter status per `stage`; pencarian nama/judul/pesan; sort termasuk "Belum Dibaca" (`unreadCount`).
- Tombol arsip / kembalikan pada setiap kartu → `setConversationArchived(conversationId, !isArchived)`; state lokal diperbarui tanpa reload.
- Dimuat sekali saat halaman dibuka (tanpa realtime/polling).

### Ruang Negosiasi (Chat Room)

- Muat DTO (`{ conversationId }`) + riwayat pesan (`getMessagesByConversationId`, maks 200 pesan terlama-dulu); deliverables bila sudah ada `orderId`.
- Setelah muat awal, panggil `markConversationRead(conversationId)` tanpa await.
- Input pesan teks (`MessageComposer` UMKM / form di `NegosiasiRoomView` Creator) → `sendMessage` → muat ulang ruang. Tidak ada balasan otomatis/mock.
- Timeline (`ChatTimeline`): `ChatMessageBubble` (text, centang `isRead` pada pesan sendiri), `CustomOfferCard` (pesan `offer`), `SystemMessageCard` (tipe `system`, belum ada penulis).
- Aksi offer (kirim/tarik untuk UMKM, terima/tolak untuk Creator) → `../Offers/80_Frontend.md`.

## Sinkronisasi

- **Realtime**: `realtimeClient.subscribe(tableChannels("messages"))`; event dengan `payload.conversation_id` = ruang aktif → muat ulang ruang. Nonaktif saat mock data.
- **Polling** (`useNegotiationRoomSync`, `src/lib/negotiation/room-sync.ts`): timer berantai muat ulang DTO.
  - 2 detik: `awaiting_order` (berhenti setelah 20 detik), `pending_payment`, atau verifikasi pembayaran (timeout 60 detik).
  - 5 detik: stage lain non-terminal.
  - Berhenti di `completed`/`cancelled`; pause saat tab tersembunyi, refresh saat focus/visible.

## Service Frontend

Facade (pilih mock/Appwrite): `src/services/shared/conversation.service.ts` (archive, mark read), `src/services/umkm/umkm-dashboard.service.ts` & `src/services/creator/creator-dashboard.service.ts` (`createConversation`, `sendMessage`, `getMessagesByConversationId`). Implementasi Appwrite ada di `src/services/shared/conversation-appwrite.service.ts`:

- `createConversationInAppwrite(creatorId)` → Function `create-conversation`. Validasi awal: kosong, diri sendiri, format user ID.
- `sendMessageInAppwrite(conversationId, content)` → Function `send-message`. Validasi awal: kosong, >2000.
- `getMessagesByConversationIdInAppwrite(conversationId)` → Client SDK (lihat `60_API.md`).
- `markConversationReadInAppwrite(conversationId)` → **Client SDK `updateDocument` langsung**, bukan Function `mark-conversation-read`. Row pesan `text` read-only → update gagal diam-diam; badge unread hanya turun untuk pesan `offer`. Perlu dialihkan ke Function `mark-conversation-read`.
- `setConversationArchivedInAppwrite(conversationId, archived)` → Function `patch-conversation-archive`. Tidak ada `updateDocument` browser pada `conversations`.
- `getMyConversationsFromAppwrite()` — legacy helper (baca `is_archived`); tidak dipakai layar negosiasi untuk status arsip.

DTO list/detail: `src/services/umkm/umkm-appwrite.service.ts` (`getNegotiationsFromAppwrite`, `getNegotiationByIdFromAppwrite`) dan `src/services/creator/creator-appwrite.service.ts` (`getCreatorNegotiationsFromAppwrite`, `getCreatorNegotiationByIdFromAppwrite`).

Function ID terdaftar di `src/lib/appwrite/functions.ts` (`FUNCTION_IDS`): `createConversation`, `sendMessage`, `patchConversationArchive`, `createOffer`, `umkmNegotiations`, `creatorNegotiations`. `mark-conversation-read` belum terdaftar.

## Tipe

- `NegotiationOrder` (`src/types/umkm-dashboard.types.ts`), `CreatorNegotiation` (`src/types/creator-dashboard.ts`), `NegotiationStage` (`src/types/domain.ts`), `ChatMessage` (`src/types/umkm-dashboard.types.ts`).
