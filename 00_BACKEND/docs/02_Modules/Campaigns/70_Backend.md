# Campaigns — Backend

Dokumen ini khusus untuk Appwrite Functions dan aturan backend. Kontrak request/response HTTP dibahas di [60_API.md](60_API.md); urutan event di [90_Events.md](90_Events.md).

Sumber konfigurasi: `00_BACKEND/appwrite.config.json` (runtime `node-22`, entrypoint `src/main.js`). Event memakai prefix TablesDB `databases.6a4c8598001da3b0d7f0.tables.<tabel>.rows.*.<aksi>`.

## Ringkasan Function

| Function | Trigger | Execute | Scopes | Timeout |
| -------- | ------- | ------- | ------ | ------- |
| `patch-campaign-draft` | HTTP | `users` | documents.read/write | 15 s |
| `patch-campaign-status` | HTTP | `users` | documents.read/write | 15 s |
| `campaign-published` | event `campaigns.rows.*.update` | — | documents.read/write | 15 s |
| `campaign-claimed` | event `campaign_claims.rows.*.create` | — | documents.read/write | 15 s |
| `unclaim-campaign` | HTTP | `users` | documents.read/write | 15 s |
| `expire-stale-claims` | schedule `0 */6 * * *` (tiap 6 jam) | — | documents.read/write | 60 s |
| `submit-campaign-proof` | HTTP | `users` | documents.read/write | 15 s |
| `ai-fraud-precheck` | event `campaign_submissions.rows.*.create` | — | documents.read/write | 60 s |
| `review-submission` | HTTP | `users` | documents.read/write | 15 s |
| `calculate-campaign-reward` | event `campaign_submissions.rows.*.update` | — | documents.read/write | 30 s |
| `get-admin-submission-queue` | HTTP (POST/GET) | `users` | documents.read | 30 s |
| `get-umkm-dashboard-summary` | HTTP (POST/GET) | `users` | documents.read | 30 s |

Funding campaign (`create-payment` HTTP → `midtrans-webhook` → event `create-escrow`) dimiliki modul Payments; efeknya ke campaign dicatat di bawah.

## Appwrite Functions

### patch-campaign-draft

- Update kolom draft milik caller (`umkmId = x-appwrite-user-id`, `status = draft`) dengan allowlist non-keuangan; field keuangan/status tidak bisa ditulis.
- Setelah funded (`remainingBudget > 0`): `budget`, `rewardPer1000Views`, `claimLimit`, `thumbnailUrl` terkunci.
- Env: `CAMPAIGNS_COLLECTION_ID` (fallback `NEXT_PUBLIC_CAMPAIGN_COLLECTION`, `campaigns`), `NEXT_PUBLIC_APPWRITE_BUCKET_CAMPAIGN_ASSETS` (default `campaign-assets`, untuk validasi thumbnail).
- Fix SEC-H1 (2026-08-08): baris campaign tidak lagi punya `update` dari klien.

### patch-campaign-status

- Aksi `pause` (`active → paused`), `resume` (`paused → active`), `publish` (`draft → active`, wajib `remainingBudget >= budget`).
- `publish`: set `publishedAt`, permission baris campaign → `read(any)` + `delete(user:umkm)`; permission baris brief & asset pertama diganti sama (gagal hanya di-log).
- Env: `CAMPAIGNS_COLLECTION_ID`, `CAMPAIGN_BRIEFS_COLLECTION_ID` (default `6ab530d00018edb50097`), `CAMPAIGN_ASSETS_COLLECTION_ID` (default `campaign_assets`), masing-masing dengan fallback `NEXT_PUBLIC_*`.
- Tidak ada transisi ke `completed` dari Function ini.

### campaign-published

- **Trigger**: setiap `campaigns.rows.*.update` (termasuk update dari `calculate-campaign-reward`, `patch-campaign-*`). Guard: keluar bila `status !== "active"`.
- **Aksi**: ambil maksimal 100 `creator_profiles` dengan `isProfileCompleted = true`, buat notifikasi `type: "campaign_published"` ("Campaign Baru") per kreator.
- **Idempotensi**: id notifikasi deterministik `ntf` + sha256(`${campaignId}:${creatorId}:campaign_published`) → satu notifikasi per kreator per campaign seumur hidup (resume setelah pause tidak menotifikasi ulang). 409 diabaikan.
- Tidak menulis `publishedAt` (sudah ditulis `patch-campaign-status`).

### campaign-claimed

- **Trigger**: `campaign_claims.rows.*.create`.
- **Aksi**: `totalClaims` di-increment atomik dengan `max = claimLimit` (TablesDB `PATCH …/increment`, `src/atomic.js`).
  - Sukses → notifikasi UMKM `type: "claim"` ("Campaign Di-klaim"), id deterministik dari `claimId`.
  - Gagal & campaign dibaca ulang `totalClaims >= claimLimit` → claim di-update `expired`, respons `claim_limit_reached`.
  - Gagal karena hal lain → `500` (agar event dapat dicoba ulang).
