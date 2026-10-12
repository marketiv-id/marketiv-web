# Orders — Business Rules

## 1. Pembentukan Order

1. Order hanya dibuat Function `create-order` saat event `offers.rows.*.update` membawa `offer.status === "accepted"`. Guard memakai **status akhir**, bukan transisi `pending → accepted` (event Appwrite tidak membawa `$previous`).
2. Satu offer = maksimal satu order: unique index `idx_offerId`. Event ulang → createDocument 409 → respons `already_exists`, bukan error.
3. Isi order: `offerId`, `umkmId`, `creatorId`, `amount = offer.price`, `status = pending_payment`, plus `packageId`/`packageNameSnapshot`/`packagePriceSnapshot` bila offer membawanya.
4. Creator wajib sudah setuju T&C terbaru (`users.tos_version === CURRENT_TOS_VERSION` (default `v3.1`) dan `tos_accepted_at` terisi). Jika tidak → order tidak dibuat, UMKM dinotifikasi `order_tos_blocked`.
5. Offer `rejected` tidak membuat order; UMKM dinotifikasi `offer_rejected`.
6. Direct Order dari paket tanpa offer **belum diimplementasikan**.

## 2. Status Order

Nilai yang ditulis kode:

| Status | Ditulis oleh | Arti |
| --- | --- | --- |
| `pending_payment` | `create-order` | Menunggu pembayaran UMKM |
| `in_progress` | `create-escrow` (payment `paid`); `track-order-review` (dari `revision` saat versi baru masuk) | Escrow `held`, Creator bekerja / menunggu review |
| `revision` | `request-ratecard-revision` | UMKM meminta revisi atas latest deliverable |
| `completed` | `release-escrow`, `reconcile-release-escrow` | Escrow dirilis ke wallet Creator |
| `cancelled` | `cancel-order` | Dibatalkan UMKM sebelum bayar |

Transisi valid: `pending_payment → in_progress | cancelled`; `in_progress → revision | completed`; `revision → in_progress | completed`.

Belum diimplementasikan (tidak ada writer): `escrow`, `approved` (masih ada di tipe/label UI & daftar "order aktif"), `expired` (hanya dibaca `refund-order`), `dispute` (disebut T-05; cron hanya memproses `in_progress|revision` sehingga status lain otomatis terlewati).

## 3. Pembatalan

1. Hanya UMKM pemilik order, role `umkm` dan status akun `active`, via Function `cancel-order`.
2. Hanya order `pending_payment`; status lain → 409. Order sudah `cancelled` → 200 `already_cancelled` (idempoten).
3. Pembatalan tidak menyentuh payment/escrow. Order `pending_payment` belum punya escrow, sehingga `refund-order` yang terpicu event update order berakhir `ignored`.
4. Batalkan payment Midtrans berjalan ditangani `cancel-payment`/webhook (modul Payments), bukan `cancel-order`.

## 4. Deliverable

1. Hanya Creator pemilik order (`x-appwrite-user-id === orders.creatorId`) via Function `submit-ratecard-deliverable`; browser tidak bisa create (collection `$permissions: []`).
2. Order harus `in_progress` atau `revision`. Status latest deliverable **tidak** diperiksa — Creator boleh mengirim versi baru kapan saja selama order aktif.
3. `version = latestVersion + 1`; ID dokumen deterministik `dlv` + sha256(`orderId:version`) → submit paralel versi sama berakhir 409.
4. Sumber:
   - `external_url` — `fileUrl` wajib URL `https:` valid, ≤ 2048 karakter.
   - `storage` — `fileId` wajib (ID Appwrite valid) dan baris `user_files` harus milik caller, `status = active`, dan sudah memberi `read("user:<umkmId>")`. `fileUrl` tetap wajib HTTPS. Berkas diunggah dulu lewat `validate-and-upload` dengan `shareWithOrderId` (modul Users).
5. `notes` opsional, string ≤ 2000 karakter.
6. Status awal `submitted`. Submit tidak mengubah order, escrow, wallet, atau payment.
7. Permission baris: `read` Creator + UMKM, `update` hanya UMKM (approve UMKM adalah update dari browser).
8. `creatorCredit` & `aiGenerated` ada di skema tetapi **tidak diterima/ditulis** Function submit maupun UI saat ini — belum diimplementasikan.

## 5. Status Deliverable

`submitted → revision_requested` (request revisi) · `submitted → approved` (UMKM approve atau auto-approve).

- Versi lama tetap sebagai riwayat; hanya latest yang dapat diproses.
- Tidak ada transisi balik dari `approved`.

## 6. Validasi Admin

1. Admin aktif (`users.role = admin` + status `active`, atau label/prefs `admin` di Auth) via `review-ratecard-deliverable`.
2. Hanya order Rate Card (punya `offerId`/`packageId`) berstatus `in_progress|revision`, deliverable `submitted` dan merupakan latest.
3. Keputusan `valid | invalid`; `invalid` wajib `notes`. Catatan dipotong 2000 karakter.
4. Satu keputusan final per deliverable (unique index `idx_deliverableId`); keputusan kedua → 409.
5. Snapshot disimpan: `deliverableVersion`, `sourceSnapshot`, `evidenceUrlSnapshot`, `reviewedBy`, `reviewedAt`.
6. `invalid` tidak mengubah status deliverable/order; perbaikan = Creator kirim versi baru (atau UMKM minta revisi).

