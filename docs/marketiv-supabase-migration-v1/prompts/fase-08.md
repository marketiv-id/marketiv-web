# Prompt Fase 8 — Keuangan: payment, escrow, wallet, withdrawal

Salin **seluruh blok di bawah** ke sesi chat baru (repo `marketiv-web`).

**Prasyarat sebelum membuka sesi:** PR Fase 7 sudah di-merge. Akun Midtrans **sandbox** (server key, client key) tersedia di env staging, dan notification URL sandbox bisa diarahkan ke URL deploy Netlify (branch deploy `migrasi-supabase`).

---

```text
Kamu mengerjakan **Fase 8 — Keuangan: payment, escrow, wallet, withdrawal** dari migrasi Marketiv Appwrite → Supabase.
Konteks singkat: backend pindah ke Supabase (Postgres, Auth, Storage, Realtime) dengan logika server di
Next.js Route Handlers, hosting di Netlify Free, produksi pindah dengan SATU kali cutover. Data produksi
sudah ada, termasuk saldo wallet dan escrow.

## Baca dulu (wajib, berurutan, sebelum menyentuh kode)
1. docs/marketiv-supabase-migration-v1/README.md — keputusan, arsitektur target, 6 celah keamanan, konvensi ID/kolom, strategi branch.
2. docs/marketiv-supabase-migration-v1/08-keuangan.md — daftar task fase ini. Ini sumber kebenaran scope.
3. Semua log di docs/marketiv-supabase-migration-v1/progress/ (fase-00.md s.d. fase sebelumnya) — hasil, deviasi, isu terbuka,
   catatan serah-terima. Jika log berbeda dengan dokumen fase, log yang lebih baru menang; sebutkan
   perbedaannya ke saya.
4. Referensi kode fase ini:
   - `00_BACKEND/functions/request-withdrawal/src/withdrawal-transaction.js` dan `review-withdrawal/src/withdrawal-transition.js` — pola paling rapi yang ada, jadikan acuan
   - `00_BACKEND/functions/*/src/atomic.js` (increment/decrement dengan min/max)
   - Function: `create-payment`, `cancel-payment`, `midtrans-webhook`, `create-escrow`, `release-escrow`, `reconcile-release-escrow`, `refund-order`, `refund-escrow`, `calculate-campaign-reward`, `request-withdrawal`, `review-withdrawal`, `fee-rate-flip`, `suspend-user`, `unsuspend-user`, `verify-kyc`, `review-appeal`
   - Daftar stub `// TODO(fase-08)` di `progress/fase-07.md`
   - Bagian "Celah keamanan" #3 di README (race kredit ganda dan dana hilang saat refund)

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
2. Kerjakan task. Centang checkbox di docs/marketiv-supabase-migration-v1/08-keuangan.md sesuai progres nyata.
3. Verifikasi:
   - TDD: tulis test pgTAP di `supabase/tests/finance/` SEBELUM setiap RPC. Wajib membuktikan: panggilan dua kali tidak mengubah saldo dua kali, saldo/budget tidak bisa negatif, exception di tengah RPC → rollback total.
   - Uji konkurensi: skrip memanggil `release_escrow` dan `credit_campaign_reward` 20× paralel; hasilnya tepat satu kredit.
   - Midtrans sandbox end-to-end di preview staging: bayar order, top-up campaign, expire, cancel.
   - View `finance_reconciliation` (sum ledger = saldo wallet per user) = 0 selisih setelah seluruh skenario.
   Bila ada kode yang berubah, jalankan juga `npm run lint`, `npm run typecheck`, `npm test` di root
   dan di `admin/`. Laporkan hasilnya apa adanya, termasuk yang gagal.
4. Tulis docs/marketiv-supabase-migration-v1/progress/fase-08.md mengikuti template di docs/marketiv-supabase-migration-v1/progress/README.md.
5. Commit dengan pesan yang jelas, push, lalu buat PR ke `migrasi-supabase`.

## Fokus khusus fase ini
- Ini fase paling berisiko. Kerjakan pelan, satu RPC satu commit, setiap commit dengan test-nya.
- Ikuti ENAM prinsip wajib di dokumen fase tanpa pengecualian: satu RPC per perpindahan uang (`security definer`, `set search_path = ''`), `SELECT ... FOR UPDATE` dengan urutan kunci konsisten, ledger dulu (`ON CONFLICT DO NOTHING RETURNING`) baru saldo, transisi status bersyarat (`UPDATE ... WHERE status = ... RETURNING`), CHECK di DB, EXECUTE dicabut dari anon/authenticated.
- `calculate-campaign-reward` membaca ULANG submission dari DB, tidak memakai payload.
- Webhook Midtrans: verifikasi SHA512 timing-safe + cek nominal; refund/chargeback setelah `paid` dicatat dan memicu alert, tidak diabaikan diam-diam.
- Ganti semua stub Fase 7 dengan RPC nyata.
- `mature-pending-balance` dan `withdrawal-callback` (Iris) TIDAK dimigrasi; pastikan tidak ada `pending_balance` tersisa menurut audit Fase 0.
- Aksi admin (suspend, unsuspend, verify-kyc, review-appeal, review-withdrawal) dicatat ke tabel baru `admin_actions`.

## Selesai bila
- Semua alur uang berjalan lewat RPC.
- Test finance dan uji konkurensi lulus.
- Sandbox E2E lulus.
- Rekonsiliasi = 0 selisih.
- Log `progress/fase-08.md` ditulis.
```
