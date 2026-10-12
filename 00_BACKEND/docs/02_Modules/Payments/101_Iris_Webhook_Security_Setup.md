# Pengaturan Keamanan Webhook Iris (withdrawal-callback) — Superseded

> **Superseded 2026-08-25.** Withdrawal baru memakai transfer manual Admin (`review-withdrawal`) dan tidak memanggil Iris. Staging inventory menunjukkan zero withdrawal `processing` dan zero `iris_reference`; `withdrawal-callback` kini `enabled: false` dengan `execute: []` (`appwrite.config.json`), sehingga URL Function tidak menerima request. Dokumen ini dipertahankan untuk historical audit. Jangan menerapkan langkah berikut untuk flow baru.
>
> Status kode saat ini (untuk audit): source `functions/withdrawal-callback/src/main.js` masih memuat validasi `x-iris-callback-token` di bawah, `IRIS_CALLBACK_SECRET` tetap tercantum (nama saja) di `.env.example` Function, mapping status Iris `completed|settled → succeeded`, `failed|rejected|denied → failed` + kredit balik `withdrawal_reversal` lalu `reversed`, `queued|processing|pending → diabaikan`. Script `appwrite/ops/midtrans-webhook-url.mjs` hanya mencetak URL `midtrans-webhook` (tidak ada entri `withdrawal-callback`).

**Untuk:** Tim Backend  
**Konteks:** Fix SEC-H2 (2026-08-08) — Function `withdrawal-callback` sekarang memvalidasi shared secret sebelum memproses payload apapun.

---

## Latar Belakang

Midtrans Iris tidak menyediakan skema signature berbasis HMAC seperti Snap (yang pakai `signature_key` + SHA-512). Sebagai pengganti, Function `withdrawal-callback` menggunakan **shared secret melalui custom request header** — sebuah token statis yang di-set di dua tempat sekaligus:

1. **Appwrite Function** sebagai environment variable `IRIS_CALLBACK_SECRET`
2. **Midtrans Iris** sebagai header tambahan yang disertakan di setiap callback

Ketika callback masuk, Function membandingkan header `x-iris-callback-token` dengan env var. Jika tidak cocok → `401 Unauthorized`, tidak ada mutasi data.

**Backward-compatible:** Jika `IRIS_CALLBACK_SECRET` tidak di-set, Function menerima semua request (perilaku lama). Ini aman untuk deploy awal sebelum konfigurasi Iris selesai, tapi **tidak boleh dibiarkan di production**.

---

## Langkah Setup

### Langkah 1 — Generate secret token

Token harus random, panjang ≥ 32 karakter, tidak ada karakter khusus yang membutuhkan escaping di HTTP header. Cara termudah:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Simpan output-nya — ini yang akan dipakai di kedua tempat.

**Contoh output:** `a3f1b2c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5e6f7a8b9c0d1e2`

---

### Langkah 2 — Set environment variable di Appwrite

1. Buka [Appwrite Console](https://sgp.cloud.appwrite.io) → pilih project Marketiv
2. Navigasi ke **Functions** → cari `withdrawal-callback`
3. Klik tab **Settings** → scroll ke bagian **Environment Variables**
4. Tambahkan variable baru:
   - **Key:** `IRIS_CALLBACK_SECRET`
   - **Value:** token dari Langkah 1
5. Klik **Update** / **Save**

> Appwrite me-restart Function container secara otomatis setelah env var diperbarui. Tidak perlu redeploy.

---

### Langkah 3 — Set header di Midtrans Iris

1. Login ke [Midtrans Iris Dashboard](https://app.midtrans.com/iris) (prod) atau [Iris Sandbox](https://app.sandbox.midtrans.com/iris)
2. Navigasi ke **Settings → Configuration → Webhook Notification**
3. Di bagian **Custom Header**, tambahkan:
   - **Header Name:** `x-iris-callback-token`
   - **Header Value:** token yang sama dari Langkah 1
4. Pastikan **Webhook URL** sudah mengarah ke Function URL `withdrawal-callback`

> URL Function bisa dicetak dengan `node 00_BACKEND/appwrite/ops/midtrans-webhook-url.mjs` — sesuaikan scriptnya jika belum ada entri untuk `withdrawal-callback`.

---

### Langkah 4 — Verifikasi

Kirim test payload dari Iris (gunakan fitur **Test Notification** di dashboard Iris jika tersedia), atau tunggu withdrawal berikutnya yang berstatus `processing`. Di Appwrite Function logs (`withdrawal-callback` → tab **Executions**), verifikasi:

- Request dengan token benar: log masuk normal, tidak ada baris `token tidak valid`
- Request tanpa token (atau token salah): seharusnya muncul log `withdrawal-callback: token tidak valid dari <ip>` dan eksekusi return `401`

---

## Mekanisme di Kode

Validasi terjadi di baris pertama handler sebelum logika apapun:

```js
// 00_BACKEND/functions/withdrawal-callback/src/main.js
const expectedToken = process.env.IRIS_CALLBACK_SECRET;
if (expectedToken) {
  const callbackToken =
    req.headers?.["x-iris-callback-token"] ||
    req.headers?.["X-Iris-Callback-Token"];   // tolerate casing
  if (callbackToken !== expectedToken) {
    error(`withdrawal-callback: token tidak valid dari ${req.headers?.["x-forwarded-for"] || "unknown"}`);
    return json(res, { error: "Unauthorized" }, 401);
  }
}
```

---

## Catatan Keamanan

- **Jangan commit token ke repo.** Token ini hanya di-set via Appwrite Console dan Midtrans dashboard — tidak pernah masuk ke `.env` atau kode sumber.
- **Rotasi token:** Jika token bocor, generate yang baru dan update di kedua tempat (Appwrite env var + Midtrans header) secara bersamaan. Satu titik update saja = window of failure.
- **Iris tidak sign payload:** Tidak ada verifikasi kriptografi terhadap isi payload. Token ini hanya membuktikan bahwa request berasal dari Midtrans Iris, bukan dari pihak luar yang tahu URL Function. Jika Iris suatu saat mendokumentasikan skema HMAC, ganti mekanisme ini dengan verifikasi HMAC.

---

## Referensi

- Implementasi: [`00_BACKEND/functions/withdrawal-callback/src/main.js`](../../functions/withdrawal-callback/src/main.js)
- Dokumentasi Function lengkap: [`70_Backend.md`](70_Backend.md) → section `withdrawal-callback`
- Appwrite Console: `sgp.cloud.appwrite.io`
- Midtrans Iris Sandbox: `app.sandbox.midtrans.com/iris`
- Midtrans Iris Production: `app.midtrans.com/iris`
