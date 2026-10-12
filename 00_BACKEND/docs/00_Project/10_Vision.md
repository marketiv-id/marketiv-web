# Visi Marketiv

## Apa itu Marketiv

Marketiv adalah platform yang menghubungkan UMKM dengan Content Creator untuk kebutuhan promosi digital melalui dua model bisnis:

- **Campaign (Pay-Per-View)** — UMKM membuka campaign publik, creator mendaftar dan dibayar berdasarkan performa konten.
- **Rate Card / Order (Escrow)** — UMKM memesan jasa creator secara langsung melalui paket layanan tetap (rate card) atau negosiasi khusus (custom offer), dengan sistem escrow yang mengamankan dana sampai hasil disetujui.

Marketiv mencakup seluruh alur dari discovery, pemesanan, escrow, pengerjaan, deliverable, revisi, hingga pencairan dana — bukan sekadar perantara campaign promosi.

## Masalah yang Diselesaikan

- UMKM kesulitan menemukan creator yang tepat dan membayar promosi secara aman.
- Creator butuh sumber pekerjaan promosi yang jelas, terbayar, dan terlindungi dari sengketa.

## Dua Model Bisnis

### 1. Campaign (Pay-Per-View)

Campaign publik berbasis performa: UMKM membuka campaign, creator mendaftar, dibayar per jumlah views.

**Cara kerja:**

1. **UMKM** membuat **Campaign** (draft) — memuat informasi produk, brief (bisa pakai AI Brief Generator), reward per 1000 views (CPM), budget, dan syarat creator.
2. **UMKM membayar budget** lewat Midtrans Snap (`create-payment` purpose `campaign`, fee buyer-side — lihat [ADR-008](../04_Decisions/ADR-008.md)) → `midtrans-webhook` → `create-escrow` menambah `campaigns.remainingBudget` (dana tidak masuk wallet bebas).
3. **Campaign aktif** — tampil di Job Pool creator, siap diklaim.
4. **Creator** menemukan campaign yang sesuai → melakukan **claim**.
5. **Creator** memproduksi konten sesuai brief → memposting di TikTok (platform MVP) → mengirim **Submission** berupa URL posting (`submit-campaign-proof`; `views` awal = 0).
6. **Sistem** menjalankan **Fraud Check** otomatis (`ai-fraud-precheck`) → `fraudScore` + `fraudStatus`.
7. **Admin Marketiv** memvalidasi submission (`review-submission`) dan mengisi jumlah views (`views_source = manual_admin`) → approve atau reject. Otoritas ada di Admin, bukan UMKM ([ADR-010](../04_Decisions/ADR-010.md)).
8. **Penyelesaian** — Jika approve, `calculate-campaign-reward` menghitung reward dari views dan mengkreditnya langsung ke `wallets.balance` creator.

Alur inti: UMKM → buat campaign → bayar budget → aktif → creator claim → produksi konten → submit → fraud check → validasi Admin → reward.

### 2. Rate Card / Order (Escrow)

Pemesanan langsung jasa creator melalui paket layanan yang sudah ditetapkan.

**Cara kerja:**

1. **Creator** membuat **Rate Card** — etalase layanan berisi paket-paket (Basic/Standard/Premium) dengan harga, output, durasi pengerjaan, dan batas revisi.
2. **UMKM** menemukan creator lewat discovery (filter kota, range harga, sort by harga/rating/totalOrders pada MVP), lalu melihat rate card-nya.
3. **Pemesanan** dilakukan lewat **offer** di ruang negosiasi (chat):
   - **Paket rate card** — offer membawa `packageId` opsional sehingga nama & harga paket di-snapshot (`packageNameSnapshot`, `packagePriceSnapshot`).
   - **Custom Offer** — UMKM dan creator bernegosiasi via chat, lalu UMKM membuat offer khusus (`create-offer`).
   - Jika creator menerima offer, `create-order` (event `offers.rows.*.update`) membuat order.
   - *Direct Order tanpa offer/negosiasi belum diimplementasikan sebagai jalur terpisah.*
4. **Order** menjadi aggregate utama ([ADR-003](../04_Decisions/ADR-003.md)) — mengikat:
   - **Escrow** — dana UMKM (dibayar via Midtrans Snap) ditahan sistem, diamankan sampai deliverable disetujui.
   - **Deliverable** — creator mengirim hasil kerja/bukti (`submit-ratecard-deliverable`).
   - **Revision** — UMKM dapat meminta revisi sesuai batas paket (`request-ratecard-revision`).
5. **Penyelesaian** — UMKM approve deliverable (atau auto-approve oleh `auto-approve-orders` setelah tenggat review lewat) **dan** Admin memvalidasi bukti (`review-ratecard-deliverable` → tabel `ratecard_deliverable_validations`) → `release-escrow` merilis escrow ke wallet creator dikurangi platform fee 2% seller-side ([ADR-008](../04_Decisions/ADR-008.md)).

Alur inti: UMKM → cari creator → lihat rate card → pesan/nego → order → bayar (escrow) → deliverable → approve UMKM + validasi Admin → release → selesai.

## Bukan Apa

- **Bukan marketplace terbuka** seperti Fiverr. Marketiv mengarahkan UMKM langsung ke creator melalui offer/campaign, bukan bidding bebas publik.

## Referensi

- Ruang lingkup MVP: [20_Scope.md](20_Scope.md)
- Teknologi: [40_Tech_Stack.md](40_Tech_Stack.md)
