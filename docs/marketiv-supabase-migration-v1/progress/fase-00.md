# Fase 00 — Persiapan & spike

- Tanggal: 2026-10-25
- PR: https://github.com/marketiv-id/marketiv-web/pull/27
- Status: sebagian. Spike, audit, dan keputusan semua anomali selesai. Infrastruktur berbayar (Supabase prod, Vercel, SMTP) ditunda atas keputusan pemilik.

## Status task

### Infrastruktur
- [ ] Project Supabase `marketiv-staging` dan `marketiv-prod` di `ap-southeast-1`
  - [x] `marketiv-staging`: ref `zwrzwkesaetzbnajjxqc`, `ap-southeast-1`, Postgres 17, plan Free. Diverifikasi lewat Supabase MCP.
  - [ ] `marketiv-prod`: ditunda (pemilik memilih tanpa biaya untuk saat ini)
- [ ] Project Vercel `marketiv-web` dan `marketiv-admin` (`sin1`): belum dibuat. Dicek lewat Vercel MCP, tim `pnjias-projects`, 0 project.
- [ ] Custom SMTP Supabase Auth + SPF/DKIM: belum. Staging akan memakai Mailtrap.
- [ ] Secret di password manager tim: tanggung jawab pemilik, tidak bisa diverifikasi dari sesi.

### Spike 1 — impor password
- [x] Export 1 user uji dari Appwrite (staging)
- [x] Import ke Supabase staging dengan hash Argon2
- [x] Login memakai password lama
- [x] Hasil: **BERHASIL**. Rencana B tidak diperlukan.

### Spike 2 — file besar
- [ ] Batas global dan per bucket 500 MB: tidak bisa di Free (maks 50 MB)
- [x] `createSignedUploadUrl` + `uploadToSignedUrl` dan TUS: lulus di 49 MB. Uji 500 MB belum dilakukan.

### Audit data live (read-only)
- [x] `audit-live.mjs`, `drift.mjs`, `audit-legacy-money-state.mjs` ke produksi
- [x] Jumlah baris per tabel dan file per bucket
- [x] Baris yatim
- [x] File privat di `campaign-assets`
- [x] Admin: 1 kandidat (`6a8cd8c4002ecd2aac61`), dikonfirmasi sah oleh pemilik
- [x] Campaign `active` tanpa payment `paid`
- [x] Ledger ganda dan wallet ≠ Σ ledger

## File dibuat / diubah
- `scripts/migration/spikes/package.json`, `package-lock.json` — dependensi terisolasi (`@supabase/supabase-js` 2.117.3, `tus-js-client` 4.3.1). `package.json` root tidak berubah.
- `scripts/migration/spikes/_lib.mjs` — client Appwrite GET-only dari env, paginasi cursor, helper penyamaran hash.
- `scripts/migration/spikes/spike1-password-import.mjs` — Spike 1.
- `scripts/migration/spikes/spike2-large-upload.mjs` — Spike 2 (standard signed upload, TUS dengan `x-signature`, uji resume, uji penolakan ukuran).
- `scripts/migration/spikes/audit-appwrite.mjs` — audit produksi, keluaran JSON tanpa PII. Email kandidat admin ditulis hanya ke path di luar repo.
- `docs/marketiv-supabase-migration-v1/audit/2026-10-25-appwrite-prod.md` dan `.json` — laporan audit dan keputusan anomali.
- `docs/marketiv-supabase-migration-v1/00-persiapan.md` — checkbox dan hasil spike/audit.
- Kode app (`src/`, `admin/src/`) tidak berubah.

## Keputusan & deviasi dari rencana
- **Default branch adalah `staging`, bukan `main`.** `main` tidak ada di remote. `migrasi-supabase` dibuat dari `origin/staging` (`fd2fd90`). Di semua dokumen migrasi, baca "`main`" sebagai `staging`.
- **Project ID Appwrite:** produksi = `6a8c45ef0023ae195594`, staging = `69f9d45b00315cb0ec2f`. ID database keduanya sama: `6a4c8598001da3b0d7f0`. `00_BACKEND/appwrite.config.json` dan default di `00_BACKEND/appwrite/ops/client.mjs` memakai project **staging**. Skrip ops lama tanpa env akan mengenai staging.
- **Endpoint audit:** custom domain `api.marketiv.id` diblok proxy sesi. Audit memakai `https://sgp.cloud.appwrite.io/v1` dengan project ID produksi; backend-nya sama.
- **Spike 1 memakai Appwrite staging**, bukan produksi, supaya akun uji tidak dibuat di produksi. Format hash produksi diverifikasi terpisah lewat audit (Argon2id PHC, dua varian parameter).
- **Tanpa biaya (keputusan pemilik):** semua project di plan Free. Akibatnya:
  - Spike 2 diuji di 49 MB, bukan 500 MB.
  - Supabase prod (Pro) dan Vercel Pro ditunda.
  - Free tidak punya backup otomatis dan project di-pause setelah tidak aktif seminggu. Untuk data uang di produksi ini risiko nyata; putuskan sebelum Fase 10.
  - Vercel Hobby hanya mengizinkan cron harian. Fase 1/8 perlu alternatif, misalnya `pg_cron` Supabase.
