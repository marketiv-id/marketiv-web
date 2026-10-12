# Offers — Backend

Dokumen ini khusus untuk Appwrite Functions dan aturan backend. Kontrak request/response dibahas di [60_API.md](60_API.md).

## Kenapa `create-offer` Harus Function

- Row `offers` harus bisa dibaca dan di-update creator, sedangkan klien tidak boleh memasang permission untuk user lain; tabel `offers` tidak punya `read` level tabel.
- Pesan `offer` dan update conversation juga butuh API key (lihat `../Chat/70_Backend.md`).

## Appwrite Functions

### create-offer

- **Konfigurasi**: HTTP, `execute: ["users"]`, scopes `documents.read`, `documents.write`, timeout 15s, runtime `node-22`. `path: "functions"`, entrypoint `create-offer/src/main.js` (impor `_shared/require-active-role.js`).
- **Guard**: `requireActiveRole(umkm)` → caller = `conversation.umkm_id` → tidak ada offer `pending` → tidak ada deal aktif → paket valid (opsional).
- **Deal aktif** (`loadConversationDealState`): ambil semua offer conversation, semua order dengan `offerId` di antara offer tersebut; pilih terbaru via `$createdAt`. Blok jika offer terbaru `accepted` tanpa order, atau order terbaru bukan `completed`/`cancelled`.
- **Paket** (`resolvePackageContext`): `rate_card_packages` → `rate_cards` induk; wajib `rateCard.creatorId = creator` dan `status = published`. Snapshot `name` & `price`.
- **Urutan tulis**: offer dulu, baru pesan chat + update conversation. Kegagalan pesan/conversation hanya di-log; offer tetap sah dan tetap muncul di DTO.
- **Env**: endpoint/project/key standar, `APPWRITE_DATABASE_ID`|`NEXT_PUBLIC_DB_ID`, `USERS_COLLECTION_ID`, `CONVERSATIONS_COLLECTION_ID`|`NEXT_PUBLIC_CONVERSATION_COLLECTION`, `MESSAGES_COLLECTION_ID`, `OFFERS_COLLECTION_ID`, `ORDERS_COLLECTION_ID`|`NEXT_PUBLIC_ORDER_COLLECTION`, `RATE_CARDS_COLLECTION_ID`, `RATE_CARD_PACKAGES_COLLECTION_ID` (semua punya default nama tabel).

### create-order (bagian offer)

Function milik modul Orders; ringkasan perilaku terhadap offer:

- **Trigger**: event `databases.<db>.tables.offers.rows.*.update`, `execute: []`, scopes `documents.read`, `documents.write`.
- **Status `rejected`** → notifikasi UMKM `{ type: "offer_rejected", title: "Penawaran Ditolak" }`. Return `{ status: "notified" }`.
  - Catatan implementasi: cek status akun (`users.status != active`) saat ini berada di cabang `rejected` — jika UMKM/creator non-active, yang terkirim notifikasi `order_blocked_umkm_suspended` / `order_blocked_creator_suspended` (tipe `system`) dan return `ignored`, bukan `offer_rejected`. Cabang `accepted` tidak memeriksa status akun.
- **Status selain `accepted`/`rejected`** → `{ status: "ignored" }`.
- **Status `accepted`**:
  - Cek T&C creator: `users.tos_version = CURRENT_TOS_VERSION` (default `v3.1`) dan `tos_accepted_at` terisi. Gagal → notifikasi UMKM `order_tos_blocked`, return `{ status: "blocked" }`, tanpa order.
  - Buat `orders` `{ offerId, creatorId, umkmId, packageId?, packageNameSnapshot?, packagePriceSnapshot?, amount: price, status: "pending_payment" }`, row `read` UMKM + creator.
  - Unique `idx_offerId` konflik → `{ status: "already_exists" }`.
  - Notifikasi UMKM `{ type: "order_created", title: "Penawaran Diterima" }`.
- Notifikasi memakai ID deterministik `ntf` + `sha256("{sourceId}:{kind}")`; kegagalan notifikasi tidak menggagalkan order.
- Tidak membaca status sebelumnya (event tidak membawa `$previous`); hanya status akhir.

## Aturan Backend

- Hanya UMKM aktif pemilik conversation yang dapat membuat offer; peserta diambil dari conversation, bukan body.
- Maks satu offer `pending` per conversation; tidak ada deal paralel.
- Accept/reject/hapus memakai row permission; validasi `status = pending` hanya di klien (tidak ada Function guard).
- `amount` order = `offer.price`.
