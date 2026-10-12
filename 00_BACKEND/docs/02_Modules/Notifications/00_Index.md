# Notifications

Modul notifikasi Marketiv: notifikasi **in-app** (collection `notifications`) yang ditulis langsung oleh Appwrite Functions dari modul lain, plus **push** Appwrite Messaging khusus pesan chat (`send-chat-notification`). Pemilik collection `notifications`.

Status kanal (per kode, 2026-10):

- In-App — ✅ diimplementasikan (25 Function penulis, lihat [90_Events.md](90_Events.md)).
- Push (Appwrite Messaging) — ⚠️ hanya chat; frontend belum mendaftarkan push target.
- Email — ⬜ belum diimplementasikan.
- Function global `send-notification` — ⬜ belum diimplementasikan.

## Dokumen

- [10_Overview.md](10_Overview.md) — Ringkasan peran, kanal, arsitektur nyata.
- [20_Concepts.md](20_Concepts.md) — Istilah: `type`, `kind`, id deterministik, kategori tampilan.
- [30_Business_Rules.md](30_Business_Rules.md) — Trigger, kanal, status baca, dedup, larangan hapus.
- [40_User_Flow.md](40_User_Flow.md) — Alur menerima & membaca notifikasi.
- [50_Database.md](50_Database.md) — Skema `notifications` (kolom, index, permission).
- [60_API.md](60_API.md) — Service frontend, Function `mark-notifications-read`, service backend.
- [70_Backend.md](70_Backend.md) — Appwrite Functions notifikasi & pola penulis.
- [80_Frontend.md](80_Frontend.md) — Halaman, komponen, pemetaan `type` → tab.
- [90_Events.md](90_Events.md) — Katalog lengkap event/Function → notifikasi.
- [100_Testing.md](100_Testing.md) — Test yang ada & skenario uji.
