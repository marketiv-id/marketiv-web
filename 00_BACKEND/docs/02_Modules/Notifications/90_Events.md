# Notifications — Events

Notifikasi tidak memicu event domain; ia **dipicu** oleh event/aksi di modul lain. Katalog berikut disusun dari kode `functions/*/src/main.js` dan trigger di `appwrite.config.json`. Detail proses bisnis ada di modul sumber.

Kolom **kind** = kunci dedup (`ntf` + sha256(`${sourceId}:${kind}`)); tidak disimpan di DB. Semua baris: `isRead: false`, permission read+update penerima.

## Rate Card / Negosiasi

| Function (trigger) | Kondisi | Penerima | `type` | kind (sourceId) | Judul |
| --- | --- | --- | --- | --- | --- |
| `send-chat-notification` (event `messages.rows.*.create`) | Pesan baru (termasuk pesan `offer` dari `create-offer`) | Participant lawan | `chat_message` | `chat_message` (message `$id`) | "Pesan chat baru" + push |
| `create-order` (event `offers.rows.*.update`) | `offer.status = rejected` | UMKM | `offer_rejected` | `offer_rejected` (offer) | "Penawaran Ditolak" |
| `create-order` | `rejected` + akun UMKM non-active ⚠️ | Kreator | `system` | `order_blocked_umkm_suspended` (offer) | "Pembuatan Pesanan Dibatalkan" |
| `create-order` | `rejected` + akun kreator non-active ⚠️ | UMKM | `system` | `order_blocked_creator_suspended` (offer) | "Pembuatan Pesanan Dibatalkan" |
| `create-order` | `accepted`, kreator belum setuju T&C terbaru | UMKM | `order_tos_blocked` | `order_tos_blocked` (offer) | "Kreator Belum Setujui T&C" |
| `create-order` | `accepted`, order dibuat | UMKM | `order_created` | `order_created` (order) | "Penawaran Diterima" |
| `create-escrow` (event `payments.rows.*.update`) | Payment `paid`, purpose `order` | UMKM (`payment.user_id`) | `escrow_held` | `escrow_held_umkm` (escrow) | "Pembayaran Berhasil" |
| `create-escrow` | sama | Kreator | `escrow_held` | `escrow_held_creator` (escrow) | "Pesanan Siap Dikerjakan" |
| `notify-order-activity` (event `deliverables.rows.*.create`) | Deliverable baru | UMKM | `deliverable_submitted` | `deliverable_submitted` (deliverable) | "Hasil Kerja Masuk" |
| `notify-order-activity` (event `revisions.rows.*.create`) | Revisi diminta | Kreator | `revision_requested` | `revision_requested` (revision) | "UMKM Minta Revisi" |
| `review-ratecard-deliverable` (HTTP, admin) | Keputusan `valid` / `invalid` | Kreator | `order` | `ratecard_validation_<decision>` (deliverable) | "Deliverable Tervalidasi" / "Deliverable Perlu Diperbaiki" |
| `review-ratecard-deliverable` | sama | UMKM | `order` | `ratecard_validation_<decision>_umkm` (deliverable) | "Deliverable Siap Direview" / "Deliverable Tidak Valid" |
| `release-escrow` (event `deliverables.rows.*.update`, `ratecard_deliverable_validations.rows.*.create`) | Deliverable approved + validasi `valid`, escrow dirilis | Kreator | `escrow_released` | `escrow_released_creator` (escrow) | "Dana Sudah Cair" (nominal bersih + fee) |
| `release-escrow` | sama | UMKM | `order_completed` | `escrow_released_umkm` (escrow) | "Pesanan Selesai" |
| `auto-approve-orders` (cron `0 * * * *`) | Tenggat review lewat → auto-approve | UMKM | `system` | id dari `${orderId}:auto_approved` | "Pesanan Otomatis Disetujui" |
| `auto-approve-orders` | Tenggat review ≤ 24 jam, belum diingatkan | UMKM | `system` | id dari `${orderId}:reminder_h1` | "Tenggat Review H-1" |
| `refund-order` (event `orders.rows.*.update` → `cancelled`/`expired`; atau HTTP `orderId`) | Escrow `held` direfund | UMKM | `refund` | `refund_escrow` (escrow) | "Refund Diterima" |
| `refund-escrow` (HTTP, server-only) | sama | UMKM | `refund` | `refund_escrow` (escrow) | "Refund Diterima" |

`refund-order` dan `refund-escrow` memakai kunci yang sama → satu notifikasi per escrow walau keduanya jalan.

## Campaign

