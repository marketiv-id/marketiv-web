# AI — API

Fungsi AI berjalan server-side. Modul AI tidak punya service layer sendiri; pemanggil `ai-brief` ada di modul Campaigns/UMKM.

## Service Layer (Client SDK)

Modul ini tidak memiliki service layer functions. Pemanggil `ai-brief`:

- **Frontend produksi**: `generateCampaignBrief()` (`src/services/umkm/umkm-dashboard.service.ts`) → `generateCampaignBriefFromAppwrite()` (`src/services/umkm/umkm-appwrite.service.ts`) via `executeFunction(FUNCTION_IDS.aiBrief)`. Mode mock (`NEXT_PUBLIC_USE_MOCK_DATA=true`) mengembalikan brief tetap setelah delay 1,4 dtk.
- **Service referensi backend**: `generateBrief()` di `00_BACKEND/src/services/campaign.service.ts` (lihat `../Campaigns/60_API.md`).

---

## Appwrite Functions (Server-side)

Aturan input/output & threshold di `30_Business_Rules.md`. Konfigurasi deploy di `70_Backend.md`.

---

### `ai-brief` — [Appwrite Function]

**Endpoint**: `POST /functions/ai-brief` (eksekusi sinkron, `execute: ["users"]`)

**Input**

```json
{
  "description": "string — wajib",
  "type": "ugc | clipping — wajib",
  "productName": "string — opsional",
  "targetMarket": "string — opsional",
  "goal": "string — opsional",
  "materials": "string[] — opsional",
  "campaignId": "string — opsional; bila ada & belum ada brief → Function menulis baris brief",
  "userId": "string — opsional; dipakai untuk log ai_requests (tidak diverifikasi)"
}
```

- Frontend produksi mengirim `description`, `type`, `productName` (default `Not specified`), `targetMarket` (default `General`), `goal` (default `Brand awareness`), `materials` — **tanpa** `campaignId` & `userId`.
- Service referensi backend mengirim `campaignId` (wajib di service) + `userId` dari `account.get()`.

**Return 200**

```json
{
  "success": true,
  "brief": {
    "objective": "string",
    "contentAngle": "string",
    "cta": "string",
    "briefDetail": "string",
    "doAndDont": { "do": ["string"], "dont": ["string"] }
  }
}
```

**Errors**

- `405` `{ success:false, error:"Method not allowed" }` — method bukan POST.
- `400` `{ success:false, error:"Missing required fields: description, type" }`.
- `400` `{ success:false, error:"Invalid type. Must be 'ugc' or 'clipping'" }`.
- `500` `{ success:false, error:"Failed to generate brief" }` — Vertex AI & OpenRouter sama-sama gagal, atau error tak terduga.
- Kegagalan tulis `ai_requests` / brief **tidak** mengubah respons (tetap 200).

**Permission**: semua user login (`execute: users`). Tidak ada guard role UMKM, rate limit, atau cek kepemilikan `campaignId` — **belum diimplementasikan**.

---

### `ai-fraud-precheck` — [Appwrite Function]

**Trigger**: event `databases.6a4c8598001da3b0d7f0.tables.campaign_submissions.rows.*.create` (`execute: []` → tidak dapat dipanggil langsung dari client). Lihat `../Campaigns/90_Events.md`.

**Input** (payload event = baris submission)

```json
{ "$id": "string" }
```

- Juga menerima `{ "submissionId": "string" }` (`body.$id || body.submissionId`) untuk eksekusi manual via server/console.

**Return 200**

```json
{ "success": true, "score": 0, "status": "safe | review | rejected" }
```

**Errors**

- `400` `{ success:false, error:"Missing submissionId" }`.
- `500` `{ success:false, error:<pesan> }` — env wajib hilang (`Missing required environment variables: …`), submission tidak ditemukan, atau update submission gagal.

**Efek**: update `fraudScore`/`fraudStatus` pada `campaign_submissions`, insert `fraud_checks` (best effort), insert `ai_requests` `feature:"fraud"` (best effort, hanya bila content analysis berjalan). Tidak mengubah `campaign_submissions.status`, tidak mengirim notifikasi.

---

### Chatbot Tivvy — [Next.js API Route]

Bukan Appwrite Function; dicatat di sini karena memanggil LLM eksternal.

**Endpoint**: `POST /api/chat` (`src/app/api/chat/route.ts`)

- **Input**: `{ messages: { role: "user"|"assistant", content: string }[], currentPath: string }`; header opsional `Authorization: Bearer <Appwrite JWT>` (frontend `ChatbotPanel` membuat JWT durasi 300 dtk hanya di path `/dashboard/*` dan bukan mode mock); riwayat dipotong 30 pesan terakhir.
- **Return 200**: `{ message: string, suggestions: string[] }` (maks. 3 saran pertanyaan).
- **Errors**: `400` riwayat/format pesan tidak valid (maks. 30 pesan, ≤ 4000 karakter per pesan, pesan terakhir harus `user`) · `401` JWT tidak valid atau path `/dashboard/*` tanpa sesi · `403` role selain `umkm`/`creator` di dashboard (mis. `admin`) · `500` semua provider gagal.
- Detail provider di `70_Backend.md`.

---

## Lihat Juga

- [30_Business_Rules.md](30_Business_Rules.md) — aturan validasi & threshold
- [Campaigns/90_Events.md](../Campaigns/90_Events.md) — event trigger flow
