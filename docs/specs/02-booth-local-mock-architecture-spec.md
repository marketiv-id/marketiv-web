# 🎪 Marketiv Booth Exhibition Local Mock Architecture (Option A) — Master Specification

**Document Code:** `SPEC-BOOTH-MOCK-OPT-A`  
**Target:** Pameran & Booth Demo Interaktif P2MW 2026  
**Status:** APPROVED FOR IMPLEMENTATION  
**Decision Alignment:** Pure Local Mock (`NEXT_PUBLIC_USE_MOCK_DATA=true`), Stateful LocalStorage Store, Floating Demo Bar, Midtrans Snap Simulator.

---

## 1. Latar Belakang & Analisis Kebutuhan

Saat pameran, booth Marketiv akan didatangi pengunjung (UMKM, kreator, juri P2MW, mahasiswa, calon mitra). Mereka akan mencoba langsung flow utama di laptop/tablet booth.

### Keputusan: Opsi A (Pure Local Mock)
1. **100% Bebas Gangguan Wi-Fi Pameran:** Aplikasi berjalan lancar secara lokal tanpa bergantung pada koneksi internet venue yang seringkali lambat atau padam.
2. **0% Risiko Database:** Database Production dan Staging sama sekali tidak terhubung dan tidak akan tersentuh data sampah uji coba pengunjung.
3. **Pengalaman Nyata & Terhubung (Stateful):** Data yang dibuat pengunjung (misal: buat kampanye baru) tidak hilang dan langsung muncul di daftar kampanye UMKM serta Job Pool Kreator.
4. **1-Klik Reset:** Operator booth dapat mengembalikan seluruh data ke kondisi awal pameran dalam hitungan 1 detik sebelum pengunjung berikutnya datang.

---

## 2. Arsitektur Komponen Teknis

```
                                 [ Pengunjung Booth ]
                                          │
                        ┌─────────────────┴─────────────────┐
                        ▼                                   ▼
              [ Laptop A: UMKM ]                  [ Laptop B: Kreator ]
              • Buat Campaign Baru                • Buka Job Pool
              • Simulasi Bayar Midtrans           • Klaim Campaign
              • Kirim Custom Offer                • Kirim Bukti Tayang (TikTok/IG)
                        │                                   │
                        └─────────────────┬─────────────────┘
                                          ▼
                      ┌───────────────────────────────────────┐
                      │      STATEFUL DEMO STORE (BROWSER)    │
                      │       src/lib/demo/demo-store.ts      │
                      │                                       │
                      │  Penyimpanan: localStorage            │
                      │  Key: marketiv_demo_store_v1          │
                      │  Showcase: Sambal Roa, Batik Wastra   │
                      └───────────────────┬───────────────────┘
                                          │
                        ┌─────────────────┴─────────────────┐
                        ▼                                   ▼
             [ Floating Demo Bar ]               [ Simulated Snap Modal ]
             • Toggle Peran UMKM / Kreator       • Tiru visual popup Midtrans
             • Tombol [Reset Data Demo]          • Tombol [Simulasikan Berhasil]
             • Status: 🟢 Offline Safe           • Langsung aktifkan campaign
```

---

## 3. Rincian Fitur Utama

### 3.1 Stateful Demo Store (`src/lib/demo/demo-store.ts`)
Mengatasi kelemahan mock lama yang bersifat *stateless echo* (di mana data baru tidak pernah masuk ke daftar).
- Menyimpan:
  - `campaigns`: Daftar kampanye UMKM aktif, draft, dan selesai.
  - `creatorJobs`: Mirror kampanye untuk Job Pool kreator.
  - `creatorActiveWorks`: Daftar pekerjaan yang sedang dikerjakan kreator.
  - `negotiations` & `chatMessages`: Riwayat chat negosiasi dan custom offer.
- Operasi Otomatis:
  - **Saat UMKM buat campaign:** Campaign otomatis ditambahkan ke `campaigns` dan langsung muncul di Job Pool.
  - **Saat Kreator klaim job:** Kuota berkurang 1 dan otomatis masuk ke daftar Pekerjaan Aktif kreator.
  - **Saat Kreator submit proof:** Status pekerjaan berubah menjadi *"Menunggu Validasi"*.

