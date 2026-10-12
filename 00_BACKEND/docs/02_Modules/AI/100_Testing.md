# AI — Testing

Catatan: Modul AI tidak punya service layer sendiri. Logic berjalan di Appwrite Functions (`ai-brief`, `ai-fraud-precheck`) dan Next.js route `/api/chat`. Cakupan otomatis saat ini:

- `00_BACKEND/tests/unit/campaign.service.test.ts` — validasi `generateBrief()` (service referensi backend).
- `00_BACKEND/tests/integration/services.test.ts` — `generateBrief()` memanggil `ai-brief` dan mengembalikan brief.
- `00_BACKEND/tests/integration/functions.test.ts` (`describe('ai-brief function')`) — client Appwrite memakai `x-appwrite-key`, bukan `APPWRITE_FUNCTION_API_KEY`.
- `src/services/chatbot/__tests__/chatbot-guardrails.test.ts`, `chatbot-ui.test.ts` — guardrail chatbot.
- `ai-fraud-precheck`: **belum ada test otomatis**; `tests/e2e/critical-flows.spec.ts` "Critical Flow: Fraud" masih placeholder (`expect(true)`).

## Brief Generator (`ai-brief` Function)

- Body valid (`description`, `type`) → 200 `{ success:true, brief }` dengan `objective`, `contentAngle`, `cta`, `briefDetail`, `doAndDont { do, dont }`.
- Method bukan POST → 405.
- `description` atau `type` kosong → 400 `Missing required fields: description, type`.
- `type` ∉ {`ugc`,`clipping`} → 400 `Invalid type...`.
- Kredensial Vertex AI kosong/error → fallback OpenRouter; keduanya gagal → 500 `Failed to generate brief`.
- Output model bukan JSON → 200, seluruh teks di `briefDetail`.
- Baris `ai_requests` `feature:"brief"` tercipta; gagal tulis tidak mengubah respons.
- Dengan `campaignId` tanpa brief existing → baris brief baru `generatedByAi:true`; dengan brief existing → tidak ditimpa.
- `doAndDont` hasil AI > 400 karakter + `campaignId` → tulis brief gagal senyap (respons tetap 200) — perilaku saat ini, perlu diwaspadai.
- Respons dalam timeout Function (30 dtk), termasuk jalur fallback.

## Brief Generator — service

- Frontend `generateCampaignBriefFromAppwrite()`: user belum login → gagal `requireUserId`; `success:false` dari Function → `fail(error, "server")`; mode mock → brief tetap.
- Backend `generateBrief()`: `campaignId` kosong → `CampaignServiceError('validation', 'Campaign ID wajib diisi.')`; `description` kosong → `'Deskripsi wajib diisi.'`; `type` invalid → `'Tipe campaign tidak valid.'`; `execution.status === 'failed'` → `'Gagal menghasilkan brief via AI.'`; body kosong → `'Response AI kosong.'`; JSON invalid → `'Response AI tidak valid.'`; `success === false` → `result.error`.

## Fraud Precheck (`ai-fraud-precheck` Function)

Dipicu otomatis oleh event create `campaign_submissions` (bukan dipanggil frontend).

- URL TikTok valid, dapat diakses, unik, caption sesuai brief → skor 0–30, `safe`.
- URL duplikat (sama dengan submission lain, lintas campaign) → +25 dan alasan `URL duplikat dengan submission lain`; tanpa temuan lain → tetap `safe` (25).
- URL tidak dapat diakses (non-2xx) + duplikat → 50, `review`.
- URL tidak valid → +30 (cek platform & aksesibilitas dilewati).
- Platform tidak cocok → +20.
- Skor > 100 dipotong ke 100; > 70 → `rejected`.
- Caption kosong → alasan `Content analysis dilewati (caption kosong)`, tanpa panggilan Gemini.
- `GEMINI_API_KEY` kosong → alasan `... (GEMINI_API_KEY tidak dikonfigurasi)`.
- Output Gemini tidak dapat di-parse → kontribusi +10 (`overallScore` 50).
- `fraudScore` & `fraudStatus` ditulis ke `campaign_submissions`, riwayat ke `fraud_checks`; `status` submission tetap `pending`.
- Body tanpa `$id`/`submissionId` → 400; env wajib hilang → 500.
