# Campaigns — API

Kontrak pemanggilan modul Campaigns. Ada tiga lapis:

1. **Service runtime frontend** (`src/services/umkm/umkm-appwrite.service.ts`, `src/services/creator/creator-appwrite.service.ts`, diekspos lewat `umkm-dashboard.service.ts` / `creator-dashboard.service.ts`). Ini yang dipakai aplikasi Next.js.
2. **Appwrite Function HTTP** (dipanggil lewat `executeFunction()` di `src/lib/appwrite/functions.ts`, POST sinkron, identitas dari header `x-appwrite-user-id`).
3. **Service legacy backend** `00_BACKEND/src/services/*.service.ts` — tidak diimpor frontend (`00_BACKEND` dikecualikan dari tsconfig); hanya dipakai unit test. Lihat bagian akhir.

Function event-driven (tanpa HTTP) dijelaskan di [70_Backend.md](70_Backend.md) dan [90_Events.md](90_Events.md).

---

## 1. Service Runtime Frontend

Semua fungsi mengembalikan `ServiceResult<T>` (`{ success, data, error?, code? }`); error Function dipetakan dari HTTP status (`400/409/422 → validation`, `401 → auth`, `403 → forbidden`, `404 → not_found`, `5xx → server`).

### UMKM (`umkm-appwrite.service.ts`)

| Fungsi | Jalur | Ringkasan |
| ------ | ----- | --------- |
| `createCampaignDraftInAppwrite(input)` | Client SDK `createDocument` | Buat `campaigns` (`status: "draft"`, `platforms: ["tiktok"]`, `remainingBudget/spentAmount/totalClaims: 0`, `submissionDays ?? 7`) + opsional 1 baris brief (`6ab530d00018edb50097`) + opsional 1 baris `campaign_assets` (`source: "external"`, `type: "link"`). Brief/asset gagal → hanya `warnings`, campaign tidak di-rollback. |
| `updateCampaignDraftInAppwrite(campaignId, input)` | Function `patch-campaign-draft` + Client SDK | Update kolom campaign via Function, lalu upsert brief & asset dari klien. Thumbnail yang tidak tersimpan → gagal `validation`. |
| `getCampaignDraftForEditFromAppwrite(campaignId)` | Client SDK | Baca draft milik UMKM (`status = draft`) + brief + asset pertama. |
| `getCampaignsFromAppwrite()` | Client SDK | Campaign milik UMKM, `orderDesc($updatedAt)`, limit 100. |
| `getCampaignByIdFromAppwrite(id)` | Client SDK | Campaign milik UMKM (filter `umkmId`). |
| `getCampaignSubmissionsFromAppwrite(campaignId)` | Client SDK | Submission satu campaign milik UMKM (read-only), limit 100, join profil kreator. |
| `getSubmissionCountsFromAppwrite(campaignIds)` | Client SDK | Hitung `pending` / `valid` (approved) / `dispute` (fraudStatus ≠ `safe` & tidak kosong) per campaign; batch `Query.equal(campaignId, ≤100 id)` (UMKM-PERF-01). |
| `getPendingSubmissionsFromAppwrite()` | Client SDK | Submission `pending` lintas campaign milik UMKM. |
| `generateCampaignBriefFromAppwrite(input)` | Function `ai-brief` | Body `{ description, type, productName, targetMarket, goal, materials }` — sengaja **tanpa** `campaignId` & `userId`. Hasil brief disimpan klien saat create/update draft. |
| `uploadCampaignThumbnailInAppwrite(file)` / `deleteCampaignThumbnailInAppwrite(url)` | Storage `campaign-assets` | Upload gambar (MIME `image/*`) / hapus best-effort. |
| `createCampaignPaymentInAppwrite({ campaignId, budget })` | Function `create-payment` | Body `{ purpose: "campaign", amount: budget, campaignId }`. Function menambah fee. Kontrak lengkap: modul Payments. |
| `publishCampaignInAppwrite(campaignId)` | Function `patch-campaign-status` (`action: "publish"`) | Lalu baca ulang campaign. |
| `updateCampaignStatusInAppwrite(campaignId, "paused" \| "active")` | Function `patch-campaign-status` (`pause` / `resume`) | Dipakai juga oleh modal "Batalkan Campaign" (efeknya pause). |
| `duplicateCampaignInAppwrite(sourceId, newTitle, { copyBrief, copyBudget, copyAssets })` | Client SDK + Storage | Salin via `createCampaignDraftInAppwrite`. Thumbnail disalin sebagai file baru; gagal salin → duplikasi dibatalkan. `copyBudget: false` → budget `MINIMUM_CAMPAIGN_BUDGET`. |
| `deleteCampaignDraftInAppwrite(campaignId)` | Client SDK | Hanya `draft` milik UMKM. Hapus brief & asset (best-effort), campaign, lalu thumbnail. |
| `removeCampaignAssetInAppwrite(assetId)` | Client SDK | Hanya bila campaign induk masih `draft`. |
| `reviewSubmissionInAppwrite(input)` | Function `review-submission` | Masih diekspor (`reviewSubmission` di `umkm-dashboard.service.ts`) tetapi **tidak dipanggil UI UMKM**; Function sekarang menolak non-Admin (403). |

