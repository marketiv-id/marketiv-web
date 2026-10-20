# Prompt Fase 9 — Tooling migrasi data & gladi resik

Salin **seluruh blok di bawah** ke sesi chat baru (repo `marketiv-web`).

**Prasyarat sebelum membuka sesi:** PR Fase 8 sudah di-merge. API key Appwrite PRODUKSI (read-only) dan kredensial Supabase staging tersedia di mesin/sesi yang menjalankan skrip. Ruang disk cukup untuk dump DB + file storage. Salinan data prod tidak boleh masuk repo.

---

```text
Kamu mengerjakan **Fase 9 — Tooling migrasi data & gladi resik** dari migrasi Marketiv Appwrite → Supabase.
Konteks singkat: backend pindah ke Supabase (Postgres, Auth, Storage, Realtime) dengan logika server di
Next.js Route Handlers, hosting di Vercel, produksi pindah dengan SATU kali cutover. Data produksi
sudah ada, termasuk saldo wallet dan escrow.

## Baca dulu (wajib, berurutan, sebelum menyentuh kode)
1. docs/marketiv-supabase-migration-v1/README.md — keputusan, arsitektur target, 6 celah keamanan, konvensi ID/kolom, strategi branch.
2. docs/marketiv-supabase-migration-v1/09-migrasi-data.md — daftar task fase ini. Ini sumber kebenaran scope.
3. Semua log di docs/marketiv-supabase-migration-v1/progress/ (fase-00.md s.d. fase sebelumnya) — hasil, deviasi, isu terbuka,
   catatan serah-terima. Jika log berbeda dengan dokumen fase, log yang lebih baru menang; sebutkan
   perbedaannya ke saya.
4. Referensi kode fase ini:
   - `scripts/migration/export-appwrite.ts` (Fase 2) dan tabel pemetaan kolom di `progress/fase-02.md`
   - Hasil Spike 1 (impor password) di `00-persiapan.md` / `progress/fase-00.md`
   - Laporan audit di `docs/marketiv-supabase-migration-v1/audit/` (anomali + keputusan transform)
   - `supabase/migrations/` final dan view `finance_reconciliation` (Fase 8)
   - Pola URL storage lama: `.../storage/buckets/{bucket}/files/{fileId}/view?project=...`

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
2. Kerjakan task. Centang checkbox di docs/marketiv-supabase-migration-v1/09-migrasi-data.md sesuai progres nyata.
3. Verifikasi:
   - Gladi 1 dan gladi 2 (dari DB kosong) ke Supabase staging memakai salinan data prod terbaru; `reconcile.ts` = 0 selisih di keduanya.
   - Durasi setiap skrip dicatat.
   - QA penuh di preview staging, termasuk login memakai akun hasil migrasi (password lama, atau alur reset paksa bila rencana B).
   Bila ada kode yang berubah, jalankan juga `npm run lint`, `npm run typecheck`, `npm test` di root
   dan di `admin/`. Laporkan hasilnya apa adanya, termasuk yang gagal.
4. Tulis docs/marketiv-supabase-migration-v1/progress/fase-09.md mengikuti template di docs/marketiv-supabase-migration-v1/progress/README.md.
5. Commit dengan pesan yang jelas, push, lalu buat PR ke `migrasi-supabase`.

## Fokus khusus fase ini
- Lima skrip di `scripts/migration/` (export, export-storage, import-users, transform-load, copy-storage) + `reconcile.ts`. Semuanya IDEMPOTEN: aman dijalankan ulang.
- Urutan load mengikuti tabel tahap 0–6 di dokumen fase; `conversations.offer_id` diisi di pass kedua.
- Baris yatim masuk `migration_rejects`, tidak dibuang diam-diam.
- Rewrite semua kolom URL storage lama ke URL/path Supabase; file privat yang nyasar di bucket publik dipindah.
- `reconcile.ts` menghasilkan laporan markdown; SATU selisih saja = NO-GO.
- Dump berisi PII dan hash password: simpan di luar repo, terenkripsi, dan tulis prosedur penghapusannya.
- Lengkapi runbook di `10-cutover.md` dengan perintah persis, durasi, dan kolom pemilik.

## Selesai bila
- Dua gladi resik dengan 0 selisih.
- Jendela maintenance ditetapkan (durasi gladi × 1,5).
- Runbook final ada.
- Log `progress/fase-09.md` ditulis.
```
