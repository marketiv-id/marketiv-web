# Workflow: Campaign Pay-Per-View (PPV)

> **Diverifikasi terhadap kode: 2026-10-12.** Sumber kebenaran:
> `00_BACKEND/functions/{patch-campaign-draft,create-payment,midtrans-webhook,create-escrow,cancel-payment,patch-campaign-status,campaign-published,campaign-claimed,unclaim-campaign,expire-stale-claims,submit-campaign-proof,ai-fraud-precheck,review-submission,calculate-campaign-reward,refund-order,fee-rate-flip}`,
> `src/services/umkm/umkm-appwrite.service.ts`, `src/services/creator/creator-appwrite.service.ts`,
> trigger di `00_BACKEND/appwrite.config.json`.

## Purpose

Siklus Campaign PPV: UMKM membuat dan mendanai campaign → campaign dipublikasikan → Creator klaim, produksi, dan kirim bukti tayang → precheck risiko otomatis → Admin Marketiv memvalidasi dan mengunci views → backend menghitung reward dan mengkredit `wallet.balance` Creator.

## Modules Involved

- [Campaigns](../02_Modules/Campaigns/00_Index.md) — campaign, brief/asset, claim, submission, counter.
- [Payments](../02_Modules/Payments/00_Index.md) — Midtrans top-up, ledger, wallet reward, refund sisa budget.
- [AI](../02_Modules/AI/00_Index.md) — `ai-fraud-precheck` (Gemini) sebagai risk signal.
- [Users](../02_Modules/Users/00_Index.md) — `isProfileCompleted`, status akun.
- [Notifications](../02_Modules/Notifications/00_Index.md) — notifikasi tiap tahap.

## Actors

- **UMKM** — buat draft, bayar, publish, pause/resume, memantau (read-only atas submission).
- **Creator** — klaim, produksi, publish konten, kirim bukti, batalkan klaim.
- **Admin Marketiv** — validasi submission + input views final (lewat admin app `admin/`).
- **System Functions** — fraud precheck, reward, expire claim, notifikasi.

## Trigger

UMKM menyelesaikan wizard "Buat Campaign" di dashboard UMKM.

## Data Model — Collection yang Terlibat

| Collection | Aksi | Ditulis oleh |
|---|---|---|
| `campaigns` | insert draft; update konten/status/counter | Browser (create), `patch-campaign-draft`, `patch-campaign-status`, Functions (counter) |
| `campaign_briefs_v2` (id `6ab530d00018edb50097`) / `campaign_assets` | insert/update | Browser (permission baris pemilik) |
| `payments` | insert `pending` → `paid`/`failed`/`expired`/`cancelled` | `create-payment`, `midtrans-webhook`, `cancel-payment` |
| `transactions` | ledger `payment`, `release`, `refund` | `create-escrow`, `calculate-campaign-reward`, `refund-order` |
| `campaign_claims` | insert `claimed`; update status; delete (unclaim) | Browser (create), Functions |
| `campaign_submissions` | insert `pending`; update fraud & status | `submit-campaign-proof`, `ai-fraud-precheck`, `review-submission` |
| `fraud_checks` | insert histori | `ai-fraud-precheck` |
| `wallets` | `balance += reward` | `calculate-campaign-reward` |
| `notifications` | insert | Functions |

## Step-by-step Flow

### 1. Create Draft — UMKM

1. **Campaigns** — Browser `createCampaignDraftInAppwrite()` membuat baris `campaigns` langsung: `{ umkmId, title, thumbnailUrl, category, type, platforms: ["tiktok"], description, budget, rewardPer1000Views, status: "draft", claimLimit, submissionDays (default 7), totalClaims: 0, spentAmount: 0, remainingBudget: 0 }`, permission `read`+`delete` untuk pemilik (tanpa `update`). Brief & asset dibuat terpisah dengan permission update pemilik.
2. **Campaigns** — Edit draft lewat `patch-campaign-draft` (HTTP): hanya pemilik + status `draft`; allowlist `title, category, type, platforms, description, budget, rewardPer1000Views, claimLimit, submissionDays, thumbnailUrl`. `budget` integer ≥ Rp50.000. Setelah `remainingBudget > 0` (sudah didanai), `budget`, `rewardPer1000Views`, `claimLimit`, dan `thumbnailUrl` terkunci.

