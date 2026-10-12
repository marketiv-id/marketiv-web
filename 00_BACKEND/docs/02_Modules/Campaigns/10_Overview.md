# Campaigns — Overview

Campaign adalah fitur inti **Pay-Per-View (PPV)** Marketiv: UMKM mempromosikan produk, creator dibayar berdasarkan jumlah views konten yang divalidasi Admin Marketiv.

## Alur End-to-End

1. **Create Draft** — UMKM mengisi wizard 5 langkah (info produk + thumbnail, brief, tautan aset, budget/tarif/kuota, review) → `campaigns` `draft` + brief + asset (client SDK).
2. **Generate Brief (opsional)** — wizard memanggil Function `ai-brief`; hasil diedit & disimpan bersama draft. Lihat modul `../AI/`.
3. **Top-Up** — `create-payment` (`purpose: campaign`, amount = budget, fee buyer-side) → Midtrans → `midtrans-webhook` → `create-escrow` menambah `remainingBudget`.
4. **Publish** — `patch-campaign-status` (`publish`) bila `remainingBudget >= budget`; status `draft → active`, campaign tampil di Job Pool, `campaign-published` menotifikasi kreator.
5. **Claim** — kreator membuat claim (client SDK); `campaign-claimed` menegakkan kuota secara atomik.
6. **Submit Bukti** — kreator mengirim URL konten via `submit-campaign-proof`; submission `pending`, claim `submitted`.
7. **Fraud Precheck** — `ai-fraud-precheck` menulis `fraudScore` + `fraudStatus` (metadata, bukan keputusan).
8. **Validasi Admin** — setelah periode observasi 72 jam, Admin Marketiv approve (dengan views final terkunci) atau reject via `review-submission`. UMKM hanya memantau.
9. **Reward** — `calculate-campaign-reward` menghitung `min(floor(views × CPM / 1000), remainingBudget)` dan mengkredit **saldo tersedia** wallet kreator; campaign `completed` bila budget habis.

Claim yang tidak disubmit dalam `submissionDays` di-expire oleh `expire-stale-claims` (tiap 6 jam); kreator dapat membatalkan claim lewat `unclaim-campaign`.

## Aktor

- **UMKM** — membuat, mendanai, mempublikasikan, menjeda/melanjutkan campaign; memantau submission (read-only).
- **Content Creator** — claim campaign, membatalkan claim, mengirim bukti konten.
- **Admin Marketiv** — memvalidasi submission dan menetapkan views final (admin app `admin/` di monorepo ini, halaman `admin/src/app/submissions`, via `get-admin-submission-queue` + `review-submission`).
- **AI Functions** — Brief Generator (opsional) & Fraud Precheck (otomatis). Lihat `../AI/`.

## Koleksi yang Dimiliki

`campaigns`, `campaign_assets`, `campaign_briefs` (legacy) + `6ab530d00018edb50097` (`campaign_briefs_v2`, runtime), `campaign_claims`, `campaign_submissions`, `fraud_checks`; bucket `campaign-assets` (thumbnail). Skema lengkap di `50_Database.md`.
