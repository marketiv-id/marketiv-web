# Chat — Overview

Chat menghubungkan UMKM dan Content Creator sebagai **ruang negosiasi** Rate Card Jalur B (chat → custom offer → accept → order). Di UI disebut "Negosiasi" (`/dashboard/umkm/negosiasi`, `/dashboard/kreator/negosiasi`).

## Inti

- Satu **conversation** per pasangan UMKM+Creator, dibuka oleh **UMKM** (Function `create-conversation`). Creator tidak dapat membuka percakapan.
- Semua tulis lewat Appwrite Function (API key dinamis): klien Appwrite tidak boleh memasang permission untuk user lain, sementara `conversations`/`messages` tidak punya `read` di level tabel.
- Daftar & detail ruang dibaca lewat DTO Function `get-umkm-negotiations` / `get-creator-negotiations` (join conversations → offers → orders → escrows → deliverables). Riwayat pesan dibaca langsung via Client SDK (row read permission).
- Realtime: ruang negosiasi subscribe ke channel tabel `messages` lalu memuat ulang data; state bisnis (offer/order) di-poll dari DTO.
- Pesan baru memicu `send-chat-notification` (notifikasi in-app + push Appwrite Messaging).

## Tipe Pesan

- `text` — pesan teks (maks 2000 karakter), ditulis `send-message`.
- `offer` — kartu custom offer, ditulis otomatis oleh `create-offer` (lihat `../Offers/`).
- `system` — dikenali frontend (`SystemMessageCard`), tetapi **belum diimplementasikan**: tidak ada Function yang menulis pesan `system`.

## Di Luar MVP / Belum Diimplementasikan

- Lampiran gambar/file, voice note, typing indicator, multi-file upload.
- Pesan `system` otomatis.
- Creator memulai percakapan.
- Direct Order (Jalur A) belum punya conversation, jadi tidak muncul di daftar negosiasi.

## Tautan

- Custom offer dalam percakapan → `../Offers/`.
- Skema & permission → `50_Database.md`.
- Alur lintas modul → `../../03_Workflows/30_RateCard_Order.md`.
