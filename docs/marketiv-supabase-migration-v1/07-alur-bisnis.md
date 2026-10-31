# Fase 7 — Alur campaign & order rate card

**Bobot:** L

## Tujuan

Alur bisnis multi-langkah berjalan di route dan RPC. Event trigger Appwrite diganti dengan pemanggilan eksplisit, sehingga urutan eksekusi jelas dan bisa dites.

## Task

### Campaign mode
- [ ] Klaim dan batal klaim
  - Route: `POST /api/campaigns/[id]/claim` dan `DELETE` (menggantikan tulis langsung `campaign_claims` dan `unclaim-campaign`).
  - RPC `claim_campaign(campaign_id, creator_id)`: kunci baris campaign, cek status `active`, cek `remaining_budget > 0`, lalu insert claim. Unique constraint mencegah klaim ganda.
  - Notifikasi `campaign-claimed` dikirim dari route yang sama.
- [ ] `POST /api/campaigns/[id]/submissions` ← `submit-campaign-proof`. Setelah respons terkirim, `after(() => runFraudPrecheck(submissionId))` menjalankan port `ai-fraud-precheck` (Gemini).
- [ ] Admin `POST /api/admin/submissions/[id]/review` ← `review-submission`. Kredit reward-nya ada di Fase 8 (`credit_campaign_reward`).
- [ ] Notifikasi `campaign-published` ke kreator dikirim dari route publish (`patch-campaign-status`).
- [ ] `POST /api/ai/brief` ← `ai-brief`. User diambil dari sesi dan kepemilikan campaign dicek (menutup celah #4). Vertex AI dengan fallback OpenRouter.

### Rate card order
- [ ] `POST /api/offers` ← `create-offer`
- [ ] `POST /api/offers/[id]/accept`:
  - Memanggil RPC `accept_offer(offer_id, creator_id)`, yang dalam satu transaksi:
    - mengubah status offer
    - membuat order `pending_payment` (unique `offer_id`)
    - membuat pesan sistem
  - Menggantikan update langsung dari browser ditambah event `create-order`.
- [ ] `POST /api/offers/[id]/reject`; `DELETE /api/offers/[id]` (UMKM)
- [ ] `POST /api/orders/[id]/cancel` ← `cancel-order`
- [ ] `POST /api/orders/[id]/deliverables` ← `submit-ratecard-deliverable`. Dalam route yang sama:
  - set `review_deadline_at` (port `track-order-review`)
  - kirim notifikasi (port `notify-order-activity`)
- [ ] `POST /api/orders/[id]/revisions` ← `request-ratecard-revision`, ditambah notifikasi
- [ ] `POST /api/deliverables/[id]/approve`:
  - Sebelumnya UMKM meng-update `deliverables.status` langsung.
  - Route ini memanggil `release_escrow` dari Fase 8. Sampai fase itu selesai, cukup stub yang menandai status.
- [ ] Admin `POST /api/admin/ratecard-deliverables/[id]/review` ← `review-ratecard-deliverable`

### Cron (Supabase Cron / `pg_cron`)
Hosting gratis (Netlify Free) tidak dipakai untuk cron. Jadwal dijalankan oleh `pg_cron` di database, yang tersedia di plan gratis Supabase.
- [ ] Fungsi SQL + job `pg_cron` (dalam migration):
  - `expire_stale_claims()` dengan jadwal `0 */6 * * *`
  - `auto_approve_orders()` dengan jadwal `0 * * * *`
- [ ] Fungsi job di schema yang tidak diekspos (bukan `public`), sehingga tidak bisa dipanggil lewat Data API.
- [ ] Hanya bila sebuah job butuh logika Node (misalnya email): `pg_net` memanggil `/api/cron/*`, dan route itu mengecek `Authorization: Bearer ${CRON_SECRET}`.

### Helper bersama
- [ ] `src/server/notifications/notify.ts`: ID deterministik (`ntf` + sha256) supaya idempoten. Port pola dari functions yang sudah ada.

## Verifikasi
- Port `00_BACKEND/appwrite/ops/smoke-order-flow.mjs` → `scripts/migration/smoke-order-flow.ts` untuk Supabase staging.
- Alur campaign penuh: buat → top-up (stub) → publish → klaim → submit → precheck AI → review admin.
- Alur rate card penuh: offer → accept → order → deliverable → revisi → deliverable → approve.
- Job `pg_cron` terdaftar dan fungsi SQL-nya dipanggil manual di staging dengan hasil benar. Route `/api/cron/*` (bila ada) tanpa secret ditolak 401.
