# Tech Stack

Versi diambil dari `package.json` (root repo, `admin/`, `00_BACKEND/`) dan `00_BACKEND/appwrite.config.json`.

## Frontend

- **Next.js 16.1.6 (App Router) + React 19.2.3 + TypeScript 5** — aplikasi user di root repo (`src/`).
- **Admin app** terpisah — Next.js 16.1.6 di folder `admin/` (port dev 3001).
- **UI**: Tailwind CSS 4 (token di `src/app/globals.css`), komponen gaya shadcn/ui di atas Radix UI (`src/components/ui/`), ikon `lucide-react` & `@phosphor-icons/react`, animasi `framer-motion`/`motion`, chart `recharts`, toast `sonner`.
- **Form & validasi**: `react-hook-form` + **Zod 4** (`src/lib/validations/*.schema.ts`).
- **Appwrite Web SDK**: `appwrite` ^25.2.0 (frontend & admin).
- **Error monitoring**: Sentry (`@sentry/nextjs` ^10, `sentry.client|server|edge.config.ts`, `src/instrumentation.ts`).

## Backend (BaaS)

- **Appwrite Cloud** (region Singapore, `https://sgp.cloud.appwrite.io/v1`) menyediakan:
  - **Auth** — email/password, OTP email (reset password), verifikasi email, Google OAuth (opsional)
  - **Database (TablesDB)** — satu database `db_marketiv`, 32 tabel
  - **Storage** — 8 bucket (lihat [40_Folder_Structure](../01_Global/40_Folder_Structure.md#storage-buckets))
  - **Realtime** — langganan dari frontend (`src/lib/appwrite/realtime.ts`)
  - **Functions** — 67 Cloud Function, runtime **`node-22`**, ESM (`"type": "module"`), SDK **`node-appwrite` ^14.1.0** (kecuali `track-order-review` & `auto-approve-orders` yang masih ^13.0.0)
  - **Messaging** — push notification chat (`send-chat-notification`)
- Katalog Function: [02_Modules/00_Index.md](../02_Modules/00_Index.md).

## Payment Gateway

- **Midtrans Snap** — pembayaran budget campaign (purpose `campaign`) dan order rate card (purpose `order`) via Function `create-payment`, dibatalkan via `cancel-payment`, dikonfirmasi webhook `midtrans-webhook`. Dipanggil lewat REST (`fetch`), tanpa SDK Midtrans. Server key hanya di environment function (`MIDTRANS_SERVER_KEY`, `MIDTRANS_ENV`).
- **Midtrans Iris** (payout otomatis) — dipensiunkan; withdrawal diproses manual oleh Admin.

## AI Layer

- **AI Brief Generator** (`ai-brief`) — Google **Vertex AI** (`@google-cloud/vertexai`, default model `gemini-2.5-flash`) sebagai provider utama, fallback **OpenRouter** (default model `qwen/qwen3.5-35b-a3b`).
- **AI Fraud Detection** (`ai-fraud-precheck`) — heuristik + analisis caption via **Gemini API** (`@google/generative-ai`, model `gemini-2.5-flash`); dilewati bila `GEMINI_API_KEY` kosong.
- **Landing Assistant / chatbot** — Next.js Route Handler `src/app/api/chat/route.ts` (Vertex AI, fallback OpenRouter), **bukan** Appwrite Function.
- Detail per fitur: modul [AI](../02_Modules/AI/00_Index.md).

## State Management

- Tidak ada library global store. State memakai React state/hooks + Context (mis. `src/components/providers/AuthProvider.tsx`, `TosConsentProvider.tsx`). Zustand **tidak** terpasang di `package.json` (berbeda dengan [ADR-006](../04_Decisions/ADR-006.md)).

## Validation

- **Zod 4** — skema di `src/lib/validations/` (`auth`, `campaign`, `rate-card`, `offer`, `deliverable`, `profile`, `withdrawal`). Function memvalidasi ulang input di server.

## Testing

- **Vitest 4** — frontend (`vitest.config.mts` root) dan backend (`00_BACKEND/vitest.config.ts`).
- **Playwright** — spec e2e di `00_BACKEND/tests/e2e/` (`@playwright/test` hanya di devDependencies backend).
- Beberapa Function punya test lokal `node:test` di `functions/<id>/src/*.test.js`.
- Detail: [70_Testing_Strategy](../01_Global/70_Testing_Strategy.md).

## CI

- GitHub Actions (`.github/workflows/`): `ci.yml` (lint + typecheck + build, Node 20), `pre-merge-quality-gate.yml` (animation audit + validasi data contract), `animation-audit.yml`. Test Vitest belum dijalankan di CI.

## Deployment

- Frontend user app (root repo) & admin app (`admin/`) → **Appwrite Sites**, dua Site per environment (staging/production) — sumber: `docs/marketiv-admin-root-extraction-spec-v1/05_DEPLOYMENT/APPWRITE_SITE_MAPPING.md` (root repo) dan komentar `.env.example`. Tidak ada konfigurasi Vercel di repo.
- Backend → **Appwrite Cloud** (project `Marketiv`).
- Detail: [80_Deployment](../01_Global/80_Deployment.md).

## Referensi

- Alasan memilih Appwrite: [ADR-001](../04_Decisions/ADR-001.md)
- Aturan service layer: [ADR-002](../04_Decisions/ADR-002.md) dan [50_Project_Rules.md](50_Project_Rules.md)
