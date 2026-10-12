# Offers — API

## Appwrite Functions

### `create-offer` — [Appwrite Function] (dipanggil frontend)

- **Method**: POST, `execute: ["users"]`. Caller dari `x-appwrite-user-id`.
- **Input**:

```json
{
  "conversationId": "string (wajib)",
  "creatorId": "string (opsional, harus = conversation.creator_id)",
  "packageId": "string (opsional)",
  "title": "string ≤255",
  "description": "string ≤2000 (opsional)",
  "price": "integer 1..999999999",
  "deadline": "string tanggal ISO, tidak sebelum hari ini (UTC)",
  "revisionLimit": "integer ≥0"
}
```

- **Proses**:

```text
validasi body
↓
requireActiveRole(umkm)
↓
load conversation; caller harus umkm_id
↓
tolak jika ada offer pending di conversation
↓
tolak jika ada deal aktif (offer accepted tanpa order / order terbaru belum completed|cancelled)
↓
validasi packageId (opsional) → snapshot nama & harga paket
↓
offers.create (status pending, createdAt now; read UMKM+creator, update creator, delete UMKM)
↓
messages.create tipe offer "Penawaran Khusus: {title}" (read+update kedua participant)
+ conversations.update last_message, last_message_at, offer_id  (gagal = hanya log)
```

- **Return**: `{ offerId }`.
- **Errors**:
  - `401 Unauthorized`.
  - `400` validasi: `Percakapan tidak valid.`, `Judul penawaran wajib diisi.`, `Judul maksimal 255 karakter.`, `Deskripsi maksimal 2000 karakter.`, `Deadline wajib diisi.`, `Format deadline tidak valid.`, `Deadline harus di masa depan.`, `Harga tidak valid.`, `Jumlah revisi tidak valid.`; `Kreator tidak sesuai dengan percakapan.`
  - `404 Profil Pengguna tidak ditemukan.` / `404 Percakapan tidak ditemukan.`
  - `403 Akun Anda sedang tidak aktif.` / `Hanya UMKM yang dapat mengirim penawaran.` / `Hanya UMKM dalam percakapan ini yang dapat mengirim penawaran.`
  - `409 Masih ada penawaran yang menunggu jawaban kreator. …`
  - `409 Masih ada kerja sama aktif dengan kreator ini. …`
  - `422 Paket acuan tidak valid, bukan milik kreator ini, atau tidak lagi dipublikasikan.`
  - `405` non-POST, `500` lainnya.
- **Akses**: UMKM aktif pemilik conversation.

### `create-order` — [Appwrite Function] (event, server-side)

- Dipicu update row `offers`; tidak dipanggil frontend. Lihat `70_Backend.md` dan `90_Events.md`.

---

## Service Layer — Client SDK

### `acceptOfferInAppwrite(offerId)` / `rejectOfferInAppwrite(offerId)` — [Client SDK] (`src/services/creator/creator-appwrite.service.ts`)

- **Proses**: `getDocument(offers)` → cek `creatorId = user` dan `status = pending` (klien) → `updateDocument(offers, { status: "accepted" | "rejected" })`.
- **Errors**: `forbidden` "Hanya kreator penerima yang dapat menjawab penawaran ini."; `validation` "Penawaran ini sudah dijawab sebelumnya."
- **Efek**: event update memicu `create-order` secara **asinkron**; order tidak langsung ada setelah accept.
- **Akses**: creator penerima (row `update`).

### `deleteOfferInAppwrite(offerId)` — [Client SDK] (`src/services/umkm/umkm-appwrite.service.ts`)

- **Proses**: list `offers` `$id = offerId` & `umkmId = user` → cek `status = pending` → `deleteDocument`.
- **Errors**: `not_found` "Penawaran tidak ditemukan."; `validation` "Hanya penawaran yang belum direspons yang bisa dihapus."
- **Akses**: UMKM pembuat (row `delete`).

### `createOfferInAppwrite(input)` — (`src/services/umkm/umkm-appwrite.service.ts`)

- Validasi Zod `createOfferSchema` lalu memanggil Function `create-offer`. Return `offerId`.

### Legacy `00_BACKEND/src/services/offer.service.ts`

- `createOffer` masih menulis `offers` langsung dari Client SDK dengan permission untuk user lain — ditolak Appwrite; tidak dipakai frontend. Jalur resmi: Function `create-offer`.
- `acceptOffer`, `rejectOffer`, `deleteOffer`, `getOffers`, `getOfferById` — Client SDK, setara dengan service frontend.

---

## Field Offer di DTO Negosiasi

`get-umkm-negotiations` / `get-creator-negotiations` (lihat `../Chat/60_API.md`) memakai offer `$createdAt` terbaru per conversation:

- `offerId`, `offerStatus`, `stage` (lihat `30_Business_Rules.md`).
- `projectTitle` = `offer.title` || nama paket order; `scope` = `offer.description` || deskripsi paket; `deadline`; `revisionCount` = `offer.revisionLimit` || `package.revisionLimit`.
- `packageContext` = `{ id, name, basePrice }` dari snapshot order/offer (jika `packageId` + `packageNameSnapshot` ada).
- `finalPrice` = `order.amount` jika order ada, selain itu `offer.price`.
- UMKM: `platformFee = 0`, `totalAmount = finalPrice`. Creator: `platformFee = floor(finalPrice × FEE_RATE)` (default `0.02`), `totalAmount = finalPrice − platformFee` (ADR-008, seller-side).
- `orderId`, `orderStatus`, `escrowStatus`, `deliverables`, `submittedCollabUrl`, `deliverableValidation` — dari order terkait (modul Orders/Payments).

---

## Lihat Juga

- [50_Database.md](50_Database.md) — skema data
- [30_Business_Rules.md](30_Business_Rules.md) — aturan validasi
- [90_Events.md](90_Events.md) — event trigger flow