### 2. Fund — UMKM ↔ Midtrans

3. **Payments** — `create-payment` `{ purpose: "campaign", campaignId, amount }`: caller aktif, pemilik campaign, status `draft`, `amount === campaign.budget`. Fee buyer-side: `fee_amount = floor(amount × FEE_RATE)` (env, default 0.02); `total_amount = amount + fee_amount`. Baris `payments` `pending` + Snap Midtrans (`gateway_reference = "cmp-<paymentId>"`, ditagih `total_amount`).
4. **Payments** — `midtrans-webhook` (HTTP publik, `execute: ["any"]`): verifikasi `signature_key` SHA-512, cocokkan `gross_amount` dengan `total_amount`, map status (`settlement`/`capture+accept` → `paid`, `expire` → `expired`, `cancel`/`refund`/`chargeback` → `cancelled`, `deny`/`failure` → `failed`). Status terminal tidak diubah lagi.
5. **Event `payments.rows.*.update`** → `create-escrow` cabang `purpose = "campaign"` (`completeTopup`):
   - Ledger deterministik `transactions` `{ type: "payment", referenceType: "payment", referenceId: paymentId, amount: budget, status: "pending" }`.
   - `campaigns.remainingBudget += payment.amount` (increment atomik TablesDB; fee **tidak** masuk budget).
   - Ledger → `completed`. Status campaign tetap `draft`.
6. Pembayaran campaign `pending` dapat dibatalkan lokal oleh pemiliknya lewat `cancel-payment` (`pending → cancelled`).

### 3. Publish — UMKM

7. **Campaigns** — `patch-campaign-status` `{ action: "publish" }`: pemilik, status `draft`, `remainingBudget ≥ budget`. Set `status: "active"`, `publishedAt`, dan permission baris campaign/brief/asset menjadi `read(any)` + `delete(pemilik)`.
8. **Event `campaigns.rows.*.update`** → `campaign-published`: bila `status = "active"`, notifikasi `campaign_published` ke kreator dengan `isProfileCompleted = true` (maksimal 100 baris pertama; id deterministik per (campaign, kreator) → satu notifikasi per kreator per campaign, publish ulang tidak menotifikasi lagi).
9. Pause/resume: `patch-campaign-status` `pause` (`active → paused`) / `resume` (`paused → active`).

### 4. Claim — Creator

10. **Campaigns** — Creator membuka Job Pool (campaign `active`, `read(any)`).
11. **Campaigns** — Browser `claimCampaignInAppwrite()` (guard klien: campaign `active`, profil kreator lengkap, `totalClaims < claimLimit`, belum punya claim non-`expired`) lalu `createDocument(campaign_claims)` `{ campaignId, creatorId, status: "claimed", claimedAt }`.
12. **Event `campaign_claims.rows.*.create`** → `campaign-claimed`: `totalClaims += 1` atomik dengan `max = claimLimit`. Bila ditolak karena kuota penuh → claim diubah `expired`. Sukses → notifikasi `claim` ke UMKM.
13. Unclaim: `unclaim-campaign` (HTTP) — kreator aktif, pemilik claim, status `claimed` → hapus baris claim, `totalClaims -= 1` atomik; bila decrement gagal, claim dipulihkan.
14. Deadline submit = `claimedAt + submissionDays` hari. Tidak ada kolom deadline tersimpan.

### 5. Produce & Submit — Creator

15. Creator memproduksi dan mempublikasikan konten secara publik.
16. **Campaigns** — `submit-campaign-proof` (HTTP) `{ claimId, campaignId, platform: tiktok|instagram, postUrl, caption? }`: akun aktif, claim milik caller berstatus `claimed`, hostname URL cocok platform, satu submission per claim. Buat `campaign_submissions` `{ claimId, campaignId, creatorId, platform, postUrl, caption, views: 0, status: "pending" }` (read: kreator + UMKM), claim → `submitted`, notifikasi `submission` ke UMKM.

### 6. Risk Precheck — System

17. **Event `campaign_submissions.rows.*.create`** → `ai-fraud-precheck`: tulis `fraudScore`/`fraudStatus` ke submission + satu baris `fraud_checks`. Tidak mengubah `submission.status`. Detail: [40_Submission_Fraud](40_Submission_Fraud.md).

### 7. Validate — Admin Marketiv

