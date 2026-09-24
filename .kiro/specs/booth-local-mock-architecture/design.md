# Technical Design: Booth Exhibition Local Mock Architecture (Option A)

## 1. Architectural Overview & State Flow

Sistem Local Mock pameran beroperasi sepenuhnya di sisi klien (*client-side runtime*) dengan lapisan penyimpanan reaktif berbasis `localStorage`. Seluruh mutasi dari simulasi alur pengunjung langsung direfleksikan ke dalam *Stateful Demo Store*.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                             BROWSER VIEWPORT                                │
│                                                                             │
│  ┌───────────────────────┐             ┌─────────────────────────────────┐  │
│  │  UMKM Dashboard Views │             │      Creator Dashboard Views    │  │
│  │   (/dashboard/umkm/*) │             │       (/dashboard/kreator/*)    │  │
│  └───────────┬───────────┘             └────────────────┬────────────────┘  │
│              │                                          │                   │
│              ▼                                          ▼                   │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │                    MOCK SERVICE BRANCH FACADE                         │  │
│  │     (umkm-dashboard.service.ts & creator-dashboard.service.ts)        │  │
│  │              [Controlled by: DATA_SOURCE_CONFIG.useMockData]          │  │
│  └───────────────────────────────────┬───────────────────────────────────┘  │
│                                      │                                      │
│                                      ▼                                      │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │                         STATEFUL DEMO STORE                           │  │
│  │                      (src/lib/demo/demo-store.ts)                     │  │
│  │                                                                       │  │
│  │  - campaigns: Campaign[]            - activeWorks: CreatorActiveWork[]│  │
│  │  - negotiations: Negotiation[]      - chatMessages: Record<id, Msg[]> │  │
│  │  - transactions: Transaction[]      - profiles: UMKM & Creator DTOs   │  │
│  └───────────────────────────────────┬───────────────────────────────────┘  │
│                                      │                                      │
│                                      ▼                                      │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │               BROWSER STORAGE (marketiv_demo_store_v1)                │  │
│  │           [Persists across refreshes, 1-Click Reset Capable]          │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
│                                                                             │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │              FLOATING DEMO CONTROL BAR (Fixed Bottom)                 │  │
│  │   [Role Switcher: UMKM | Kreator]  [🔄 Reset Data]  [🟢 Offline Safe] │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────────┘
                                      ✕
                                 AIR-GAP WALL
                                      ✕
┌─────────────────────────────────────────────────────────────────────────────┐
│                    EXTERNAL BACKEND & PRODUCTION APIS                       │
│    Appwrite Cloud (*.appwrite.io)  |  Midtrans Production/Sandbox Server    │
│                        (ZERO CALLS / 100% UNTOUCHED)                        │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Stateful Demo Store Specification

### 2.1 Lokasi File & Interface Data
File: `src/lib/demo/demo-store.ts`

```typescript
export interface DemoStoreState {
  version: number;
  lastResetAt: string;
  activeRole: "umkm" | "creator" | "admin";
  campaigns: Campaign[];
  creatorJobs: CreatorJob[];
  creatorActiveWorks: CreatorActiveWork[];
  negotiations: CreatorNegotiation[];
  chatMessages: Record<string, ChatMessage[]>;
  transactions: CreatorTransaction[];
  umkmProfile: UmkmSettingsProfile;
  creatorProfile: CreatorProfile;
}
```

### 2.2 Pristine Seed Data (Showcase Berstandar Anti-Slop)
Data default saat aplikasi pertama kali dibuka atau setelah ditekan tombol Reset:

1. **Campaigns (4 item):**
   - `cmp_01`: *"Review Jujur Sambal Roa Pedas Gurih"* (Status: `active`, Quota: 3, Used: 1, Budget: Rp 1.500.000).
   - `cmp_02`: *"Koleksi Kemeja Batik Pewarna Alami"* (Status: `active`, Quota: 2, Used: 0, Budget: Rp 800.000).
   - `cmp_03`: *"Brewing Guide Kopi Robusta Lereng Ijen"* (Status: `active`, Quota: 5, Used: 2, Budget: Rp 2.000.000).
   - `cmp_04`: *"Cemilan Keripik Pisang Cokelat Lumer"* (Status: `completed`, Quota: 4, Used: 4, Budget: Rp 1.200.000).

2. **Creator Jobs (Mirror dari Campaigns untuk Job Pool):**
   - Menampilkan kampanye di atas dengan metrik views & bayaran per 1000 views yang seimbang.

3. **Creator Active Works:**
   - 1 pekerjaan aktif berstatus `"claimed"` siap dicoba untuk kirim link bukti postingan.
   - 1 pekerjaan berstatus `"submitted"` siap ditinjau.

4. **Negotiation Room:**
   - 1 room aktif antara UMKM Sambal Roa & Nadia Style dengan bubble Custom Offer (v1) siap dicoba klik terima/tolak.

### 2.3 Persistence & SSR Safety
- Penyimpanan menggunakan `localStorage.getItem("marketiv_demo_store_v1")`.
- Guard `typeof window !== "undefined"` wajib di setiap fungsi baca/tulis.
- Event listener `window.addEventListener("storage", ...)` opsional untuk sinkronisasi antar-tab.

---

## 3. UI Component Inventory

### 3.1 [NEW] `FloatingDemoBar.tsx`
- **Direktori:** `src/components/features/demo/FloatingDemoBar.tsx`
- **Tampilan:** Floating pill bar minimalis di bawah layar (`fixed bottom-4 left-1/2 -translate-x-1/2 z-50`).
- **Elemen:**
  - Status indicator: Titik hijau berkedip + label `"Booth Demo Mode (Offline Safe)"`.
  - Tombol Role Switcher:
    - `[🏪 UMKM]`: Mengarahkan ke `/dashboard/umkm` dan menyimpan `marketiv.mock.role = "umkm"`.
    - `[🎨 Kreator]`: Mengarahkan ke `/dashboard/kreator` dan menyimpan `marketiv.mock.role = "creator"`.
  - Tombol `[🔄 Reset Data]`:
    - Membuka dialog konfirmasi mini: *"Reset seluruh data demo ke kondisi awal pameran?"*.
    - Jika dikonfirmasi: memanggil `resetDemoStore()`, memicu toast notifikasi sukses, dan me-reload halaman.

### 3.2 [NEW] `SimulatedSnapModal.tsx`
- **Direktori:** `src/components/features/demo/SimulatedSnapModal.tsx`
- **Tampilan:** Modal overlay presisi meniru visual resmi Midtrans Snap:
  - Header: Logo Midtrans, Nama Merchant (*"Marketiv Escrow"*), Total Tagihan (Rupiah).
  - Tab Metode Pembayaran:
    - **QRIS / GoPay / ShopeePay**: Tampilan QR code statis dengan timer 15:00.
    - **Virtual Account (BCA / Mandiri / BNI)**: Nomor VA simulasi (`880123456789`).
  - Tombol Aksi:
    - Tombol Hijau: `[Simulasikan Bayar Berhasil]` &rarr; Memicu callback `onSuccess` dan otomatis mengaktifkan campaign/order.
    - Tombol Abu-abu: `[Batal / Tutup]` &rarr; Memicu `onClose`.

### 3.3 [MODIFY] `src/services/umkm/umkm-dashboard.service.ts`
- Modifikasi branch `DATA_SOURCE_CONFIG.useMockData`:
  - `getCampaigns()`: Membaca dari `demoStore.getCampaigns()` alih-alih `mockCampaigns` statis.
  - `createCampaignDraft()`: Memasukkan campaign baru ke `demoStore.addCampaign(campaign)`.
  - `publishCampaignDraft()`: Mengubah status campaign di `demoStore` menjadi `"active"`.

### 3.4 [MODIFY] `src/services/creator/creator-dashboard.service.ts`
- Modifikasi branch `DATA_SOURCE_CONFIG.useMockData`:
  - `getCreatorJobs()`: Membaca dari `demoStore.getJobs()`.
  - `claimCampaign(campaignId)`: Memotong kuota di `demoStore`, membuat record baru di `demoStore.activeWorks`.
  - `submitProof(input)`: Mengubah status pekerjaan di `demoStore` menjadi `"submitted"`.

### 3.5 [MODIFY] `src/app/layout.tsx`
- Render komponen `<FloatingDemoBar />` secara kondisional hanya saat `DATA_SOURCE_CONFIG.useMockData === true`.

---

## 4. Verification & Testing Strategy

1. **Unit Test Store (`demo-store.test.ts`)**:
   - Uji inisialisasi default saat storage kosong.
   - Uji persistensi mutasi (tambah campaign, klaim job, ubah status).
   - Uji fungsi reset mengembalikan data persis ke seed default.
2. **End-to-End Walkthrough Test**:
   - Buka role UMKM &rarr; Buat campaign baru &rarr; Bayar via Simulated Snap &rarr; Pastikan campaign muncul di daftar.
   - Pindah ke role Kreator &rarr; Buka Job Pool &rarr; Pastikan campaign yang baru dibuat muncul &rarr; Klik klaim &rarr; Pastikan muncul di Pekerjaan Aktif.
   - Klik Reset Data Demo &rarr; Pastikan data kembali bersih seperti semula.
