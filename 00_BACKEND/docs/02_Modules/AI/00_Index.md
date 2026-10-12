# Modul AI

Fitur AI Marketiv: **Brief Generator** (`ai-brief`, Vertex AI Gemini + fallback OpenRouter) & **Fraud Precheck** (`ai-fraud-precheck`, cek rule-based + content analysis Gemini API), keduanya Appwrite Function. Ditambah **chatbot Tivvy** yang berjalan di Next.js API route (`src/app/api/chat/route.ts`), bukan Appwrite Function. Modul ini mendokumentasikan kontrak fungsi AI dan memiliki koleksi `ai_requests`. Data hasil fraud disimpan di modul Campaigns (`fraud_checks`, `campaign_submissions.fraudScore/fraudStatus`) — ditautkan, tidak didefinisikan ulang.

> Sumber kebenaran: kode di `00_BACKEND/functions/ai-brief/`, `00_BACKEND/functions/ai-fraud-precheck/`, `00_BACKEND/appwrite.config.json` (bukan `appwrite.json`, yang stale), dan `src/app/api/chat/route.ts`.

## Daftar Dokumen

- `10_Overview.md` — Fitur AI yang ada (Brief, Fraud Precheck, chatbot Tivvy), provider, batas tanggung jawab.
- `20_Concepts.md` — Istilah & konsep domain AI.
- `30_Business_Rules.md` — Input/output Brief, validasi, bobot & threshold Fraud Precheck.
- `40_User_Flow.md` — Alur Brief Generator & Fraud Precheck.
- `50_Database.md` — Skema koleksi `ai_requests` (+ bucket `fraud-evidence`).
- `60_API.md` — Kontrak endpoint AI Function.
- `70_Backend.md` — Konfigurasi Function, provider LLM, env var, persistensi.
- `80_Frontend.md` — UI Brief Generator, tampilan fraud, chatbot Tivvy.
- `90_Events.md` — Event yang dikonsumsi AI (dari Campaigns).
- `100_Testing.md` — Skenario uji Brief Generator & Fraud Precheck.
