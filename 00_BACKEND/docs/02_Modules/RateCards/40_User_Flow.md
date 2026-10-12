# Rate Cards — User Flow

## Alur Creator (`/dashboard/kreator/rate-card`)

```text
Buka "Paket Harga"
↓
Tambah Paket (maks 3): name, output, description, deliveryDays, price, revisionLimit, toggle aktif
↓
Simpan → rate_cards (draft|published) + rate_card_packages
↓
Kelola: Edit (update in place) · Toggle Tayangkan/Jadikan draf · Hapus
  └─ Hapus ditolak bila paket dipakai order aktif → opsi "Jadikan Draft"
```

## Alur UMKM

```text
Direktori Kreator (/dashboard/umkm/kreator)
  cari nama/bio, filter niche, urut: Peringkat · Harga Terendah · Pesanan Terbanyak · Keterlibatan
↓
Profil Kreator (/dashboard/umkm/kreator/{id}) → daftar paket published
↓
"Pilih Paket Ini" → modal mulai negosiasi → create-conversation
↓
Ruang negosiasi (/dashboard/umkm/negosiasi/{conversationId}?packageId=…)
↓
Modal offer diprefill dari paket (harga, ruang lingkup = deskripsi, revisi, deadline = hari ini + deliveryDays)
↓
Kirim offer (create-offer, packageId tervalidasi) → Creator accept → Order (modul Orders)
```

- Paket yang tidak lagi `published` saat ruang dibuka → peringatan "Paket acuan tidak tersedia…", offer tetap bisa dikirim tanpa paket.
- Direct Order (pesan paket tanpa negosiasi) **belum diimplementasikan**.
