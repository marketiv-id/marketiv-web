# Notifications — Testing

## Test yang Ada

| Lokasi | Cakupan |
| --- | --- |
| `00_BACKEND/tests/integration/functions.test.ts` — `mark-notifications-read function` | Hanya menandai unread milik caller; baris user lain diabaikan |
| `00_BACKEND/tests/integration/functions.test.ts` — `campaign-claimed` | UMKM pemilik dinotifikasi saat klaim terverifikasi |
| `00_BACKEND/tests/integration/functions.test.ts` — `verify-kyc` | Notifikasi KYC dibuat; idempoten (tanpa duplikat) |
| `00_BACKEND/tests/integration/services.test.ts` — `notification.service` | `markAsRead`, `markAllAsRead` + `getNotifications` (service backend) |
| `00_BACKEND/tests/unit/services-validation.test.ts` | `markAsRead('')` → `validation` / "Notification ID wajib diisi." |
| `src/components/features/shared/__tests__/NotificationProvider.test.tsx` | Badge `9+`, load + satu langganan realtime, optimistic mark/mark-all/delete, rollback via reload, loading state |

## Service Layer Backend (`00_BACKEND/src/services/notification.service.ts`)

- `getNotifications()` → list `userId === user.$id`, `orderDesc('createdAt')`, limit default 50; `limit` opsional.
- `markAsRead(id)` → `isRead = true`; `id` kosong → `NotificationServiceError('validation', 'Notification ID wajib diisi.')`.
- `markAllAsRead()` → ambil 100 notifikasi, `markAsRead` untuk yang `!isRead`.

## Service Frontend (`src/services/shared/notification-appwrite.service.ts`)

- `getNotificationsFromAppwrite(role)` → paginasi cursor sampai habis (>100 baris ikut termuat).
- `type` tak dikenal → kategori `sistem`; `actionHref` sesuai role.
- `markAllNotificationsReadInAppwrite([])` → sukses tanpa memanggil Function.
- `deleteNotificationInAppwrite` → gagal (tanpa `Permission.delete`), provider reload.

## Function `mark-notifications-read`

- Non-POST → 405; tanpa `x-appwrite-user-id` → 401; `ids` kosong/bukan array → 400.
- Id milik user lain / tidak ada → diabaikan; `updated` hanya menghitung baris unread milik caller.

## Pembuatan Notifikasi (Function penulis)

- Tiap trigger di [90_Events.md](90_Events.md) menghasilkan tepat satu baris per penerima dengan `userId`, `type`, `title` sesuai katalog.
- Permission baris = `read` + `update` untuk penerima; user lain tidak bisa membaca.
- Event dikirim ulang → id deterministik sama → 409 diabaikan, tidak ada duplikat (kecuali `expire-stale-claims` yang memakai `ID.unique()`).
- Gagal menulis notifikasi tidak menggagalkan alur utama (dana/status tetap berpindah).
- `notify-order-activity`: baris dengan `version` → UMKM; dengan `requestedBy` → kreator; lainnya → `ignored`.
- `send-chat-notification`: penerima = participant bukan pengirim; gagal push → `pushSent: false`, notifikasi tetap ada.

## Status Baca

- Notifikasi baru `isRead = false`.
- Buka detail / "Tandai Dibaca" → `isRead = true`.
- "Tandai Semua Dibaca" → semua unread user terbaca via Function.
- Unread count (badge bell & sidebar) = jumlah `!isRead` di daftar yang termuat.

## Pengiriman

- In-App: notifikasi muncul di notification center & dropdown tanpa refresh (realtime → reload).
- Push: hanya chat, dan hanya bila user punya push target (belum didaftarkan frontend).
- Email: **belum diimplementasikan** — tidak ada yang diuji.
