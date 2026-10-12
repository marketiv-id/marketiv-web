# AI — Overview

Semua pemanggilan LLM berjalan **server-side**; kredensial provider tidak pernah ada di bundle frontend. Dua fitur berjalan sebagai **Appwrite Function**, satu (chatbot) sebagai **Next.js API route**.

## Fitur

1. **Brief Generator** (`ai-brief`) — menghasilkan *draft* brief campaign terstruktur dari input produk UMKM. Provider: **Vertex AI (Gemini)** primer, **OpenRouter** fallback. Hasil dikembalikan ke wizard Create Campaign; penyimpanan ke `campaign_briefs` (koleksi fisik `6ab530d00018edb50097` / `campaign_briefs_v2`) dilakukan wizard saat simpan draft (modul Campaigns).
2. **Fraud Precheck** (`ai-fraud-precheck`) — dipicu event pembuatan `campaign_submissions`; menjalankan cek rule-based (URL, platform, aksesibilitas, duplikat) + content analysis caption via **Gemini API** (`@google/generative-ai`, API key). Menghasilkan `fraudScore` (0–100) + `fraudStatus` (`safe|review|rejected`) sebagai **risk metadata** — tidak mengubah `campaign_submissions.status` (lihat ADR-010).
3. **Chatbot Tivvy** — asisten tanya-jawab Marketiv di `src/app/api/chat/route.ts` (Next.js). Provider: Vertex AI primer, OpenRouter fallback. Tidak melalui Appwrite Function dan **tidak** dicatat ke `ai_requests`.
4. **Landing Assistant** — **belum diimplementasikan**. Hanya tersisa nilai enum `landing` di `ai_requests.feature`; tidak ada Function yang menulisnya.

## Batas Tanggung Jawab

- Modul AI mendokumentasikan **kontrak fungsi AI** (input/output, provider, env) dan memiliki koleksi `ai_requests`.
- **Data hasil fraud** (`fraud_checks`, `fraudScore`, `fraudStatus`) hidup di `../Campaigns/50_Database.md` — ditautkan, bukan didefinisikan ulang.
- **Keputusan final submission** (`approved`/`rejected`) bukan wewenang modul AI — lihat `../../04_Decisions/ADR-010.md` dan `../../03_Workflows/40_Submission_Fraud.md`.
- Penyimpanan brief ke `campaign_briefs` adalah milik modul Campaigns (wizard → `createCampaignDraft`/`updateCampaignDraft`).

## Koleksi yang Dimiliki

`ai_requests`. Skema di `50_Database.md`.
