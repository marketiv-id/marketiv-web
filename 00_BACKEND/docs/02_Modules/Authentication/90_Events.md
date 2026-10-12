# Authentication — Events

## User Registered

Register punya **dua jalur pemicu**, bukan satu.

```text
account.create()                         → event users.*.create
                                            ↓
                                         create-user-wallet  → baris `wallets` (saldo 0)
                                            ↓
                                         create-user-profile → 400, role belum ada (lihat catatan)

account.createEmailPasswordSession()
account.updatePrefs({ role, ... })       → prefs baru terisi di sini
    ↓
functions.createExecution("create-user-profile", { $id, role, email, name, phone, prefs })
    ↓
baris `users` + `umkm_profiles`/`creator_profiles` + `user_storage_usage`
```

| Aspek | Detail |
| --- | --- |
| Trigger | `users.*.create` (event) **dan** eksekusi sinkron dari klien |
| Function | `create-user-wallet` (event) · `create-user-profile` (event + sinkron) |
| Efek 1 | `create-user-wallet` membuat record di `wallets` (saldo 0) — milik [Payments](../Payments/70_Backend.md) |
| Efek 2 | `create-user-profile` membuat baris `users` (`status: active`, `tos_version`/`tos_accepted_at` = `null` karena register tidak mengirim versi T&C), profil sesuai role, dan `user_storage_usage` — milik [Users](../Users/70_Backend.md) |

**Kenapa `create-user-profile` harus dipanggil sinkron.** Function mengambil role
dari `user.role || user.prefs?.role || user.labels`, dan menolak 400 kalau tidak
ketemu. `prefs` hanya bisa ditulis lewat `account.updatePrefs()` yang butuh sesi
aktif — jadi saat event `users.*.create` menyala, `prefs` masih kosong dan
Function itu pasti gagal. Klien memanggilnya lagi setelah prefs terpasang.

Trigger event sengaja **dipertahankan** sebagai jaring pengaman untuk akun yang
dibuat lewat konsol. Function-nya idempoten seluruhnya (`ensureUserMirror`,
`ensureUmkmProfile`, `ensureCreatorProfile`, `ensureStorageUsage` semuanya
cek-dulu-baru-tulis), jadi eksekusi ganda tidak menghasilkan duplikat.
Konsekuensinya: setiap register meninggalkan **satu eksekusi gagal 400 di log**
sebelum yang sinkron berhasil. Itu diharapkan, bukan gejala kerusakan.

Pada Google OAuth, sesi Appwrite bisa sudah aktif sebelum mirror `users`
tersedia. Callback harus membaca `getSession()`; bila hasilnya `not_found`,
artinya provisioning profil belum selesai. Cabang itu memicu recovery sinkron
sesuai role, bukan menganggap user belum login.

## Email Verified

```text
Appwrite Auth user update
↓ emailVerification === true
user-email-verified
↓ lookup users by userId
↓ set users.email_verified_at bila masih kosong
```

| Aspek | Detail |
| --- | --- |
| Trigger | `users.*.update` dari Appwrite Auth |
| Function | `user-email-verified` |
| Guard | Hanya payload dengan `emailVerification === true` |
| Efek | Isi `users.email_verified_at` secara idempoten |

Event ini dipakai oleh alur OTP register (`confirmEmailOtp` →
`account.createSession(userId, otp)`), lalu Function menyinkronkan timestamp ke
mirror `users`. Event `users.*.update` menyala untuk perubahan Auth apa pun;
payload tanpa `emailVerification === true` langsung `res.empty()`.

## Event yang Tidak Ada

- Modul ini tidak menerbitkan event custom. `accept-tos`,
  `request-password-otp`, dan `reset-password-with-otp` tidak memanggil
  Function lain secara langsung.

> **Welcome Notification — tidak ada.** Dokumen ini sebelumnya menyebut
> `create-user-wallet` mengirim notifikasi `type: system` bertajuk "Selamat
> datang di Marketiv" sebagai "Efek 3". Function itu tidak pernah menulis
> notifikasi apa pun — hanya baris `wallets`. Klaimnya dihapus 2026-07-29 agar
> dokumen menggambarkan yang sebenarnya berjalan. Kalau fitur ini diinginkan,
> perlakukan sebagai pekerjaan baru, bukan perbaikan.

## Lihat Juga

- [Notifications/90_Events.md](../Notifications/90_Events.md) — daftar lengkap event yang memicu notifikasi.
- Skema `wallets` & `notifications` ada di modul pemiliknya (Payments, Notifications).
