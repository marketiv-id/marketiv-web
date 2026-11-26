# Inventaris environment variable

Daftar semua env yang dibaca kode app user (`/`) dan app admin (`admin/`) setelah migrasi Supabase, tempat menyimpannya, dan status per context Netlify. Dokumen ini **tidak** berisi nilai rahasia — hanya nama, tempat, dan aturan.

Diperbarui: 2026-11-26 (setelah Fase 8). Perbarui setiap kali ada env baru/dihapus.

## Cara membaca

**Tiga tempat penyimpanan:**

| Tempat | Untuk apa | Bisa dibaca ulang? |
|---|---|---|
| `netlify.toml` (app user) / `admin/netlify.toml` (app admin) — blok `[context.<nama>.environment]` | Nilai **publik** non-produksi (aman masuk git) | Ya, di repo |
| Netlify UI: site → **Site configuration → Environment variables** | Semua nilai **rahasia**, dan semua nilai **Production** | Nama: ya. Nilai bertanda *Contains secret values*: **tidak** (hanya bisa ditimpa) — simpan salinannya di password manager |
| Lokal: `.env.local` / `admin/.env.local` (lihat `.env.example`, `admin/.env.example`) | Development di laptop | Ya (jangan di-commit) |

**Aturan penting:**
- **Prioritas build:** bila nama yang sama ada di `netlify.toml` dan di UI untuk context yang sama, **`netlify.toml` yang menang**. Jangan isi env publik non-produksi di UI — akan tertimpa diam-diam.
- **Context spesifik branch mengalahkan context umum:** `[context.migrasi-supabase.environment]` > `[context.branch-deploy.environment]`. Karena itu blok branch menulis ulang seluruh nilai.
- **`NEXT_PUBLIC_*` = build-time:** nilainya ditanam ke bundle browser saat build. Mengubahnya butuh **redeploy**. Jangan pernah menaruh rahasia di `NEXT_PUBLIC_*`.
- **Env rahasia server** (tanpa `NEXT_PUBLIC_`) dibaca Route Handler saat runtime → scope Netlify minimal **Functions/Runtime** (paling aman: *All scopes*).
- **Production tidak diatur di `netlify.toml`** (disengaja, supaya file ini tidak bisa menimpa produksi). Semua env Production diisi di UI, context **Production**.

Kolom **Status** di tabel: **Wajib** = app gagal/fitur mati tanpa ini; **Opsional** = ada default; **Usang** = sisa Appwrite, dihapus di Fase 11.

## App user (`marketiv-production`)

### Supabase
| Env | Rahasia | Status | Default | Disimpan di | Dipakai untuk |
|---|---|---|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | – | Wajib | – | `netlify.toml` (preview/branch/`migrasi-supabase`); UI Production saat cutover | Semua akses Supabase (`src/lib/supabase/*`) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | – (publishable, dibatasi RLS) | Wajib | – | sama dengan di atas | Client browser & server (sesi user) |
| `SUPABASE_SERVICE_ROLE_KEY` | **Ya** | Wajib (server) | – | **UI Netlify**, context Deploy Previews + Branch deploys (staging). Production: kunci project Supabase **produksi** saat cutover | Semua Route Handler tulis/RPC (`src/lib/supabase/admin.ts`). **Jangan pernah** `NEXT_PUBLIC_` |

### Pembayaran (Midtrans)
| Env | Rahasia | Status | Default | Disimpan di | Dipakai untuk |
|---|---|---|---|---|---|
| `MIDTRANS_SERVER_KEY` | **Ya** | Wajib untuk bayar | – (tanpa ini route bayar/webhook 503) | **UI Netlify**. Non-prod: key **Sandbox** (`SB-Mid-server-…`). Production: key production, hanya saat cutover | Snap, cancel, verifikasi tanda tangan webhook (`src/server/payments/*`) |
| `MIDTRANS_IS_PRODUCTION` | – | Opsional | `false` (sandbox) | UI Production saat cutover = `true` | Base URL API Midtrans |
| `MIDTRANS_ENV` | – | Usang (fallback) | – | – | Fallback lama untuk `MIDTRANS_IS_PRODUCTION` |
| `NEXT_PUBLIC_MIDTRANS_CLIENT_KEY` | – (publik) | Wajib untuk bayar | – | **UI Netlify** (Sandbox `SB-Mid-client-…` / production) | Snap.js di browser (`src/lib/midtrans/snap.ts`) |
| `NEXT_PUBLIC_MIDTRANS_ENV` | – | Opsional | – | `netlify.toml` = `sandbox`; UI Production = `production` | Pilih script Snap sandbox/production |
| `FEE_RATE` | – | Opsional | `0.02` | UI | Fee buyer-side top-up campaign (`create_payment`). Escrow memakai `private.finance_settings` di DB — lihat *Di luar env* |

