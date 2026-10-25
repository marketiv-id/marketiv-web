# Fase 0 — Persiapan & spike

**Bobot:** S. **Kode app tidak berubah.**

## Tujuan
- Infrastruktur siap.
- Risiko terbesar (impor password, batas ukuran file) terjawab sebelum mulai coding.
- Kondisi data live diketahui.

## Task

### Infrastruktur
- [ ] Buat project Supabase `marketiv-staging` dan `marketiv-prod` di region `ap-southeast-1`. Prod butuh plan Pro: backup, ukuran file besar, image transform.
  - [x] `marketiv-staging` (ref `zwrzwkesaetzbnajjxqc`, `ap-southeast-1`, Postgres 17, plan Free). Diverifikasi lewat Supabase MCP pada 2026-10-25.
  - [ ] `marketiv-prod`. Ditunda. Pemilik memilih tanpa biaya untuk saat ini; keputusan Free vs Pro dibuka lagi sebelum Fase 10.
- [ ] Buat project Vercel `marketiv-web` (root) dan `marketiv-admin` (root dir `admin`), region `sin1`. Pakai plan Pro supaya cron `*/15` dan durasi function memadai.
  - Belum dibuat (dicek lewat Vercel MCP 2026-10-25, tim `pnjias-projects`). Plan Hobby hanya mengizinkan cron harian; alternatif gratis dibahas di Fase 1.
- [ ] Siapkan custom SMTP untuk Supabase Auth (Resend/SES), dengan domain pengirim `marketiv.id`. Atur SPF/DKIM.
  - Belum. Rencana: staging memakai Mailtrap (sudah dipakai di Appwrite). Pilihan SMTP produksi menyusul. Tidak menghalangi Fase 1–3.
- [ ] Simpan secret di password manager tim (tanggung jawab pemilik; tidak bisa diverifikasi dari sesi):
  - `SUPABASE_URL`
  - publishable/anon key
  - `SUPABASE_SERVICE_ROLE_KEY`
  - DB password
  - `CRON_SECRET`

