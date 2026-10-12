# AI — Business Rules

## Brief Generator (`ai-brief`)

**Input** (body JSON, lihat `60_API.md`):

- `description` (wajib) — deskripsi produk.
- `type` (wajib) — `ugc` atau `clipping`.
- `productName`, `targetMarket`, `goal` (opsional) — default di prompt: `Not specified`, `General`, `Brand awareness`.
- `materials` (opsional, `string[]`) — daftar/link aset referensi; kosong → `No specific materials provided.`.
- `campaignId` (opsional) — bila ada, Function ikut menulis baris brief (lihat Aturan 6).

**Output terstruktur**:

- `objective`: string
- `contentAngle`: string
- `cta`: string
- `briefDetail`: string (arah kreatif, visual, pesan kunci, arahan penggunaan aset)
- `doAndDont`: `{ do: string[], dont: string[] }`

**Aturan**:

1. Request selain `POST` → 405. `description`/`type` kosong atau `type` ∉ {`ugc`,`clipping`} → 400.
2. **Instruksi per tipe** (disisipkan ke prompt, aset digital, tanpa sampel fisik):
   - `ugc`: buat video TikTok orisinal dari nol memakai aset foto/video produk; saran pendekatan Green Screen, Voiceover, atau Slideshow Montage.
   - `clipping`: potong/edit ulang video panjang dari link sumber; wajib *dynamic subtitle* dan *hook* kuat di 3 detik pertama.
