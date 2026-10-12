# Notifications — Database

Modul Notifications memiliki collection `notifications`. Inilah satu-satunya lokasi skemanya. Sumber: `appwrite.config.json` (tabel `notifications`) dan `appwrite/generate_appwrite_json.cjs`.

## `notifications`

**Purpose:** log notifikasi in-app per user, ditulis oleh Appwrite Functions, dibaca & ditandai-dibaca oleh pemiliknya.

### Attributes

| Name | Type | Required | Notes |
|------|------|----------|-------|
| `userId` | `string` (255) | ya | Penerima notifikasi (Appwrite user `$id`) |
| `title` | `string` (255) | ya | |
| `message` | `string` (1000) | ya | Konteks (nominal, judul, alasan) ditulis di sini |
| `type` | `string` (50) | ya | String bebas, **tanpa enum**. Nilai yang dipakai: lihat [90_Events.md](90_Events.md) |
| `isRead` | `boolean` | tidak | default `false`; Function selalu menulis `false` eksplisit |
| `createdAt` | `datetime` | tidak | Diisi Function (`new Date().toISOString()`); frontend fallback ke `$createdAt` |

Tidak ada kolom tautan/aksi, `sourceId`, atau metadata JSON.

### Document ID

- Umumnya deterministik: `ntf` + 29 hex pertama `sha256("${sourceId}:${kind}")` (32 karakter) — dedup event ulang (409).
- Pengecualian: `expire-stale-claims` → `ID.unique()`; `mature-pending-balance` (legacy, nonaktif) → `tx` + 32 hex.

### Relations

- `userId` → user Appwrite / `users.userId` (many-to-one, tanpa relasi formal).

### Indexes

- `idx_userId` — `userId` (key, ASC) — ambil notifikasi per pengguna.
- `idx_isRead` — `isRead` (key, ASC).
- `idx_createdAt` — `createdAt` (key, DESC).

Tidak ada index komposit `userId + createdAt`. Frontend mengurutkan berdasarkan `$createdAt` (atribut sistem), service backend `00_BACKEND/src/services/notification.service.ts` berdasarkan `createdAt`.

### Permissions

- Collection: `$permissions: []`, `rowSecurity: true` → akses klien **hanya** dari permission per-baris.
- Baris (dipasang setiap Function penulis): `[Permission.read(Role.user(userId)), Permission.update(Role.user(userId))]`.
- Read: owner.
- Update: owner (dipakai untuk `isRead`; secara teknis permission `update` tidak membatasi kolom).
- Create: hanya Function (API key, scope `documents.write`).
- Delete: tidak ada — lihat di bawah.

### Function Penulis

25 Function menulis ke tabel ini (23 aktif; `withdrawal-callback` dan `mature-pending-balance` `enabled: false` di `appwrite.config.json`), semuanya dengan permission baris di atas:

`create-order`, `create-escrow`, `release-escrow`, `refund-escrow`, `refund-order`, `notify-order-activity`, `send-chat-notification`, `review-ratecard-deliverable`, `auto-approve-orders`, `campaign-published`, `campaign-claimed`, `submit-campaign-proof`, `review-submission`, `calculate-campaign-reward`, `expire-stale-claims`, `mature-pending-balance`, `request-withdrawal`, `review-withdrawal`, `withdrawal-callback`, `verify-kyc`, `suspend-user`, `unsuspend-user`, `create-appeal`, `review-appeal`, `fee-rate-flip`.

`mark-notifications-read` hanya meng-update `isRead`.

### Tidak Ada `delete` — Disengaja

Pemilik bisa menandai sudah dibaca, tidak bisa menghapus. Notifikasi jadi log yang hanya bertambah. Itu diterima karena sebagian besar isinya jejak perpindahan uang (escrow ditahan, dana cair, fee dipotong, refund, penarikan) yang berguna sebagai riwayat.

**Drift UI (per kode saat ini):** tombol "Hapus Notifikasi" masih ada di `NotificationView`, `NotificationHeaderDropdown` (via dialog detail), dan `AppNotificationDetailDialog`; `deleteNotificationInAppwrite` memanggil `databases.deleteDocument` yang akan ditolak server, lalu provider memuat ulang daftar. Keputusan "tanpa delete" belum tercermin di UI.

Kalau nanti diputuskan pemilik boleh menghapus, perubahannya menyentuh **seluruh Function penulis di atas** (tambah `Permission.delete(Role.user(userId))`), redeploy semuanya. Jangan menambahkannya di sebagian Function saja — hasilnya notifikasi yang bisa dihapus atau tidak tergantung siapa penulisnya. Baris lama tetap tanpa `delete` kecuali di-backfill.

## Lihat Juga

- [30_Business_Rules.md](30_Business_Rules.md) — trigger, kanal, status baca.
- [90_Events.md](90_Events.md) — event yang menulis ke collection ini.
