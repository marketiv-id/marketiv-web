# Campaigns — Events

Automasi modul Campaigns berjalan event-driven via Appwrite Functions (database event → function → update + notifikasi) ditambah satu cron. Event memakai prefix TablesDB `databases.6a4c8598001da3b0d7f0.tables.<tabel>.rows.*.<aksi>` (lihat `00_BACKEND/appwrite.config.json`). Aksi HTTP yang memicu event ada di [60_API.md](60_API.md).

---

## Campaign Top-Up (Funding)

- **Trigger**: `payments.rows.*.update` dengan `status = paid`, `purpose = campaign` (status `paid` ditulis `midtrans-webhook`).
- **Function**: `create-escrow` (modul Payments).
- **Aksi**: ledger `payment` deterministik (pending → completed), lalu `campaigns.remainingBudget += payment.amount` (atomik). Tidak ada flag `funded`; kesiapan publish dinilai `patch-campaign-status` dari `remainingBudget >= budget`.
- **Link**: `../Payments/`, `../../03_Workflows/20_Campaign_PPV.md`.

## Campaign Published

- **Trigger**: setiap `campaigns.rows.*.update`; Function hanya bertindak bila `status = active` (biasanya setelah `patch-campaign-status` action `publish`/`resume`).
- **Function**: `campaign-published`.
- **Aksi**: notifikasi `campaign_published` ke ≤100 kreator dengan profil lengkap; id notifikasi deterministik per (campaign, kreator) sehingga update berikutnya tidak menotifikasi ulang. Campaign `active` otomatis tampil di Job Pool (query klien).
- **Link**: notifikasi → `../Notifications/`.

## Campaign Claimed

- **Trigger**: `campaign_claims.rows.*.create` (klien membuat claim).
- **Function**: `campaign-claimed`.
- **Aksi**: increment atomik `totalClaims` dengan `max = claimLimit`. Sukses → notifikasi UMKM `claim`. Kuota penuh → claim diubah `expired`.
- **Link**: notifikasi → `../Notifications/`.

## Submission Created

- **Trigger**: `campaign_submissions.rows.*.create` (baris dibuat `submit-campaign-proof`).
- **Function**: `ai-fraud-precheck`.
- **Aksi**: hitung skor risiko → update `fraudScore`/`fraudStatus` pada submission + tulis `fraud_checks`.
- **Threshold**: 0–30 `safe` · 31–70 `review` · 71–100 `rejected`. Hasil ini **metadata pendukung**; status submission tetap `pending` sampai Admin memutuskan (tidak ada auto-approve/auto-reject).
- **Link**: kontrak fungsi fraud → `../AI/60_API.md`; aturan validasi → `../AI/30_Business_Rules.md`.

## Submission Updated → Reward

- **Trigger**: setiap `campaign_submissions.rows.*.update`; Function hanya bertindak bila `status = approved` dan belum ada ledger `campaign_submission` untuk submission tersebut. Status `approved` ditulis `review-submission` (Admin).
- **Function**: `calculate-campaign-reward`.
- **Aksi**: `reward = min(floor(views × rewardPer1000Views / 1000), remainingBudget)` dengan `views = views_count` bila `views_final`; kredit **`wallets.balance`** (available) kreator, ledger `release` berstatus `matured`, kurangi `remainingBudget`, tambah `spentAmount`, set campaign `completed` bila sisa budget ≤ 0, notifikasi `reward`.
- **Link**: detail wallet & transaksi → `../Payments/`.

## Claim Expired

- **Trigger**: schedule `0 */6 * * *` (tiap 6 jam).
- **Function**: `expire-stale-claims`.
- **Aksi**: claim `status = claimed` yang melewati `claimedAt + submissionDays` → `expired`, decrement atomik `campaigns.totalClaims`, notifikasi kreator `claim_expired`.
- **Link**: `../../03_Workflows/20_Campaign_PPV.md`.

## Aksi Non-Event yang Relevan

- **Unclaim** (`unclaim-campaign`, HTTP): hard delete claim + decrement `totalClaims`. Menghapus baris tidak memicu Function lain.
- **Reject submission** (`review-submission`, HTTP): decrement `totalClaims` + notifikasi `submission_rejected`. Update submission tetap memicu `calculate-campaign-reward`, yang keluar karena status bukan `approved`.
