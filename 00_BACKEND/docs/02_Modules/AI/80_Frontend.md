# AI — Frontend

## Komponen

### AI Brief Generator

- **Lokasi**: langkah Brief & Guideline wizard Create/Edit Campaign — `src/components/features/umkm-dashboard/create-campaign/steps/BriefGuidelineStep.tsx`; aksi di `CreateCampaignWizard.tsx` (`handleGenerateAiBrief`).
- Tombol **"⚡ Susun Arahan dengan AI"**; nonaktif bila deskripsi produk (langkah 1) < 30 karakter (tooltip menjelaskan).
- Chip **"Arahan Cepat"** yang dipilih ditambahkan ke `description` sebagai "Poin utama yang ingin ditekankan".
- Bila "Arahan Anda" sudah terisi → `window.confirm` sebelum ditimpa.
- Loading: tombol berubah "Menyusun arahan dengan AI…" + spinner.
- Hasil mengisi textarea "Arahan Anda" (`briefDetail`) & "Poin Wajib" (`do` → `- …`, `dont` → `- Dilarang: …`); `objective` disimpan di state tersembunyi; badge **"✨ Dibantu AI"**. `contentAngle` & `cta` AI tidak dipakai.
- Error: kode `validation` → pesan server; lainnya → "Layanan AI sedang tidak tersedia. Coba lagi nanti."
- Tidak ada tombol "Simpan Brief" terpisah — brief tersimpan ke `campaign_briefs` saat **Simpan Draft**/pembayaran (`createCampaignDraft`/`updateCampaignDraft`, `generatedByAi`), dengan `doAndDont` dipangkas ≤ 400 byte oleh `packDoAndDontJson` (`src/lib/validations/campaign.schema.ts`).
- Service: `generateCampaignBrief()` → `generateCampaignBriefFromAppwrite()` (lihat `60_API.md`).

### Fraud Precheck (tidak ada UI khusus)

- Berjalan otomatis di backend (asinkron setelah submit bukti).
- Label `fraudStatus` (`src/lib/dashboard-labels.ts`): `safe` → "Aman" (hijau/`success`), `review` → "Perlu Ditinjau" (kuning/`warning`), `rejected` → "Terindikasi Kecurangan" (merah/`danger`).
- **UMKM**: "Status Kecurangan" di `SubmissionDetailModal.tsx` & ekspor `CampaignDetailPage.tsx`; submission dengan `fraudStatus` ≠ `safe` dihitung sebagai "dispute" di ringkasan campaign.
- **Creator**: `PekerjaanAktifView.tsx` / `ActiveWorkDetailView.tsx` menampilkan label bila `fraudStatus` ≠ `safe`; filter "Tinjauan / Kecurangan"; `fraudStatus = rejected` diperlakukan seperti ditolak di UI.
- **Admin**: antrean `get-admin-submission-queue` belum menampilkan `fraudScore`/`fraudStatus` — **belum diimplementasikan**.

### Chatbot Tivvy

- `ChatbotFab` dipasang global di `src/app/layout.tsx`; panel `ChatbotPanel.tsx` memanggil `POST /api/chat` (lihat `60_API.md`, `70_Backend.md`).
- Saran pertanyaan awal & lanjutan berdasarkan audience dan halaman aktif.
