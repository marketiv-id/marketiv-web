# Fase 05 — Jalur baca

- Tanggal: 2026-11-23
- PR: https://github.com/marketiv-id/marketiv-web/pull/40
- Status: selesai. Semua baca jalan dari Supabase, 13 route GET aktif, migration 0015–0017 sudah di staging. Satu deviasi verifikasi: snapshot dibandingkan dengan aturan `main.js`, bukan output Appwrite langsung (lihat "Keputusan & deviasi").

## Status task

### Layer API
- [x] `src/lib/api/call-api.ts` — `callApi<T>(name, body)`, kontrak sama dengan `executeFunction<T>()`; GET mengirim `body` sebagai query string; error = `FunctionExecutionError` (kelas yang SAMA dengan Appwrite, dipindah ke `src/lib/api/errors.ts` dan di-re-export `functions.ts`).
- [x] `src/server/http.ts` — `apiRoute(scope, handler)`, `json`, `parseQuery` (zod), `parseBody`, `throwIfDbError`/`unwrap` (PGRST116→404, 22P02/22023→400, 23505/23503/P0001→409, 42501→403, PGRST301/303→401).

### Baca langsung (browser → supabase-js + RLS)
- [x] Mapper: `src/services/shared/legacy-doc.ts` — `rowToDoc(table, row)` membalik pemetaan kolom Fase 2 (`$id`, `$createdAt`, nama kolom Appwrite, jsonb → string JSON) sehingga mapper DTO lama dipakai apa adanya. Dibuat dari `scripts/migration/mapping.ts`.
- [x] Port baca:
  - `umkm-appwrite.service.ts` + `ratecard-review.service.ts` — 24 fungsi
  - `creator-appwrite.service.ts`, `conversation/deliverable/notification/user-file-appwrite.service.ts`, `tos.service.ts` (status) — 18 fungsi
  - `session.service.ts` — sudah Supabase sejak Fase 4; ditambah `getCurrentUserId()`
- [x] Padanan Query dipakai sesuai tabel di dokumen fase.
- [x] `requireUserId()` tidak lagi 3 read: userId dari cache `AuthProvider` (`src/services/auth/session-cache.ts`), cadangan `auth.getSession()` (cookie, tanpa jaringan kecuali refresh).

### 13 function baca-saja → GET
| Function lama | Route | Agregasi |
|---|---|---|
| get-umkm-dashboard-summary | `GET /api/umkm/dashboard-summary` | RPC `umkm_dashboard_summary` |
| get-umkm-finance-summary | `GET /api/umkm/finance-summary` | RPC `umkm_finance_summary` |
| get-umkm-profile | `GET /api/umkm/profile` | 1 query |
| get-umkm-negotiations | `GET /api/umkm/negotiations[?conversationId]` | RPC `umkm_negotiation_context` |
| get-umkm-ratecard-reviews | `GET /api/umkm/ratecard-reviews[?orderId]` | RPC `umkm_ratecard_review_context` |
| get-creator-dashboard-summary | `GET /api/creator/dashboard-summary` | RPC `creator_dashboard_summary` |
| get-creator-profile | `GET /api/creator/profile` | 3 query + RPC `creator_starting_prices` |
| get-creator-negotiations | `GET /api/creator/negotiations[?conversationId]` | RPC `creator_negotiation_rows` |
| get-creator-directory | `GET /api/creator/directory?limit&cursor` / `?creatorId` | RPC `creator_directory_page` (keyset) |
| get-admin-dashboard-summary | admin `GET /api/admin/dashboard-summary` | 3 count `head:true` paralel |
| get-admin-submission-queue | admin `GET /api/admin/submission-queue` | 3 round-trip `.in()` |
| get-admin-withdrawal-queue | admin `GET /api/admin/withdrawal-queue` | 2 round-trip |
| get-admin-ratecard-deliverable-queue | admin `GET /api/admin/ratecard-deliverable-queue` | RPC `admin_ratecard_deliverable_queue` (dulu 3 query per deliverable) |

- [x] Agregasi berat → RPC. Semua RPC: `stable`, `security invoker`, `set search_path = ''`, EXECUTE hanya `service_role` (dicabut dari public/anon/authenticated). Dipanggil route setelah `requireUser`/`requireAdmin`, dengan `p_*_id` = userId sesi.

