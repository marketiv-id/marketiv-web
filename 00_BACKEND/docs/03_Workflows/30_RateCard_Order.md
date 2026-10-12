# Workflow: Rate Card Order (Escrow)

> **Diverifikasi terhadap kode: 2026-10-12.** Sumber kebenaran:
> `00_BACKEND/functions/{create-conversation,send-message,send-chat-notification,create-offer,create-order,create-payment,midtrans-webhook,create-escrow,cancel-order,cancel-payment,validate-and-upload,submit-ratecard-deliverable,track-order-review,notify-order-activity,get-admin-ratecard-deliverable-queue,review-ratecard-deliverable,request-ratecard-revision,auto-approve-orders,release-escrow,reconcile-release-escrow,refund-order,refund-escrow,sync-order-revision}`,
> `src/services/{umkm,creator,shared}/*-appwrite.service.ts`, trigger di `00_BACKEND/appwrite.config.json`.

## Purpose

Pesanan rate card berbasis escrow: UMKM menemukan kreator → ruang negosiasi (chat) → Custom Offer (boleh berangkat dari paket rate card) → kreator menerima → order → pembayaran Midtrans → escrow `held` → deliverable → validasi Admin + persetujuan UMKM (atau auto-approve) → release escrow ke wallet kreator dikurangi fee seller-side.

## Modules Involved

- [RateCards](../02_Modules/RateCards/00_Index.md) — discovery kreator & paket (provenance offer).
- [Chat](../02_Modules/Chat/00_Index.md) — `conversations`, `messages`.
- [Offers](../02_Modules/Offers/00_Index.md) — custom offer, accept/reject.
- [Orders](../02_Modules/Orders/00_Index.md) — aggregate order, deliverable, revisi, review timer.
- [Users](../02_Modules/Users/00_Index.md) — file manager & kuota (deliverable `storage`).
- [Payments](../02_Modules/Payments/00_Index.md) — Midtrans, escrow, wallet, ledger, refund.
- [Notifications](../02_Modules/Notifications/00_Index.md) — notifikasi tiap tahap.

## Trigger

UMKM membuka profil kreator (`get-creator-directory` / `get-creator-profile`) lalu memulai negosiasi, baik dari tombol chat maupun dari paket rate card (ruang negosiasi dibuka dengan `?packageId=`).

> **Satu jalur saja.** "Direct Order" (bayar paket tanpa offer & tanpa persetujuan kreator) **belum diimplementasikan**: `orders` tanpa permission create dari browser dan satu-satunya pembuat order adalah `create-order` yang dipicu offer `accepted`. Memilih paket hanya mengisi offer awal dengan `packageId` sebagai provenance.

## Data Model — Collection yang Terlibat

> `orders`, `deliverables`, `revisions`, `ratecard_deliverable_validations`, `escrows`, `payments`, `transactions`, `wallets` tidak punya permission level koleksi (`$permissions: []`, rowSecurity). Semua create lewat Function; akses baris: `deliverables` → read kreator + UMKM, update UMKM saja; `revisions` → read UMKM + kreator.

| Collection | Aksi | Ditulis oleh |
|---|---|---|
| `conversations` | insert (unique `idx_umkm_creator`) | `create-conversation` |
| `messages` | insert | `send-message`, `create-offer` (kartu offer) |
| `offers` | insert `pending`; update `accepted`/`rejected`; delete (tarik) | `create-offer`; browser kreator (update); browser UMKM (delete) |
| `orders` | insert `pending_payment`; update status/timer | `create-order`, `create-escrow`, `cancel-order`, `request-ratecard-revision`, `track-order-review`, `auto-approve-orders`, `release-escrow`, `reconcile-release-escrow` |
| `payments` | insert `pending` → terminal | `create-payment`, `midtrans-webhook` |
| `escrows` | insert `held` (+`fee_rate` snapshot) → `releasing` → `released` \| `refunded` | `create-escrow`, `release-escrow`, `reconcile-release-escrow`, `refund-order`, `refund-escrow` |
| `deliverables` | insert `submitted` (versi n+1); update `approved`/`revision_requested` | `submit-ratecard-deliverable`; browser UMKM (approve); `request-ratecard-revision`; `auto-approve-orders` |
| `ratecard_deliverable_validations` | insert `valid`/`invalid` (final, satu per deliverable) | `review-ratecard-deliverable` |
| `revisions` | insert `open` (id deterministik per deliverable) | `request-ratecard-revision` |
| `user_files`, `user_storage_usage` | insert / update kuota | `validate-and-upload` |
| `wallets` | `balance += creatorAmount` (atomik) | `release-escrow`; refund → wallet UMKM |
| `transactions` | ledger `payment`, `release`, `fee`, `refund` | `create-escrow`, `release-escrow`, `refund-order`/`refund-escrow` |
| `notifications` | insert | Functions |

