# 20_Coding_Standards

Standar coding wajib Marketiv: frontend Next.js (root repo `src/`, admin `admin/src/`) dan Appwrite Function (`00_BACKEND/functions/`). Struktur folder lengkap ada di [`40_Folder_Structure.md`](40_Folder_Structure.md).

## Frontend — Arsitektur

- **TypeScript** untuk seluruh kode aplikasi (`.ts`/`.tsx`).
- Routing di `src/app/` (App Router). `page.tsx` tipis; UI fitur ada di `src/components/features/<feature>/`.
- Komponen dasar (shadcn/Radix) di `src/components/ui/`; layout di `src/components/layouts/`; provider (Auth, ToS) di `src/components/providers/`; guard role di `src/components/auth/RoleGuard.tsx`.
- Tidak ada folder `src/modules/`, `src/stores/`, atau `src/hooks/` — pola feature-module lama tidak dipakai.

## Service Layer (WAJIB)

- Semua akses data aplikasi **wajib** lewat service layer:

  ```text
  Route/Component → Service (src/services/**) → src/lib/appwrite/* (SDK / executeFunction)
  ```

- DILARANG memanggil Appwrite SDK (`databases`, `storage`, `account`, `functions`) langsung dari `page.tsx`/komponen.
  - Pengecualian yang ada saat ini: langganan Realtime (`src/lib/appwrite/realtime.ts`) di beberapa komponen negosiasi/notifikasi, dan `ChatbotPanel.tsx` yang mengimpor `account`. Jangan menambah pengecualian baru.
- Pola service per domain (`src/services/{auth,creator,umkm,shared,chatbot}/`):
  - **Facade** `<domain>.service.ts` — dipanggil UI; memilih sumber data via `DATA_SOURCE_CONFIG.useMockData` (`src/config/data-source.config.ts`, env `NEXT_PUBLIC_USE_MOCK_DATA === "true"`).
  - **Implementasi Appwrite** `<domain>-appwrite.service.ts` — pemanggilan SDK/Function + mapping DTO.
  - **Mock** di `src/mocks/**`.
- Service **mengembalikan `ServiceResult<T>`** (`src/types/domain.ts`), tidak melempar ke UI. Helper bersama di `src/services/shared/service-result.ts`. Lihat [`60_Error_Handling.md`](60_Error_Handling.md).
- Mutasi lintas user, uang, atau status sensitif **wajib** lewat Appwrite Function memakai `executeFunction(FUNCTION_IDS.x, body)` (`src/lib/appwrite/functions.ts`). Klien tidak boleh memasang permission untuk user lain.
- Jangan menaruh implementasi Appwrite Function di `src/`; kode Function berada di `00_BACKEND/functions/<function-id>/`.

## State Management

- Tidak ada global store library. Gunakan React state/hooks dan Context (`AuthProvider`, `TosConsentProvider`, `UmkmIdentityContext`).
- Zustand tidak terpasang (bertentangan dengan [ADR-006](../04_Decisions/ADR-006.md) — perlu revisi ADR).

## Validasi (Zod)

- Schema **Zod 4** di `src/lib/validations/<domain>.schema.ts` (`auth`, `campaign`, `rate-card`, `offer`, `deliverable`, `profile`, `withdrawal`).
- Form memvalidasi dengan schema dan meratakan error per field via `toFieldErrors` (`src/lib/validations/to-field-errors.ts`); service tulis juga boleh `safeParse` sebelum memanggil SDK/Function.
- Function **selalu** memvalidasi ulang input di server — validasi klien hanya UX.

## Appwrite Function — Standar Kode

- Satu folder per Function: `functions/<function-id>/package.json` (`"type": "module"`) + `src/main.js` (entrypoint) + `.env.example`.
- Signature: `export default async ({ req, res, log, error }) => { ... }`.
- Helper lokal yang lazim (diduplikasi per Function, belum dipusatkan): `getEnv`, `parseBody` (`req.bodyJson` → `req.bodyText`), `getUserId` (header `x-appwrite-user-id`), `json(res, body, status)`.
- Klien `node-appwrite` memakai API key dinamis dari header `x-appwrite-key` (fallback `APPWRITE_API_KEY`).
- ID tabel dibaca dari env dengan fallback ke ID default (mis. `ORDERS_COLLECTION_ID || NEXT_PUBLIC_ORDER_COLLECTION || "orders"`).
- Function yang dipanggil user: tolak method selain POST (405), tolak tanpa `x-appwrite-user-id` (401), cek role + `users.status === "active"`. Helper bersama: `functions/_shared/require-active-role.js` (saat ini dipakai `create-conversation` & `create-offer`; Function lain masih memeriksa inline).
- Function event-driven: **jangan percaya payload event** — muat ulang state dari database; balas `{ status: "ignored", reason }` bila tidak relevan.
- **Idempotensi**: ID dokumen deterministik dari hash SHA-256 (mis. `deterministicNotificationId`, ID ledger `transactions`), tangkap 409 sebagai "sudah ada".
- **Saldo/counter**: pakai increment/decrement atomik TablesDB (`src/atomic.js` → `PATCH .../rows/{id}/{column}/increment|decrement`), bukan read-modify-write.

## Konvensi Penamaan (ringkas)

- Service: kebab-case + `.service.ts` → `umkm-appwrite.service.ts`, `session.service.ts`.
- Schema: kebab-case + `.schema.ts` → `rate-card.schema.ts`.
- Komponen: PascalCase `.tsx` → `CampaignCard.tsx`.
- Detail lengkap di [`30_Naming_Convention.md`](30_Naming_Convention.md).

## Lint & Typecheck

- ESLint 9 (`eslint.config.mjs`, preset `eslint-config-next` core-web-vitals + typescript): `npm run lint`.
- `npm run typecheck` (`tsc --noEmit`). Keduanya dijalankan CI (`.github/workflows/ci.yml`).
