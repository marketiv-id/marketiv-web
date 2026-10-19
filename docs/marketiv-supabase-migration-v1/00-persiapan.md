# Fase 0 — Persiapan & spike

**Bobot:** S. **Kode app tidak berubah.**

## Tujuan
- Infrastruktur siap.
- Risiko terbesar (impor password, batas ukuran file) terjawab sebelum mulai coding.
- Kondisi data live diketahui.

## Task

### Infrastruktur
- [ ] Buat project Supabase `marketiv-staging` dan `marketiv-prod` di region `ap-southeast-1`. Prod butuh plan Pro: backup, ukuran file besar, image transform.
- [ ] Buat project Vercel `marketiv-web` (root) dan `marketiv-admin` (root dir `admin`), region `sin1`. Pakai plan Pro supaya cron `*/15` dan durasi function memadai.
- [ ] Siapkan custom SMTP untuk Supabase Auth (Resend/SES), dengan domain pengirim `marketiv.id`. Atur SPF/DKIM.
- [ ] Simpan secret di password manager tim:
  - `SUPABASE_URL`
  - publishable/anon key
  - `SUPABASE_SERVICE_ROLE_KEY`
  - DB password
  - `CRON_SECRET`

### Spike 1 — impor password
- [ ] Export 1 user uji dari Appwrite lewat Users API dengan API key. Catat field `password`, `hash`, `hashOptions`.
- [ ] Import ke Supabase staging lewat Admin API atau insert ke `auth.users`, dengan hash Argon2.
- [ ] Coba login memakai password lama.
- [ ] Catat hasilnya:
  - **Berhasil:** user tetap memakai password lama.
  - **Gagal:** rencana B. Semua user wajib reset password lewat OTP saat login pertama. Siapkan UX dan email pengumumannya.

### Spike 2 — file besar
- [ ] Atur batas ukuran file global dan per bucket ke 500 MB.
- [ ] Uji `createSignedUploadUrl` + `uploadToSignedUrl` untuk file 500 MB. Kalau tidak stabil, pakai resumable upload (TUS).

### Audit data live (read-only)
- [ ] Jalankan `00_BACKEND/appwrite/ops/audit-live.mjs`, `drift.mjs`, dan `audit-legacy-money-state.mjs`.
- [ ] Hitung jumlah baris per tabel dan jumlah file per bucket.
- [ ] Hitung baris yatim, yaitu FK implisit yang menunjuk ke ID yang tidak ada.
- [ ] Cari file privat yang nyasar ke bucket publik `campaign-assets`.
- [ ] Cari user yang punya `prefs.role` atau `users.role` = `admin`, lalu validasi manual siapa admin yang sah.
- [ ] Cari campaign `active` yang tidak punya payment `paid` (kemungkinan memanfaatkan celah #2).
- [ ] Cari ledger ganda atau wallet yang saldonya tidak sama dengan `sum(ledger)` (kemungkinan kena race #3).

## Selesai bila
- Hasil kedua spike tercatat di dokumen ini.
- Laporan audit tersimpan di `docs/marketiv-supabase-migration-v1/audit/`.
- Semua anomali data punya keputusan: perbaiki sebelum migrasi, atau transform saat migrasi.
