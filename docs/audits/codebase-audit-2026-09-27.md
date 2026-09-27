# 🔍 Audit Codebase Menyeluruh — 27 September 2026

> **Lingkup**: seluruh repo `marketiv-web` (Next.js App Router + Appwrite Functions + SDK service layer)
> **Metode**: 4 audit slice independen (UMKM UI, Kreator UI, service layer + integrasi, backend functions) + pemeriksaan lintas-cutting
> **Standar bukti**: setiap temuan menyebut `path:line`. Temuan yang kuverifikasi sendiri baris demi baris diberi tanda ✅.
> **Sifat dokumen**: laporan temuan. Tidak ada kode yang diubah saat audit ini.

---

## 0. Ringkasan

| Severity | Jumlah | Sifat dominan |
|---|---|---|
| **HIGH** | 8 | Eskalasi hak akses, uang berpotensi dobel, data/klaim karangan |
| **MED** | 21 | Data karangan di UI, kontrol mati, bypass cek kepemilikan, drift mock↔real |
| **LOW** | 16 | a11y, state pending, dead code, housekeeping |

Tiga temuan HIGH yang paling perlu perhatian (semuanya sudah kuverifikasi sendiri):

1. **Eskalasi admin lewat `prefs.role`** — peran admin ditentukan oleh data yang bisa diubah user sendiri, dan gerbangnya dipakai di fungsi yang memindahkan uang.
2. **Kredit wallet sebelum penanda idempotensi tersimpan** (`release-escrow`) — retry setelah crash bisa mengkredit ulang.
3. **Grafik analitik mengarang data** — tren 6 bulan dirender dari baseline fiktif `68000` views / `Rp 1.800.000` saat data asli nol.

---

## 1. HIGH — Keamanan & uang (backend)

### 1.1 ✅ Eskalasi peran admin lewat `prefs.role` yang bisa diubah user sendiri

**Bukti (terverifikasi):**
`00_BACKEND/functions/review-submission/src/main.js:82-86`

```js
const hasLabel = Array.isArray(authUser.labels) && authUser.labels.some((l) => l.toLowerCase() === "admin");
const hasPref = typeof authUser.prefs?.role === "string" && authUser.prefs.role.toLowerCase() === "admin";
if (hasLabel || hasPref) { isAdmin = true; }
```

`prefs` adalah data yang bisa ditulis user sendiri (`account.updatePrefs()` dari SDK web). Jadi
rantai eksploitasinya: user biasa menulis `prefs.role = "admin"` → memanggil `review-submission`
→ menyetujui submission miliknya sendiri dengan `views` bebas → memicu
`calculate-campaign-reward` → dana masuk ke wallet.

**Berkas yang memakai gerbang yang sama (perlu diperbaiki bersama):**

| Berkas | Baris | Fungsi |
|---|---|---|
| `functions/review-submission/src/main.js` | 83 | Approve submission + nilai views (uang) |
| `functions/review-ratecard-deliverable/src/main.js` | 64 | Approve deliverable rate card (memicu `release-escrow`) |
| `functions/get-admin-dashboard-summary/src/main.js` | 74 | Read model seluruh data platform |
| `functions/get-admin-submission-queue/src/main.js` | 75 | Antrean submission seluruh UMKM |
| `functions/get-admin-ratecard-deliverable-queue/src/main.js` | 35 | Antrean deliverable seluruh UMKM |

**Tambahan MED:** `functions/create-user-profile/src/main.js:77` juga membaca
`user.prefs?.role` untuk menentukan peran. Perlu diperiksa apakah jalur itu bisa dipakai
membuat profil dengan peran yang salah.

**Tindakan**: hapus jalur `prefs.role` sepenuhnya. Peran admin hanya dari
`users.role` (server-only) atau Auth label yang hanya bisa diset server. `get-admin-withdrawal-queue`
sudah memakai pola label-only yang benar — jadikan itu rujukan.

### 1.2 ✅ `release-escrow` mengkredit wallet sebelum penanda idempotensi tersimpan

**Bukti (terverifikasi):** `00_BACKEND/functions/release-escrow/src/main.js:90-99`

```js
if (releaseTransaction.status !== "completed") {
  await incrementColumn(env, env.walletsCollectionId, wallet.$id, "balance", creatorAmount);
  await markTransactionCompleted(databases, env, releaseTransaction.$id);
}
```

