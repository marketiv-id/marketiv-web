# 80_Deployment

Panduan deployment Marketiv. Struktur & env frontend: [`40_Folder_Structure.md`](40_Folder_Structure.md). Runbook operasional live: `00_BACKEND/appwrite/ops/README.md`.

## Target

- **Frontend user** (root repo) dan **Admin** (`admin/`) → **Appwrite Sites**, satu Site per app per environment (root directory `/` dan `admin`; domain `staging.marketiv.id`/`admin-staging.marketiv.id`, `marketiv.id`/`admin.marketiv.id`). Sumber: `docs/marketiv-admin-root-extraction-spec-v1/05_DEPLOYMENT/APPWRITE_SITE_MAPPING.md` (root repo). Tidak ada konfigurasi Vercel di repo.
- **Backend** (Auth, TablesDB, Storage, Realtime, Functions, Messaging) → **Appwrite Cloud** region Singapore (`https://sgp.cloud.appwrite.io/v1`), project `Marketiv`, database `db_marketiv`.
- **AI Layer** → Vertex AI / Gemini / OpenRouter dipanggil dari Function (`ai-brief`, `ai-fraud-precheck`) dan dari Route Handler `src/app/api/chat/route.ts`. Kredensial AI hanya di env server.

## Environment Variables (Frontend)