- **Campaign aktif tanpa dana (6):** pemilik memilih opsi (a). Saat migrasi, campaign diubah ke `draft` dengan budget 0.
- **Admin:** pemilik mengonfirmasi `6a8cd8c4002ecd2aac61` sebagai admin sah yang ia buat sendiri. Allowlist admin migrasi = `['6a8cd8c4002ecd2aac61']`.
- **`NO-VARS` di `audit-live`:** bukan kerusakan. Pemilik mengonfirmasi produksi memakai variabel global tingkat project, yang tidak dibaca `audit-live.mjs`.
- **Project Appwrite `6a7c4a5d00027d86524c` diabaikan.** Project ini juga bernama "Marketiv Production" dan berisi Function `accept-tos` dan `expire-stale-claims`; ia terlihat di komentar bot Appwrite pada PR. Pemilik mengonfirmasi project ini tidak pernah dipakai dan tidak berisi data penting. Produksi saat launching adalah `6a8c45ef0023ae195594`. Project `…524c` tidak ikut diaudit maupun dimigrasi.
- **Node `fetch` di sesi cloud** butuh `NODE_USE_ENV_PROXY=1` untuk lewat proxy.

## Hasil verifikasi
| Perintah / skenario | Hasil |
|---|---|
| Spike 1 (`spike1-password-import.mjs`) | BERHASIL: login password lama OK, password salah ditolak, login kedua OK, cleanup OK |
| Spike 2 (`spike2-large-upload.mjs`, 49 MB) | BERHASIL: standard 6,6 s; TUS 11,5 s; resume OK; 51 MB ditolak 413; bucket 500 MB ditolak di Free |
| `audit-appwrite.mjs` (produksi) | 95 baris, 13 file, 15 user Auth, 0 yatim, 3 anomali kritis (lihat laporan audit) |
| `audit-legacy-money-state.mjs` (produksi) | semua nol |
| `audit-live.mjs` (produksi) | bucket/tabel/kolom sama dengan config; 57 blocker, semuanya `NO-VARS` (alarm palsu: variabel global project); 13 warning |
| `drift.mjs` (produksi) | 4 field berlaku langsung + 66 field butuh deploy berbeda dari config; exit 1 |
| `npm run lint` (root) | **gagal**: 4 error, 48 warning. Semua di file app yang tidak disentuh fase ini (`FloatingDemoBar.tsx`, `create-campaign.autodraft.ts`, `BriefGuidelineStep.tsx`, `BudgetQuotaStep.tsx`). Sudah ada sebelumnya. |
| `npm run typecheck` (root) | **gagal** di checkout baru: deklarasi modul `.png`/`.svg` hilang karena `next-env.d.ts` (gitignored) belum dibuat. **Lulus** setelah `npx next typegen`. |
| `npm test -- --run` (root) | lulus: 81 file, 448 test |
| `npm run lint` (admin) | lulus |
| `npm run typecheck` (admin) | sama seperti root: gagal di checkout baru, **lulus** setelah `npx next typegen` |
| `npm test -- --run` (admin) | lulus: 8 file, 77 test |
| `supabase db reset` / `supabase test db` | tidak relevan (belum ada skema; Fase 2) |

## Env / secret baru (nama saja)
- `APPWRITE_ENDPOINT`, `APPWRITE_PROJECT_ID`, `APPWRITE_DATABASE_ID`, `APPWRITE_API_KEY` — Appwrite **produksi**, read-only. Untuk audit.
- `APPWRITE_STAGING_ENDPOINT`, `APPWRITE_STAGING_PROJECT_ID`, `APPWRITE_STAGING_API_KEY` — Appwrite staging, read-only. Untuk Spike 1.
- `SPIKE_TEST_EMAIL`, `SPIKE_TEST_PASSWORD` — akun uji kreator di Appwrite staging.
- `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` — Supabase `marketiv-staging`.
- Opsional: `SPIKE_FILE_MB`, `SPIKE_BUCKET_LIMIT_MB` — ukuran uji Spike 2.