Komentar di kode menyatakan kredit hanya terjadi selama ledger `processing`, sehingga retry aman.
Namun penanda `completed` ditulis **setelah** kredit. Kalau fungsi mati/timeout tepat di antara
kedua baris itu, retry berikutnya melihat ledger masih `processing` dan **mengkredit ulang**.
Urutan yang aman: tandai ledger `completed` lebih dulu (klaim), baru kredit; atau kredit bersyarat
pada penanda yang benar-benar durable.

### 1.3 `calculate-campaign-reward` bisa mengkredit ganda saat event bersamaan

**Bukti:** `00_BACKEND/functions/calculate-campaign-reward/src/main.js:22-29, 59-64`

Dedup dilakukan dengan query rapi-rawan (`listDocuments` lalu insert), id ledger memakai `ID.unique()`,
dan wallet dikredit pada baris 59 sebelum baris ledger dibuat. Dua eksekusi bersamaan (atau retry)
sama-sama lolos dedup lalu sama-sama mengkredit. Tindakan: tulis ledger dengan id deterministik
(mis. `reward_<submissionId>`) sebagai `pending` **sebelum** kredit.

### 1.4 `refund-order` bisa dobel kredit setelah kegagalan sebagian

**Bukti:** `00_BACKEND/functions/refund-order/src/main.js:218-224`

Kredit berjalan, lalu `decrementColumn` budget gagal, lalu `catch` **menghapus** baris ledger
idempotensi. Kredit sudah terjadi tapi penandanya dihapus → panggilan berikutnya mengkredit lagi.
Tindakan: jangan hapus ledger saat sudah ada efek; rekonsiliasi statusnya.

### 1.5 `refund-escrow` bisa membuat refund macet permanen

**Bukti:** `00_BACKEND/functions/refund-escrow/src/main.js:63, 96`; pola sama di `refund-order/src/main.js:142`

Status escrow diubah `refunded` sebelum kredit. Kalau kredit gagal, ledger dihapus dan fungsi
mengembalikan 500, tetapi escrow sudah `refunded` → retry berikutnya diabaikan (`ignored`),
sehingga dana UMKM tidak pernah kembali. Tindakan: balikkan status escrow saat kredit gagal,
atau balik status hanya setelah kredit sukses.

### 1.6 Webhook withdrawal: autentikasi opsional

**Bukti:** `00_BACKEND/functions/withdrawal-callback/src/main.js:42`

```js
const expectedToken = process.env.IRIS_CALLBACK_SECRET;
if (expectedToken) { ... }
```

Kalau env tidak di-set, tidak ada pemeriksaan sama sekali: siapa pun bisa mem-POST dan mengubah
status pencairan atau memicu kredit pembalikan. Tindakan: gagal-tertutup (tolak kalau secret tidak
dikonfigurasi), seperti pola `midtrans-webhook` yang sudah memverifikasi signature.

### 1.7 Kredit pembalikan withdrawal rawan dobel

**Bukti:** `00_BACKEND/functions/withdrawal-callback/src/main.js:124, 134`

Pemeriksaan "sudah pernah dibalik?" memakai `getDocument` (404 probe) lalu `incrementColumn`.
Dua pengiriman callback bersamaan bisa sama-sama lolos. Tindakan: ledger id deterministik
create-before-credit.

### 1.8 ✅ Grafik analitik mengarang tren

**Bukti (terverifikasi):** `src/components/features/umkm-dashboard/analytics/PerformanceChart.tsx:70-71`

```js
const baseViews = totalViews > 0 ? totalViews : 68000;
const baseSpend = totalSpent > 0 ? totalSpent : 1800000;
```

Baseline fiktif dipakai saat data asli nol, lalu deret 4 minggu / 6 bulan / 12 bulan dibentuk dari
bobot tetap (baris 73-100). Hasilnya grafik yang terlihat seperti riwayat nyata. Ditambah klaim
`+28.4%` pada baris 196 yang juga hardcoded.

Tindakan: bucket data asli per periode di backend, atau tampilkan empty state. Ini melanggar
prinsip yang sudah kita pakai di tempat lain (`—` lebih baik daripada angka karangan).

---

## 2. HIGH / MED — Data dan klaim karangan di UI

