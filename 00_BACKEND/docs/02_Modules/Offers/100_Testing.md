# Offers — Testing

Test Function ada di `00_BACKEND/tests/integration/functions.test.ts`; frontend di `src/lib/negotiation/__tests__/deal-stage.test.ts` dan `src/components/features/umkm-dashboard/negotiation/detail/__tests__/`. Item bertanda *(belum ada test)* perlu ditambahkan.

## `create-offer`

- UMKM pemilik conversation → `offers` status `pending`, row `read` kedua pihak + `update` creator + `delete` UMKM; pesan `offer` terbuat; conversation `last_message`/`offer_id` diperbarui.
- `packageId` valid (paket creator, rate card `published`) → snapshot `packageNameSnapshot`/`packagePriceSnapshot`, harga offer tetap dari body. ✅ test
- `packageId` milik creator lain / tidak published / tidak ada → `422`, tidak ada offer. ✅ test
- Order terbaru `pending_payment`/`escrow`/`in_progress`/`revision`/`approved` → `409` deal aktif. ✅ test
- Offer terbaru `pending` → `409` menunggu jawaban; `accepted` tanpa order → `409` deal aktif. ✅ test
- Order sebelumnya `completed`/`cancelled` → offer baru `pending` dibuat, order lama tidak berubah. ✅ test
- Offer #2 tampil sebagai `offer_pending`, lalu Order #2 terpisah dibuat sementara Order #1 tetap `completed`. ✅ test
- Caller creator / bukan `umkm_id` conversation → `403`; akun non-active → `403`. *(belum ada test)*
- Validasi `400`: title kosong/>255, description >2000, deadline kosong/invalid/lampau, price bukan integer 1..999.999.999, revisionLimit bukan integer ≥0, `creatorId` body tidak cocok. *(belum ada test)*
- Gagal menulis pesan offer → offer tetap dibuat, respons `200`.

## Accept / Reject (Client SDK)

- Creator penerima accept → `status = accepted`; non-creator → `forbidden`; status bukan `pending` → `validation` (cek klien).
- Creator reject → `status = rejected`.
- UMKM tidak bisa update offer (tidak punya row `update`).

## Tarik Offer

- UMKM hapus offer `pending` → row terhapus; offer non-`pending` → ditolak di klien.

## `create-order` (dari offer)

- Offer `accepted` + creator setuju T&C terbaru → satu order `pending_payment`, `amount = price`. ✅ test
- Provenance paket disalin ke order; harga tetap harga offer. ✅ test
- Status bukan `accepted`/`rejected` → `ignored`. ✅ test
- Update offer `accepted` lagi → tetap satu order (`already_exists`). *(belum ada test)*
- Creator belum setuju T&C → order tidak dibuat, UMKM dapat `order_tos_blocked`. *(belum ada test)*
- Offer `rejected` → UMKM dapat `offer_rejected`. *(belum ada test)*

## Frontend

- `canStartNewDeal` hanya mengizinkan `chatting`, `offer_rejected`, `completed`, `cancelled`. ✅ test
- Prefill paket dari `?packageId` hanya saat tidak ada deal aktif. ✅ test (`NegotiationRoomPage.package-prefill.test.tsx`)
