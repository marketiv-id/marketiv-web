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
- [ ] Hubungkan repo ke dua site Netlify (dibuat pemilik):
  - `marketiv-web`: base directory `/`
  - `marketiv-admin`: base directory `admin`
- [ ] Tambah `netlify.toml` di root dan di `admin/`: perintah build, versi Node, dan `publish` sesuai adapter Next.js Netlify.
- [ ] **Matikan auto-publish produksi** di kedua site. Deploy produksi hanya lewat langkah sengaja (publish manual atau branch rilis), supaya kredit tidak habis oleh setiap push.
- [ ] Salin env `NEXT_PUBLIC_APPWRITE_*`, `VERTEX_AI_*`, `OPENROUTER_*`, dan `SENTRY_*` ke Netlify, dengan scope Deploy Preview, Branch deploy, dan Production sesuai kebutuhan.
- [ ] Cek `next.config.ts` dan `admin/next.config.ts`: wrapper Sentry dan `images.remotePatterns`. Pastikan `sgp.cloud.appwrite.io` dan `api.marketiv.id` tetap ada.
- [ ] Map branch:
  - `staging` → branch deploy staging
  - `production` → Production (publish manual)
  - `migrasi-supabase` → branch deploy, dipakai QA migrasi mulai Fase 4 dengan env Supabase staging
- [ ] Pindahkan domain dengan urutan:
  1. Domain staging (di bawah `marketiv-dev.my.id`; pastikan nama persisnya dengan pemilik)
  2. Verifikasi
  3. `marketiv.id` dan `admin.marketiv.id`
- [ ] Pastikan cookie sesi Appwrite tetap first-party. API custom domain harus satu domain induk dengan app:
  - prod: `api.marketiv.id` dan `api-admin.marketiv.id` dengan app di `marketiv.id`
  - staging: `api.marketiv-dev.my.id` dan `api-admin.marketiv-dev.my.id` dengan app di `marketiv-dev.my.id`
- [ ] Tambahkan domain Netlify (`*.netlify.app` dan domain resmi) ke daftar Web Platform / allowed origin di Appwrite Console.
- [ ] Verifikasi bahwa `after()` dari `next/server` berjalan di Netlify. Fase 7 bergantung padanya untuk kerja lambat. Kalau tidak jalan, catat di log supaya Fase 7 memakai alternatif.
- [ ] Ukur pemakaian kredit setelah satu minggu dan tulis perkiraan bulanan di log.
- [ ] Perbarui `.github/workflows/ci.yml` bila perlu. Deploy dijalankan oleh Netlify, CI tetap menjalankan lint, typecheck, dan build.
- [ ] Matikan Appwrite Sites setelah domain prod stabil 7 hari.

## Verifikasi
Smoke test di domain Netlify, untuk staging lalu prod:
- Login UMKM dan kreator
- Dashboard
- Chat realtime
- Upload avatar
- Buat campaign draft
- Login admin dan antrean admin
- `/api/chat` (chatbot)