| # | Severity | Lokasi | Masalah | Tindakan |
|---|---|---|---|---|
| 2.1 | ✅ HIGH | `creators/detail/CreatorProfileHero.tsx:35` | Badge "Kreator Terverifikasi" dirender tanpa syarat; `creator.isVerified` tidak pernah dipakai | Bungkus dengan `creator.isVerified && (...)`; kalau tidak terverifikasi, badge tidak muncul |
| 2.2 | HIGH | `campaign/detail/CampaignActivityTimeline.tsx:30` | `payDate.setMinutes(+15)` mengarang log aktivitas + klaim "+2 jam", "Validasi Selesai" | Ambil event asli dari status/audit, atau beri label "estimasi" |
| 2.3 | MED | `analytics/PerformanceChart.tsx:196` | Klaim pertumbuhan `+28.4%` hardcoded | Hitung dari seri nyata atau hapus tile |
| 2.4 | MED | `creators/CreatorSummaryCards.tsx:84` | `"Rp 0"` saat tidak ada harga kreator | Tampilkan `—` |
| 2.5 | MED | `negotiation/detail/DealChecklistCard.tsx:32` | Item checklist "Postingan Bersama" selalu `checked: true` | Turunkan dari data deliverable/order |
| 2.6 | MED | `negotiation/NegotiationSummaryCards.tsx:52-53` | Nilai "Dalam Escrow" disimpulkan dari stage di klien (ada TODO sendiri) | Pindahkan ke Function summary |
| 2.7 | MED | `creators/CreatorDirectoryPage.tsx:73-86` | `verifiedCount`/`avgEngagement`/`lowestStartingPrice` dihitung dari 100 baris pertama tapi ditampilkan sebagai rasio populasi | Hitung di server atau beri label cakupan |
| 2.8 | MED | `campaign/CampaignSummaryCards.tsx:62` | "Total Kampanye" = active + completed + pendingPayments (mencampur entitas, mengabaikan draft/paused) | Ambil total dari backend |
| 2.9 | MED | `ActiveWorkDetailView.tsx:880` | Judul "URL Postingan Terverifikasi" padahal sel di baris 895 masih "Belum diverifikasi" | Ganti judul jadi "URL Bukti Tayang" kecuali status valid |
| 2.10 | MED | `auth/RoleChooser.tsx:14,33` | Copy klaim skala yang tidak bisa dibuktikan ("ratusan kreator terverifikasi", "ribuan UMKM aktif") | Lunakkan atau hapus angkanya |
| 2.11 | LOW | `mocks/umkm/overview.mock.ts:28` | KPI mock hardcoded (`creatorJoined: 8`) sementara daftarnya dari demo store → bisa tidak sinkron | Hitung KPI mock dari store |

---

## 3. MED — Service layer & integrasi

| # | Lokasi | Masalah | Tindakan |
|---|---|---|---|
| 3.1 | `services/umkm/umkm-appwrite.service.ts:300` | `campaignsRes.data ?? []` menelan kegagalan fetch; halaman tetap `ok()` sehingga outage tampil sebagai "tidak ada campaign" | Cek `campaignsRes.success` dan gagalkan overview |
| 3.2 | `services/creator/creator-appwrite.service.ts:133` | `ids.slice(0, PAGE_LIMIT)` membuang id ke-101+ tanpa chunking → join campaign/UMKM hilang | Pakai chunking seperti `umkm-appwrite.service.ts` |
| 3.3 | `services/umkm/umkm-appwrite.service.ts:476` | `getSubmissionCountsFromAppwrite` memakai id dari pemanggil tanpa filter kepemilikan | Verifikasi id campaign milik pemanggil lebih dulu |
| 3.4 | `services/shared/notification-appwrite.service.ts:177` | `deleteDocument` pada `notifications`, padahal header file (baris 25) menyatakan tidak ada `Permission.delete` → selalu 403 | Hapus jalur delete atau lewat Function |
| 3.5 | `services/umkm/umkm-dashboard.service.ts:287` | `existing?.conversationId ?? "conv_000"` mengarang id percakapan | Kembalikan error atau seed data mock yang benar |
| 3.6 | `services/umkm/umkm-appwrite.service.ts:132` | `externalAssetUrl: ""` hardcoded sementara mock punya URL asli → field tidak pernah bisa terisi di mode real | Join `campaign_assets` atau hapus field |
| 3.7 | `services/creator/creator-dashboard.service.ts:206` | Mock `getMessagesByConversationId` selalu `[]`, sedangkan mock UMKM mengembalikan riwayat | Samakan sumber mock |
| 3.8 | `services/umkm/umkm-dashboard.service.ts:837,846,875` | Mock `removeCampaignAsset`/`deleteOffer`/`cancelPayment` selalu sukses, padahal cabang real menolak non-draft/non-pending → mock tidak menguji guard | Tambahkan guard yang sama di cabang mock |
| 3.9 | `types/role.ts:7` | `UserRole = "UMKM" \| "KREATOR" \| "ADMIN"` bertabrakan dengan kanon `@/types/domain` dan tidak diimport siapa pun | Hapus file |
| 3.10 | `lib/umkm-status.ts:56` & `lib/creator-status.ts:38` | Dua pemilik map status→label yang sama; label `fraud.rejected` berbeda ("Tidak Valid" vs "Terindikasi Fraud") | Satukan ke satu modul |
| 3.11 | `services/umkm/umkm-dashboard.service.ts:187,500` | `getPendingSubmissions` tidak dipakai di mana pun; impl Appwrite-nya juga query array tanpa chunking | Hapus atau pakai |
| 3.12 | `00_BACKEND/src/services/wallet.service.ts:243` | Penarikan via SDK klien: `balance: wallet.balance - amount` non-atomik dan melewati guard Function (role/TOS/idempotensi) | Hapus jalur ini, arahkan ke `request-withdrawal` |
| 3.13 | `00_BACKEND/src/services/claim.service.ts:129,180` | `totalClaims + 1` / `- 1` read-modify-write dari klien, bersaing dengan increment atomik di Function | Hapus mutasi dari klien |

