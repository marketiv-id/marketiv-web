# Campaigns — Database

Sumber kebenaran skema untuk koleksi milik modul Campaigns. Satu fakta = satu lokasi; koleksi lain ditautkan, tidak diduplikasi.

> Sumber kanonik skema: `00_BACKEND/appwrite.config.json` (dihasilkan/di-sync dari `00_BACKEND/appwrite/generate_appwrite_json.cjs`). `appwrite.json` sudah usang — jangan dijadikan acuan.
> Database: `db_marketiv` (`6a4c8598001da3b0d7f0`).

> Catatan keputusan:
> - **ADR-004** — `fraud_checks` dipisah dari `campaign_submissions` (riwayat fraud + ekspansi Phase 2 seperti Computer Vision / Logo Detection). Lihat `../../04_Decisions/`.
> - **ADR-005** — counter denormalisasi pada `campaigns` (`totalClaims`, `spentAmount`, `remainingBudget`). Lihat `../../04_Decisions/`.
> - **ADR-010** — final views ditetapkan Admin Marketiv (kolom `views_*` di `campaign_submissions`).

## Konvensi Umum

- Semua kolom "enum" pada tabel campaign (kecuali `views_source`) disimpan sebagai **`string`** di Appwrite; nilai yang valid ditegakkan oleh kode aplikasi/Function, **bukan** oleh skema. Kolom yang benar-benar bertipe enum di skema hanya `campaign_submissions.views_source`.
- Semua tabel memakai `rowSecurity: true`. Permission Appwrite bersifat **union** (level tabel ATAU level baris). Karena itu `read("any")` di level tabel berarti **seluruh baris terbaca publik**, apa pun permission baris yang dipasang penulis.
- `update("users")` di level tabel sengaja dicabut (gelombang harden-permissions 2026-07-29, lihat komentar kepala `generate_appwrite_json.cjs`). Mutasi field sensitif hanya lewat Function dengan API key.

---

## campaigns

Relasi: UMKM (1) → Campaign (N).

| Attribute          | Type      | Required | Catatan |
| ------------------ | --------- | -------- | ------- |
| umkmId             | string(255) | ya     | FK → `users.userId` (Auth user id UMKM) |
| title              | string(255) | ya     | |
| category           | string(100) | ya     | string bebas di skema; UI memakai niche `kuliner\|fashion\|pariwisata\|edukasi\|kecantikan\|lainnya` |
| type               | string(50)  | ya     | nilai aplikasi `ugc\|clipping` |
| platforms          | string(255)[] | ya   | array; wizard frontend selalu menulis `["tiktok"]` |
| description        | string(2000) | tidak | wizard mewajibkan 30–2000 karakter (`src/lib/validations/campaign.schema.ts`) |
| budget             | integer   | ya       | target dana (nominal dasar, tanpa fee). Minimal Rp50.000 (validasi wizard + `patch-campaign-draft`) |
| rewardPer1000Views | integer   | ya       | CPM / tarif kreator per 1.000 views |
| status             | string(50) | ya      | nilai aplikasi `draft\|active\|paused\|completed` |
| claimLimit         | integer   | ya       | kuota kreator (UI: "Jumlah kreator") |
| submissionDays     | integer   | tidak    | default `7` — batas hari submit sejak `claimedAt` |
| totalClaims        | integer   | tidak    | default `0` — denormalisasi (ADR-005), dimutasi atomik oleh Function |
| spentAmount        | integer   | tidak    | default `0` — denormalisasi, naik saat reward dibayar |
| remainingBudget    | integer   | tidak    | default `0` — denormalisasi, naik saat top-up `paid`, turun saat reward |
| publishedAt        | datetime  | tidak    | di-set `patch-campaign-status` action `publish` |
| thumbnailUrl       | string(2048) | tidak | default `""`. URL view file bucket `campaign-assets` (gambar produk). Wajib untuk campaign baru di wizard; campaign legacy boleh kosong |

Semua integer: `min 0`, `max 999999999`.

**Index**: `idx_umkmId` (umkmId), `idx_status` (status), `idx_category` (category), `idx_publishedAt` (publishedAt DESC), `idx_remainingBudget` (remainingBudget).

**Permission**:

- Tabel: `read("any")`, `create("users")` — tanpa update/delete di level tabel.
- Baris saat dibuat (frontend `createCampaignDraftInAppwrite`): `read(user:umkm)`, `delete(user:umkm)`. Tidak ada `update` dari klien (fix SEC-H1 2026-08-08) — semua update lewat `patch-campaign-draft` / `patch-campaign-status`.
- Baris setelah publish (`patch-campaign-status`): diganti menjadi `read(any)`, `delete(user:umkm)`.
- Catatan: karena tabel `read("any")`, draft pun sebenarnya terbaca publik.

---

## campaign_assets

Tautan materi produksi (bukan file internal). Relasi: Campaign (1) → Assets (N); runtime frontend saat ini hanya menulis/membaca **satu** baris per campaign.

