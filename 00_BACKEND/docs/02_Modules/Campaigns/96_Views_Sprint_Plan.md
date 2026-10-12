# Campaign Views Sprint Plan — Superseded

**Status:** Superseded on 2026-08-14. Status implementasi diperbarui terhadap kode (audit 2026-10-12).

Rencana lama di file ini berbasis konsep lama: UMKM memverifikasi views kreator dan approve/reject submission. Model otoritas itu diganti oleh:

- `04_Decisions/ADR-010.md`

> Spec `.kiro/specs/campaign-submission-admin-authority-ui/` yang dulu dirujuk di sini **tidak ada** di repository.

Aturan berlaku:

```text
Creator submits → Admin Marketiv validates/locks views → UMKM observes → backend calculates reward
```

Detail kontrak: [95_Views_Tracking.md](95_Views_Tracking.md).

## Status Implementasi

| Item | Status | Bukti kode |
| ---- | ------ | ---------- |
| Kolom locked views (`views_count`, `views_captured_at`, `views_source`, `views_final`) | Selesai | `appwrite.config.json` → `campaign_submissions` |
| Reward memakai locked views | Selesai | `functions/calculate-campaign-reward/src/main.js` |
| `review-submission` hanya Admin aktif | Selesai | `functions/review-submission/src/main.js` |
| Periode observasi 72 jam sebelum approve | Selesai | `functions/review-submission/src/observation-window.js` (env `VIEW_VALIDATION_DELAY_HOURS`) |
| Reject mengembalikan kuota + notifikasi kreator | Selesai | `review-submission` (decrement `totalClaims`, notifikasi `submission_rejected`) |
| Queue submission untuk Admin | Selesai | `functions/get-admin-submission-queue/src/main.js` |
| Submit bukti kreator tanpa input views | Selesai | `functions/submit-campaign-proof/src/main.js` (`views: 0`) |
| UI UMKM read-only (tanpa approve/reject/input views) | Selesai | `SubmissionDetailModal`, `CampaignSubmissionSection` |
| UI Admin review | Selesai | `admin/src/features/admin/submissions/` (app `admin/`) |
| Data fraud di queue Admin | Belum diimplementasikan | queue tidak membaca `fraudScore`/`fraudStatus`/`fraud_checks` |
| Record audit khusus (actor, before/after, timestamp) | Belum diimplementasikan | hanya kolom `views_*`, `reviewNotes`, log Function |
| Views otomatis (`api` / `scrape`) | Belum diimplementasikan | hanya nilai enum yang dicadangkan |
| Rumus estimasi reward UI selaras backend | Belum | UMKM/Admin pakai `floor(views/1000)×rate`, backend `floor(views×rate/1000)` |

Jangan mengeksekusi task lama "UMKM review modal" dari Git history. Git menyimpan rencana historis; file ini hanya menyimpan arah aktif terbaru.
