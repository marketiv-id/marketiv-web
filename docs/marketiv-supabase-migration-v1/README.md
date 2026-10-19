# Marketiv Supabase Migration v1

Rencana migrasi backend Marketiv dari **Appwrite** ke **Supabase**, dengan backend di **Next.js Route Handlers** dan hosting di **Vercel**.

## Keputusan

| Topik | Keputusan |
|---|---|
| BaaS | Supabase: Postgres, Auth, Storage, Realtime |
| Pengganti 67 Appwrite Functions | Next.js Route Handlers (`src/app/api/**`). Operasi uang dan operasi multi-tabel dijalankan lewat Postgres function (RPC) |
| Hosting | Vercel, region `sin1`. Dua project: user (root) dan admin (`admin/`) |
| Data produksi | Sudah ada, termasuk saldo dan escrow, jadi wajib dimigrasi |
| Strategi rilis | Satu kali cutover dalam jendela maintenance |
| Environment | Supabase staging dan prod, region Singapore |

## Kondisi saat ini (hasil audit)

**Hosting:** app user dan admin di Appwrite Sites.

**Database:** 32 tabel, satu database `6a4c8598001da3b0d7f0`.
- Sumber skema yang benar adalah `00_BACKEND/appwrite.config.json`. File `appwrite.json` sudah basi.
- Tidak ada foreign key. Semua relasi berupa string ID.
- Tabel `6ab530d00018edb50097` adalah `campaign_briefs_v2`, yang dipakai saat ini.

**Functions:** 67, semuanya node-22.
- Sekitar 15 dipicu event dan 5 dijalankan cron.
- Tiga sudah nonaktif: `mature-pending-balance`, `withdrawal-callback`, `sync-order-revision`.

**Browser:**
- Baca langsung ke DB sekitar 85 kali.
- Tulis langsung ke DB sekitar 35 kali, meliputi campaigns, briefs, assets, claims, offers, rate cards, portfolios, social, deliverables, messages, dan notifications.

**Auth dan sesi:**
- Tidak ada middleware dan tidak ada server SDK di app Next.
- Satu-satunya route handler adalah `/api/chat`.
- Semua guard hanya di sisi client: `RoleGuard`, `AdminAuthBoundary`.

**Storage:** 8 bucket.
- Publik: avatars, creator-banners, logos, portfolios, campaign-assets.
- Privat: deliverables, fraud-evidence, user-files.

**Realtime:** 3 subscriber, untuk `notifications` dan `messages`.

## Celah keamanan yang ditutup sekalian

1. **Role bisa diubah sendiri.**
   - User bisa meng-update baris `users` miliknya, termasuk `role`, `status`, dan `kyc_status`.
   - `create-user-profile` menerima `prefs.role` dari body request.
2. **Reward tanpa dana.** `campaigns` bisa dibuat dari browser dengan `status:"active"` dan `remainingBudget` berapa pun, sehingga reward bisa dibayar tanpa dana masuk.
3. **Race di alur uang.**
   - Bisa membayar dua kali: `calculate-campaign-reward`, `release-escrow`, dan top-up di `create-escrow`.
   - Bisa menghilangkan dana: `refund-escrow` dan `refund-order` menandai escrow `refunded` sebelum wallet berhasil dikredit.
4. **`ai-brief` memakai `userId` dari body request**, bukan dari sesi.
5. **Cek admin menerima `prefs.role`**, yang bisa diubah oleh user sendiri.
6. **Guard route hanya di sisi client.**

## Arsitektur target

```
Browser ──(read, RLS)──────────────► Supabase Postgres / Realtime
   │                                         ▲
   ├──(signed upload URL)──────────► Supabase Storage
   │                                         │
   └──fetch('/api/...')──► Next.js Route Handler (Vercel, Node)
                              │ getUser() → requireActiveRole() → logic
                              └─ service-role client / rpc('...') ┘
Vercel Cron ──► /api/cron/*      Midtrans ──► /api/webhooks/midtrans
```

**Aturan browser:**
- Browser hanya membaca. Semua tulis lewat route.
- RLS untuk role `authenticated` hanya SELECT.

**Pengganti event trigger Appwrite:**
- Efek samping dipanggil eksplisit di dalam route atau RPC.
- Kerja lambat dijalankan dengan `after()` dari `next/server`.

**Uang:**
- Setiap perpindahan uang dijalankan oleh satu RPC `SECURITY DEFINER` dalam satu transaksi.
- Baris wallet dikunci dengan `SELECT … FOR UPDATE`.
- Ledger dibuat idempoten lewat unique constraint.

**ID:**
- User ID berupa `uuid`, dengan FK ke `auth.users`. ID lama dipetakan lewat `legacy_user_map`.
- Row ID berupa `text`. ID Appwrite lama dipertahankan, termasuk ID deterministik `tx…`/`ntf…`.

**Kolom dan DTO:**
- Kolom memakai snake_case.
- Mapper di repository menjaga bentuk DTO frontend tetap sama.

## Strategi branch

- Branch jangka panjang: `migrasi-supabase`.
- Satu PR per fase masuk ke branch itu.
- `main` di-merge ke branch itu secara rutin.
- Preview Vercel dari branch ini terhubung ke Supabase **staging**.
- Produksi tetap memakai Appwrite sampai Fase 10 (cutover).

## Fase (mudah → rumit)

| # | Fase | Bobot | Dokumen |
|---|---|---|---|
| 0 | Persiapan & spike | S | [00-persiapan.md](./00-persiapan.md) |
| 1 | Hosting ke Vercel (backend tetap Appwrite) | S | [01-hosting-vercel.md](./01-hosting-vercel.md) |
| 2 | Fondasi Supabase + skema DB | M | [02-fondasi-skema.md](./02-fondasi-skema.md) |
| 3 | RLS, helper otorisasi, storage, realtime | M | [03-rls-storage.md](./03-rls-storage.md) |
| 4 | Auth & guard | M | [04-auth.md](./04-auth.md) |
| 5 | Jalur baca | M | [05-jalur-baca.md](./05-jalur-baca.md) |
| 6 | Mutasi sederhana, chat, file, realtime | M | [06-mutasi-chat-file.md](./06-mutasi-chat-file.md) |
| 7 | Alur campaign & order rate card | L | [07-alur-bisnis.md](./07-alur-bisnis.md) |
| 8 | Keuangan: payment, escrow, wallet, withdrawal | XL | [08-keuangan.md](./08-keuangan.md) |
| 9 | Tooling migrasi data & gladi resik | L | [09-migrasi-data.md](./09-migrasi-data.md) |
| 10 | Cutover produksi | L | [10-cutover.md](./10-cutover.md) |
| 11 | Bersih-bersih | S | [11-cleanup.md](./11-cleanup.md) |

## Verifikasi global

**Setiap PR fase:**
- `npm run lint`, `npm run typecheck`, dan `npm test` di root dan `admin/`.
- `supabase db reset` dan `supabase test db` (pgTAP).

**Fase ≥ 4:** QA manual di preview Vercel staging, memakai checklist QA dashboard yang sudah ada.

**Sebelum cutover:**
- Dua kali gladi resik dengan hasil reconcile nol selisih.
- Midtrans sandbox lulus end-to-end.
- Advisor Supabase tanpa temuan keamanan.
