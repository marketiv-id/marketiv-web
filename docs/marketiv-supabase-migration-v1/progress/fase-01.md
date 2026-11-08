# Fase 01 — Hosting ke Netlify (backend tetap Appwrite)

- Tanggal: 2026-11-08
- PR: _diisi setelah PR dibuat_
- Status: **sebagian**. Bagian repo selesai: `netlify.toml` kedua app, CI, probe `after()`, runbook, dan daftar env. Bagian dashboard menunggu pemilik: base directory admin, branch deploy, env non-prod yang berisi secret, domain staging/prod, Web Platform Appwrite, dan smoke test. Sesi cloud tidak bisa membuka domain Netlify atau Marketiv (proxy menolak), jadi smoke test dan verifikasi `after()` belum bisa dijalankan dari sesi.

## Status task
- [x] Hubungkan repo ke dua site Netlify (dikerjakan pemilik)
  - [x] Situs user dibuat sebagai **`marketiv-production`** (nama `marketiv-web` sudah dipakai di Netlify), base `/`. Deploy produksi pertama `6aeff301b76db6e06302a304` (commit `534a9ad`, branch `production`) **ready**, adapter `@netlify/plugin-nextjs@5.16.6`, 1 Function, region `us-east-2`.
  - [ ] Situs `marketiv-admin`: deploy produksi pertama `6aeff3149ed18c1333bfd3ca` selesai **5 detik tanpa build**, tanpa plugin Next.js, dan `/` mengembalikan **404** (log request Netlify). Base directory atau build command kemungkinan belum benar → runbook A.1.
- [x] `netlify.toml` di root dan `admin/`
- [x] Auto-publish produksi: pemilik memakai production branch = `production` di kedua situs (tombol "Stop auto publishing" tidak ditemukan di UI). Ditambah perintah `ignore` supaya situs yang app-nya tidak berubah tidak di-build.
- [ ] Env
  - [x] Produksi, situs user: 24 variabel diisi pemilik. Yang belum ada: `NEXT_PUBLIC_SENTRY_DSN`.
  - [x] Produksi, situs admin: 6 variabel, lengkap.
  - [x] Non-produksi (Deploy Preview + Branch deploy), env publik: di `netlify.toml` dan `admin/netlify.toml`.
  - [ ] Non-produksi, secret dan runtime (`VERTEX_AI_*`, `OPENROUTER_*`, `SENTRY_ENVIRONMENT`, `NEXT_PUBLIC_MIDTRANS_CLIENT_KEY` sandbox) dan `NEXT_PUBLIC_SENTRY_DSN`: pemilik, runbook A.5.
- [x] Cek `next.config.ts` dan `admin/next.config.ts`: `sgp.cloud.appwrite.io` dan `api.marketiv.id` ada di kedua file. Root memakai `images.unoptimized: true`, jadi tidak memakai Netlify Image CDN (hemat kredit). Wrapper Sentry tetap; fallback environment yang spesifik Vercel diganti (lihat Keputusan).
- [ ] Map branch
  - [x] `production` → Production
  - [ ] `staging` dan `migrasi-supabase` → branch deploy (pemilik, runbook A.3; Netlify MCP tidak punya operasi pengaturan build)
- [ ] Domain staging → verifikasi → prod (pemilik, runbook B dan C)
- [ ] Cookie first-party: rencana selesai (runbook §4); eksekusi butuh custom domain Appwrite staging `api-staging.marketiv.id` dan `api-admin-staging.marketiv.id` (runbook B.1)
- [ ] Web Platform Appwrite: daftar lengkap di runbook §6 (pemilik)
- [ ] `after()`: probe `/api/health/after` siap; menunggu deploy dan satu kali buka URL (runbook §7)
- [ ] Ukur kredit setelah satu minggu (tertunda, 2026-11-15)
- [x] `.github/workflows/ci.yml`
- [ ] Matikan Appwrite Sites setelah domain prod stabil 7 hari (tertunda)

