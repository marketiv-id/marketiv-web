# Fase 1 — Hosting ke Vercel (backend tetap Appwrite)

**Bobot:** S

## Tujuan

Pindahkan hosting app user dan admin dari Appwrite Sites ke Vercel **tanpa** mengubah backend.

Alasan dipisah dari fase lain:
- Risiko pindah hosting tidak bercampur dengan risiko migrasi data.
- Route Handler yang dibuat di fase-fase berikutnya langsung berjalan di platform targetnya.

## Task
- [ ] Hubungkan repo ke dua project Vercel:
  - `marketiv-web`: root `/`
  - `marketiv-admin`: root `admin`
- [ ] Salin env `NEXT_PUBLIC_APPWRITE_*`, `VERTEX_AI_*`, `OPENROUTER_*`, dan `SENTRY_*` ke Vercel, untuk Preview maupun Production.
- [ ] Cek `next.config.ts`: wrapper Sentry dan `images.remotePatterns`. Pastikan `sgp.cloud.appwrite.io` dan `api.marketiv.id` tetap ada.
- [ ] Map branch `staging` ke environment Preview/Staging dan `production` ke Production.
- [ ] Pindahkan domain dengan urutan:
  1. `staging.marketiv.id` dan `admin-staging.marketiv.id`
  2. Verifikasi
  3. `marketiv.id` dan `admin.marketiv.id`
- [ ] Pastikan cookie sesi Appwrite tetap first-party, yaitu API custom domain `api(-admin)(-staging).marketiv.id` masih satu domain induk dengan app.
- [ ] Tambahkan URL Vercel ke daftar Web Platform / allowed origin di Appwrite Console.
- [ ] Perbarui `.github/workflows/ci.yml` bila perlu. Deploy dijalankan oleh Vercel, CI tetap menjalankan lint, typecheck, dan build.
- [ ] Matikan Appwrite Sites setelah domain prod stabil 7 hari.

## Verifikasi
Smoke test di domain Vercel, untuk staging lalu prod:
- Login UMKM dan kreator
- Dashboard
- Chat realtime
- Upload avatar
- Buat campaign draft
- Login admin dan antrean admin
- `/api/chat` (chatbot)
