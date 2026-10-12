# Roadmap Pengembangan

Tim 4 orang, target MVP siap soft launch dalam 6 sprint (12 minggu). Urutan implementasi mengikuti 10 fase pengembangan dari arsitektur. Rencana sprint di bawah adalah rencana awal (historis); status nyata ada di [Status Implementasi Terkini](#status-implementasi-terkini).

## 6 Sprint (12 Minggu)

- **Sprint 1 — Foundation & Authentication**: setup Appwrite, auth, role system (UMKM/Creator/Admin), wallet otomatis saat registrasi, upload avatar/media, landing + login/register/onboarding.
- **Sprint 2 — Creator Profile & Rate Card**: edit profil creator, TikTok social account, niche, portfolio, rate card; UMKM creator discovery (search + filter kota/range harga + sort by harga/rating/totalOrders).
- **Sprint 3 — Campaign Module (Core)**: create campaign TikTok-only + upload raw video, AI Brief Assistant, budget setup; creator browse/claim/submit; status campaign & submission.
- **Sprint 4 — Chat, Offer, Order & Escrow**: chat dasar untuk negosiasi offer, custom offer, accept offer, order creation, escrow, revision & delivery system; wallet deposit/withdraw/history.
- **Sprint 5 — AI Fraud & Analytics**: verifikasi URL submission, view tracking, deteksi pola mencurigakan, fraud score; analytics UMKM & creator.
- **Sprint 6 — Admin Panel & Production Ready**: user/campaign/order management, withdrawal approval, dispute resolution, fraud monitoring; notification, email, error logging, audit log, security review, optimasi performa.

## 10 Fase Implementasi (Urutan Coding)

1. Authentication
2. Creator Profile + Rate Card
3. Campaign (Viral / PPV)
4. Submission
5. Order + Escrow
6. Wallet
7. Notification
8. AI Brief Generator
9. Fraud Detection
10. Admin Dashboard

## Prioritas

- **P0 (Wajib saat soft launch)**: Authentication, Creator Profile dengan TikTok social account, Rate Card, Chat dasar untuk negosiasi Offer, Offer System, Order System, Campaign TikTok-only, Submission TikTok-only, Wallet, Escrow, Admin Panel, AI Brief Assistant, Basic Fraud Detection.
- **P1 (Setelah launch)**: ~~Email Verification~~ (sudah diimplementasikan, lihat status di bawah), Creator Social Account Verification, Recommendation AI, Smart Creator Matching, Advanced Analytics, Auto Moderation, Push Notification, Referral Program.
- **P2 (Growth stage)**: Mobile App, Creator Ranking, Affiliate System, Agency Dashboard, Regional Expansion, ekspansi platform sosial media selain TikTok (Instagram, Facebook, YouTube, dan lainnya).

## Status Implementasi Terkini

Diturunkan dari kode (`00_BACKEND/functions/`, `00_BACKEND/appwrite.config.json`, frontend `src/`, admin `admin/`). Katalog Function per modul: [`../02_Modules/00_Index.md`](../02_Modules/00_Index.md).

| Area | Status | Bukti di kode |
| --- | --- | --- |
| Authentication (login/register, role) | Terimplementasi | `create-user-profile`, `src/services/auth/` |
| Reset password via OTP | Terimplementasi | `request-password-otp`, `reset-password-with-otp`, tabel `otp_rate_limits` |
| Google OAuth | Terimplementasi, default **mati** | flag `NEXT_PUBLIC_ENABLE_GOOGLE_OAUTH`; `appwrite/ops/configure-google-oauth.mjs` |
| Email verification | Terimplementasi | `user-email-verified` (event `users.*.update`) → `users.email_verified_at` |
| ToS berversi + re-consent | Terimplementasi | `accept-tos`, kolom `users.tos_version` |
| Profil UMKM/Creator, discovery | Terimplementasi | `update-profile`, `get-umkm-profile`, `get-creator-profile`, `get-creator-directory` |
| Rate Card | Terimplementasi (tulis langsung dari klien) | tabel `rate_cards`, `rate_card_packages` |
| Campaign PPV (draft, bayar, aktif, claim, submit) | Terimplementasi | `patch-campaign-draft`, `patch-campaign-status`, `campaign-published`, `campaign-claimed`, `unclaim-campaign`, `expire-stale-claims`, `submit-campaign-proof` |
| Validasi submission | Terimplementasi oleh **Admin** | `review-submission`, `get-admin-submission-queue` |
| View tracking otomatis | **Belum diimplementasikan** | views diisi Admin (`views_source = manual_admin`) |
| Chat, Offer, Order | Terimplementasi | `create-conversation`, `send-message`, `create-offer`, `create-order`, `cancel-order` |
| Deliverable, revisi, auto-approve | Terimplementasi | `submit-ratecard-deliverable`, `request-ratecard-revision`, `track-order-review`, `auto-approve-orders` (cron per jam) |
| Validasi deliverable rate card oleh Admin | Terimplementasi | `review-ratecard-deliverable`, tabel `ratecard_deliverable_validations` |
| Payment & Escrow | Terimplementasi (Midtrans Snap) | `create-payment`, `cancel-payment`, `midtrans-webhook`, `create-escrow`, `release-escrow`, `reconcile-release-escrow` (cron 15 menit) |
| Refund | Terimplementasi (manual/Admin + event order) | `refund-escrow`, `refund-order` |
| Wallet & Withdraw | Terimplementasi, transfer **manual Admin** | `request-withdrawal`, `review-withdrawal`, `get-admin-withdrawal-queue` |
| Payout otomatis Iris | Dipensiunkan | `withdrawal-callback` (`enabled: false`) |
| Pematangan `pendingBalance` | Dipensiunkan | `mature-pending-balance` (`enabled: false`); reward kini langsung ke `balance` |
| KYC manual | Terimplementasi (internal) | `verify-kyc` (`execute: []`) |
| Moderasi akun & banding | Terimplementasi (internal + user appeal) | `suspend-user`, `unsuspend-user`, `create-appeal`, `review-appeal` |
| Notifikasi in-app | Terimplementasi | tabel `notifications`, `mark-notifications-read`, `notify-order-activity` |
| Push notification | Hanya untuk pesan chat | `send-chat-notification` (`messaging.createPush`) |
| Notifikasi email bisnis | **Belum diimplementasikan** | — |
| AI Brief Generator | Terimplementasi | `ai-brief` (Vertex AI, fallback OpenRouter) |
| AI Fraud Detection | Terimplementasi (heuristik + analisis caption Gemini) | `ai-fraud-precheck` |
| Landing Assistant (chatbot) | Terimplementasi di Next.js, **bukan** Appwrite Function | `src/app/api/chat/route.ts` |
| Monitor ambang fee | Terimplementasi (cron harian, hanya notifikasi) | `fee-rate-flip` |
| Admin Panel | Terimplementasi sebagian (dashboard, submission, validasi rate card, withdrawal) | app `admin/`, `get-admin-*` |
| Dispute resolution (fitur produk) | **Belum diimplementasikan** | refund manual via `refund-escrow`/`refund-order` |
| Error logging frontend | Terimplementasi | Sentry (`@sentry/nextjs`, `sentry.*.config.ts` di root repo) |
| Audit log | **Belum diimplementasikan** | — |
| Mobile App, Referral, Affiliate, Agency | **Belum diimplementasikan** | — |

## Referensi

- Daftar fitur in/out: [20_Scope.md](20_Scope.md)
- Teknologi pendukung: [40_Tech_Stack.md](40_Tech_Stack.md)
