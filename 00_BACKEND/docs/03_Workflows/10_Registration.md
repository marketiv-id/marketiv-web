# Workflow: Registration & Onboarding

## Purpose

Membawa user baru (UMKM atau Creator) dari form pendaftaran sampai akun siap pakai: punya profil, punya wallet, kuota storage, dan menerima welcome notification.

## Modules Involved

- [Authentication](../02_Modules/Authentication/00_Index.md) — pembuatan akun Appwrite Auth, role routing.
- [Users](../02_Modules/Users/00_Index.md) — profil UMKM/Creator, storage kuota.
- [Payments](../02_Modules/Payments/00_Index.md) — pembuatan wallet.
- [Notifications](../02_Modules/Notifications/00_Index.md) — welcome notification.

## Trigger

User submit form pendaftaran dari halaman Landing Page:
- `Daftar UMKM` → `/register?role=umkm` (opsi Google OAuth + data tambahan)
- `Daftar Creator` → `/register?role=creator` (opsi Google OAuth langsung jadi)

## Data Model — Collection yang Terlibat

| Collection | Modul | Aksi |
|---|---|---|
| Appwrite Auth | Authentication | create user |
| `users` | Users | insert row (mirror Auth) |
| `umkm_profiles` / `creator_profiles` | Users | insert row |
| `user_storage_usage` | Users | insert row (quota 100 MB) |
| `wallets` | Payments | insert row (saldo 0) |
| `notifications` | Notifications | insert welcome notification |

## Step-by-step Flow

### Tahap 1: Register

1. **Authentication** — User pilih role: `umkm` atau `creator` → routing ke form sesuai role.
2. **Authentication** — Submit form atau Google OAuth:
   - UMKM manual: `registerUMKM({ businessName, category, email, phone, password })`.
   - UMKM Google OAuth: Google Auth → redirect ke form data tambahan → `registerUMKM({ businessName, category, phone })`.
   - Creator manual: `registerCreator({ name, email, password })`.
   - Creator Google OAuth: langsung jadi.
3. **Authentication** — Appwrite Auth membuat user (`account.create()`), role tercatat di collection `users`.
4. **Event `users.create`** terpicu (dari Appwrite Auth).

### Tahap 2: Event-Driven Setup (users.create)

5. **Users** — Function `create-user-profile` membaca data user dari event.
6. **Users** — Buat profil sesuai role:
    - `umkm_profiles`: `{ userId, businessName: "", category: "", isProfileCompleted: false }`; identitas usaha diisi onboarding.
    - `creator_profiles`: `{ userId, displayName, isProfileCompleted: false }`.
7. **Users** — Inisialisasi `user_storage_usage`: `{ userId, usedBytes: 0, quotaBytes: 104857600, fileCount: 0 }`.
8. **Payments** — Function `create-user-wallet` membuat dokumen `wallets`: `{ userId, balance: 0, pendingBalance: 0 }`.
9. **Notifications** — `create-user-wallet` memicu notifikasi `{ userId, title: "Selamat datang di Marketiv", type: "system" }`, terkirim in-app + email.

### Tahap 3: Login

10. User login: `loginUser(email, password, role)`.
11. Response login berisi `{ user, profile, wallet }`.
12. Redirect ke wizard onboarding (detail di [Users 40_User_Flow](../02_Modules/Users/40_User_Flow.md)).

### Tahap 4: Onboarding (dipisah dari workflow ini)

13. **Users** — Wizard onboarding sesuai role, di route `/onboarding` (3 langkah):
    - UMKM: nama usaha + kategori + kota → deskripsi + logo → alamat & TikTok (keduanya opsional). Tidak ada input website pada MVP.
    - Creator: nama display + niche + kota → bio + avatar → akun TikTok (**wajib**) & Instagram (opsional).
14. `isProfileCompleted` di-set `true` oleh Function `update-profile` (server-side) setelah evaluasi field canonical pass — client tidak mengirim flag. Flag never downgrade.

> **Wajib, bukan kosmetik.** Selama flag ini `false`, kreator tidak muncul di
> `get-creator-directory` (UMKM tidak melihat kreator maupun rate card-nya sama
> sekali), tidak dinotifikasi oleh `campaign-published`, dan ditolak saat klaim
> campaign. Sisi kreator tidak melihat gejala apa pun — itu sebabnya wizardnya
> tidak boleh diperlakukan sebagai pemanis UX.
>
> Untuk kreator, akun TikTok wajib karena `get-creator-directory` mengambil
> `username` dan `engagementRate` dari `creator_social_accounts`. Menandai profil
> lengkap tanpa itu menerbitkan kartu kreator yang kosong ke seluruh UMKM.

## State Transitions

```text
Form Submitted → Appwrite Auth Created → users.create (event)
                                                      ↓
                                          Profile + Wallet + Storage + Notification Created
                                                      ↓
                                          Login → Onboarding Wizard → Profile Completed
```

## Events / Functions

| Trigger | Function | Aksi |
|---|---|---|
| `users.create` | `create-user-profile` → `create-user-wallet` | Buat profile + `user_storage_usage` + wallet + welcome notification |

- Lihat: [Authentication/90_Events](../02_Modules/Authentication/90_Events.md), [Users/70_Backend](../02_Modules/Users/70_Backend.md), [Payments/90_Events](../02_Modules/Payments/90_Events.md).

## Validation Rules per Langkah

| Langkah | Validasi | Gagal → |
|---|---|---|
| Register UMKM | `phone` wajib diisi | Error form, tidak submit |
| Register | Email unik (Appwrite Auth) | Error "Email sudah terdaftar" |
| Register Creator via Google OAuth | Role = creator | Google OAuth creator langsung jadi |
| Register UMKM via Google OAuth | Role = umkm | Redirect ke form data tambahan |
| Login | Email + password cocok | Error login |
| Create profile | `users.create` event | Idempotent — tidak duplikat |
| Create wallet | `users.create` event | Idempotent — tidak duplikat |


## Notifikasi

| Titik | Notifikasi | Penerima |
|---|---|---|
| Setelah wallet dibuat | "Selamat datang di Marketiv" (system) | User baru |

## Edge Cases

- Email sudah terdaftar → registrasi ditolak (validasi Appwrite Auth).
- UMKM via Google OAuth tetap harus isi Nama Usaha, Kategori, Nomor HP setelah redirect — jika tidak dilengkapi, profil UMKM tidak terbentuk.
- Wallet/profil idempoten — function `create-user-profile` dan `create-user-wallet` harus cek eksistensi sebelum insert agar tidak duplikat jika event terpicu ulang.
- `users.create` event gagal → retry mechanism Appwrite Function; jika tetap gagal, admin harus manual check.
- Onboarding bisa dilewati (skip) — user tetap bisa akses dashboard meski `isProfileCompleted = false`, namun fitur tertentu terblokir (claim campaign, tampil di direktori kreator). Penanda skip berlaku **per sesi** (`sessionStorage`), jadi login berikutnya menawarkan wizardnya lagi.

## Links

- [Authentication](../02_Modules/Authentication/00_Index.md)
- [Users](../02_Modules/Users/00_Index.md)
- [Payments](../02_Modules/Payments/00_Index.md)
- [Notifications](../02_Modules/Notifications/00_Index.md)
- [Campaign PPV workflow](20_Campaign_PPV.md)
