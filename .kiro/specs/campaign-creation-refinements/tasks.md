# 📋 Tasks: Campaign Creation Flow Refinements

## 👥 Implementation Checklist

- [x] **TASK-01** [Done]: Implementasi fungsi `isCloudStorageFolderUrl` dan perketat `campaignStepSchemas[3]` di `src/lib/validations/campaign.schema.ts` agar hanya menerima domain Google Drive, Dropbox, dan OneDrive.
  _Requirements: 2.1, 2.2, 2.4_

- [x] **TASK-02** [Done]: Sinkronisasi status checker tombol "Cek Tautan" di `src/components/features/umkm-dashboard/create-campaign/steps/AssetLinkStep.tsx` agar menampilkan warning saat URL bukan cloud storage resmi.
  _Requirements: 2.1, 2.3_

- [x] **TASK-03** [Done]: Buat unit test di `src/lib/validations/__tests__/campaign.schema.test.ts` untuk menguji validasi URL (Google Drive/Dropbox/OneDrive lolos, YouTube/TikTok/HTTP biasa ditolak).
  _Requirements: 2.1, 2.2, 2.4_

- [x] **TASK-04** [Done]: Tambahkan atribut DOM ID (`campaign-title`, `field-category`, `field-type`, `campaign-description`, `field-video-style`, `field-call-to-action`, `external-asset-url`, `field-price-per-views`, `field-creator-quota`, `field-total-budget`, `field-terms-agreed`) pada komponen form Step 1–5 sebagai anchor target scroll.
  _Requirements: 3.2, 3.3_

- [x] **TASK-05** [Done]: Implementasi utility helper `scrollToFirstInvalidField` dan integrasikan ke `handleNext()` di `CreateCampaignWizard.tsx` beserta toast warning saat validasi form gagal.
  _Requirements: 3.1, 3.2, 3.3, 3.4_

- [x] **TASK-06** [Done]: Buat helper & hook `useCampaignAutoDraft` di `src/components/features/umkm-dashboard/create-campaign/create-campaign.autodraft.ts` dengan debounce 500ms, namespacing `userId` & `campaignId`, kadaluarsa 7 hari, dan exclude `termsAgreed`.
  _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_

- [x] **TASK-07** [Done]: Pasang `useCampaignAutoDraft` di `CreateCampaignWizard.tsx`, tampilkan toast pemulihan draf dengan aksi "Hapus Draf", dan hapus draf otomatis saat pembayaran Midtrans diinisiasi atau campaign dibuat.
  _Requirements: 1.1, 1.2, 1.3, 1.5_

- [x] **TASK-08** [Done]: Jalankan verifikasi statis dan unit test (`npm run typecheck`, `npm run test`) untuk memastikan zero-regression.
  _Requirements: Non-Regression Invariants_

- [x] **TASK-09** [Done]: Update `campaignWizardSchema`, `composeBriefDetail`, dan `decomposeBriefDetail` di `src/lib/validations/campaign.schema.ts` untuk mendukung `selectedDirections?: string[]`, serta buat fungsi `parseRequiredPoints` untuk dekomposisi dua arah `requiredPoints` ke chip panduan dan aturan kustom.
  _Requirements: 4.1, 4.2, 4.3_

- [x] **TASK-10** [Done]: Refactor `BriefGuidelineStep.tsx` agar menginisialisasi dan menyinkronkan `selectedReqGuidelines`, `selectedRestGuidelines`, dan `customRequiredPoints` dari `requiredPoints` secara reaktif, serta angkat `selectedDirections` ke state wizard.
  _Requirements: 4.1, 4.2, 4.3_

- [x] **TASK-11** [Done]: Update `CreateCampaignWizard.tsx` dan `create-campaign.autodraft.ts` untuk mengelola `selectedDirections` di state wizard dan memastikan round-trip penyimpanan draft lokal & Appwrite tetap utuh.
  _Requirements: 4.3_

- [x] **TASK-12** [Done]: Sinkronkan status "Nominal lain" (`customPriceActive`) di `BudgetQuotaStep.tsx` secara reaktif terhadap nilai `pricePerThousandViews` hasil restore draft.
  _Requirements: 4.4_

- [x] **TASK-13** [Done]: Perbarui `rehydrateWizard` di `create-campaign.rehydrate.ts` untuk memetakan `selectedDirections` dari `decomposed.selectedDirections`.
  _Requirements: 4.3_

- [x] **TASK-14** [Done]: Tambahkan unit test komprehensif di `src/lib/validations/__tests__/campaign.schema.test.ts` untuk `parseRequiredPoints` dan round-trip `composeBriefDetail`/`decomposeBriefDetail` dengan `selectedDirections`.
  _Requirements: 4.1, 4.2, 4.3_

- [x] **TASK-15** [Done]: Jalankan gate verifikasi akhir (`npm run typecheck`, `npx vitest run`) dan uji interaksi wizard.
  _Requirements: Non-Regression Invariants_