## Isu terbuka
- **Supabase prod & Vercel:** belum dibuat. Putuskan Free vs berbayar sebelum Fase 1 (Vercel) dan Fase 10 (Supabase prod).
- **Spike 2 pada 500 MB** belum diuji. Ulangi saat ada project Pro, atau ubah batas `deliverables` di produk menjadi ≤ 50 MB.
- **SMTP Supabase Auth** belum diatur. Staging: Mailtrap. Produksi: menyusul.
- **PR memicu build preview Appwrite.** Integrasi VCS Appwrite membangun Function staging dan site untuk setiap PR, dan hasilnya sering gagal atau tertunda (juga di PR sebelumnya). Function produksi tidak terhubung ke branch git mana pun. Status merah ini bukan CI repo.

## Isu untuk fase lain
- **Fase 1:** pemilik menolak biaya. Rencanakan alternatif cron `*/15` (Vercel Hobby hanya harian), misalnya `pg_cron` + `pg_net` memanggil route, atau cron eksternal gratis. Custom domain `api.marketiv.id` / `api.marketiv-dev.my.id` adalah domain Appwrite; domain app untuk Vercel perlu ditentukan. Secret Function lama ada di variabel **global project** Appwrite, bukan per Function. Inventarisasi lewat Console saat memindahkannya ke env Vercel, karena `audit-live.mjs` tidak membacanya.
- **Fase 2:**
  - Baris `users` punya `$id` sendiri (≠ ID Auth); relasi lewat `users.userId`. `public.users.id` = UUID dari `legacy_user_map(userId)`. `$id` lama tidak dirujuk tabel mana pun (diverifikasi: 0 referensi).
  - `export-appwrite.ts` wajib memakai env project produksi secara eksplisit, karena default repo menunjuk staging.
  - Skema produksi sama dengan `appwrite.config.json` (bucket/tabel/kolom, menurut `audit-live`).
- **Fase 4:**
  - Admin hanya dari `app_metadata.role`, diisi dari allowlist `['6a8cd8c4002ecd2aac61']` yang dikonfirmasi pemilik. `prefs.role` dan `users.role` lama tidak dipercaya.  - 2 user Google tanpa password: desain penautan identitas OAuth berdasarkan email.
  - 1 akun Auth tanpa baris `users` (`6aba8a340034686abc0f`): onboarding harus menangani user Auth tanpa profil.
- **Fase 6:** upload file besar dari browser memakai TUS + `x-signature` ke `https://<ref>.storage.supabase.co/storage/v1/upload/resumable/sign`, chunk 6 MiB. Batas ukuran Supabase dalam MB desimal.
- **Fase 9:**
  - Transform A1: 6 campaign → `draft`, `remaining_budget = 0`, `spent_amount = 0`, `published_at = null`.
  - `audit-appwrite.mjs` bisa dipakai ulang sebagai baseline `reconcile.ts`. Rumus saldo dari ledger lama ada di laporan audit.
  - Impor `password_hash` apa adanya (dua varian parameter Argon2id).
- **Repo (lint):** 4 error lint yang sudah ada sebelumnya di komponen create-campaign dan demo bar. Perlu diperbaiki di luar jalur migrasi supaya CI fase-fase berikutnya bersih.

## Catatan serah-terima untuk fase berikutnya
- Basis kerja: `migrasi-supabase` (dari `staging`). PR fase ke `migrasi-supabase`.
- Setelah `npm ci` di checkout baru, jalankan `npx next typegen` di root dan `admin/` sebelum `npm run typecheck`.
- Untuk skrip Node yang memakai `fetch` di sesi cloud, set `NODE_USE_ENV_PROXY=1`. Untuk Appwrite produksi pakai `APPWRITE_ENDPOINT=https://sgp.cloud.appwrite.io/v1`, karena `api.marketiv.id` tidak lolos proxy.
- Supabase staging kosong: user uji Spike 1 dan bucket `spike-upload` sudah dihapus.
- Data produksi sangat kecil (95 baris). Gladi resik Fase 9 akan cepat; risiko utama ada di kebenaran transform, bukan durasi.