| Attribute  | Type         | Required | Catatan |
| ---------- | ------------ | -------- | ------- |
| campaignId | string(255)  | ya       | FK → campaigns |
| source     | string(50)   | ya       | frontend menulis `"external"`; service legacy `00_BACKEND/src/services/campaign-asset.service.ts` menulis `"external_url"` |
| type       | string(50)   | ya       | frontend menulis `"link"`; service legacy mendukung `image\|video\|document\|link` |
| fileUrl    | string(2048) | ya       | URL folder cloud publik (`https://`) |
| fileName   | string(255)  | tidak    | label; default frontend `"Folder Aset Eksternal"` |

**Index**: `idx_campaignId` (campaignId).

**Permission**: tabel `read("any")`, `create("users")`. Baris dari frontend: `read(any)`, `update(user:umkm)`, `delete(user:umkm)`; setelah publish, `patch-campaign-status` mengganti permission **baris pertama** menjadi `read(any)`, `delete(user:umkm)`.

> Hanya URL eksternal. Wizard (langkah 3) membatasi domain ke folder Google Drive, Dropbox, OneDrive/SharePoint (`APPROVED_CLOUD_STORAGE_DOMAINS` di `src/lib/validations/campaign.schema.ts`). Lihat [85_Asset_Tutorial.md](85_Asset_Tutorial.md).

---

## campaign_briefs (legacy) & `6ab530d00018edb50097` (campaign_briefs_v2, runtime)

Brief campaign (hasil AI Brief Generator atau input manual UMKM). Relasi: Campaign (1) → Brief (1).

> **Migrasi runtime 2026-09-24:** semua runtime (frontend `COLLECTIONS.campaignBriefs`, `patch-campaign-status`, `ai-brief`, `ai-fraud-precheck`) membaca/menulis tabel ID **`6ab530d00018edb50097`** (nama `campaign_briefs_v2`). Tabel lama `campaign_briefs` sengaja dipertahankan (data + definisi) dan tidak lagi dipakai runtime. Skema keduanya identik.

| Attribute     | Type          | Required | Catatan |
| ------------- | ------------- | -------- | ------- |
| campaignId    | string(255)   | ya       | FK → campaigns |
| objective     | string(2000)  | tidak    | output AI `objective`; dipetakan ke `targetAudience` di Job Pool kreator |
| contentAngle  | string(2000)  | tidak    | output AI `contentAngle` |
| cta           | string(1000)  | tidak    | output AI `cta` |
| briefDetail   | string(10000) | tidak    | arahan kreatif lengkap (dikomposisi klien) |
| doAndDont     | string(400)   | tidak    | JSON string `{ do: string[], dont: string[] }`; klien memangkas agar ≤ 400 byte |
| materialsJson | string(300)   | tidak    | tidak ditulis oleh runtime saat ini |
| generatedByAi | boolean       | tidak    | default `false` |

**Index**: `idx_campaignId` (campaignId, **unique**).

**Permission**: tabel `read("any")`, `create("users")`. Baris dari frontend: `read(any)`, `update(user:umkm)`, `delete(user:umkm)`; setelah publish diganti `read(any)`, `delete(user:umkm)` (UMKM tidak bisa lagi mengubah brief dari klien). Baris yang dibuat `ai-brief` (bila dipanggil dengan `campaignId`) dibuat tanpa permission baris.

> Pemetaan dari output AI: `../AI/30_Business_Rules.md`. Kontrak fungsi AI: `../AI/60_API.md`.

---

## campaign_claims

Creator mengambil campaign. Relasi: Campaign (1) → Claims (N); Creator (1) → Claims (N).

| Attribute  | Type        | Required | Catatan |
| ---------- | ----------- | -------- | ------- |
| campaignId | string(255) | ya       | FK → campaigns |
| creatorId  | string(255) | ya       | FK → `users.userId` kreator |
| status     | string(50)  | ya       | nilai aplikasi `claimed\|submitted\|approved\|rejected\|expired` |
| claimedAt  | datetime    | ya       | ditulis klien saat create; basis deadline `submissionDays` |

**Index**: `idx_campaignId`, `idx_creatorId`, `idx_status`, `idx_claimedAt` (DESC).

**Keunikan**: **tidak ada** unique index `campaignId + creatorId`. Pencegahan duplikat hanya cek klien (`claimCampaignInAppwrite`: claim non-`expired` milik kreator yang sama → ditolak). Claim `expired` tidak menghalangi claim ulang. Unclaim menghapus baris (hard delete), bukan status `unclaimed`.

**Permission**: tabel `read("any")`, `create("users")`. Baris dari frontend: `read/update/delete(user:creator)` (klien tidak bisa memasang permission untuk UMKM; UMKM membaca lewat `read("any")` tabel). Update status oleh sistem dilakukan Function (`campaign-claimed`, `expire-stale-claims`, `submit-campaign-proof`, `review-submission`).

