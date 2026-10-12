# Aturan Kerja Proyek

Aturan ini disarikan dari AGENTS.md dan menjadi pedoman kerja semua kontributor (manusia & AI).

## Dokumentasi sebagai Sumber Kebenaran

- `docs/` adalah satu-satunya sumber kebenaran. Source code mengimplementasikan pengetahuan yang terdokumentasi.
- Baca dokumentasi relevan **sebelum** implementasi, modifikasi, atau keputusan arsitektur.
- Git menyimpan histori; dokumentasi menyimpan kebenaran terkini.
- **Golden rule**: jika sebuah implementasi tidak bisa dibenarkan oleh dokumentasi, implementasi itu tidak seharusnya ada.
- Bila dokumen bertentangan dengan kode/config yang sedang berjalan (`functions/`, `appwrite.config.json`), kode adalah kondisi faktual: verifikasi di kode, lalu perbaiki dokumen (atau kodenya, bila kode yang salah). Fitur yang terdokumentasi tapi belum ada di kode ditandai **belum diimplementasikan**.

## Satu Fakta Satu Lokasi

- Jangan duplikasi pengetahuan. Satu dokumen punya satu tanggung jawab.
- Pengetahuan spesifik modul hanya didokumentasikan di dalam modulnya.
- Workflow hanya menjelaskan interaksi antar modul, bukan menduplikasi isi modul.
- ADR menjelaskan WHY; dokumen implementasi menjelaskan HOW. Jangan dicampur.
- Rujuk dengan link relatif, jangan salin konten.

## Service Layer Wajib

- Seluruh akses Appwrite **wajib** lewat service layer.
- Lakukan: `Page/Component → Service (src/services/**) → Appwrite SDK / executeFunction`.
- Jangan: `Page → Appwrite SDK` (memanggil SDK langsung dari halaman/komponen).
- Mutasi sensitif (uang, status lintas user, permission untuk user lain) **wajib** lewat Appwrite Function, bukan tulis langsung dari klien. Lihat [50_Security_Guidelines](../01_Global/50_Security_Guidelines.md).
- Detail keputusan: [ADR-002](../04_Decisions/ADR-002.md).

## Sinkronisasi Appwrite Function ↔ Config

Saat menambah, menghapus, atau mengganti nama Function, sinkronkan sekaligus:

- `00_BACKEND/functions/<function-id>/` (`package.json` + `src/main.js`)
- `00_BACKEND/appwrite/generate_appwrite_json.cjs` (definisi Function)
- `00_BACKEND/appwrite/function-scopes.json` (scope API key dinamis)
- `00_BACKEND/appwrite.config.json` (hasil generator)
- Katalog Function di [`../02_Modules/00_Index.md`](../02_Modules/00_Index.md) + dokumen modul pemilik

Cek konsistensinya dengan `npm run fn:inventory` (di `00_BACKEND/`). Detail deploy: [80_Deployment](../01_Global/80_Deployment.md).

## Pemeliharaan

- Saat implementasi berubah: perbarui Modul terkait, perbarui Workflow bila proses bisnis berubah, perbarui ADR bila arsitektur berubah.
- Setiap folder diawali `00_Index.md` yang merangkum folder dan mengarahkan ke dokumen relevan.
- Dokumen harus atomic, fokus, kecil, mudah diindeks.

## Referensi

- Manual lengkap: `00_BACKEND/AGENTS.md` (konvensi dokumentasi) dan `AGENTS.md` root repo.
