# AI — Backend

Detail implementasi Appwrite Functions AI dan integrasi LLM. Kontrak request/response di [60_API.md](60_API.md); aturan di [30_Business_Rules.md](30_Business_Rules.md).

## Appwrite Functions

Konfigurasi dari `00_BACKEND/appwrite.config.json` (kanonik) & `appwrite/generate_appwrite_json.cjs`; scope juga di `appwrite/function-scopes.json`.

| Function | Runtime | Trigger | `execute` | Timeout | Scopes |
|---|---|---|---|---|---|
| `ai-brief` | `node-22` | HTTP (sinkron dari client) | `["users"]` | 30 dtk | `documents.read`, `documents.write` |
| `ai-fraud-precheck` | `node-22` | event `databases.6a4c8598001da3b0d7f0.tables.campaign_submissions.rows.*.create` | `[]` | 60 dtk | `documents.read`, `documents.write` |

Keduanya: entrypoint `src/main.js`, build `npm install`, logging aktif. Client Appwrite memakai API key dinamis dari header `x-appwrite-key` (fallback `APPWRITE_API_KEY`), endpoint `APPWRITE_FUNCTION_API_ENDPOINT` (fallback `APPWRITE_ENDPOINT`), project `APPWRITE_FUNCTION_PROJECT_ID` (fallback `APPWRITE_PROJECT_ID`).

### 1. `ai-brief` (Brief Generator)

- **Paket**: `@google-cloud/vertexai` `^1.1.0`, `node-appwrite` `^14.1.0`; OpenRouter via `fetch`.
- **Proses**: validasi body → susun prompt (instruksi tipe `ugc`/`clipping`, daftar `materials`) → **Vertex AI** → bila gagal **OpenRouter** → bersihkan & parse JSON → log `ai_requests` → (bila `campaignId`) tulis brief → kembalikan brief. Function **tidak** membaca data campaign/aset dari database; semua konteks dari body.
- **Provider primer — Vertex AI**: kredensial service account (`VERTEX_AI_PROJECT_ID`, `VERTEX_AI_CLIENT_EMAIL`, `VERTEX_AI_PRIVATE_KEY` dengan `\n` di-unescape). Default `VERTEX_AI_LOCATION=us-central1`, `VERTEX_AI_MODEL=gemini-2.5-flash`. `generationConfig`: `temperature 0.7`, `maxOutputTokens 2048`, `responseMimeType application/json`.
- **Provider fallback — OpenRouter**: `https://openrouter.ai/api/v1/chat/completions`, `OPENROUTER_API_KEY`, default `OPENROUTER_MODEL=qwen/qwen3.5-35b-a3b`; `temperature 0.7`, `max_tokens 2048`, `response_format json_object`, `reasoning.effort none`.
- **Structured output**: JSON mode provider + instruksi prompt (bukan JSON schema).
- **Persistensi** (satu blok `try`, error hanya di-log):
  1. `ai_requests` — `{ userId, feature:"brief", prompt, response }`, tanpa row permission.
  2. Bila `campaignId`: `listDocuments` koleksi brief (`CAMPAIGN_BRIEFS_COLLECTION_ID`, default `6ab530d00018edb50097`); bila kosong → `createDocument` `{ campaignId, objective, contentAngle, cta, briefDetail, doAndDont: JSON.stringify(...), generatedByAi: true }`, tanpa row permission, tanpa `materialsJson`, tanpa clamp panjang kolom.
- **Database ID**: `NEXT_PUBLIC_DB_ID` → `APPWRITE_DATABASE_ID` (commit `9ced47d`).
- **Identitas**: `userId` dari `APPWRITE_FUNCTION_USER_ID` → `body.userId`; header `x-appwrite-user-id` **tidak** dibaca.

### 2. `ai-fraud-precheck` (Fraud Precheck)

