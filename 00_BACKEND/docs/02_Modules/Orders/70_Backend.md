# Orders — Backend

Detail Appwrite Functions & aturan backend modul Orders. Kontrak pemanggilan (payload/response/error) ada di [60_API.md](60_API.md). Config kanonik: `appwrite.config.json` (`appwrite.json` stale). Semua Function: runtime `node-22`, `node-appwrite ^14.1.0`, entrypoint `src/main.js`, deploy root `functions/<id>/`.

## Ringkasan Function

| Function | Trigger | execute | Scopes | Timeout | Status |
| --- | --- | --- | --- | --- | --- |
| `create-order` | event `tables.offers.rows.*.update` | `[]` | documents.read/write | 15s | enabled |
| `cancel-order` | sinkron POST | `users` | documents.read/write | 15s | enabled |
| `submit-ratecard-deliverable` | sinkron POST | `users` | documents.read/write | 15s | enabled |
| `request-ratecard-revision` | sinkron POST | `users` | documents.read/write | 15s | enabled |
| `get-umkm-ratecard-reviews` | sinkron GET/POST | `users` | documents.read | 15s | enabled |
| `get-admin-ratecard-deliverable-queue` | sinkron GET/POST | `users` | documents.read | 30s | enabled |
| `review-ratecard-deliverable` | sinkron POST | `users` | documents.read/write | 30s | enabled |
| `track-order-review` | event `tables.deliverables.rows.*.create` | `[]` | documents.read/write | 15s | enabled |
| `auto-approve-orders` | cron `0 * * * *` | `[]` | documents.read/write | 15s | enabled |
| `notify-order-activity` | event `tables.deliverables.rows.*.create` + `tables.revisions.rows.*.create` | `[]` | documents.read/write | 15s | enabled |
| `refund-order` | event `tables.orders.rows.*.update` + manual server | `[]` | documents.read/write | 15s | enabled |
| `sync-order-revision` | — (retired) | `[]` | documents.read/write | 15s | **disabled** |

Prefix event lengkap: `databases.6a4c8598001da3b0d7f0.tables.<table>.rows.*.<create|update>`. Function Payments yang menyentuh order: `create-escrow`, `release-escrow`, `reconcile-release-escrow` (lihat `../Payments/70_Backend.md`).

## create-order

- Parse payload offer; tanpa `$id` → 400.
- `status === "rejected"` → notifikasi UMKM `offer_rejected`, tanpa order. (Blok cek akun suspended — notif `order_blocked_umkm_suspended`/`order_blocked_creator_suspended` — secara struktur berada di cabang ini, jadi tidak berlaku untuk offer accepted.)
- `status !== "accepted"` → ignored.
- Cek T&C Creator (`tos_version === CURRENT_TOS_VERSION`, default `v3.1`, dan `tos_accepted_at`); gagal → notif UMKM `order_tos_blocked`, return `blocked`.
- Create order `ID.unique()` dengan permission `read` UMKM + Creator. Konflik unique `idx_offerId` → `already_exists`.
- Notif UMKM `order_created` ("Penawaran Diterima").
- Env: `ORDERS_COLLECTION_ID`/`NEXT_PUBLIC_ORDER_COLLECTION`, `NOTIFICATIONS_COLLECTION_ID`, `USERS_COLLECTION_ID`, `CURRENT_TOS_VERSION`.

## cancel-order

- Urutan guard: method → caller → `orderId` → load order (404) → profil `users` caller harus `role = umkm` & `status = active` → `order.umkmId === caller` → `cancelled` idempoten → hanya `pending_payment`.
- Update `status: "cancelled"` saja.
- Env: `ORDERS_COLLECTION_ID`, `USERS_COLLECTION_ID`.

## submit-ratecard-deliverable