### Penarikan saldo (default = Function `request-withdrawal` lama)
| Env | Status | Default | Dipakai untuk |
|---|---|---|---|
| `MINIMUM_WITHDRAW` | Opsional | `50000` | Nominal minimum |
| `WITHDRAWAL_ADVANCED_GUARDS_ENABLED` | Opsional | `false` | Aktifkan guard lanjutan di bawah |
| `KYC_THRESHOLD` | Opsional | `5000000` | Wajib KYC di atas nominal ini (guard lanjutan) |
| `WITHDRAW_PER_DAY_LIMIT` | Opsional | `3` | Maks penarikan per hari (guard lanjutan) |
| `WITHDRAW_COOLING_DAYS` | Opsional | `3` | Masa tunggu rekening baru (guard lanjutan) |

Semua tidak rahasia, disimpan di UI bila ingin mengubah default. Dipakai di `src/server/withdrawals/request-withdrawal.ts`.

### AI (brief campaign + fraud precheck)
Urutan penyedia: Vertex AI → Gemini API key → OpenRouter. Tanpa satu pun: AI brief menjawab 503, analisis caption pada fraud precheck dilewati (review tidak terblokir).

| Env | Rahasia | Status | Default | Dipakai untuk |
|---|---|---|---|---|
| `VERTEX_AI_PROJECT_ID` | – | Opsional | – | Vertex AI (service account) |
| `VERTEX_AI_CLIENT_EMAIL` | – | Opsional | – | Vertex AI |
| `VERTEX_AI_PRIVATE_KEY` | **Ya** | Opsional | – | Vertex AI (private key service account; tulis `\n` apa adanya) |
| `VERTEX_AI_LOCATION` | – | Opsional | (default kode) | Vertex AI |
| `VERTEX_AI_MODEL` | – | Opsional | (default kode) | Vertex AI |
| `GEMINI_API_KEY` | **Ya** | Opsional | – | Gemini API |
| `GEMINI_MODEL` | – | Opsional | (default kode) | Gemini API |
| `OPENROUTER_API_KEY` | **Ya** | Opsional | – | Fallback OpenRouter |
| `OPENROUTER_MODEL` | – | Opsional | (default kode) | Fallback OpenRouter |

Disimpan di **UI Netlify** (yang rahasia ditandai secret). Kode: `src/server/ai/providers.ts`.

### Alur bisnis & fitur
| Env | Status | Default | Disimpan di | Dipakai untuk |
|---|---|---|---|---|
| `VIEW_VALIDATION_DELAY_HOURS` | Opsional | `72` | UI | Periode observasi views sebelum approve submission (route app user) |
| `NEXT_PUBLIC_CURRENT_TOS_VERSION` | Opsional | `v3.1` | UI bila versi ToS berubah | Versi ToS berjalan (status, accept, syarat accept offer & penarikan) |
| `NEXT_PUBLIC_ENABLE_GOOGLE_OAUTH` | Opsional | `false` | `netlify.toml` = `false`; aktifkan setelah Google OAuth dikonfigurasi di Supabase prod | Tombol login Google |
| `NEXT_PUBLIC_UMKM_ONBOARDING_TOUR_ENABLED` | Opsional | mati | UI | Tur onboarding UMKM |
| `NEXT_PUBLIC_USE_MOCK_DATA` | Opsional | `false` | `netlify.toml` = `false` | Mode data mock (dev/demo) — **harus `false`** di staging/produksi |
| `NEXT_PUBLIC_MOCK_ROLE` | Opsional | – | hanya lokal | Role mock saat `USE_MOCK_DATA=true` |
| `NEXT_PUBLIC_APP_ENV` | Opsional | – | `netlify.toml` = `staging`; UI Production = `production` | Label lingkungan, Sentry |
| `NEXT_PUBLIC_ADMIN_APP_URL` | Wajib | – | `netlify.toml` per context; UI Production | Tautan ke app admin |

