# Prompt Fase 0 — Persiapan & spike

Salin **seluruh blok di bawah** ke sesi chat baru (repo `marketiv-web`).

**Prasyarat sebelum membuka sesi:** Siapkan env: `APPWRITE_ENDPOINT`, `APPWRITE_PROJECT_ID`, `APPWRITE_API_KEY` (scope read-only: users.read, databases/rows.read, files.read, functions.read) dan kredensial Supabase **staging** (`SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, password DB). Project Supabase/Vercel boleh dibuat bersama sesi ini.

---

```text
Kamu mengerjakan **Fase 0 — Persiapan & spike** dari migrasi Marketiv Appwrite → Supabase.
Konteks singkat: backend pindah ke Supabase (Postgres, Auth, Storage, Realtime) dengan logika server di
Next.js Route Handlers, hosting di Vercel, produksi pindah dengan SATU kali cutover. Data produksi
sudah ada, termasuk saldo wallet dan escrow.

## Baca dulu (wajib, berurutan, sebelum menyentuh kode)
1. docs/marketiv-supabase-migration-v1/README.md — keputusan, arsitektur target, 6 celah keamanan, konvensi ID/kolom, strategi branch.
2. docs/marketiv-supabase-migration-v1/00-persiapan.md — daftar task fase ini. Ini sumber kebenaran scope.
3. Semua log di docs/marketiv-supabase-migration-v1/progress/ (fase-00.md s.d. fase sebelumnya) — hasil, deviasi, isu terbuka,
   catatan serah-terima. Jika log berbeda dengan dokumen fase, log yang lebih baru menang; sebutkan
   perbedaannya ke saya.
4. Referensi kode fase ini:
   - `00_BACKEND/appwrite.config.json` (skema & function; JANGAN pakai `appwrite.json`, sudah basi)
   - `00_BACKEND/appwrite/ops/audit-live.mjs`, `drift.mjs`, `audit-legacy-money-state.mjs` (skrip audit read-only yang sudah ada)
   - `src/lib/appwrite/storage.ts` (`BUCKET_RULES`, batas ukuran bucket)

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
2. Kerjakan task. Centang checkbox di docs/marketiv-supabase-migration-v1/00-persiapan.md sesuai progres nyata.
3. Verifikasi:
   - Hasil Spike 1 (impor hash password Argon2 ke Supabase Auth, login dengan password lama) tercatat: berhasil atau rencana B.
   - Hasil Spike 2 (signed upload 500 MB ke bucket uji) tercatat.
   - Laporan audit tersimpan di `docs/marketiv-supabase-migration-v1/audit/` tanpa data pribadi (hanya angka/ID).
   Bila ada kode yang berubah, jalankan juga `npm run lint`, `npm run typecheck`, `npm test` di root
   dan di `admin/`. Laporkan hasilnya apa adanya, termasuk yang gagal.
4. Tulis docs/marketiv-supabase-migration-v1/progress/fase-00.md mengikuti template di docs/marketiv-supabase-migration-v1/progress/README.md.
5. Commit dengan pesan yang jelas, push, lalu buat PR ke `migrasi-supabase`.

## Fokus khusus fase ini
- Langkah pertama: pastikan branch `migrasi-supabase` ada. Bila belum, buat dari branch yang memuat folder docs migrasi (`claude/zealous-knuth-n10z1y` atau `main` bila sudah di-merge) lalu push. Minta izin saya sebelum push branch baru.
- Fase ini TIDAK mengubah kode aplikasi.
- Langkah dashboard (buat project Supabase staging/prod di ap-southeast-1, project Vercel `marketiv-web` dan `marketiv-admin`, SMTP + SPF/DKIM) ditulis sebagai checklist untuk saya kerjakan; kamu verifikasi hasilnya.
- Audit read-only: jumlah baris per tabel, jumlah file per bucket, baris yatim (FK implisit ke ID yang tidak ada), file privat di bucket publik `campaign-assets`, daftar user ber-role admin (untuk saya validasi), campaign `active` tanpa payment `paid`, wallet yang saldonya ≠ sum(ledger), ledger ganda.
- Jika audit menunjukkan celah #1/#2/#3 pernah dimanfaatkan (admin tidak sah, campaign aktif tanpa dana, kredit ganda): laporkan ke saya SEGERA, sebelum melanjutkan.
- Skrip spike/audit yang kamu tulis disimpan di `scripts/migration/spikes/` dan membaca kredensial dari env.

## Selesai bila
- Hasil kedua spike dicatat di `00-persiapan.md`.
- Laporan audit ada di `docs/marketiv-supabase-migration-v1/audit/`.
- Setiap anomali data punya keputusan: diperbaiki sebelum migrasi, atau ditransform saat migrasi.
- Branch `migrasi-supabase` ada di remote, dan log `progress/fase-00.md` sudah ditulis.
```