## File dibuat / diubah
- `netlify.toml` — build situs user: `npm run build`, publish `.next`, Node 22, `ignore` hemat build, env publik non-produksi (Appwrite staging).
- `admin/netlify.toml` — sama untuk situs admin; `ignore` hanya melihat `admin/`.
- `src/app/api/health/after/route.ts` — probe `after()`: menjadwalkan callback yang menulis satu baris log `after-probe` + `probeId`. Tidak membaca data, tanpa PII.
- `.github/workflows/ci.yml` — trigger `staging`, `production`, `migrasi-supabase` (sebelumnya `master`, yang sudah tidak ada); job terpisah untuk root dan `admin/`; Node 22; `next typegen` sebelum typecheck; test; build dengan env publik tiruan. Lint root non-blocking sementara.
- `sentry.client.config.ts`, `sentry.server.config.ts`, `sentry.edge.config.ts` — fallback environment `NEXT_PUBLIC_VERCEL_ENV` → `NEXT_PUBLIC_APP_ENV`.
- `docs/marketiv-supabase-migration-v1/runbook/netlify-hosting.md` — runbook baru: peta situs, aturan rilis hemat kredit, daftar env, langkah domain staging lalu prod, Web Platform, verifikasi `after()`, checklist smoke test.
- `docs/marketiv-supabase-migration-v1/01-hosting-netlify.md` — checkbox dan catatan status.

## Keputusan & deviasi dari rencana
- **Domain staging = `staging.marketiv.id` dan `staging.admin.marketiv.id`, bukan `marketiv-dev.my.id`** (keputusan pemilik 2026-11-08).
  - Alasan: Netlify Free hanya memberi domain custom ke branch deploy lewat branch subdomain `<branch>.<domain utama situs>`. Nama di luar domain utama butuh situs terpisah yang setiap deploy staging-nya memakan 15 kredit.
  - API staging pindah ke `api-staging.marketiv.id` dan `api-admin-staging.marketiv.id` supaya cookie tetap first-party. Host staging admin berubah dari `admin-staging.marketiv.id` menjadi `staging.admin.marketiv.id`.
  - Branch subdomain baru bisa dibuat setelah `marketiv.id` dan `admin.marketiv.id` **ditambahkan** ke situs Netlify. Menambahkan domain tidak mengubah DNS, jadi urutan "staging dulu" tetap terjaga.
  - Sampai domain baru aktif, build non-prod memakai API staging yang aktif sekarang: `api.marketiv-dev.my.id` / `api-admin.marketiv-dev.my.id` (konfirmasi pemilik).
- **DNS `marketiv.id` dikelola Appwrite.** Registrar Hostinger, tetapi nameserver = `ns1.appwrite.zone` / `ns2.appwrite.zone` (dibaca lewat Hostinger API, read-only). Semua perubahan DNS dilakukan di Appwrite Console → Domains. Zona DNS di hPanel tidak aktif (isinya basi: apex ke CDN Hostinger, `staging`/`finance` ke server Hostinger).
- **Env publik non-produksi disimpan di `netlify.toml`**, bukan di UI. Alasan: bisa direview di PR, Fase 4 cukup menambah blok `[context.migrasi-supabase.environment]`, dan tidak ada risiko menimpa nilai produksi lewat API env Netlify. Nilai produksi dan semua secret tetap di UI.
- **Perintah `ignore` di kedua `netlify.toml`** melewati build bila app situs tidak berubah. Commit docs-only atau admin-only ke `production` tidak lagi memakan 15 kredit di situs user. Fail-open: build pertama, tanpa cache, atau `git diff` gagal tetap build. Diuji lokal: `534a9ad..fd2fd90` (docs saja) → lewati; `fd2fd90..71d30f2` (menyentuh `.gitignore`) → build.
- **Variabel global project Appwrite tidak dipindah ke Netlify di fase ini.** Tidak ada Route Handler yang memakainya selama backend masih Appwrite. Dipindah saat Route Handler pengganti Function dibuat (Fase 6–8). Ini menggantikan catatan Fase 0 yang menyebut inventarisasi saat Fase 1.
- **Fallback environment Sentry** `NEXT_PUBLIC_VERCEL_ENV` diganti `NEXT_PUBLIC_APP_ENV`. Variabel Vercel tidak ada di Netlify, sehingga event browser (yang tidak bisa membaca `SENTRY_ENVIRONMENT`) selalu bertag `staging`.
- **Lint root di CI non-blocking sementara** (`continue-on-error`). Ada 4 error lint lama yang sudah dicatat sejak Fase 0, di luar scope. CI sebelumnya tidak pernah jalan karena trigger `master`.
- **Rencana rilis:** maksimal satu rilis produksi per minggu (satu rilis kedua app = 30 kredit). Ditulis di runbook §2.
- Prompt Fase 1 meminta persetujuan rencana sebelum mengubah kode. Pemilik meminta semua task kartu dikerjakan tuntas dalam satu sesi, jadi rencana langsung dieksekusi. Dua keputusan yang memang milik pemilik (domain staging, endpoint API staging) ditanyakan di sesi.

