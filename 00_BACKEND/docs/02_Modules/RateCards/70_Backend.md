# Rate Cards — Backend

Kontrak pemanggilan dari frontend ada di [60_API.md](60_API.md). Modul ini tidak punya Function sendiri; CRUD lewat Client SDK dengan row permission.

## Aturan Backend

- **Kepemilikan** ditegakkan row permission (`update`/`delete` hanya `user:<creatorId>`) ditambah owner check di service. Collection mengizinkan `create("users")`, jadi role Creator dan batas 3 paket **hanya** dijaga service frontend — tidak ada guard server.
- **Visibilitas draft** hanya dijaga query `status = published` di service/Function; baris draft tetap `read("any")`.
- **Paket acuan offer** divalidasi server di `create-offer`: package ada → parent `rate_cards` ada → `creatorId` = Creator percakapan → `status = published`; gagal → 422. Env: `RATE_CARD_PACKAGES_COLLECTION_ID`, `RATE_CARDS_COLLECTION_ID`.
- **Harga mulai** (`startingPrice`) dihitung `get-creator-directory`/`get-creator-profile` dari paket `published` dengan `price > 0` (paket termurah). Env: `RATE_CARDS_COLLECTION_ID`, `RATE_CARD_PACKAGES_COLLECTION_ID`.
- **Batas revisi**: `request-ratecard-revision`/`track-order-review` memakai `rate_card_packages.revisionLimit` hanya sebagai fallback bila order tanpa `revision_limit` > 0 dan tanpa `offerId` (order dari aplikasi selalu punya `offerId`).
- **Integritas referensi**: update paket in place; hapus diblok bila ada order aktif dengan `packageId` tsb. Order/offer selesai tetap menyimpan `packageId` walau paket sudah dihapus (snapshot nama/harga tetap ada).
- **Fee** dipotong saat release escrow (seller-side) — `../Payments/70_Backend.md`.
- Filter platform tidak ada (MVP TikTok).
