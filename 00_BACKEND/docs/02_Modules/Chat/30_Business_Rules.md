# Chat — Business Rules

## Satu Percakapan per Pasangan

1. Hanya ada **satu** `conversations` per pasangan `umkm_id + creator_id` (unique index `idx_umkm_creator`).
2. Hanya **UMKM aktif** yang dapat membuka percakapan (`create-conversation` memeriksa `users.role = umkm` dan `users.status = active`). Caller selalu menjadi `umkm_id`; `creatorId` dari body.
3. Tidak boleh membuka percakapan dengan diri sendiri; `creatorId` harus berbentuk user ID Appwrite yang sah (`^[a-zA-Z0-9][a-zA-Z0-9._-]{0,35}$`).
4. Idempoten: pasangan yang sudah punya conversation mengembalikan `conversationId` yang ada. Race dua tab (409 dari unique index) juga mengembalikan baris yang ada.
5. Keberadaan `creatorId` sebagai user/creator sungguhan tidak diverifikasi oleh Function (hanya format).

## Pengiriman Pesan

1. Hanya participant yang dapat mengirim pesan; non-participant & conversation tidak ada → `404` (bukan 403, agar keberadaan percakapan tidak bocor).
2. `send-message` hanya menulis tipe `text`. `content` di-trim, wajib tidak kosong, maks **2000** karakter.
3. `send-message` tidak memeriksa role/status akun (user suspended yang masih punya sesi tetap bisa mengirim).
4. Pesan tipe `offer` hanya ditulis oleh `create-offer` (lihat `../Offers/30_Business_Rules.md`).
5. Tipe `system` belum diimplementasikan.

## Denormalisasi

- `conversations.last_message` (maks 1000 karakter, dipotong) dan `last_message_at` diperbarui **setelah** pesan tersimpan.
- Kegagalan update ringkasan tidak membatalkan pesan (hanya di-log), agar pengirim tidak retry dan menggandakan pesan.
- Untuk pesan offer, `last_message = "Penawaran Khusus: {title}"` dan `conversations.offer_id` = offer terbaru.
- Conversation baru dibuat dengan `last_message = ""` dan `last_message_at = waktu pembuatan`.

## Read Receipt

- Belum dibaca = pesan dari lawan bicara dengan `read_at` kosong.
- Saat participant membuka ruang negosiasi, pesan lawan bicara yang belum dibaca ditandai `read_at = now`. Pesan milik sendiri tidak ditandai.
- Function resmi `mark-conversation-read` menandai maks **100** pesan per panggilan.
- Celah saat ini: frontend menandai lewat Client SDK langsung (lihat `80_Frontend.md`), padahal row pesan `text` hanya memberi `read` ke participant — update gagal diam-diam untuk pesan `text`; hanya pesan `offer` (row memberi `update` ke kedua participant) yang berhasil ditandai.

## Archive

1. Archive bersifat per-participant: UMKM hanya mengubah `umkm_archived`, Creator hanya `creator_archived`.
2. Participant ditentukan dari caller Appwrite (`x-appwrite-user-id`) dibanding `umkm_id`/`creator_id`; role dari payload browser tidak dipakai.
3. Archive bersifat soft: tidak menghapus/mengubah conversation lain, messages, offers, orders, escrow, atau stage.
4. Archive/unarchive satu participant tidak mengubah status participant lain.
5. Mutasi archive hanya lewat `patch-conversation-archive`; browser tidak punya `update` pada conversation.
6. `is_archived` deprecated: hanya ditulis `false` saat pembuatan, tidak dibaca DTO, tidak di-backfill. Nilai legacy `true` tidak dipetakan ke participant mana pun.
7. Pesan baru tidak otomatis meng-unarchive percakapan.

## Akses

- `conversations` & `messages`: row permission hanya `read` untuk kedua participant (kecuali pesan `offer`, lihat `50_Database.md`).
- DTO negosiasi menegakkan kepemilikan lewat filter query (`umkm_id`/`creator_id` = caller), bukan pengecekan setelah baca.