18. Admin membuka antrean `get-admin-submission-queue` (filter `pending|approved|rejected|all`).
19. Admin memanggil `review-submission` `{ submissionId, status: approved|rejected, views?, notes? }`:
    - Submission harus `pending`; caller harus Admin aktif.
    - `approved` hanya setelah periode observasi `VIEW_VALIDATION_DELAY_HOURS` (default 72 jam) sejak `$createdAt` submission; `views` integer ≥ 0 wajib.
    - Approve: `status: approved`, `views`, `views_count`, `views_captured_at`, `views_source: "manual_admin"`, `views_final: true`, `reviewNotes`; claim → `approved`.
    - Reject: `status: rejected`, `reviewNotes`; claim → `rejected`; `totalClaims -= 1` (kuota dikembalikan); notifikasi `submission_rejected` ke kreator.
20. UMKM hanya memantau; tidak ada aksi approve/reject di sisi UMKM.

### 8. Reward — Backend

21. **Event `campaign_submissions.rows.*.update`** → `calculate-campaign-reward` (hanya bila `status = "approved"`):
    - Dedup: lewati bila sudah ada `transactions` dengan `referenceId = submissionId` + `referenceType = "campaign_submission"`.
    - `views = views_final ? views_count : views`; `reward = min(floor(views / 1000 × rewardPer1000Views), remainingBudget)`; reward ≤ 0 → berhenti.
    - `wallets.balance += reward` (atomik; wallet dibuat bila belum ada).
    - Ledger `{ type: "release", referenceType: "campaign_submission", status: "matured" }`.
    - `campaigns.remainingBudget -= reward` (min 0) dan `spentAmount += reward` (atomik).
    - Bila `remainingBudget ≤ 0` setelah dibaca ulang → `campaigns.status = "completed"`.
    - Notifikasi `reward` ke kreator. Reward Campaign **tanpa** potongan fee seller-side.

### 9. Expire & Refund Sisa Budget

22. **Cron `0 */6 * * *`** → `expire-stale-claims`: claim `claimed` yang lewat `claimedAt + submissionDays` → `expired`, `totalClaims -= 1`, notifikasi `claim_expired` ke kreator.
23. Refund sisa budget ke wallet UMKM: `refund-order` `{ campaignId }` untuk campaign `cancelled|completed` dengan `remainingBudget > 0` — **hanya manual** (Function `execute: []`, dipanggil Admin/Console). Tidak ada aksi user untuk membatalkan campaign (`patch-campaign-status` tidak punya `cancel`).

## State Transitions

```text
CAMPAIGN:   draft ──(paid, remainingBudget ≥ budget, publish)──→ active ⇄ paused
            active ──(remainingBudget ≤ 0 setelah reward)──→ completed
            cancelled: tidak ada penulis di kode (hanya dikenali refund-order)
PAYMENT:    pending → paid | failed | expired | cancelled
CLAIM:      claimed → submitted → approved | rejected
            claimed → expired (kuota penuh di campaign-claimed / lewat deadline)
            claimed → (dihapus) via unclaim-campaign
SUBMISSION: pending → approved | rejected
FRAUD:      safe | review | rejected   (dimensi risiko terpisah)
```

## Events / Functions

| Trigger | Function | Aksi |
|---|---|---|
| HTTP (UMKM) | `patch-campaign-draft` | Edit draft (allowlist non-finansial) |
| HTTP (UMKM) | `create-payment` | Payment `pending` + Snap (budget + fee) |
| HTTP publik | `midtrans-webhook` | Update `payments.status` |
| `payments.rows.*.update` | `create-escrow` | Top-up `remainingBudget` |
| HTTP (UMKM) | `cancel-payment` | Batalkan payment campaign `pending` |
| HTTP (UMKM) | `patch-campaign-status` | `publish` / `pause` / `resume` |
| `campaigns.rows.*.update` | `campaign-published` | Notifikasi kreator saat `active` |
| `campaign_claims.rows.*.create` | `campaign-claimed` | `totalClaims++` (max `claimLimit`), notif UMKM |
| HTTP (Creator) | `unclaim-campaign` | Hapus claim + `totalClaims--` |
| HTTP (Creator) | `submit-campaign-proof` | Buat submission `pending` |
| `campaign_submissions.rows.*.create` | `ai-fraud-precheck` | Risk metadata |
| HTTP (Admin) | `get-admin-submission-queue`, `review-submission` | Antrean & keputusan final |
| `campaign_submissions.rows.*.update` | `calculate-campaign-reward` | Reward ke wallet |
| Cron `0 */6 * * *` | `expire-stale-claims` | Expire claim lewat deadline |
| Manual (`execute: []`) | `refund-order` `{ campaignId }` | Refund sisa budget ke UMKM |

