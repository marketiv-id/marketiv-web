# Notifications — User Flow

## Menerima Notifikasi

```text
Event terjadi di modul lain (mis. kreator kirim deliverable)
↓
Appwrite Function modul terkait (event DB / cron / HTTP)
↓
createDocument("notifications", id deterministik, isRead=false,
               permission read+update untuk penerima)
↓
Realtime event tabel `notifications` sampai ke klien penerima
↓
NotificationProvider memuat ulang daftar → badge bell & sidebar naik
(Khusus chat: send-chat-notification juga mencoba push Appwrite Messaging)
(Email: belum diimplementasikan)
```

## Membaca Notifikasi

```text
User klik bell (dropdown, 6 notifikasi terbaru)
  atau buka /dashboard/{umkm|kreator}/notifikasi
↓
Lihat daftar (terbaru di atas), filter tab: Semua / Belum Dibaca /
Campaign / Negosiasi / [Paket Harga — kreator] / Keuangan / Sistem
↓
Klik notifikasi → dialog detail terbuka
↓
Jika belum dibaca → isRead = true (optimistic, update langsung dari klien)
↓
Tombol aksi "Lihat …" (jika kategori punya tautan) → navigasi ke halaman terkait
```

## Tandai Semua Dibaca

```text
User klik "Tandai Semua Dibaca"
↓
UI optimistic: semua item isRead = true
↓
executeFunction("mark-notifications-read", { ids: <id yang belum dibaca> })
↓
Gagal → daftar dimuat ulang dari server
```

## Hapus Notifikasi (catatan)

UI masih menampilkan tombol "Hapus Notifikasi" (item list & dialog detail). Karena baris tidak punya `Permission.delete`, `deleteDocument` dari klien ditolak; item hilang sesaat (optimistic) lalu muncul lagi setelah reload. Lihat [50_Database.md](50_Database.md).
