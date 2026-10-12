# Orders — API

## Service Layer (Client SDK)

Service frontend aktif ada di root repo: `src/services/shared/deliverable.service.ts` (facade) → `deliverable-appwrite.service.ts`, `src/services/umkm/umkm-appwrite.service.ts`, `src/services/umkm/ratecard-review.service.ts`. Semua mengembalikan `ServiceResult` (`{ success, data, error?, code? }`), tidak melempar. Mode mock (`DATA_SOURCE_CONFIG.useMockData`) mengembalikan daftar kosong.

Daftar order per pihak tidak punya service sendiri: order dibaca lewat DTO ruang negosiasi (`get-umkm-negotiations` / `get-creator-negotiations`, lihat `../Offers/` & `../Chat/`) dan DTO review UMKM (`get-umkm-ratecard-reviews`).

> `00_BACKEND/src/services/order.service.ts` adalah mirror **legacy** dan tidak diimpor frontend. `uploadDeliverable`/`requestRevision` di sana masih menulis langsung via Client SDK, yang kini ditolak permission collection (`$permissions: []`). Jangan dipakai sebagai kontrak.

---

### `getDeliverables(orderId)` — [Client SDK]

- **Proses**: baca order (row read participant), tolak bila caller bukan UMKM/Creator order → `not_found`; list `deliverables` `orderId`, `orderAsc("version")`, limit 50.
- **Return**: `Deliverable[]` `{ id, orderId, source, fileUrl, fileId?, notes?, version, status, createdAt }`.
- **Akses**: UMKM/Creator order.

### `getRevisions(orderId)` — [Client SDK]

- **Proses**: sama dengan di atas; list `revisions` `orderDesc("$createdAt")`, limit 50.
- **Return**: `Revision[]` `{ id, orderId, requestedBy, message, status, createdAt }`.

### `uploadDeliverable(input)` — [Appwrite Function `submit-ratecard-deliverable`]

- **Input**: `{ orderId, source: "external_url"|"storage", fileUrl, fileId?, notes? }`.
- **Validasi klien** (`src/lib/validations/deliverable.schema.ts`): `fileUrl` ≤ 2048; `external_url` wajib diawali `https://` dan URL valid; `storage` wajib `fileId` (≤ 255); `notes` ≤ 2000.
- **Proses**: untuk `storage`, UI lebih dulu memanggil `uploadUserFile({ file, shareWithOrderId })` (Function `validate-and-upload`) lalu memakai `fileUrl`/`fileId` hasilnya. Lalu `executeFunction(submit-ratecard-deliverable)`.
- **Return**: `Deliverable` dari Function.
- **Akses**: Creator order.

### `approveDeliverable(orderId, deliverableId)` — [Client SDK] *(memicu `release-escrow`)*

- **Proses**: cek caller = UMKM order; `deliverable.orderId === orderId`; deliverable belum `approved`; lalu `updateDocument(deliverables, { status: "approved" })` memakai row permission `update` UMKM.
- **Errors**: `not_found` "Pesanan tidak ditemukan."; `forbidden` "Hanya UMKM pemilik pesanan yang dapat menyetujui deliverable."; `validation` "Deliverable tidak sesuai dengan pesanan." / "Deliverable ini sudah disetujui."
- **Catatan**: service tidak memeriksa latest/validasi; UI (`getRatecardReviewState`) yang membatasi tombol. Release asinkron dan hanya terjadi bila validasi Admin `valid` (lihat `30_Business_Rules.md` §9).
- **Akses**: UMKM order.

### `requestRevision({ orderId, message })` — [Appwrite Function `request-ratecard-revision`]

- **Validasi klien**: `message` wajib, ≤ 2000.
- **Return**: `Revision`.
- **Akses**: UMKM order.

### `cancelOrder(orderId)` — [Appwrite Function `cancel-order`]

- `cancelOrderInAppwrite` → `executeFunction(cancel-order, { orderId })`. Lihat kontrak Function di bawah.
- **Akses**: UMKM order, hanya `pending_payment`.

### `getUmkmRatecardReviews()` / `getUmkmRatecardReview(orderId)` — [Appwrite Function `get-umkm-ratecard-reviews`]

- Body `{}` → daftar; body `{ orderId }` → satu review.

### Admin app — [Appwrite Function]

`admin/src/features/admin/ratecard-validations/service.ts`:

- `getRateCardValidationQueue()` → `get-admin-ratecard-deliverable-queue`, return `items`.
- `reviewRateCardDeliverable(deliverableId, decision, notes)` → `review-ratecard-deliverable`.

> Pembayaran order (`createOrderPaymentInAppwrite` → `create-payment` `purpose: "order"`) → `../Payments/60_API.md`.

---

## Appwrite Functions (Server-side)

Semua Function memakai dynamic API key (`x-appwrite-key`) dan identitas caller dari header `x-appwrite-user-id` (bukan body). Respons error berbentuk `{ error: string }`.

### `submit-ratecard-deliverable` — [Appwrite Function]

- **Trigger**: eksekusi sinkron, `execute: ["users"]`, `POST`.
- **Input**: `{ orderId, source, fileUrl, fileId?, notes? }`.
- **Return 200**: `{ id, orderId, source, fileUrl, version, status: "submitted", createdAt, fileId?, notes? }`.
- **Errors**:
  - 405 non-POST · 401 tanpa caller.
  - 400 `orderId` bukan ID Appwrite valid; source tidak valid; `fileUrl` kosong/> 2048/bukan URL/bukan `https:`; `notes` bukan string / > 2000; `storage` tanpa `fileId` valid; createDocument 400.
  - 404 order tidak ada; berkas `user_files` tidak ada.
  - 403 caller ≠ `creatorId`; berkas milik user lain.
  - 409 order bukan `in_progress|revision`; berkas tidak `active`; berkas belum memberi read ke UMKM; versi terakhir tidak valid; konflik ID versi (submit paralel).
  - 500 internal (mis. order tanpa participant ID valid).
