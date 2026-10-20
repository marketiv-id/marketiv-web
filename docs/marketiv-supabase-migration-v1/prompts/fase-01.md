# Prompt Fase 1 — Hosting ke Vercel (backend tetap Appwrite)

Salin **seluruh blok di bawah** ke sesi chat baru (repo `marketiv-web`).

**Prasyarat sebelum membuka sesi:** PR Fase 0 sudah di-merge ke `migrasi-supabase`. Project Vercel `marketiv-web` (root `/`) dan `marketiv-admin` (root `admin`) sudah dibuat dan terhubung ke repo. Akses DNS `marketiv.id` siap. Fase ini boleh berjalan paralel dengan Fase 2.

---

```text
Kamu mengerjakan **Fase 1 — Hosting ke Vercel (backend tetap Appwrite)** dari migrasi Marketiv Appwrite → Supabase.
Konteks singkat: backend pindah ke Supabase (Postgres, Auth, Storage, Realtime) dengan logika server di
Next.js Route Handlers, hosting di Vercel, produksi pindah dengan SATU kali cutover. Data produksi
sudah ada, termasuk saldo wallet dan escrow.

## Baca dulu (wajib, berurutan, sebelum menyentuh kode)
1. docs/marketiv-supabase-migration-v1/README.md — keputusan, arsitektur target, 6 celah keamanan, konvensi ID/kolom, strategi branch.
2. docs/marketiv-supabase-migration-v1/01-hosting-vercel.md — daftar task fase ini. Ini sumber kebenaran scope.
3. Semua log di docs/marketiv-supabase-migration-v1/progress/ (fase-00.md s.d. fase sebelumnya) — hasil, deviasi, isu terbuka,
   catatan serah-terima. Jika log berbeda dengan dokumen fase, log yang lebih baru menang; sebutkan
   perbedaannya ke saya.
4. Referensi kode fase ini:
   - `next.config.ts` dan `admin/next.config.ts` (Sentry, `images.remotePatterns`)
   - `.github/workflows/ci.yml`
   - `docs/marketiv-admin-root-extraction-spec-v1/05_DEPLOYMENT/APPWRITE_SITE_MAPPING.md` (mapping hosting sekarang)
   - `docs/marketiv-appwrite-session-isolation-spec/` (kenapa API memakai custom domain terpisah untuk cookie)
   - `.env.example` dan `admin/.env.example` bila ada

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
2. Kerjakan task. Centang checkbox di docs/marketiv-supabase-migration-v1/01-hosting-vercel.md sesuai progres nyata.
3. Verifikasi:
   - `npm run build` lulus di root dan `admin/` dengan env produksi tiruan.
   - Checklist smoke test di domain Vercel staging (login UMKM/kreator, dashboard, chat realtime, upload avatar, campaign draft, login admin + antrean, chatbot `/api/chat`) diisi hasilnya oleh saya/kamu.
   Bila ada kode yang berubah, jalankan juga `npm run lint`, `npm run typecheck`, `npm test` di root
   dan di `admin/`. Laporkan hasilnya apa adanya, termasuk yang gagal.
4. Tulis docs/marketiv-supabase-migration-v1/progress/fase-01.md mengikuti template di docs/marketiv-supabase-migration-v1/progress/README.md.
5. Commit dengan pesan yang jelas, push, lalu buat PR ke `migrasi-supabase`.

## Fokus khusus fase ini
- Backend TETAP Appwrite. Jangan menambah kode Supabase di fase ini.
- Hasilkan: daftar lengkap env per project Vercel (nama saja, tanpa nilai), konfigurasi `vercel.json` bila perlu (region `sin1`), dan runbook pindah domain: staging dulu, verifikasi, baru prod.
- Pastikan cookie sesi Appwrite tetap first-party: API custom domain `api(-admin)(-staging).marketiv.id` harus satu domain induk dengan app. Tambahkan domain Vercel ke Web Platform / allowed origin di Appwrite Console (langkah untuk saya).
- CI tetap menjalankan lint, typecheck, build; deploy dilakukan Vercel.
- Mematikan Appwrite Sites hanya setelah domain prod stabil 7 hari — tulis sebagai langkah tertunda di log.

## Selesai bila
- Kedua app ter-deploy di Vercel staging dan prod lewat domain resmi.
- Smoke test lulus dan tercatat di `progress/fase-01.md`.
- Runbook domain dan daftar env terdokumentasi.
```
