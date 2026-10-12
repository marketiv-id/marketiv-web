# Tutorial: Membagikan Aset Campaign via Folder Cloud

## Cara Menyediakan Footage (Foto, Video, Logo) untuk Kreator

Marketiv tidak menyimpan file materi produksi. Satu campaign memakai **satu tautan folder cloud publik** yang disimpan di `campaign_assets.fileUrl` (lihat [50_Database.md](50_Database.md)). Layanan yang diterima wizard: **Google Drive, Dropbox, OneDrive/SharePoint**.

> Gambar produk utama (thumbnail campaign) **berbeda**: diunggah langsung di langkah 1 wizard ke storage Marketiv (bucket `campaign-assets`), bukan lewat tautan folder.

---

## Langkah 1 — Siapkan Folder

1. Buka [Google Drive](https://drive.google.com) (atau Dropbox / OneDrive) dan login.
2. Buat satu folder khusus untuk campaign.
3. Unggah materi ke folder tersebut. Materi yang disarankan UI:

| Materi | Keterangan |
|---|---|
| Foto Produk | Foto produk dari beberapa sisi (disarankan) |
| Video Produk | Video mentah yang bisa dipakai kreator (disarankan) |
| Logo Usaha | Logo untuk ditampilkan di video (jika ada) |
| Contoh Video | Contoh gaya video yang disukai (jika ada) |

Format file bebas — Marketiv tidak membaca isi folder.

---

## Langkah 2 — Atur Akses Publik

1. Klik kanan folder → **Bagikan**.
2. Di bagian "Akses umum", pilih **Siapa saja yang memiliki link**.
3. Atur peran ke **Pelihat** (disarankan).
4. Klik **Selesai**.

> Jika folder tidak publik, kreator tidak bisa membuka materi. Sistem tidak memeriksa apakah folder benar-benar publik.

---

## Langkah 3 — Salin Tautan

1. Klik kanan folder → **Bagikan** → **Salin tautan**.
2. Contoh format: `https://drive.google.com/drive/folders/xxx?usp=sharing`.

---

## Langkah 4 — Tempel di Wizard Marketiv

1. Buka **Buat Campaign** (atau **Edit** untuk draft).
2. Di langkah 3 **Tautan Aset**, tempel tautan pada kolom **Tautan Folder Foto & Video** (wajib).
3. (Opsional) isi **Catatan untuk Kreator**, mis. "Logo tersedia di folder 'Logo'".
4. Lanjutkan wizard. Tautan disimpan bersama draft.

---

## Aturan Validasi

- Tautan wajib diawali `https://`.
- Host harus `drive.google.com`, `dropbox.com` / `www.dropbox.com`, `onedrive.live.com`, `1drv.ms`, atau `*.sharepoint.com` (`APPROVED_CLOUD_STORAGE_DOMAINS`). CDN atau situs lain ditolak.
- Validasi ini hanya di frontend; tidak ada validasi URL aset di server.
- Tautan aset hanya bisa diubah/dihapus selama campaign masih `draft`.

---

## Jika Ada Masalah

Hubungi admin via WhatsApp jika mengalami kendala.
