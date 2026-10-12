# Notifications — Business Rules

## Trigger

Notifikasi in-app dibuat saat event berikut terjadi (katalog lengkap — Function, penerima, `type`, judul — di [90_Events.md](90_Events.md)):

- **Rate Card / Negosiasi**: pesan chat baru (termasuk offer yang dikirim sebagai pesan `offer`), offer ditolak, offer diterima → order dibuat, order diblokir (kreator belum setuju T&C), escrow ditahan (UMKM + kreator), deliverable masuk, revisi diminta, validasi deliverable oleh admin (valid/invalid), dana cair + pesanan selesai, auto-approve & pengingat tenggat review H-1, refund escrow.
- **Campaign**: campaign published (ke kreator eligible), campaign di-klaim (ke UMKM), bukti kerja masuk (ke UMKM), bukti kerja ditolak, reward masuk, claim expired, sisa budget campaign dikembalikan.
- **Keuangan**: pengajuan penarikan diterima, penarikan diproses/berhasil/dikembalikan (admin), KYC terverifikasi.
- **Akun**: akun ditangguhkan/dihentikan/dipulihkan, banding diterima/disetujui/ditolak.
- **Admin/platform**: threshold fee-rate flip tercapai (ke `ADMIN_NOTIFY_USER_ID`, bila di-set).

**Tidak ada (meski pernah didokumentasikan):**

- Welcome notification saat register — `create-user-wallet` tidak menulis notifikasi.
- Notifikasi "submission approved" terpisah — digantikan notifikasi `reward` dari `calculate-campaign-reward`.
- Notifikasi "deliverable approved" terpisah ke kreator — digabung ke "Dana Sudah Cair" (`release-escrow`).
- Notifikasi top-up campaign berhasil — jalur campaign di `create-escrow` tidak menulis notifikasi.

## Kanal

- **In-App** (notification center + badge bell/sidebar) — ✅ semua trigger di atas.
- **Push** via Appwrite Messaging — ⚠️ hanya `send-chat-notification` (pesan chat). Dikirim ke `users: [receiverId]`; frontend belum mendaftarkan push target, jadi pengiriman ke perangkat bergantung target yang belum ada. Gagal push hanya di-log.
- **Email** — ⬜ belum diimplementasikan.
- **WhatsApp** — future (di luar MVP).
- **Preferensi notifikasi** per user — ⬜ belum ada tabel/kolom; toggle di halaman pengaturan nonaktif ("Fitur notifikasi akan segera hadir").

## Penulisan

- Ditulis hanya oleh Appwrite Function (API key). Klien tidak bisa membuat notifikasi (collection `$permissions: []`).
- Id dokumen deterministik `ntf` + sha256(`${sourceId}:${kind}`)[0..29] → event ulang menghasilkan 409 yang diabaikan (idempoten).
  - Pengecualian: `expire-stale-claims` memakai `ID.unique()` (tanpa dedup); `mature-pending-balance` (legacy, nonaktif) memakai prefix `tx` + 32 hex.
- Dedup per (`sourceId`, `kind`) berarti notifikasi yang sama **tidak** diulang untuk entitas yang sama, mis. campaign yang di-publish ulang tidak menotifikasi kreator lagi.
- Permission baris selalu `[Permission.read(Role.user(penerima)), Permission.update(Role.user(penerima))]`.
- Kegagalan menulis notifikasi **tidak pernah** menggagalkan Function pemanggil (di-log saja). Pengecualian: `send-chat-notification` melempar error non-409 (→ 500); `expire-stale-claims` tidak membungkus `createDocument` dengan try/catch.
- `message` dibatasi kolom 1000 karakter; kutipan revisi di `notify-order-activity` dipangkas 900 karakter, isi chat di `send-chat-notification` dipangkas 120 karakter.
- Tidak ada kolom URL/metadata; konteks (nominal, judul campaign, alasan) ditulis di dalam `message`.

## Status Baca

- Setiap notifikasi punya flag `isRead`; Function selalu menulis `isRead: false`.
- Ditandai terbaca saat pengguna membuka detail notifikasi, menekan "Tandai Dibaca", atau "Tandai Semua Dibaca".
- Satu notifikasi: update langsung dari klien (`isRead: true`) — diizinkan oleh `Permission.update` baris.
- Semua notifikasi: Function `mark-notifications-read` (hanya baris milik pemanggil yang `isRead === false`).

## Penghapusan

- Pemilik **tidak bisa** menghapus notifikasi (tidak ada `Permission.delete`); notifikasi = log append-only. Detail & konsekuensi di [50_Database.md](50_Database.md).

## Lihat Juga

- [50_Database.md](50_Database.md) — skema field.
- [90_Events.md](90_Events.md) — pemetaan trigger → Function.
