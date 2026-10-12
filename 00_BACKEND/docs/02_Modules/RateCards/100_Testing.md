# Rate Cards — Testing

Service yang diuji: `src/services/creator/creator-appwrite.service.ts` (CRUD paket), `src/services/umkm/umkm-appwrite.service.ts` (`getCreatorRateCardsFromAppwrite`), validasi `src/lib/validations/rate-card.schema.ts`, Function `create-offer` (paket acuan), `get-creator-directory`/`get-creator-profile` (`startingPrice`).

## Validasi Input (`rateCardPackageSchema`)

- `name` kosong / > 100 → error.
- `description` atau `output` kosong / > 2000 → error.
- `deliveryDays` < 1 atau bukan integer → error.
- `price` < 1.000, ≤ 0, atau desimal → error.
- `revisionLimit` < 0 atau desimal → error; 0 diterima.

## Create Paket

- Creator dengan < 3 paket → `rate_cards` (status sesuai toggle, `title` = nama) + `rate_card_packages` terbuat, permission `read(any)` + `update/delete` owner.
- Creator dengan 3 paket → `validation` "Maksimal 3 paket. Hapus satu paket dulu."
- Create child gagal → parent dihapus, error dikembalikan.

## Update & Status

- Owner update → package di-update in place (ID tetap), parent `title`/`status` ikut.
- Bukan owner → `forbidden` "Paket tidak ditemukan atau bukan milik Anda."
- Toggle status → hanya `rate_cards.status` berubah.

## Hapus

- Tanpa order aktif → package lalu rate card terhapus (draft maupun published).
- Ada order `packageId` berstatus `pending_payment|escrow|in_progress|revision|approved` → `validation`, tidak ada yang terhapus.
- Baris lama tanpa permission delete → `forbidden` dengan saran Jadikan Draft.

## Akses & Visibilitas

- Creator A tidak bisa update/hapus paket Creator B (row permission + owner check).
- `getCreatorRateCards(creatorId)` hanya mengembalikan paket dari rate card `published`.
- Draft tidak dihitung `startingPrice` di direktori/profil.

## Paket sebagai Acuan Offer (`create-offer`)

- `packageId` valid milik Creator lawan bicara & published → offer berisi `packageId` + snapshot nama/harga.
- Paket tidak ada / milik Creator lain / parent draft → 422.
- Harga offer bebas dari harga paket (snapshot hanya provenance).

## Discovery (`get-creator-directory`)

- Creator dengan paket published → `startingPrice` = harga termurah (> 0).
- Creator tanpa paket published → `startingPrice` 0, tetap tampil di direktori (direktori hanya menyaring `creator_profiles.isProfileCompleted = true`, bukan kepemilikan rate card).
- Sort "Harga Terendah" di klien memakai `startingPrice`.

> `tests/integration/functions.test.ts` masih memuat suite `user.service searchCreators price filter (rate_card_packages)` untuk service legacy `searchCreators` (filter `minPrice`/`maxPrice` via `rate_card_packages.price`); service itu tidak dipakai UI aktif.
