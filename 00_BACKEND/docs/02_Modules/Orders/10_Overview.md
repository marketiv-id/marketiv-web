# Orders — Overview

Order adalah **aggregate utama** alur Rate Card. Semua status transaksi dan referensi finansial (escrow, deliverable, validasi, revisi) berpusat pada order.

## Inti

- Order terbentuk **hanya** dari **custom offer** yang di-accept Creator (lihat `../Offers/`). Function `create-order` membuatnya dengan status `pending_payment`.
- Offer boleh membawa `packageId` (provenance paket rate card). `create-order` menyalinnya ke order bersama `packageNameSnapshot`/`packagePriceSnapshot`; `amount` selalu `offer.price`.
- **Direct Order** (pesan paket tanpa offer, Jalur A) **belum diimplementasikan**. Tombol "Pilih Paket Ini" di profil Creator membuka ruang negosiasi dengan `?packageId=` (lihat `../RateCards/40_User_Flow.md`).
- Order menggerakkan: pembayaran (Midtrans) → escrow `held` → deliverable Creator → validasi Admin → approve UMKM (manual atau auto-approve) / revisi → release escrow → `completed`.
- Pencairan escrow butuh **dua kunci**: deliverable terbaru `approved` (UMKM/auto-approve) **dan** keputusan Admin `valid` di `ratecard_deliverable_validations` yang cocok dengan snapshot deliverable.

## Alur Ringkas

```text
Offer accepted (Creator)
↓ create-order (event offers.rows.*.update)
Order pending_payment ──(UMKM cancel-order)──→ cancelled
↓ UMKM bayar (create-payment → Midtrans → midtrans-webhook: payment paid)
↓ create-escrow (event payments.rows.*.update)
Escrow held + Order in_progress
↓ Creator submit-ratecard-deliverable (versi n)
↓ track-order-review: review_deadline_at = createdAt + 3 hari
Admin review-ratecard-deliverable → valid | invalid
↓
UMKM approve (deliverable approved)          UMKM request-ratecard-revision
  atau auto-approve-orders (deadline lewat)     → Order revision, deliverable revision_requested
↓ release-escrow (deliverable update / validation create)      ↓ Creator kirim versi n+1
Escrow released + wallet Creator (− fee) + Order completed       ↓ track-order-review → in_progress
```

## Aktor

- **UMKM** — pembeli; membayar, membatalkan order belum dibayar, meminta revisi, menyetujui deliverable.
- **Creator** — penjual; mengirim deliverable (versi baru setiap kirim).
- **Admin Marketiv** — memvalidasi deliverable terbaru (`valid`/`invalid`) via app admin.
- **Sistem** — Functions event-driven & cron (escrow, timer review, auto-approve, notifikasi, refund).

## Batas Tanggung Jawab

- Escrow, wallet, ledger, fee, refund → modul Payments (`../Payments/`).
- Offer & ruang negosiasi → `../Offers/`, `../Chat/`.
- Paket rate card → `../RateCards/`.
- Upload berkas (`validate-and-upload`, `user_files`, kuota) → `../Users/`.

## Tautan

- Keputusan order sebagai aggregate utama → `../../04_Decisions/ADR-003.md`; fee seller-side → `../../04_Decisions/ADR-008.md`.
- Alur lintas modul → `../../03_Workflows/30_RateCard_Order.md`.
- Skema & relasi → `50_Database.md`.
