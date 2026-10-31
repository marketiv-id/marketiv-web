# Prompt Fase 11 — Bersih-bersih

Salin **seluruh blok di bawah** ke sesi chat baru (repo `marketiv-web`).

**Prasyarat sebelum membuka sesi:** Cutover sudah stabil minimal 7 hari tanpa insiden data. Penghapusan project Appwrite dan dump baru boleh setelah 30 hari.

---

```text
Kamu mengerjakan **Fase 11 — Bersih-bersih** dari migrasi Marketiv Appwrite → Supabase.
Konteks singkat: backend pindah ke Supabase (Postgres, Auth, Storage, Realtime) dengan logika server di
Next.js Route Handlers, hosting di Netlify Free, produksi pindah dengan SATU kali cutover. Data produksi
sudah ada, termasuk saldo wallet dan escrow.

## Baca dulu (wajib, berurutan, sebelum menyentuh kode)
1. docs/marketiv-supabase-migration-v1/README.md — keputusan, arsitektur target, 6 celah keamanan, konvensi ID/kolom, strategi branch.
2. docs/marketiv-supabase-migration-v1/11-cleanup.md — daftar task fase ini. Ini sumber kebenaran scope.
3. Semua log di docs/marketiv-supabase-migration-v1/progress/ (fase-00.md s.d. fase sebelumnya) — hasil, deviasi, isu terbuka,
   catatan serah-terima. Jika log berbeda dengan dokumen fase, log yang lebih baru menang; sebutkan
   perbedaannya ke saya.
4. Referensi kode fase ini:
   - `11-cleanup.md`
   - `AGENTS.md`, `00_BACKEND/AGENTS.md`, `00_BACKEND/CLAUDE.md`
   - `.claude/agents/marketiv*.md`, `.codex/agents/*.toml`, `.claude/skills/marketiv-*`, `.agents/skills/*`, `.agents/rules/appwrite-standards.md`
   - `docs/marketiv-md/database/*`, `docs/marketiv-md/technical-guidelines/04-appwrite-backend-standards.md`

Kalau folder docs/marketiv-supabase-migration-v1/ tidak ada di checkout: jalankan `git fetch origin migrasi-supabase` lalu baca dari
branch itu. Kalau branch itu juga belum ada, pakai `git fetch origin claude/zealous-knuth-n10z1y`.

## Branch
- Basis kerja: `migrasi-supabase` (branch jangka panjang migrasi). Merge `origin/staging` (default branch repo) ke situ bila tertinggal.
- Kerjakan di branch sesi ini yang dibuat dari `migrasi-supabase`. Buka PR ke `migrasi-supabase`, BUKAN ke `staging`.

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
- Jika butuh keputusan, akses, atau aksi yang tidak bisa kamu lakukan (dashboard Supabase/Netlify/Midtrans,
  DNS, API key, secret): berhenti, lalu minta ke saya dengan langkah yang jelas dan bisa langsung diikuti.

## Cara kerja
1. Setelah membaca semua di atas, susun rencana implementasi fase ini (urutan task, file yang
   dibuat/diubah, risiko, hal yang butuh input saya). Minta persetujuan saya SEBELUM mengubah kode.
2. Kerjakan task. Centang checkbox di docs/marketiv-supabase-migration-v1/11-cleanup.md sesuai progres nyata.
3. Verifikasi:
   - `grep -ri appwrite src admin/src` kosong.
   - `npm run build` lulus di root dan `admin/`.
   - Advisor Supabase (security & performance) dijalankan ulang; index yang disarankan ditambahkan lewat migration.
   Bila ada kode yang berubah, jalankan juga `npm run lint`, `npm run typecheck`, `npm test` di root
   dan di `admin/`. Laporkan hasilnya apa adanya, termasuk yang gagal.
4. Tulis docs/marketiv-supabase-migration-v1/progress/fase-11.md mengikuti template di docs/marketiv-supabase-migration-v1/progress/README.md.
5. Commit dengan pesan yang jelas, push, lalu buat PR ke `migrasi-supabase`.

## Fokus khusus fase ini
- Hapus dependency `appwrite`, `src/lib/appwrite/`, `admin/src/lib/admin/appwrite.ts`, mock Appwrite di test, env `NEXT_PUBLIC_APPWRITE_*`, remote pattern Appwrite di `next.config.ts`.
- Rename `*-appwrite.service.ts` ke nama domain.
- Agent `marketiv-appwrite` jadi `marketiv-supabase`; perbarui agent lain, skill (`marketiv-appwrite-integration`, `marketiv-cloud-functions`), dan rules agar menjelaskan pola baru: Supabase + Route Handler + RPC.
- `00_BACKEND/functions`, config, dan skrip ops Appwrite dihapus dari `main` HANYA setelah 30 hari; sebelum itu cukup tandai sebagai arsip.
- Langkah hapus project Appwrite, hapus dump PII, dan cek backup/PITR Supabase ditulis sebagai checklist untuk saya.

## Selesai bila
- Tidak ada sisa Appwrite di kode aplikasi.
- Dokumentasi dan agent mencerminkan arsitektur baru.
- Build/test lulus.
- Log `progress/fase-11.md` ditulis.
```