## Hasil verifikasi
| Perintah / skenario | Hasil |
|---|---|
| `npm run typecheck` (root, setelah `npx next typegen`) | lulus |
| `npm run lint` (root) | **gagal**: 4 error, 48 warning. Sama persis dengan baseline Fase 0; tidak ada temuan dari file fase ini (`eslint` pada file baru/diubah bersih) |
| `npm test -- --run` (root) | lulus: 81 file, 448 test |
| `npm run build` (root, env produksi tiruan) | lulus; `/api/chat` dan `/api/health/after` sebagai route dinamis |
| `npm run build` (root, tanpa env app) | gagal, sesuai desain: `NEXT_PUBLIC_ADMIN_APP_URL is required`. Karena itu CI dan konteks non-prod Netlify diberi env publik |
| `npm run lint` (admin) | lulus (0 error, 6 warning) |
| `npm run typecheck` (admin, setelah `npx next typegen`) | lulus |
| `npm test -- --run` (admin) | lulus: 8 file, 77 test |
| `npm run build` (admin, env produksi tiruan) | lulus; semua route statis |
| `npm run build` (admin, tanpa env app) | gagal, sesuai desain: `NEXT_PUBLIC_APPWRITE_ENDPOINT is required` |
| `npm run animation-audit`, `npm run validate-data-contracts` | lulus (annotate-only) |
| Parse `netlify.toml` dan `admin/netlify.toml` (tomllib) | valid |
| Simulasi perintah `ignore` (bash lokal) | lewati untuk diff docs-only; build untuk diff yang menyentuh app, cache kosong, atau commit sama |
| Netlify: deploy produksi situs user | ready; `/` dilindungi team login (401 sebelum login), lalu dilayani Function Next.js |
| Netlify: deploy produksi situs admin | **rusak**: tanpa build, `/` 404 (runbook A.1) |
| Smoke test staging | **belum**: domain staging belum dipasang; sesi tidak bisa membuka domain Netlify/Marketiv |
| Smoke test produksi | **belum** |
| `after()` di Netlify | **belum**: probe siap, menunggu deploy |
| `supabase db reset` / `supabase test db` | tidak relevan (fase hosting) |

## Env / secret baru (nama saja)
- `NETLIFY_FORCE_BUILD` — opsional, env UI Netlify. `true` memaksa build walau `ignore` akan melewatinya. Hapus setelah dipakai.
- `SENTRY_AUTH_TOKEN` — opsional, secret scope Builds di situs user, untuk upload source map Sentry.
- Nama env lain sudah ada; daftar lengkap per situs dan konteks ada di runbook §3.

## Isu terbuka
- **Situs admin Netlify belum ter-build** (deploy 5 detik, 404). Pemilik cek base directory = `admin` (runbook A.1), lalu Trigger deploy `staging`.
- **Branch deploy `staging` dan `migrasi-supabase` belum bisa diverifikasi** dari sesi (Netlify MCP tidak punya operasi build settings). Pemilik mengaktifkannya (runbook A.3).
- **Env non-produksi yang berisi secret belum ada.** Tanpa `VERTEX_AI_*`/`OPENROUTER_*` di konteks non-prod, `/api/chat` di staging gagal. Tanpa `NEXT_PUBLIC_MIDTRANS_CLIENT_KEY` non-prod, Snap sandbox di staging gagal.
- **`NEXT_PUBLIC_SENTRY_DSN` belum ada di semua konteks**, jadi Sentry tidak mengirim event.
- **`NEXT_PUBLIC_MIDTRANS_ENV` produksi = `sandbox`.** Pemilik perlu memastikan ini disengaja.
- **Team login Netlify aktif untuk semua deploy, termasuk produksi.** Wajib diubah ke "non-production only" sebelum DNS prod dipindah (runbook C.3).
- **Org Appwrite turun ke plan Free (2026-11-08).** Menurut catatan pemilik di kartu persiapan, hanya tersisa 1 bucket (`campaign-assets`) dan 2 Function (`create-user-profile`, `create-user-wallet`) per project, dan 1 member. Akibatnya:
  - Smoke test upload avatar, alur pembayaran, escrow, dan fitur lain yang bergantung pada bucket/Function yang hilang kemungkinan gagal, **terlepas dari hosting**.
  - Custom domain API staging baru (`api-staging.marketiv.id`, `api-admin-staging.marketiv.id`) mungkin ditolak plan Free. Fallback ada di runbook B.1.
  - Status Appwrite Sites di plan Free belum diketahui. Bila Sites ikut dibatasi, pindah domain prod ke Netlify menjadi lebih mendesak.
