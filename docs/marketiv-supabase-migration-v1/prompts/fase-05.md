# Prompt Fase 5 — Jalur baca

Salin **seluruh blok di bawah** ke sesi chat baru (repo `marketiv-web`).

**Prasyarat sebelum membuka sesi:** PR Fase 4 sudah di-merge. Supabase staging berisi data uji (hasil loader Fase 2) agar halaman bisa dibandingkan.

---

```text
Kamu mengerjakan **Fase 5 — Jalur baca** dari migrasi Marketiv Appwrite → Supabase.
Konteks singkat: backend pindah ke Supabase (Postgres, Auth, Storage, Realtime) dengan logika server di
Next.js Route Handlers, hosting di Vercel, produksi pindah dengan SATU kali cutover. Data produksi
sudah ada, termasuk saldo wallet dan escrow.

## Baca dulu (wajib, berurutan, sebelum menyentuh kode)
1. docs/marketiv-supabase-migration-v1/README.md — keputusan, arsitektur target, 6 celah keamanan, konvensi ID/kolom, strategi branch.
2. docs/marketiv-supabase-migration-v1/05-jalur-baca.md — daftar task fase ini. Ini sumber kebenaran scope.
3. Semua log di docs/marketiv-supabase-migration-v1/progress/ (fase-00.md s.d. fase sebelumnya) — hasil, deviasi, isu terbuka,
   catatan serah-terima. Jika log berbeda dengan dokumen fase, log yang lebih baru menang; sebutkan
   perbedaannya ke saya.
4. Referensi kode fase ini:
   - `src/lib/appwrite/functions.ts` — kontrak `executeFunction<T>()`, `FunctionExecutionError`, `FUNCTION_IDS`
   - `src/services/umkm/umkm-appwrite.service.ts` (~1.870 baris), `src/services/creator/creator-appwrite.service.ts` (~1.400 baris)
   - `src/services/shared/*-appwrite.service.ts`, `src/services/shared/service-result.ts` (`requireUserId`)
   - `src/services/umkm/ratecard-review.service.ts`
   - `admin/src/features/admin/submissions/services/submission.service.ts`, `withdrawals/services/withdrawal.service.ts`, `ratecard-validations/service.ts`, `admin/src/lib/admin/execute-function.ts`
   - 13 function baca-saja di `00_BACKEND/functions/get-*`
   - Tabel pemetaan kolom di `progress/fase-02.md`

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
2. Kerjakan task. Centang checkbox di docs/marketiv-supabase-migration-v1/05-jalur-baca.md sesuai progres nyata.
3. Verifikasi:
   - Snapshot test: output JSON setiap route GET baru identik dengan output function Appwrite pada dataset yang sama (setelah normalisasi ID).
   - Semua halaman dashboard UMKM, kreator, dan admin tampil tanpa error di preview staging.
   - Mock `@/lib/appwrite/*` di test yang tersentuh diganti mock `call-api`/supabase; `npm test` lulus.
   Bila ada kode yang berubah, jalankan juga `npm run lint`, `npm run typecheck`, `npm test` di root
   dan di `admin/`. Laporkan hasilnya apa adanya, termasuk yang gagal.
4. Tulis docs/marketiv-supabase-migration-v1/progress/fase-05.md mengikuti template di docs/marketiv-supabase-migration-v1/progress/README.md.
5. Commit dengan pesan yang jelas, push, lalu buat PR ke `migrasi-supabase`.

## Fokus khusus fase ini
- `src/lib/api/call-api.ts` dengan signature dan error yang sama seperti `executeFunction<T>()`, sehingga service cukup mengganti import + nama endpoint.
- Struktur: logika di `src/server/<domain>/<nama>.ts`, route tipis di `src/app/api/<domain>/<nama>/route.ts`, helper respons/error/zod di `src/server/http.ts`. Setiap route memakai `require-user.ts` dari Fase 4.
- Baca langsung dari browser memakai supabase-js + RLS, dengan mapper row → DTO lama (`$id` → `id`, dst.) di `src/services/**/mappers.ts`.
- Agregasi berat (dashboard summary, negotiations) dijadikan SQL view atau RPC agar tidak N+1.
- Perbaiki `requireUserId()` yang sekarang melakukan 3 read per call.
- Fase ini HANYA jalur baca. Panggilan tulis masih ke Appwrite; tandai dengan `// TODO(fase-06|07|08)`.

## Selesai bila
- Semua baca berjalan dari Supabase.
- 13 route GET aktif.
- Snapshot test lulus.
- Log `progress/fase-05.md` ditulis.
```
