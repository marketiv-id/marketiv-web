# Modul Campaigns

Alur Pay-Per-View (PPV): UMKM membuat draft campaign + brief + tautan aset, mendanai lewat Midtrans, lalu mempublikasikan; creator melakukan claim dan mengirim bukti konten; fraud precheck menulis metadata risiko; Admin Marketiv memvalidasi submission dan mengunci views; reward dihitung otomatis dari views × CPM dan masuk saldo tersedia creator. Modul ini memiliki seluruh data flow campaign termasuk claim, submission, dan hasil fraud.

## Daftar Dokumen

- `10_Overview.md` — Gambaran alur PPV end-to-end, aktor, koleksi yang dimiliki.
- `20_Concepts.md` — Istilah & state machine campaign, claim, submission, fraud.
- `30_Business_Rules.md` — Status & transisi, budget/fee, aturan claim, submission, otoritas validasi (ADR-010), views, rumus reward, read/write boundary — beserta titik penegakannya.
- `40_User_Flow.md` — Alur UMKM, Creator, Admin Marketiv, dan backend.
- `50_Database.md` — Skema, index, dan permission `campaigns`, `campaign_assets`, `campaign_briefs` / `6ab530d00018edb50097` (`campaign_briefs_v2`, runtime), `campaign_claims`, `campaign_submissions`, `fraud_checks`; bucket `campaign-assets` & `fraud-evidence`.
- `60_API.md` — Kontrak service frontend, Appwrite Function HTTP (`patch-campaign-draft`, `patch-campaign-status`, `submit-campaign-proof`, `unclaim-campaign`, `review-submission`, `get-admin-submission-queue`), dan catatan service legacy.
- `70_Backend.md` — Seluruh Appwrite Function campaign (trigger, scope, env, side effect) dan aturan backend.
- `80_Frontend.md` — Halaman & komponen campaign UMKM dan Creator.
- `85_Asset_Tutorial.md` — Panduan UMKM membagikan folder aset (Drive/Dropbox/OneDrive).
- `90_Events.md` — Event-driven flow (top-up, publish, claim, submission, reward, expire) dan tautan ke modul AI, Payments & Notifications.
- `95_Views_Tracking.md` — Kontrak locked views, periode observasi, dan status implementasi.
- `96_Views_Sprint_Plan.md` — Rencana lama (superseded) + tabel status implementasi terbaru.
- `100_Testing.md` — Test yang ada (service legacy, Function, frontend) dan gap cakupan.