| Function (trigger) | Kondisi | Penerima | `type` | kind (sourceId) | Judul |
| --- | --- | --- | --- | --- | --- |
| `campaign-published` (event `campaigns.rows.*.update`) | `status = active` | Maks. 100 kreator dengan `isProfileCompleted = true` | `campaign_published` | `campaign_published` (`${campaignId}:${creatorUserId}`) | "Campaign Baru" |
| `campaign-claimed` (event `campaign_claims.rows.*.create`) | Increment `totalClaims` sukses | UMKM pemilik | `claim` | `claim` (claim) | "Campaign Di-klaim" |
| `submit-campaign-proof` (HTTP, user) | Bukti kerja dikirim | UMKM pemilik | `campaign` | `submission` (submission) | "Bukti Kerja Baru" |
| `review-submission` (HTTP, admin) | `rejected` | Kreator | `campaign` | `submission_rejected` (submission) | "Bukti Kerja Ditolak" |
| `calculate-campaign-reward` (event `campaign_submissions.rows.*.update`) | `status = approved`, reward dikredit | Kreator | `reward` | `reward` (submission) | "Reward Campaign" |
| `expire-stale-claims` (cron `0 */6 * * *`) | Claim lewat `submissionDays` | Kreator | `claim_expired` | `ID.unique()` — tanpa dedup | "Claim Expired" |
| `refund-order` (HTTP `campaignId`) | Sisa budget campaign `cancelled`/`completed` dikembalikan | UMKM | `refund` | `refund_campaign` (campaign) | "Sisa Budget Dikembalikan" |
| `mature-pending-balance` (legacy, `enabled: false`) | Reward matang | Kreator | `reward_matured` | id `tx` + sha256(`${txId}:notif`) | "Reward Sudah Bisa Ditarik" |

## Keuangan / Penarikan

| Function (trigger) | Kondisi | Penerima | `type` | kind (sourceId) | Judul |
| --- | --- | --- | --- | --- | --- |
| `request-withdrawal` (HTTP, user) | Pengajuan diterima | Pemohon | `keuangan` | `withdrawal` (withdrawal) | "Pengajuan Penarikan Diterima" |
| `review-withdrawal` (HTTP, admin) | → `processing` | Pemohon | `keuangan` | `withdrawal_processing` | "Penarikan Sedang Diproses" |
| `review-withdrawal` | → `succeeded` | Pemohon | `keuangan` | `withdrawal_succeeded` | "Penarikan Berhasil" |
| `review-withdrawal` | → `reversed` | Pemohon | `keuangan` | `withdrawal_reversed` | "Saldo Penarikan Dikembalikan" |
| `withdrawal-callback` (webhook Iris, `enabled: false`) | Iris `completed` / `failed` | Pemohon | `keuangan` | `withdrawal_success` / `withdrawal_failed` | "Penarikan Saldo Berhasil" / "Penarikan Saldo Gagal" |
| `verify-kyc` (HTTP, server-only) | KYC diverifikasi | User | `keuangan` | `kyc_verified` (user doc) | "Verifikasi KYC Disetujui" |

## Akun / Sistem

| Function (trigger) | Kondisi | Penerima | `type` | kind (sourceId) | Judul |
| --- | --- | --- | --- | --- | --- |
| `suspend-user` (HTTP, server-only) | `suspended` / `terminated` | User | `system` | `account_suspended` / `account_terminated` (user doc) | "Akun Ditangguhkan" / "Akun Dihentikan" |
| `unsuspend-user` (HTTP, server-only) | Dipulihkan | User | `system` | `account_restored` (user doc) | "Akun Dipulihkan" |
| `create-appeal` (HTTP, user) | Banding dibuat | User | `system` | `appeal_submitted` (appeal) | "Banding Diterima" |
| `review-appeal` (HTTP, server-only) | Disetujui | User | `system` | `account_restored` (appeal) | "Banding Disetujui" |
| `review-appeal` | Ditolak | User | `system` | `appeal_rejected` (appeal) | "Banding Ditolak" |
| `fee-rate-flip` (cron `0 0 * * *`) | ≥ 1000 transaksi `completed` dan `ADMIN_NOTIFY_USER_ID` di-set | Admin | `system` | `fee_rate_flip_alert` (`fee-rate-flip-YYYY-MM-DD`) | "Fee Rate Flip Threshold Tercapai" |

⚠️ = perilaku kode yang tampak tidak disengaja (cek penempatan blok di `create-order/src/main.js`).

## Tidak Diimplementasikan

- Welcome notification saat register (`users.create`) — `create-user-wallet` tidak menulis notifikasi. Lihat [Authentication/90_Events.md](../Authentication/90_Events.md).
- Notifikasi "Order menunggu pembayaran" untuk Direct Order (jalur paket) — belum dibangun.
- Notifikasi top-up campaign berhasil (`create-escrow` jalur campaign).
- Email untuk event mana pun; Function `send-notification`.

## Pola Implementasi

```text
Event/aksi di modul X
↓
Function X → notify() → baris `notifications` (in-app)
↓
Realtime → NotificationProvider reload
(chat: send-chat-notification juga push Appwrite Messaging; email belum ada)
```

## Lihat Juga

- [Chat/90_Events.md](../Chat/90_Events.md) — sumber `messages.create`.
- [80_Frontend.md](80_Frontend.md) — pemetaan `type` → tab.
- Skema record: [50_Database.md](50_Database.md).
