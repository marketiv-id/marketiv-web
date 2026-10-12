# AI — Events

## Event yang Dikonsumsi

| Event (Appwrite TablesDB) | Sumber | Function | Aksi |
| --- | --- | --- | --- |
| `databases.6a4c8598001da3b0d7f0.tables.campaign_submissions.rows.*.create` | Campaigns (`submit-campaign-proof`) | `ai-fraud-precheck` | Hitung `fraudScore`/`fraudStatus`, tulis `fraud_checks` |

- Hanya event **create**; update submission tidak memicu pemeriksaan ulang.
- `ai-brief` dan chatbot Tivvy tidak berbasis event (dipanggil langsung).

## Event yang Diterbitkan

- Modul AI tidak menerbitkan event domain dan tidak mengirim notifikasi.
- Efek samping: update `campaign_submissions` (`fraudScore`, `fraudStatus`) memicu event `...campaign_submissions.rows.*.update`, yang didengar `calculate-campaign-reward`; Function itu keluar tanpa aksi karena `status` masih bukan `approved`.

## Lihat Juga

- Event pemicu fraud precheck → `../Campaigns/90_Events.md`.
- Alur lintas modul → `../../03_Workflows/40_Submission_Fraud.md`.
