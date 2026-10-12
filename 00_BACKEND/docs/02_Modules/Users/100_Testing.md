# Users — Testing

Lokasi test: `00_BACKEND/tests/` (Vitest). Test komponen frontend ada di `src/**/__tests__/`.

## Completion (`functions/update-profile/src/completion.js`) — `tests/unit/update-profile-completion.test.ts`

- UMKM lengkap → `true`; `phone` kosong atau bukan format HP Indonesia → `false`; prefix `628`/`+628` diterima.
- `description` 19 karakter → `false`; tepat 20 → `true`; whitespace di-trim sebelum hitung.
- `businessName`/`category`/`city` kosong → `false`; TikTok tidak wajib untuk UMKM.
- Creator lengkap → `true`; tanpa TikTok username, bio < 20, `niche`/`city`/`displayName` kosong → `false`.
- `nextProfileCompleted`: `true` tetap `true`; `false → true` hanya bila evaluasi lolos.
- `umkmFailedFields` mengembalikan field gagal sesuai urutan aturan.

## Function `update-profile` — `tests/integration/update-profile.test.ts`

- Tanpa header user → 401; method selain POST → 405.
- Baris `users` tidak ada → 404; role tidak didukung → 400.
- `isProfileCompleted` dari body diabaikan; profil tidak lengkap → `false`.
- Profil UMKM yang sudah `true` tidak pernah turun.
- UMKM: semua field canonical + `phone` ditulis → flag `true`.
- Creator: profil lengkap + akun TikTok → `true`; tanpa TikTok → tetap `false`; never downgrade.
- Membaca env `CREATOR_SOCIAL_ACCOUNT_COLLECTION_ID` (nama live) bila nama jamak tidak ada.
- `listDocuments` stale setelah write → flag tetap tersimpan `true` (evaluasi memakai hasil `updateDocument`).
- Log field gagal saat evaluasi `false`.
- Field tidak dikenal di-strip.

## Guard Status Akun — `tests/unit/require-active-role.test.ts`, `tests/unit/sec-03-role-guard.test.ts`

- `requireActiveRole`: UMKM aktif → return dokumen; profil hilang → 404; status non-active → 403; role salah → 403; tanpa `Query` → error jelas.
- `create-conversation` & `create-offer`: requester creator → 403; UMKM `suspended` → 403; UMKM aktif → sukses.

## Functions lain — `tests/integration/functions.test.ts`

- `get-creator-directory`: mengembalikan DTO paginasi `{ items, total, nextCursor }`.
- `verify-kyc`: menandai `kyc_status: verified` + notifikasi; idempoten untuk user yang sudah `verified` (tanpa notifikasi ganda).

## Service Referensi Lama (`00_BACKEND/src/services/user.service.ts`)

Tidak dipakai frontend, tetapi masih diuji:

- `tests/unit/services-validation.test.ts`: `getProfile('')` → `'User ID wajib diisi.'`; `addSocialAccount` platform ≠ tiktok → `'MVP hanya mendukung akun TikTok.'`; username kosong → `'Username akun sosial wajib diisi.'`; `removeSocialAccount('')` → `'ID akun sosial wajib diisi.'`; `deleteFile('')` → `'File ID wajib diisi.'`.
- `tests/integration/services.test.ts`: `addSocialAccount` hanya TikTok; `getProfile` by role.
- `tests/integration/functions.test.ts`: `searchCreators` filter range harga via `rate_card_packages`.

## Skenario Belum Tercakup Test Otomatis

- `create-user-profile`: idempoten (eksekusi ganda tidak menduplikasi baris), backfill `phone`, role tidak valid → 400, `tos_version` hanya terisi bila sama dengan versi aktif.
- `get-umkm-profile` / `get-creator-profile`: 404 profil hilang, 403 role salah, fallback `ownerName`/`name` saat akun Auth tak terbaca.
- `get-creator-directory`: hanya profil lengkap di daftar; akun sosial TikTok diprioritaskan; `startingPrice` mengabaikan rate card `draft`; `creatorId` tidak ada → 404.
- `validate-and-upload`: MIME tidak diizinkan / > 20 MB → 400; kuota penuh / 100 file → 409; `shareWithOrderId` hanya membagikan ke peserta order.
- `delete-file`: bukan pemilik → 403; file sudah `deleted` → 200 idempoten; usage tidak negatif.
- `suspend-user` / `unsuspend-user` / `create-appeal` / `review-appeal`: transisi status & kode 400/403/404/409 sesuai [70_Backend.md](70_Backend.md); batas 14 hari; satu banding terbuka.

## Onboarding (frontend)

- `src/components/features/onboarding/__tests__/umkm-profile-onboarding.integration.test.tsx` — wizard UMKM.
- UMKM dapat menyelesaikan onboarding tanpa logo; Creator tanpa portfolio (portfolio tidak ada di wizard).
- Creator wajib mengisi TikTok sebelum submit; akun sosial ditulis sebelum `update-profile`.