## Step-by-step Flow

### Tahap 1: Negosiasi & Offer

1. **Chat** — UMKM memanggil `create-conversation` `{ creatorId }` (UMKM aktif; idempoten per pasangan).
2. **Chat** — Pesan lewat `send-message` (peserta percakapan). **Event `messages.rows.*.create`** → `send-chat-notification` (notifikasi "Pesan chat baru" ke lawan bicara; kartu offer → "Offer baru dikirim di chat.").
3. **Offers** — UMKM memanggil `create-offer` `{ conversationId, title, description, price, deadline, revisionLimit, packageId? }`:
   - UMKM aktif dan pemilik percakapan; peserta diturunkan dari `conversations`, bukan body.
   - Tolak bila masih ada offer `pending`, offer `accepted` yang belum jadi order, atau order non-terminal (selain `completed`/`cancelled`) di percakapan.
   - `packageId` opsional: paket harus milik kreator lawan bicara dan rate card `published`; disimpan `packageNameSnapshot`/`packagePriceSnapshot`. Harga final = `price` offer.
   - Offer `pending` (read UMKM+kreator, update kreator, delete UMKM) + pesan `message_type: "offer"`.
4. **Offers** — UMKM dapat menarik offer `pending` (delete baris). Kreator menjawab langsung dari browser: `updateDocument(offers, { status: "accepted" | "rejected" })` (guard klien: kreator penerima & status `pending`).

### Tahap 2: Order

5. **Event `offers.rows.*.update`** → `create-order`:
   - `rejected` → notifikasi `offer_rejected` ke UMKM. Selesai.
   - `accepted` → kreator wajib sudah setuju T&C aktif; bila belum, order tidak dibuat dan UMKM menerima `order_tos_blocked`.
   - Buat `orders` `{ offerId, creatorId, umkmId, packageId?, packageNameSnapshot?, packagePriceSnapshot?, amount: offer.price, status: "pending_payment" }` (read UMKM + kreator). Unique index `idx_offerId` mencegah order ganda.
   - Notifikasi `order_created` ke UMKM ("Penawaran Diterima … selesaikan pembayaran").
6. **Orders** — Sebelum bayar, UMKM boleh `cancel-order` (UMKM aktif, pemilik, status `pending_payment` → `cancelled`). Tanpa efek finansial.

### Tahap 3: Pembayaran & Escrow

7. **Payments** — `create-payment` `{ purpose: "order", orderId, amount, finishUrl? }`:
   - Akun aktif; pemilik order; `amount === order.amount`; order `pending_payment`; **tanpa** fee buyer-side (`fee_amount = 0`).
   - Payment `paid` sudah ada → 409 `payment_already_paid`; payment `pending` → Snap lama dipakai ulang (`reused: true`) atau 409 `payment_preparing`.
   - Lock `order_payment_key = "order:<orderId>"` (unik) mencegah dua payment aktif; `gateway_reference = "ord-<paymentId>"`.
   - `cancel-payment` menolak membatalkan payment order (`gateway_cancellation_required`) — lock hanya dilepas status terminal dari webhook.
8. **Payments** — `midtrans-webhook` → `payments.status: pending → paid` (atau `failed|expired|cancelled`, yang juga melepas `order_payment_key`).
9. **Frontend** — URL kembali Midtrans membuka ruang negosiasi dengan `payment_return=1`; UI hanya menyatakan berhasil setelah DTO negosiasi dari server menunjukkan order `in_progress`.
10. **Event `payments.rows.*.update`** → `create-escrow` (cabang `purpose = "order"`):
    - `escrows` `{ orderId, amount, status: "held", fee_rate: FEE_RATE }` (idempoten per `orderId`). Tabel `wallets` tidak punya `escrowBalance`; baris escrow adalah satu-satunya catatan dana tertahan.
    - Ledger deterministik `{ userId: umkmId, type: "payment", referenceType: "order", referenceId: orderId, status: "completed" }`.
    - `orders.status → in_progress`.
    - Notifikasi `escrow_held_umkm` ("Pembayaran Berhasil") dan `escrow_held_creator` ("Pesanan Siap Dikerjakan").

### Tahap 4: Deliverable