- Authorization: caller dari `x-appwrite-user-id`, harus = `orders.creatorId`. Participant ID order harus valid (regex ID Appwrite) atau 500.
- State: order `in_progress|revision`. Status latest deliverable tidak diperiksa.
- Validasi input & berkas `storage` (`user_files.userId === caller`, `status = active`, `$permissions` memuat `read("user:<umkmId>")`).
- Versi: `listDocuments(orderId, orderDesc(version), limit 1)` → `version + 1`; versi tidak valid → 409.
- ID deterministik `dlv` + sha256(`orderId:version`)[0..29] → race versi jadi 409.
- Permission baris: `read` Creator, `read` + `update` UMKM.
- Handler dapat di-inject (`createSubmitRatecardDeliverableHandler`) untuk unit test.
- Env: `ORDERS_COLLECTION_ID`/`NEXT_PUBLIC_ORDER_COLLECTION`, `DELIVERABLES_COLLECTION_ID`, `USER_FILES_COLLECTION_ID`.

## request-ratecard-revision

- Authorization: profil `users` caller wajib ada (404), aktif (403), `role = umkm` (403); `order.umkmId === caller` (else 404 anti-enumeration).
- Lookup row deterministik `rev` + sha256(`orderId:latestDeliverableId`) **sebelum** guard status/limit:
  - Row ada & cocok → lanjutkan side effect yang hilang (recovery), tanpa cek limit.
  - Row belum ada → latest wajib `submitted`, hitung `total` baris revisions order, resolve limit (`revision_limit` > 0 → offer/paket `revisionLimit` → default 3), create row; konflik 409 dibaca ulang sebagai concurrent winner.
- Side effect: latest `submitted → revision_requested` (skip bila sudah), order `status: revision`, `review_deadline_at: null`, `reminder_sent_at: null`.
- Atomicity: `node-appwrite` 14.x tidak punya transaksi untuk document API; memakai deterministic idempotent recovery.
- Invariant: tidak menulis `revision_count`, validasi, escrow, wallet, payment.
- Env: `USERS_COLLECTION_ID`, `ORDERS_COLLECTION_ID`, `DELIVERABLES_COLLECTION_ID`, `REVISIONS_COLLECTION_ID`, `OFFERS_COLLECTION_ID`, `RATE_CARD_PACKAGES_COLLECTION_ID`.

## review-ratecard-deliverable

- Admin aktif: baris `users` `role = admin` dan status kosong/`active`; fallback Auth `Users.get` (label `admin` atau `prefs.role = admin`, `status !== false`).
- Guard: order Rate Card (`offerId`/`packageId`), order `in_progress|revision`, deliverable `submitted` & latest, belum ada validasi.
- Create validasi `ID.unique()` tanpa row permission; unique `idx_deliverableId` menahan race (409).
- Notifikasi deterministik: Creator `ratecard_validation_<decision>`, UMKM `ratecard_validation_<decision>_umkm` (type `order`).
- Env: `USERS_COLLECTION_ID`, `ORDERS_COLLECTION_ID`, `DELIVERABLES_COLLECTION_ID`, `RATECARD_DELIVERABLE_VALIDATIONS_COLLECTION_ID`, `NOTIFICATIONS_COLLECTION_ID`.

## get-admin-ratecard-deliverable-queue

- Guard Admin sama dengan di atas.
- Scan 100 deliverable `submitted` terbaru (`$createdAt` desc) lalu filter: belum divalidasi, order `in_progress|revision`, latest. Antrian > 100 deliverable submitted bisa terpotong.
- Env: + `CREATOR_PROFILES_COLLECTION_ID`, `UMKM_PROFILES_COLLECTION_ID`.

## get-umkm-ratecard-reviews

- Ownership di query awal (`Query.equal("umkmId", caller)`); tidak memeriksa role caller.
- Hanya order Rate Card (`offerId`/`packageId`). Join batch per collection (chunk 100, maks 5000 dokumen).
- Validasi dipetakan dari latest deliverable saja; baris validasi terbaru per deliverable dipakai.
- Env: `ORDERS_COLLECTION_ID`, `OFFERS_COLLECTION_ID`, `CONVERSATIONS_COLLECTION_ID`, `CREATOR_PROFILES_COLLECTION_ID`, `RATE_CARD_PACKAGES_COLLECTION_ID`, `ESCROWS_COLLECTION_ID`, `DELIVERABLES_COLLECTION_ID`, `RATECARD_DELIVERABLE_VALIDATIONS_COLLECTION_ID`, `REVISIONS_COLLECTION_ID`.