### Observabilitas & build
| Env | Rahasia | Status | Disimpan di | Dipakai untuk |
|---|---|---|---|---|
| `NEXT_PUBLIC_SENTRY_DSN` / `SENTRY_DSN` | – (DSN publik) | Opsional | UI | Sentry (`sentry.*.config.ts`) |
| `SENTRY_ENVIRONMENT` | – | Opsional | UI | Label env Sentry |
| `NODE_VERSION` | – | Wajib build | `netlify.toml` = `22` | Node di build Netlify |
| `NEXT_TELEMETRY_DISABLED` | – | Opsional | `netlify.toml` = `1` | Matikan telemetri Next |
| `NETLIFY_FORCE_BUILD` | – | Opsional | UI | Paksa build walau `ignore` bilang lewati |

### Usang — Appwrite (hapus di Fase 11)
`NEXT_PUBLIC_APPWRITE_ENDPOINT`, `NEXT_PUBLIC_APPWRITE_PROJECT_ID`, `NEXT_PUBLIC_APPWRITE_DATABASE_ID`, `NEXT_PUBLIC_APPWRITE_STORAGE_BUCKET_ID`, `NEXT_PUBLIC_APPWRITE_BUCKET_*` (AVATARS, LOGOS, PORTFOLIOS, CAMPAIGN_ASSETS, CREATOR_BANNERS, DELIVERABLES, FRAUD_EVIDENCE). Hanya dibaca `src/lib/appwrite/*` yang sudah tidak dipanggil kode app sejak Fase 8. Masih ada di `netlify.toml` agar build branch lama (`staging`) tetap jalan.

`CRON_SECRET` (ada di `.env.example`): **belum dipakai** — semua job terjadwal berjalan murni di `pg_cron` tanpa route `/api/cron/*`.

## App admin (`marketiv-admin`)

| Env | Rahasia | Status | Disimpan di | Dipakai untuk |
|---|---|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | – | Wajib | `admin/netlify.toml`; UI Production | Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | – | Wajib | `admin/netlify.toml`; UI Production | Sesi admin (browser) |
| `SUPABASE_SERVICE_ROLE_KEY` | **Ya** | Wajib (server) | **UI Netlify** site admin (terpisah dari site user — isi di kedua site) | Route `/api/admin/*` |
| `NEXT_PUBLIC_USER_APP_URL` | – | Wajib | `admin/netlify.toml`; UI Production | Tautan ke app user |
| `NEXT_PUBLIC_APP_ENV` | – | Opsional | `admin/netlify.toml`; UI Production | Label lingkungan di header |
| `NEXT_PUBLIC_VIEW_VALIDATION_DELAY_HOURS` | – | Opsional (default 72) | UI | Tampilan "bisa divalidasi pada…" di antrean submission. **Lihat isu #1** |
| `NODE_VERSION`, `NEXT_TELEMETRY_DISABLED`, `NETLIFY_FORCE_BUILD` | – | – | sama dengan app user | Build |
| `NEXT_PUBLIC_APPWRITE_ENDPOINT`, `_PROJECT_ID`, `_DATABASE_ID` | – | Usang | `admin/netlify.toml` | `admin/src/lib/admin/appwrite.ts` (tidak dipanggil lagi; hapus Fase 11) |

## Di luar env (konfigurasi yang juga perlu dicatat)