## File dibuat / diubah
- Infra: `src/lib/api/{errors,call-api}.ts`, `src/server/http.ts`, `src/services/shared/legacy-doc.ts`, `src/services/auth/session-cache.ts`, `src/services/auth/session.service.ts` (`getCurrentUserId`), `src/components/providers/AuthProvider.tsx` (isi cache), `src/services/shared/service-result.ts` (`requireUserId` baru, peta kode error PostgREST), `src/lib/appwrite/functions.ts` (re-export error), `src/test/fake-supabase.ts`, `vitest.config.mts`.
- Route + logika: `src/server/{umkm,creator}/*.ts`, `src/app/api/{umkm,creator}/*/route.ts`.
- Admin: `admin/src/server/{http,http-error,require-admin}.ts`, `admin/src/server/admin/*.ts`, `admin/src/app/api/admin/*/route.ts`, `admin/src/lib/api/{errors,call-api}.ts`, service submissions/withdrawals/ratecard-validations/dashboard, `admin/src/proxy.ts` (`/api/**` tidak di-redirect ke `/login`, route membalas 401 JSON), `admin/src/test/*`, `admin/vitest.config.mts`.
- Service: lihat "Port baca" di atas. Komponen hanya diberi komentar `TODO(fase-06)` (realtime/upload).
- SQL: `supabase/migrations/0015_read_umkm.sql`, `0016_read_creator.sql`, `0017_read_admin.sql`; pgTAP `supabase/tests/read_{umkm,creator,admin}.test.sql`.
- Tipe: `src/types/supabase.ts`, `admin/src/types/supabase.ts` (regenerasi).
- Test baru/diubah: ±25 file vitest (root + admin).

## Keputusan & deviasi dari rencana
- **Snapshot test tidak membandingkan output Appwrite langsung.** Appwrite staging masih `402 billing_limit_exceeded` (Fase 2), data asli belum dimuat (Fase 9), dan `node-appwrite` tidak terpasang di root. Gantinya: nilai harapan dihitung dari aturan `main.js` lalu diuji dua sisi — pgTAP menguji SQL di Postgres sungguhan, vitest menguji DTO lengkap (`toEqual` eksplisit). Ditambah QA browser terhadap staging (bawah). Perbandingan langsung dengan produksi bisa dilakukan saat Fase 9 (data asli dimuat).
- **Route memakai client service role setelah sesi diverifikasi** (pola arsitektur target); filter kepemilikan selalu eksplisit di query/RPC. RPC `security invoker` (service role melewati RLS) + EXECUTE hanya service_role.
- **`rowToDoc` alih-alih menulis ulang mapper.** Mapper DTO lama dipertahankan; konversi row→Doc di satu tempat.
- **Guard lebih ketat dari Function lama:** endpoint UMKM/kreator kini wajib role yang benar dan status `active` (dulu sebagian tidak mengecek role/status → angka nol). Direktori kreator wajib baris `users` aktif.
- **Batas 5000 dokumen hilang:** total dihitung penuh, `isTruncated` selalu `false`. Identik selama data < 5000 (produksi ±95 baris).
- **Direktori kreator:** cursor Appwrite `cursorAfter($id)` → keyset `(rating desc, id)`; bentuk `nextCursor` tetap id profil. `limit` bukan angka → 400.
- **Antrean validasi rate card (admin):** saring dulu baru batasi 100 (dulu: ambil 100 lalu saring, kandidat valid di luar 100 hilang).
- **Kolom yang tidak ada di Postgres** jatuh ke default lama: `creator.username` (`"@creator"` / `null`), `tiktokHandle`, `umkm.ownerName`, fallback `brandName`.
- **`ownerName`/nama kreator** dari `user_metadata` (`display_name` → `full_name` → `name`), padanan nama akun Auth Appwrite.
- **Format timestamp** mengikuti PostgREST (`…+00:00`, tanpa `.000`); nilai sama. `offers.deadline` kini timestamptz penuh.
- **Tie-break deterministik** (`created_at desc, id`) untuk offer/deliverable/akun sosial.
- **Notifikasi:** paginasi offset `.range` dengan urutan `created_at desc, id desc` (keyset tunggal bisa melompati baris ber-`created_at` sama).
- **Hitungan submission UMKM** dibaca per 1000 sampai batas lama 5000 (PostgREST memotong di 1000).
- **ToS:** status dibaca langsung dari baris `users` sendiri. Versi aktif `NEXT_PUBLIC_CURRENT_TOS_VERSION` (default `v3.1`, sama dengan Function).
- **Baca di dalam fungsi tulis tetap Appwrite** (guard/pra-cek), supaya baca dan tulis memakai DB yang sama sampai tulisnya dipindah. Ditandai TODO bersama tulisnya.
- Penanda: 33× `TODO(fase-06)`, 14× `TODO(fase-07)`, 8× `TODO(fase-08)`.