## track-order-review

- Payload = baris deliverable baru. Tanpa `$id` → 400; tanpa `orderId` → ignored.
- Order bukan `in_progress|revision` → ignored. Latest deliverable bukan `submitted` (mis. revisi sinkron sudah menandai `revision_requested`) → ignored, mencegah event telat menimpa state/timer.
- Guard idempoten: `review_deadline_at` terisi dan `version ≤ revision_count + 1` → ignored.
- Update order: `status` (`revision → in_progress`), `review_deadline_at = $createdAt + 3 hari`, `revision_count = max(existing, version − 1)`, `revision_limit` (order → offer → paket, fallback 0), `reminder_sent_at = null`.
- Collection ID `orders`/`offers`/`rate_card_packages` hard-coded; database fallback hard-coded `6a4c8598001da3b0d7f0`. Env: `DELIVERABLES_COLLECTION_ID`.

## auto-approve-orders

- Bagian 1 (auto-approve): list ≤ 100 deliverable `status ∈ {submitted, delivered}`; untuk order `in_progress|revision` dengan `now ≥ review_deadline_at` → deliverable `approved`, order `auto_approved: true`, notifikasi UMKM (ID `ntf` + sha256(`orderId:auto_approved`)).
- Bagian 2 (reminder H-1): list ≤ 100 order `in_progress|revision`, `review_deadline_at` tidak null & ≤ now + 24 jam, `reminder_sent_at` null → set `reminder_sent_at = now`, notifikasi UMKM (ID `ntf` + sha256(`orderId:reminder_h1`)).
- Tidak memanggil release langsung; release lewat event `deliverables.rows.*.update` → `release-escrow` (tetap butuh validasi `valid`).
- Tidak memeriksa validasi Admin maupun apakah deliverable adalah latest.
- Collection ID hard-coded (`orders`, `deliverables`, `notifications`).

## notify-order-activity

- Payload dibedakan dari bentuk baris (bukan header event): ada `version` → deliverable; ada `requestedBy` → revision.
- Deliverable → UMKM `deliverable_submitted` ("Hasil Kerja Masuk", versi N). Revision → Creator `revision_requested` (kutipan `message`, dipotong 900 karakter).
- Notifikasi ID deterministik `ntf` + sha256(`rowId:kind`); 409 diabaikan.
- Env: `ORDERS_COLLECTION_ID`/`NEXT_PUBLIC_ORDER_COLLECTION`, `NOTIFICATIONS_COLLECTION_ID`.

## refund-order (bagian order)

- Payload event (punya `$id` + `status`, tanpa `orderId`/`campaignId`): hanya `cancelled|expired`; `oldStatus` sama → ignored.
- Manual `{ orderId }`: order wajib `cancelled|expired` (selain itu 409).
- Escrow order harus `held`; flip escrow → `refunded` dulu, ledger `refund` deterministik (`tx` + sha256(`escrowId:refund`)), kredit atomik `wallets.balance` UMKM, ledger `completed`, notif `refund_escrow`.
- Logika identik `refund-escrow` (modul Payments). Env: `WALLETS_/TRANSACTIONS_/ESCROWS_/ORDERS_/CAMPAIGNS_/NOTIFICATIONS_COLLECTION_ID`.

## sync-order-revision (retired)

- Event `revisions.rows.*.create` dilepas, Function disabled; source dipertahankan untuk audit. Bukan writer transisi revisi — `request-ratecard-revision` satu-satunya writer.

## Aturan Backend

- Semua mutasi order dari server (API key); browser hanya membaca (row read) dan meng-update `deliverables.status` (UMKM).
- Deliverable version auto-increment per submit, ID deterministik per versi.
- Revisi baru hanya jika total baris revisions < limit dan latest `submitted`; retry row yang cocok boleh berjalan saat latest sudah `revision_requested`.
- Release escrow butuh approve + validasi Admin `valid` yang snapshot-nya cocok.
- Notifikasi selalu ID deterministik dan tidak pernah menggagalkan operasi utama.
- `creatorCredit` & `aiGenerated` belum diisi oleh Function mana pun.
