# Orders — User Flow

## Alur Order (Rate Card, Custom Offer)

```text
UMKM chat Creator (opsional dari "Pilih Paket Ini" → ?packageId=)
↓
UMKM kirim offer (create-offer) → Creator accept
↓
Order dibuat (pending_payment) — notifikasi UMKM "Penawaran Diterima"
  └─ UMKM "Batalkan Pesanan" → cancelled (cancel-order)
↓
UMKM bayar di ruang negosiasi (/dashboard/umkm/negosiasi/{conversationId})
  → create-payment → redirect Snap Midtrans → webhook paid
↓
Escrow held → Order in_progress — notifikasi UMKM & Creator
↓
Creator kirim hasil kerja di ruang negosiasi (/dashboard/kreator/negosiasi/{conversationId})
  ├─ Tautan eksternal (https)
  └─ Unggah berkas (validate-and-upload + shareWithOrderId, terikat kuota File Manager)
↓
Deliverable vN submitted — notifikasi UMKM, timer review 3 hari mulai
↓
Admin Marketiv validasi (app admin /rate-card-validations)
  ├─ valid   → UMKM bisa approve
  └─ invalid → catatan ke Creator & UMKM; Creator kirim versi baru / UMKM minta revisi
↓
UMKM review (/dashboard/umkm/review-rate-card/{orderId})
  ├─ Approve → deliverable approved → release-escrow → completed
  ├─ Minta Revisi (selama kuota tersisa) → order revision → Creator kirim vN+1 → order in_progress
  └─ Diam hingga tenggat → auto-approve (reminder H-1 sebelumnya)
```

Catatan:

- Tidak ada halaman `/orders/{orderId}`; order dikelola dari ruang negosiasi (key `conversationId`) dan halaman Tinjauan Pekerjaan UMKM (key `orderId`).
- Status pembayaran tidak di-set optimistis; UI memuat ulang DTO setelah kembali dari Midtrans.
- Direct Order (Jalur A) **belum diimplementasikan**.

## Alur Deliverable

```text
Creator kirim (submit-ratecard-deliverable)
↓
Deliverable version n+1, status submitted
↓
Admin: valid | invalid (sekali per deliverable)
↓
UMKM approve → approved (release jika validasi valid)
  atau minta revisi → revision_requested
  atau tenggat lewat → approved otomatis (auto_approved = true)
```

## Tampilan Status Review UMKM (`getRatecardReviewState`)

| Kondisi | Filter | Aksi |
| --- | --- | --- |
| Order `completed`/`approved` atau latest `approved` | Selesai | — |
| Belum ada deliverable | — | — |
| Latest `revision_requested` | Revisi | — |
| Latest `submitted`, validasi `pending` | Menunggu Marketiv | Minta revisi (jika kuota) |
| Latest `submitted`, validasi `invalid` | Perlu Tindakan | Minta revisi (jika kuota) |
| Latest `submitted`, validasi `valid` | Perlu Tindakan | Approve + minta revisi (jika kuota) |
