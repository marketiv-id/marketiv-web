# Orders — Frontend

Tidak ada halaman "My Orders" / `/orders/{id}` khusus. Order hidup di ruang negosiasi (key `conversationId`) dan halaman Tinjauan Pekerjaan UMKM (key `orderId`).

## Halaman UMKM

### Ruang Negosiasi — `/dashboard/umkm/negosiasi/[id_conversation]`

- Komponen: `NegotiationRoomPage`, `OrderSummaryCard`, `CustomOfferCard`, `DeliverableReviewCard`.
- Order `pending_payment`: tombol bayar (`createOrderPayment` → redirect Snap; nominal = `order.amount`, tanpa fee tambahan) dan "Batalkan Pesanan" (`cancelOrder`, ConfirmDialog).
- Setelah bayar, status dimuat ulang dari DTO (`get-umkm-negotiations`); escrow tidak di-set optimistis.
- Deliverable dibaca `getDeliverables`; `DeliverableReviewCard` menautkan ke halaman review untuk aksi approve/revisi.

### Tinjauan Pekerjaan — `/dashboard/umkm/review-rate-card`

- `RatecardReviewListPage` memanggil `getUmkmRatecardReviews()`.
- Filter: Semua, Perlu Tindakan, Menunggu Marketiv, Revisi, Selesai (urut prioritas sama).
- Kartu: status order, status validasi Marketiv, nominal, tautan detail. Menu sidebar "Tinjauan Pekerjaan".

### Detail Tinjauan — `/dashboard/umkm/review-rate-card/[orderId]`

- `RatecardReviewDetailPage` memanggil `getUmkmRatecardReview(orderId)`.
- Panel: konteks paket/offer, latest deliverable + riwayat versi, rail validasi Marketiv (status, catatan, waktu), riwayat revisi, kuota revisi (`revisionCount / revisionLimit`).
- Aksi dihitung `getRatecardReviewState` (`src/lib/ratecard-review/review-state.ts`):
  - **Setujui** hanya bila latest `submitted`, validasi `valid`, order `in_progress|revision` → `approveDeliverable`. Toast: settlement asinkron.
  - **Minta Revisi** bila latest `submitted`, order aktif, dan `revisionCount < revisionLimit` → form alasan → `requestRevision`.

## Halaman Creator

### Ruang Negosiasi — `/dashboard/kreator/negosiasi/[id_conversation]`

- `NegosiasiRoomView`: menerima/menolak offer, lalu mengirim hasil kerja saat order aktif.
- Modal kirim hasil kerja, dua mode:
  - "Kirim Tautan" (`external_url`, wajib `https://`).
  - "Unggah Berkas" (`storage`): `uploadUserFile({ file, shareWithOrderId })` lalu `uploadDeliverable` dengan `fileId`.
- Setiap kirim = versi baru; riwayat deliverable dibaca `getDeliverables`.
- `/dashboard/kreator/pekerjaan-aktif` adalah pekerjaan **Campaign** (claim), bukan order Rate Card.

## Halaman Admin (app `admin/`)

### Validasi Rate Card — `/rate-card-validations`

- Antrian dari `get-admin-ratecard-deliverable-queue` (tombol "Segarkan"); "Tandai Valid" / "Tandai Invalid" (catatan wajib untuk invalid, konfirmasi `window.confirm`) via `review-ratecard-deliverable`.
- Validasi manual (MVP): tidak ada verifikasi otomatis TikTok/Instagram; keputusan `valid` tidak memindahkan dana sendiri.

## Komponen & Modul

- `NegotiationRoomPage`, `OrderSummaryCard`, `CustomOfferCard`, `DeliverableReviewCard` — sisi UMKM negosiasi.
- `RatecardReviewListPage`, `RatecardReviewDetailPage` — review UMKM.
- `NegosiasiRoomView` — sisi Creator.
- Tipe: `src/types/ratecard-review.types.ts`, `src/types/domain.ts` (`OrderStatus`, `DeliverableStatus`, `RevisionStatus`).
- Label status order: `src/lib/dashboard-labels.ts` (masih memuat `escrow`/`approved` yang tidak pernah ditulis backend).
