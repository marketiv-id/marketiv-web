# Fase 06 — Mutasi sederhana, chat, file, realtime

- Tanggal: 2026-11-23
- PR: (diisi setelah PR dibuat)
- Status: selesai. Semua tulis non-bisnis/non-uang lewat Route Handler, realtime Supabase jalan, grep bersih, migration 0018–0021 sudah di staging, E2E staging dua akun lulus.

## Status task

### Route mutasi (semua: `requireUser` → zod → client service role → RPC)
- [x] `PATCH /api/profile` ← update-profile (UMKM & kreator, patch parsial, skema form `.partial()`)
- [x] `POST /api/tos` ← accept-tos (`status` | `accept`; versi dari `CURRENT_TOS_VERSION`)
- [x] `POST /api/appeals` ← create-appeal (belum ada UI pemanggil)
- [x] Notifikasi: `PATCH /api/notifications/read`, `PATCH|DELETE /api/notifications/[id]`
- [x] Chat: `POST /api/conversations`, `POST /api/conversations/[id]/messages`, `POST /api/conversations/[id]/read` (satu `UPDATE … WHERE read_at IS NULL`), `PATCH /api/conversations/[id]/archive`

### CRUD yang dulu tulis langsung dari browser
- [x] Campaign: `POST /api/campaigns`, `DELETE /api/campaigns/[id]`, `PATCH /api/campaigns/[id]/draft`, `PUT …/brief`, `POST|DELETE …/assets[/assetId]`. Server memaksa `status='draft'`, `remaining_budget=0`, `umkm_id=uid` (celah #2).
- [x] `PATCH /api/campaigns/[id]/status` (publish, pause, resume)
- [x] Rate card + paket: `/api/rate-cards[/id][/packages[/packageId]]`
- [x] Portfolio + akun sosial: `/api/creator/portfolios[/id]`, `PUT /api/creator/social-accounts` (upsert `(creator_id, platform)`), `DELETE …/[accountId]`

### File
- [x] `POST /api/files/upload-url` (validasi MIME/ukuran/kuota → `createSignedUploadUrl`)
- [x] `POST /api/files/confirm` (RPC `confirm_user_file`: row lock kuota, ukuran/MIME dari `storage.objects`, idempoten per path)
- [x] `DELETE /api/files/[id]` ← delete-file (soft delete + kembalikan kuota, atomik)
- [x] Port `uploadPublicFile`/`deletePublicFile`/`publicFileUrl` → `src/lib/supabase/storage.ts`; `campaign-thumbnail.ts` → `src/lib/supabase/campaign-thumbnail.ts`. `compress-image.ts` tetap.
- [x] `GET /api/files/[id]/url` → `createSignedUrl` (pemilik, pihak order yang dibagikan, atau admin); `?redirect=1` untuk link stabil.

### Realtime
- [x] `useRealtimeTable` + `subscribeToTable` di `src/lib/supabase/realtime.ts`
- [x] `NotificationProvider` → `user_id=eq.{uid}`
- [x] `NegotiationRoomPage`, `NegosiasiRoomView` → `conversation_id=eq.{id}`
- [x] `src/lib/appwrite/realtime.ts` dihapus (termasuk workaround dua channel)

### Push notification
- [x] Hanya in-app (notifikasi chat ditulis di RPC `send_message`). Push FCM → isu lanjutan.

## File dibuat / diubah
- Infra: `src/lib/api/call-api.ts` (POST/PATCH/PUT/DELETE, `:param` dari body), `src/lib/api/routes/{types,read,account,campaign,creator,files}.ts`, `src/lib/supabase/{storage,realtime,campaign-thumbnail}.ts`.
- Route + logika: `src/server/{profile,tos,appeals,notifications,conversations,campaigns,rate-cards,files}/**`, `src/server/creator/writes/**`, `src/app/api/{profile,tos,appeals,notifications,conversations,campaigns,rate-cards,files}/**`, `src/app/api/creator/{portfolios,social-accounts}/**`.
- Service: `src/services/shared/{conversation,notification,user-file}-appwrite.service.ts`, `src/services/auth/tos.service.ts`, `src/services/umkm/umkm-appwrite.service.ts`, `src/services/creator/creator-appwrite.service.ts`.
- Komponen: `NotificationProvider.tsx`, `NegotiationRoomPage.tsx`, `NegosiasiRoomView.tsx` (realtime), `CreateCampaignWizard.tsx` (import thumbnail).
- Dihapus: `src/lib/appwrite/{realtime,storage,campaign-thumbnail}.ts` (+ test).
- SQL: `supabase/migrations/0018_account_chat_writes.sql`, `0019_campaign_writes.sql`, `0020_creator_writes.sql`, `0021_files.sql`; pgTAP `supabase/tests/{account_chat_writes,campaign_writes,creator_writes,files}.test.sql`.
- Tipe: `src/types/supabase.ts`, `admin/src/types/supabase.ts` (regenerasi).

## Keputusan & deviasi dari rencana
- **Upload bucket PUBLIK langsung dari browser** ke `<uid>/<uuid>.<ext>`, bukan lewat `/api/files/upload-url`. Aman karena policy `public_buckets_*_own_folder` (0012) + `file_size_limit`/`allowed_mime_types` bucket ditegakkan server (diverifikasi E2E: folder user lain dan MIME terlarang ditolak). Alur signed-URL + kuota hanya untuk bucket privat `user-files`. "Tidak ada tulis langsung dari browser" berlaku untuk tabel DB.
- **Semua tulis lewat RPC** (`search_path=''`, EXECUTE hanya service_role, kepemilikan dicek di SQL dari `p_user_id` sesi). `confirm_user_file`/`delete_user_file` SECURITY DEFINER karena membaca `storage.objects`; lainnya INVOKER.
- **Error RPC → HTTP**: P0002→404, 42501→403, 22023→400, P0001→409 (pesan Indonesia diteruskan; helper `src/server/conversations/write-rpc.ts`). File memakai `P0001` + `hint`.
- **Celah #2** ditutup tiga lapis: zod membuang `status/remainingBudget/spentAmount/umkmId`, RPC tidak membaca kolom itu, update draft bersyarat `umkm_id`, `status='draft'`, dan `remaining_budget` terakhir dibaca (dana masuk di tengah edit → 409).
- **`publish_campaign`** hanya MEMBACA dana (tolak bila `remaining_budget < budget`), mengunci baris, lalu menulis notifikasi "Campaign Baru" ke semua kreator berprofil lengkap (pengganti trigger `campaign-published`; batas 100 lama = artefak paginasi). Aksi `complete` tidak ada (function lama hanya pause/resume/publish).
- **Buat campaign atomik** (campaign + brief + aset satu transaksi). Duplikat dirangkai di service (baca RLS → salin thumbnail → `createCampaign`).
- **Rate card**: buat + paket atomik; batas 3 paket dijaga row lock baris `users`; hapus ditolak bila ada order berjalan.
- **`send_message`** satu transaksi: pesan + `last_message` + notifikasi in-app lawan bicara (ID notifikasi deterministik `ntf`+sha256 sama dengan function lama).
- **Arsip percakapan**: `getMyConversations` kini membaca kolom arsip milik pemanggil (`umkm_archived`/`creator_archived`). Bug lama: mapper membaca `is_archived` yang tidak pernah ditulis.
- **`fileUrl` file privat** = `<origin>/api/files/<id>/url?redirect=1` (stabil; setiap dibuka dicek hak akses lalu dibuat signed URL baru), disimpan di `deliverables.file_url`.
- **`user_files.shared_with_order_id`** (baru, 0021) pengganti `Permission.read` Appwrite untuk pihak lawan order.
- Perubahan perilaku lain (lebih ketat): profil invalid → 400 (dulu tersimpan tanpa naik status lengkap); kirim pesan & update profil wajib akun aktif; `creatorId` percakapan wajib UUID kreator yang ada; MIME file privat = irisan aturan function lama dan daftar bucket (mis. `video/webm` ditolak); deskripsi campaign maks 2000 (batas kolom; function lama 5000); hapus campaign dengan riwayat pembayaran → 409; portfolio/akun sosial milik orang lain → 404; portfolio tanpa thumbnail disimpan `NULL`.

## Hasil verifikasi
| Perintah / skenario | Hasil |
|---|---|
| `npx tsc --noEmit` (root / admin) | lulus / lulus |
| `npm run lint` (root) | 4 error, 48 warning — sama dengan sebelum fase ini (file tak disentuh) |
| `npx vitest run` (root / admin) | 105 file, 774 test lulus / 12 file, 131 test lulus |
| pgTAP lokal setelah `supabase db reset` (10 file) | 314/314 ok |
| Grep `.insert/.update/.delete/.upsert(` di `src/services`, `src/components`, `src/lib` | tidak ada pemanggilan supabase dari browser (sisa hit: `Permission.update/delete` Appwrite jalur Fase 7 dan kode animasi) |
| Grep `@/lib/appwrite` | hanya `deliverable-appwrite.service.ts`, `umkm-appwrite.service.ts`, `creator-appwrite.service.ts` untuk tulis Fase 7/8 (14× `TODO(fase-07)`, 8× `TODO(fase-08)`, 0× `TODO(fase-06)`) |
| Staging: migration 0018–0021 | diterapkan (MCP), riwayat `0001…0021`; 17 RPC baru tidak bisa dieksekusi anon/authenticated |
| Staging: advisor security | hanya `auth_leaked_password_protection` (lama) |
| E2E staging dua akun (umkm1 + creator1), `next dev` lokal → staging | 36/36 cek lulus: ToS via UI (modal muncul lalu tertutup), chat realtime A→B tampil tanpa reload, tandai dibaca, notifikasi chat in-app, arsip, notifikasi baca/hapus (hapus milik orang lain 404), upload logo ke folder sendiri (folder lain & MIME terlarang ditolak), PATCH profil, campaign draft → patch → brief → aset → publish ditolak 409 (belum didanai) → hapus, celah #2 (body `status/remainingBudget/umkmId` diabaikan), rate card buat/publish/hapus (UMKM 403), portfolio, upsert akun sosial tanpa duplikat, file privat upload-url → signed upload → confirm (idempoten) → signed URL → kreator 403 → hapus, file >20MB 400, 4 halaman dashboard tanpa 5xx, tanpa pageerror |

Data QA di staging dibersihkan (pesan, file, logo, rate card/campaign uji dihapus oleh skrip/SQL; `tos_version` umkm1/creator1 dikembalikan ke `v1`; kota umkm1 tetap "Bandung"). Upload thumbnail/avatar/banner via UI tidak diuji klik-per-klik; jalur storage yang sama (upload publik ke folder sendiri) diuji lewat logo.

## Env / secret baru (nama saja)
- Tidak ada.

## Isu terbuka
- `createFakeSupabase` (`src/test/fake-supabase.ts`) belum mendukung insert/update/delete/upsert dan membuang `hint` error RPC; fork membuat fake lokal (`src/server/rate-cards/__tests__/write-fake.ts`, `src/server/campaigns/__tests__/mutable-fake.ts`, stub storage di `src/server/files/__tests__/storage-stub.ts`). Satukan ke `src/test/` bila menambah test tulis.
- Glob vitest belum mencakup `src/lib/supabase/__tests__` (test hook realtime ada di `src/lib/__tests__/supabase-realtime.test.ts`).
- Belum ada UI pemanggil `POST /api/appeals`.

## Isu untuk fase lain
- **Fase 7:** tulis offer/order/klaim/submission/deliverable/revisi masih Appwrite. URL file deliverable menunjuk domain app user → admin (domain lain) tidak punya sesi di sana (401): butuh route signed URL di app admin. Normalisasi `campaign_assets.source` (`external` vs `external_url`; route baru menulis `external`).
- **Fase 8:** pembayaran campaign/order, cancel payment, withdrawal, approve deliverable masih Appwrite.
- **Fase 9:** `deliverables.file_url` lama masih URL Appwrite; `user_files` lama belum punya `shared_with_order_id`; URL gambar publik lama (logo/avatar/thumbnail) masih URL Appwrite (helper thumbnail menganggapnya "tidak dikenal" dan tidak menghapusnya).
- **Lanjutan:** push FCM/Appwrite Messaging (`send-chat-notification`) belum ada pengganti — tiket terpisah.

## Catatan serah-terima untuk fase berikutnya
- Endpoint baru: tambah entri di `src/lib/api/routes/<domain>.ts` (`:param` diisi dari body) lalu `callApi("<nama>", body)`.
- Pola route tulis: `apiRoute` → `requireUser({ role })` → `parseBody(zod, await readJsonBody(request))` → `createAdminClient()` → `db.rpc(...)` (jangan lepas method dari client) → peta error lewat `write-rpc.ts`.
- RPC uang Fase 8: ikuti pola row lock (`for update`) + idempoten seperti `confirm_user_file`/`creator_create_rate_card`.
- Storage publik: `uploadPublicFile(target, file, userId)`; privat: `uploadUserFileInAppwrite` (nama lama dipertahankan) → upload-url → signed upload → confirm.
- QA staging: lihat catatan magic-link di `progress/fase-05.md`; skrip E2E Fase 6 memakai pola yang sama (Playwright + `fetch` dari halaman + supabase-js dengan token user untuk storage).
