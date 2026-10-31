# Prompt Fase 6 — Mutasi sederhana, chat, file, realtime

Salin **seluruh blok di bawah** ke sesi chat baru (repo `marketiv-web`).

**Prasyarat sebelum membuka sesi:** PR Fase 5 sudah di-merge. Bucket Fase 3 ada di Supabase staging.

---

```text
Kamu mengerjakan **Fase 6 — Mutasi sederhana, chat, file, realtime** dari migrasi Marketiv Appwrite → Supabase.
Konteks singkat: backend pindah ke Supabase (Postgres, Auth, Storage, Realtime) dengan logika server di
Next.js Route Handlers, hosting di Netlify Free, produksi pindah dengan SATU kali cutover. Data produksi
sudah ada, termasuk saldo wallet dan escrow.

## Baca dulu (wajib, berurutan, sebelum menyentuh kode)
1. docs/marketiv-supabase-migration-v1/README.md — keputusan, arsitektur target, 6 celah keamanan, konvensi ID/kolom, strategi branch.
2. docs/marketiv-supabase-migration-v1/06-mutasi-chat-file.md — daftar task fase ini. Ini sumber kebenaran scope.
3. Semua log di docs/marketiv-supabase-migration-v1/progress/ (fase-00.md s.d. fase sebelumnya) — hasil, deviasi, isu terbuka,
   catatan serah-terima. Jika log berbeda dengan dokumen fase, log yang lebih baru menang; sebutkan
   perbedaannya ke saya.
4. Referensi kode fase ini:
   - `src/services/shared/conversation-appwrite.service.ts`, `notification-appwrite.service.ts`, `user-file-appwrite.service.ts`
   - Bagian tulis langsung di `umkm-appwrite.service.ts` dan `creator-appwrite.service.ts` (campaign draft, brief, asset, rate card, paket, portfolio, social)
   - `src/lib/appwrite/storage.ts`, `campaign-thumbnail.ts`, `src/lib/compress-image.ts`
   - `src/components/features/shared/NotificationProvider.tsx`, `src/components/features/umkm-dashboard/negotiation/detail/NegotiationRoomPage.tsx`, `src/components/features/creator-dashboard/NegosiasiRoomView.tsx`, `src/lib/appwrite/realtime.ts`
   - Function: `update-profile`, `accept-tos`, `create-appeal`, `mark-notifications-read`, `create-conversation`, `send-message`, `mark-conversation-read`, `patch-conversation-archive`, `patch-campaign-draft`, `patch-campaign-status`, `validate-and-upload`, `delete-file`

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
2. Kerjakan task. Centang checkbox di docs/marketiv-supabase-migration-v1/06-mutasi-chat-file.md sesuai progres nyata.
3. Verifikasi:
   - Grep membuktikan tidak ada `.insert(`/`.update(`/`.upsert(`/`.delete(` supabase di kode browser (`src/services`, `src/components`, `admin/src`).
   - E2E di staging dengan dua akun: chat realtime dua arah, notifikasi muncul, upload avatar/logo/portfolio/thumbnail, upload file privat + akses lewat signed URL, CRUD rate card, campaign draft → publish.
   Bila ada kode yang berubah, jalankan juga `npm run lint`, `npm run typecheck`, `npm test` di root
   dan di `admin/`. Laporkan hasilnya apa adanya, termasuk yang gagal.
4. Tulis docs/marketiv-supabase-migration-v1/progress/fase-06.md mengikuti template di docs/marketiv-supabase-migration-v1/progress/README.md.
5. Commit dengan pesan yang jelas, push, lalu buat PR ke `migrasi-supabase`.

## Fokus khusus fase ini
- Setelah fase ini TIDAK BOLEH ada lagi tulis langsung dari browser (sekarang ada ~35).
- Route campaign memaksa `status='draft'`, `remaining_budget=0`, `umkm_id = user sesi`. Menutup celah #2 di sisi API.
- Upload: `/api/files/upload-url` (validasi bucket/MIME/ukuran/kuota → signed upload URL) → browser upload langsung → `/api/files/confirm`. Jangan lewatkan file melalui body route (batas ukuran body function di Netlify).
- `mark-conversation-read` jadi satu `UPDATE ... WHERE`, bukan loop 200 update.
- Realtime: hook `useRealtimeTable` di `src/lib/supabase/realtime.ts` dengan filter (`user_id=eq.`, `conversation_id=eq.`); hapus workaround dua channel.
- Push notification Appwrite Messaging TIDAK dimigrasi di fase ini (cukup in-app); catat sebagai isu lanjutan.
- Alur campaign klaim/submit/review, offer/order/deliverable, dan semua yang menyentuh uang BUKAN scope fase ini.

## Selesai bila
- Semua mutasi non-bisnis dan non-uang lewat route.
- Realtime jalan.
- Grep bersih.
- Log `progress/fase-06.md` ditulis.
```
