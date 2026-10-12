# 03_Workflows — Index

Folder ini mendokumentasikan **kolaborasi lintas-modul** (end-to-end). Aturan internal satu modul tetap dimiliki dokumen modulnya — di sini hanya alur, urutan, event, data model terlibat, state transitions, validasi tiap langkah, dan titik serah-terima antar modul. Lihat modul terkait di [`../02_Modules/`](../02_Modules/).

> **Sinkron dengan kode per 2026-10-12.** Kode (`00_BACKEND/functions/*`, `00_BACKEND/appwrite.config.json`, `src/services/*`, `admin/src`) adalah sumber kebenaran; setiap workflow mencantumkan file sumbernya di baris pembuka. Langkah yang terdokumentasi tetapi belum ada di kode ditandai **belum diimplementasikan**.

## Prinsip Penulisan

- Setiap workflow mencakup: Purpose, Modules Involved, Trigger, Data Model, Step-by-step Flow, State Transitions, Events/Functions, Validation Rules per Langkah, Notifikasi, Edge Cases, Links.
- Sebut nama Function dan nilai status persis seperti di kode; sebut jenis pemicu (HTTP, event `tables.<t>.rows.*.<aksi>`, cron).
- Gunakan dokumen ini sebagai panduan implementasi: tiap langkah bisa langsung dipetakan ke kode.

## Daftar Workflow

| # | Dokumen | Deskripsi | Modul Terlibat |
|---|---|---|---|
| 10 | [Registration](10_Registration.md) | Register dua fase (Auth + `create-user-profile` sinkron), wallet via event, OTP email, T&C, onboarding & `isProfileCompleted`, reset password OTP. | Authentication, Users, Payments |
| 20 | [Campaign PPV](20_Campaign_PPV.md) | Draft → top-up Midtrans (fee buyer-side) → publish → claim → bukti tayang → precheck → validasi Admin → reward ke `wallet.balance`. | Campaigns, Payments, AI, Users, Notifications |
| 30 | [RateCard Order](30_RateCard_Order.md) | Chat → Custom Offer (opsional dari paket) → order → Midtrans → escrow → deliverable → validasi Admin + approve UMKM / auto-approve → release (fee seller-side). Direct Order belum diimplementasikan. | RateCards, Chat, Offers, Orders, Users, Payments, Notifications |
| 40 | [Submission Fraud](40_Submission_Fraud.md) | `ai-fraud-precheck` sebagai sinyal risiko terpisah dari keputusan final Admin (`review-submission`). | Campaigns, AI, Payments, Notifications |
| 50 | [Withdrawal](50_Withdrawal.md) | Reserve saldo atomik saat request, transfer manual Admin (`requested → processing → succeeded | reversed`). | Payments, Users, Notifications |
| 60 | [Dispute](60_Dispute.md) | Tidak ada fitur sengketa order di platform (WhatsApp Admin + refund manual); banding suspensi akun tersedia di backend tanpa UI. | Orders, Payments, Users, Notifications |

## Relasi Antar Workflow

```text
10_Registration ──→ users + profil + wallet + T&C
      │
      ├──→ 20_Campaign_PPV ──→ 40_Submission_Fraud (precheck + validasi Admin)
      │          │                     │
      │          │                     └──→ reward → wallets.balance (kreator)
      │          └──→ refund sisa budget (manual) → wallets.balance (UMKM)
      │
      └──→ 30_RateCard_Order ──→ escrow → release → wallets.balance (kreator)
                 │                     └──→ refund (manual) → wallets.balance (UMKM)
                 └──→ 60_Dispute (WhatsApp Admin)

wallets.balance ──→ 50_Withdrawal (reserve → transfer manual Admin)
```

## Lihat Juga

- [Modul Index](../02_Modules/00_Index.md) — daftar lengkap modul.
- [Domain Model](../02_Modules/10_Domain_Model.md) — ERD lintas modul.
- [Global Glossary](../01_Global/10_Glossary.md) — istilah umum.
- [Decisions](../04_Decisions/00_Index.md) — ADR terkait alur.
