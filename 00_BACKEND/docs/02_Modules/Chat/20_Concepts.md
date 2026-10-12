# Chat — Concepts

## Istilah

- **Conversation / Ruang Negosiasi** — baris `conversations` antara satu UMKM (`umkm_id`) dan satu Creator (`creator_id`). `$id`-nya menjadi kunci route `/negosiasi/[id_conversation]` dan `id` DTO negosiasi.
- **Participant** — `umkm_id` atau `creator_id` sebuah conversation. Hanya participant yang dapat membaca/menulis.
- **Message Type** — `text`, `offer` (diimplementasikan), `system` (belum ada penulis).
- **Read Receipt** — `messages.read_at` diisi saat penerima membuka ruang. UI menampilkan centang pada pesan milik pengirim (`isRead`).
- **Unread Count** — jumlah pesan lawan bicara dengan `read_at` kosong; dihitung di DTO negosiasi.
- **Archive** — menyembunyikan percakapan dari Kotak Masuk tanpa menghapus data. Bersifat per-participant (`umkm_archived` / `creator_archived`).
- **Stage** — satu nilai tahap ruang negosiasi yang diturunkan DTO: `chatting`, `offer_pending`, `offer_rejected`, `awaiting_order`, atau status order (`pending_payment`, `in_progress`, `revision`, `approved`, `completed`, `cancelled`, …).

## Konsep

- Satu percakapan per pasangan (unique index `idx_umkm_creator`); pembuatan idempoten.
- Satu percakapan dapat memuat beberapa offer berurutan (ditolak/ditarik lalu ditawar ulang, atau deal baru setelah order terminal). DTO memakai offer dengan `$createdAt` terbaru.
- Pesan `offer` merujuk `offers.$id` lewat `messages.offer_id`; isi kartu offer di-join dari tabel `offers` saat dibaca.
- Denormalisasi `last_message` + `last_message_at` di conversation untuk daftar negosiasi.
- Arsip per-participant; `is_archived` deprecated dan tidak authoritative.
