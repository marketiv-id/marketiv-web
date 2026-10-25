# Audit Data Live Appwrite Produksi — 2026-10-25

Audit read-only Fase 0. Laporan ini hanya memuat angka, ID, dan status. Tidak ada email, nama, URL file, atau hash.

- **Sumber:** project produksi `6a8c45ef0023ae195594`, database `6a4c8598001da3b0d7f0`, endpoint `https://sgp.cloud.appwrite.io/v1`.
- **Skrip:** `scripts/migration/spikes/audit-appwrite.mjs` (hanya GET). Data mentah lengkap: [`2026-10-25-appwrite-prod.json`](./2026-10-25-appwrite-prod.json).
- **Skrip lama:** `00_BACKEND/appwrite/ops/audit-live.mjs`, `drift.mjs`, dan `audit-legacy-money-state.mjs` juga dijalankan ke produksi. Ringkasannya ada di bagian akhir.
- **Admin:** daftar email kandidat admin disimpan di luar repo dan hanya diberikan ke pemilik.

> **Catatan project ID.** `00_BACKEND/appwrite.config.json` dan default di `00_BACKEND/appwrite/ops/client.mjs` memakai `69f9d45b00315cb0ec2f`, yaitu project **staging**. Produksi adalah `6a8c45ef0023ae195594`. ID database kedua project sama.

## Ringkasan