- **Tidak melakukan**: update order, approve, escrow, wallet, payment.

### `request-ratecard-revision` — [Appwrite Function]

- **Trigger**: eksekusi sinkron, `execute: ["users"]`, `POST`.
- **Input**: `{ orderId, message }`.
- **Return 200**: `{ id, orderId, requestedBy, message, status: "open", createdAt }` (juga untuk retry yang memulihkan row lama).
- **Errors**:
  - 405 · 401.
  - 400 body bukan object; `orderId` tidak valid; `message` kosong / > 2000.
  - 404 profil `users` caller tidak ada; order tidak ada **atau** milik UMKM lain.
  - 403 akun non-active; role bukan `umkm`.
  - 409 order tanpa `creatorId` valid; order bukan `in_progress|revision`; belum ada deliverable; latest bukan `submitted` (untuk request baru); row deterministik tidak cocok (`orderId`/`requestedBy`); batas revisi tercapai ("Batas revisi (N) sudah tercapai. Setujui apa adanya atau buka sengketa.").
- **Efek**: revision `open` (read UMKM + Creator), latest → `revision_requested`, order → `revision` + reset `review_deadline_at`/`reminder_sent_at`.

### `cancel-order` — [Appwrite Function]

- **Trigger**: eksekusi sinkron, `execute: ["users"]`, `POST`.
- **Input**: `{ orderId }`.
- **Return 200**: `{ ok: true, status: "cancelled" }` atau `{ ok: true, status: "already_cancelled" }`.
- **Errors**: 405 · 401 · 400 tanpa `orderId` · 404 order tidak ada · 403 bukan UMKM aktif / bukan pemilik · 409 status selain `pending_payment`.

### `get-umkm-ratecard-reviews` — [Appwrite Function]

- **Trigger**: eksekusi sinkron, `execute: ["users"]`, `GET|POST`, scope `documents.read`.
- **Input**: `{}` atau `{ orderId }`.
- **Proses**: list order `umkmId = caller` (ownership di query; maks 5000), buang order tanpa `offerId`/`packageId`, join per collection: offers, conversations, creator_profiles, rate_card_packages, escrows, deliverables, validations, revisions.
- **Return**: `RatecardReview[]` (atau satu objek untuk `orderId`): `{ orderId, conversationId, creatorId, creatorName, creatorAvatarUrl, projectTitle, scope, packageContext|null, amount, orderStatus, escrowStatus, revisionCount (jumlah baris revisions), revisionLimit, latestDeliverable|null, validation { status: pending|valid|invalid, reviewNotes?, reviewedAt? }, deliverableHistory[], revisionHistory[], createdAt }`.
- **revisionLimit**: `revision_limit` > 0 → `offer.revisionLimit` → `package.revisionLimit` → 0.
- **Errors**: 405 · 401 · 400 `orderId` tidak valid · 404 detail tidak ditemukan (order asing/non-Rate-Card/tidak ada).

### `get-admin-ratecard-deliverable-queue` — [Appwrite Function]

- **Trigger**: eksekusi sinkron, `execute: ["users"]`, `GET|POST`, scope `documents.read`.
- **Proses**: Admin aktif; ambil 100 deliverable `submitted` terbaru, saring yang belum punya validasi, order `in_progress|revision`, dan merupakan latest; join creator_profiles & umkm_profiles.
- **Return**: `{ items: [{ id, orderId, version, source, evidenceUrl, notes?, submittedAt, status: "pending", isLatest: true, creator { id, name }, umkm { id, businessName }, projectTitle, finalAmount }], total }`.
- **Errors**: 405 · 401 · 403 bukan Admin aktif.

### `review-ratecard-deliverable` — [Appwrite Function]

- **Trigger**: eksekusi sinkron, `execute: ["users"]`, `POST`.
- **Input**: `{ deliverableId, decision: "valid"|"invalid", notes? }`.
- **Return 200**: `{ success: true, deliverableId, decision, reviewedAt }`.
- **Errors**: 405 · 401 · 400 input tidak valid / `invalid` tanpa `notes` · 403 bukan Admin aktif · 404 deliverable/order tidak ada · 409 order bukan Rate Card, order bukan `in_progress|revision`, deliverable bukan `submitted`, bukan latest, atau sudah punya keputusan.
- **Efek**: create `ratecard_deliverable_validations` (memicu `release-escrow`), notifikasi Creator & UMKM.

### `create-order` — [Appwrite Function]

- **Trigger**: event `offers.rows.*.update`; `execute: []`.
- **Return**: `{ success, orderId }` · `{ status: "already_exists" }` · `{ status: "notified", reason: "offer rejected" }` · `{ status: "blocked" }` (T&C) · `{ status: "ignored" }` · 400 tanpa payload offer.

### `track-order-review`, `auto-approve-orders`, `notify-order-activity`, `refund-order`

Server-only (event/cron, `execute: []`). Detail di `70_Backend.md` dan `90_Events.md`.

### `create-escrow`, `release-escrow`, `reconcile-release-escrow`, `refund-escrow`

Dimiliki modul Payments — lihat `../Payments/60_API.md`. Efeknya terhadap order dirangkum di `30_Business_Rules.md`.

### `sync-order-revision` — retired

Disabled, tanpa event. Bukan writer status revisi.

---

## Lihat Juga

- [50_Database.md](50_Database.md) — skema data
- [30_Business_Rules.md](30_Business_Rules.md) — aturan validasi
- [90_Events.md](90_Events.md) — event trigger flow