11. **Orders** — Kreator mengirim deliverable lewat `submit-ratecard-deliverable` `{ orderId, source, fileUrl, fileId?, notes? }`:
    - Caller = `orders.creatorId`; order `in_progress` atau `revision`; `fileUrl` wajib `https`.
    - `source: "storage"` → berkas `user_files` milik kreator, `active`, dan sudah dibagikan ke UMKM. Unggahan memakai `validate-and-upload` dengan `shareWithOrderId` (Function menurunkan UMKM dari order lalu memberi `Permission.read`); terikat kuota (`Storage quota exceeded` → 409).
    - `source: "external_url"` → bebas kuota.
    - Buat `deliverables` `{ orderId, source, fileUrl, fileId, notes, version: n+1, status: "submitted" }` dengan id deterministik `(orderId, version)`.
12. **Event `deliverables.rows.*.create`**:
    - `notify-order-activity` → notifikasi `deliverable_submitted` ke UMKM.
    - `track-order-review` → bila order `in_progress|revision` dan deliverable terbaru masih `submitted`: `review_deadline_at = deliverable.$createdAt + 3 hari`, `revision_count`, `revision_limit` (dari offer/paket), `reminder_sent_at = null`, dan `revision → in_progress`.

### Tahap 5: Validasi Admin & Review UMKM

13. **Admin Marketiv** — Antrean `get-admin-ratecard-deliverable-queue` (deliverable `submitted`, versi terbaru, belum divalidasi, order `in_progress|revision`).
14. **Admin Marketiv** — `review-ratecard-deliverable` `{ deliverableId, decision: valid|invalid, notes }`: Admin aktif; deliverable `submitted` & versi terbaru; satu keputusan final per deliverable (immutable) dengan snapshot `orderId`, `deliverableVersion`, `sourceSnapshot`, `evidenceUrlSnapshot`. `invalid` wajib catatan. Notifikasi `ratecard_validation_<decision>` ke kreator dan UMKM. Review manual — tanpa verifikasi otomatis Instagram/TikTok.
15. **Orders** — UMKM memeriksa hasil kerja lalu:
    - **Approve** — browser `updateDocument(deliverables, { status: "approved" })` (permission baris hanya UMKM pemilik). Tidak langsung mencairkan dana; lihat Tahap 6.
    - **Minta revisi** — `request-ratecard-revision` `{ orderId, message }`: UMKM aktif & pemilik; order `in_progress|revision`; deliverable terbaru `submitted`; jumlah `revisions` < `revisionLimit` (order → offer/paket → default 3). Buat `revisions` `open` (id deterministik per deliverable), deliverable `submitted → revision_requested`, order → `revision`, `review_deadline_at`/`reminder_sent_at` direset.
16. **Event `revisions.rows.*.create`** → `notify-order-activity` (notifikasi `revision_requested` berisi pesan revisi ke kreator). Kreator mengunggah versi baru → kembali ke langkah 11.
17. Validasi `invalid` tidak mengubah status deliverable; kreator diharapkan mengirim versi baru.

### Tahap 6: Release Escrow

18. **Event `deliverables.rows.*.update`** atau **`ratecard_deliverable_validations.rows.*.create`** → `release-escrow`. Function memuat ulang state dan hanya merilis bila semuanya benar:
    - order `in_progress|revision`; deliverable `approved` dan versi terbaru;
    - validation `valid` yang snapshot-nya cocok dengan deliverable;
    - escrow untuk order berstatus `held|releasing` (`released` → `already_released`).
    Urutan dua event tidak penting: siapa pun yang datang terakhir (approve UMKM atau keputusan Admin) memicu rilis.
19. **Payments** — Rilis (fee seller-side, ADR-008):
    - `escrows.status → releasing`.
    - `rate = escrow.fee_rate || 0.02`; `feeAmount = floor(amount × rate)`; `creatorAmount = amount − feeAmount`.
    - Ledger deterministik per `(escrowId, "escrow", type)`: `release` (`creatorAmount`) dan `fee` (`feeAmount`, bila > 0), dibuat `processing`.
    - Selama ledger `release` belum `completed`: `wallets.balance += creatorAmount` (atomik) lalu ledger → `completed`; ledger `fee` → `completed`.
    - `orders.status → completed`; `escrows.status → released`.
    - Notifikasi `escrow_released_creator` ("Dana Sudah Cair", nominal bersih + potongan fee) dan `escrow_released_umkm` ("Pesanan Selesai").
20. **Cron `*/15 * * * *`** → `reconcile-release-escrow`: escrow `releasing` yang ledger `release` (+`fee`) sudah `completed` difinalkan (`released` + order `completed`); sisanya dilaporkan sebagai `unresolved` (tidak dikredit ulang).

### Tahap 7: Auto-Approve & Reminder

