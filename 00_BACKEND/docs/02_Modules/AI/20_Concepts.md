# AI — Concepts

## Istilah

- **Brief Generator** — fitur AI (`ai-brief`) yang menghasilkan *draft* brief campaign terstruktur (`objective`, `contentAngle`, `cta`, `briefDetail`, `doAndDont`) dari input produk UMKM.
- **Fraud Precheck** — fitur (`ai-fraud-precheck`) yang menilai risiko submission creator: cek rule-based (URL, platform, aksesibilitas, duplikat) + content analysis teks. Hasilnya *risk signal*, bukan keputusan final.
- **Content Analysis (text-based)** — analisis caption & hashtag (diekstrak dari caption) terhadap brief campaign via Gemini API, tanpa memproses video.
- **Content Analysis (visual)** — [Future Scope] analisis video (logo detection, product matching, engagement anomaly). **Belum diimplementasikan** karena biaya token & latency.
- **fraudScore** — integer 0–100 (jumlah bobot risiko, dibatasi maks. 100). Disimpan di `campaign_submissions.fraudScore` & `fraud_checks.score`.
- **fraudStatus** — `safe` (≤30) · `review` (31–70) · `rejected` (>70). Disimpan di `campaign_submissions.fraudStatus` & `fraud_checks.result`. Terpisah dari `campaign_submissions.status`.
- **Provider primer / fallback** — `ai-brief` & chatbot mencoba Vertex AI dulu; bila gagal (kredensial kosong, error, respons kosong) beralih ke OpenRouter.
- **Chatbot Tivvy** — asisten chat Marketiv di Next.js API route `/api/chat`; audience `landing`, `umkm`, atau `creator`.
- **Landing Assistant** — fitur opsional yang direncanakan (enum `ai_requests.feature = landing`); **belum diimplementasikan**.
- **ai_requests** — log permintaan AI dari Appwrite Function (`brief`, `fraud`). Chatbot Tivvy tidak dicatat.

## Konsep

- Pemanggilan LLM selalu server-side (Appwrite Function atau Next.js route handler); kredensial Vertex AI / OpenRouter / Gemini hanya di environment server.
- Output AI selalu diperlakukan sebagai draft/advisory: brief dapat diedit UMKM sebelum disimpan; `fraudStatus` hanya membantu reviewer, tidak mengubah status submission atau memicu reward.
- Hasil fraud disimpan di modul Campaigns (`fraud_checks`, ringkasan di `campaign_submissions`), relasi Submission 1 → N Fraud Checks (ADR-004).