## Hasil verifikasi
| Perintah / skenario | Hasil |
|---|---|
| `npx tsc --noEmit` (root) | lulus |
| `npm run lint` (root) | 4 error, 48 warning — keempat error sudah ada sebelum fase ini, di file yang tidak disentuh (`FloatingDemoBar.tsx`, `create-campaign.autodraft.ts`, `BriefGuidelineStep.tsx`, `BudgetQuotaStep.tsx`) |
| `npx vitest run` (root) | 94 file, 585 test lulus |
| admin: `npx tsc --noEmit` / `npm run lint` / `npx vitest run` | lulus / 0 error (6 warning lama) / 12 file, 131 test lulus |
| pgTAP lokal setelah `supabase db reset` (6 file) | 182/182 ok (schema 29, auth 22, rls 71, read_umkm 24, read_creator 27, read_admin 9) |
| Staging: migration 0015–0017 | diterapkan via MCP, versi riwayat `0015`…`0017` |
| Staging: hak EXECUTE 9 RPC baru | anon ✗, authenticated ✗, service_role ✓ |
| Staging: advisor security | hanya `auth_leaked_password_protection` (lama) |
| QA browser: `next dev` lokal → Supabase staging, sesi akun fixture (umkm1, creator1, admin) | 13 halaman UMKM, 12 kreator, 4 admin terbuka; semua `/api/*` dan `/rest/v1/*` 200 setelah fix di bawah; data cocok dengan hasil RPC |
| Bug ditemukan QA | `callReadRpc` melepas `db.rpc` dari client → semua route UMKM berbasis RPC 500. Diperbaiki (`.bind(db)`); fake supabase kini menolak `rpc()` tanpa receiver (16 test gagal tanpa fix) |

Catatan QA: fixture staging punya `tos_version = v1` → modal ToS menutup dashboard dan tombol setuju masih jalur tulis Appwrite. Untuk QA, `tos_version` umkm1/creator1 diubah sementara ke `v3.1` lalu dikembalikan ke `v1` (`tos_accepted_at` diisi `now()` bila sebelumnya kosong; nilai lamanya tidak dicatat). Sisa error di console hanya realtime Appwrite dan "tandai dibaca" percakapan (keduanya Fase 6).

## Env / secret baru (nama saja)
- `NEXT_PUBLIC_CURRENT_TOS_VERSION` — opsional, default `v3.1`; set bila versi ToS produksi berbeda. Route accept ToS (Fase 6) wajib memakai konstanta yang sama (`CURRENT_TOS_VERSION` di `tos.service.ts`).

## Isu terbuka
- Snapshot langsung terhadap output Appwrite produksi belum dilakukan — usulan: jalankan perbandingan route lama vs baru saat data asli dimuat di Fase 9.
- Link lama berisi ID kreator Appwrite (bukan UUID) kini menghasilkan error kode "unknown" (22P02) di halaman UMKM, bukan daftar kosong. Route direktori sendiri menjawab 404.

## Isu untuk fase lain
- **Fase 6:** semua TULIS masih Appwrite dan tidak jalan karena sesi Appwrite hilang sejak Fase 4 (sesuai rencana). Prioritas QA: accept ToS (modal ToS memblokir dashboard untuk akun dengan versi lama), tandai dibaca percakapan, realtime (NotificationProvider, ruang negosiasi). Hapus fungsi `load*` versi Appwrite di service bersama tulisnya.
- **Fase 7:** review submission / deliverable / offer di app user & admin masih Appwrite. Tipe `RateCardValidationItem` (admin) tidak cocok dengan DTO (`creatorId` datar vs `creator{}`) — rapikan.
- **Fase 8:** review withdrawal (admin), payment, withdrawal, approve deliverable masih Appwrite.
- **Fase 10/11:** app admin masih butuh env Appwrite (`lib/admin/appwrite.ts` melempar saat import) sampai jalur tulis admin pindah.
- `callReadRpc`/cast RPC di `src/server/{umkm,creator}` dan admin bisa diketatkan memakai tipe hasil regenerasi.

## Catatan serah-terima untuk fase berikutnya
- Pola route: `export const GET = apiRoute("<scope>", async (request) => { const { user } = await requireUser({ role }); … createAdminClient() … })`. Untuk tulis, `parseBody` + RPC.
- Panggil RPC dengan `db.rpc(...)` atau `db.rpc.bind(db)` — jangan lepas method dari client.
- Service baru: baca langsung `createClient()` (browser) + `rowToDoc`; agregasi lewat `callApi("<nama>")` (tambah entri di `API_ROUTES`).
- Test: `createFakeSupabase` (`src/test/fake-supabase.ts`, salinan di `admin/src/test/`); mock `@/services/auth/session.service` harus menyediakan `getCurrentUserId`.
- QA staging tanpa email: sesi akun fixture bisa dibuat dengan `auth.admin.generateLink({ type: "magiclink" })` + `verifyOtp({ token_hash })` lewat `@supabase/ssr` (cookie `sb-<ref>-auth-token`), lalu `next dev` dengan `NEXT_PUBLIC_SUPABASE_*` staging. Token jangan di-commit.
- Setelah mengubah skema: `npm run db:types` (stack lokal hidup; `env -u SUPABASE_SERVICE_ROLE_KEY -u SUPABASE_URL -u SUPABASE_ANON_KEY` di sesi cloud).
