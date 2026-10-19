# Fase 6 — Mutasi sederhana, chat, file, realtime

**Bobot:** M

## Tujuan

Semua tulis yang tidak menyentuh uang dan tidak termasuk alur bisnis panjang pindah ke route. Setelah fase ini tidak ada lagi tulis langsung dari browser.

## Task

### Route mutasi
Polanya sama untuk semua route: `requireUser` → validasi zod → client service role.

- [ ] `PATCH /api/profile` ← `update-profile`
- [ ] `POST /api/tos` ← `accept-tos` (`status` dan `accept`)
- [ ] `POST /api/appeals` ← `create-appeal`
- [ ] Notifikasi:
  - `PATCH /api/notifications/read` ← `mark-notifications-read`
  - `PATCH /api/notifications/[id]` dan `DELETE` (sebelumnya update/delete langsung dari browser)
- [ ] Chat:
  - `POST /api/conversations` ← `create-conversation`
  - `POST /api/conversations/[id]/messages` ← `send-message`
  - `POST /api/conversations/[id]/read` ← `mark-conversation-read`. Saat ini browser menjalankan loop sampai 200 update; diganti satu `UPDATE … WHERE`.
  - `PATCH /api/conversations/[id]/archive` ← `patch-conversation-archive`

### CRUD yang dulu tulis langsung dari browser
- [ ] Campaign draft:
  - `POST/DELETE /api/campaigns`, `PATCH /api/campaigns/[id]/draft` ← `patch-campaign-draft`
  - Brief dan asset: `PUT /api/campaigns/[id]/brief`, `POST/DELETE /api/campaigns/[id]/assets`
  - Server **memaksa** `status='draft'`, `remaining_budget=0`, `umkm_id=uid` (menutup celah #2)
- [ ] `PATCH /api/campaigns/[id]/status` ← `patch-campaign-status` (publish, pause, complete)
- [ ] Rate card dan paket: `POST/PATCH/DELETE /api/rate-cards`, `/api/rate-cards/[id]/packages`
- [ ] Portfolio dan social account: `/api/creator/portfolios`, `/api/creator/social-accounts` (upsert pada `(creator_id, platform)`)

### File
- [ ] `POST /api/files/upload-url`:
  - Validasi bucket, MIME, dan ukuran sesuai `BUCKET_RULES`.
  - Cek kuota `user_storage_usage`.
  - Kembalikan `createSignedUploadUrl(path)`.
  - Browser upload langsung, sehingga tidak kena batas body Vercel 4,5 MB.
- [ ] `POST /api/files/confirm`: catat ke `user_files` dan tambah `used_bytes` (port `validate-and-upload`).
- [ ] `DELETE /api/files/[id]` ← `delete-file`.
- [ ] Port `uploadPublicFile`, `deletePublicFile`, `publicFileUrl` (→ `getPublicUrl`), dan `campaign-thumbnail.ts` (parsing URL ke path Supabase). `compress-image.ts` tetap.
- [ ] File privat diakses lewat `GET /api/files/[id]/url`, yang mengembalikan `createSignedUrl` setelah cek hak akses (pemilik atau pihak order).

### Realtime
- [ ] Buat hook `useRealtimeTable(table, filter, onChange)` di `src/lib/supabase/realtime.ts`.
- [ ] `NotificationProvider.tsx` → filter `user_id=eq.{uid}`.
- [ ] `NegotiationRoomPage.tsx` dan `NegosiasiRoomView.tsx` → filter `conversation_id=eq.{id}`.
- [ ] Hapus `src/lib/appwrite/realtime.ts`, termasuk workaround dua channel.

### Push notification
- [ ] `send-chat-notification` (Appwrite Messaging push): untuk sementara cukup notifikasi in-app. Push FCM dibuat sebagai tiket terpisah bila dibutuhkan.

## Verifikasi
- Grep memastikan tidak ada lagi `.insert/.update/.delete/.upsert` supabase dari kode browser (`src/services`, `src/components`).
- E2E di staging dengan dua akun: chat realtime, notifikasi muncul, upload avatar/logo/portfolio/thumbnail, upload file privat, CRUD rate card, campaign draft → publish.
