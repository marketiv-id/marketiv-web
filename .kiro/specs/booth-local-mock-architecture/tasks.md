# Implementation Tasks: Booth Exhibition Local Mock Architecture (Option A)

- [x] Task 1: Create Stateful Demo Store (`src/lib/demo/demo-store.ts`) <!-- id: 1 -->
  - Define `DemoStoreState` interface.
  - Author authentic Indonesian showcase seed data (Sambal Roa, Batik Tulis, Kopi Robusta, Rian Foodies, Nadia Style).
  - Implement SSR-safe `localStorage` getter, setter, and reset functions (`getDemoStore()`, `saveDemoStore()`, `resetDemoStore()`).
  - Implement mutators: `addDemoCampaign`, `publishDemoCampaign`, `claimDemoJob`, `submitDemoProof`.
  - _Requirements: REQ-02, REQ-07_

- [x] Task 2: Unit Test Suite for Demo Store (`src/lib/demo/__tests__/demo-store.test.ts`) <!-- id: 2 -->
  - Test default initialization from pristine seed.
  - Test mutation persistence (adding campaign, claiming job, changing status).
  - Test reset function restoring state to pristine seed.
  - _Requirements: REQ-02, REQ-07_

- [x] Task 3: Connect UMKM Service Mock Branch to Demo Store <!-- id: 3 -->
  - Modify `src/services/umkm/umkm-dashboard.service.ts`:
    - `getCampaigns`: read from `demoStore.getCampaigns()`.
    - `getCampaignById`: find in `demoStore.getCampaigns()`.
    - `createCampaignDraft`: persist into `demoStore`.
    - `publishCampaignDraft`: update status to `"active"` in `demoStore`.
  - _Requirements: REQ-04_

- [x] Task 4: Connect Creator Service Mock Branch to Demo Store <!-- id: 4 -->
  - Modify `src/services/creator/creator-dashboard.service.ts`:
    - `getCreatorJobs`: read from `demoStore.getJobs()`.
    - `getCreatorActiveWorks`: read from `demoStore.getActiveWorks()`.
    - `claimCampaign`: decrement quota and add record to `demoStore.activeWorks`.
    - `submitProof`: update status to `"submitted"` in `demoStore`.
  - _Requirements: REQ-05_

- [x] Task 5: Build Simulated Midtrans Snap Modal (`src/components/features/demo/SimulatedSnapModal.tsx`) <!-- id: 5 -->
  - Create interactive mock modal matching Midtrans Snap visual hierarchy.
  - Render payment method selector (QRIS mockup, Bank Transfer VA mockup).
  - Provide "Simulasikan Bayar Berhasil" action button triggering `onSuccess`.
  - Wire into `src/components/features/umkm-dashboard/create-campaign/modals/PaymentSimulationModal.tsx` when mock mode is active.
  - _Requirements: REQ-06_

- [x] Task 6: Build & Mount Floating Demo Bar (`src/components/features/demo/FloatingDemoBar.tsx`) <!-- id: 6 -->
  - Create bottom-center floating pill bar with frosted glass styling (`backdrop-blur-md bg-neutral-900/90`).
  - Add quick role switcher buttons: `[🏪 UMKM]` & `[🎨 Kreator]` updating `MOCK_ROLE_KEY` and navigating.
  - Add `[🔄 Reset Data]` button with confirmation dialog.
  - Add status badge: `🟢 Offline Booth Mode`.
  - Mount conditionally in `src/app/layout.tsx` only when `DATA_SOURCE_CONFIG.useMockData` is true.
  - _Requirements: REQ-03, REQ-07_

- [x] Task 7: Comprehensive Verification Gate <!-- id: 7 -->
  - Run automated unit tests: `npx vitest run src/lib/demo/__tests__/demo-store.test.ts`.
  - Run regression test suite: `npm test`.
  - Run strict type check: `npx tsc --noEmit`.
  - Verify complete offline isolation (no network errors in browser console).
  - _Requirements: REQ-01, REQ-08_
