# 04_Decisions — Index

Folder ini berisi Architecture Decision Records (ADR) yang menjelaskan **WHY** di balik keputusan arsitektur Marketiv. Setiap ADR berformat: Status, Context, Decision, Consequences.

> **Diverifikasi terhadap kode 2026-10-12.** Teks keputusan asli dipertahankan sebagai histori; deviasi implementasi dicatat sebagai "Catatan verifikasi/implementasi (2026-10-12)" di Status dan Consequences tiap ADR.

## Daftar ADR

| ADR | Keputusan | Status per 2026-10-12 |
|---|---|---|
| [ADR-001](ADR-001.md) | Pakai Appwrite BaaS, bukan backend custom. | Berlaku. Catatan: TablesDB via REST mentah untuk atomik/transaksi; chatbot AI di Next.js API route. |
| [ADR-002](ADR-002.md) | Service layer wajib (Route/Component → Service → SDK). | Berlaku. Runtime di root `src/services/`; `00_BACKEND/src/services` hanya referensi; satu pelanggaran (`ChatbotPanel.tsx`). |
| [ADR-003](ADR-003.md) | `orders` sebagai aggregate utama Rate Card. | Berlaku. Order hanya dari offer `accepted`; Direct Order belum ada. |
| [ADR-004](ADR-004.md) | Pisahkan `fraud_checks` dari `campaign_submissions`. | Berlaku. Phase 2 belum ada; data belum tampil di antrean Admin. |
| [ADR-005](ADR-005.md) | Counter denormalisasi di `campaigns`. | Berlaku, dijaga increment/decrement atomik di Function. |
| [ADR-006](ADR-006.md) | Zustand, bukan Redux. | **Tidak diterapkan** — kode memakai React Context; perlu diputuskan ulang. |
| [ADR-007](ADR-007.md) | Minimum withdraw Rp50.000 sebagai konstanta. | **Diubah sebagian** — server membaca env `MINIMUM_WITHDRAW` (default 50.000). |
| [ADR-008](ADR-008.md) | Platform fee 2% per-modul (Rate Card seller-side, Campaign buyer-side). | Model berlaku; **butir konstanta diganti** env `FEE_RATE` + snapshot `escrows.fee_rate` + cron `fee-rate-flip`. |
| [ADR-009](ADR-009.md) | Minimum budget campaign Rp50.000. | Berlaku; server hanya menegakkan saat edit draft. |
| [ADR-010](ADR-010.md) | Validasi submission Campaign oleh Admin Marketiv. | **Diimplementasikan**; audit log & sinyal fraud di antrean belum. |