### Spike 1 — impor password
- [x] Export 1 user uji dari Appwrite lewat Users API dengan API key. Catat field `password`, `hash`, `hashOptions`.
- [x] Import ke Supabase staging lewat Admin API atau insert ke `auth.users`, dengan hash Argon2.
- [x] Coba login memakai password lama.
- [x] Catat hasilnya: **BERHASIL** (lihat [Hasil Spike 1](#hasil-spike-1)). Rencana B tidak diperlukan.
  - **Berhasil:** user tetap memakai password lama.
  - **Gagal:** rencana B. Semua user wajib reset password lewat OTP saat login pertama. Siapkan UX dan email pengumumannya.

### Spike 2 — file besar
- [ ] Atur batas ukuran file global dan per bucket ke 500 MB.
  - Tidak bisa di plan Free: batas global maksimal 50 MB, dan `updateBucket` 500 MB ditolak. Butuh Pro.
- [x] Uji `createSignedUploadUrl` + `uploadToSignedUrl` untuk file 500 MB. Kalau tidak stabil, pakai resumable upload (TUS).
  - Diuji pada 49 MB (batas Free), termasuk TUS dan resume. Uji 500 MB **belum** dilakukan (butuh Pro). Lihat [Hasil Spike 2](#hasil-spike-2).

### Audit data live (read-only)
- [x] Jalankan `00_BACKEND/appwrite/ops/audit-live.mjs`, `drift.mjs`, dan `audit-legacy-money-state.mjs`.
- [x] Hitung jumlah baris per tabel dan jumlah file per bucket.
- [x] Hitung baris yatim, yaitu FK implisit yang menunjuk ke ID yang tidak ada.
- [x] Cari file privat yang nyasar ke bucket publik `campaign-assets`.
- [ ] Cari user yang punya `prefs.role` atau `users.role` = `admin`, lalu validasi manual siapa admin yang sah.
  - Pencarian selesai: 1 kandidat. Validasi manual oleh pemilik **belum**.
- [x] Cari campaign `active` yang tidak punya payment `paid` (kemungkinan memanfaatkan celah #2).
- [x] Cari ledger ganda atau wallet yang saldonya tidak sama dengan `sum(ledger)` (kemungkinan kena race #3).

## Selesai bila
- Hasil kedua spike tercatat di dokumen ini.
- Laporan audit tersimpan di `docs/marketiv-supabase-migration-v1/audit/`.
- Semua anomali data punya keputusan: perbaiki sebelum migrasi, atau transform saat migrasi.

## Hasil

Skrip ada di `scripts/migration/spikes/` dan membaca kredensial dari env. Cara menjalankan ada di header tiap skrip. Di balik proxy sesi cloud, jalankan dengan `NODE_USE_ENV_PROXY=1`.

### Hasil Spike 1

**BERHASIL.** User tetap memakai password lama. Rencana B (reset paksa lewat OTP) tidak diperlukan.

| Langkah | Hasil |
|---|---|
| Export user uji dari Appwrite **staging** (`GET /users`) | `hash: argon2`, `hashOptions: {type: argon2, memory_cost: 7168, time_cost: 5, threads: 1}`. Field `password` berformat PHC `$argon2id$v=19$m=7168,t=5,p=1$<salt>$<digest>`. |
| `auth.admin.createUser({ email, password_hash, email_confirm })` di Supabase staging | Berhasil |
| `signInWithPassword` dengan password lama | Berhasil, sesi milik user yang diimpor |
| Kontrol negatif: password salah | Ditolak `invalid_credentials` (400) |
| Login kedua | Berhasil |
| Cleanup user uji di Supabase | Berhasil |

Catatan untuk Fase 9:
- Produksi punya dua varian parameter: 11 user `m=65536,t=4,p=3` dan 2 user `m=7168,t=5,p=1`. Keduanya PHC Argon2id, jadi `password_hash` diimpor apa adanya.
- 2 user produksi tidak punya password (login Google). Mereka diimpor tanpa password dan ditautkan saat login OAuth pertama.
- `password_hash` hanya tersedia lewat Users API dengan API key berscope `users.read`.

Skrip: `spike1-password-import.mjs`.

### Hasil Spike 2

**BERHASIL dalam batas plan Free (≤ 50 MB). Uji 500 MB belum dilakukan.**

| Uji (bucket privat `spike-upload`, batas 50 MB) | Hasil |
|---|---|
| A. `createSignedUploadUrl` + `uploadToSignedUrl`, 49 MB | Berhasil, 6,6 s (≈ 7,4 MB/s), ukuran tersimpan sama |
| B. TUS resumable dengan token signed (header `x-signature`), chunk 6 MiB, 49 MB | Berhasil, 11,5 s, 8 PATCH tanpa retry |
| B2. TUS: putus setelah chunk pertama, `HEAD` untuk offset, lanjut | Berhasil. Server melaporkan offset 6 MiB, upload selesai utuh |
| C. File 51 MB ke bucket 50 MB | Ditolak 413 |
| C2. `updateBucket` ke 500 MB di project Free | Ditolak (batas global Free 50 MB) |

Kesimpulan:
- Pola target (route handler membuat signed upload URL, browser mengunggah langsung) berjalan, baik untuk upload standar maupun TUS.
- Untuk file besar dari browser, pakai TUS dengan `x-signature` dan endpoint `https://<ref>.storage.supabase.co/storage/v1/upload/resumable/sign`. Ini menangani koneksi putus.
- Batas di Supabase dihitung dalam MB desimal: "50MB" = 50.000.000 byte.
- File terbesar di produksi saat ini 0,9 MB. Batas Free tidak menghalangi migrasi data yang ada.
- Batas 500 MB untuk bucket `deliverables` butuh Pro. Uji ulang `SPIKE_FILE_MB=500 SPIKE_BUCKET_LIMIT_MB=500` setelah project berplan Pro tersedia.

Skrip: `spike2-large-upload.mjs`.

### Hasil audit

Laporan lengkap dan keputusan per anomali ada di [`audit/2026-10-25-appwrite-prod.md`](./audit/2026-10-25-appwrite-prod.md).

- Produksi berisi 95 baris, 13 file, dan 15 user Auth. Tabel uang kosong, saldo nol, dan tidak ada baris yatim.
- **Celah #2:** 6 campaign `active` tanpa payment, dengan dampak uang nol. Keputusan: ubah ke `draft` dengan budget 0 saat migrasi.
- **Admin:** 1 kandidat, menunggu validasi pemilik.
- **Celah #3:** tidak ada bukti, karena ledger kosong.

