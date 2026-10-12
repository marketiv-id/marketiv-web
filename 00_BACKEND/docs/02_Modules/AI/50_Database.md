# AI — Database

Sumber kebenaran skema koleksi milik modul AI. Satu fakta = satu lokasi. Definisi fisik: `00_BACKEND/appwrite.config.json` (database `6a4c8598001da3b0d7f0` / `db_marketiv`) & `appwrite/generate_appwrite_json.cjs`.

---

# Collection: ai_requests

**Purpose:** Log permintaan AI yang dibuat Appwrite Function `ai-brief` (`brief`) dan `ai-fraud-precheck` (`fraud`). Milik modul AI. Chatbot Tivvy (`/api/chat`) **tidak** menulis ke sini.

## Attributes

| Name | Type | Required | Notes |
|------|------|----------|-------|
| `userId` | `string(255)` | ya | `brief`: dari env `APPWRITE_FUNCTION_USER_ID` → `body.userId` → `""` (frontend produksi tidak mengirim `userId`, jadi umumnya kosong). `fraud`: `submission.creatorId` |
| `feature` | `enum(size 7)` | ya | `brief` \| `fraud` \| `landing` (`landing` belum dipakai kode mana pun) |
| `prompt` | `string(5000)` | ya | `brief`: prompt lengkap ke model. `fraud`: **hanya caption** submission |
| `response` | `string(10000)` | tidak | `brief`: JSON brief ter-normalisasi. `fraud`: JSON analisis Gemini |
| `createdAt` | `datetime` | tidak | **Tidak pernah diisi** kode; gunakan `$createdAt` sistem |

## Relations

- `userId` → `users.userId` (one-to-many), tidak di-enforce.

## Indexes

- `idx_userId` — `userId` (key).
- `idx_feature` — `feature` (key).
- `idx_createdAt` — `createdAt` DESC (key) — kolom selalu null, index belum berguna.

## Permissions

- Table `$permissions`: kosong; `rowSecurity: true`.
- Baris dibuat Function **tanpa** row permission → hanya server (API key) yang dapat membaca/menulis. "Owner read" **belum diimplementasikan**.
- Tulis bersifat best effort: kegagalan insert hanya di-log, tidak menggagalkan respons Function.

---

# Bucket: fraud-evidence

**Purpose:** Disediakan untuk bukti pemeriksaan fraud. **Belum dipakai** kode mana pun (tidak ada Function/service yang menulis atau membaca).

- `$permissions`: `read("users")`, `fileSecurity: true`.
- Maks. 5 MB; ekstensi `jpg`, `jpeg`, `png`, `pdf`; kompresi `gzip`; antivirus aktif; enkripsi nonaktif.
- Frontend punya ID config `NEXT_PUBLIC_APPWRITE_BUCKET_FRAUD_EVIDENCE` (default `fraud-evidence`) di `src/lib/appwrite/config.ts`, tanpa pemakaian.

---

> Data hasil fraud (`fraud_checks`, `campaign_submissions.fraudScore/fraudStatus`) dan brief (`campaign_briefs` → koleksi fisik `6ab530d00018edb50097` / `campaign_briefs_v2`) ada di modul Campaigns — lihat `../Campaigns/50_Database.md`.
