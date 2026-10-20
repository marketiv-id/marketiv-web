# Fase 10 — Cutover produksi

**Bobot:** L. Dijalankan **satu kali**, dalam jendela maintenance.

## Prasyarat (go/no-go H-1)
- [ ] Dua kali gladi resik dengan reconcile nol selisih (Fase 9)
- [ ] Midtrans sandbox lulus end-to-end di staging (Fase 8)
- [ ] `get_advisors` security dan performance di Supabase prod bersih
- [ ] Semua migration sudah diterapkan ke Supabase prod (`supabase db push`)
- [ ] Bucket, policy, SMTP, template email, redirect URL, dan cron sudah terpasang di prod
- [ ] Env Vercel prod sudah diisi (Supabase prod, Midtrans production, `CRON_SECRET`, AI keys)
- [ ] Pengumuman maintenance ke user sudah dikirim, minimal H-3
- [ ] Tidak ada withdrawal `processing` dan tidak ada escrow `releasing`. Selesaikan dulu bila ada.

## Runbook

| # | Langkah | Pemilik |
|---|---|---|
| 1 | Aktifkan mode maintenance (env `MAINTENANCE_MODE=1` di deployment Appwrite lama atau halaman statis) | |
| 2 | Freeze tulis: nonaktifkan semua Appwrite Function (termasuk cron), lalu pastikan tidak ada eksekusi berjalan | |
| 3 | `export-appwrite.ts` + `export-storage.ts` (prod) | |
| 4 | `import-users.ts` → `transform-load.ts` → `copy-storage.ts` ke Supabase prod | |
| 5 | `reconcile.ts`. **GO/NO-GO.** NO-GO berarti lanjut ke rollback A | |
| 6 | Deploy branch `migrasi-supabase` (sudah di-merge ke `production`) ke Vercel prod | |
| 7 | Ubah Payment Notification URL di dashboard Midtrans ke `https://marketiv.id/api/webhooks/midtrans` | |
| 8 | Smoke test dengan akun internal: login UMKM/kreator/admin, dashboard, chat realtime, upload, transaksi kecil nyata (bayar lalu refund), cron dipanggil manual | |
| 9 | Matikan maintenance. Pantau Sentry dan log Supabase selama 2 jam | |

## Rollback
- **A — sebelum langkah 9** (belum ada tulis baru di Supabase):
  - Arahkan domain ke deployment Appwrite lama.
  - Aktifkan kembali Appwrite Functions.
  - Kembalikan URL Midtrans.
  - Tidak ada data hilang.
- **B — setelah dibuka** (ada tulis baru di Supabase):
  - Hanya untuk masalah fatal dalam 24 jam pertama.
  - Butuh re-sync manual tabel yang berubah dari Supabase ke Appwrite. Karena itu go/no-go di langkah 5 dan smoke test di langkah 8 wajib ketat.
- Project Appwrite tetap ada dalam kondisi **read-only selama 30 hari** sebagai arsip dan sumber pembanding.

## Pasca-cutover (H+1 s.d. H+7)
- [ ] Jalankan `finance_reconciliation` setiap hari
- [ ] Pantau error auth (login gagal massal biasanya berarti masalah impor hash)
- [ ] Pantau webhook Midtrans (tidak boleh ada notifikasi yang gagal)
