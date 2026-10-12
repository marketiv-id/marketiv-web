# Audit Dokumentasi Backend vs Kode — 2026-10-12

- **Project**: `Marketiv`
- **Tanggal**: Senin, 12 Oktober 2026
- **Target**: menyelaraskan `00_BACKEND/docs/` dengan kode terkini (kode = sumber kebenaran)
- **Metode**:
  - baca kode lebih dulu: 67 Cloud Function di `00_BACKEND/functions/`, `appwrite.config.json` (32 tabel, 8 bucket), service backend `00_BACKEND/src/services/`, service & halaman frontend di root `src/`, test di `00_BACKEND/tests/`
  - bandingkan dengan dokumen per modul, workflow, ADR, dan dokumen global
  - revisi dokumen; perilaku yang terdokumentasi tetapi tidak ada di kode ditandai **belum diimplementasikan**
  - kode **tidak** diubah; bug/celah yang ditemukan dicatat di bagian "Temuan Kode" di bawah

## Sumber Kebenaran Konfigurasi

- `00_BACKEND/appwrite.config.json` = kanonik (67 function, 32 tabel termasuk `6ab530d00018edb50097` = `campaign_briefs_v2`, 8 bucket).
- `00_BACKEND/appwrite.json` = **usang** (53 function, 30 tabel; tanpa `otp_rate_limits` dan `ratecard_deliverable_validations`; `ai-fraud-precheck` tanpa event). Jangan dipakai untuk push.

## Ringkasan Perubahan Dokumen

| Area | Koreksi utama |
|---|---|
| Authentication | Verifikasi email OTP, reset password OTP (`request-password-otp` → `{success}` tanpa `userId`; `reset-password-with-otp` pakai `{email, otpCode, password}`), gate T&C `accept-tos`, register dua fase, Google OAuth di balik flag. Klaim notifikasi welcome dihapus. |
| Users | Tabel `appeals`, `otp_rate_limits`, kolom `users.tos_*`/`kyc_*`/`email_verified_at`; storage (`validate-and-upload`, kuota) aktif, bukan dormant; aturan completion dari `completion.js`; suspend/unsuspend/banding/KYC. |
| Campaigns | Funding `create-payment` → `midtrans-webhook` → `create-escrow` (menambah `remainingBudget`); publish via `patch-campaign-status`; review hanya Admin (ADR-010) dengan observasi 72 jam & views terkunci; rumus reward `floor(views × rate / 1000)` dibatasi `remainingBudget`; `expire-stale-claims` tiap 6 jam; brief runtime di `campaign_briefs_v2`. |
| AI | `ai-brief` = Vertex AI Gemini + fallback OpenRouter; `ai-fraud-precheck` = aturan + Gemini API key, **hanya advisory** (tidak auto-approve/reject); chatbot Tivvy di route Next.js `/api/chat`; Landing Assistant belum diimplementasikan. |
| Orders & RateCards | Order hanya dari offer yang diterima (Direct Order belum diimplementasikan); tabel `ratecard_deliverable_validations`; rilis escrow butuh validasi Admin `valid` + approve UMKM/auto-approve; `track-order-review`, `auto-approve-orders` + reminder H-1; satu `rate_cards` per paket, maks 3. |
| Chat & Offers | Semua tulis lewat Function; arsip per peserta; `create-offer` (satu offer `pending`, guard deal aktif, `packageId`); event `offers.rows.*.update` dengan guard status akhir. |
| Payments | Withdrawal: reserve saldo lalu transfer manual Admin (`review-withdrawal`); escrow `held → releasing → released \| refunded`; fee dari env `FEE_RATE` + snapshot `escrows.fee_rate` + monitor `fee-rate-flip`; tidak ada top-up/deposit wallet; `pendingBalance` legacy. |
| Notifications | Tidak ada service pusat; 25 Function penulis dengan id deterministik `ntf`+sha256; email & `send-notification` belum diimplementasikan; push hanya chat. |
| Workflows | Semua 6 workflow ditulis ulang mengikuti alur kode; sengketa order tidak ada (hanya link WhatsApp statis). |
| ADR | Catatan verifikasi 2026-10-12 di tiap ADR. ADR-006 (Zustand) **tidak diterapkan** — kode memakai React Context. ADR-007/008 butir konstanta diganti env (`MINIMUM_WITHDRAW`, `FEE_RATE`). ADR-010 sudah diimplementasikan. |
| Project & Global | Tech stack, struktur folder, deployment, keamanan, error handling, testing, dan domain model disesuaikan dengan kode & config. |

## Temuan Kode (belum diperbaiki)

Temuan di bawah ditemukan saat membaca kode. Tidak ada kode yang diubah dalam audit ini. Prioritas: **P0** = bisa dieksploitasi untuk uang/hak akses, **P1** = uang bisa macet/ganda, **P2** = inkonsistensi.

### P0 — Keamanan

1. **`create("users")` level tabel melewati Function.** `appwrite.config.json` memberi `create("users")` pada `campaigns`, `campaign_submissions`, `campaign_claims`, `conversations`, `messages`, `offers`, `withdrawals`, `appeals`, `rate_cards`, dan profil. Dampak:
   - `campaign_submissions`: buat baris `status:"approved"` + `views_count` besar → `ai-fraud-precheck` update → `calculate-campaign-reward` membayar reward tanpa Admin.
   - `campaigns`: buat campaign `active` dengan `remainingBudget` sembarang tanpa Midtrans.
   - `messages`: baris palsu memicu `send-chat-notification` (tidak memeriksa peserta).
   - `offers`: offer buatan sendiri lalu `accepted` → `create-order` membuat order.
   - `withdrawals`: baris `requested` palsu masuk antrean Admin.
