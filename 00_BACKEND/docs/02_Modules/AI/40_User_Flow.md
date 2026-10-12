# AI — User Flow

## Brief Generator

```text
UMKM buka wizard Create/Edit Campaign
↓
Langkah 1: isi judul, tipe, deskripsi produk (≥ 30 karakter agar tombol AI aktif)
↓
Langkah Brief & Guideline: (opsional) pilih "Arahan Cepat"
↓
Klik "⚡ Susun Arahan dengan AI"
  (bila "Arahan Anda" sudah terisi → konfirmasi timpa)
↓
Frontend executeFunction("ai-brief") — sinkron
  body: description (+ arahan cepat), type, productName=judul,
        targetMarket=lokasi, goal=label CTA, materials=[URL aset eksternal]
↓
ai-brief → Vertex AI (Gemini) — gagal → OpenRouter
↓
Brief dikembalikan; log ai_requests (feature "brief")
↓
Wizard isi "Arahan Anda" (= briefDetail) & "Poin Wajib"
  (do → "- …", dont → "- Dilarang: …"); objective disimpan tersembunyi;
  badge "✨ Dibantu AI"
↓
UMKM edit (opsional)
↓
Simpan Draft → createCampaignDraft/updateCampaignDraft tulis campaign_briefs
  (generatedByAi = true bila AI dipakai) — modul Campaigns
```

- `contentAngle` & `cta` hasil AI **tidak** dipakai wizard (gaya video & CTA adalah pilihan enumerated user).
- Gagal: error `validation` → pesan dari server; lainnya → "Layanan AI sedang tidak tersedia. Coba lagi nanti."

## Fraud Precheck

```text
Creator kirim bukti (submit-campaign-proof)
↓
Baris campaign_submissions dibuat (status "pending")
↓
Event databases.<db>.tables.campaign_submissions.rows.*.create
↓
ai-fraud-precheck (async): cek URL, platform, aksesibilitas, duplikat,
  content analysis caption via Gemini
↓
Hasil: fraudScore + fraudStatus (safe/review/rejected)
↓
Update campaign_submissions.fraudScore/fraudStatus + tulis fraud_checks
↓
Submission TETAP "pending" — fraudStatus hanya label risiko;
keputusan approve/reject oleh reviewer (lihat ../../03_Workflows/40_Submission_Fraud.md)
```

- Hasil muncul beberapa detik setelah submit (asinkron); frontend tidak boleh mengasumsikan hasil langsung tersedia.
