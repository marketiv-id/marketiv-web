# Rate Cards — Database

Sumber kebenaran skema koleksi milik modul Rate Cards. Satu fakta = satu lokasi. Sumber config: `appwrite.config.json` (generator `appwrite/generate_appwrite_json.cjs`).

---

## rate_cards

**Purpose:** parent paket yang memegang status publikasi. Relasi: Creator (1) → Rate Cards (N, maks 3 via service); Rate Card (1) → Packages (N, praktiknya 1).

| Attribute | Type | Required | Catatan |
| --- | --- | --- | --- |
| creatorId | string(255) | yes | FK → users (Auth user ID Creator) |
| title | string(255) | yes | = nama paket (service aktif) |
| description | string(2000) | no | = deskripsi paket (service aktif) |
| status | string(50) | yes | `draft\|published` (bukan enum Appwrite) |
| createdAt | datetime | no | Diisi service saat create |

**Index**: `idx_creatorId`, `idx_status`, `idx_createdAt` (DESC).

**Permission**: collection `read("any")`, `create("users")`, row security on. Baris: `read("any")`, `update` + `delete` hanya Creator pemilik.

---

## rate_card_packages

**Purpose:** detail layanan yang dipilih UMKM. Relasi: Rate Card (1) → Packages (N); dirujuk `offers.packageId` & `orders.packageId`.

| Attribute | Type | Required | Catatan |
| --- | --- | --- | --- |
| rateCardId | string(255) | yes | FK → rate_cards |
| name | string(100) | yes | Nama paket |
| description | string(2000) | yes | Deskripsi paket |
| output | string(2000) | yes | Hasil kerja yang didapat UMKM |
| deliveryDays | integer (0–999999999) | yes | Estimasi hari pengerjaan (UI ≥ 1) |
| price | integer (0–999999999) | yes | Harga paket (UI ≥ 1.000) |
| revisionLimit | integer (0–999999999) | yes | Batas revisi acuan |

**Index**: `idx_rateCardId`, `idx_price`.

**Permission**: collection `read("any")`, `create("users")`, row security on. Baris: `read("any")`, `update` + `delete` hanya Creator pemilik.

> Visibilitas draft hanya dijaga query (`status = published`), bukan permission: baris draft tetap `read("any")`.

> Aturan validasi & hapus: `30_Business_Rules.md`.