- **Paket**: `@google/generative-ai` `^0.21.0`, `node-appwrite` `^14.1.0`.
- **Proses**: `getDocument` submission → cek URL/platform/aksesibilitas (`fetch` GET, tanpa timeout eksplisit)/duplikat (`Query.equal("postUrl")`, `Query.notEqual("$id")`) → content analysis Gemini (bila `GEMINI_API_KEY` & caption ada; brief dibaca dari koleksi brief) → `fraudScore = min(100, risk)` → `updateDocument` submission `{ fraudScore, fraudStatus }` → `createDocument` `fraud_checks` `{ submissionId, score, result, reason }` (tanpa `createdAt`, tanpa row permission).
- **Model**: `gemini-2.5-flash` hard-coded via Gemini API (API key), bukan Vertex AI.
- **Env wajib** (dicek `getEnv`, hilang → 500): endpoint, project ID, API key, `databaseId` (`APPWRITE_DATABASE_ID` → `NEXT_PUBLIC_DB_ID`). ID koleksi punya default: `SUBMISSIONS_COLLECTION_ID`/`NEXT_PUBLIC_SUBMISSION_COLLECTION` → `campaign_submissions`; `FRAUD_CHECKS_COLLECTION_ID`/`NEXT_PUBLIC_FRAUD_CHECK_COLLECTION` → `fraud_checks`; `CAMPAIGNS_COLLECTION_ID`/`NEXT_PUBLIC_CAMPAIGN_COLLECTION` → `campaigns` (tidak dipakai); `CAMPAIGN_BRIEFS_COLLECTION_ID` → `6ab530d00018edb50097`; `AI_REQUESTS_COLLECTION_ID` → `ai_requests`.
- **Output**: `{ success, score, status }`. Tidak menulis notifikasi, tidak mengubah `status` submission.
- **Catatan**: content analysis hanya teks (caption + hashtag). Analisis visual = future scope.

## Environment Variables

| Variabel | `ai-brief` | `ai-fraud-precheck` | Catatan |
|---|---|---|---|
| `VERTEX_AI_PROJECT_ID`, `VERTEX_AI_CLIENT_EMAIL`, `VERTEX_AI_PRIVATE_KEY` | ✓ | — | Secret; wajib untuk provider primer |
| `VERTEX_AI_LOCATION`, `VERTEX_AI_MODEL` | ✓ | — | Default `us-central1`, `gemini-2.5-flash` |
| `OPENROUTER_API_KEY`, `OPENROUTER_MODEL` | ✓ | — | Secret; fallback, default model `qwen/qwen3.5-35b-a3b` |
| `GEMINI_API_KEY` | — | ✓ | Secret; kosong → content analysis dilewati |
| `NEXT_PUBLIC_DB_ID` / `APPWRITE_DATABASE_ID` | ✓ | ✓ | Urutan prioritas berbeda antar Function |
| `CAMPAIGN_BRIEFS_COLLECTION_ID` | ✓ | ✓ | Default `6ab530d00018edb50097` (migrasi v2, commit `46d51d5`) |

Daftar lengkap ada di `functions/<id>/.env.example`.

## Integrasi Eksternal

- **Google Vertex AI (Gemini)** — `ai-brief` (primer) & chatbot Tivvy (primer). Auth service account.
- **OpenRouter** — `ai-brief` (fallback) & chatbot Tivvy (fallback). Auth API key.
- **Google Gemini API** — `ai-fraud-precheck` (content analysis). Auth API key.
- **URL publik platform** — `ai-fraud-precheck` melakukan `fetch` GET ke `postUrl` untuk cek aksesibilitas.

Semua kredensial disimpan sebagai environment variable server (Function variables / env server Next.js), tidak pernah ber-prefiks `NEXT_PUBLIC_`.

## Chatbot Tivvy (Next.js, di luar Appwrite)

- **Lokasi**: `src/app/api/chat/route.ts`, guardrail `src/services/chatbot/chatbot-guardrails.ts`, auth `src/services/chatbot/chatbot-auth.ts`, knowledge `src/data/chatbotKnowledge.ts` & `chatbotPageKnowledge`.
- **Provider**: Vertex AI primer (`@google-cloud/vertexai`, default `VERTEX_AI_MODEL=gemini-1.5-flash` — beda dengan default `ai-brief`), OpenRouter fallback (default `OPENROUTER_MODEL=qwen/qwen3-30b-a3b:free`, header `HTTP-Referer: https://marketiv.id`, `X-Title: Marketiv Chatbot`). Env dari root `.env.example`.
- **Generation**: `temperature 0.4`, `maxOutputTokens 1024`; bila `finishReason` `MAX_TOKENS`/`length` → satu kali permintaan lanjutan.
- **Audience & auth**: JWT Appwrite (Bearer) → `account.get()` → role dari koleksi `users`. Role `umkm`/`creator` → audience sesuai role; tanpa role di path non-dashboard → `landing`; path `/dashboard/*` tanpa sesi → 401; role lain (mis. `admin`) di dashboard → 403. Mode mock menebak role dari path.
- **System prompt**: dibangun dari knowledge Marketiv + halaman aktif + kebijakan audience + aturan keamanan (anti prompt-injection, tanpa markdown).
- **Belum diimplementasikan**: log ke `ai_requests`, rate limit/kuota (endpoint audience `landing` dapat dipanggil tanpa login).