---

## 4. MED / LOW — Backend lain

| # | Severity | Lokasi | Masalah | Tindakan |
|---|---|---|---|---|
| 4.1 | MED | `functions/validate-and-upload/src/main.js:38-40, 89` | Kuota storage dicek lalu ditulis non-atomik (`usedBytes: usage.usedBytes + len`) → upload bersamaan bisa melewati kuota; pola sama di `delete-file/src/main.js:39` | Pakai increment/decrement atomik |
| 4.2 | LOW | `functions/request-password-otp/src/main.js:146` | Rate limit OTP `count: count + 1` dari nilai lama → limit 3/10 menit bisa dilewati dengan request paralel | Increment atomik pada `otp_rate_limits.count` |

---

## 5. MED / LOW — Kontrol mati & state (UI)

| # | Severity | Lokasi | Masalah | Tindakan |
|---|---|---|---|---|
| 5.1 | MED | `campaign/detail/CampaignDetailPage.tsx:188` | Tombol "Lihat Riwayat Transaksi" hanya memunculkan toast | Arahkan ke `/dashboard/umkm/keuangan` |
| 5.2 | MED | `settings/PengaturanClient.tsx:92-99` | Toggle notifikasi hanya lokal, tapi memunculkan toast sukses "berhasil diperbarui" | Simpan ke service atau hapus klaim sukses |
| 5.3 | MED | `creator-dashboard/CreatorDashboardView.tsx:294` | Link "Detail" pada kartu rekomendasi menuju `/dashboard/kreator/job-pool` (daftar), bukan detail job | Pakai `routes.kreatorJobDetail(job.id)` |
| 5.4 | MED | `creator-dashboard/JobDetailView.tsx:299` | Tombol share tanpa `onClick` dan tanpa `aria-label` | Implementasi atau hapus |
| 5.5 | LOW | `creator-dashboard/JobDetailView.tsx:650` | Tombol "Urutkan dari" tanpa `onClick` | Implementasi atau hapus |
| 5.6 | LOW | `creator-dashboard/SettingsView.tsx:1114` | Tombol "Simpan Preferensi" `disabled` permanen dengan handler kosong | Sembunyikan sampai fiturnya ada |
| 5.7 | LOW | `creator-dashboard/CreatorDashboardView.tsx:299` | "Klaim Job" tidak punya state pending/disabled saat proses berjalan | Tambah disabled + indikator |
| 5.8 | LOW | `creator-dashboard/CreatorDashboardSidebar.tsx:104` | Efek async menulis state setelah `await` tanpa guard unmount (file lain pakai `isActive`) | Tambah guard |
| 5.9 | LOW | `finance/TransactionCard.tsx:19` | `div` dengan `onClick` tanpa `role`/`tabIndex`/keyboard handler | Jadikan tombol atau tambah role + handler keyboard |
| 5.10 | MED | `creator-dashboard/modals/ClaimCampaignModal.tsx:145` | Baris aturan berbentuk `div onClick` tanpa role/tabIndex; keempatnya wajib dicentang untuk klaim → user keyboard tidak bisa klaim | Ganti ke checkbox asli |
| 5.11 | MED | `creator-dashboard/KeuanganView.tsx:708,730,751` | `<label>` tanpa `htmlFor`, input tanpa `id` → field bank/nominal tanpa nama aksesibel | Sambungkan `htmlFor`/`id` |

