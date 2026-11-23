# Fase 07 — Alur campaign & order rate card

- Tanggal: 2026-11-23
- PR: https://github.com/marketiv-id/marketiv-web/pull/42
- Status: selesai (tanpa uang). Alur campaign dan rate card berjalan end-to-end di staging lewat Route Handler + RPC; semua titik uang adalah stub status untuk Fase 8 (daftar di bawah). Migration 0022–0024 sudah di staging, job `pg_cron` terdaftar.

## Status task

### Campaign mode
- [x] Klaim & batal klaim: `POST|DELETE /api/campaigns/[id]/claim` → RPC `claim_campaign` (lock campaign; cek `active`, `remaining_budget > 0`, profil lengkap, kuota, klaim ganda) / `unclaim_campaign` (hapus + kembalikan slot). Notifikasi "Campaign Di-klaim" ke UMKM di RPC (pengganti `campaign-claimed`).
- [x] `POST /api/campaigns/[id]/submissions` ← submit-campaign-proof → RPC `submit_campaign_proof`; `after(() => runFraudPrecheck(id))` (port `ai-fraud-precheck`) → RPC `record_fraud_check` (`fraud_checks` + `campaign_submissions.fraud_status`).
- [x] Review submission: RPC `review_submission(p_reviewer_id, p_submission_id, p_decision, p_note, p_as_admin, p_views, p_observation_hours)`; dipakai admin `POST /api/admin/submissions/[id]/review` dan route user-app `POST /api/submissions/[id]/review` (non-admin → 403, sama dengan function lama). Kredit reward = stub Fase 8.
- [x] Notifikasi `campaign-published`: sudah di `publish_campaign` (0019, Fase 6).
- [x] `POST /api/ai/brief` ← ai-brief: user dari sesi, `campaignId` wajib milik user (celah #4). Vertex AI → Gemini API key → OpenRouter. Tanpa kunci → 503 "Fitur AI belum dikonfigurasi.".

### Rate card order
- [x] `POST /api/offers` ← create-offer (RPC `create_offer`: lock percakapan, tolak offer pending ganda / deal aktif, validasi paket, kartu offer di chat)
- [x] `POST /api/offers/[id]/accept` → RPC `accept_offer`: lock offer → `accepted` → order `pending_payment` (unique `offer_id`, idempoten) → pesan sistem → notifikasi, satu transaksi (pengganti update browser + event `create-order`)
- [x] `POST /api/offers/[id]/reject`, `DELETE /api/offers/[id]`
- [x] `POST /api/orders/[id]/cancel` ← cancel-order (hanya `pending_payment`)
- [x] `POST /api/orders/[id]/deliverables` ← submit-ratecard-deliverable (+ `review_deadline_at` 3 hari ← track-order-review, notifikasi ← notify-order-activity)
- [x] `POST /api/orders/[id]/revisions` ← request-ratecard-revision (+ batas revisi, sync-order-revision, notifikasi)
- [x] `POST /api/deliverables/[id]/approve` — STUB status (`approve_deliverable`), tanpa `release_escrow`
- [x] Admin `POST /api/admin/ratecard-deliverables/[id]/review` ← review-ratecard-deliverable (RPC `review_ratecard_deliverable`, 0024)

### Cron (`pg_cron`, fungsi di schema `private`)
- [x] `private.expire_stale_claims()` — `0 */6 * * *` (job `expire-stale-claims`)
- [x] `private.auto_approve_orders()` — `0 * * * *` (job `auto-approve-orders`; juga pengingat H-1)
- [x] Fungsi job di schema `private` (tidak diekspos Data API)
- [x] `pg_net` + `/api/cron/*`: **tidak dibutuhkan** — kedua job murni SQL, jadi tidak ada route cron dan `CRON_SECRET` belum dipakai.

### Helper bersama
- [x] `src/server/notifications/notify.ts` — `notificationId()` (`ntf` + 29 hex sha256(`sourceId:kind`), sama dengan function lama dan `private.notification_id`) + `notify()` (upsert `ignoreDuplicates`, tidak pernah melempar). Notifikasi yang harus atomik ditulis di dalam RPC.

## Stub untuk Fase 8 (WAJIB dikerjakan)
| Lokasi | Yang belum ada |
|---|---|
| `review_submission` cabang approve (0022, `src/server/campaign-flow/review.ts`) | `credit_campaign_reward` (views × reward/1000 → wallet kreator, kurangi `remaining_budget`/tambah `spent_amount`, transaksi ledger idempoten). Notifikasi `submission_approved` sudah ditulis — pakai kind yang sama supaya tidak dobel. |
| `approve_deliverable` (0023), `src/server/orders/orders.ts`, route approve, `deliverable-appwrite.service.ts` | `release_escrow` (dana ke wallet kreator, order → `completed`) |
| `private.auto_approve_orders()` (0023) | `release_escrow` untuk deliverable yang di-auto-approve (sekarang hanya status + `auto_approved`) |
| `cancel_order` (0023) | `cancel_payment` untuk payment pending yang menyertai order |
| Smoke: "top-up campaign" dan "bayar order" | Diganti update service role (`remaining_budget = budget`, order → `in_progress`); Fase 8 mengganti dengan pembayaran Midtrans + `create_escrow` |
| UMKM: create payment campaign/order, cancel payment; kreator: withdrawal; admin: review-withdrawal | Masih Appwrite (`TODO(fase-08)`) |

## File dibuat / diubah
- Infra: `src/server/notifications/notify.ts`, `src/test/fake-supabase.ts` + `admin/src/test/fake-supabase.ts` (tulis + hint), `src/lib/api/routes/flow.ts`, `src/lib/api/call-api.ts`.
- Campaign: `src/server/campaign-flow/{shared,claims,submissions,review,fraud}.ts`, `src/server/ai/{providers,brief}.ts`, `src/app/api/campaigns/[campaignId]/{claim,submissions}/route.ts`, `src/app/api/submissions/[submissionId]/review/route.ts`, `src/app/api/ai/brief/route.ts`.
- Order: `src/server/{offers,orders}/*.ts`, `src/app/api/{offers,orders,deliverables}/**`.
- Admin: `admin/src/server/{body,rpc-error}.ts`, `admin/src/server/admin/{review-submission,review-ratecard-deliverable,file-url}.ts`, `admin/src/app/api/admin/{submissions/[submissionId]/review,ratecard-deliverables/[deliverableId]/review,files/[fileId]/url}/route.ts`, `admin/src/lib/api/call-api.ts` (`:param`), service submissions & ratecard-validations, antrean validasi (URL file → route admin).
- Service: `creator-appwrite.service.ts` (klaim, bukti, batal klaim, accept/reject offer), `umkm-appwrite.service.ts` (AI brief, review submission, offer, cancel order), `deliverable-appwrite.service.ts` (bebas Appwrite). Import Appwrite `databases`/`Query`/`appwriteConfig` dihapus; yang tersisa hanya `executeFunction` untuk tulis Fase 8.
- SQL: `supabase/migrations/0022_campaign_flow.sql`, `0023_order_flow.sql`, `0024_admin_reviews.sql`; pgTAP `supabase/tests/{campaign_flow,order_flow,admin_reviews}.test.sql`.
- Tipe: `src/types/supabase.ts`, `admin/src/types/supabase.ts`.
- Smoke: `scripts/migration/smoke-order-flow.ts` (port `00_BACKEND/appwrite/ops/smoke-order-flow.mjs`).

## Keputusan & deviasi dari rencana
- **Event trigger → pemanggilan eksplisit.** `create-order`, `campaign-claimed`, `track-order-review`, `notify-order-activity`, `sync-order-revision` tidak ada lagi sebagai event; efeknya ada di RPC yang sama dengan aksinya (satu transaksi).
- **Semua RPC baru**: `search_path=''`, EXECUTE hanya `service_role`, kepemilikan dari `p_*_id` sesi, row lock; urutan lock campaign → claim → submission.
- **`review_submission` hanya admin** (seperti function lama). Route user-app tetap ada dan memetakan `isAdminUser()`; UMKM mendapat 403.
- **Klaim** ditolak 409 sebelum baris dibuat bila kuota penuh (dulu dibuat lalu di-expire async); juga ditolak bila `remaining_budget <= 0`. `claim_limit = 0` = tidak menerima klaim (guard lama), sementara `creator_dashboard_summary` (0016) menghitung 0 sebagai tanpa batas — inkonsistensi warisan, lihat Isu terbuka.
- **Accept offer** mengecek syarat (UMKM aktif, kreator setuju ToS versi berjalan) SEBELUM mengubah offer; gagal → 409 dan offer tetap `pending` (dulu offer `accepted` tapi order gagal dibuat).
- **Deliverable `storage`**: URL dibuat server (`/api/files/<id>/url?redirect=1`), file wajib milik kreator & aktif, `shared_with_order_id` diisi; file yang sudah dibagikan ke order lain → 409.
- **Pengingat H-1** hanya untuk tenggat 24 jam ke depan yang belum lewat; approve mengosongkan `review_deadline_at`.
- **Review deliverable admin**: retry identik (admin & keputusan sama) → sukses `alreadyReviewed`; keputusan berbeda setelah final → 409.
- **AI**: provider lewat REST `fetch` (tanpa SDK). Fraud precheck tanpa kunci AI tetap menghitung skor dari cek URL/platform/duplikat; analisis caption dilewati, tidak memblokir review.
- **Observasi 72 jam**: `eligibleAt` sekarang di `hint` error RPC (body 409 tidak lagi membawa field itu; UI tidak memakainya).
- Bukti kerja → 201 (dulu 200). Notifikasi baru `submission_approved` ke kreator.

## Hasil verifikasi
| Perintah / skenario | Hasil |
|---|---|
| `npx tsc --noEmit` (root / admin) | lulus / lulus |
| `npm run lint` (root / admin) | 4 error lama (file tak disentuh), 47 warning / 0 error, 6 warning lama |
| `npx vitest run` (root / admin) | 113 file, 918 test lulus / 15 file, 165 test lulus |
| pgTAP lokal setelah `supabase db reset` (13 file) | 402/402 ok |
| Staging: migration 0022–0024 | diterapkan (MCP), riwayat `0001…0024`; 17 fungsi baru tidak bisa dieksekusi anon/authenticated |
| Staging: `cron.job` | `expire-stale-claims 0 */6 * * *`, `auto-approve-orders 0 * * * *` |
| Staging: panggil manual `private.expire_stale_claims()` / `private.auto_approve_orders()` | `0` / `{approvedCount: 0, reminderCount: 0}` (tidak ada data jatuh tempo; logika diuji pgTAP) |
| Smoke `scripts/migration/smoke-order-flow.ts` (app user + admin `next dev` → Supabase staging, akun umkm1/creator2/admin) | **31/31 lulus**: ToS via route; A. draft → publish ditolak (belum didanai) → [stub top-up] → publish → klaim → klaim ganda 409 → bukti → fraud precheck tercatat (`after()`) → review UMKM 403 → admin approve < 72 jam 409 → [stub waktu] → admin approve (views final); B. percakapan → offer → accept → accept ulang idempoten → `pending_payment` → deliverable sebelum bayar 409 → [stub bayar] → v1 → revisi → v2 → admin validasi → UMKM approve; C. offer → accept → kreator batal 403 → UMKM batal 200. Data uji dihapus otomatis. |

Data staging: `tos_version` umkm1/creator2 dikembalikan ke `v1` setelah smoke (smoke menyetujui ToS lewat route).

## Env / secret baru (nama saja)
- Opsional (AI; tanpa ini AI brief 503 dan analisis caption dilewati): `GEMINI_API_KEY`, `GEMINI_MODEL`, `VERTEX_AI_PROJECT_ID`, `VERTEX_AI_CLIENT_EMAIL`, `VERTEX_AI_PRIVATE_KEY`, `VERTEX_AI_LOCATION`, `VERTEX_AI_MODEL`, `OPENROUTER_API_KEY`, `OPENROUTER_MODEL`.
- Opsional: `VIEW_VALIDATION_DELAY_HOURS` (default 72).
- `CRON_SECRET` belum dipakai (tidak ada route cron).

## Isu terbuka
- **Kredensial AI belum diisi** di Netlify (aksi pemilik, kartu Trello "AI creds + CRON_SECRET").
- `claim_limit = 0`: klaim menolak, dashboard kreator menghitung "tanpa batas". Usulan: putuskan satu arti; form campaign saat ini mewajibkan ≥ 1 sehingga belum berdampak.
- Tipe `RateCardValidationItem` (admin) tidak cocok dengan DTO antrean (`creatorId` datar vs `creator{}`) — dari Fase 5.
- Route `POST /api/submissions/[id]/review` di app user selalu 403 untuk UMKM (perilaku lama); tombol review UMKM di UI (bila ada) tidak pernah berhasil — pertimbangkan menyembunyikannya.

## Isu untuk fase lain
- **Fase 8:** semua baris tabel "Stub untuk Fase 8" di atas; `release_escrow` wajib dipanggil dari `approve_deliverable` DAN `private.auto_approve_orders()`. Job `auto-approve-orders` sudah aktif di staging — setelah Fase 8, auto-approve akan memindahkan uang; uji dengan data sandbox.
- **Fase 9:** `deliverables.file_url` lama (URL Appwrite) tidak bisa dibuka lewat route file.
- **Lanjutan:** push FCM (dari Fase 6).

## Catatan serah-terima untuk fase berikutnya
- Smoke: `cd scripts/migration && BASE_URL=http://localhost:3000 ADMIN_BASE_URL=http://localhost:3001 NODE_USE_ENV_PROXY=1 NO_PROXY=localhost,127.0.0.1 node smoke-order-flow.ts --confirm-ref <ref>` dengan `SUPABASE_URL/ANON/SERVICE_ROLE` project target dan dua `next dev` (root + `admin/`) yang `NEXT_PUBLIC_SUPABASE_*`-nya menunjuk project yang sama. Fase 8 mengganti langkah `[stub …]` dengan pembayaran sandbox.
- RPC uang Fase 8: ikuti pola lock yang sama (campaign → claim → submission; order → deliverable), ledger `transactions` sudah unique `(reference_type, reference_id, type)`.