### 3.2 Floating Demo Control Bar (`src/components/features/demo/FloatingDemoBar.tsx`)
Bilah kontrol melayang di bagian bawah tengah layar (hanya aktif saat `NEXT_PUBLIC_USE_MOCK_DATA=true`):
- **Tombol Cepat [🏪 UMKM]:** Pindah ke dashboard UMKM (`/dashboard/umkm`).
- **Tombol Cepat [🎨 Kreator]:** Pindah ke dashboard Kreator (`/dashboard/kreator`).
- **Tombol [🔄 Reset Data Demo]:** Menghapus mutasi pengunjung dan mengembalikan data ke seed showcase awal pameran.
- **Badge Status:** `🟢 Booth Demo Mode (Offline Safe)`.

### 3.3 Simulated Midtrans Snap Modal (`src/components/features/demo/SimulatedSnapModal.tsx`)
Ketika pengunjung mengklik *"Lanjut ke Pembayaran"* pada wizard pembuatan kampanye:
- Muncul modal popup realistis yang meniru persis tampilan resmi Midtrans Snap (Header logo, rincian biaya, tab QRIS/GoPay dan Virtual Account).
- Terdapat tombol hijau: **"Simulasikan Pembayaran Berhasil"**.
- Begitu diklik, modal tertutup, status kampanye menjadi **Aktif**, dan pengunjung melihat kampanye mereka langsung live.

---

## 4. Panduan Demo Interaktif Pengunjung (2-Minute Playbook)

### Alur 1: Simulasi Pembuatan Kampanye oleh UMKM (Laptop A)
1. Di bilah bawah, klik tombol **[🏪 UMKM]** (masuk sebagai *Sambal Roa Juara*).
2. Klik tombol oranye **"+ Buat Campaign Baru"**.
3. Isi form wizard:
   - Judul: *"Promo Spesial Pameran P2MW"*.
   - Kategori: *Kuliner*.
   - Target Views: `10.000` &rarr; Estimasi biaya otomatis Rp 150.000.
4. Klik **"Lanjut ke Pembayaran"** &rarr; Muncul invoice breakdown &rarr; Klik **"Lanjut ke Pembayaran Midtrans"**.
5. Popup simulasi Midtrans Snap terbuka &rarr; Klik **"Simulasikan Pembayaran Berhasil"**.
6. Kampanye langsung aktif dan muncul di daftar paling atas!

### Alur 2: Simulasi Klaim Job oleh Kreator (Laptop B / Switch Role)
1. Di bilah bawah, klik tombol **[🎨 Kreator]** (masuk sebagai *Rian Kulineran*).
2. Buka menu **Job Pool** &rarr; Kampanye yang baru dibuat di Alur 1 langsung terlihat dan siap diambil!
3. Klik tombol **"Klaim Pekerjaan"** &rarr; Kuota berkurang, pekerjaan masuk ke tab **Pekerjaan Aktif**.
4. Di tab Pekerjaan Aktif, klik **"Kirim Bukti Tayang"** &rarr; Masukkan link video &rarr; Status berpindah ke *Menunggu Validasi*.

### Alur 3: Reset Data untuk Pengunjung Berikutnya
1. Sebelum pengunjung baru mencoba, operator cukup mengklik **[🔄 Reset Data Demo]** di bilah bawah.
2. Seluruh data sampah terhapus dan kembali ke kondisi awal yang rapi dalam 1 detik.

---

## 5. Rencana Tugas Implementasi (.kiro Tasks)

| Task ID | Modul / File | Deskripsi Pekerjaan |
| :--- | :--- | :--- |
| **Task 1** | `src/lib/demo/demo-store.ts` | Membuat stateful store `localStorage`, seed data showcase Indonesia, dan mutator fungsi. |
| **Task 2** | `src/lib/demo/__tests__/demo-store.test.ts` | Unit test suite memverifikasi inisialisasi, persistensi mutasi, dan fungsi reset. |
| **Task 3** | `src/services/umkm/umkm-dashboard.service.ts` | Menyambungkan branch mock `getCampaigns`, `createCampaignDraft`, dan `publishCampaignDraft` ke `demoStore`. |
| **Task 4** | `src/services/creator/creator-dashboard.service.ts` | Menyambungkan branch mock `getCreatorJobs`, `claimCampaign`, dan `submitProof` ke `demoStore`. |
| **Task 5** | `src/components/features/demo/SimulatedSnapModal.tsx` | Membuat popup simulasi Midtrans Snap interaktif dan mengintegrasikannya ke modal pembayaran. |
| **Task 6** | `src/components/features/demo/FloatingDemoBar.tsx` | Membuat bilah kontrol melayang (Role Switcher + Reset) dan memasangnya di `src/app/layout.tsx`. |
| **Task 7** | Verification Gate | Menjalankan `vitest`, `tsc --noEmit`, dan pengujian end-to-end flow pameran. |