### Creator (`creator-appwrite.service.ts`)

| Fungsi | Jalur | Ringkasan |
| ------ | ----- | --------- |
| `getCreatorJobsFromAppwrite()` | Client SDK | Job Pool: semua campaign `status = active`, `orderDesc($createdAt)`, limit 100, join `umkm_profiles`. |
| `getCreatorJobByIdFromAppwrite(id)` | Client SDK | Detail job `active` + brief + assets + profil UMKM. |
| `claimCampaignInAppwrite(campaignId)` | Client SDK `createDocument` | Lihat kontrak di bawah. |
| `getCreatorActiveWorksFromAppwrite()` / `getCreatorActiveWorkByIdFromAppwrite(id)` | Client SDK | Claim milik kreator + campaign + submission + asset pertama. Views ditampilkan dari `views_count` bila `views_final`, selain itu `views`. |
| `getCreatorSubmissionsFromAppwrite()` | Client SDK | Submission milik kreator, limit 100. |
| `submitProofInAppwrite(input)` | Function `submit-campaign-proof` | Pre-check klien (claim milik sendiri, status `claimed`, campaign cocok), lalu Function. |
| `unclaimCampaignInAppwrite(claimId)` | Function `unclaim-campaign` | Respons harus `{ success: true, claimId: string }`. |

#### `claimCampaignInAppwrite(campaignId)` — [Client SDK]

- **Validasi klien** (bukan otoritatif):
  - campaign `status === "active"`;
  - `creator_profiles.isProfileCompleted === true` (dicari via `userId`);
  - `totalClaims < claimLimit` (bacaan mungkin basi);
  - belum ada claim non-`expired` untuk `campaignId + creatorId`.
- **Proses**: `createDocument(campaign_claims, { campaignId, creatorId, status: "claimed", claimedAt: now })` dengan permission `read/update/delete(user:creator)`.
- **Setelahnya**: event `campaign-claimed` menaikkan `totalClaims` atomik; bila kuota sudah penuh, claim diubah `expired` (async ~0,5–3 detik). Klien tidak memutasi counter.
- **Return**: `claimId`.

---

## 2. Appwrite Function HTTP

Semua: `execute: ["users"]`, method `POST` (405 untuk method lain), `401` bila header `x-appwrite-user-id` kosong, `500 { error: "Internal server error" }` untuk error tak terduga.

### `patch-campaign-draft`

- **Input**: `{ campaignId, title?, category?, type?, platforms?, description?, budget?, rewardPer1000Views?, claimLimit?, submissionDays?, thumbnailUrl? }`.
- **Guard**: campaign `$id = campaignId`, `umkmId = caller`, `status = draft` → selain itu `404`.
- **Allowlist**: hanya field di atas. `remainingBudget`, `spentAmount`, `status`, `totalClaims`, `publishedAt` tidak bisa disentuh.
- **Validasi**: `title` ≤ 255; `description` ≤ 5000; `budget` integer 50.000–999.999.999; `rewardPer1000Views` integer ≥ 0; `claimLimit` integer ≥ 1; `submissionDays` integer ≥ 1; `thumbnailUrl` ≤ 2048 dan harus `https://…/storage/buckets/<campaign-assets>/files/<id>/view` (host tidak dicek).
- **Aturan funded**: bila `remainingBudget > 0`, perubahan `budget`, `rewardPer1000Views`, `claimLimit`, `thumbnailUrl` ditolak `400`.
- **Return**: `{ campaignId, status }`. Tidak ada field → `400 "Tidak ada field yang diperbarui."`.

### `patch-campaign-status`

- **Input**: `{ campaignId, action: "pause" | "resume" | "publish" }`.
- **Guard**: campaign milik caller, selain itu `404`.
- **Transisi**:
  - `pause`: `active → paused`, selain itu `409`.
  - `resume`: `paused → active`, selain itu `409`.
  - `publish`: `draft → active`, wajib `remainingBudget >= budget` (selain itu `409 "Dana campaign belum mencukupi target budget…"`). Set `publishedAt`, ganti permission campaign menjadi `read(any)` + `delete(user:umkm)`, dan ganti permission baris brief & asset **pertama** dengan nilai yang sama (best-effort).
- **Return**: `{ campaignId, status }`.

### `submit-campaign-proof`

