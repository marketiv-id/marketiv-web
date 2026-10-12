# Chat — User Flow

## Membuka Ruang Negosiasi (UMKM)

```text
UMKM buka detail Creator (CreatorDetailPage) → pilih paket rate card
↓
StartNegotiationModal → "Masuk ke Obrolan Negosiasi" → createConversation(creatorId)
↓
Function create-conversation
  ├─ pasangan sudah ada → kembalikan conversationId lama
  └─ belum ada → buat conversations (read untuk kedua participant)
↓
Redirect /dashboard/umkm/negosiasi/{conversationId}?packageId={packageId}
```

Creator tidak memiliki aksi membuka percakapan; percakapan muncul di `/dashboard/kreator/negosiasi` setelah UMKM membukanya.

## Mengirim Pesan Teks

```text
User (UMKM/Creator) ketik pesan di ruang negosiasi
↓
sendMessage(conversationId, text) → Function send-message
↓
messages.create (type text) → conversations.last_message/last_message_at diperbarui
↓
Event messages.rows.*.create → send-chat-notification (notifikasi + push ke penerima)
↓
Realtime event → ruang penerima memuat ulang DTO + riwayat pesan
↓
Pengirim memuat ulang ruang setelah Function berhasil
```

Lampiran gambar/file tidak tersedia.

## Membuka Ruang (Tandai Dibaca)

```text
User buka /negosiasi/{conversationId}
↓
Muat DTO negosiasi ({ conversationId }) + riwayat pesan
↓
markConversationRead(conversationId) — tidak di-await, kegagalan diabaikan
↓
unreadCount di daftar negosiasi turun pada pemuatan berikutnya
```

## Arsip / Batal Arsip

```text
User klik ikon arsip pada kartu di daftar negosiasi
↓
setConversationArchived(conversationId, !isArchived) → Function patch-conversation-archive
↓
Hanya kolom arsip milik caller berubah → state lokal diperbarui tanpa reload
↓
Kartu pindah antara tab "Kotak Masuk" dan "Arsip"
```

## Membuat Offer dari Chat

Lihat `../Offers/40_User_Flow.md` (UMKM-only, lewat Function `create-offer`).
