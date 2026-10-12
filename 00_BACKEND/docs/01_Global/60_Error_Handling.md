# 60_Error_Handling

Konvensi penanganan error Marketiv: respons Appwrite Function → `executeFunction` → service layer → UI. Service layer wajib: [`20_Coding_Standards.md`](20_Coding_Standards.md).

## Prinsip

- Validasi Zod dijalankan **sebelum** memanggil service/SDK (schema di `src/lib/validations/`); Function tetap memvalidasi ulang.
- Service layer **tidak melempar ke UI** — selalu mengembalikan `ServiceResult<T>` dengan `code` bertipe.
- UI bercabang di `code`, **tidak pernah mem-parse teks `error`**, dan menampilkan pesan ramah pengguna (Bahasa Indonesia), bukan stack trace.

## Respons Appwrite Function

Helper lokal di tiap Function: `json(res, body, status)` → `res.json(body, status, { "content-type": "application/json" })`.

| Situasi | HTTP | Body |
| --- | --- | --- |
| Input tidak valid | 400 (sebagian 422) | `{ "error": "<pesan Indonesia/Inggris>" }` |
| Tanpa sesi (`x-appwrite-user-id` kosong) | 401 | `{ "error": ... }` |
| Role salah / akun non-`active` | 403 | `{ "error": ... }` |
| Data tidak ditemukan | 404 | `{ "error": ... }` |
| Method bukan POST | 405 | `{ "error": "Method not allowed" }` |
| Konflik state / duplikat / kuota | 409 | `{ "error": ... }` (+ opsional `"code"` domain, mis. `payment_already_paid`, `payment_preparing`, `gateway_cancellation_required`) |
| Rate limit OTP | 429 | `{ "error": ... }` |
| Error tak terduga | 500 | `{ "error": ... }` |
| Sukses aksi user | 200 | `{ "success": true, ...data }` atau DTO langsung (Function `get-*`) |
| Event/cron diabaikan | 200 | `{ "status": "ignored" | "skipped", "reason": "..." }` |
| Idempoten (sudah diproses) | 200 | `{ "status": "already_released" | "already_exists" | ... }` |

- Bentuk ini konvensi, bukan helper bersama; beberapa Function lama membalas `{ "success": false, "error": ... }`.
- Function event-driven sebaiknya membalas 200 untuk kasus "tidak relevan" agar tidak dihitung sebagai kegagalan eksekusi.
- Error dari `_shared/require-active-role.js` dilempar sebagai `Error` dengan `statusCode` (404/403) dan diterjemahkan pemanggil ke respons di atas.

## Frontend — `executeFunction`

`src/lib/appwrite/functions.ts`:

- Eksekusi sinkron (`async: false`, POST, body JSON). Status HTTP dibaca dari `execution.responseStatusCode`, bukan exception SDK.
- Body dibaca **sebelum** memeriksa `execution.status === "failed"`, agar `{ error }` dari Function tetap sampai ke UI.
- Non-2xx → `FunctionExecutionError(message, statusCode, code, responseCode)`; `message` = `body.error`, `responseCode` = `body.code` (kode domain).
- Pemetaan status → `ServiceErrorCode`: 400/409/422 → `validation`, 401 → `auth`, 403 → `forbidden`, 404 → `not_found`, ≥500 → `server`, lainnya → `unknown`.

## Bentuk Error Standar (Service)

`ServiceResult<T>` di `src/types/domain.ts`:

```ts
interface ServiceResult<T> {
  success: boolean;
  data: T | null;
  error?: string;            // pesan ramah pengguna
  code?: "validation" | "auth" | "not_found" | "forbidden" | "server" | "unknown";
  reason?: string;           // kode domain dari Function bila UI perlu membedakan aksi
}
```

Helper (`src/services/shared/service-result.ts`):

- `ok(data)` → `{ success: true, data }`.
- `mapErrorCode` (baca) — tidak pernah menghasilkan `validation`; pesan default "Gagal memuat data. Coba lagi."
- `mapWriteErrorCode` (tulis) — SDK 400/409/422 → `validation`; pesan default "Gagal menyimpan data. Coba lagi."
- Error mentah Appwrite (`code`/`type`/`message`) dicetak ke console **hanya di luar production**, tanpa payload pengguna.

## Penyajian di UI

- `validation` → tampilkan di field form terkait (`toFieldErrors`) atau pesan inline.
- `auth` → arahkan ke login.
- `forbidden`/`not_found` → empty/error state.
- `server`/`unknown` → toast (`sonner`) generik + opsi retry.
- Error tak tertangani ditangkap error boundary App Router: `src/app/global-error.tsx` (root, melapor ke Sentry via `Sentry.captureException`) dan `error.tsx` per segmen (`(auth)/`, `dashboard/umkm/`, `dashboard/kreator/`).
