# Prompt Fase 2 — Fondasi Supabase + skema database

Salin **seluruh blok di bawah** ke sesi chat baru (repo `marketiv-web`).

**Prasyarat sebelum membuka sesi:** PR Fase 0 sudah di-merge ke `migrasi-supabase`. Supabase CLI bisa dipakai (lokal/Docker) atau kredensial Supabase staging tersedia di env. Fase ini boleh berjalan paralel dengan Fase 1.

---

```text
Kamu mengerjakan **Fase 2 — Fondasi Supabase + skema database** dari migrasi Marketiv Appwrite → Supabase.
Konteks singkat: backend pindah ke Supabase (Postgres, Auth, Storage, Realtime) dengan logika server di
Next.js Route Handlers, hosting di Vercel, produksi pindah dengan SATU kali cutover. Data produksi
sudah ada, termasuk saldo wallet dan escrow.

## Baca dulu (wajib, berurutan, sebelum menyentuh kode)
1. docs/marketiv-supabase-migration-v1/README.md — keputusan, arsitektur target, 6 celah keamanan, konvensi ID/kolom, strategi branch.
2. docs/marketiv-supabase-migration-v1/02-fondasi-skema.md — daftar task fase ini. Ini sumber kebenaran scope.
3. Semua log di docs/marketiv-supabase-migration-v1/progress/ (fase-00.md s.d. fase sebelumnya) — hasil, deviasi, isu terbuka,
   catatan serah-terima. Jika log berbeda dengan dokumen fase, log yang lebih baru menang; sebutkan
   perbedaannya ke saya.
4. Referensi kode fase ini:
   - `00_BACKEND/appwrite.config.json` — sumber skema 32 tabel (kolom, tipe, index, unique). JANGAN pakai `appwrite.json`.
   - `docs/marketiv-md/database/*.md` dan `00_BACKEND/docs/02_Modules/*/50_Database.md` — makna kolom
   - `src/lib/appwrite/config.ts` — ID tabel & bucket yang dipakai frontend
   - Tabel `6ab530d00018edb50097` = `campaign_briefs_v2` (yang aktif); digabung dengan `campaign_briefs`
   - Hasil audit Fase 0 di `docs/marketiv-supabase-migration-v1/audit/`

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
2. Kerjakan task. Centang checkbox di docs/marketiv-supabase-migration-v1/02-fondasi-skema.md sesuai progres nyata.
3. Verifikasi:
   - `supabase db reset` lokal bersih tanpa error.
   - `npm run db:types` menghasilkan `src/types/supabase.ts` dan `npm run typecheck` lulus.
   - Dump staging Appwrite (hasil `export-appwrite.ts`) bisa dimuat ke DB lokal/staging tanpa pelanggaran FK; baris yang ditolak dihitung dan dilaporkan.
   Bila ada kode yang berubah, jalankan juga `npm run lint`, `npm run typecheck`, `npm test` di root
   dan di `admin/`. Laporkan hasilnya apa adanya, termasuk yang gagal.
4. Tulis docs/marketiv-supabase-migration-v1/progress/fase-02.md mengikuti template di docs/marketiv-supabase-migration-v1/progress/README.md.
5. Commit dengan pesan yang jelas, push, lalu buat PR ke `migrasi-supabase`.

## Fokus khusus fase ini
- Aplikasi MASIH memakai Appwrite. Fase ini hanya menambah fondasi: `supabase/`, helper `src/lib/supabase/{client,server,admin}.ts` (+ padanan di `admin/src/lib/supabase/`), paket `@supabase/supabase-js` + `@supabase/ssr`, env baru di `.env.example`.
- Ikuti persis bagian "Konvensi skema" di dokumen fase: user ID `uuid` (FK ke `public.users` / `auth.users`), row ID `text` (ID Appwrite lama dipertahankan), uang `bigint` + CHECK >= 0, enum = text + CHECK (nilai diambil dari kode, bukan hanya dari config), snake_case, `created_at/updated_at` + trigger, FK nyata, siklus `conversations.offer_id` ↔ `offers` dengan FK DEFERRABLE.
- Pertahankan semua unique index lama dan tambahkan unique untuk idempotensi: `transactions(reference_type, reference_id, type)`, `creator_social_accounts(creator_id, platform)`.
- Aktifkan RLS di semua tabel, tapi JANGAN buat policy (itu Fase 3).
- `scripts/migration/export-appwrite.ts`: node-appwrite + API key dari env, paginasi cursor, output JSONL per tabel ke folder yang di-.gitignore.

## Selesai bila
- 7 file migration ada di `supabase/migrations/` dan `db reset` bersih.
- Tipe TS ter-generate.
- Skrip export berjalan pada staging.
- Log `progress/fase-02.md` memuat tabel pemetaan kolom Appwrite → Postgres. Tabel ini dipakai Fase 5 dan Fase 9.
```
