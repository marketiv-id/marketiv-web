# Campaigns — Business Rules

Kolom "Penegakan" menunjukkan di mana aturan benar-benar dijaga. "Klien" = hanya UX/validasi frontend, bukan otoritatif.

## 1. Campaign Status

`draft | active | paused | completed`

| Transisi | Pemicu | Penegakan |
| -------- | ------ | --------- |
| (baru) → `draft` | `createCampaignDraftInAppwrite` | Klien (tabel `create("users")`) |
| `draft → active` | `patch-campaign-status` `publish` | Server: owner + `remainingBudget >= budget` |
| `active → paused` | `patch-campaign-status` `pause` | Server: owner |
| `paused → active` | `patch-campaign-status` `resume` | Server: owner |
| `active/paused → completed` | `calculate-campaign-reward` saat `remainingBudget <= 0` setelah reward | Server |

- Draft boleh dihapus (`deleteCampaignDraftInAppwrite`); campaign yang sudah tayang tidak dihapus, cukup dijeda. Modal "Batalkan Campaign" di UI = pause.
- `paused` menyembunyikan campaign dari Job Pool (query `status = active`) dan claim baru ditolak **di klien**. `campaign-claimed` dan `submit-campaign-proof` tidak memeriksa status campaign, sehingga submission claim yang sudah ada tetap bisa dikirim.
- `completed` = sisa budget habis; claim baru ditolak di klien (status ≠ `active`).
- Tidak ada status `cancelled` yang ditulis kode campaign (walau `refund-order` mengenalinya).

## 2. Campaign Type & Assets

- Type: `ugc | clipping` (wizard & service; skema menyimpan string bebas).
- MVP berbasis aset digital; tidak ada physical sample shipping.
- Aset produksi = satu URL folder cloud publik `https://` dari Google Drive, Dropbox, atau OneDrive/SharePoint (validasi wizard langkah 3).
- Thumbnail produk (gambar) wajib untuk campaign baru, diunggah ke bucket `campaign-assets`; campaign legacy tanpa thumbnail tetap bisa diedit.

## 3. Platform

- Current Campaign MVP product contract: **TikTok**. Wizard selalu menulis `platforms: ["tiktok"]`.
- Platform adalah property Campaign; UI kreator mengirim platform pertama campaign saat submit, bukan selector bebas.
- `submit-campaign-proof` secara teknis menerima `tiktok | instagram` (host URL harus cocok). Multi-platform resmi harus diperkenalkan lewat Campaign contract.

## 4. Budget & Fee

- Minimum budget **Rp50.000** (`MINIMUM_CAMPAIGN_BUDGET`, wizard + `patch-campaign-draft`). Maksimum 999.999.999.
- Tarif per 1.000 views: wizard menawarkan Rp3.000 / Rp5.000 / Rp8.000 atau nominal kustom (> 0).
- Fee platform Campaign = **buyer-side UMKM** (ADR-008): `fee = floor(budget × FEE_RATE)`, `FEE_RATE` env `create-payment` (default `0.02`); UMKM membayar `budget + fee`, campaign dikredit `budget` saja.
- Pembayaran harus persis `budget` dan campaign masih `draft` (`create-payment`).
- Setelah funded (`remainingBudget > 0`): `budget`, `rewardPer1000Views`, `claimLimit`, `thumbnailUrl` terkunci (`patch-campaign-draft`).
- Creator menerima full calculated reward; tidak ada potongan fee di sisi kreator.

## 5. Claim Rules

| Aturan | Penegakan |
| ------ | --------- |
| Campaign harus `active` | Klien |
| `creator_profiles.isProfileCompleted = true` | Klien |
| Maksimal satu claim non-`expired` per Creator per Campaign | Klien (tidak ada unique index) |
| `totalClaims` tidak melewati `claimLimit` | Server: `campaign-claimed` increment atomik `max = claimLimit`; claim yang melebihi → `expired` |
| Deadline submit = `claimedAt + submissionDays` (default 7) | Server: `expire-stale-claims` tiap 6 jam |
| Slot kembali saat expired / unclaim / submission ditolak | Server: decrement atomik `min 0` |

Claim status: `claimed | submitted | approved | rejected | expired`.

- `claimed → submitted` (`submit-campaign-proof`), `submitted → approved | rejected` (`review-submission`), `claimed → expired` (cron atau kuota penuh).
- Unclaim (`unclaim-campaign`) hanya untuk `claimed`, oleh kreator aktif pemilik claim; baris **dihapus** (tidak ada status `unclaimed`).
- Claim `expired` tidak menghalangi claim ulang.

