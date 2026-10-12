# 40_Folder_Structure

**Pemilik tunggal struktur folder Marketiv** (frontend, admin, backend). Modul dan dokumen lain mengacu ke sini, tidak menduplikasi. Konvensi penamaan di [`30_Naming_Convention.md`](30_Naming_Convention.md). Katalog Function ada di [`../02_Modules/00_Index.md`](../02_Modules/00_Index.md#katalog-appwrite-function).

## Stack

- Frontend user: Next.js 16 (App Router) di root repo.
- Admin: Next.js 16 terpisah di `admin/`.
- Backend: Appwrite Cloud (Auth, TablesDB, Storage, Realtime, Functions, Messaging) — kode & config di `00_BACKEND/`.
- Versi lengkap: [`../00_Project/40_Tech_Stack.md`](../00_Project/40_Tech_Stack.md).

## Struktur Repo

```text
marketiv-web/
├── src/                    # Frontend user app (Next.js)
├── admin/                  # Admin app (Next.js, port dev 3001) — src/app: dashboard, submissions, rate-card-validations, withdrawals, login
├── public/                 # Aset statis frontend
├── docs/                   # Spesifikasi/audit frontend (bukan knowledge base backend)
├── scripts/                # animation-audit.js, validate-data-contracts.js (dipakai CI)
├── .github/workflows/      # ci.yml, pre-merge-quality-gate.yml, animation-audit.yml
├── sentry.{client,server,edge}.config.ts, next.config.ts, vitest.config.mts, eslint.config.mjs
└── 00_BACKEND/             # Backend Appwrite + knowledge base ini
```

## Struktur Frontend `src/`

```text
src/
├── app/                    # App Router — routing = struktur folder
│   ├── layout.tsx, page.tsx, global-error.tsx, globals.css (design token)
│   ├── (auth)/             # login, register, forgot-password, reset-password, auth/callback (+ error/loading)
│   ├── dashboard/umkm/     # dashboard UMKM (+ layout, error, loading)
│   ├── dashboard/kreator/  # dashboard Creator (+ layout, error, loading)
│   ├── api/chat/route.ts   # chatbot (Vertex AI / OpenRouter)
│   └── jelajah/, panduan/, onboarding/, tentang-kami/, syarat-ketentuan/, kebijakan-privasi/, umkm/
├── components/
│   ├── ui/                 # komponen dasar shadcn/Radix
│   ├── features/<feature>/ # auth, chatbot, creator-dashboard, dashboard, umkm-dashboard, landing, onboarding, legal, demo, shared
│   ├── layouts/            # Navbar, Footer
│   ├── providers/          # AuthProvider, TosConsentProvider
│   └── auth/               # RoleGuard, RedirectIfAuthenticated, komponen form auth
├── services/               # Service layer (lihat 20_Coding_Standards.md)
│   ├── auth/               # auth, session, oauth-callback, tos
│   ├── umkm/, creator/     # facade + *-appwrite.service.ts
│   ├── shared/             # conversation, deliverable, notification, user-file, service-result
│   └── chatbot/
├── lib/
│   ├── appwrite/           # client, config, account, databases, storage, functions (FUNCTION_IDS, executeFunction), realtime
│   ├── validations/        # Zod *.schema.ts
│   ├── midtrans/           # loader Snap
│   └── negotiation/, onboarding/, ratecard-review/, demo/, constants/, utils & formatter
├── config/                 # auth.config.ts, data-source.config.ts, midtrans.config.ts
├── types/                  # domain.ts (ServiceResult, konstanta bisnis), *.types.ts
├── mocks/                  # data mock (aktif bila NEXT_PUBLIC_USE_MOCK_DATA=true)
├── constants/, content/, data/, assets/
└── instrumentation.ts      # Sentry
```

- Tidak ada `middleware.ts`/`proxy.ts`; guard role dijalankan di klien oleh `RoleGuard`.

## Struktur Backend `00_BACKEND/`

```text
00_BACKEND/
├── functions/                  # 67 Appwrite Function, satu folder per $id
│   ├── <function-id>/
│   │   ├── package.json        # "type": "module", dependency sendiri
│   │   ├── .env.example        # daftar env (nilai nyata di .env yang di-gitignore)
│   │   └── src/main.js         # entrypoint (+ atomic.js / helper / *.test.js bila ada)
│   └── _shared/                # helper lintas-Function (require-active-role.js) + package.json "type": "module"
├── appwrite.config.json        # KANONIS: 67 functions, 32 tables, 8 buckets (output generator)
├── appwrite.json               # BASI: 53 functions, 30 tables — jangan dipakai
├── appwrite/
│   ├── generate_appwrite_json.cjs  # generator → appwrite.config.json (validasi inventaris folder/scopes)
│   ├── function-scopes.json        # scope API key dinamis per Function (sumber tunggal)
│   ├── sync-scopes.ts              # DIPENSIUNKAN — stub yang menolak jalan
│   └── ops/                        # skrip operasional live (lihat ops/README.md)
├── scripts/                    # deploy-all-functions.sh, sync/set-env, push-columns.cjs, backfill/verify-delete-permissions.ts, appwrite-operations.md
├── src/                        # service layer TypeScript referensi + mock untuk test backend
│   ├── services/*.service.ts   # (file *.service.js di sebelahnya hanya stub kosong)
│   ├── lib/appwrite/           # client, collections (COLLECTIONS, FUNCTIONS), database, functions
│   ├── constants/index.ts
│   └── test-mocks/appwrite.ts  # mock in-memory package `appwrite`
├── tests/                      # unit/, integration/, e2e/, setup.ts (lihat 70_Testing_Strategy.md)
├── docs/                       # knowledge base ini
├── audit/, integration-context/, fix/   # catatan audit & handoff kronologis (bukan status terkini)
├── terms & conditions/         # draf & review T&C
└── package.json, vitest.config.ts, tsconfig.json
```

### Aturan Appwrite Function

- Kode Function wajib di `functions/<function-id>/`; entrypoint default `src/main.js`, deployment dari folder itu sendiri (`path: functions/<id>`).
- **Pengecualian**: `create-conversation` dan `create-offer` mengimpor `../../_shared/require-active-role.js`, sehingga di config ber-`path: "functions"`, `entrypoint: "<id>/src/main.js"`, `commands: "cd <id> && npm install"` (seluruh folder `functions/` ikut di-deploy).
- Folder `_shared/` punya `package.json` sendiri dengan `"type": "module"` agar file ESM tetap dalam package scope eksplisit saat root `functions/` dipasang di runtime Appwrite.
- Jangan menulis implementasi Function di `src/` atau root proyek.
- Saat menambah/menghapus/rename Function, sinkronkan folder, generator, `function-scopes.json`, `appwrite.config.json` — cek dengan `npm run fn:inventory`. Lihat [`../00_Project/50_Project_Rules.md`](../00_Project/50_Project_Rules.md#sinkronisasi-appwrite-function--config).

## Storage Buckets

8 bucket di `appwrite.config.json`:

| Bucket | `fileSecurity` | Permission bucket | Batas | Dipakai oleh |
| --- | --- | --- | --- | --- |
| `avatars` | false | read any, CRUD users | 5 MB, jpg/jpeg/png/webp | upload langsung klien (`uploadPublicFile`) |
| `creator-banners` | false | read any, CRUD users | 5 MB, jpg/jpeg/png/webp | upload langsung klien |
| `logos` | false | read any, CRUD users | 5 MB, + svg | upload langsung klien |
| `portfolios` | false | read any, CRUD users | 50 MB, + pdf/mp4 | upload langsung klien |
| `campaign-assets` | false | read any, CRUD users | 100 MB, semua ekstensi | upload langsung klien (materi campaign publik) |
| `user-files` | **true** | create users | 20 MB, dokumen/gambar/video | `validate-and-upload` / `delete-file` (kuota) |
| `deliverables` | true | read/create/update users | 500 MB | **tidak dipakai** |
| `fraud-evidence` | true | read users | 5 MB | belum ada penulis di kode |

**`user-files` adalah bucket unggahan pengguna yang aktif** untuk berkas privat. Seluruh
unggahan lewat `validate-and-upload` mendarat di sana (env `DEFAULT_STORAGE_BUCKET_ID`), karena
di situlah kuota per-pengguna ditegakkan lewat tabel `user_storage_usage` dan `user_files`.

Hak baca diberikan per berkas oleh Function kepada pengunggah, plus pihak lawan order bila
parameter `shareWithOrderId` dikirim.

> **Kenapa ini penting.** Selama status "dormant", bucket-nya tidak pernah dibuat
> di live dan `DEFAULT_STORAGE_BUCKET_ID` diarahkan ke `campaign-assets` — bucket
> `read("any")` dengan `fileSecurity: false`. Akibatnya setiap berkas yang diunggah
> bisa diunduh siapa pun tanpa login, dan karena `fileSecurity: false` seluruh
> `Permission.read` per-berkas yang dipasang Function **diabaikan server**. Diperbaiki
> 2026-07-29.

`campaign-assets` tetap `read("any")` dan itu memang benar — isinya materi campaign
publik. Jangan mengarahkan unggahan privat ke sana.

Bucket `deliverables` ada di config tapi **tidak dipakai**: berkas deliverable ikut
ke `user-files` supaya kuota tetap ditegakkan.

## Tests

- Backend: `00_BACKEND/tests/{unit,integration,e2e}` + test lokal `functions/<id>/src/*.test.js`.
- Frontend: `__tests__/` di samping kode (`src/services/**`, `src/lib/**`, `src/components/features/**`).
- Detail: [`70_Testing_Strategy.md`](70_Testing_Strategy.md).

## Environment Variables

Frontend (`.env.example` root repo; hanya `NEXT_PUBLIC_*` yang sampai ke browser):

```env
NEXT_PUBLIC_USE_MOCK_DATA=            # "true" → mock; selain itu → Appwrite
NEXT_PUBLIC_MOCK_ROLE=
NEXT_PUBLIC_ENABLE_GOOGLE_OAUTH=
NEXT_PUBLIC_ADMIN_APP_URL=
NEXT_PUBLIC_APPWRITE_ENDPOINT=
NEXT_PUBLIC_APPWRITE_PROJECT_ID=
NEXT_PUBLIC_APPWRITE_DATABASE_ID=
NEXT_PUBLIC_APPWRITE_STORAGE_BUCKET_ID=   # default user-files
NEXT_PUBLIC_APPWRITE_BUCKET_AVATARS=      # + _CREATOR_BANNERS, _LOGOS, _PORTFOLIOS, _CAMPAIGN_ASSETS, _DELIVERABLES, _FRAUD_EVIDENCE
NEXT_PUBLIC_MIDTRANS_CLIENT_KEY=
NEXT_PUBLIC_MIDTRANS_ENV=
NEXT_PUBLIC_SENTRY_DSN=
SENTRY_ENVIRONMENT=
# server-only (Route Handler /api/chat):
OPENROUTER_API_KEY=  OPENROUTER_MODEL=
VERTEX_AI_PROJECT_ID=  VERTEX_AI_CLIENT_EMAIL=  VERTEX_AI_PRIVATE_KEY=  VERTEX_AI_LOCATION=  VERTEX_AI_MODEL=
```

- ID tabel di frontend di-hardcode/default di service (`src/lib/appwrite/*`, `*-appwrite.service.ts`), bukan dari env per tabel.
- Env Function: lihat [`80_Deployment.md`](80_Deployment.md#environment-variables-function).