- **Input**: `{ claimId, campaignId, platform, postUrl, caption? }`.
- **Validasi**: `platform ∈ {tiktok, instagram}`; `postUrl` http/https dengan host `*.tiktok.com` / `*.instagram.com` sesuai platform; `caption` dipangkas 1000.
- **Guard**: `users.status` bila ada harus `active` (403); claim `$id + creatorId = caller + campaignId` harus ada (404) dan `status = claimed` (409); belum ada submission untuk `claimId` (409); campaign ada dan punya `umkmId`.
- **Proses**: buat `campaign_submissions` (`views: 0`, `status: "pending"`, permission `read(creator)` + `read(umkm)`), claim → `submitted`, notifikasi UMKM (`type: "campaign"`, id deterministik).
- **Return**: `{ success: true, submissionId, claimId, campaignId, status: "pending" }`.
- Tidak memeriksa status campaign (paused/completed tetap bisa submit) maupun deadline `submissionDays`.

### `unclaim-campaign`

- **Input**: `{ claimId }`.
- **Guard**: `users.role = creator` dan `status = active` (403); claim ada (404); milik caller (403); `status = claimed` (409).
- **Proses**: hard delete claim, lalu `totalClaims` di-decrement atomik (`min 0`). Bila decrement gagal, claim dibuat ulang dengan id yang sama dan Function membalas `500`.
- **Return**: `{ success: true, claimId }`.

### `review-submission`

- **Input**: `{ submissionId, status: "approved" | "rejected", views?, notes? }`. `views` wajib safe integer ≥ 0 saat approve.
- **Guard**: submission ada (404) dan `pending` (409). Caller harus **Admin aktif**: `users.role = admin` (+ `status` aktif), atau fallback Appwrite Auth `labels`/`prefs.role` berisi `admin` → selain itu `403`.
- **Approve**: wajib lewat periode observasi `VIEW_VALIDATION_DELAY_HOURS` (default 72 jam) sejak `$createdAt` submission → selain itu `409 { error, eligibleAt }`.
- **Proses**: update submission `{ status, views, reviewNotes? }`; approve juga menulis `views_count`, `views_captured_at`, `views_source: "manual_admin"`, `views_final: true`. Claim diselaraskan ke status yang sama (best-effort). Reject: `totalClaims` di-decrement atomik (slot kembali) + notifikasi kreator `submission_rejected`.
- **Return**: `{ success: true, campaignId, status }`.

### `get-admin-submission-queue`

- **Input**: `{ status?: "pending" | "approved" | "rejected" | "all" (default "pending"), limit?: 1–100 (default 50) }`. Method `GET` juga diterima.
- **Guard**: Admin aktif (aturan sama dengan `review-submission`) → selain itu `403`.
- **Return**: `{ items: AdminSubmissionDto[], total }`, urut `$createdAt DESC`. DTO: `id, campaignId, creator{id,name,username,avatarUrl?,tiktokHandle?}, campaign{id,title,rewardPer1000Views,platform}, umkm{id,name,ownerName?}, platform, postUrl, note?, status, submittedAt, verifiedViews, verifiedAt?, verifiedBy?, estimatedReward, finalReward, rejectionReason?`.
- Tidak menyertakan `fraudScore`/`fraudStatus`/`fraud_checks`. Tidak ada pagination cursor/offset.
- Dipakai admin app `admin/` (`admin/src/features/admin/submissions/services/submission.service.ts`, body `{ status, limit: 50 }`); tidak dipanggil frontend web `src/`.

---

## 3. Service Legacy Backend (`00_BACKEND/src/services`)

Masih ada untuk unit test (`tests/unit/campaign.service.test.ts`, `submission.service.test.ts`), tetapi **bukan jalur runtime** dan sebagian bertentangan dengan aturan saat ini:

- `campaign.service.ts`: `createCampaign` (validasi TikTok-only, budget ≥ `MINIMUM_CAMPAIGN_BUDGET`, CPM > 0, claimLimit > 0, submissionDays ≥ 1, memasang `update(user)` — sudah tidak berlaku sejak SEC-H1), `generateBrief`, `publishCampaign` (update langsung, guard `remainingBudget > 0`), `getCampaigns`, `getCampaignById`, `deleteCampaign`.
- `campaign-asset.service.ts`: `addCampaignAsset` (`source: "external_url"`, type `image|video|document|link`, URL `https://`), `listCampaignAssets`, `removeCampaignAsset`.
- `claim.service.ts`: `getMyClaims`, `claimCampaign` (sweep expired + increment non-atomik dari klien), `unclaimCampaign` (hard delete + decrement non-atomik).
- `submission.service.ts`: `createSubmission` (input `views` dari kreator, memasang `update(user:umkm)`), `getMySubmissions`, `getSubmissionsByCampaign`, `approveSubmission` / `rejectSubmission` oleh UMKM owner — **bertentangan dengan ADR-010**; runtime memakai `submit-campaign-proof` dan `review-submission`.
- `topUpCampaign()` dan `unclaimed` sebagai status claim **tidak ada** di kode mana pun.

---

## Lihat Juga

- [50_Database.md](50_Database.md) — skema data
- [30_Business_Rules.md](30_Business_Rules.md) — aturan validasi
- [70_Backend.md](70_Backend.md) — detail Appwrite Functions
- [90_Events.md](90_Events.md) — event trigger flow
