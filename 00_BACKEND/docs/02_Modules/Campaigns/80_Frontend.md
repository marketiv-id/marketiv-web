# Campaigns — Frontend

Service: `src/services/umkm/umkm-dashboard.service.ts` / `src/services/creator/creator-dashboard.service.ts` (wrapper mock/Appwrite) → `*-appwrite.service.ts`. Kontrak di [60_API.md](60_API.md).

## Halaman UMKM

### Buat / Edit Campaign — `/dashboard/umkm/campaign/buat`, `/dashboard/umkm/campaign/[campaignId]/edit`

Komponen `CreateCampaignWizard` (`src/components/features/umkm-dashboard/create-campaign/`), 5 langkah, validasi `src/lib/validations/campaign.schema.ts`:

1. **Info Produk** (`ProductInfoStep`) — judul (≤255), thumbnail produk wajib untuk campaign baru (upload ke bucket `campaign-assets`), kategori/niche, tipe UGC/Clipping, deskripsi (30–2000). Platform tidak dipilih (selalu TikTok).
2. **Brief & Arahan** (`BriefGuidelineStep`) — gaya video & CTA wajib, quick directions, generate brief AI opsional (`ai-brief`).
3. **Tautan Aset** (`AssetLinkStep`) — satu URL folder Google Drive / Dropbox / OneDrive (`https://`).
4. **Anggaran & Kuota** (`BudgetQuotaStep`) — tarif per 1.000 tayangan: Rp3.000 / Rp5.000 / Rp8.000 atau kustom; total budget (min Rp50.000, quick pick 500rb–3jt); kuota kreator (≥1). `BudgetCalculatorCard` menampilkan ringkasan.
5. **Review & Dana Aman** (`ReviewEscrowStep`) — persetujuan wajib, lalu bayar via Midtrans Snap; setelah sukses, publish otomatis dengan polling.

- Auto-draft lokal (`create-campaign.autodraft.ts`); edit hanya untuk campaign `draft` (rehydrate dari brief/asset tersimpan).
- Mode demo (`useMockData`) memakai `PaymentSimulationModal` / `SimulatedSnapModal`.

### Daftar Campaign — `/dashboard/umkm/campaign`

- `CampaignsPage`: ringkasan, toolbar filter, tabel/kartu campaign + jumlah submission per status (`getSubmissionCounts`, satu query batch).
- Aksi: terbitkan (draft), jeda (via `CancelCampaignModal` → pause), duplikasi (`DuplicateCampaignModal`), hapus draft, ekspor laporan.

### Detail Campaign — `/dashboard/umkm/campaign/[campaignId]`

- `CampaignDetailPage`: header, overview, budget, health checklist, timeline aktivitas, quick actions (pause/resume).
- `CampaignSubmissionSection` + `SubmissionDetailModal`: **read-only** — URL konten, status validasi, views ("Belum diverifikasi" bila pending), reward ("Belum dihitung" bila pending), alasan penolakan. Tidak ada tombol approve/reject atau input views.

## Halaman Creator

### Job Pool — `/dashboard/kreator/job-pool`, `/dashboard/kreator/job-pool/[id]`

- `JobPoolView`: campaign `active`, filter niche, sort, filter "masih tersedia" (kuota), tombol claim.
- `JobDetailView`: brief (`briefDetail`, `cta`, `objective`, do & don't), tautan materi, tombol claim.

### Pekerjaan Aktif — `/dashboard/kreator/pekerjaan-aktif`, `/dashboard/kreator/pekerjaan-aktif/[id]`

- `PekerjaanAktifView`: daftar claim + deadline; "Kirim Bukti" bila belum submit; batalkan claim bila `canUnclaimCreatorActiveWork`.
- `ActiveWorkDetailView`: form bukti (URL sesuai platform campaign, catatan opsional, konfirmasi) → `submit-campaign-proof`; status validasi, views terkunci, estimasi pendapatan ("Belum dihitung" sebelum valid).

## Halaman Admin (app `admin/`)

- `admin/src/app/submissions` + `admin/src/features/admin/submissions/`: `SubmissionTable`/`SubmissionCard` (antrean via `get-admin-submission-queue`, limit 50, pencarian di klien), `SubmissionReviewDialog` (konteks kreator/campaign/UMKM, link post, hitung mundur periode observasi), `ApproveSubmissionDialog` (input views terverifikasi + estimasi reward non-otoritatif), `RejectSubmissionDialog` (alasan wajib di UI) → `review-submission`.

## Halaman Publik

- `/jelajah` — placeholder "Jelajah Kreator" (sedang dikembangkan); tidak menampilkan campaign.

## Komponen Kunci

- `CampaignCard` / `CampaignTable` — ringkasan campaign UMKM.
- `CampaignSubmissionCard` — ringkasan submission (UMKM, read-only).
- `CreatorStatusBadge` — badge status claim/submission/fraud di sisi kreator.
