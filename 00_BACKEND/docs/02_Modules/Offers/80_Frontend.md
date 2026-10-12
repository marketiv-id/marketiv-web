# Offers — Frontend

Offer tampil di ruang negosiasi (`/dashboard/umkm/negosiasi/[id_conversation]`, `/dashboard/kreator/negosiasi/[id_conversation]`). Route & sinkronisasi ruang → `../Chat/80_Frontend.md`.

## Komponen

### MessageComposer (UMKM) — quick action

- "Kirim Penawaran Khusus" hanya muncul jika `canStartNewDeal(stage)` (`src/lib/negotiation/deal-stage.ts`): `chatting`, `offer_rejected`, `completed`, `cancelled`.
- "Lakukan Pembayaran" muncul saat `pending_payment` (modul Payments).
- Creator tidak punya aksi kirim offer.

### SendCustomOfferModal (UMKM)

- `src/components/features/umkm-dashboard/negotiation/modals/SendCustomOfferModal.tsx`.
- Field: lingkup (scope), harga, jumlah revisi, deadline, centang persetujuan wajib.
- Prefill dari query `?packageId=` hanya saat `canStartNewDeal(stage)`; paket diambil ulang dari rate card creator. Paket tidak tersedia → peringatan, offer tetap boleh tanpa paket.
- Submit → `createOffer` dengan `title = scope.slice(0,255)` atau `"Kolaborasi dengan {creatorName}"`, `description = scope`, `packageId` opsional.
- Validasi Zod `createOfferSchema`: harga ≥ Rp50.000 integer, revisi 0–10, deadline valid & di masa depan, batas panjang sesuai kolom.

### CustomOfferCard

- Dirender `ChatTimeline` untuk pesan tipe `offer`; data dari join `offers` (`offerData`: judul, harga, scope, deadline, revisi).
- UMKM: tombol "Batalkan Penawaran" untuk offer `pending` → `deleteOffer`.
- Pesan offer yang offer-nya sudah dihapus tidak punya `offerData`.

### NegosiasiRoomView (Creator) — aksi offer

- Tombol "Terima" / "Tolak" untuk offer aktif `pending`.
- Terima: `ensureCurrentConsent()` (T&C, `TosConsentProvider`) dulu, lalu `acceptOffer`. Toast "Penawaran diterima. Menyiapkan pesanan…"; order muncul asinkron lewat polling DTO (`awaiting_order` → `pending_payment`).
- Tolak: `rejectOffer`, toast "Penawaran ditolak.".

### Status di UI

- Status offer & tahap ruang ditampilkan dari `stage` DTO (`offer_pending`, `offer_rejected`, `awaiting_order`, lalu status order) — bukan dari state lokal.

## Service

- UMKM: `createOffer`, `deleteOffer` (`src/services/umkm/umkm-dashboard.service.ts` → `umkm-appwrite.service.ts`).
- Creator: `acceptOffer`, `rejectOffer` (`src/services/creator/*` → `creator-appwrite.service.ts`).
- Kontrak: `60_API.md`.
