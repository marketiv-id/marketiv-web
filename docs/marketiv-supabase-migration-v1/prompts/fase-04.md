# Prompt Fase 4 — Auth & guard

Salin **seluruh blok di bawah** ke sesi chat baru (repo `marketiv-web`).

**Prasyarat sebelum membuka sesi:** PR Fase 3 sudah di-merge. Di Supabase staging: SMTP aktif, Site URL & Redirect URLs (staging, prod, `*.vercel.app`) terisi, provider Google dikonfigurasi bila OAuth dipakai. Hasil Spike 1 (impor password) dari Fase 0 sudah diketahui.

---

```text
Kamu mengerjakan **Fase 4 — Auth & guard** dari migrasi Marketiv Appwrite → Supabase.
Konteks singkat: backend pindah ke Supabase (Postgres, Auth, Storage, Realtime) dengan logika server di
Next.js Route Handlers, hosting di Vercel, produksi pindah dengan SATU kali cutover. Data produksi
sudah ada, termasuk saldo wallet dan escrow.

## Baca dulu (wajib, berurutan, sebelum menyentuh kode)
1. docs/marketiv-supabase-migration-v1/README.md — keputusan, arsitektur target, 6 celah keamanan, konvensi ID/kolom, strategi branch.
2. docs/marketiv-supabase-migration-v1/04-auth.md — daftar task fase ini. Ini sumber kebenaran scope.
3. Semua log di docs/marketiv-supabase-migration-v1/progress/ (fase-00.md s.d. fase sebelumnya) — hasil, deviasi, isu terbuka,
   catatan serah-terima. Jika log berbeda dengan dokumen fase, log yang lebih baru menang; sebutkan
   perbedaannya ke saya.
4. Referensi kode fase ini:
   - `src/services/auth/auth.service.ts`, `session.service.ts`, `tos.service.ts`, `oauth-callback.service.ts` dan `__tests__/`
   - `src/services/chatbot/chatbot-auth.ts`, `src/components/features/chatbot/ChatbotPanel.tsx`, `src/app/api/chat/route.ts`
   - `src/components/features/auth/OAuthCallback.tsx`, `RoleGuard`, `AuthProvider`, `RedirectIfAuthenticated`
   - `admin/src/lib/admin/auth.ts` (+ test), `admin/src/components/admin/AdminAuthBoundary.tsx`
   - `00_BACKEND/functions/create-user-profile`, `create-user-wallet`, `request-password-otp`, `reset-password-with-otp`, `user-email-verified`, `accept-tos`
   - `00_BACKEND/functions/_shared/require-active-role.js`

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
2. Kerjakan task. Centang checkbox di docs/marketiv-supabase-migration-v1/04-auth.md sesuai progres nyata.
3. Verifikasi:
   - Test auth yang di-port (`src/services/auth/__tests__/*`, `admin/src/lib/admin/auth.test.ts`) lulus.
   - Checklist QA manual di preview staging: register UMKM, register kreator, login, verifikasi OTP, lupa password, login Google (bila flag aktif), akun suspended ditolak, admin login, non-admin ditolak di admin app.
   Bila ada kode yang berubah, jalankan juga `npm run lint`, `npm run typecheck`, `npm test` di root
   dan di `admin/`. Laporkan hasilnya apa adanya, termasuk yang gagal.
4. Tulis docs/marketiv-supabase-migration-v1/progress/fase-04.md mengikuti template di docs/marketiv-supabase-migration-v1/progress/README.md.
5. Commit dengan pesan yang jelas, push, lalu buat PR ke `migrasi-supabase`.

## Fokus khusus fase ini
- Bentuk return fungsi service auth TETAP sama, sehingga form, `AuthProvider`, dan `RoleGuard` tidak perlu diubah logikanya.
- Register lewat route `/api/auth/register`: role di-whitelist (`umkm`/`creator`) di server; RPC `provision_user` membuat `users` + profil + `wallets` + `user_storage_usage` dalam satu transaksi dan idempoten. Ini menggantikan event `users.*.create` dan menutup celah "role dari body request".
- Buat `src/server/auth/require-user.ts` (port `require-active-role.js`) yang akan dipakai SEMUA route di fase berikutnya.
- `src/proxy.ts` (Next 16) di app user dan admin: refresh sesi `@supabase/ssr` + redirect bila tidak ada sesi.
- Admin hanya dikenali dari `users.role = 'admin'`. Hapus fallback label dan `prefs.role` (celah #5).
- Chatbot: `/api/chat` membaca sesi dari cookie; hapus `account.createJWT`.
- Template email Bahasa Indonesia (OTP, reset, konfirmasi) dibuat sebagai file di repo + langkah pasang untuk saya.

## Selesai bila
- Semua alur auth user dan admin berjalan di Supabase staging.
- Guard server aktif.
- Test lulus.
- Log `progress/fase-04.md` ditulis.
```
