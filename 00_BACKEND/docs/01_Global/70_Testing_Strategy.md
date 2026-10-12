# 70_Testing_Strategy

Strategi testing Marketiv. Struktur folder: [`40_Folder_Structure.md`](40_Folder_Structure.md).

## Tooling

- **Vitest 4** — unit & integration (backend dan frontend).
- **Playwright** (`@playwright/test`, devDependency `00_BACKEND/`) — e2e. Belum ada `playwright.config.*` di repo.
- **`node:test`** — test lokal beberapa Function (`functions/<id>/src/*.test.js`).

## Backend (`00_BACKEND/`)

Perintah (jalankan di `00_BACKEND/`):

```bash
npm test                  # vitest run → tests/unit + tests/integration
npm run test:unit         # vitest run tests/unit
npm run test:integration  # vitest run tests/integration
npm run test:e2e          # playwright test → tests/e2e
```

Konfigurasi `vitest.config.ts`: environment `node`, `globals: true`, include `tests/unit/**/*.test.ts` + `tests/integration/**/*.test.ts`, exclude `functions/`, `tests/e2e`, `src/`; setup `tests/setup.ts`.

```text
tests/
├── setup.ts       # env dummy + vi.mock('appwrite') → src/test-mocks/appwrite.ts (store in-memory)
├── unit/          # service (wallet, auth, campaign, submission, oauth-callback), validasi,
│                  #   guard (require-active-role, sec-03-role-guard), Function terisolasi
│                  #   (unclaim-campaign, update-profile completion, admin read functions), audit retirement
├── integration/   # functions.test.ts (import dinamis functions/<id>/src/main.js + vi.mock('node-appwrite')),
│                  #   services.test.ts, accept-tos, update-profile, function-inventory (folder ↔ generator ↔ scopes ↔ config)
└── e2e/           # auth-otp.spec.ts (live, di-skip kecuali AUTH_E2E_RUN_LIVE=true + env OTP),
                   #   critical-flows.spec.ts (scaffold placeholder `expect(true)`)
```

- Function diuji dengan memanggil `main({ req, res, log, error })`, `req.bodyJson` = dokumen event/body request.
- `globalThis.fetch` tidak di-mock; Midtrans hanya divalidasi lewat signature statis.
- Test lokal Function (tidak ikut `npm test` backend karena `functions/` di-exclude):
  - `node --test src/main.test.js` — `get-umkm-ratecard-reviews`, `request-ratecard-revision`, `submit-ratecard-deliverable` (punya script `test`).
  - Tanpa script `test`: `get-admin-withdrawal-queue`, `review-withdrawal` (`main.test.js`, `withdrawal-transition.test.js`), `review-submission` (`observation-window.test.js`).
  - `fee-rate-flip` punya script `vitest run`.

## Frontend (root repo)

```bash
npm test          # vitest (watch); npm run test:unit sama
npm run lint
npm run typecheck
```

`vitest.config.mts` (root): environment `node`, `jsdom` untuk `src/components/features/**/__tests__`, `src/lib/demo/__tests__`, `src/lib/__tests__`. Include `__tests__` di `src/services/**`, `src/lib/{appwrite,validations,negotiation,onboarding,demo}`, `src/content`, `src/components/features/**`, plus satu file backend `00_BACKEND/tests/unit/oauth-callback.service.test.ts`.

## CI

- `.github/workflows/ci.yml` (push/PR ke `master`): lint, typecheck, build frontend.
- `.github/workflows/pre-merge-quality-gate.yml`: animation audit + `validate-data-contracts` (annotate-only).
- **Belum ada** langkah CI yang menjalankan Vitest atau Playwright, baik frontend maupun backend.

## Fokus Per Layer

- **Services** (unit/integration): mapping DTO, pemetaan error ke `ServiceResult.code` (lihat [`60_Error_Handling.md`](60_Error_Handling.md)), kasus gagal Appwrite.
- **Validations** (unit): schema Zod menerima input valid & menolak invalid.
- **Functions** (integration): guard role/status, idempotensi (ID deterministik, 409), transisi status, permission baris yang dipasang.
- **Inventaris** (integration): `function-inventory.test.ts` memastikan folder, generator, `function-scopes.json`, dan `appwrite.config.json` sinkron.
- **Components/UI**: render & interaksi penting (jsdom).

## Critical Flows (target e2e — belum diimplementasikan, saat ini placeholder)

- **Escrow**: offer accepted → create order → bayar → escrow held → deliverable approved UMKM + validasi Admin → release escrow.
- **Fraud**: submission created → `ai-fraud-precheck` → `fraudStatus` (`safe`/`review`/`rejected`).
- **Withdraw**: request withdraw (validasi saldo, min Rp50.000, gate email/KYC) → `requested` → Admin `processing` → `succeeded`/`failed`. Spec lama masih bernama "auto processed" — usang.

## Prinsip

- Logika bisnis sensitif (escrow, wallet, fraud, withdraw) hidup di Appwrite Function — uji lewat integration Function, bukan hanya unit frontend.
- Validasi input diuji di level unit (Zod) agar regresi cepat ketahuan.