3. Prompt (bahasa Inggris) mewajibkan **semua nilai output dalam Bahasa Indonesia** dan JSON mentah tanpa markdown.
4. Respons model dibersihkan (blok `<think>`, prefiks "Thinking Process/Reasoning/Analysis", code fence ```` ```json ````) lalu di-`JSON.parse`. Bila parse gagal → seluruh teks masuk `briefDetail`, field lain string kosong, `doAndDont` `{do:[],dont:[]}`.
5. Field yang hilang dari output model dinormalisasi ke `""` / `{do:[],dont:[]}` di respons.
6. Bila `campaignId` dikirim **dan** belum ada baris brief untuk campaign itu, Function membuat baris di koleksi brief (`CAMPAIGN_BRIEFS_COLLECTION_ID`, default `6ab530d00018edb50097`) dengan `generatedByAi: true` dan `doAndDont` di-`JSON.stringify`. Baris yang sudah ada **tidak** ditimpa. Tidak ada clamp panjang kolom; kegagalan tulis hanya di-log dan respons tetap `success: true`.
7. Frontend produksi **tidak** mengirim `campaignId` (campaign belum ada saat langkah brief), jadi Aturan 6 praktis tidak terpakai; brief disimpan wizard lewat `createCampaignDraft`/`updateCampaignDraft` (modul Campaigns) dengan `generatedByAi` sesuai pemakaian AI.
8. AI hanya menghasilkan *draft*. UMKM dapat mengedit sebelum menyimpan.
9. Setiap generate sukses dicatat ke `ai_requests` (`feature: "brief"`) — best effort, lihat `50_Database.md`.
10. **Belum diimplementasikan**: guard role (semua user login dengan `execute: users` dapat memanggil, termasuk creator), rate limit/kuota per user, verifikasi kepemilikan `campaignId`.

---

## Fraud Precheck (`ai-fraud-precheck`)

**Validasi yang dijalankan** terhadap submission (diambil via `getDocument` dari `campaign_submissions`):

| # | Validasi | Kondisi gagal | Bobot |
|---|---|---|---|
| 1 | URL valid | `new URL(postUrl)` gagal atau protokol bukan `http:`/`https:` | +30 |
| 2 | Platform match | hostname tidak cocok pola platform (`tiktok` → `tiktok.com`, `instagram` → `instagram.com`, `youtube` → `youtube.com`/`youtu.be`; platform lain selalu tidak cocok). Hanya bila URL valid | +20 |
| 3 | URL accessibility | `fetch` GET (follow redirect) mengembalikan status non-2xx atau error jaringan. Hanya bila URL valid | +25 |
| 4 | Deduplikasi | ada submission lain (lintas campaign) dengan `postUrl` persis sama | +25 |
| 5 | Content analysis (teks) | `floor(overallScore × 20 / 100)` dari Gemini | 0–20 |
| — | Content analysis visual | **belum diimplementasikan** (future scope) | — |
| — | Cek "tidak private" | **belum diimplementasikan** (tidak ada pemeriksaan eksplisit; hanya tercakup bila URL mengembalikan non-2xx) | — |

`fraudScore = min(100, Σ bobot)`.

> Catatan: `submit-campaign-proof` sudah menolak URL tidak valid dan domain yang tidak cocok (hanya `tiktok`/`instagram`) **sebelum** baris dibuat, sehingga untuk submission lewat jalur resmi cek #1–#2 hampir selalu lolos.

### Content Analysis — Input & Output Gemini

- Dijalankan hanya bila `GEMINI_API_KEY` terkonfigurasi **dan** `caption` tidak kosong. Bila dilewati, alasan dicatat: `Content analysis dilewati (caption kosong)` atau `... (GEMINI_API_KEY tidak dikonfigurasi)`.
- Model: `gemini-2.5-flash` (hard-coded, SDK `@google/generative-ai`, tanpa `generationConfig`).
- Brief dibaca dari koleksi brief (`CAMPAIGN_BRIEFS_COLLECTION_ID`, default `6ab530d00018edb50097`) berdasarkan `campaignId`; tidak ada brief → teks `Tidak ada brief kampanye.`.
- Hashtag diekstrak dari caption dengan regex `#[\w]+`.

**Isi prompt** (bahasa Indonesia): caption, `hashtags` (array), dan brief `{ objective, contentAngle, cta, briefDetail, doAndDont }`.

**Output yang diminta dari Gemini** (JSON):

```json
{
  "captionRelevance": "number 0–100",
  "hashtagRelevance": "number 0–100",
  "fraudSignal": "string | null — indikasi fraud tekstual, null jika aman",
  "overallScore": "number 0–100 — semakin tinggi = semakin TIDAK sesuai brief",
  "reason": "string — penjelasan singkat"
}
```

**Aturan**:

- Hanya `overallScore`, `fraudSignal`, dan `reason` yang dipakai kode. `captionRelevance`/`hashtagRelevance` hanya tersimpan di log `ai_requests.response`.
- Bobot internal `overallScore` (mis. caption 60% / hashtag 20% / fraud signal 20%) **tidak** ditegakkan kode — sepenuhnya ditentukan model.
- Output Gemini gagal di-parse → fallback `overallScore: 50` (kontribusi risiko +10), `reason: "Gagal mem-parsing analisis"`.
- Panggilan Gemini error → kontribusi risiko 0, error hanya di-log.
- Hasil dicatat ke `ai_requests` dengan `feature: "fraud"` (`prompt` = caption, `response` = JSON analisis).
- `reason` fraud check: alasan digabung `; `; tanpa temuan → `Lolos semua validasi`. Contoh: `URL duplikat dengan submission lain`, `Indikasi fraud: <fraudSignal>`, `Content analysis: <reason> (<n>/20)`.

### Threshold

| Skor   | Risiko | `fraudStatus` | Efek di kode saat ini |
| ------ | ------ | ------------- | --------------------- |
| 0–30   | Low    | `safe`        | Hanya label; submission tetap `pending` |
| 31–70  | Medium | `review`      | Hanya label; submission tetap `pending` |
| 71–100 | High   | `rejected`    | Hanya label; submission tetap `pending` |

- Auto-approve / auto-reject berdasarkan `fraudStatus` **tidak diimplementasikan**. `ai-fraud-precheck` hanya menulis `fraudScore` & `fraudStatus`; keputusan `approved`/`rejected` tetap melalui reviewer (`review-submission`, ADR-010). `review-submission` juga tidak membaca `fraudStatus`.
- Field hasil (`score`, `result`, `reason`) disimpan di `fraud_checks`; ringkasan (`fraudScore`, `fraudStatus`) di `campaign_submissions` — skema di `../Campaigns/50_Database.md`.