## 6. Submission Rules

Submission status: `pending | approved | rejected`.

- Creator hanya bisa submit untuk claim miliknya berstatus `claimed` (`submit-campaign-proof`).
- Satu submission per claim (unique index `claimId` + cek Function).
- Creator mengirim public post URL + optional caption/note; Creator tidak mengisi views (`views` dibuat `0`).
- Function membuat submission `pending` dan mengubah claim menjadi `submitted`; UMKM mendapat notifikasi.
- Submission hanya punya permission read untuk Creator & UMKM; tidak ada edit dari klien setelah submit.
- Batas `submissionDays` tidak dicek saat submit — claim yang lewat deadline baru dibalik oleh cron.

## 7. Validation Authority

**ADR-010:** Admin Marketiv adalah final validation authority — **sudah ditegakkan** di `review-submission` (non-Admin → 403).

Admin, melalui trusted Function:

- membuka queue submission (`get-admin-submission-queue`);
- menangkap `views` final saat approve;
- approve atau reject dengan `notes` (→ `reviewNotes`).

UMKM:

- membaca submission campaign miliknya (read-only di UI);
- tidak dapat approve/reject, menginput views, atau memicu payout.

Belum tersedia: queue Admin belum menyertakan data fraud (`fraudScore`/`fraudStatus`/`fraud_checks`).

## 8. Fraud Rules

`fraudStatus: safe | review | rejected` (ditulis `ai-fraud-precheck`; 0–30 / 31–70 / 71–100).

- Fraud precheck hanya menghasilkan metadata risiko; **tidak** mengubah `status` submission.
- `safe` tidak otomatis approved; `rejected` tidak otomatis ditolak.
- Tidak boleh ada payout hanya karena fraud score rendah — reward hanya dari `status = approved` oleh Admin.
- UI UMKM menghitung "dispute" sebagai submission dengan `fraudStatus` terisi dan ≠ `safe`.

## 9. Views Rules

- Final views ditetapkan saat Admin approve, setelah **periode observasi** `VIEW_VALIDATION_DELAY_HOURS` (default 72 jam) sejak submission dibuat.
- Views harus safe integer ≥ 0.
- Approve mengunci `views_count`, `views_captured_at`, `views_source = manual_admin`, `views_final = true`, dan menimpa legacy `views` dengan nilai yang sama.
- Label UI user-facing untuk `manual_admin`: `Diverifikasi Marketiv`.
- Legacy `views` hanya fallback bila `views_final` tidak `true`.

## 10. Reward Rules

```text
views  = views_final ? views_count : views
reward = min( floor(views × rewardPer1000Views / 1000), remainingBudget )
```

- Pembulatan dilakukan **sekali di akhir** (proporsional, bukan per seribu penuh): 999 views × Rp1.000 → Rp999.
- `reward <= 0` → tidak ada kredit maupun ledger.
- Reward diproses `calculate-campaign-reward` setelah submission `approved`, langsung ke `wallet.balance`; `pendingBalance` hanya legacy.
- Idempoten per submission via ledger `transactions` (`referenceType = campaign_submission`).
- `remainingBudget` berkurang dan `spentAmount` bertambah sebesar reward (atomik). Campaign `completed` bila sisa ≤ 0.
- Estimasi reward di UI tidak otoritatif dan saat ini memakai rumus berbeda (lihat [100_Testing.md](100_Testing.md)).

## 11. Read/Write Boundary

| Data | Klien boleh | Server (Function) |
| ---- | ----------- | ----------------- |
| `campaigns` | create draft, delete draft | semua update (draft fields, status, counter, budget) |
| brief / asset | create, update (sebelum publish), delete | ganti permission saat publish |
| `campaign_claims` | create (creator) | status, delete (unclaim) |
| `campaign_submissions` | read | create, status, views, fraud |
| `fraud_checks` | — | create/read |
| wallet / ledger reward | read own | create/credit |

Direct client write terhadap final status/views/reward dilarang.

> Gap skema: semua tabel campaign masih memberi `create("users")` di level tabel, dan Appwrite tidak membatasi isi kolom saat create. Artinya create langsung dari klien (mis. `campaign_submissions` dengan `status`/`views_*` arbitrer, atau `campaigns` dengan `status`/`remainingBudget` arbitrer) secara teknis belum diblokir server. Boundary di atas adalah kontrak yang dituju, belum sepenuhnya ditegakkan skema.