## 7. Revisi

1. Hanya UMKM aktif pemilik order via `request-ratecard-revision`. Creator → 403; UMKM lain → 404 (anti-enumeration).
2. Order `in_progress|revision`, latest deliverable harus `submitted` untuk permintaan baru.
3. `message` wajib (trim tidak kosong), ≤ 2000 karakter.
4. Satu logical request per latest deliverable: ID `rev` + sha256(`orderId:latestDeliverableId`). Retry/klik ganda memulihkan side effect yang belum jalan, tidak membuat baris kedua dan tidak memakai kuota dua kali.
5. **Batas revisi**: jumlah total baris `revisions` order (status apa pun) harus `< limit`. Limit = `orders.revision_limit` bila > 0; jika tidak, `revisionLimit` offer (bila ada `offerId`) atau paket (bila hanya `packageId`); jika sumber tak terbaca → default 3. Limit 0 dari offer/paket = revisi tidak boleh.
6. Efek: baris revision `open` (read UMKM + Creator), latest deliverable → `revision_requested`, order → `revision`, `review_deadline_at = null`, `reminder_sent_at = null`.
7. Tidak menyentuh `revision_count`, validasi, escrow, wallet, payment.
8. Status `resolved` ada di skema/tipe tetapi **tidak pernah ditulis** kode — belum diimplementasikan; revisi tetap `open`.

## 8. Review Window & Auto-Approve

1. `track-order-review` (event deliverable create): bila order `in_progress|revision` dan latest deliverable masih `submitted`, set `review_deadline_at = deliverable.$createdAt + 3 hari`, `reminder_sent_at = null`, `revision_count = max(revision_count, version − 1)`, `revision_limit` (snapshot dari order/offer/paket, fallback 0), dan `revision → in_progress`.
2. Guard idempoten: jika `review_deadline_at` sudah terisi dan `version ≤ revision_count + 1` → ignored.
3. `auto-approve-orders` (cron tiap jam `0 * * * *`):
   - Deliverable `submitted` (atau `delivered`, nilai legacy) yang order-nya `in_progress|revision` dan `now ≥ review_deadline_at` → deliverable `approved`, `orders.auto_approved = true`, notifikasi UMKM.
   - Reminder H-1: order `in_progress|revision`, `review_deadline_at ≤ now + 24 jam`, `reminder_sent_at` null → set `reminder_sent_at`, notifikasi UMKM.
   - Batch 100 baris per kategori per run.
4. Auto-approve **tidak** memeriksa validasi Admin. Release tetap menunggu validasi `valid` (lihat §9).
5. `revision_count` hanya informatif; batas revisi otoritatif dihitung dari baris `revisions` (§7).

## 9. Approve → Release Escrow

1. UMKM approve = update `deliverables.status = approved` langsung dari browser (row permission `update` UMKM). UI hanya mengaktifkan tombol bila latest deliverable `submitted`, validasi `valid`, dan order `in_progress|revision`.
2. `release-escrow` (event deliverable update **atau** validation create) memuat ulang state dan hanya merilis bila: order `in_progress|revision`; deliverable `approved` dan latest; validasi `valid` dengan `orderId`, `deliverableVersion`, `sourceSnapshot`, `evidenceUrlSnapshot` cocok; escrow `held|releasing` ada.
3. Fee seller-side: `fee = floor(escrow.amount × escrow.fee_rate)` (fallback 0.02); Creator menerima `amount − fee`. Detail di `../Payments/`.
4. Hasil: escrow `released`, ledger `release` + `fee` completed, saldo Creator naik, order `completed`, notifikasi kedua pihak. Escrow macet di `releasing` difinalisasi `reconcile-release-escrow` (cron 15 menit).
5. Transfer lisensi konten ke UMKM terjadi saat escrow dirilis, bukan saat submit (T&C).

## 10. Refund

1. `refund-order` terpicu setiap `orders.rows.*.update`; hanya bertindak bila status `cancelled`/`expired` dan escrow order masih `held` → escrow `refunded`, kredit `escrow.amount` utuh ke wallet UMKM (fee tidak relevan), ledger `refund`, notifikasi.
2. Manual (server/Console, `execute: []`): `{ orderId }` (order harus `cancelled`/`expired`, selain itu 409) atau `{ campaignId }`.
3. Karena `cancel-order` hanya untuk `pending_payment` dan tidak ada writer `expired`, refund order berjalan otomatis **belum** punya jalur pemicu dari aplikasi; refund escrow `held` saat ini hanya lewat Admin manual (`refund-escrow`/`refund-order`).

## 11. Akun Non-Active

- `create-offer` (UMKM), `create-payment`, `cancel-order`, `request-ratecard-revision` menolak akun non-active (403).
- `create-order` **tidak** memeriksa status akun pada offer `accepted` (cek suspended hanya berjalan di cabang `rejected` — lihat catatan bug di laporan audit). Yang diperiksa saat accept hanya T&C Creator.
- `submit-ratecard-deliverable` tidak memeriksa status akun Creator.
- Dana yang sudah di escrow tetap diproses standar (release/refund) kecuali ada penanganan sengketa manual.