21. **Cron `0 * * * *`** → `auto-approve-orders`:
    - Deliverable `submitted` dengan order `in_progress|revision` dan `now ≥ review_deadline_at` → deliverable `approved`, `orders.auto_approved = true`, notifikasi UMKM "Pesanan Otomatis Disetujui". Event update deliverable memicu `release-escrow`, yang tetap mensyaratkan validasi Admin `valid`.
    - Reminder H-1: order `in_progress|revision` dengan `review_deadline_at ≤ now + 24 jam` dan `reminder_sent_at` kosong → isi `reminder_sent_at`, notifikasi UMKM "Tenggat Review H-1".

### Tahap 8: Pembatalan & Refund

22. Order `pending_payment` → `cancel-order` (lihat langkah 6).
23. Order sudah dibayar: **tidak ada aksi pembatalan di aplikasi**. Refund dilakukan Admin di luar UI:
    - mengubah order menjadi `cancelled` (atau `expired`) → **event `orders.rows.*.update`** → `refund-order` merefund escrow `held` ke wallet UMKM; atau
    - memanggil manual `refund-order` `{ orderId }` / `refund-escrow` `{ escrowId | orderId }` (`execute: []`).
    - Refund: escrow `held → refunded` lebih dulu, ledger `{ type: "refund", referenceType: "escrow" }`, `wallets(UMKM).balance += escrow.amount` (tanpa potongan), notifikasi `refund_escrow`.

## State Transitions

```text
OFFER:        pending → accepted | rejected   (atau dihapus UMKM saat pending)
ORDER:        pending_payment → in_progress ⇄ revision → completed
              pending_payment → cancelled (cancel-order)
              in_progress|revision → cancelled|expired (hanya manual Admin) → refund
PAYMENT:      pending → paid | failed | expired | cancelled
ESCROW:       held → releasing → released
              held → refunded
DELIVERABLE:  submitted → approved | revision_requested
VALIDATION:   valid | invalid (final, satu per deliverable)
REVISION:     open (tidak ada penulis status lain di kode)
```

## Events / Functions

| Trigger | Function | Aksi |
|---|---|---|
| HTTP (UMKM) | `create-conversation` | Buka/ambil percakapan |
| HTTP (peserta) | `send-message` | Kirim pesan |
| `messages.rows.*.create` | `send-chat-notification` | Notifikasi chat/offer |
| HTTP (UMKM) | `create-offer` | Offer `pending` + kartu chat |
| `offers.rows.*.update` | `create-order` | Order dari offer `accepted`; notif tolak |
| HTTP (UMKM) | `cancel-order` | `pending_payment → cancelled` |
| HTTP (UMKM) | `create-payment` | Payment order + Snap |
| HTTP publik | `midtrans-webhook` | Update `payments.status` |
| `payments.rows.*.update` | `create-escrow` | Escrow `held`, order `in_progress` |
| HTTP (Creator) | `validate-and-upload` | Unggah berkas + share ke UMKM |
| HTTP (Creator) | `submit-ratecard-deliverable` | Deliverable versi baru |
| `deliverables.rows.*.create` | `notify-order-activity`, `track-order-review` | Notif UMKM; set timer review 3 hari |
| HTTP (Admin) | `get-admin-ratecard-deliverable-queue`, `review-ratecard-deliverable` | Antrean & validasi final |
| HTTP (UMKM) | `request-ratecard-revision` | Revisi sinkron |
| `revisions.rows.*.create` | `notify-order-activity` | Notif kreator |
| `deliverables.rows.*.update`, `ratecard_deliverable_validations.rows.*.create` | `release-escrow` | Rilis escrow |
| Cron `0 * * * *` | `auto-approve-orders` | Auto-approve + reminder H-1 |
| Cron `*/15 * * * *` | `reconcile-release-escrow` | Finalisasi escrow `releasing` |
| `orders.rows.*.update` | `refund-order` | Refund escrow saat order `cancelled|expired` |
| Manual (`execute: []`) | `refund-escrow`, `refund-order` | Refund manual |
| — (disabled, tanpa event) | `sync-order-revision` | Legacy; digantikan `request-ratecard-revision` |

Event Appwrite tidak mengirim `$previous`, jadi Function memeriksa status akhir. Idempotensi: unique `orders.idx_offerId`, escrow per `orderId`, ledger/notifikasi ber-id deterministik, guard status escrow.

## Validation Rules per Langkah

