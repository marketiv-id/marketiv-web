# Orders — Events

Automasi modul Orders berjalan event-driven & cron via Appwrite Functions. Event string memakai format TablesDB: `databases.6a4c8598001da3b0d7f0.tables.<table>.rows.*.<create|update>` (format lama `collections.*.documents.*` tidak lagi dipakai config). Event tidak membawa `$previous`, jadi setiap Function memeriksa **status akhir** baris, bukan transisi.

---

## Event yang Dikonsumsi

### Offer Updated → Order Created / Offer Rejected

- **Event**: `tables.offers.rows.*.update` → `create-order`.
- `status = accepted` → order `pending_payment` (unique `offerId`), notif UMKM `order_created`; Creator belum setuju T&C → notif UMKM `order_tos_blocked`.
- `status = rejected` → notif UMKM `offer_rejected`.
- **Link**: `../Offers/90_Events.md`.

### Payment Updated → Escrow Held

- **Event**: `tables.payments.rows.*.update` → `create-escrow` (modul Payments).
- `status = paid` & `purpose = order` → escrow `held` (snapshot `fee_rate`), ledger `payment`, order → `in_progress`, notif `escrow_held_umkm` & `escrow_held_creator`.
- **Link**: `../Payments/90_Events.md`.

### Deliverable Created → Review Timer & Notifikasi

- **Event**: `tables.deliverables.rows.*.create`.
- `track-order-review` → `review_deadline_at = $createdAt + 3 hari`, `revision → in_progress`, `revision_count`/`revision_limit` snapshot, reset `reminder_sent_at`.
- `notify-order-activity` → notif UMKM `deliverable_submitted`.

### Revision Created → Notifikasi Creator

- **Event**: `tables.revisions.rows.*.create` → `notify-order-activity` → notif Creator `revision_requested` (kutipan alasan).
- Transisi status revisi **tidak** event-driven: dilakukan sinkron oleh `request-ratecard-revision`. `sync-order-revision` retired (event dilepas, disabled).

### Deliverable Updated / Validation Created → Release Escrow

- **Event**: `tables.deliverables.rows.*.update` **dan** `tables.ratecard_deliverable_validations.rows.*.create` → `release-escrow` (modul Payments).
- Release hanya bila latest deliverable `approved` + validasi `valid` cocok + order `in_progress|revision` + escrow `held|releasing`. Hasil: order `completed`, notif `escrow_released_creator` & `escrow_released_umkm`.
- Urutan approve UMKM vs validasi Admin bebas; event kedua yang melengkapi syarat memicu release.

### Order Updated → Refund

- **Event**: `tables.orders.rows.*.update` → `refund-order`.
- Hanya bertindak bila status `cancelled|expired` dan escrow `held` → refund ke wallet UMKM, notif `refund_escrow`. Update order lain berakhir `ignored`.

---

## Cron

| Function | Schedule | Efek |
| --- | --- | --- |
| `auto-approve-orders` | `0 * * * *` (tiap jam) | Deliverable lewat tenggat → `approved` + `auto_approved = true` + notif UMKM; reminder H-1 + `reminder_sent_at` |
| `reconcile-release-escrow` | `*/15 * * * *` | Escrow `releasing` dengan ledger completed → `released` + order `completed` (modul Payments) |

---

## Event Sinkron (aksi user → Function)

| Aksi | Function | Efek data |
| --- | --- | --- |
| Creator kirim hasil kerja | `submit-ratecard-deliverable` | create `deliverables` (memicu event create di atas) |
| UMKM minta revisi | `request-ratecard-revision` | create `revisions`, update deliverable & order |
| UMKM batalkan order | `cancel-order` | order `cancelled` (memicu `refund-order`, umumnya `ignored`) |
| Admin validasi | `review-ratecard-deliverable` | create validasi + notif `ratecard_validation_*` |
| UMKM approve | Client SDK update `deliverables` | memicu `release-escrow` |

---

## Notifikasi yang Diterbitkan (tabel `notifications`)

| kind (seed ID) | Penerima | Function |
| --- | --- | --- |
| `order_created` | UMKM | `create-order` |
| `offer_rejected` | UMKM | `create-order` |
| `order_tos_blocked` | UMKM | `create-order` |
| `escrow_held_umkm` / `escrow_held_creator` | UMKM / Creator | `create-escrow` |
| `deliverable_submitted` | UMKM | `notify-order-activity` |
| `revision_requested` | Creator | `notify-order-activity` |
| `ratecard_validation_valid|invalid` (+ `_umkm`) | Creator / UMKM | `review-ratecard-deliverable` |
| `auto_approved` | UMKM | `auto-approve-orders` |
| `reminder_h1` | UMKM | `auto-approve-orders` |
| `escrow_released_creator` / `escrow_released_umkm` | Creator / UMKM | `release-escrow` |
| `refund_escrow` | UMKM | `refund-order` |

ID notifikasi deterministik `ntf` + sha256(`sourceId:kind`)[0..29]; duplikat 409 diabaikan.

> Keputusan order sebagai aggregate utama: `../../04_Decisions/ADR-003.md`.
