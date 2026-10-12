# Notifications — API

Modul ini tidak punya REST API publik. Akses klien = Appwrite Client SDK (Database) atas baris milik sendiri + satu Function (`mark-notifications-read`).

## Service Frontend (Client SDK)

Lokasi: `src/services/shared/notification.service.ts` (facade, mendukung mock via `DATA_SOURCE_CONFIG.useMockData`) → `src/services/shared/notification-appwrite.service.ts` (Appwrite). Semua mengembalikan `ServiceResult<T>`.

---

### `getNotifications(role)` — [Client SDK]

- **Input**: `role: "umkm" | "creator" | "admin"` (untuk tautan aksi).
- **Proses**: `listDocuments("notifications", [equal("userId", me), orderDesc("$createdAt"), limit(100)])`, berulang dengan `cursorAfter` sampai habis; map ke `AppNotification` (`type` DB → kategori tampilan via `TYPE_ALIAS`, `actionLabel/actionHref` via `ACTION_BY_TYPE`).
- **Return**: `AppNotification[]` — `{ id, type: NotifType, title, message, timestamp, isRead, actionLabel?, actionHref? }`.
- **Akses**: Owner (permission baris `read`).

### `markNotificationRead(id)` — [Client SDK]

- **Proses**: `updateDocument("notifications", id, { isRead: true })`.
- **Akses**: Owner (permission baris `update`).

### `markAllNotificationsRead(ids)` — [Function]

- **Input**: `ids: string[]` — hanya id yang belum dibaca (pemanggil yang menyaring). Array kosong → langsung sukses.
- **Proses**: `executeFunction("mark-notifications-read", { ids })` (sinkron, POST).
- **Akses**: User login.

### `deleteNotification(id)` — [Client SDK] ⚠️

- **Proses**: `deleteDocument("notifications", id)`.
- **Catatan**: selalu ditolak server — baris tidak punya `Permission.delete`. Lihat [50_Database.md](50_Database.md).

---

## Function: `mark-notifications-read`

**Service:** Notification (server-side)

### Input

```json
{
  "ids": ["<notificationId>", "..."]
}
```

### Process

```text
Method harus POST (selain itu 405)
↓
Caller dari header x-appwrite-user-id (kosong → 401)
↓
ids wajib array non-kosong (→ 400 "Daftar ID notifikasi wajib diisi.")
↓
getDocument tiap id (gagal/404 → di-skip)
↓
Update isRead = true hanya bila userId === caller DAN isRead === false
```

### Return

```json
{ "ok": true, "updated": 3 }
```

### Errors

- `405` — method bukan POST.
- `401` — tanpa sesi user.
- `400` — `ids` kosong / bukan array.
- `500` — error internal / env hilang.

### Permission

User login (`execute: ["users"]`). Id milik user lain diabaikan diam-diam (tidak error).

---

## Service Backend (`00_BACKEND/src/services/notification.service.ts`)

Service TypeScript paralel (Client SDK `appwrite`), dipakai test integrasi backend; frontend root memakai service di atas.

- `getNotifications({ limit? })` — `account.get()` → `listDocuments` `equal("userId")`, `orderDesc("createdAt")`, `limit` default 50.
- `markAsRead(id)` — `id` kosong → `NotificationServiceError('validation', 'Notification ID wajib diisi.')`; lalu `updateDocument({ isRead: true })`.
- `markAllAsRead()` — ambil 100 terbaru, `markAsRead` paralel untuk yang `!isRead`.
- Error dipetakan: 401 → `auth`, 403 → `forbidden`, lainnya → `err.type` / `unknown`.
- `notification.service.js` di folder yang sama hanya stub kosong.

---

## System (Internal)

- **Tidak ada** fungsi `createNotification()` bersama. Tiap Function penulis punya helper lokal `notify(databases, env, { userId, sourceId, kind, title, message, type }, log)` yang menulis langsung ke `notifications` dengan API key. Katalog di [90_Events.md](90_Events.md).

---

## Lihat Juga

- [50_Database.md](50_Database.md) — skema data
- [30_Business_Rules.md](30_Business_Rules.md) — aturan penulisan & status baca
- [70_Backend.md](70_Backend.md) — detail Function
