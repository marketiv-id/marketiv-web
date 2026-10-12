# Rate Cards — API

## Service Layer (Client SDK)

CRUD rate card berjalan di browser via Appwrite Client SDK (Database). Service aktif di root repo: `src/services/creator/creator-dashboard.service.ts` (facade + mock) → `creator-appwrite.service.ts`, dan `src/services/umkm/umkm-appwrite.service.ts`. Semua mengembalikan `ServiceResult`.

> `00_BACKEND/src/services/creator.service.ts` (`createRateCard`, `updateRateCard`, `deleteRateCard`, `getRateCards`, `getRateCardById`, `getMyRateCards`) adalah implementasi **legacy** multi-paket yang tidak diimpor frontend. `updateRateCard` di sana masih delete-recreate paket (mengorphankan `packageId` order/offer). Jangan dipakai sebagai kontrak.

---

### Creator — Paket Saya

Input tulis bersama (`RateCardPackageWriteInput`): `{ name, description, output, deliveryDays, price, revisionLimit, published: boolean }` (divalidasi `rateCardPackageSchema` di UI).

#### `getCreatorRateCardPackages()` — [Client SDK]

- **Proses**: list `rate_cards` `creatorId = uid` (limit 100) → list `rate_card_packages` `rateCardId IN …`.
- **Return**: `CreatorRateCardPackage[]` `{ id, rateCardId, name, description, price, deliverable (= output), estimatedDays (= deliveryDays), status, revisionCount (= revisionLimit) }`.
- **Akses**: Creator (own, termasuk draft).

#### `createRateCardPackage(input)` — [Client SDK]

- **Validasi**: jumlah `rate_cards` milik Creator < 3, else `validation` "Maksimal 3 paket. Hapus satu paket dulu."
- **Proses**: create `rate_cards` `{ creatorId, title: name, description, status, createdAt }` lalu `rate_card_packages`; child gagal → hapus parent.
- **Permission baris**: `read(any)`, `update/delete(user:uid)`.
- **Akses**: Creator.

#### `updateRateCardPackage({ id, rateCardId }, input)` — [Client SDK]

- **Validasi**: rate card milik caller, else `forbidden` "Paket tidak ditemukan atau bukan milik Anda."
- **Proses**: update package in place; mirror `title` + `status` ke parent.
- **Akses**: Creator (owner).

#### `setRateCardPackageStatus({ id, rateCardId, base }, status)` — [Client SDK]

- **Proses**: owner check → update `rate_cards.status` (`draft|published`) → baca ulang package.
- **Akses**: Creator (owner).

#### `deleteRateCardPackage({ id, rateCardId })` — [Client SDK]

- **Validasi**: owner; tidak ada order `packageId = id` dengan status `pending_payment|escrow|in_progress|revision|approved` (else `validation` "…masih ada order berjalan. Jadikan Draft saja.").
- **Proses**: hapus package lalu rate card. 401/403 (baris lama tanpa permission delete) → `forbidden` dengan saran Jadikan Draft.
- **Akses**: Creator (owner). Status rate card tidak dibatasi.

---

### UMKM — Paket Creator

#### `getCreatorRateCards(creatorId)` — [Client SDK]

- **Proses**: wajib sesi login; list `rate_cards` `creatorId` + `status = published` (limit 100) → paket (limit 100).
- **Return**: `RateCardPackage[]` `{ id, creatorId, name, description, price, deliverable, estimatedDays, revisionLimit, status }`.
- **Akses**: user login (UMKM).

---

### Discovery Creator

Direktori & profil Creator memakai Function `get-creator-directory` / `get-creator-profile` (modul Users, lihat `../Users/60_API.md`). Kontribusi Rate Cards: `startingPrice` = harga paket termurah (> 0) dari rate card `published`. Filter & sort direktori dikerjakan di klien. `searchCreators({ minPrice, maxPrice, … })` di `00_BACKEND/src/services/user.service.ts` legacy dan tidak dipakai UI aktif.

---

## Appwrite Functions (Server-side)

Tidak ada Function yang menulis `rate_cards`/`rate_card_packages`. Function berikut **membaca** data rate card:

| Function | Pemakaian |
| --- | --- |
| `create-offer` | Validasi `packageId` (paket ada, milik Creator, parent `published`, else 422) + snapshot nama/harga ke offer |
| `get-creator-directory`, `get-creator-profile` | `startingPrice` dari paket published |
| `request-ratecard-revision`, `track-order-review` | Fallback `revisionLimit` paket bila order tanpa `offerId`/`revision_limit` |
| `get-umkm-ratecard-reviews` | `packageContext` (nama, deskripsi, output, deliveryDays, harga) untuk review UMKM |

---

## Lihat Juga

- [50_Database.md](50_Database.md) — skema data
- [30_Business_Rules.md](30_Business_Rules.md) — aturan validasi