- Daftar lengkap: `.env.example` root repo (ringkasan di [`40_Folder_Structure.md`](40_Folder_Structure.md#environment-variables)); admin: `admin/.env.example`.
- Hanya variabel ber-prefiks `NEXT_PUBLIC_` yang aman diekspos ke client. JANGAN menaruh API key server / kredensial AI di `NEXT_PUBLIC_*` (lihat [`50_Security_Guidelines.md`](50_Security_Guidelines.md)).

## Deploy Frontend

- Build: `npm run build` (`next build`); CI (`.github/workflows/ci.yml`) menjalankan lint → typecheck → build pada push/PR ke `master`.
- Source map diunggah ke Sentry lewat `withSentryConfig` (`next.config.ts`).

## Konfigurasi Backend (sumber tunggal)

- **`00_BACKEND/appwrite.config.json` adalah konfigurasi kanonis** (67 functions, 32 tables, 8 buckets) yang dibaca Appwrite CLI dan skrip `appwrite/ops/*`.
- `00_BACKEND/appwrite.json` **basi** (53 functions, 30 tables; tidak memuat 14 Function terbaru serta tabel `otp_rate_limits` dan `ratecard_deliverable_validations`). Jangan dipakai untuk deploy.
- Config dibangkitkan oleh `appwrite/generate_appwrite_json.cjs` (menyalin scope dari `appwrite/function-scopes.json` dan gagal bila folder/generator/scopes tidak sinkron):

  ```bash
  cd 00_BACKEND
  node appwrite/generate_appwrite_json.cjs   # tulis ulang appwrite.config.json
  npm run fn:inventory                       # audit folder ↔ generator ↔ scopes ↔ config
  ```

## Deploy Appwrite Functions

Prinsip: `PUT` di Appwrite adalah **replace, bukan patch** — field yang tidak dikirim di-reset ke default. Semua skrip tulis di `appwrite/ops/` melakukan GET → merge → PUT payload lengkap dan punya mode `--dry`.

1. **Kode Function** (berlaku setelah build baru aktif):
   - `appwrite push functions` (CLI, membaca `appwrite.config.json`, membawa `scopes`), **atau**
   - `bash scripts/deploy-all-functions.sh` — `appwrite functions create-deployment --code functions/<id> --entrypoint src/main.js --commands "npm install" --activate=true` untuk tiap Function di config. ⚠️ Tidak cocok untuk `create-conversation` & `create-offer` yang di config ber-`path: functions` + `entrypoint: <id>/src/main.js` (butuh `functions/_shared/`).
   - Push bisa tersangkut di status `building`; selalu verifikasi dengan `node appwrite/ops/audit-live.mjs`. Bila Function menjalankan build lama (`STALE-DEP`), pindahkan pointer: `node appwrite/ops/activate-latest-deployment.mjs --dry` lalu tanpa `--dry`.
2. **Setelan runtime** (`events`, `schedule`, `execute`, `timeout`, `enabled`, `logging` — berlaku langsung tanpa deploy ulang):

   ```bash
   npm run fn:sync:dry   # rencana
   npm run fn:sync       # terapkan dari appwrite.config.json
   ```

   Field build (`scopes`, `entrypoint`, `commands`, `runtime`, `name`) hanya disentuh dengan flag `--backend-fields` dan baru berlaku setelah deploy ulang.
3. **Variabel Function**: `node appwrite/ops/sync-function-vars.mjs --dry` lalu tanpa `--dry` (menyalin `functions/<id>/.env` ke Appwrite). Menggantikan `scripts/sync-env-all-functions.sh` (butuh `jq` + CLI). `fix-function-vars.mjs` untuk perbaikan terarah.
4. **Verifikasi**: `npm run fn:drift` (bandingkan semua field config vs live), `node appwrite/ops/audit-live.mjs` (Function + bucket + tabel + kolom), `node appwrite/ops/check-deployments.mjs`.
5. **Webhook Midtrans**: `node appwrite/ops/midtrans-webhook-url.mjs` mencetak URL `midtrans-webhook` yang harus didaftarkan sebagai Payment Notification URL di dashboard Midtrans.

⛔ Jangan menjalankan `appwrite/sync-scopes.ts` (dipensiunkan; pernah mengosongkan `events` 8 Function).

## Tabel, Kolom, Bucket, Permission

- Kolom/index: `node appwrite/ops/ensure-columns.mjs --dry` atau `node scripts/push-columns.cjs` (membaca `appwrite.config.json`, skip yang sudah ada).
- Bucket: `node appwrite/ops/ensure-buckets.mjs --dry`.
- Permission tabel: `node appwrite/ops/harden-permissions.mjs --dry` (cabut `read/update("users")` level tabel sesuai [`50_Security_Guidelines.md`](50_Security_Guidelines.md)).
- Permission baris lama: `scripts/verify-delete-permissions.ts` / `scripts/backfill-delete-permissions.ts`.
- Google OAuth: `npm run oauth:google:audit`, `oauth:google:ensure-localhost`, `oauth:google:configure`.

## Environment Variables (Function)

Nilai nyata di `functions/<id>/.env` (di-gitignore); daftar nama di `functions/<id>/.env.example`.

- Disediakan runtime: `APPWRITE_FUNCTION_API_ENDPOINT`, `APPWRITE_FUNCTION_PROJECT_ID`; API key dinamis lewat header `x-appwrite-key`. Fallback lokal/test: `APPWRITE_ENDPOINT`, `APPWRITE_PROJECT_ID`, `APPWRITE_API_KEY`.
- Database & tabel: `APPWRITE_DATABASE_ID` (fallback `NEXT_PUBLIC_DB_ID`), `<TABEL>_COLLECTION_ID` (mis. `ORDERS_COLLECTION_ID`, `CAMPAIGN_BRIEFS_COLLECTION_ID=6ab530d00018edb50097`).
- Pembayaran: `MIDTRANS_SERVER_KEY` (`create-payment`, `midtrans-webhook` — verifikasi signature), `MIDTRANS_ENV` (`sandbox`/`production`).
- Bisnis: `FEE_RATE` (default 0.02), `MINIMUM_WITHDRAW`, `KYC_THRESHOLD`, `WITHDRAW_PER_DAY_LIMIT`, `WITHDRAW_COOLING_DAYS`, `WITHDRAWAL_ADVANCED_GUARDS_ENABLED`, `CURRENT_TOS_VERSION`, `VIEW_VALIDATION_DELAY_HOURS`, `DEFAULT_STORAGE_BUCKET_ID` (harus `user-files`).
- AI: `VERTEX_AI_PROJECT_ID|CLIENT_EMAIL|PRIVATE_KEY|LOCATION|MODEL`, `OPENROUTER_API_KEY|MODEL` (`ai-brief`), `GEMINI_API_KEY` (`ai-fraud-precheck`).
- Legacy: `IRIS_CALLBACK_SECRET` (`withdrawal-callback`, disabled).

## Event & Jadwal

Wiring event/cron per Function ada di katalog [`../02_Modules/00_Index.md`](../02_Modules/00_Index.md#katalog-appwrite-function). Format event TablesDB: `databases.6a4c8598001da3b0d7f0.tables.<table>.rows.*.<create|update>`.
