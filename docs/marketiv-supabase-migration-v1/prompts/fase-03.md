# Prompt Fase 3 — RLS, helper otorisasi, storage, realtime

Salin **seluruh blok di bawah** ke sesi chat baru (repo `marketiv-web`).

**Prasyarat sebelum membuka sesi:** PR Fase 2 sudah di-merge ke `migrasi-supabase`.

---

```text
Kamu mengerjakan **Fase 3 — RLS, helper otorisasi, storage, realtime** dari migrasi Marketiv Appwrite → Supabase.
Konteks singkat: backend pindah ke Supabase (Postgres, Auth, Storage, Realtime) dengan logika server di
Next.js Route Handlers, hosting di Vercel, produksi pindah dengan SATU kali cutover. Data produksi
sudah ada, termasuk saldo wallet dan escrow.

## Baca dulu (wajib, berurutan, sebelum menyentuh kode)
1. docs/marketiv-supabase-migration-v1/README.md — keputusan, arsitektur target, 6 celah keamanan, konvensi ID/kolom, strategi branch.
2. docs/marketiv-supabase-migration-v1/03-rls-storage.md — daftar task fase ini. Ini sumber kebenaran scope.
3. Semua log di docs/marketiv-supabase-migration-v1/progress/ (fase-00.md s.d. fase sebelumnya) — hasil, deviasi, isu terbuka,
   catatan serah-terima. Jika log berbeda dengan dokumen fase, log yang lebih baru menang; sebutkan
   perbedaannya ke saya.
4. Referensi kode fase ini:
   - Matriks akses di `03-rls-storage.md` dan tabel izin per baris di README
   - `src/lib/appwrite/storage.ts` — `BUCKET_RULES` (ukuran & MIME per bucket)
   - `00_BACKEND/functions/*/src/main.js` — pola `Permission`/`Role` saat baris dibuat (untuk memahami siapa boleh baca apa)
   - `supabase/migrations/` hasil Fase 2

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
2. Kerjakan task. Centang checkbox di docs/marketiv-supabase-migration-v1/03-rls-storage.md sesuai progres nyata.
3. Verifikasi:
   - `supabase test db` (pgTAP di `supabase/tests/`) lulus, minimal untuk skenario di dokumen fase.
   - Advisor keamanan Supabase (`get_advisors` security, atau `supabase db lint`) tanpa temuan.
   - Test membuktikan celah #1 (user mengubah `users.role` sendiri) dan #2 (insert `campaigns` dari client) TERTUTUP.
   Bila ada kode yang berubah, jalankan juga `npm run lint`, `npm run typecheck`, `npm test` di root
   dan di `admin/`. Laporkan hasilnya apa adanya, termasuk yang gagal.
4. Tulis docs/marketiv-supabase-migration-v1/progress/fase-03.md mengikuti template di docs/marketiv-supabase-migration-v1/progress/README.md.
5. Commit dengan pesan yang jelas, push, lalu buat PR ke `migrasi-supabase`.

## Fokus khusus fase ini
- Hanya policy SELECT untuk `anon`/`authenticated`. Tidak ada policy INSERT/UPDATE/DELETE untuk client di tabel mana pun, ditambah `revoke insert, update, delete` sebagai lapisan kedua.
- `is_admin()` hanya membaca `public.users.role = 'admin'` + `status = 'active'`. JANGAN pernah memakai `user_metadata`.
- Fungsi helper `security definer` wajib `set search_path = ''` dan nama objek fully-qualified.
- Perhatikan performa RLS: bungkus `auth.uid()` dengan `(select auth.uid())`, index kolom yang dipakai policy.
- 8 bucket dengan limit/MIME sama dengan `BUCKET_RULES`; path `{user_id}/{file_id}.{ext}`; bucket privat tanpa policy client (akses via signed URL dari route).
- Publikasikan `messages` dan `notifications` ke `supabase_realtime`.

## Selesai bila
- Migration RLS/storage/realtime ada.
- Test pgTAP lulus.
- Advisor bersih.
- Log `progress/fase-03.md` memuat matriks akses final per tabel.
```
