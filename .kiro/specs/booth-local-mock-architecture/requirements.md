# Requirements: Booth Exhibition Local Mock Architecture (Option A)

## 1. Executive Summary & Context
Platform Marketiv akan dipamerkan di booth expo/pameran kewirausahaan (P2MW). Calon pengguna (UMKM, kreator, juri, investor) akan langsung mencoba flow utama di laptop/tablet yang disediakan di booth. Sesuai keputusan Opsi A, seluruh sistem demo pameran beroperasi dalam **Pure Local Mock (`NEXT_PUBLIC_USE_MOCK_DATA=true`)**:
- 100% mandiri tanpa ketergantungan koneksi internet venue pameran.
- 0% risiko kontaminasi ke database Staging maupun Production.
- Pengalaman interaktif penuh: data yang dibuat atau diklaim oleh pengunjung benar-benar muncul dan bertahan selama sesi berlangsung.

---

## 2. User Stories

### US-01: Simulasi Pembuatan Kampanye oleh UMKM
Sebagai pengunjung booth yang berperan sebagai UMKM,  
Saya ingin membuat kampanye pemasaran baru melalui wizard langkah-demi-langkah dan melihat simulasi pembayaran escrow Midtrans Snap,  
Agar saya memahami kemudahan beriklan pay-per-view di Marketiv dan melihat kampanye baru saya langsung tayang di daftar kampanye.

### US-02: Simulasi Pengambilan & Pengiriman Job oleh Kreator
Sebagai pengunjung booth yang berperan sebagai Kreator,  
Saya ingin melihat Job Pool yang berisi kampanye aktif, mengklaim salah satu pekerjaan, dan mengirimkan bukti posting,  
Agar saya merasakan langsung alur kerja kreator konten mikro mendapatkan penghasilan di Marketiv.

### US-03: Simulasi Negosiasi Rate Card & Custom Offer
Sebagai pengunjung booth,  
Saya ingin mencoba simulasi negosiasi Rate Card (mengirim & menerima Custom Offer di ruang obrolan),  
Agar saya memahami mekanisme kerja sama kolaborasi eksklusif antara UMKM dan Kreator.

### US-04: Pemulihan Data Bersih 1-Klik oleh Operator Booth
Sebagai kru/operator penjaga booth,  
Saya ingin dapat menekan satu tombol "Reset Data Demo" untuk mengembalikan seluruh data ke kondisi awal yang rapi dan segar,  
Agar pengunjung berikutnya selalu disambut dengan dashboard yang bersih tanpa data sampah ("test asdf") dari pengunjung sebelumnya.

### US-05: Penggantian Peran Cepat (Quick Role Switcher)
Sebagai pengunjung atau operator booth,  
Saya ingin dapat berganti peran secara instan antara UMKM dan Kreator lewat satu klik bilah kontrol,  
Agar demonstrasi multi-peran dapat dilakukan dengan cepat tanpa perlu proses logout/login berulang kali.

---

## 3. RFC 2119 Acceptance Criteria

### REQ-01: Zero Network Dependency & Isolation
- The application SHALL operate fully when `NEXT_PUBLIC_USE_MOCK_DATA=true` without requiring active internet connectivity.
- The application SHALL NOT initiate network requests to external Appwrite Cloud endpoints (`*.appwrite.io`, `api.marketiv.id`, `api-staging.marketiv.id`) or external Midtrans servers in this mode.

### REQ-02: Stateful Demo Store Persistence
- The system SHALL maintain a stateful mock repository in browser storage (`localStorage` key: `marketiv_demo_store_v1`).
- The demo store SHALL be pre-seeded on first load with authentic Indonesian showcase data:
  - UMKM: Sambal Roa Juara Manado, Batik Tulis Sekar Kencana, Kopi Robusta Lereng Ijen.
  - Kreator: Rian Kulineran (Foodies TikTok), Nadia Style (Fashion IG), Dimas Visuals.
- Any mutation during the demo SHALL update the stateful store and persist across page navigation.

### REQ-03: Floating Booth Demo Bar
- WHEN `NEXT_PUBLIC_USE_MOCK_DATA=true`, a floating control bar SHALL be fixed at the bottom center of the viewport.
- The control bar SHALL display:
  1. Active Role badge with instant switcher buttons: `[🏪 UMKM]` and `[🎨 Kreator]`.
  2. `[🔄 Reset Data Demo]` button with confirmation prompt.
  3. Status indicator: `🟢 Offline Booth Mode`.
- WHEN `NEXT_PUBLIC_USE_MOCK_DATA=false`, the floating bar SHALL NOT render.

### REQ-04: UMKM Campaign Lifecycle Parity
- WHEN a visitor completes the campaign creation wizard and confirms payment:
  1. A new campaign record SHALL be inserted into the stateful demo store with status `"active"`.
  2. The visitor SHALL be redirected to `/dashboard/umkm/campaign` where the new campaign SHALL appear immediately at the top of the list.
  3. The new campaign SHALL also be visible in the Creator Job Pool (`/dashboard/kreator/job-pool`).

### REQ-05: Creator Claim & Submission Parity
- WHEN a visitor claims a campaign from `/dashboard/kreator/job-pool`:
  1. The campaign's `usedQuota` in the demo store SHALL increment by 1.
  2. A new active work record SHALL be added to `/dashboard/kreator/pekerjaan-aktif` with status `"claimed"`.
  3. WHEN the visitor submits a proof URL, the active work status SHALL update to `"submitted"` ("Menunggu Validasi").

### REQ-06: Realistic Simulated Midtrans Snap Modal
- WHEN a visitor clicks "Lanjut ke Pembayaran Midtrans" in `PaymentSimulationModal`:
  1. The system SHALL open an interactive simulated Midtrans Snap modal overlay.
  2. The modal SHALL display realistic payment channel tabs: `[QRIS / GoPay / ShopeePay]` and `[BCA / Mandiri / BNI Virtual Account]`.
  3. Clicking "Simulasikan Pembayaran Berhasil" SHALL close the modal, trigger `onSuccess`, and transition the campaign/order status to active/escrow.

### REQ-07: 1-Click State Reset
- WHEN the operator clicks `[🔄 Reset Data Demo]`:
  1. The `localStorage` key `marketiv_demo_store_v1` SHALL be cleared and re-initialized with the pristine showcase seed.
  2. A toast notification `"Data demo pameran berhasil di-reset ke kondisi awal"` SHALL appear.
  3. The page SHALL reload cleanly to `/dashboard/umkm` or `/dashboard/kreator`.

---

## 4. Boundaries & Out of Scope
- Real banking/payment gateway settlements are out of scope (simulated success/pending only).
- Real Appwrite bucket file uploads are out of scope (uses mock Unsplash asset URLs).
- Production database synchronization is strictly out of scope and forbidden.