---

## 6. Temuan lintas-cutting

### 6.1 Em dash (`—`) di teks UI — antislop R-02

Hitungan di `src/**`:

| Penggunaan | Jumlah | Penilaian |
|---|---|---|
| Placeholder data tak diketahui (`"—"` sebagai nilai) | 62 | Penanda jujur "data belum ada", bukan prosa. Tetap memakai glif yang dilarang R-02 |
| Prosa / judul halaman (mis. `"Masuk — Marketiv"`, `"Keuangan — Dashboard Kreator"`) | 38 | **Kandidat perbaikan**: ganti ke `·`, `:`, atau `|` |

Catatan jujur: 62 placeholder itu sebagian besar kuperkenalkan sendiri di iterasi sebelumnya
(`—` untuk data kosong). Aku memilihnya karena konvensi "tidak ada data" yang mudah dikenali,
tetapi R-02 melarang glif itu di teks UI. Keputusan yang perlu diambil: tetap pakai `—`
(placeholder bukan prosa, ditulis alasannya) atau standarkan ke en dash `–` supaya tidak ada
glif yang dilarang. Aku condong ke **tetap `—` untuk placeholder + perbaiki 38 prosa**, lalu
catat pengecualiannya satu baris di dokumen desain.

### 6.2 Housekeeping

- Dua berkas tak terlacak di root repo: `banner_copywriting_guide.html`, `banner_meja_copywriting_guide.html` — bukan bagian aplikasi. Hapus atau pindahkan ke folder aset.

### 6.3 Yang justru sehat (bukti coverage)

Beberapa area diperiksa dan **bersih**: `midtrans-webhook` (verifikasi signature + recheck status
terminal + kecocokan jumlah), `request-withdrawal` (`reserveWithdrawalAtomically` memakai transaksi
Appwrite asli + ledger idempotent), `campaign-claimed`/`expire-stale-claims`/`unclaim-campaign`
(counter atomik + restore saat gagal), seluruh read-model `get-*` (filter kepemilikan ada di query,
tidak membocorkan field sensitif), `create-order`/`create-offer`/`create-conversation`/`create-payment`
(tidak memercayai user id dari body), skema permission untuk koleksi uang (`wallets`, `transactions`,
`payments`, `escrows`, `orders`, `withdrawals`, `notifications`) tanpa `read("any")` dan tanpa
`update("users")`, alur OTP/login/reset, `RoleGuard` + `AuthProvider` (loop redirect, suspended,
role mismatch), serta hampir seluruh dashboard UMKM & kreator untuk state loading/empty/error.

---

## 7. Usulan urutan perbaikan

### Batch A — Frontend, aman dikerjakan sekarang (tanpa backend)
Temuan 2.1, 2.3, 2.4, 2.5, 2.9, 2.11, 5.1, 5.3, 5.4, 5.5, 5.6, 5.7, 5.8, 5.9, 5.10, 5.11, 3.9, 6.1 (prosa), 6.2.
Kriteria: perubahan kecil, bisa diuji, tidak mengubah kontrak data.

### Batch B — Frontend yang butuh backend (gabung ke spek yang sudah ada)
Temuan 2.6, 2.7, 2.8, 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8, 3.10, 3.11 → masuk
`.kiro/specs/creator-followers-directory-dto` / spek baru "dashboard data honesty".

### Batch C — Backend keamanan & uang (**prioritas tertinggi, jangan digabung dengan kosmetik**)
Temuan 1.1 sampai 1.7, 4.1, 4.2, 3.12, 3.13.
Ini yang paling berbahaya: eskalasi admin dan risiko uang dobel. Perlu spec bugfix tersendiri
plus uji konkurensi, bukan sekadar kode.

### Batch D — Analitik jujur
Temuan 1.8 + 2.2 + 2.3: butuh keputusan produk apakah backend menyediakan time-series asli,
atau grafik/timeline dihapus sampai datanya ada. Rekomendasi: sediakan
`get-umkm-analytics-series`, karena analytics tanpa seri waktu asli memang tidak punya arti.
