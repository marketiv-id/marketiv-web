# Fase 1 — Hosting ke Netlify (backend tetap Appwrite)

**Bobot:** S

> **Keputusan 2026-10-31:** hosting memakai **Netlify Free**, menggantikan rencana awal Vercel. Vercel Hobby melarang pemakaian komersial, dan pemilik memilih seluruh stack tanpa biaya. Alasan lengkap dan batasannya ada di [README](./README.md#keputusan) dan `progress/fase-00.md`.

## Tujuan

Pindahkan hosting app user dan admin dari Appwrite Sites ke Netlify **tanpa** mengubah backend.

Alasan dipisah dari fase lain:
- Risiko pindah hosting tidak bercampur dengan risiko migrasi data.
- Route Handler yang dibuat di fase-fase berikutnya langsung berjalan di platform targetnya.

## Batasan Netlify Free yang membentuk fase ini
- **300 kredit per bulan, tanpa overage.** Kalau habis, semua site di tim di-pause sampai akhir bulan.
  - Deploy produksi memakan 15 kredit. Deploy Preview dan branch deploy gratis.
  - Bandwidth, compute, dan request juga memakan kredit.
- **Function berjalan di US East (Ohio).** Pemilihan region, termasuk Singapura, hanya untuk Pro.
- **Next.js didukung lewat adapter OpenNext Netlify**, termasuk App Router, Route Handler, Server Actions, dan middleware.

## Task

> Status per 2026-11-08 (sesi Fase 1). Langkah pemilik dan urutan domain ada di [runbook/netlify-hosting.md](./runbook/netlify-hosting.md). Detail dan deviasi di [progress/fase-01.md](./progress/fase-01.md).

- [x] Hubungkan repo ke dua site Netlify (dibuat pemilik):
  - `marketiv-web`: base directory `/` → dibuat sebagai **`marketiv-production`** (nama `marketiv-web` sudah dipakai di Netlify)
  - `marketiv-admin`: base directory `admin` → deploy pertama tidak menjalankan build dan `/` 404, karena build command UI kosong dan publish = `admin/`; diperbaiki oleh `admin/netlify.toml` (runbook A.1)
- [x] Tambah `netlify.toml` di root dan di `admin/`: perintah build, versi Node, dan `publish` sesuai adapter Next.js Netlify.
- [x] **Matikan auto-publish produksi** di kedua site. Tombol "Stop auto publishing" tidak dipakai; production branch kedua site = `production`, jadi deploy produksi hanya terjadi saat merge sengaja ke `production`. Ditambah perintah `ignore` yang melewati build bila app tidak berubah.
- [ ] Salin env `NEXT_PUBLIC_APPWRITE_*`, `VERTEX_AI_*`, `OPENROUTER_*`, dan `SENTRY_*` ke Netlify, dengan scope Deploy Preview, Branch deploy, dan Production sesuai kebutuhan.
  - [x] Production: diisi pemilik di UI (diverifikasi lewat Netlify MCP), kecuali `NEXT_PUBLIC_SENTRY_DSN`
  - [x] Deploy Preview + Branch deploy, env publik: di `netlify.toml` dan `admin/netlify.toml`
  - [ ] Deploy Preview + Branch deploy, secret dan runtime (`VERTEX_AI_*`, `OPENROUTER_*`, `SENTRY_ENVIRONMENT`, `NEXT_PUBLIC_MIDTRANS_CLIENT_KEY` sandbox) dan `NEXT_PUBLIC_SENTRY_DSN` di semua konteks: pemilik (runbook A.5)
- [x] Cek `next.config.ts` dan `admin/next.config.ts`: wrapper Sentry dan `images.remotePatterns`. Pastikan `sgp.cloud.appwrite.io` dan `api.marketiv.id` tetap ada.
- [x] Map branch:
  - [x] `production` → Production (production branch kedua site)
  - [x] `staging` → branch deploy staging (diatur pemilik)
  - [x] `migrasi-supabase` → branch deploy, dipakai QA migrasi mulai Fase 4 dengan env Supabase staging (diatur pemilik)
- [ ] Pindahkan domain dengan urutan (runbook B dan C):
  1. Domain staging: **`staging.marketiv.id` dan `staging.admin.marketiv.id`** (keputusan pemilik 2026-11-08, menggantikan `marketiv-dev.my.id`; branch subdomain Netlify)
  2. Verifikasi
  3. `marketiv.id` dan `admin.marketiv.id`
- [ ] Pastikan cookie sesi Appwrite tetap first-party. API custom domain harus satu domain induk dengan app (rencana di runbook §4, eksekusi di runbook B.1):
  - prod: `api.marketiv.id` dan `api-admin.marketiv.id` dengan app di `marketiv.id` (tidak berubah)
  - staging: ~~`api.marketiv-dev.my.id` dan `api-admin.marketiv-dev.my.id` dengan app di `marketiv-dev.my.id`~~ → `api-staging.marketiv.id` dan `api-admin-staging.marketiv.id` dengan app di `staging.marketiv.id` / `staging.admin.marketiv.id`
- [ ] Tambahkan domain Netlify (`*.netlify.app` dan domain resmi) ke daftar Web Platform / allowed origin di Appwrite Console. Daftar lengkap di runbook §6 (pemilik).
- [ ] Verifikasi bahwa `after()` dari `next/server` berjalan di Netlify. Fase 7 bergantung padanya untuk kerja lambat. Kalau tidak jalan, catat di log supaya Fase 7 memakai alternatif. Route probe `/api/health/after` sudah ada; menunggu deploy (runbook §7).
- [ ] Ukur pemakaian kredit setelah satu minggu dan tulis perkiraan bulanan di log. (tertunda, 2026-11-15)
- [x] Perbarui `.github/workflows/ci.yml` bila perlu. Deploy dijalankan oleh Netlify, CI tetap menjalankan lint, typecheck, dan build.
- [ ] Matikan Appwrite Sites setelah domain prod stabil 7 hari. (tertunda)

## Verifikasi
Smoke test di domain Netlify, untuk staging lalu prod:
- Login UMKM dan kreator
- Dashboard
- Chat realtime
- Upload avatar
- Buat campaign draft
- Login admin dan antrean admin
- `/api/chat` (chatbot)
