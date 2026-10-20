# Prompt Fase 7 — Alur campaign & order rate card

Salin **seluruh blok di bawah** ke sesi chat baru (repo `marketiv-web`).

**Prasyarat sebelum membuka sesi:** PR Fase 6 sudah di-merge. Kredensial AI (Vertex/OpenRouter/Gemini) tersedia di env staging. `CRON_SECRET` sudah dibuat.

---

```text
Kamu mengerjakan **Fase 7 — Alur campaign & order rate card** dari migrasi Marketiv Appwrite → Supabase.
Konteks singkat: backend pindah ke Supabase (Postgres, Auth, Storage, Realtime) dengan logika server di
Next.js Route Handlers, hosting di Vercel, produksi pindah dengan SATU kali cutover. Data produksi
sudah ada, termasuk saldo wallet dan escrow.

## Baca dulu (wajib, berurutan, sebelum menyentuh kode)
1. docs/marketiv-supabase-migration-v1/README.md — keputusan, arsitektur target, 6 celah keamanan, konvensi ID/kolom, strategi branch.
2. docs/marketiv-supabase-migration-v1/07-alur-bisnis.md — daftar task fase ini. Ini sumber kebenaran scope.
3. Semua log di docs/marketiv-supabase-migration-v1/progress/ (fase-00.md s.d. fase sebelumnya) — hasil, deviasi, isu terbuka,
   catatan serah-terima. Jika log berbeda dengan dokumen fase, log yang lebih baru menang; sebutkan
   perbedaannya ke saya.
4. Referensi kode fase ini:
   - Function campaign: `campaign-claimed`, `unclaim-campaign`, `submit-campaign-proof`, `ai-fraud-precheck`, `review-submission`, `campaign-published`, `ai-brief`, `expire-stale-claims`
   - Function rate card: `create-offer`, `create-order`, `cancel-order`, `submit-ratecard-deliverable`, `request-ratecard-revision`, `review-ratecard-deliverable`, `track-order-review`, `notify-order-activity`, `auto-approve-orders`
   - `00_BACKEND/functions/_shared/require-active-role.js`, `00_BACKEND/functions/campaign-claimed/src/atomic.js`
   - `00_BACKEND/appwrite/ops/smoke-order-flow.mjs`
   - Tulis langsung yang tersisa di `creator-appwrite.service.ts` (`claimCampaign`, accept/reject offer) dan `deliverable-appwrite.service.ts` (approve)

Kalau folder docs/marketiv-supabase-migration-v1/ tidak ada di checkout: jalankan `git fetch origin migrasi-supabase` lalu baca dari
branch itu. Kalau branch itu juga belum ada, pakai `git fetch origin claude/zealous-knuth-n10z1y`.

## Branch
- Basis kerja: `migrasi-supabase` (branch jangka panjang migrasi). Merge `origin/main` ke situ bila tertinggal.
- Kerjakan di branch sesi ini yang dibuat dari `migrasi-supabase`. Buka PR ke `migrasi-supabase`, BUKAN ke `main`.

## Aturan
- Kerjakan hanya scope fase ini. Temuan di luar scope dicatat di log progres bagian "Isu untuk fase lain".
- Appwrite produksi tidak boleh diubah. Akses read-only (audit/export) boleh bila saya memberi API key.
- Jangan commit secret, file .env, atau dump data (berisi PII dan hash password). Secret hanya lewat env.
- Ikuti arsitektur target di README:
  - browser hanya MEMBACA lewat supabase-js yang dibatasi RLS;
  - semua TULIS lewat Next.js Route Handler yang memverifikasi sesi lalu memakai client service role;
  - setiap perpindahan uang lewat RPC Postgres dalam satu transaksi, idempoten, dengan row lock.
- Bentuk DTO yang dipakai UI dijaga tetap sama (skill `marketiv-data-contracts`), supaya komponen UI
  sesedikit mungkin berubah.
- Agent/skill `marketiv-appwrite*`, `marketiv-cloud-functions`, dan rules Appwrite di `.claude/`/`.agents/`
  menggambarkan SISTEM LAMA. Pakai hanya untuk memahami perilaku lama, bukan sebagai pola target.
- Untuk pekerjaan Supabase/Postgres (SQL, RLS, migration, auth, storage), load skill `supabase:supabase`
  dan `supabase:supabase-postgres-best-practices` terlebih dahulu.
- Jika butuh keputusan, akses, atau aksi yang tidak bisa kamu lakukan (dashboard Supabase/Vercel/Midtrans,
  DNS, API key, secret): berhenti, lalu minta ke saya dengan langkah yang jelas dan bisa langsung diikuti.

## Cara kerja
1. Setelah membaca semua di atas, susun rencana implementasi fase ini (urutan task, file yang
   dibuat/diubah, risiko, hal yang butuh input saya). Minta persetujuan saya SEBELUM mengubah kode.
2. Kerjakan task. Centang checkbox di docs/marketiv-supabase-migration-v1/07-alur-bisnis.md sesuai progres nyata.
3. Verifikasi:
   - Skrip `scripts/migration/smoke-order-flow.ts` (port dari versi Appwrite) lulus di staging untuk alur campaign (buat → publish → klaim → submit → precheck AI → review admin) dan rate card (offer → accept → order → deliverable → revisi → approve).
   - Test pgTAP untuk RPC `claim_campaign` dan `accept_offer`: klaim ganda ditolak, accept ganda tidak membuat order kedua.
   - Cron dipanggil manual dengan `curl` + `CRON_SECRET` berhasil; tanpa secret ditolak 401.
   Bila ada kode yang berubah, jalankan juga `npm run lint`, `npm run typecheck`, `npm test` di root
   dan di `admin/`. Laporkan hasilnya apa adanya, termasuk yang gagal.
4. Tulis docs/marketiv-supabase-migration-v1/progress/fase-07.md mengikuti template di docs/marketiv-supabase-migration-v1/progress/README.md.
5. Commit dengan pesan yang jelas, push, lalu buat PR ke `migrasi-supabase`.

## Fokus khusus fase ini
- Event trigger Appwrite diganti PEMANGGILAN EKSPLISIT di route/RPC. Tidak memakai database webhook.
- RPC `claim_campaign` (lock campaign, cek status & budget, unique klaim) dan `accept_offer` (status offer + order `pending_payment` + pesan sistem dalam satu transaksi).
- `ai-fraud-precheck` dijalankan dengan `after()` dari `next/server` setelah submit; hasilnya disimpan ke `fraud_checks`.
- `ai-brief`: user dari sesi + cek kepemilikan campaign (celah #4).
- Helper `src/server/notifications/notify.ts` dengan ID deterministik (`ntf` + sha256) supaya idempoten.
- Cron di `vercel.json`: `expire-stale-claims` (`0 */6 * * *`), `auto-approve-orders` (`0 * * * *`), semua `/api/cron/*` cek `Authorization: Bearer ${CRON_SECRET}`.
- Approve deliverable dan semua kredit/escrow/reward hanya STUB yang mengubah status. Uang dikerjakan di Fase 8; tandai `// TODO(fase-08)`.

## Selesai bila
- Alur campaign dan rate card berjalan end-to-end di staging (tanpa uang).
- Smoke dan test lulus.
- Log `progress/fase-07.md` mendaftar semua stub untuk Fase 8.
```