- Tidak memvalidasi status campaign, kelengkapan profil, maupun duplikat claim — validasi itu hanya di klien.
- Celah disengaja: jeda ~0,5–3 detik antara create claim dan increment.

### unclaim-campaign

- Kreator aktif (`users.role = creator`, `status = active`) membatalkan claim miliknya yang masih `claimed`: hard delete + decrement atomik `totalClaims` (`min 0`).
- Kompensasi: decrement gagal → claim dibuat ulang (id, `claimedAt` sama) dan respons `500`.
- Env: `USERS_COLLECTION_ID`, `CAMPAIGN_CLAIMS_COLLECTION_ID` (fallback `CLAIMS_COLLECTION_ID`), `CAMPAIGNS_COLLECTION_ID`.

### expire-stale-claims

- **Trigger**: schedule `0 */6 * * *`. Tidak dipanggil dari `claimCampaignInAppwrite` (frontend tidak lagi melakukan sweep).
- **Aksi**: loop halaman pertama `campaign_claims` `status = claimed` (limit 100) sampai habis; deadline = `claimedAt + (campaign.submissionDays || 7) hari`. Bila lewat:
  - claim → `expired`;
  - `totalClaims` decrement atomik (`min 0`; gagal hanya di-log);
  - notifikasi kreator `type: "claim_expired"` ("Claim Expired", id acak).
- Respons `{ success: true, expired: <jumlah> }`.

### submit-campaign-proof

- **Trigger**: HTTP dari frontend (`executeFunction`).
- **Aksi**: validasi platform (`tiktok|instagram`) + host URL, guard akun aktif, claim milik caller berstatus `claimed`, belum ada submission; buat `campaign_submissions` `pending` (`views: 0`); claim → `submitted`; notifikasi UMKM (`type: "campaign"`, "Bukti Kerja Baru").
- Insert submission memicu `ai-fraud-precheck`.
- Tidak menulis `creatorCredit`, `aiGenerated`, `aiDisclosed`.

### ai-fraud-precheck

- **Trigger**: `campaign_submissions.rows.*.create`.
- **Aksi**: skor risiko 0–100 (URL invalid +30, platform tidak cocok +20, URL tidak dapat diakses +25, `postUrl` duplikat +25, content analysis Gemini `gemini-2.5-flash` 0–20 bila `caption` ada & `GEMINI_API_KEY` diset). Mapping `≤30 safe`, `≤70 review`, `>70 rejected`.
- Update `fraudScore` + `fraudStatus` pada submission, buat baris `fraud_checks`, log `ai_requests` (`feature: "fraud"`).
- Hasil **tidak** mengubah `status` submission (bukan auto-approve/auto-reject). Detail aturan: `../AI/`.
- Update submission oleh Function ini memicu `calculate-campaign-reward`, yang langsung keluar karena status masih `pending`.

### review-submission

- **Trigger**: HTTP; hanya Admin Marketiv (ADR-010). Admin dideteksi dari `users.role = admin` (status aktif) atau fallback Appwrite Auth `labels`/`prefs.role = admin`.
- **Approve**: wajib `views` (safe integer ≥ 0) dan periode observasi `VIEW_VALIDATION_DELAY_HOURS` (default 72, `src/observation-window.js`) sejak `$createdAt` submission (fallback `submittedAt`). Menulis `status`, `views`, `views_count`, `views_captured_at`, `views_source: "manual_admin"`, `views_final: true`, `reviewNotes?` dalam satu `updateDocument` → memicu `calculate-campaign-reward`.
- **Reject**: menulis `status`, `reviewNotes?`; decrement atomik `totalClaims` (slot kembali); notifikasi kreator `submission_rejected` ("Bukti Kerja Ditolak").
- Claim diselaraskan ke `approved`/`rejected` (gagal hanya di-log).
- Tidak ada tabel audit khusus; jejak berupa kolom `views_*`, `reviewNotes`, dan log Function.

### calculate-campaign-reward

- **Trigger**: setiap `campaign_submissions.rows.*.update`; keluar bila `status !== "approved"`.
- **Idempotensi**: keluar bila sudah ada `transactions` dengan `referenceId = submissionId` dan `referenceType = "campaign_submission"`.
- **Rumus**: `views = views_final ? views_count : views`; `reward = min(floor(views × rewardPer1000Views / 1000), remainingBudget)`. `reward <= 0` → keluar tanpa ledger.
- **Aksi** (berurutan):
  1. find-or-create wallet kreator (`balance: 0, pendingBalance: 0`, `read(user)`);
  2. `wallets.balance` + reward (atomik);
  3. ledger `transactions` `{ type: "release", referenceType: "campaign_submission", status: "matured" }`, `read(user:creator)`;
  4. `campaigns.remainingBudget` − reward (atomik, `min 0`), `campaigns.spentAmount` + reward (atomik);
  5. baca ulang campaign; `remainingBudget <= 0` → `status: "completed"`;
  6. notifikasi kreator `type: "reward"` (id deterministik).