---

## campaign_submissions

Bukti konten kreator. Relasi: Claim (1) → Submission (1).

| Attribute         | Type          | Required | Catatan |
| ----------------- | ------------- | -------- | ------- |
| claimId           | string(255)   | ya       | FK → campaign_claims (unique) |
| campaignId        | string(255)   | ya       | FK → campaigns |
| creatorId         | string(255)   | ya       | FK → users |
| platform          | string(50)    | ya       | `submit-campaign-proof` menerima `tiktok\|instagram`; UI kreator mengirim platform pertama campaign (praktis `tiktok`) |
| postUrl           | string(2048)  | ya       | URL publik konten |
| caption           | string(1000)  | tidak    | catatan kreator (opsional); dipakai content analysis `ai-fraud-precheck` |
| views             | integer       | ya       | legacy/kompatibilitas. `submit-campaign-proof` menulis `0`; `review-submission` menimpa dengan views final saat approve (dan menyalin nilai lama saat reject) |
| views_count       | integer       | tidak    | views final terkunci (ditulis saat approve) |
| views_captured_at | datetime      | tidak    | waktu capture views final |
| views_source      | enum(12)      | tidak    | `api\|scrape\|manual_admin`; runtime saat ini hanya menulis `manual_admin` |
| views_final       | boolean       | tidak    | default `false`; `true` = views terkunci |
| engagement        | integer       | tidak    | tidak ditulis runtime saat ini |
| fraudScore        | integer       | tidak    | 0–100, ditulis `ai-fraud-precheck` |
| fraudStatus       | string(50)    | tidak    | `safe\|review\|rejected`, ditulis `ai-fraud-precheck` |
| status            | string(50)    | ya       | nilai aplikasi `pending\|approved\|rejected` |
| reviewNotes       | string(1000)  | tidak    | catatan Admin saat review (`notes`, dipangkas 1000) |
| creatorCredit     | string(255)   | tidak    | metadata kreditasi (Pasal 16.3 T&C); tidak ditulis `submit-campaign-proof` saat ini |
| aiGenerated       | boolean       | tidak    | metadata transparansi AI (Pasal 12.5), default null; tidak ditulis runtime saat ini |
| aiDisclosed       | boolean       | tidak    | metadata transparansi AI (Pasal 12.5), default null; tidak ditulis runtime saat ini |

**Index**: `idx_claimId` (claimId, **unique** — satu submission per claim), `idx_campaignId`, `idx_creatorId`, `idx_status`, `idx_fraudStatus`.

**Permission**: tabel `read("any")`, `create("users")`. Baris dibuat `submit-campaign-proof` dengan `read(user:creator)` + `read(user:umkm)` saja — tidak ada update untuk klien. Semua mutasi status/views lewat Function (`review-submission`, `ai-fraud-precheck`).

> `fraudScore` & `fraudStatus` adalah ringkasan fraud terbaru. Riwayat per-check disimpan di `fraud_checks`.

---

## fraud_checks

Riwayat hasil AI Fraud Precheck, dipisah dari submission (ADR-004). Relasi: Submission (1) → Fraud Checks (N).

| Attribute    | Type         | Required | Catatan |
| ------------ | ------------ | -------- | ------- |
| submissionId | string(255)  | ya       | FK → campaign_submissions |
| score        | integer      | ya       | 0–100 |
| result       | string(50)   | ya       | `safe\|review\|rejected` |
| reason       | string(2000) | tidak    | daftar alasan dipisah `; ` atau `"Lolos semua validasi"` |
| createdAt    | datetime     | tidak    | tidak diisi `ai-fraud-precheck` saat ini (pakai `$createdAt`) |

**Index**: `idx_submissionId`, `idx_result`, `idx_createdAt` (DESC).

**Permission**: tabel tanpa permission (`[]`); baris dibuat `ai-fraud-precheck` tanpa permission baris → **hanya terbaca server (API key)**. Belum ada Function yang mengekspos `fraud_checks` ke UMKM/Admin.

> Logika validasi & ambang batas: `../AI/30_Business_Rules.md`. Modul AI menautkan ke koleksi ini, tidak mendefinisikan ulang field-nya.

---

## Bucket Storage Terkait

| Bucket | Permission bucket | fileSecurity | Batas | Pemakaian |
| ------ | ----------------- | ------------ | ----- | --------- |
| `campaign-assets` | `read(any)`, `create/update/delete(users)` | `false` | 100 MB, semua ekstensi | Thumbnail produk campaign (`campaigns.thumbnailUrl`). Upload via `src/lib/appwrite/campaign-thumbnail.ts` (klien wajib MIME `image/*`). Materi produksi tetap URL eksternal di `campaign_assets`. |
| `fraud-evidence` | `read(users)` | `true` | 5 MB, `jpg/jpeg/png/pdf` | Dideklarasikan di config, **belum dipakai** oleh Function/klien mana pun. |
