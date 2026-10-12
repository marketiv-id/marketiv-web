# Campaigns — Views Tracking & Validation

> **Product decision:** final Campaign views are captured/locked by Admin Marketiv during submission validation (**ADR-010**).
> **Backend status:** diimplementasikan — `review-submission` hanya menerima Admin aktif dan mengunci views; `calculate-campaign-reward` memakai locked views (T-04, 2026-08-05).

## 1. MVP Model

```text
Creator publishes content
↓
Creator submits public post URL (submit-campaign-proof) — views = 0
↓
Submission = pending
↓
ai-fraud-precheck writes risk metadata (fraudScore / fraudStatus / fraud_checks)
↓
Admin Marketiv opens review queue (get-admin-submission-queue)
↓
Observation window: VIEW_VALIDATION_DELAY_HOURS (default 72 h) since submission $createdAt
↓
Admin captures final views and approves, or rejects (review-submission)
↓ approved
calculate-campaign-reward pays using locked views
```

UMKM can monitor results but does not capture views. Creator never inputs views.

## 2. Locked View Fields

| Field | Meaning | Status |
|---|---|---|
| `views_count` | final views used for reward | implemented (written on approve) |
| `views_captured_at` | capture timestamp (server time at approve) | implemented |
| `views_source` | enum `api \| scrape \| manual_admin`; runtime writes only `manual_admin` | implemented (`api`/`scrape` belum diimplementasikan) |
| `views_final` | lock indicator, default `false` | implemented |
| `views` (legacy) | written `0` on submit; overwritten with the same final value on approve | compatibility |

Reward (`calculate-campaign-reward`), Admin queue (`get-admin-submission-queue`), UMKM mapper (`umkm-appwrite.service.ts`) and Creator mapper (`creator-appwrite.service.ts`) all prefer `views_count` when `views_final = true`, otherwise `views`.

## 3. Validation Rules (implemented in `review-submission`)

- Caller must be active Admin (`users.role = admin` or Auth label/pref `admin`), else 403.
- Submission must still be `pending`, else 409.
- Approve requires `views` = safe integer ≥ 0, else 400.
- Approve is rejected with 409 + `eligibleAt` until the observation window has passed. Window is configurable via env `VIEW_VALIDATION_DELAY_HOURS` (invalid/empty → 72; `0` disables the wait).
- Final views are written in the same `updateDocument` as `status: approved`, so the reward event sees them.
- Creator and UMKM have no update permission on submission rows (read-only).
- `fraudStatus` remains separate supporting metadata; it is not checked by `review-submission`.
- No UI may claim automatic TikTok/Instagram views sync — none is deployed.

## 4. Reward Formula (as implemented)

```text
views  = views_final ? views_count : views
reward = min( floor(views × rewardPer1000Views / 1000), remainingBudget )
```

- Rounding happens once at the end, so partial thousands are paid proportionally (999 views × Rp1.000 → Rp999). Test: `tests/integration/functions.test.ts` "calculates Rp0 when locked views is under 1000" (nama test menyesatkan; ekspektasinya `999`).
- `reward <= 0` → no credit, no ledger.
- Campaign platform fee is buyer-side UMKM (ADR-008); no deduction from Creator reward.
- UI estimates are non-authoritative and currently inconsistent with the backend: UMKM mapper, Admin queue DTO, and Admin app preview (`admin/src/features/admin/submissions/utils.ts`, returns 0 under 1.000 views) use `floor(views / 1000) × rate`; Creator detail uses `rate × views / 1000` without floor/cap. None apply the `remainingBudget` cap.

## 5. Creator UI (implemented)

- Before submit: platform from Campaign (read-only), public URL input, optional note, confirmation; no file upload; no views input.
- Pending: status `Menunggu Validasi`, views not yet verified, reward `Belum dihitung`.
- Approved: locked views shown when `views_final`; earnings estimate shown.
- Rejected: `reviewNotes` shown as rejection reason.

## 6. UMKM UI (implemented)

UMKM sees post URL, validation status, views (`Belum diverifikasi` while pending), reward (`Belum dihitung` while pending), rejection reason. No editable views, no approve/reject controls (`SubmissionDetailModal`, `CampaignSubmissionSection`).

## 7. Admin UI

Admin UI lives in the separate app `admin/` in this monorepo (`admin/src/app/submissions`, `admin/src/features/admin/submissions/`): queue table, review dialog with observation-window countdown (`NEXT_PUBLIC_VIEW_VALIDATION_DELAY_HOURS`, default 72), approve dialog (verified views input + non-authoritative reward preview), reject dialog (reason required in UI only). Backend data available from `get-admin-submission-queue`: Creator identity, Campaign + UMKM context, post URL, note, submission timestamp, status, verified views/time/source, estimated reward, rejection reason.

Belum diimplementasikan di queue: fraud/risk metadata (`fraudScore`, `fraudStatus`, `fraud_checks`), pagination beyond 100 items.

## 8. Audit

Implemented trail: `views_count`, `views_captured_at`, `views_source`, `views_final`, `reviewNotes`, claim status sync, Function log line (`Submission <id> di-<status> oleh <adminId>`).

Belum diimplementasikan: dedicated audit record storing actor Admin ID, before/after status, and decision timestamp (T-04 explicitly did not add an audit collection; the reviewer ID is only in Function logs).

## 9. Future Automatic Views

Belum diimplementasikan. `views_source` already reserves `api` and `scrape`. If introduced:

- source metadata must distinguish API/scrape vs manual Admin;
- authorization and reward invariants remain server-side;
- UI may only say `otomatis` when the production capability is enabled;
- historical manual validation remains auditable.

Roadmap/milestone decisions belong to the project roadmap/ADR when approved.
