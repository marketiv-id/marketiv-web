# Orders — Database

Sumber kebenaran skema koleksi milik modul Orders. Satu fakta = satu lokasi. Sumber config: `appwrite.config.json` (digenerate `appwrite/generate_appwrite_json.cjs`). Semua kolom `status` bertipe **string(50/20)**, bukan enum Appwrite — nilai dijaga kode.

---

## orders

**Purpose:** aggregate utama alur Rate Card. Relasi: Offer (1) → Order (0..1) via unique `offerId`; Package (1) → Orders (N) sebagai provenance; Order (1) → Deliverables (N), Revisions (N), Validations (N), Escrow (1, modul Payments).

| Attribute | Type | Required | Catatan |
| --- | --- | --- | --- |
| offerId | string(255) | no | FK → offers. Selalu diisi `create-order`; unique |
| packageId | string(255) | no | FK → rate_card_packages; provenance dari offer |
| packageNameSnapshot | string(100) | no | Snapshot nama paket saat offer dibuat |
| packagePriceSnapshot | integer (0–999999999) | no | Snapshot harga paket; bukan dasar tagihan |
| creatorId | string(255) | yes | FK → users (seller, Auth user ID) |
| umkmId | string(255) | yes | FK → users (buyer, Auth user ID) |
| amount | integer (0–999999999) | yes | Harga final = `offer.price` |
| status | string(50) | yes | Ditulis: `pending_payment\|in_progress\|revision\|completed\|cancelled`. `escrow\|approved\|expired\|dispute` belum diimplementasikan |
| createdAt | datetime | no | Tidak diisi `create-order` (pakai `$createdAt`) |
| review_deadline_at | datetime | no | `deliverable.$createdAt + 3 hari`; null saat revisi diminta |
| auto_approved | boolean | no | default `false`; `true` bila diset cron auto-approve |
| revision_count | integer | no | default 0; `max(existing, version − 1)` oleh `track-order-review` (informatif) |
| revision_limit | integer | no | default 0; snapshot limit dari offer/paket oleh `track-order-review` |
| reminder_sent_at | datetime | no | Reminder H-1 terkirim; reset null saat deliverable baru/revisi |

**Index**: `idx_offerId` (unique), `idx_packageId`, `idx_creatorId`, `idx_umkmId`, `idx_status`, `idx_createdAt` (DESC).

**Permission**: collection `$permissions: []`, row security on. Baris dibuat `create-order` dengan `read` UMKM + Creator saja. Tidak ada `update` browser — semua mutasi status lewat Function (API key).

---

## deliverables

**Purpose:** hasil kerja Creator per order, berversi. Relasi: Order (1) → Deliverables (N); `fileId` → `user_files` (modul Users) untuk sumber `storage`.

| Attribute | Type | Required | Catatan |
| --- | --- | --- | --- |
| orderId | string(255) | yes | FK → orders |
| source | string(50) | yes | `storage\|external_url` |
| fileUrl | string(2048) | yes | URL HTTPS (storage atau eksternal) |
| fileId | string(255) | no | FK → user_files.$id; wajib bila `source = storage`, null untuk external |
| notes | string(2000) | no | Catatan Creator |
| version | integer (0–999999999) | yes | `latest + 1` |
| status | string(50) | yes | `submitted\|revision_requested\|approved` (`delivered` hanya dibaca cron, legacy) |
| createdAt | datetime | no | Diisi Function saat submit |
| creatorCredit | string(255) | no | Username TikTok kreditasi (T&C 16.3) — kolom ada, **belum ditulis** kode |
| aiGenerated | boolean | no | Penanda konten AI — kolom ada, **belum ditulis** kode |

**Index**: `idx_orderId`, `idx_createdAt` (DESC). Query "latest" memakai `orderDesc("version")` tanpa index `version`.

**Permission**: collection `$permissions: []`. Baris dibuat `submit-ratecard-deliverable` dengan `read` Creator + UMKM, `update` UMKM saja. Browser tidak bisa create; Creator tidak bisa update (mencegah self-approve).

> **Catatan Hukum (T&C)**: peralihan kepemilikan konten ke UMKM terjadi saat escrow dirilis (`release-escrow`), bukan saat deliverable dikirim.

---

## revisions

**Purpose:** permintaan revisi UMKM. Relasi: Order (1) → Revisions (N); satu baris per latest deliverable yang diminta revisi.

| Attribute | Type | Required | Catatan |
| --- | --- | --- | --- |
| orderId | string(255) | yes | FK → orders |
| requestedBy | string(255) | yes | FK → users (UMKM) |
| message | string(2000) | yes | Alasan revisi |
| status | string(50) | yes | Ditulis `open`; `resolved` belum diimplementasikan |

ID dokumen deterministik `rev` + sha256(`orderId:latestDeliverableId`)[0..29].

**Index**: `idx_orderId`, `idx_status`.

**Permission**: collection `$permissions: []`. Baris dibuat `request-ratecard-revision` dengan `read` UMKM + Creator; tanpa update/delete browser.

---

## ratecard_deliverable_validations

**Purpose:** keputusan final Admin atas satu deliverable; kunci kedua untuk release escrow.

| Attribute | Type | Required | Catatan |
| --- | --- | --- | --- |
| deliverableId | string(255) | yes | FK → deliverables; unique |
| orderId | string(255) | yes | FK → orders |
| deliverableVersion | integer | yes | Snapshot `deliverable.version` |
| sourceSnapshot | string(50) | yes | Snapshot `deliverable.source` |
| evidenceUrlSnapshot | string(2048) | yes | Snapshot `deliverable.fileUrl` |
| status | string(20) | yes | `valid\|invalid` (UI memakai `pending` bila baris belum ada) |
| reviewedBy | string(255) | yes | Auth user ID Admin |
| reviewNotes | string(2000) | no | Wajib untuk `invalid` (dijaga Function) |
| reviewedAt | datetime | yes | Waktu keputusan |

**Index**: `idx_deliverableId` (unique), `idx_orderId`, `idx_status`, `idx_reviewedAt` (DESC).

**Permission**: collection `$permissions: []`, baris dibuat tanpa row permission → hanya terbaca server (Function DTO admin/UMKM).

---

## Bucket `deliverables`

Ada di config (`read/create/update("users")`, `fileSecurity: true`, maks 500 MB, antivirus) tetapi **tidak dipakai kode**. Berkas deliverable `storage` diunggah lewat `validate-and-upload` ke bucket default File Manager (env `DEFAULT_STORAGE_BUCKET_ID`; config bucket `user-files` maks 20 MB/berkas, plus kuota user) — lihat `../Users/50_Database.md`.

---

> Escrow & transaksi ada di `../Payments/50_Database.md`. `offerId` → `../Offers/50_Database.md`; `packageId` → `../RateCards/50_Database.md`. Aturan status & versi: `30_Business_Rules.md`.
