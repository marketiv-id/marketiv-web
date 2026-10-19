# Fase 5 — Jalur baca

**Bobot:** M

## Tujuan

Semua tampilan membaca data dari Supabase. Mutasi tetap menyusul di fase berikutnya, tapi branch ini sudah sepenuhnya memakai Supabase.

## Task

### Layer API
- [ ] Buat `src/lib/api/call-api.ts` dengan kontrak yang sama seperti `executeFunction<T>()` di `src/lib/appwrite/functions.ts`:
  - Input `(name, body)`.
  - Output `T`.
  - Error memakai `FunctionExecutionError`, termasuk `statusCode`.
  - Tujuannya: service cukup mengganti import, logika pemanggil tidak berubah.
- [ ] Buat `src/server/http.ts` berisi helper route:
  - `json(data, status)`
  - pemetaan error ke status 400/401/403/404/409
  - validasi body dengan zod (skema `src/lib/validations/*` dipakai ulang)

### Baca langsung (browser → supabase-js + RLS)
- [ ] Buat `src/services/**/mappers.ts` untuk mengubah row snake_case ke DTO yang sekarang dipakai (`$id` → `id`, dll). Kontrak DTO mengikuti skill `marketiv-data-contracts`.
- [ ] Port pembacaan di:
  - `umkm-appwrite.service.ts`
  - `creator-appwrite.service.ts`
  - `conversation-appwrite.service.ts`
  - `deliverable-appwrite.service.ts`
  - `notification-appwrite.service.ts`
  - `session.service.ts`
- [ ] Padanan Query:

  | Appwrite | supabase-js |
  |---|---|
  | `Query.equal` | `.eq` / `.in` |
  | `Query.orderDesc` | `.order(col, {ascending:false})` |
  | `Query.limit` / `offset` | `.range` |
  | `Query.cursorAfter` | keyset `.lt('created_at', …)` |
  | `Query.or` | `.or()` |
  | `Query.isNull` | `.is(col, null)` |

- [ ] `requireUserId()` di `src/services/shared/service-result.ts` saat ini melakukan 3 kali read per call. Ganti dengan cache sesi dari `AuthProvider`.

### 13 function baca-saja → `GET /api/...`
Logika dari `00_BACKEND/functions/<nama>/src/main.js` dipindah ke `src/server/<domain>/<nama>.ts`, sedangkan `src/app/api/<domain>/<nama>/route.ts` dibuat tipis.

- [ ] `get-umkm-dashboard-summary`, `get-umkm-finance-summary`, `get-umkm-profile`, `get-umkm-negotiations`, `get-umkm-ratecard-reviews`
- [ ] `get-creator-dashboard-summary`, `get-creator-profile`, `get-creator-negotiations`, `get-creator-directory`
- [ ] Admin app (`admin/src/app/api/admin/*`): `get-admin-dashboard-summary`, `get-admin-submission-queue`, `get-admin-withdrawal-queue`, `get-admin-ratecard-deliverable-queue`
- [ ] Agregasi berat (dashboard, negotiations) diubah jadi SQL view atau RPC supaya tidak N+1.

## Verifikasi
- **Snapshot test:** output route baru dibandingkan dengan output function Appwrite pada dataset staging yang sama, dan harus identik setelah normalisasi ID.
- Semua halaman dashboard UMKM, kreator, dan admin tampil tanpa error.
- `npm test` lulus. Mock `@/lib/appwrite/*` di test diganti mock `call-api` / supabase.
