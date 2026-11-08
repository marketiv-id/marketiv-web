# Runbook — Hosting Netlify (Fase 1)

Runbook ini dipakai untuk memindahkan hosting app user dan admin dari Appwrite Sites ke Netlify Free, **tanpa** mengubah backend (tetap Appwrite sampai Fase 10). Isinya: peta situs, aturan rilis hemat kredit, daftar env, langkah pindah domain (staging dulu, lalu prod), daftar Web Platform Appwrite, verifikasi `after()`, dan smoke test.

Keputusan pemilik 2026-11-08: domain staging memakai **branch subdomain Netlify** di bawah `marketiv.id` (`staging.marketiv.id` dan `staging.admin.marketiv.id`), bukan `marketiv-dev.my.id`. Alasannya ada di [§4](#4-kenapa-staging-pindah-ke-stagingmarketivid).

---

## 1. Peta situs

| | Situs user | Situs admin |
|---|---|---|
| Nama project Netlify | `marketiv-production` (nama `marketiv-web` sudah dipakai orang lain) | `marketiv-admin` |
| Site ID | `95d13aa2-e50b-4455-8331-1daf57602f2c` | `80afc8f2-8792-48f8-b941-c1786bea00d9` |
| Tim | `marketiv-marketiv` (plan Free) | sama |
| Base directory | `/` | `admin` |
| Config | [`netlify.toml`](../../../netlify.toml) | [`admin/netlify.toml`](../../../admin/netlify.toml) |
| Production branch | `production` | `production` |
| Branch deploy | `staging`, `migrasi-supabase` | `staging`, `migrasi-supabase` |
| URL Netlify | `marketiv-production.netlify.app` | `marketiv-admin.netlify.app` |
| URL branch | `staging--marketiv-production.netlify.app`, `migrasi-supabase--marketiv-production.netlify.app` | `staging--marketiv-admin.netlify.app`, `migrasi-supabase--marketiv-admin.netlify.app` |
| Domain prod (target) | `marketiv.id` (+ `www`) | `admin.marketiv.id` |
| Domain staging (target) | `staging.marketiv.id` | `staging.admin.marketiv.id` |
| Appwrite API prod | `https://api.marketiv.id/v1` | `https://api-admin.marketiv.id/v1` |
| Appwrite API staging (target) | `https://api-staging.marketiv.id/v1` | `https://api-admin-staging.marketiv.id/v1` |
| Appwrite API staging (sekarang) | `https://api.marketiv-dev.my.id/v1` | `https://api-admin.marketiv-dev.my.id/v1` |

Project Appwrite: produksi `6a8c45ef0023ae195594`, staging `69f9d45b00315cb0ec2f`. Database ID keduanya `6a4c8598001da3b0d7f0`.

**DNS `marketiv.id` dikelola Appwrite**, bukan Hostinger. Registrar-nya Hostinger, tetapi nameserver domain = `ns1.appwrite.zone` / `ns2.appwrite.zone`. Semua record DNS di runbook ini diubah di **Appwrite Console → Domains → marketiv.id**. Zona DNS di hPanel Hostinger tidak aktif, jadi mengubahnya tidak berpengaruh.

---

## 2. Aturan rilis hemat kredit

Netlify Free memberi **300 kredit per bulan tanpa overage**. Kalau habis, **semua situs tim di-pause** sampai akhir bulan.

| Aksi | Biaya |
|---|---|
| Deploy produksi (per situs) | 15 kredit |
| Deploy Preview (PR) | gratis |
| Branch deploy (`staging`, `migrasi-supabase`) | gratis |
| Bandwidth, request, compute Function | memakai kredit (lihat Team → Usage) |

Aturan:
1. **Kerja harian hanya di Deploy Preview dan branch deploy.** Merge ke `staging` atau `migrasi-supabase` tidak memakan kredit deploy.
2. **Deploy produksi hanya lewat merge sengaja `staging` → `production`.** Production branch kedua situs = `production`, jadi push ke branch lain tidak pernah deploy produksi.
3. **Kumpulkan rilis.** Target maksimal **satu rilis produksi per minggu**. Satu rilis yang menyentuh kedua app = 30 kredit; empat rilis = 120 kredit, menyisakan ±180 kredit untuk bandwidth dan Function.
4. **Build otomatis dilewati bila app tidak berubah.** Perintah `ignore` di `netlify.toml`:
   - Situs user dilewati bila commit hanya menyentuh `admin/`, `docs/`, `00_BACKEND/`, `prompts/`, `.github/`, atau `scripts/migration/`.
   - Situs admin dilewati bila commit tidak menyentuh `admin/`.
   - Build pertama sebuah branch, build tanpa cache, dan `git diff` yang gagal tetap build (fail-open).
   - Build yang dilewati tidak dipublish, jadi tidak memakan kredit deploy produksi.
5. **Perlu rebuild tanpa perubahan kode** (misalnya setelah mengubah env): set env UI `NETLIFY_FORCE_BUILD=true` di konteks yang dituju, Trigger deploy, lalu hapus lagi env tersebut.
6. **Hotfix produksi** boleh di luar jadwal, tetapi catat di log fase atau catatan rilis supaya pemakaian kredit bisa dilacak.
7. Opsional, untuk pengaman tambahan: di **Deploys → Stop auto publishing**, deploy produksi baru tetap di-build tetapi tidak dipublish sampai tombol *Publish deploy* ditekan.
8. Cek **Team → Usage** setiap minggu. Bila pemakaian melewati 200 kredit sebelum tanggal 20, bekukan rilis produksi sampai bulan berikutnya kecuali hotfix.

---

## 3. Daftar env per situs

Prinsip:
- `NEXT_PUBLIC_*` diinline ke bundle saat **build**. Nilai non-produksi yang publik disimpan di `netlify.toml` (konteks `deploy-preview` dan `branch-deploy`), supaya bisa direview di PR.
- Nilai **produksi** dan semua **secret** hanya di UI Netlify. `netlify.toml` sengaja tidak punya blok produksi, jadi tidak bisa menimpa nilai produksi.
- Variabel yang dibaca Route Handler saat runtime (secret, `SENTRY_ENVIRONMENT`) **wajib di UI** dengan scope *Functions* dan *Builds*. Function tidak bisa membaca `netlify.toml`.
- Mengubah env apa pun butuh redeploy.

Status per 2026-11-08 (diperiksa lewat Netlify MCP; hanya nama yang dicatat):

### Situs user (`marketiv-production`)

| Env | Produksi (UI) | Preview + branch | Catatan |
|---|---|---|---|
| `NEXT_PUBLIC_APPWRITE_ENDPOINT` | ✅ | ✅ toml | wajib saat build |
| `NEXT_PUBLIC_APPWRITE_PROJECT_ID` | ✅ | ✅ toml | |
| `NEXT_PUBLIC_APPWRITE_DATABASE_ID` | ✅ | ✅ toml | |
| `NEXT_PUBLIC_APPWRITE_STORAGE_BUCKET_ID` | ✅ | default kode | |
| `NEXT_PUBLIC_APPWRITE_BUCKET_AVATARS` / `_LOGOS` / `_PORTFOLIOS` / `_CAMPAIGN_ASSETS` / `_DELIVERABLES` / `_FRAUD_EVIDENCE` | ✅ | default kode | default di `src/lib/appwrite/config.ts` sama dengan nilai produksi |
| `NEXT_PUBLIC_APPWRITE_BUCKET_CREATOR_BANNERS` | — | default kode | opsional (default `creator-banners`) |
| `NEXT_PUBLIC_ADMIN_APP_URL` | ✅ | ✅ toml | wajib saat build |
| `NEXT_PUBLIC_APP_ENV` | ✅ | ✅ toml | juga dipakai Sentry sebagai fallback environment |
| `NEXT_PUBLIC_USE_MOCK_DATA` | ✅ | ✅ toml | harus `false`; kosong = mock ON |
| `NEXT_PUBLIC_ENABLE_GOOGLE_OAUTH` | ✅ | ✅ toml (`false`) | |
| `NEXT_PUBLIC_MIDTRANS_ENV` | ✅ | ✅ toml (`sandbox`) | ⚠️ produksi saat ini bernilai `sandbox`, pastikan disengaja |
| `NEXT_PUBLIC_MIDTRANS_CLIENT_KEY` | ✅ | ❌ **isi di UI** | client key sandbox untuk konteks Deploy Preview + Branch deploy |
| `NEXT_PUBLIC_SENTRY_DSN` | ❌ **isi di UI** | ❌ **isi di UI** | tanpa ini Sentry tidak mengirim apa pun |
| `SENTRY_ENVIRONMENT` | ✅ | ❌ **isi di UI** (`staging`) | dibaca runtime server |
| `SENTRY_AUTH_TOKEN` | opsional (secret, scope Builds) | — | hanya untuk upload source map |
| `VERTEX_AI_PROJECT_ID`, `VERTEX_AI_CLIENT_EMAIL`, `VERTEX_AI_PRIVATE_KEY`, `VERTEX_AI_LOCATION`, `VERTEX_AI_MODEL` | ✅ | ❌ **isi di UI** | dipakai `/api/chat` saat runtime. Pakai "same value for all deploy contexts" atau isi konteks Deploy Preview + Branch deploy |
| `OPENROUTER_API_KEY`, `OPENROUTER_MODEL` | ✅ | ❌ **isi di UI** | fallback `/api/chat` |
| `NEXT_PUBLIC_UMKM_ONBOARDING_TOUR_ENABLED` | — | — | opsional, default mati |
| `NETLIFY_FORCE_BUILD` | — | — | sementara saja, lihat §2 butir 5 |

### Situs admin (`marketiv-admin`)

| Env | Produksi (UI) | Preview + branch | Catatan |
|---|---|---|---|
| `NEXT_PUBLIC_APPWRITE_ENDPOINT` | ✅ (`api-admin.marketiv.id`) | ✅ toml | wajib saat build, hostname terpisah dari app user |
| `NEXT_PUBLIC_APPWRITE_PROJECT_ID` | ✅ | ✅ toml | |
| `NEXT_PUBLIC_APPWRITE_DATABASE_ID` | ✅ | ✅ toml | |
| `NEXT_PUBLIC_USER_APP_URL` | ✅ | ✅ toml | |
| `NEXT_PUBLIC_APP_ENV` | ✅ | ✅ toml | |
| `NEXT_PUBLIC_VIEW_VALIDATION_DELAY_HOURS` | ✅ (`72`) | default kode | staging boleh `0` bila perlu uji cepat |

**Variabel global project Appwrite** (Midtrans server key, secret Function, dan sebagainya) **tidak dipindah di Fase 1.** Backend tetap Appwrite dan tidak ada Route Handler yang memakainya. Variabel itu dipindah ke env Netlify saat Route Handler pengganti Function dibuat (Fase 6–8).

---

## 4. Kenapa staging pindah ke `staging.marketiv.id`

- Netlify Free hanya bisa memberi domain custom ke **branch deploy** lewat *branch subdomain*: `<nama-branch>.<domain utama situs>`, dengan CNAME ke `<branch>--<situs>.netlify.app`.
- Nama lain (misalnya `marketiv-dev.my.id`) hanya bisa lewat situs Netlify terpisah, yang setiap deploy staging-nya adalah deploy produksi (15 kredit per situs). Itu tidak sesuai kuota.
- Cookie sesi Appwrite harus first-party, jadi API harus satu domain induk dengan app. App staging di `*.marketiv.id` → API staging juga di `*.marketiv.id`: `api-staging.marketiv.id` dan `api-admin-staging.marketiv.id`. Keduanya sudah dipakai dan diuji di spec isolasi sesi.
- Akibatnya:
  - Host staging admin berubah dari `admin-staging.marketiv.id` menjadi `staging.admin.marketiv.id`.
  - Branch subdomain hanya bisa dibuat setelah domain utama (`marketiv.id`, `admin.marketiv.id`) **ditambahkan** ke situs Netlify. Menambahkan domain di Netlify tidak mengubah DNS, jadi produksi tetap dilayani Appwrite sampai langkah C.

---

## 5. Langkah pemilik

Tanda 🧑 = dikerjakan pemilik di dashboard. Tanda 🤖 = bisa dikerjakan sesi berikutnya lewat PR atau MCP.

### A. Pengaturan situs Netlify (sekali)

1. 🧑 **Situs admin: base directory.** Buka `marketiv-admin` → Project configuration → Build & deploy → Build settings. Pastikan **Base directory = `admin`**, build command dan publish directory kosong (dibaca dari `admin/netlify.toml`).
   > Deploy produksi admin pertama (`6aeff3149ed18c1333bfd3ca`) selesai dalam 5 detik tanpa build dan tanpa plugin Next.js, lalu `/` mengembalikan **404**. Kemungkinan besar base directory atau build command belum benar.
2. 🧑 **Situs user:** base directory `/` (atau kosong). Build command dan publish kosong (dibaca dari `netlify.toml`).
3. 🧑 **Branch deploys** di kedua situs → *Let me add individual branches*: `staging`, `migrasi-supabase`.
4. 🧑 **Deploy Previews** di kedua situs: *Any pull request against your production branch / branch deploy branches* aktif.
5. 🧑 **Env yang masih kosong** (§3, baris bertanda ❌): `NEXT_PUBLIC_SENTRY_DSN`, `SENTRY_ENVIRONMENT=staging` (non-prod), `NEXT_PUBLIC_MIDTRANS_CLIENT_KEY` sandbox (non-prod), `VERTEX_AI_*` dan `OPENROUTER_*` (non-prod). Simpan secret dengan opsi *Contains secret values*.
6. 🧑 **Visitor access.** Saat ini kedua situs memakai *Netlify team login* untuk **semua** deploy, termasuk produksi (pengunjung melihat 401). Biarkan dulu sampai langkah C.3.
7. 🧑 Setelah langkah 1–5, Trigger deploy `staging` di kedua situs (gratis, branch deploy) dan cek build log.

### B. Domain staging

Prasyarat: langkah A selesai dan branch deploy `staging` hijau di kedua situs.

1. 🧑 **Appwrite staging → custom domain API.** Di project staging `69f9d45b00315cb0ec2f`, tambahkan custom domain `api-staging.marketiv.id` dan `api-admin-staging.marketiv.id` (bila belum ada). Karena DNS dikelola Appwrite, record-nya biasanya dibuat otomatis; tunggu status *verified*.
   > Org Appwrite turun ke plan Free (2026-11-08). Bila plan Free menolak custom domain kedua, **berhenti dan catat**. Fallback sementara: tetap pakai `api.marketiv-dev.my.id`. Itu berarti cookie lintas situs; SDK Appwrite masih bisa jalan lewat fallback localStorage, tetapi kurang aman dan Safari bisa menolak.
2. 🧑 **Netlify → tambah domain utama tanpa mengubah DNS.**
   - `marketiv-production` → Domain management → Add a domain → `marketiv.id`, jadikan primary. Netlify akan menampilkan *Awaiting External DNS*; itu normal.
   - `marketiv-admin` → Add a domain → `admin.marketiv.id`, jadikan primary.
3. 🧑 **Netlify → branch subdomain.** Di kedua situs: Domain management → Branch subdomains → New subdomain → branch `staging`.
4. 🧑 **Appwrite Console → Domains → marketiv.id → tambah record:**

   | Nama | Tipe | Nilai |
   |---|---|---|
   | `staging` | CNAME | `staging--marketiv-production.netlify.app` |
   | `staging.admin` | CNAME | `staging--marketiv-admin.netlify.app` |

   > `staging.marketiv.id` sekarang mungkin masih punya record lama (A/AAAA ke server lain atau ke Appwrite Sites staging). Catat record lama sebelum menghapusnya, supaya bisa dikembalikan.
5. 🧑 Tunggu Netlify memasang sertifikat HTTPS untuk `staging.marketiv.id` dan `staging.admin.marketiv.id` (Domain management → HTTPS).
   > Risiko: Netlify bisa menunda sertifikat karena `marketiv.id` sendiri belum mengarah ke Netlify. Bila belum terbit dalam ±1 jam, klik *Verify DNS configuration*/*Renew certificate*. Bila tetap gagal, smoke test staging memakai URL `staging--*.netlify.app` dan lanjut ke langkah C; sertifikat akan lengkap setelah domain prod pindah.
6. 🧑 **Appwrite staging → Web Platform** (lihat §6): tambahkan `staging.marketiv.id`, `staging.admin.marketiv.id`, `*.netlify.app`.
7. 🤖 **PR ke `staging`/`migrasi-supabase`:** ganti nilai non-prod di `netlify.toml` dan `admin/netlify.toml`:
   - user: `NEXT_PUBLIC_APPWRITE_ENDPOINT=https://api-staging.marketiv.id/v1`, `NEXT_PUBLIC_ADMIN_APP_URL=https://staging.admin.marketiv.id`
   - admin: `NEXT_PUBLIC_APPWRITE_ENDPOINT=https://api-admin-staging.marketiv.id/v1`, `NEXT_PUBLIC_USER_APP_URL=https://staging.marketiv.id`
8. 🧑 Smoke test staging (§8) di `https://staging.marketiv.id` dan `https://staging.admin.marketiv.id`.
9. 🧑 Opsional (Fase 4): branch subdomain `migrasi-supabase` → `migrasi-supabase.marketiv.id` dan `migrasi-supabase.admin.marketiv.id`, dengan record CNAME yang sama polanya.

### C. Domain produksi

Prasyarat: smoke test staging lulus.

1. 🧑 **H-1:** catat semua record DNS `marketiv.id` yang ada sekarang (apex, `www`, `admin`, `api`, `api-admin`, dan lainnya) sebagai bahan rollback. Turunkan TTL record apex, `www`, dan `admin` ke 300 detik bila Appwrite DNS mengizinkan.
2. 🧑 **Appwrite produksi → Web Platform:** pastikan `marketiv.id`, `www.marketiv.id`, `admin.marketiv.id` ada. Tambahkan `marketiv-production.netlify.app` dan `marketiv-admin.netlify.app` untuk uji sebelum DNS pindah.
3. 🧑/🤖 **Netlify visitor access:** ubah *Netlify team login* menjadi **non-production deploys only** di kedua situs, supaya produksi bisa dibuka publik. Preview dan staging tetap terlindungi. Bisa dilakukan lewat Netlify MCP (`update-visitor-access-controls`, `appliesTo: non-production-projects`).
4. 🧑 **Deploy produksi** commit `production` terbaru di kedua situs (2 × 15 kredit). Uji di `https://marketiv-production.netlify.app` dan `https://marketiv-admin.netlify.app`.
   > Setelah domain utama di-set (langkah B.2), Netlify bisa mengalihkan URL `*.netlify.app` produksi ke domain utama. Bila begitu, uji lewat permalink deploy (`https://<deploy-id>--marketiv-production.netlify.app`).
5. 🧑 **Ganti record DNS** di Appwrite Console → Domains → marketiv.id. **Jangan sentuh** `api`, `api-admin`, `api-staging`, `api-admin-staging`, MX, SPF, DKIM, dan DMARC.

   | Nama | Tipe | Nilai baru |
   |---|---|---|
   | `@` (apex) | A | `75.2.60.5` (load balancer Netlify), atau ALIAS/ANAME ke `apex-loadbalancer.netlify.com` bila didukung |
   | `www` | CNAME | `marketiv-production.netlify.app` |
   | `admin` | CNAME | `marketiv-admin.netlify.app` |

   Hapus record lama untuk nama yang sama (yang mengarah ke Appwrite Sites). Bila ada record **CAA**, pastikan `letsencrypt.org` diizinkan.
6. 🧑 Tunggu sertifikat HTTPS Netlify aktif untuk `marketiv.id`, `www.marketiv.id`, `admin.marketiv.id`. Aktifkan *Force HTTPS*.
7. 🧑 Smoke test produksi (§8). Login prod tidak berubah karena host app (`marketiv.id`) dan host API (`api.marketiv.id`) sama seperti sebelumnya.
8. **Rollback:** kembalikan record DNS dari catatan langkah C.1. Appwrite Sites masih hidup selama 7 hari stabil (langkah D).

### D. Tertunda

- 🧑/🤖 **Ukur kredit** di Team → Usage pada **2026-11-15** atau 7 hari setelah domain prod pindah. Tulis pemakaian dan perkiraan bulanan di `progress/fase-01.md`.
- 🧑 **Matikan Appwrite Sites** (user dan admin, staging dan prod) setelah domain prod stabil **7 hari** di Netlify. Jangan menghapus custom domain API (`api.*`), karena backend masih Appwrite.
- 🧑 Hapus situs Node.js lama di Hostinger (`marketiv.id`, `staging.marketiv.id`, `finance.marketiv.id`) bila memang tidak dipakai. Situs itu tidak menerima trafik karena nameserver domain ada di Appwrite.
- Fase 10/11: DNS `marketiv.id` ada di Appwrite. Sebelum Appwrite dilepas total, nameserver harus dipindah (ke Netlify DNS atau DNS Hostinger) dan semua record disalin. Lihat "Isu untuk fase lain" di log Fase 1.

---

## 6. Web Platform / allowed origin Appwrite

Appwrite Console → project → Overview → Platforms → Add platform → Web.

| Project | Hostname yang harus ada |
|---|---|
| Produksi `6a8c45ef0023ae195594` | `marketiv.id`, `www.marketiv.id`, `admin.marketiv.id`, `marketiv-production.netlify.app`, `marketiv-admin.netlify.app` |
| Staging `69f9d45b00315cb0ec2f` | `staging.marketiv.id`, `staging.admin.marketiv.id`, `*.netlify.app` (branch deploy dan Deploy Preview, misalnya `deploy-preview-12--marketiv-production.netlify.app`) |

`*.netlify.app` hanya untuk staging. Untuk produksi cukup hostname persis. Host lama (`admin-staging.marketiv.id`, host Appwrite Sites) dihapus setelah langkah D.

---

## 7. Verifikasi `after()` (dipakai Fase 7)

Route probe: [`src/app/api/health/after/route.ts`](../../../src/app/api/health/after/route.ts). Route ini tidak membaca data dan hanya menulis satu baris log tanpa PII.

1. Buka `https://<deploy>/api/health/after` (Deploy Preview, branch `staging`, atau produksi). Login tim Netlify dulu bila diminta. Respons berisi `probeId`.
2. Tunggu ±5 detik, lalu buka Netlify → situs → Logs → Functions → *Next.js Server Handler*. Cari `after-probe` dengan `probeId` tadi.
   - Sesi Claude juga bisa memeriksanya lewat Netlify MCP: `get-request-logs` dengan filter `LogText = <probeId>`. Log Netlify Free hanya disimpan sekitar 24 jam.
3. Hasil:
   - Baris muncul dengan `msAfterResponse` ≈ 1500: **`after()` jalan**. Catat di log fase.
   - Baris tidak muncul: `after()` tidak jalan. Catat di log fase, supaya Fase 7 memakai alternatif (antrean di Postgres + `pg_cron`, atau mengerjakan sebelum respons).

---

## 8. Smoke test

Isi untuk staging lalu produksi. Simpan hasil di `progress/fase-01.md`.

| # | Skenario | Staging | Produksi |
|---|---|---|---|
| 1 | Login UMKM | | |
| 2 | Login kreator | | |
| 3 | Dashboard UMKM dan kreator tampil dengan data asli (bukan mock) | | |
| 4 | Chat realtime: pesan muncul di dua browser tanpa refresh | | |
| 5 | Upload avatar | | |
| 6 | Buat campaign draft | | |
| 7 | Login admin dan antrean admin (submissions, withdrawals, rate card validations) | | |
| 8 | Login admin **tidak** mengeluarkan sesi app user di browser yang sama | | |
| 9 | Chatbot `/api/chat` menjawab | | |
| 10 | `/api/health/after` + baris `after-probe` di log | | |
| 11 | Sertifikat HTTPS valid, `www` → apex | — | |

> Catatan: org Appwrite turun ke plan Free pada 2026-11-08 dan, menurut catatan pemilik, hanya tersisa 1 bucket (`campaign-assets`) dan 2 Function (`create-user-profile`, `create-user-wallet`) per project. Bila skenario 5 (avatar) atau fitur yang bergantung pada Function lain gagal, cek dulu apakah penyebabnya batas plan Appwrite, bukan hosting Netlify.
