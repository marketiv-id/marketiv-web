# Campaigns — User Flow

## UMKM

```text
Wizard Buat Campaign (5 langkah):
  1. Info produk + thumbnail (wajib) + tipe ugc/clipping + kategori
  2. Brief / arahan (opsional generate AI via ai-brief)
  3. Tautan folder aset (Drive / Dropbox / OneDrive)
  4. Budget (min Rp50.000) + tarif per 1.000 views + kuota kreator
  5. Review & setuju
↓
Simpan draft (campaigns + brief + asset, client SDK)
↓
Bayar: create-payment (budget + fee) → Midtrans Snap
↓
Midtrans → midtrans-webhook → create-escrow → remainingBudget += budget
↓
Frontend poll publish (5× tiap 2 detik) via patch-campaign-status
  ├─ dana sudah masuk → active (tampil di Job Pool)
  └─ belum → tetap draft; "Terbitkan" manual dari daftar campaign
↓
Kelola: pause / resume (patch-campaign-status), duplikasi, edit draft
(patch-campaign-draft), hapus draft
↓
Pantau (read-only):
  - jumlah kreator / claim
  - post URL submission
  - Menunggu Validasi Marketiv / approved / rejected
  - views terverifikasi & reward bila sudah divalidasi
```

UMKM **tidak** approve/reject dan **tidak** menginput views.

## Creator

```text
Buka Job Pool (campaign active)
↓
Claim (client createDocument) → campaign-claimed (kuota atomik)
  └─ kuota ternyata penuh → claim menjadi expired
↓
Produksi konten di platform campaign (TikTok), publish publik
↓
Kirim Bukti: URL publik + catatan opsional (submit-campaign-proof)
  └─ atau Batalkan claim selama masih "claimed" (unclaim-campaign)
↓
Submission = pending; fraud precheck berjalan otomatis
↓
Menunggu Validasi Marketiv (≥ 72 jam observasi)
├─ approved → reward otomatis masuk saldo tersedia + notifikasi
└─ rejected → notifikasi + alasan (reviewNotes); slot kuota kembali
```

Claim yang tidak disubmit dalam `submissionDays` (default 7 hari) menjadi `expired` oleh cron (tiap 6 jam) dengan notifikasi.

## Admin Marketiv

```text
get-admin-submission-queue (default status pending)
↓
Periksa kreator + campaign + UMKM + post URL
↓
(Data fraud belum disertakan di queue — belum diimplementasikan)
↓
Tunggu periode observasi 72 jam sejak submit
↓
review-submission
├─ approved + views → views terkunci → calculate-campaign-reward
└─ rejected + notes → kuota kembali + notifikasi kreator
```

## Backend

```text
submit-campaign-proof → submission pending + claim submitted
→ ai-fraud-precheck (metadata fraud)
→ review-submission (Admin)
→ approved: calculate-campaign-reward (idempoten per submission)
```

## Catatan

UI Admin berada di aplikasi terpisah `admin/` (monorepo ini), fitur `admin/src/features/admin/submissions/`: antrean (limit 50, filter status + pencarian klien), dialog approve (input views, estimasi reward, tombol terkunci sampai periode observasi lewat — env `NEXT_PUBLIC_VIEW_VALIDATION_DELAY_HOURS`) dan dialog reject (alasan wajib di UI). Otorisasi Admin ditegakkan di backend (`review-submission`, `get-admin-submission-queue`).