| Item | Nilai |
|---|---|
| Total baris (32 tabel) | 95 |
| Total file (8 bucket) | 13 |
| User Auth | 15 |
| Tabel uang (`payments`, `transactions`, `escrows`, `withdrawals`) | semua 0 baris |
| Saldo wallet total (balance + pending) | 0 |
| Baris yatim | 0 |
| Anomali kritis | 3 (lihat [Keputusan anomali](#keputusan-anomali)) |

**Dampak keuangan celah #1/#2/#3: nol.** Tidak ada uang yang pernah bergerak di produksi. Tidak ada ledger, payment, escrow, withdrawal, submission, atau saldo.

## Jumlah baris per tabel

| Tabel | Baris | Tabel | Baris |
|---|---:|---|---:|
| users | 14 | rate_cards | 0 |
| appeals | 0 | rate_card_packages | 0 |
| otp_rate_limits | 0 | conversations | 0 |
| umkm_profiles | 9 | messages | 0 |
| creator_profiles | 4 | offers | 0 |
| creator_social_accounts | 4 | orders | 0 |
| creator_portfolios | 0 | deliverables | 0 |
| user_storage_usage | 13 | revisions | 0 |
| user_files | 0 | ratecard_deliverable_validations | 0 |
| campaigns | 6 | wallets | 14 |
| campaign_assets | 6 | payments | 0 |
| fraud_checks | 0 | transactions | 0 |
| campaign_briefs | 0 | escrows | 0 |
| `6ab530d00018edb50097` (briefs v2) | 6 | withdrawals | 0 |
| campaign_claims | 2 | notifications | 16 |
| campaign_submissions | 0 | ai_requests | 1 |

## Storage

| Bucket | File | File terbesar | > 50 MB |
|---|---:|---:|---:|
| avatars | 1 | 0,34 MB | 0 |
| creator-banners | 0 | – | 0 |
| logos | 6 | 0,91 MB | 0 |
| portfolios | 0 | – | 0 |
| campaign-assets | 6 | 0,70 MB | 0 |
| deliverables | 0 | – | 0 |
| fraud-evidence | 0 | – | 0 |
| user-files | 0 | – | 0 |

- Tidak ada file di atas 50 MB. Batas file Supabase Free tidak menghalangi migrasi data yang ada.
- **campaign-assets:** 6 file, semuanya gambar dan semuanya dirujuk `campaigns.thumbnailUrl`. Tidak ada file konteks privat (deliverable, `user_files`). Lima file tidak punya izin `read("any")` di level file. Ini tidak berpengaruh karena bucket memakai `fileSecurity=false` dan izin bucket `read("any")`.
- **Kolom URL:** semua URL storage (`logoUrl` 6, `avatarUrl` 1, `campaigns.thumbnailUrl` 6) menunjuk file yang ada, dan semuanya milik project produksi. `campaign_assets.fileUrl` (6) berisi URL eksternal, bukan Appwrite Storage.

## Auth

| Item | Nilai |
|---|---|
| User Auth | 15 |
| Hash `argon2id m=65536,t=4,p=3` | 11 |
| Hash `argon2id m=7168,t=5,p=1` | 2 |
| Tanpa password (login Google) | 2 |
| Email terverifikasi | 12 |
| Dinonaktifkan | 0 |
| Punya label Auth | 0 |
| `prefs.role` | admin 1, umkm 9, creator 5 |
| `users.role` | admin 1, umkm 9, creator 4 |
| Akun Auth tanpa baris `users` | 1 (`6aba8a340034686abc0f`) |
| Baris `users` tanpa akun Auth | 0 |
| `prefs.role` ≠ `users.role` | 0 |

- Semua 14 baris `users` punya `$id` sendiri yang **berbeda** dari ID Auth. Relasi ke Auth lewat kolom `users.userId`.
- Kedua varian parameter Argon2 berformat PHC yang sama dengan hasil Spike 1. Supabase membaca parameter dari string hash, jadi keduanya bisa diimpor.

## Admin

| ID Auth | `users.role` | `prefs.role` | Label `admin` | Dibuat |
|---|---|---|---|---|
| `6a8cd8c4002ecd2aac61` | admin | admin | tidak | 2026-08-24 |

- Hanya satu akun yang punya sinyal admin.
- Tidak ada label Auth di produksi sama sekali. Admin app menerima `users.role`, label, atau `prefs.role` (`admin/src/lib/admin/auth.ts`).
- **Indikasi sah:** akun Auth ini yang pertama dibuat di project. Baris `users`-nya dibuat dari server dengan `$permissions: []`. Baris yang dibuat lewat `create-user-profile` (jalur eskalasi celah #1) selalu memberi `read`/`update` ke pemiliknya.
- **Status:** menunggu konfirmasi pemilik.

## Campaign vs pembayaran (celah #2)

| Campaign | Status | Budget | Sisa budget | Payment paid | Dibuat |
|---|---|---:|---:|---:|---|
| `6ab65f3700119deab112` | active | 50.000 | 50.000 | 0 | 2026-09-25 |
| `6ab65fdb002a05ff1d40` | active | 50.000 | 50.000 | 0 | 2026-09-25 |
| `6ab6604b002ca1bc1fba` | active | 50.000 | 0 | 0 | 2026-09-25 |
| `6ab660c6002587a2cd3b` | active | 50.000 | 50.000 | 0 | 2026-09-25 |
| `6ab661450004452c76dd` | active | 50.000 | 50.000 | 0 | 2026-09-25 |
| `6abb25050022cad016cc` | active | 50.000 | 0 | 0 | 2026-09-29 |

- Semua campaign produksi `active` tanpa satu pun payment. Empat punya sisa budget 50.000 tanpa dana masuk.
- Enam campaign milik enam UMKM berbeda. Lima dibuat dalam 14 menit pada 2026-09-25 dengan `publishedAt` identik. Tanggal itu sama dengan commit demo booth pameran.
- `spentAmount` 0, `totalClaims` 0, submission 0. Dua klaim yang ada berstatus `expired`.
- **Kesimpulan:** pola celah #2 ada, tetapi dampak uang nol. Pemilik menyatakan ini data demo atau uji.

## Wallet, ledger, escrow, payment, withdrawal (celah #3)

| Pemeriksaan | Hasil |
|---|---|
| Wallet | 14, semuanya balance 0 dan pending 0 |
| Wallet ganda per user | 0 |
| Wallet ≠ Σ ledger | 0 |
| Ledger ganda | 0 (ledger kosong) |
| Ledger tertahan `pending`/`processing` | 0 |
| Escrow `refunded` tanpa kredit, release + refund, `releasing` | 0 (escrow kosong) |
| Payment paid ganda per order | 0 (payment kosong) |
| Withdrawal tanpa ledger | 0 (withdrawal kosong) |

Rumus rekonsiliasi yang dipakai (dari Functions lama), untuk dipakai ulang di `reconcile.ts` Fase 9:

```
balance = Σ release/campaign_submission (status matured, tanpa baris mature)
        + Σ mature (completed)
        + Σ release/escrow (completed)
        + Σ refund (completed)
        + Σ withdrawal_reversal (completed)
        − Σ withdrawal (semua status)
pendingBalance = Σ release/campaign_submission (status completed, reward lama yang belum matang)
```

## Baris yatim (FK implisit)

50 relasi diperiksa, termasuk user ID, campaign, klaim, order, offer, percakapan, ledger polimorfik, dan `user_files` ke storage. **Semua 0 yatim.** Rincian per relasi ada di JSON (`orphans`).

## Skrip audit lama ke produksi

| Skrip | Hasil |
|---|---|
| `audit-legacy-money-state.mjs` | Semua nol. `mature-pending-balance` dan `withdrawal-callback` disabled, sesuai rencana. |
| `audit-live.mjs` | Bucket, tabel, dan kolom produksi **sama** dengan config. 57 blocker, **semuanya** `NO-VARS`: 57 dari 67 Function tidak punya variabel tingkat function. 13 warning: 10 Function tanpa `APPWRITE_DATABASE_ID`, 3 Function disabled. |
| `drift.mjs` | 4 field berlaku langsung dan 66 field butuh deploy berbeda dari config. 0 belum di-push, 0 yatim. Config dibuat dari project staging. |

Temuan `NO-VARS` belum bisa dipastikan sebagai kerusakan. Produksi mungkin memakai variabel tingkat project, sedangkan API key audit tidak punya scope `project.read` untuk memeriksanya. Ini masalah kesehatan produksi lama, di luar scope migrasi. Dicatat di log progres.

## Keputusan anomali

| # | Anomali | Jumlah | Keputusan | Kapan |
|---|---|---:|---|---|
| A1 | Campaign `active` tanpa payment paid (celah #2) | 6 | Ubah ke `draft`, `remaining_budget = 0`, `spent_amount = 0`, `published_at = null`. UMKM membayar lewat alur baru bila ingin aktif. Keputusan pemilik: opsi (a). | Transform saat migrasi (Fase 9) |
| A2 | Sisa budget > dana masuk | 4 | Tercakup A1. | Transform saat migrasi |
| A3 | Klaim pada campaign A1 | 2 | Bawa apa adanya (`expired`). | Migrasi biasa |
| A4 | Admin tanpa label Auth | 1 | Role admin **tidak** disalin dari `users.role`/`prefs.role`. `app_metadata.role = 'admin'` hanya untuk ID di allowlist yang dikonfirmasi pemilik. `prefs.role` tidak dimigrasi. | Transform saat migrasi, menunggu konfirmasi ID |
| A5 | Akun Auth tanpa baris `users` | 1 | Impor ke `auth.users` tanpa baris `public.users`. Onboarding membuat profil saat login pertama. | Transform saat migrasi |
| A6 | `users.$id` ≠ ID Auth | 14 | `public.users.id` = UUID hasil `legacy_user_map(users.userId)`. `$id` lama baris `users` dibuang karena tidak dirujuk tabel lain. | Transform saat migrasi |
| A7 | User tanpa password (Google) | 2 | Impor tanpa password. Identitas Google ditautkan lewat email saat login OAuth pertama. Desain di Fase 4. | Transform saat migrasi |
| A8 | Dua varian parameter Argon2 | 11 + 2 | Impor `password_hash` apa adanya. | Migrasi biasa |
| A9 | File campaign-assets tanpa `read("any")` level file | 5 | Tidak perlu tindakan. Semua file publik dan dirujuk thumbnail. Salin ke bucket publik. | Migrasi biasa |
