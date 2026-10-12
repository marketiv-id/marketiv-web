# Users — Events

## Event yang Diterbitkan

Modul Users tidak menerbitkan event custom (`profile.updated` dari dokumen lama **tidak ada** di kode). Efek samping lintas modul berupa baris `notifications` yang ditulis langsung oleh Function:

| Function | `kind` (ID deterministik) | Judul notifikasi | `type` |
| --- | --- | --- | --- |
| `suspend-user` | `account_suspended` / `account_terminated` | Akun Ditangguhkan / Akun Dihentikan | `system` |
| `unsuspend-user` | `account_restored` | Akun Dipulihkan | `system` |
| `create-appeal` | `appeal_submitted` | Banding Diterima | `system` |
| `review-appeal` | `account_restored` / `appeal_rejected` | Banding Disetujui / Banding Ditolak | `system` |
| `verify-kyc` | `kyc_verified` | Verifikasi KYC Disetujui | `keuangan` |

## Event yang Dikonsumsi

| Event | Sumber | Function | Aksi |
| --- | --- | --- | --- |
| `users.*.create` | Appwrite Auth | `create-user-profile` | Buat mirror `users`, profil role, `user_storage_usage` (gagal 400 bila prefs role belum ada; jalur utama adalah eksekusi sinkron klien) |
| `users.*.update` | Appwrite Auth | `user-email-verified` | Isi `users.email_verified_at` (didokumentasikan di modul Authentication) |

- Pembaruan denormalisasi `creator_profiles` (`totalOrders`, `rating`, `totalFollowers`) dari event Orders/Campaigns **belum diimplementasikan** — tidak ada Function yang mendengarkannya.

## Lihat Juga

- Event `users.*.create` dan efek lanjutannya → `../Authentication/90_Events.md`.
- Pembuatan wallet → `../Payments/90_Events.md`.
- Skema `notifications` → `../Notifications/50_Database.md`.
