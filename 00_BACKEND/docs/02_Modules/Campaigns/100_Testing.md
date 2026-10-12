# Campaigns — Testing

Test yang ada di repo, dikelompokkan per lapis. Jalankan dari `00_BACKEND/` (`npm test`, `npm run test:unit`, `npm run test:integration`) kecuali disebut lain.

## Service Legacy Backend (`00_BACKEND/src/services`) — `tests/unit/campaign.service.test.ts`, `tests/unit/submission.service.test.ts`

> Service ini bukan jalur runtime (lihat [60_API.md](60_API.md) §3). Test hanya mencakup validasi input.

### `createCampaign`

- `title` kosong → `CampaignServiceError('validation', 'Judul wajib diisi.')`.
- `category` kosong → `'Kategori wajib diisi.'`.
- `type` bukan `ugc`/`clipping` → `'Tipe campaign tidak valid.'`.
- `platforms` kosong atau berisi selain `tiktok` → `'MVP hanya mendukung platform TikTok.'`.
- `budget` < `MINIMUM_CAMPAIGN_BUDGET` (50.000) → `'Minimum budget Rp50.000.'`.
- `rewardPer1000Views` ≤ 0 → `'CPM (rewardPer1000Views) wajib diisi dan > 0.'`.
- `claimLimit` ≤ 0 → `'Claim limit wajib diisi dan > 0.'`.
- `submissionDays` < 1 → `'Batas waktu submit minimal 1 hari.'`.

### `generateBrief` / `publishCampaign` / `getCampaignById`

- `campaignId` kosong → `'Campaign ID wajib diisi.'`; `description` kosong → `'Deskripsi wajib diisi.'`; `type` invalid → `'Tipe campaign tidak valid.'`.

### `createSubmission` / `approveSubmission` / `rejectSubmission`

- `claimId` / `campaignId` kosong, `platform !== 'tiktok'`, `postUrl` bukan `https://*.tiktok.com`, `views` negatif / bukan integer → `SubmissionServiceError('validation', …)`.
- `submissionId` kosong → validation.

### Success path legacy — `tests/integration/services.test.ts`

- `createCampaign` menyimpan draft dengan default (`totalClaims 0`, `submissionDays 7`).
- `publishCampaign` → `active` + `publishedAt` bila `remainingBudget > 0`; `remainingBudget = 0` → `'Campaign harus di-top-up terlebih dahulu.'` (guard runtime sebenarnya `remainingBudget >= budget` di `patch-campaign-status`, belum dites).
- `generateBrief` mengembalikan brief dari Function `ai-brief`.
- `claimCampaign` membuat claim + increment `totalClaims`; claim duplikat ditolak.
- `createSubmission` menyimpan submission `pending`.

## Appwrite Functions — `tests/integration/functions.test.ts`

### `calculate-campaign-reward`

- Approved → `wallet.balance` naik, `pendingBalance` tetap; `spentAmount` naik & `remainingBudget` turun sebesar reward; ledger `release` `referenceType: campaign_submission`.
- Rejected → wallet, ledger, budget tidak berubah.
- Locked views: `views_final = true` → reward dari `views_count` (4.850 views × Rp1.000 → Rp4.850).
- `views_count = 999`, rate Rp1.000 → reward **Rp999** (pembulatan proporsional; nama test "calculates Rp0…" tidak sesuai ekspektasi).
- Event ulang untuk submission sama → tidak ada kredit kedua.

### `review-submission`

- `views` > `Number.MAX_SAFE_INTEGER` → ditolak, submission tetap `pending`.
- Admin approve → `views_count`, `views_source = manual_admin`, `views_final = true`, `views_captured_at` terisi; reject → `views_*` tidak ditulis, notifikasi kreator berisi "ditolak oleh Marketiv".
- Periode observasi: `functions/review-submission/src/observation-window.test.js` (unit, `getViewValidationEligibility`).

### `create-payment` + `create-escrow` (campaign top-up)

- `purpose: campaign` diterima; status `paid` mengkredit `campaigns.remainingBudget`.

## Function Unit — `tests/unit/`

- `unclaim-campaign.test.ts`: 401 tanpa caller; kreator non-aktif 403; claim bukan milik / tidak ada ditolak; hard delete + decrement tepat sekali; decrement gagal → 500 dan claim dipulihkan.
- `admin-read-functions.test.ts`: `get-admin-submission-queue` 401 tanpa identitas; 403 untuk `umkm`, `creator`, admin `suspended`; admin aktif → `{ items: [], total }`.
- `perf-01-submission-counts.test.ts`: `getSubmissionCountsFromAppwrite` — tanpa id tidak query; agregasi `pending/valid/dispute` dalam satu batch query; campaign tanpa submission tidak muncul di map.

## Frontend — `src/**/__tests__` (dijalankan dari root repo)

- `services/umkm/__tests__/umkm-appwrite.service.update-status.test.ts` — pause/resume via `patch-campaign-status`.
- `services/creator/__tests__/creator-appwrite.service.claim.test.ts` — claim campaign.
- `services/creator/__tests__/creator-appwrite.service.submit-proof.test.ts` — submit bukti via `submit-campaign-proof`.
- `lib/appwrite/__tests__/campaign-thumbnail.test.ts` — parsing/validasi URL thumbnail.
- `lib/validations/__tests__/campaign.schema.test.ts` — skema wizard per langkah.

## Gap Cakupan (belum ada test)

- `campaign-claimed`: increment dengan `max`, claim → `expired` saat kuota penuh.
- `expire-stale-claims`: expire + decrement + notifikasi.
- `submit-campaign-proof`: validasi host URL, duplikat (409), claim → `submitted`.
- `patch-campaign-draft` / `patch-campaign-status`: allowlist, lock setelah funded, guard publish `remainingBudget >= budget`.
- `campaign-published`: guard status + dedup notifikasi.
- `calculate-campaign-reward`: kegagalan setelah kredit wallet sebelum ledger dibuat (risiko kredit ganda saat retry); transisi `completed`.
- Konsistensi rumus estimasi reward UI vs backend.