- Lihat: [Campaigns/90_Events](../02_Modules/Campaigns/90_Events.md), [Payments/90_Events](../02_Modules/Payments/90_Events.md).

## Validation Rules per Langkah

| Langkah | Validasi | Gagal → |
|---|---|---|
| Edit draft | Pemilik + `draft`; `budget` ≥ 50.000; field finansial terkunci setelah didanai | 404 / 400 |
| Payment | Akun aktif; pemilik; `draft`; `amount === budget` | 403 / 409 |
| Webhook | Signature valid; `gross_amount === total_amount` | 401 / 409 |
| Publish | `draft` + `remainingBudget ≥ budget` | 409 |
| Claim (klien) | Campaign `active`; profil lengkap; kuota; tanpa claim aktif ganda | Error validasi |
| Claim (server) | `totalClaims + 1 ≤ claimLimit` | Claim → `expired` |
| Submit | Akun aktif; claim `claimed` milik caller; URL cocok platform; 1 submission/claim | 400 / 403 / 404 / 409 |
| Review | Admin aktif; submission `pending`; approve setelah 72 jam observasi | 403 / 409 |
| Reward | Status `approved`; belum ada ledger reward; `reward > 0` | No-op |

## Notifikasi

| Titik | Kind | Penerima | Ditulis oleh |
|---|---|---|---|
| Campaign `active` | `campaign_published` | Kreator profil lengkap (≤100) | `campaign-published` |
| Claim sukses | `claim` | UMKM | `campaign-claimed` |
| Bukti dikirim | `submission` | UMKM | `submit-campaign-proof` |
| Submission ditolak | `submission_rejected` | Kreator | `review-submission` |
| Reward masuk | `reward` | Kreator | `calculate-campaign-reward` |
| Claim expired | `claim_expired` | Kreator | `expire-stale-claims` |
| Sisa budget dikembalikan | `refund_campaign` | UMKM | `refund-order` (manual) |
| Submission di-approve (tanpa reward) | **Belum diimplementasikan** — hanya notifikasi `reward` saat reward > 0 | — | — |

## Important Invariants

- UMKM tidak approve/reject submission; Creator tidak menentukan views final.
- Fraud precheck tidak pernah memicu payout.
- Reward dihitung dari views terkunci (`views_final`/`views_count`) dan dibatasi `remainingBudget`.
- Fee Campaign buyer-side (dibayar UMKM di atas budget); reward Creator tanpa potongan.
- Mutasi counter keuangan (`remainingBudget`, `spentAmount`, `totalClaims`, `wallets.balance`) memakai increment/decrement atomik TablesDB.

## Edge Cases

- Kuota balapan: antara create claim (browser) dan `campaign-claimed` ada jeda; claim ke-(N+1) bisa sempat tercipta lalu dibalik ke `expired`.
- Submit setelah deadline tetapi sebelum cron 6-jam berikutnya masih diterima — `submit-campaign-proof` tidak memeriksa deadline maupun status campaign.
- Fraud precheck gagal/timeout → submission tetap `pending`, Admin tetap bisa memutus.
- Reward terpotong ke `remainingBudget`; campaign otomatis `completed` saat budget habis, sementara claim lain yang masih berjalan tidak dibatalkan otomatis.
- Approve dengan views 0 atau budget habis → tidak ada reward dan tidak ada notifikasi.
- Pembayaran campaign gagal setelah Snap dibuat → payment ditandai `failed`; UMKM membuat payment baru.

## Links

- [Campaigns](../02_Modules/Campaigns/00_Index.md)
- [Payments](../02_Modules/Payments/00_Index.md)
- [Submission Fraud workflow](40_Submission_Fraud.md)
- [Withdrawal workflow](50_Withdrawal.md)
- [ADR-008](../04_Decisions/ADR-008.md), [ADR-009](../04_Decisions/ADR-009.md), [ADR-010](../04_Decisions/ADR-010.md)
