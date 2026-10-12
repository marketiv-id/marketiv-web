# Orders — Concepts

## Istilah

- **Order** — aggregate utama alur Rate Card; merekam transaksi UMKM ↔ Creator. Selalu punya `offerId` (unik); `packageId` opsional sebagai provenance.
- **Deliverable** — hasil kerja Creator untuk satu order, **berversi**. Setiap kiriman = baris baru `version + 1`; baris lama tidak pernah ditimpa.
- **Latest deliverable** — deliverable dengan `version` tertinggi pada order. Hanya versi ini yang bisa divalidasi Admin, diminta revisi, atau memicu release.
- **Validasi Admin** — keputusan final Admin Marketiv (`valid`/`invalid`) atas satu deliverable, disimpan di `ratecard_deliverable_validations` beserta snapshot versi, sumber, dan URL bukti. Satu keputusan per deliverable.
- **Revision** — permintaan revisi UMKM atas latest deliverable `submitted`. Satu baris = satu pemakaian kuota revisi.
- **Review window** — tenggat review UMKM: `review_deadline_at = deliverable.$createdAt + 3 hari` (diset `track-order-review`). Lewat tenggat → auto-approve.
- **Auto-approve** — cron `auto-approve-orders` menandai deliverable `approved` saat tenggat lewat dan set `orders.auto_approved = true`.
- **Escrow** — dana order yang ditahan sejak pembayaran sukses hingga dirilis/di-refund (dikelola modul Payments).
- **Provenance paket** — `packageId`, `packageNameSnapshot`, `packagePriceSnapshot` yang disalin dari offer; bukan dasar harga (`amount` = harga final offer).

## Status Order (yang benar-benar ditulis kode)

`pending_payment → in_progress ⇄ revision → completed`, plus `pending_payment → cancelled`.

Nilai `escrow` dan `approved` ada di tipe TypeScript & label UI, `expired` hanya dibaca `refund-order`, `dispute` hanya disebut laporan T-05 — keempatnya **belum diimplementasikan** (tidak ada Function yang menulisnya).

## Konsep

- Order tercipta dari custom offer accepted; Direct Order dari paket **belum diimplementasikan**.
- Satu order memiliki banyak deliverable (versi berurutan) dan banyak revision.
- Batas revisi: `orders.revision_limit` (bila > 0) → `revisionLimit` offer/paket → default 3 (lihat `30_Business_Rules.md`).
- Approve UMKM saja tidak mencairkan dana; release butuh validasi Admin `valid` yang cocok dengan latest deliverable.
- Fee platform seller-side dipotong saat release (ADR-008), bukan ditambahkan ke tagihan UMKM.