- **Sertifikat staging sebelum domain prod pindah** belum pasti bisa terbit (domain utama belum mengarah ke Netlify). Fallback di runbook B.5.

## Isu untuk fase lain
- **Fase 4:** tambahkan `[context.migrasi-supabase.environment]` di `netlify.toml` dan `admin/netlify.toml` untuk env publik Supabase staging (URL, anon key). Konteks branch spesifik mengalahkan `branch-deploy`. Secret (service role) tetap di UI dengan konteks branch `migrasi-supabase`. Tambahkan host `migrasi-supabase.marketiv.id` sebagai branch subdomain bila perlu (runbook B.9).
- **Fase 6–8:** pindahkan variabel global project Appwrite yang masih dipakai (Midtrans server key, dan sebagainya) ke env Netlify **UI** dengan scope Functions, saat Route Handler pengganti dibuat.
- **Fase 7:** baca hasil verifikasi `after()` di log ini sebelum mendesain kerja lambat. Bila belum terisi, jalankan runbook §7 dulu.
- **Fase 10/11:** DNS `marketiv.id` ada di Appwrite (nameserver `appwrite.zone`). Sebelum Appwrite dilepas total, salin semua record dan pindahkan nameserver di registrar Hostinger (ke Netlify DNS atau DNS Hostinger). Kalau tidak, domain mati bersama Appwrite. Masukkan ke checklist cutover dan cleanup.
- **Fase 11:** hapus situs Node.js lama di Hostinger (`marketiv.id`, `staging.marketiv.id`, `finance.marketiv.id`) bila tidak dipakai, dan bersihkan zona DNS hPanel yang basi.
- **Repo (Sentry):** `sentry.client.config.ts` hanya di-import oleh `/sentry-example-page`. Tidak ada `instrumentation-client.ts`, jadi Sentry browser tidak aktif di halaman lain. Perlu diperbaiki di luar jalur migrasi.
- **Repo (CI):** `pre-merge-quality-gate.yml` dan `animation-audit.yml` masih memakai trigger `master`, jadi tidak pernah jalan. Keduanya lulus lokal; bisa dipindah ke `staging` kapan saja.
- **Repo (lint):** 4 error lint lama. Setelah diperbaiki, hapus `continue-on-error` pada langkah Lint root di `ci.yml`.

## Catatan serah-terima untuk fase berikutnya
- Netlify: tim `marketiv-marketiv` (Free). Situs user `marketiv-production` (`95d13aa2-e50b-4455-8331-1daf57602f2c`), situs admin `marketiv-admin` (`80afc8f2-8792-48f8-b941-c1786bea00d9`). Netlify MCP bisa membaca project, deploy, env, dan log request, serta mengubah env dan visitor access. MCP tidak bisa mengubah build settings atau domain.
- Sesi cloud tidak bisa membuka `*.netlify.app`, `marketiv.id`, atau `marketiv-dev.my.id` (proxy 403). Untuk memeriksa perilaku runtime, pakai log request Netlify lewat MCP (`get-request-logs`, retensi ±24 jam di Free).
- Mengubah env apa pun di Netlify butuh redeploy. Env publik non-prod ada di `netlify.toml`; ubah lewat PR.
- Build kedua app gagal tanpa env publik (fail-closed). Jangan menghapus env publik dari konteks mana pun.
- Commit yang hanya menyentuh `docs/` tidak memicu build situs user maupun admin (perintah `ignore`).
