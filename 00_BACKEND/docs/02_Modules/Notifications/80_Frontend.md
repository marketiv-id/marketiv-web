# Notifications — Frontend

## Halaman

### Notification Center

- Route: `/dashboard/umkm/notifikasi` dan `/dashboard/kreator/notifikasi` → `NotificationView` (`theme="umkm" | "kreator"`).
- Daftar notifikasi user, terbaru di atas (urut `$createdAt` DESC).
- Header: jumlah belum dibaca + tombol "Tandai Semua Dibaca" (muncul bila ada unread).
- Tab filter: Semua, Belum Dibaca, Campaign, Negosiasi, Paket Harga (`rate_card`, kreator saja), Keuangan, Sistem.
- Paginasi lokal: 7 item per langkah, auto-load via IntersectionObserver (data sudah dimuat penuh oleh service).
- Item: icon kategori, title, message, waktu relatif, indikator unread, tombol aksi "Lihat …", "Tandai Dibaca", dan tombol hapus (lihat catatan).

## Komponen

- `NotificationProvider` (`src/components/features/shared/NotificationProvider.tsx`) — satu instance per layout dashboard (`role="umkm"`/`"creator"`). Memuat daftar, hitung `unreadCount`, aksi optimistic `markAsRead` / `markAllRead` / `deleteNotif` (gagal → reload). Hook: `useNotifications()`, `useUnreadNotificationCount()`, util `formatUnreadBadge` (`9+`).
- `NotificationHeaderDropdown` — ikon bell di topbar (`DashboardTopbar`, `CreatorDashboardTopbar`) dengan badge unread; dropdown 6 notifikasi terbaru + "Tandai Semua Dibaca" + tautan ke halaman notifikasi.
- `NotificationView` — halaman lengkap (di atas).
- `AppNotificationDetailDialog` — dialog detail; membuka = tandai dibaca; tombol aksi (navigasi `actionHref`) dan "Hapus Notifikasi".
- Badge unread juga di sidebar (`DashboardSidebar`, `CreatorDashboardSidebar`).

## Realtime

- Provider subscribe `tableChannels("notifications")` (`src/lib/appwrite/realtime.ts`) = dua channel sekaligus: `databases.<db>.tables.notifications.rows` dan `databases.<db>.collections.notifications.documents`.
- Event apa pun → `reload()` penuh (tidak patch per baris). Dilewati saat mock mode atau `NEXT_PUBLIC_APPWRITE_DATABASE_ID` kosong.

## Pemetaan `type` DB → Kategori Tampilan

`TYPE_ALIAS` di `src/services/shared/notification-appwrite.service.ts`. `type` lain → `sistem`.

| Kategori | `type` DB |
| --- | --- |
| `campaign` | `campaign_published`, `claim`, `claim_expired`, `submission_approved`*, `submission_rejected`* |
| `negosiasi` | `chat_message`, `offer_created`*, `offer_rejected`, `order_created`, `deliverable_submitted`, `revision_requested` |
| `keuangan` | `order_completed`, `escrow_held`, `escrow_released`, `reward`, `reward_matured`, `withdrawal`*, `payment`* |
| `rate_card` | — (tidak ada alias) |
| `sistem` | sisanya, termasuk yang ditulis backend: `system`, `keuangan`, `campaign`, `refund`, `order`, `order_tos_blocked` (lihat drift) |

\* Alias tanpa penulis di backend saat ini (lihat [90_Events.md](90_Events.md)).

**Drift (per kode):** backend menulis `type` `keuangan` (penarikan, KYC), `campaign` (bukti kerja masuk/ditolak), `refund`, `order` (validasi deliverable), `order_tos_blocked` — tidak ada di alias, jadi tampil di tab **Sistem**. `submission_rejected` di alias tidak terpakai karena `review-submission` menulis `type: "campaign"`.

## Tautan Aksi (`ACTION_BY_TYPE`)

| Role | campaign | negosiasi | keuangan | rate_card |
| --- | --- | --- | --- | --- |
| UMKM | `/dashboard/umkm/campaign` | `/dashboard/umkm/negosiasi` | `/dashboard/umkm/keuangan` | — |
| Kreator | `/dashboard/kreator/job-pool` | `/dashboard/kreator/negosiasi` | `/dashboard/kreator/keuangan` | `/dashboard/kreator/rate-card` |

Kategori `sistem` tidak punya tautan.

## Catatan

- **Hapus**: tombol "Hapus Notifikasi" masih dirender, tetapi server menolak (tidak ada `Permission.delete`); item kembali setelah reload. Lihat [50_Database.md](50_Database.md).
- **Preferensi notifikasi**: toggle di Pengaturan (kreator & UMKM) belum tersambung ke penyimpanan — label "Fitur notifikasi akan segera hadir".
- **Mock mode**: `DATA_SOURCE_CONFIG.useMockData` → data dari `src/mocks/notifications.mock.ts`.
- **Push**: frontend belum mendaftarkan push target Appwrite Messaging.