- **Legacy**: `pendingBalance` tidak ditambah untuk reward baru; status `matured` mencegah cron `mature-pending-balance` (sekarang `enabled: false`) memproses ulang.
- **Fee**: tidak ada potongan; fee campaign dibayar UMKM saat top-up (buyer-side, ADR-008).
- Catatan urutan: kredit wallet terjadi sebelum ledger dibuat; kegagalan di antara keduanya dapat menyebabkan kredit ganda saat retry (lihat [100_Testing.md](100_Testing.md)).

### get-admin-submission-queue

- Read-only untuk Admin aktif; daftar submission + join campaign, profil kreator, profil UMKM. `estimatedReward = floor(views / 1000) × rewardPer1000Views` (tidak dibatasi `remainingBudget`, dan berbeda pembulatan dengan `calculate-campaign-reward`).

### get-umkm-dashboard-summary

- **Trigger**: HTTP (POST/GET). Identitas dari header `x-appwrite-user-id`.
- **Output**: `UmkmDashboardSummary` — kartu metrik dashboard UMKM. Kontrak [08-frontend-data-contract.md §6](../../../../docs/marketiv-md/database/08-frontend-data-contract.md).
- **Aksi**: agregasi `campaigns` + `campaign_submissions` + `orders` + `escrows` milik UMKM pemanggil (maks 5000 dokumen per sumber). Frontend tidak boleh menghitung summary dengan me-load semua campaign.

Pemetaan angka:

| Field | Sumber |
| --- | --- |
| `activeCampaigns` / `completedCampaigns` | jumlah `campaigns` per status |
| `totalViews` | Σ `campaign_submissions.views`; submission `rejected` diabaikan |
| `totalSpent` | Σ `campaigns.spentAmount` + Σ `orders.amount` berstatus `completed` |
| `escrowBalance` | Σ `campaigns.remainingBudget` (`active`/`paused`) + Σ `escrows.amount` berstatus `held` |
| `pendingSubmissions` | jumlah submission berstatus `pending` |
| `activeNegotiations` | jumlah `orders` di luar `completed` / `cancelled` |
| `pendingPayments` | **jumlah** `orders` berstatus `pending_payment` — count, bukan rupiah. Versi rupiah ada di `get-umkm-finance-summary`. |
| `isTruncated` | `true` bila salah satu sumber mencapai 5000 dokumen |

- `campaign_submissions` tidak menyimpan `umkmId`; submission dicari lewat daftar `campaigns` milik UMKM.
- Cross-module: membaca `orders` ([Orders](../Orders/50_Database.md)) dan `escrows` ([Payments](../Payments/50_Database.md)) read-only.

### Efek Funding (milik modul Payments)

- `create-payment` (`purpose: "campaign"`): campaign milik caller, `status = draft`, `amount === campaign.budget`; `fee_amount = floor(amount × FEE_RATE)` (env, default `0.02`); `total_amount = amount + fee`.
- `create-escrow` (event `payments.rows.*.update`, `status = paid`, `purpose = campaign`): ledger `payment` deterministik (pending → completed) lalu `campaigns.remainingBudget += payment.amount` (atomik). Tidak ada flag `funded`.
- `refund-order` cabang `campaignId` (eksekusi manual/API key): refund `remainingBudget` ke wallet UMKM hanya untuk campaign `cancelled`/`completed`. Status `cancelled` tidak pernah ditulis kode campaign mana pun.

## Aturan Backend

- Penegakan kuota final: `campaign-claimed` (`increment` dengan `max: claimLimit`). Slot dikembalikan oleh `unclaim-campaign`, `expire-stale-claims`, dan reject di `review-submission` — semuanya decrement atomik `min 0`.
- Tidak ada unique constraint `campaignId + creatorId` di skema; duplikat dicegah hanya oleh cek klien. Satu submission per claim dijamin unique index `campaign_submissions.claimId` + cek di `submit-campaign-proof`.
- Kelengkapan profil (`creator_profiles.isProfileCompleted`) dan status `active` campaign saat claim hanya dicek klien.
- Asset campaign: URL eksternal; validasi domain folder cloud di wizard frontend, bukan di server.
- `atomic.js` adalah salinan per Function (deploy root = `functions/<id>/`, tidak ada modul bersama): calculate-campaign-reward, campaign-claimed, expire-stale-claims, review-submission, create-escrow, release-escrow, mature-pending-balance. `unclaim-campaign` punya versi ringkas sendiri (decrement saja). Ubah satu, ubah semuanya.
- **Metadata Transparansi AI & Kreditasi**: Field `creatorCredit`, `aiGenerated`, dan `aiDisclosed` pada `campaign_submissions` adalah metadata pasif tanpa validasi/guard server. Saat ini **belum ditulis** oleh `submit-campaign-proof` maupun UI kreator.