| Di mana | Apa | Catatan |
|---|---|---|
| Supabase → Authentication → URL Configuration | Site URL + Redirect URLs | Staging: `https://migrasi-supabase--marketiv-production.netlify.app` (+3 redirect). Produksi: domain final saat cutover |
| Supabase → Authentication → Emails / SMTP | SMTP (staging: Mailtrap sandbox), 4 template email (`supabase/templates/*`), OTP 6 digit / 900 dtk | Password SMTP rahasia — simpan di password manager |
| Supabase → Authentication → Providers → Google | Client ID/Secret Google OAuth | Belum dikonfigurasi (wajib untuk Supabase produksi) |
| Supabase DB: `private.finance_settings` | `fee_rate` (0.02), `fee_flip_threshold` (1000) | Ubah lewat SQL; dipakai escrow & job `fee-rate-flip` |
| Supabase DB: `cron.job` | `auto-approve-orders`, `expire-stale-claims`, `fee-rate-flip`, `reconcile-release-escrow` | Dibuat oleh migration; tidak butuh env |
| Midtrans dashboard → Settings → Configuration | Payment Notification URL | Staging: `https://migrasi-supabase--marketiv-production.netlify.app/api/webhooks/midtrans`. Produksi: domain final |
| Netlify → Site configuration → Access & security → Visitor access | Proteksi SSO tim untuk deploy non-produksi | Saat ini aktif → webhook Midtrans ke branch deploy tertolak 401 |

## Checklist cutover (Fase 10) — context **Production**

Isi di UI Netlify, context **Production** saja, untuk masing-masing site:

**`marketiv-production` (app user)**
- [ ] `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` — project Supabase **produksi**
- [ ] `SUPABASE_SERVICE_ROLE_KEY` (secret) — project produksi
- [ ] `MIDTRANS_SERVER_KEY` (secret), `NEXT_PUBLIC_MIDTRANS_CLIENT_KEY` — key **production**
- [ ] `MIDTRANS_IS_PRODUCTION=true`, `NEXT_PUBLIC_MIDTRANS_ENV=production`
- [ ] `NEXT_PUBLIC_APP_ENV=production`, `NEXT_PUBLIC_ADMIN_APP_URL`, `NEXT_PUBLIC_USE_MOCK_DATA=false`
- [ ] Kredensial AI (minimal satu penyedia)
- [ ] Salin nilai produksi lama dari variabel global project Appwrite produksi bila berbeda dari default: `FEE_RATE`, `CURRENT_TOS_VERSION` (→ `NEXT_PUBLIC_CURRENT_TOS_VERSION`), `VIEW_VALIDATION_DELAY_HOURS`, `MINIMUM_WITHDRAW`, `WITHDRAWAL_ADVANCED_GUARDS_ENABLED`, `KYC_THRESHOLD`, `WITHDRAW_PER_DAY_LIMIT`, `WITHDRAW_COOLING_DAYS`
- [ ] `NEXT_PUBLIC_ENABLE_GOOGLE_OAUTH=true` hanya setelah Google OAuth aktif di Supabase produksi
- [ ] Sentry DSN/env bila dipakai

**`marketiv-admin`**
- [ ] `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` (secret) — produksi
- [ ] `NEXT_PUBLIC_USER_APP_URL`, `NEXT_PUBLIC_APP_ENV=production`
- [ ] `NEXT_PUBLIC_VIEW_VALIDATION_DELAY_HOURS` = sama dengan `VIEW_VALIDATION_DELAY_HOURS` app user

Lalu: Midtrans production Notification URL → domain final; Supabase produksi Site/Redirect URL → domain final; redeploy kedua site.

## Isu yang diketahui
1. **Periode observasi views di admin tidak membaca env.** Route admin `review-submission` memanggil RPC dengan default 72 jam; `NEXT_PUBLIC_VIEW_VALIDATION_DELAY_HOURS` hanya mengubah tampilan. Selama nilainya tetap 72 tidak berdampak. Bila diubah, perbaiki route admin agar meneruskan `p_observation_hours`.
2. **Dua sumber fee rate:** `FEE_RATE` (env, fee top-up campaign) vs `private.finance_settings.fee_rate` (DB, escrow). Saat ini sama-sama 0.02; ubah keduanya bersamaan atau satukan ke `public.get_fee_rate()`.
3. Env Appwrite usang masih di `netlify.toml` — hapus di Fase 11 bersama `src/lib/appwrite/**`.