| Langkah | Validasi | Gagal → |
|---|---|---|
| Buka percakapan | UMKM aktif; bukan diri sendiri | 403 / 400 |
| Offer | UMKM aktif & pemilik percakapan; tidak ada offer pending/deal aktif; paket valid (opsional) | 403 / 409 / 422 |
| Jawab offer | Kreator penerima; offer `pending` (guard klien) | Error |
| Create order | Offer `accepted`; kreator setuju T&C aktif | Order tidak dibuat + notif UMKM |
| Payment | Akun aktif; pemilik; `amount === order.amount`; order `pending_payment`; satu payment aktif | 403 / 409 |
| Upload deliverable | Caller kreator order; order `in_progress|revision`; `https`; berkas storage dibagikan | 403 / 409 / 400 |
| Validasi Admin | Admin aktif; deliverable `submitted` & terbaru; belum divalidasi; `invalid` wajib catatan | 403 / 409 / 400 |
| Approve UMKM | Permission baris (UMKM pemilik) | 401/403 Appwrite |
| Revisi | UMKM aktif & pemilik; deliverable terbaru `submitted`; kuota revisi | 403 / 404 / 409 |
| Release | Order `in_progress|revision`; deliverable approved & terbaru; validation `valid` cocok; escrow `held|releasing` | `status: "ignored"` |
| Refund | Order `cancelled|expired`; escrow `held` | `status: "ignored"` |

## Notifikasi

Semua notifikasi Function memakai id deterministik `(sourceId, kind)`; event ulang menghasilkan 409, bukan notifikasi ganda. Kegagalan notifikasi tidak menggagalkan Function pemanggil.

| Titik | Kind / Judul | Penerima | Ditulis oleh |
|---|---|---|---|
| Pesan / kartu offer | "Pesan chat baru" | Lawan bicara | `send-chat-notification` |
| Offer diterima → order | `order_created` | UMKM | `create-order` |
| Offer ditolak | `offer_rejected` | UMKM | `create-order` |
| Order diblokir T&C | `order_tos_blocked` | UMKM | `create-order` |
| Escrow terkunci | `escrow_held_umkm`, `escrow_held_creator` | UMKM, Kreator | `create-escrow` |
| Deliverable masuk | `deliverable_submitted` | UMKM | `notify-order-activity` |
| Validasi Admin | `ratecard_validation_valid|invalid` (+`_umkm`) | Kreator, UMKM | `review-ratecard-deliverable` |
| Revisi diminta | `revision_requested` | Kreator | `notify-order-activity` |
| Reminder review H-1 | "Tenggat Review H-1" | UMKM | `auto-approve-orders` |
| Auto-approve | "Pesanan Otomatis Disetujui" | UMKM | `auto-approve-orders` |
| Escrow dirilis | `escrow_released_creator` (nominal bersih + fee), `escrow_released_umkm` | Kreator, UMKM | `release-escrow` |
| Refund | `refund_escrow` | UMKM | `refund-order` / `refund-escrow` |
| Order dibatalkan (`cancel-order`) | **Belum diimplementasikan** | — | — |

## Edge Cases

- **Cancel sebelum bayar** — `cancel-order`; payment Midtrans `pending` tetap aktif di gateway dan tidak bisa dibatalkan lokal.
- **Cancel/sengketa setelah bayar** — tidak ada fitur sengketa di aplikasi; hubungi Admin via WhatsApp (lihat [60_Dispute](60_Dispute.md)). Admin merefund manual.
- **Batas revisi habis** — `request-ratecard-revision` 409; UMKM menyetujui apa adanya atau menghubungi Admin.
- **Kuota storage penuh** — `validate-and-upload` 409; kreator hapus berkas atau pakai `external_url`.
- **Validasi Admin `invalid`** — deliverable tetap `submitted` sampai versi baru dikirim; auto-approve tetap bisa menyetujuinya, tetapi `release-escrow` tidak merilis tanpa validation `valid`.
- **Kreator tidak mengirim deliverable** — tidak ada deadline otomatis untuk order; penanganan manual oleh Admin.
- **Release terputus** — escrow tertahan di `releasing`; retry event melanjutkan kredit selama ledger `release` masih `processing`; `reconcile-release-escrow` hanya memfinalkan yang ledger-nya sudah `completed`.
- **Partial deliverable** — tidak didukung; satu order = satu rangkaian versi deliverable.

## Links

- [Orders](../02_Modules/Orders/00_Index.md)
- [Offers](../02_Modules/Offers/00_Index.md)
- [Chat](../02_Modules/Chat/00_Index.md)
- [Payments](../02_Modules/Payments/00_Index.md)
- [Dispute workflow](60_Dispute.md)
- [ADR-003](../04_Decisions/ADR-003.md), [ADR-008](../04_Decisions/ADR-008.md)
