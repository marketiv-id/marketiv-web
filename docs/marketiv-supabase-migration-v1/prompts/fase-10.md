# Prompt Fase 10 — Cutover produksi

Salin **seluruh blok di bawah** ke sesi chat baru (repo `marketiv-web`).

**Prasyarat sebelum membuka sesi:** PR Fase 9 sudah di-merge dan `migrasi-supabase` sudah di-merge ke branch produksi (belum di-deploy). Semua prasyarat H-1 di `10-cutover.md` siap. Jadwal maintenance sudah diumumkan. Operator manusia hadir sepanjang sesi.

---

```text
Kamu mengerjakan **Fase 10 — Cutover produksi** dari migrasi Marketiv Appwrite → Supabase.
Konteks singkat: backend pindah ke Supabase (Postgres, Auth, Storage, Realtime) dengan logika server di
Next.js Route Handlers, hosting di Vercel, produksi pindah dengan SATU kali cutover. Data produksi
sudah ada, termasuk saldo wallet dan escrow.

## Baca dulu (wajib, berurutan, sebelum menyentuh kode)
1. docs/marketiv-supabase-migration-v1/README.md — keputusan, arsitektur target, 6 celah keamanan, konvensi ID/kolom, strategi branch.
2. docs/marketiv-supabase-migration-v1/10-cutover.md — daftar task fase ini. Ini sumber kebenaran scope.
3. Semua log di docs/marketiv-supabase-migration-v1/progress/ (fase-00.md s.d. fase sebelumnya) — hasil, deviasi, isu terbuka,
   catatan serah-terima. Jika log berbeda dengan dokumen fase, log yang lebih baru menang; sebutkan
   perbedaannya ke saya.
4. Referensi kode fase ini:
   - `10-cutover.md` — prasyarat, runbook, rollback A/B
   - `progress/fase-09.md` — laporan gladi, durasi, catatan
   - `scripts/migration/*`

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
2. Kerjakan task. Centang checkbox di docs/marketiv-supabase-migration-v1/10-cutover.md sesuai progres nyata.
3. Verifikasi:
   - Setiap langkah runbook dicentang dengan bukti (output perintah / screenshot dari saya).
   - `reconcile.ts` pada prod = 0 selisih SEBELUM deploy (go/no-go).
   - Smoke test produksi lulus sebelum maintenance dimatikan.
   Bila ada kode yang berubah, jalankan juga `npm run lint`, `npm run typecheck`, `npm test` di root
   dan di `admin/`. Laporkan hasilnya apa adanya, termasuk yang gagal.
4. Tulis docs/marketiv-supabase-migration-v1/progress/fase-10.md mengikuti template di docs/marketiv-supabase-migration-v1/progress/README.md.
5. Commit dengan pesan yang jelas, push, lalu buat PR ke `migrasi-supabase`.

## Fokus khusus fase ini
- Di fase ini kamu bertindak sebagai PENDAMPING OPERATOR. Tidak ada aksi produksi tanpa "ya" eksplisit dari saya di setiap langkah.
- Mulai dengan memeriksa semua prasyarat H-1 satu per satu dan menyatakan GO/NO-GO beserta alasannya.
- Jalankan runbook berurutan; tampilkan perintah sebelum dijalankan; catat waktu mulai/selesai tiap langkah.
- Jika reconcile ≠ 0, smoke test gagal, atau ada error tak terduga: hentikan, rekomendasikan rollback A, dan jangan mencoba memperbaiki data produksi secara improvisasi.
- Setelah dibuka: pantau Sentry, log Supabase, webhook Midtrans, dan `finance_reconciliation` selama 2 jam; siapkan checklist pemantauan H+1 s.d. H+7.

## Selesai bila
- Produksi berjalan di Supabase + Vercel.
- Midtrans mengarah ke route baru.
- Appwrite dalam kondisi read-only.
- Log cutover lengkap di `progress/fase-10.md`.
```
