# Ruang Lingkup MVP

Status implementasi per fitur ada di [30_Roadmap.md](30_Roadmap.md#status-implementasi-terkini). Dokumen ini hanya mendefinisikan batas MVP.

## Termasuk dalam MVP

- Authentication (login, register UMKM/Creator, reset password via OTP email, Google OAuth di balik feature flag `NEXT_PUBLIC_ENABLE_GOOGLE_OAUTH`)
- Email Verification (native Appwrite Auth; disinkronkan ke `users.email_verified_at` oleh `user-email-verified`, dipakai sebagai gate withdrawal pertama)
- Persetujuan Syarat & Ketentuan (ToS) berversi + re-consent (`accept-tos`, kolom `users.tos_version`/`tos_accepted_at`)
- UMKM Profile
- Creator Profile
- Rate Card
- Campaign (Pay-Per-View)
- AI Brief Generator
- Offer System
- Chat dasar untuk negosiasi Offer — hanya pesan `text` dan kartu `offer`, dengan penanda baca (`messages.read_at`) dan arsip per peserta. **Tanpa attachment.**
- Order System (deliverable, revisi, tenggat review + auto-approve)
- Escrow
- Submission
- AI Fraud Detection (pre-check otomatis)
- Approval Workflow — submission campaign divalidasi **Admin** ([ADR-010](../04_Decisions/ADR-010.md)); deliverable rate card di-approve UMKM **dan** divalidasi Admin sebelum escrow dirilis
- Wallet
- Withdraw (diproses manual oleh Admin lewat transfer, bukan payout otomatis)
- Moderasi akun: suspend/terminate, unsuspend, banding (appeal) — dijalankan Admin
- KYC manual (dokumen via WhatsApp admin, status dicatat `verify-kyc`)
- Admin Panel (aplikasi terpisah di folder `admin/` root repo)
- Notification In-App (tabel `notifications`) + push notification untuk pesan chat
- Platform sosial media MVP: **TikTok saja** untuk creator social account, campaign PPV, submission, fraud check, dan creator discovery.

## Dikecualikan dari MVP

- Notifikasi email untuk event bisnis (email yang dikirim hanya email bawaan Appwrite Auth: OTP & verifikasi). *Belum diimplementasikan.*
- Payout withdrawal otomatis via Midtrans Iris (pernah dibuat, kini dipensiunkan: `withdrawal-callback` disabled).
- Creator Social Account Verification
- Chat Real-time tingkat lanjut, termasuk typing indicator, attachment/multi-file upload, voice note, moderation otomatis, dan fitur chat sosial lainnya.
- Affiliate System
- Referral
- Creator Agency
- Team Management
- Subscription
- AI Matching
- Marketplace Bidding
- Public Campaign Board
- Analytics Advanced
- View tracking otomatis (API/scrape). Kolom `views_source` sudah menyediakan nilai `api`/`scrape`, tetapi kode hanya menulis `manual_admin`.
- Dispute resolution sebagai fitur produk (UI/Function khusus). Saat ini refund dispute dijalankan manual oleh Admin lewat `refund-escrow`/`refund-order` (`execute: []`).
- Mobile App
- Platform sosial media selain TikTok, termasuk Instagram, Facebook, YouTube, X/Twitter, dan platform lain. Platform tersebut direncanakan untuk fase setelah MVP.
  > Catatan inkonsistensi: `functions/submit-campaign-proof/src/main.js` saat ini menerima `platform` `tiktok` **dan** `instagram`.
- **Analisis visual video** untuk fraud detection (logo detection, product matching, engagement anomaly). MVP content analysis hanya text-based (caption via Gemini API di `ai-fraud-precheck`). Analisis visual direncanakan untuk fase setelah MVP karena biaya token dan latency yang tinggi.

## Referensi

- Urutan implementasi, prioritas & status: [30_Roadmap.md](30_Roadmap.md)
- Visi & model bisnis: [10_Vision.md](10_Vision.md)
