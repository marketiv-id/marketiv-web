# Orders — Testing

Lokasi test:

- Unit Function (node:test): `functions/submit-ratecard-deliverable/src/main.test.js`, `functions/request-ratecard-revision/src/main.test.js`, `functions/get-umkm-ratecard-reviews/src/main.test.js`.
- Integrasi (vitest, store mock): `tests/integration/functions.test.ts` (create-order, cancel-order, track-order-review, sync-order-revision (legacy), create-escrow, release-escrow, review-ratecard-deliverable, reconcile-release-escrow, refund-order, payment idempotency).
- Config: `tests/integration/function-inventory.test.ts` (registrasi Function, scopes, `$permissions: []` untuk `deliverables`/`revisions`).
- Frontend: `src/services/shared/__tests__/deliverable-appwrite.service.test.ts`, `src/lib/negotiation/__tests__/ratecard-review-state.test.ts`, `src/services/umkm/__tests__/ratecard-review.service.test.ts`, `src/components/features/umkm-dashboard/ratecard-review/__tests__/`.

> Test "Auto-approve Review Rate Card" di `functions.test.ts` masih placeholder (`expect(true)`); `auto-approve-orders` **belum** punya test nyata.

## create-order

- Offer `accepted` → satu order `pending_payment`, `amount = offer.price`, read UMKM + Creator, notif `order_created`.
- Event ulang offer accepted → unique `idx_offerId` → `already_exists`, tetap satu order.
- Offer `rejected` → tanpa order, notif `offer_rejected`.
- Creator belum setuju T&C terbaru → `blocked`, notif `order_tos_blocked`.
- Offer dengan `packageId` → order membawa `packageId` + snapshot.

## cancel-order

- Non-UMKM / UMKM non-active → 403, order tidak berubah.
- UMKM lain → 403.
- Owner + `pending_payment` → `cancelled`; retry → `already_cancelled`.
- Status lain → 409.

## submit-ratecard-deliverable

- Tanpa caller → 401; non-POST → 405.
- `orderId` tidak valid → 400; order tidak ada → 404.
- Creator owner → version `latest + 1`, status `submitted`, permission read Creator + UMKM, update UMKM saja.
- Creator lain / UMKM → 403.
- Order bukan `in_progress|revision` → 409.
- `storage`: tanpa `fileId` → 400; metadata tidak ada → 404; milik user lain → 403; non-active atau belum share ke UMKM → 409.
- Semua `fileUrl` wajib HTTPS valid → 400.
- Submit paralel versi sama → ID sama, satu sukses, lainnya 409.
- Submit tidak mengubah order, escrow, wallet, payment.

## request-ratecard-revision

- Tanpa caller → 401. Creator → 403. UMKM lain → 404.
- Owner pada order `in_progress|revision` + latest `submitted` → revision `open`, latest `revision_requested`, order `revision`, `review_deadline_at`/`reminder_sent_at` = null.
- Latest bukan `submitted` untuk request baru → 409; row deterministik cocok saat latest `revision_requested` → recovery 200.
- Total baris revisions ≥ limit → 409 (status `open`/`resolved` sama-sama dihitung).
- Siklus kedua setelah Creator kirim v2 diizinkan selama kuota tersisa.
- Pesan kosong / > 2000, order tidak eligible → ditolak sebelum write.
- Retry setelah partial failure (deliverable/order update gagal) melanjutkan side effect tanpa row kedua dan tanpa memakai kuota lagi.
- Request konkuren pada latest yang sama → satu revision.
- Tidak menulis `revision_count`, validasi, escrow, wallet, payment.

## review-ratecard-deliverable & antrian Admin

- Admin aktif + deliverable latest `submitted` → satu validasi dengan snapshot server-side (`deliverableVersion`, `sourceSnapshot`, `evidenceUrlSnapshot`, `reviewedBy`).
- `invalid` tanpa catatan → 400; keputusan kedua → 409.
- Non-Admin → 403. Deliverable bukan latest / bukan `submitted` / order non-Rate-Card / order tidak aktif → 409.
- Antrian hanya berisi latest `submitted` tanpa validasi dari order `in_progress|revision`.

## get-umkm-ratecard-reviews

- Satu conversation dengan banyak order → semua order Rate Card tampil.
- Detail order UMKM lain → 404; order milik caller tanpa `offerId`/`packageId` → disembunyikan (404 untuk detail).
- Validasi hanya diambil dari deliverable versi tertinggi.
- Tanpa caller → 401.

## track-order-review

- Order `revision` + deliverable baru → `in_progress`, `review_deadline_at = $createdAt + 3 hari`, `reminder_sent_at = null`.
- Event create telat setelah revisi sinkron (latest sudah `revision_requested`) → ignored, tidak menimpa status/timer.

## auto-approve-orders (belum ada test nyata)

- Deliverable `submitted` dengan `review_deadline_at` lewat → `approved`, `auto_approved = true`, notif UMKM.
- Deadline ≤ 24 jam & `reminder_sent_at` null → reminder + `reminder_sent_at` terisi.
- Order selain `in_progress|revision` dilewati.
- Kasus perlu diuji: auto-approve tanpa validasi `valid` → release `ignored` (escrow tertahan).

## Release (lihat juga `../Payments/100_Testing.md`)

- Approve + validasi `valid` cocok → escrow released, wallet Creator += `amount − floor(amount × fee_rate)`, ledger `release` + `fee`, order `completed`.
- Approve tanpa validasi tepercaya → `ignored`.
- Kredit wallet gagal → escrow tetap `releasing`, retry menyelesaikan tepat sekali.

## Status Flow

- `pending_payment → in_progress` hanya via `create-escrow` (payment `paid`).
- `in_progress ⇄ revision` via `request-ratecard-revision` / `track-order-review`.
- `in_progress|revision → completed` hanya via `release-escrow`/`reconcile-release-escrow`.
- `pending_payment → cancelled` hanya via `cancel-order`.
- Browser tidak bisa update `orders` (collection `$permissions: []`, row hanya `read`).
