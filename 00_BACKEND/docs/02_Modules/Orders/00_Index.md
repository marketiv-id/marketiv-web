# Modul Orders

Order adalah aggregate utama alur Rate Card: terbentuk **hanya** dari custom offer yang di-accept Creator (Function `create-order`), lalu mengendalikan escrow, deliverable, validasi Admin, revisi, auto-approve, dan completion. Modul ini memiliki data `orders`, `deliverables`, `revisions`, dan `ratecard_deliverable_validations`.

> Direct Order langsung dari paket rate card (Jalur A) **belum diimplementasikan** — `packageId` di order hanya provenance yang disalin dari offer.

## Daftar Dokumen

- `10_Overview.md` — Order sebagai pusat alur Rate Card, aktor, dan batas tanggung jawab.
- `20_Concepts.md` — Istilah & konsep domain Orders (order, deliverable, validasi Admin, revisi, review window).
- `30_Business_Rules.md` — Status machine order/deliverable/revisi, batas revisi, validasi Admin, auto-approve, cancel & refund.
- `40_User_Flow.md` — Alur order dari offer accepted hingga completion, termasuk validasi Admin.
- `50_Database.md` — Skema, index, dan permission `orders`, `deliverables`, `revisions`, `ratecard_deliverable_validations`.
- `60_API.md` — Kontrak service frontend & Appwrite Functions (payload, response, error).
- `70_Backend.md` — Detail implementasi Functions, trigger, scope, env, idempotensi.
- `80_Frontend.md` — Route & komponen order/deliverable/review (UMKM, Creator, Admin).
- `90_Events.md` — Event & cron yang memicu Functions modul Orders + notifikasi.
- `100_Testing.md` — Skenario uji per Function & status flow, plus cakupan test yang ada.