2. **Fallback admin via `prefs.role === "admin"`** di `review-submission`, `get-admin-submission-queue`, `review-ratecard-deliverable`, `get-admin-ratecard-deliverable-queue`. Prefs bisa ditulis user sendiri (`account.updatePrefs`). Dampak nyata bergantung pada scope API key Function (butuh `users.read`). `review-withdrawal`/`get-admin-withdrawal-queue` hanya memakai label (aman).
3. **`create-user-profile` mempercayai payload**: `$id`/`role` dari body/event tanpa dicocokkan dengan `x-appwrite-user-id`; role `admin` diterima.
4. **Baris `users` punya `update` untuk pemilik** (`create-user-profile/src/main.js:116`): user bisa mengubah `status`, `role`, `kyc_status`, `tos_*` sendiri.
5. **Baris profil punya `update` pemilik**: `isProfileCompleted` bisa di-set klien, melewati `update-profile`.
6. **Bucket publik** `avatars`, `creator-banners`, `logos`, `portfolios`, `campaign-assets`: `fileSecurity:false` + `update/delete("users")` → user mana pun bisa mengganti/menghapus file user lain.
7. **Offer**: kreator punya `update` atas semua kolom (termasuk `price`) dan aturan "hanya `pending`" hanya di klien.
8. **Claim/appeal**: kreator bisa mengubah `claimedAt`/status claim sendiri; user bisa mengubah status banding sendiri.

### P1 — Uang & alur

1. `calculate-campaign-reward` menambah wallet sebelum menulis ledger (id acak) → retry/event ganda bisa membayar dua kali.
2. `refund-escrow`/`refund-order` mem-flip escrow ke `refunded` lebih dulu; bila kredit wallet gagal, retry dilewati → dana UMKM hilang. `refund-order` juga memanggil `error(...)` di luar scope (ReferenceError).
3. `refund-order` campaign: increment wallet sukses tapi decrement `remainingBudget` gagal → rollback ledger → retry mengkredit lagi.
4. `auto-approve-orders` meng-approve tanpa validasi Admin → `release-escrow` mengabaikan, antrean Admin hanya menerima `submitted` → escrow macet permanen.
5. `create-escrow` menulis order `in_progress` tanpa cek status → order `cancelled` hidup lagi bila pembayaran lama settle.
6. `create-order`: guard akun suspended berada di cabang `rejected` (salah nesting); offer `accepted` tidak dicek status akun.
7. `request-withdrawal` `hasLedgerSource` mencari `referenceType:"campaign"` sementara `create-escrow` menulis `"payment"` → sumber `umkm_budget` tidak pernah cocok.
8. `midtrans-webhook` mengabaikan `refund`/`chargeback` setelah `paid`; `cancel-payment` campaign tidak membatalkan sesi Snap.
9. `FEE_RATE=0` mustahil (`Number(escrow.fee_rate) || 0.02`); pesan rilis & frontend hardcode 2%.

### P2 — Inkonsistensi

- Read receipt pesan teks gagal (update dari browser ditolak); `mark-conversation-read` tidak dipanggil frontend.
- Rumus estimasi reward berbeda di `get-admin-submission-queue`, mapper UMKM, admin app, dan UI kreator.
- `get-admin-submission-queue` tidak memuat data fraud; `fraud_checks.createdAt`/`ai_requests.createdAt` tidak pernah diisi.
- `ai-brief`: tanpa role guard/rate limit, `userId` dari body, insert brief gagal diam-diam bila `doAndDont` > 400.
- `ai-fraud-precheck` `logAiRequest` memanggil `error` di luar scope; regex platform `tiktok\.com$` cocok dengan domain lain.
- `expire-stale-claims` bisa loop tanpa akhir bila satu halaman penuh claim belum lewat tenggat.
- Notifikasi suspend kedua untuk user yang sama hilang (id deterministik); reminder H-1 hanya sekali per order.
- Frontend `TYPE_ALIAS` notifikasi tidak mencakup `keuangan`, `campaign`, `refund`, `order`, `order_tos_blocked`; tombol hapus notifikasi tetap tampil padahal selalu gagal.
- `appwrite/generate_appwrite_json.cjs`: path `patch-conversation-archive` menunjuk `../functions/get-umkm-ratecard-reviews`.
- Service legacy `00_BACKEND/src/services/*` (order, wallet, user, chat, offer, submission, claim) tidak lagi cocok dengan permission/aturan saat ini, tetapi masih diuji seolah aktif.
- Test usang: `request-password-otp` diharapkan mengembalikan `userId`; e2e register masih mengisi "Nama Usaha"/"Kategori"; test auto-approve `expect(true)`.

## Rekomendasi Urutan Tindak Lanjut

1. Cabut `create("users")` level tabel pada tabel yang ditulis Function (P0-1), hapus fallback `prefs.role` (P0-2), validasi `x-appwrite-user-id` di `create-user-profile` & tolak role `admin` (P0-3), cabut update pemilik pada `users` (P0-4).
2. Ubah bucket publik ke `fileSecurity:true` dengan izin per file (P0-6).
3. Jadikan reward & refund idempoten dengan ledger id deterministik yang ditulis lebih dulu (P1-1..3).
4. Perbaiki gate auto-approve vs validasi Admin (P1-4) dan guard status order di `create-escrow` (P1-5).
5. Setelah perbaikan kode, perbarui dokumen modul terkait (aturan permission di `50_Database.md` dan `30_Business_Rules.md`).
