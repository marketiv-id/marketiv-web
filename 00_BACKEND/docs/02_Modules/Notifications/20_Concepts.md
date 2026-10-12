# Notifications — Concepts

## Istilah

- **In-App Notification** — baris di collection `notifications` yang tampil di notification center (`/dashboard/{umkm|kreator}/notifikasi`) dan dropdown bell.
- **Push Notification** — pesan Appwrite Messaging (`messaging.createPush`). Saat ini hanya dikirim `send-chat-notification`; sampai ke perangkat hanya jika user punya push target (frontend belum mendaftarkannya).
- **Email Notification** — **belum diimplementasikan**. Tidak ada Function yang mengirim email notifikasi (satu-satunya email dari backend adalah token OTP auth di `request-password-otp`, di luar modul ini).
- **Trigger** — event DB, cron, atau panggilan HTTP di modul lain yang membuat Function menulis notifikasi.
- **`type`** — kolom string bebas di DB (maks 50 karakter, tanpa enum). Nilainya ditentukan tiap Function penulis, mis. `chat_message`, `escrow_held`, `keuangan`, `system`. Daftar lengkap di [90_Events.md](90_Events.md).
- **`kind`** — label internal di helper `notify()` (tidak disimpan di DB) yang bersama `sourceId` membentuk id dokumen. Satu `type` bisa punya beberapa `kind` (mis. `escrow_held_umkm` & `escrow_held_creator` sama-sama `type: escrow_held`).
- **`sourceId`** — id entitas pemicu (offer, order, escrow, submission, withdrawal, …) yang dipakai untuk dedup.
- **Id deterministik** — `ntf` + 29 hex pertama `sha256("${sourceId}:${kind}")` (total 32 karakter). Event yang terkirim ulang menabrak id yang sama → 409 → diabaikan.
- **Kategori tampilan (`NotifType`)** — kategori di frontend (`campaign`, `negosiasi`, `keuangan`, `rate_card`, `sistem`) hasil pemetaan `type` DB di `src/services/shared/notification-appwrite.service.ts` (`TYPE_ALIAS`). Bukan cerminan 1:1 nilai DB; `type` yang tidak dikenali jatuh ke `sistem`.
- **`send-notification`** — function global yang direncanakan untuk fan-out ke semua kanal (**belum diimplementasikan**).

## Konsep

- Notifikasi bersifat reaktif (dipicu event/aksi), tidak pernah diinisiasi sendiri.
- Tidak ada service pusat: tiap Function penulis menulis langsung dengan pola helper yang sama (copy per Function).
- Setiap notifikasi punya flag `isRead` untuk status baca; ditulis `false` saat dibuat.
- Notifikasi adalah log append-only bagi pemiliknya: bisa dibaca & ditandai dibaca, tidak bisa dihapus (tidak ada `Permission.delete`).
- Tidak ada kolom tautan/metadata: aksi "Lihat …" di UI diturunkan dari kategori tampilan + role pembaca.
- Di MVP: in-app (+ push chat). Email, WhatsApp, preferensi notifikasi = belum diimplementasikan.
