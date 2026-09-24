# Graph Report - 00_BACKEND  (2026-08-12)

## Corpus Check
- 484 files · ~339,414 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 4922 nodes · 5245 edges · 415 communities (388 shown, 27 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 23 edges (avg confidence: 0.5)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `9dab36e2`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- 00_Index.md
- AGENTS.md
- Users — Database
- README.md
- Campaign Service
- 30_RateCard_Order.md
- 20_Campaign_PPV.md
- 40_Folder_Structure
- 00_Index.md
- generate_appwrite_json.js
- 00_Index.md
- 00_Index.md
- 90_Design_System
- Campaigns — Frontend
- Tech Stack
- Halaman
- Orders — Frontend
- Rate Cards — Frontend
- 40_Tech_Stack.md
- 00_Index.md
- Authentication — Business Rules
- Authentication — API (Auth Service)
- Campaigns — Business Rules
- Community 23
- Community 24
- Notification Service
- Appwrite Functions
- Halaman
- Halaman
- Workflow: Registration & Onboarding
- Workflow: Campaign Pay-Per-View (PPV)
- Workflow: Rate Card Order (Escrow)
- Workflow: Submission Fraud Check
- Workflow: Withdrawal
- Workflow: Dispute
- 20_Coding_Standards
- Community 36
- 00_Index.md
- Orders — Testing
- Community 39
- Community 40
- Visi Marketiv
- Aturan Kerja Proyek
- Community 43
- 30_Naming_Convention
- 60_Error_Handling
- 70_Testing_Strategy
- 80_Deployment
- Community 48
- Authentication — Testing
- Authentication — Backend
- Campaigns — Testing
- Campaigns — Concepts
- Chat — Testing
- Chat — Business Rules
- Community 55
- Chat — Frontend
- `notifications`
- Notifications — Backend
- Offers — Business Rules
- Community 60
- Komponen
- Orders — Business Rules
- Community 63
- Payments — Testing
- Payments — Concepts
- Payments — Business Rules
- Community 67
- Community 68
- Community 69
- Rate Cards — Testing
- Users — Testing
- Users — Business Rules
- Users — API (Profile Service)
- ADR-003 — `orders` sebagai Aggregate Utama Alur Rate Card
- ADR-004 — Pisahkan `fraud_checks` dari `campaign_submissions`
- ADR-005 — Simpan Counter Denormalisasi di `campaigns`
- campaign.service.js
- Roadmap Pengembangan
- 50_Security_Guidelines
- AI — Overview
- Community 81
- Community 82
- Komponen
- AI — Events
- Authentication — Overview
- Authentication — User Flow
- Campaigns — Overview
- Community 88
- Chat — Overview
- Chat — User Flow
- Chat — Events
- Notifications — Testing
- Notifications — Overview
- Notifications — Business Rules
- Notifications — Frontend
- Offers — Testing
- Offers — Overview
- Offers — Concepts
- Community 99
- Orders — Overview
- Orders — Concepts
- Community 102
- Community 103
- Payments — Overview
- Payments — User Flow
- Rate Cards — Overview
- Rate Cards — Concepts
- Rate Cards — Business Rules
- Rate Cards — Events
- Users — Overview
- Users — User Flow
- Users — Backend
- Users — Events
- ADR-001 — Gunakan Appwrite BaaS, Bukan Backend Custom
- ADR-002 — Abstraksi Service Layer Wajib
- ADR-006 — Gunakan Zustand untuk State Management, Bukan Redux
- creator.service.js
- order.service.js
- submission.service.js
- user.service.js
- Community 121
- Community 122
- AI — Testing
- AI — Concepts
- AI — User Flow
- Authentication — Concepts
- Campaigns — User Flow
- Community 129
- package.json
- package.json
- Orders — User Flow
- Rate Cards — User Flow
- Community 134
- Community 135
- Users — Concepts
- auth.service.js
- offer.service.js
- Community 139
- Community 140
- Notifications — Events
- Offers — User Flow
- Community 143
- Community 144
- chat.service.js
- notification.service.js
- wallet.service.js
- graphify.js
- claim.service.js
- Community 150
- Community 152
- Community 153
- Community 154
- Community 155
- Community 156
- 10_Glossary
- Community 158
- Community 159
- Community 160
- Community 161
- Community 162
- Community 163
- Chat — Events
- Community 165
- Community 166
- Community 167
- Service Layer (`creator.service.ts`)
- Community 169
- Community 170
- Community 171
- Community 172
- Community 173
- Community 174
- Community 175
- Community 177
- Community 178
- Community 179
- Community 180
- Community 181
- Community 182
- Community 183
- Community 184
- Community 185
- Community 186
- Community 187
- Community 188
- Community 189
- Community 190
- Community 191
- Community 192
- Community 193
- Community 194
- Community 195
- Community 196
- Community 197
- Community 198
- Community 199
- Community 200
- Community 201
- Community 202
- Community 203
- Community 204
- Community 205
- Community 206
- Community 207
- Community 208
- Community 209
- Community 210
- Community 211
- Community 212
- Community 213
- Community 214
- Community 215
- Community 216
- Community 217
- Community 218
- Community 219
- Community 220
- Community 221
- Community 222
- Authentication — Events
- Community 224
- Community 225
- Community 226
- Community 227
- Community 228
- Community 229
- Community 230
- Account
- Client
- Databases
- Functions
- __mockStore
- Sprint 4 Alur B — Handoff Tunggal
- Audit Live & Pengambilalihan Peran Backend
- Perubahan Sisi Appwrite — Sprint 1 Integrasi Frontend
- Perubahan Sisi Appwrite — Sprint 2 Integrasi Frontend
- main.js
- 🚨 Penjelasan Masalah APPWRITE_FUNCTION_API_KEY
- Verifikasi `dd41686` — Prefix Event Sudah Benar, Tapi Wiring Lain Masih Kosong
- 5. Common Appwrite Console Operations
- review-tnc-marketiv-v3-cto.md
- Task List
- auth.service.ts
- Prompt — Fee dari Env + Snapshot (T-01) & Hapus Top-Up Reguler (T-19)
- client.mjs
- Campaigns — Views Tracking & Verifikasi Tayangan
- main.js
- main.js
- main.js
- Prompt — Kepatuhan Akun: Versi T&C (T-14) & Verifikasi Email (T-15)
- Audit Temuan CTO & CAIO vs Dokumentasi & Kode Backend
- aw
- Fix Google OAuth Login/Register — Laporan Hasil
- main.js
- payment.service.ts
- main.js
- A. Permintaan Baru
- Prompt — Status Akun: Suspend, Terminate & Banding (T-03)
- main.js
- main.js
- main.js
- Prompt — Withdrawal 4-State + Midtrans Iris + Reversal + KYC + UMKM (T-06)
- sec-03-role-guard.test.ts
- Review Frontend atas Lapisan Delete/Cancel
- Prompt — Refund ke Wallet UMKM (T-02)
- Prompt — Views Tracking: Angka Final Terkunci (T-04)
- Prompt — Auto-Approve Review Rate Card (T-05)
- main.js
- Sprint 4 Alur A (Campaign / PPV) — Handoff Frontend
- campaign-asset.service.ts
- Prompt — Perbaikan Integritas Finansial: Wallet & Reward
- Prompt — Metadata Konten: Kreditasi Kreator (T-12) & Penanda AI (T-13)
- fund-campaign.mjs
- main.js
- loadConfig
- Audit `mark-notifications-read` + `get-umkm-finance-summary` — 2026-08-11
- package.json
- main.js
- Konsep Fitur Delete — Draf Diskusi
- T-01: Migrasi Fee Platform ke Environment Variables (Pasal 8.2 T&C) — Laporan Hasil
- T-02: Implementasi Jalur Refund (Pasal 15 T&C) — Laporan Hasil
- Withdrawal 4-State + Midtrans Iris (T-06, T-17, T-18, Fix B, Pasal 11 & 15 T&C) — Laporan Hasil
- main.js
- main.js
- Blocker — `APPWRITE_FUNCTION_API_KEY` tidak ada saat runtime
- T-14 & T-15: Implementasi T&C & Verifikasi Email (CTO-11 & CTO-10) — Laporan Hasil
- drift.mjs
- sync-function-vars.mjs
- Audit Environment Variables Function — Project Marketiv (Live)
- Remediation Audit Live — 2026-08-11
- Pengaturan Keamanan Webhook Iris (withdrawal-callback)
- main.js
- Verifikasi Resolusi T-1 & T-4 — Dua Masalah Tersisa
- T-05: Auto-Approve Review Rate Card (Pasal 7.2.e-f T&C) — Laporan Hasil
- Report: Implementasi Metadata Transparansi AI & Kreditasi (T-12 & T-13)
- Rincian Temuan & Kebutuhan Frontend
- P1 — Penting (Penyempurnaan UX & Feedback)
- audit-live.mjs
- Smoke Test Order Flow — 2026-08-11
- main.js
- 🔧 Appwrite Function Events — Prefix TablesDB
- Phase 1 — FIX A + FIX B (Prompt #0) — Laporan Hasil
- T-03: Implementasi Status Akun & Mekanisme Banding (Pasal 18 T&C) — Laporan Hasil
- inspect-campaign.mjs
- main.js
- T-04: Implementasi Jejak Views Terkunci — Laporan Hasil
- audit-google-oauth.mjs
- package.json
- package.json
- main.js
- package.json
- package.json
- main.js
- package.json
- package.json
- package.json
- package.json
- package.json
- package.json
- package.json
- package.json
- package.json
- package.json
- package.json
- package.json
- package.json
- package.json
- package.json
- package.json
- package.json
- package.json
- package.json
- package.json
- package.json
- package.json
- package.json
- package.json
- package.json
- package.json
- package.json
- package.json
- package.json
- package.json
- package.json
- main.js
- package.json
- Bloker Frontend — Fitur Delete/Cancel
- backfill-delete-permissions.ts
- Panduan Eksekusi Prompt Backend (Roadmap T&C)
- Prompt — Penyusunan Syarat & Ketentuan Marketiv V3.1 (Final)
- configure-google-oauth.mjs
- package.json
- main.js
- main.js
- main.js
- require-active-role.test.ts
- inspect-conversations.mjs
- package.json
- main.js
- package.json
- Tests — Marketiv
- fix-function-vars.mjs
- appwrite/ops
- verify-delete-permissions.ts
- harden-permissions.mjs
- taste.md
- Domain Model — ERD Tingkat Tinggi
- Notifications — User Flow
- sync-env-all-functions.sh
- deploy-all-functions.sh
- set-env-all-functions.sh
- import-function-env.sh
- oauth-callback.service.test.ts
- perf-01-submission-counts.test.ts

## God Nodes (most connected - your core abstractions)
1. `aw()` - 32 edges
2. `Syarat & Ketentuan` - 23 edges
3. `Appwrite CLI` - 19 edges
4. `Platform Engineering` - 17 edges
5. `COLLECTIONS` - 15 edges
6. `databases` - 15 edges
7. `Prompt — Perbaikan Google OAuth Redirect ke Form/Login vs Onboarding` - 15 edges
8. `account` - 14 edges
9. `OpenAPI 3.1 Specification` - 14 edges
10. `Express to NestJS Migration Guide` - 14 edges

## Surprising Connections (you probably didn't know these)
- `listAll()` --calls--> `aw()`  [EXTRACTED]
  appwrite/ops/audit-live.mjs → appwrite/ops/client.mjs
- `varsOf()` --calls--> `aw()`  [EXTRACTED]
  appwrite/ops/fix-function-vars.mjs → appwrite/ops/client.mjs
- `listAllRows()` --calls--> `aw()`  [EXTRACTED]
  appwrite/ops/inspect-conversations.mjs → appwrite/ops/client.mjs
- `auditPlatforms()` --calls--> `aw()`  [EXTRACTED]
  appwrite/ops/audit-google-oauth.mjs → appwrite/ops/client.mjs
- `auditProvider()` --calls--> `aw()`  [EXTRACTED]
  appwrite/ops/audit-google-oauth.mjs → appwrite/ops/client.mjs

## Import Cycles
- None detected.

## Communities (415 total, 27 thin omitted)

### Community 0 - "00_Index.md"
Cohesion: 0.10
Nodes (37): AddSocialAccountInput, CreatorProfile, CreatorSocialAccount, deleteFile(), fileToBase64(), getByUserId(), getCreatorIdsByRateCardPrice(), getMyFiles() (+29 more)

### Community 1 - "AGENTS.md"
Cohesion: 0.05
Nodes (40): 99_Templates — Index, Daftar Template, ADR-<NNN> — <Judul Keputusan>, Consequences, Context, Decision, Status, API: <serviceName>.<methodName>() (+32 more)

### Community 2 - "Users — Database"
Cohesion: 0.11
Nodes (27): calculateCreatorPayout(), calculatePlatformFee(), calculateTotalPayment(), getBalance(), getPendingBalance(), getTransactions(), GetTransactionsOptions, getWithdrawals() (+19 more)

### Community 3 - "README.md"
Cohesion: 0.05
Nodes (18): applyQueries(), ID, MockAccount, __mockAccountGet(), MockClient, MockDatabases, __mockFunctionExecution(), MockFunctions (+10 more)

### Community 4 - "Campaign Service"
Cohesion: 0.05
Nodes (41): Appwrite CLI, appwrite.config.json, Column type commands, Configuration, Database commands (TablesDB), Deploy non-interactively, Deploying Functions, Deploying Sites (+33 more)

### Community 5 - "30_RateCard_Order.md"
Cohesion: 0.05
Nodes (41): 1. Over-engineering Simple Applications, 2. Not Understanding Dependency Injection Lifecycle, 3. Mixing Middleware and Guards Incorrectly, 4. Ignoring Validation Pipes, 5. Not Leveraging Module Imports/Exports, 6. Forgetting to Enable CORS, 7. Incorrect Exception Handling, 8. Not Configuring ValidationPipe Globally (+33 more)

### Community 6 - "20_Campaign_PPV.md"
Cohesion: 0.05
Nodes (37): Akun Suspended / Terminated, Approve → Release Escrow, Deliverable, Orders — Business Rules, Review Process, Revisi, Status Order, deliverables (+29 more)

### Community 7 - "40_Folder_Structure"
Cohesion: 0.06
Nodes (31): 1. Introduction Phase, 1. URI Versioning, 2. Deprecation Phase, 2. Header Versioning, 3. Query Parameter Versioning, 3. Sunset Phase, 4. Content Negotiation, Anti-Patterns (+23 more)

### Community 8 - "00_Index.md"
Cohesion: 0.07
Nodes (29): Array Validation, Arrays, Basic Structure, Best Practices, Code Generation, Complete Endpoint Example, Components, Data Types (+21 more)

### Community 9 - "generate_appwrite_json.js"
Cohesion: 0.07
Nodes (28): Backend Files, Before Handoff, Bundle Analysis, Code Deliverables, Component Documentation, Configuration Files, Deliverables Checklist, Deployment Deliverables (+20 more)

### Community 10 - "00_Index.md"
Cohesion: 0.07
Nodes (25): AI — Business Rules, Bobot Skor Validasi, Brief Generator, Content Analysis — Input & Output Gemini API, Fraud Detection, Threshold, AI — API, `ai-brief` — [Appwrite Function] (+17 more)

### Community 11 - "00_Index.md"
Cohesion: 0.07
Nodes (27): 1. Validation Errors (400 Bad Request), 2. Authentication Errors (401 Unauthorized), 3. Authorization Errors (403 Forbidden), 4. Not Found Errors (404 Not Found), 5. Conflict Errors (409 Conflict), 6. Rate Limiting (429 Too Many Requests), 7. Server Errors (500 Internal Server Error), 8. Service Unavailable (503 Service Unavailable) (+19 more)

### Community 12 - "90_Design_System"
Cohesion: 0.07
Nodes (27): Accept Headers, Best Practices, Cache Control, Cache Headers, Client Errors (4xx), Conditional Requests, Consistent URI Structure, Content Negotiation (+19 more)

### Community 13 - "Campaigns — Frontend"
Cohesion: 0.07
Nodes (28): API Architecture Patterns, Architecture Decision Guide, Authentication Strategy, Backend Framework Selection, BFF Pattern (Backend for Frontend), Cache Invalidation Patterns, Caching Strategy, Database Selection (+20 more)

### Community 14 - "Tech Stack"
Cohesion: 0.06
Nodes (27): Archive, Chat — Business Rules, Denormalisasi, Read Receipt, Realtime & Akses, Satu Percakapan per Pasangan, Tipe Pesan, Chat — Database (+19 more)

### Community 15 - "Halaman"
Cohesion: 0.05
Nodes (17): Account, authUsers, Client, createCalls, Databases, emailTokens, Functions, ID (+9 more)

### Community 16 - "Orders — Frontend"
Cohesion: 0.08
Nodes (25): 1. Offset-Based Pagination, 2. Page-Based Pagination, 3. Cursor-Based Pagination, 4. Keyset Pagination, 5. Seek Pagination (Time-Based), Best Practices, Comparison Matrix, Default Limits (+17 more)

### Community 17 - "Rate Cards — Frontend"
Cohesion: 0.08
Nodes (25): B-Tree Indexes (Default), Column Order Guidelines, Covering Indexes, Expression Indexes, Identify Index Candidates, Index Anti-Patterns, Index Design Checklist, Index Maintenance (+17 more)

### Community 18 - "40_Tech_Stack.md"
Cohesion: 0.08
Nodes (25): Binary Log Settings, Buffer Pool, Configuration File Example, Covering Indexes, I/O Configuration, Index Optimization, Index Statistics, InnoDB Memory Configuration (+17 more)

### Community 19 - "00_Index.md"
Cohesion: 0.08
Nodes (25): Autovacuum Configuration, Commit Delays, Configuration, Configuration File Example, Connection Pooling, Effective Cache Size, Join and Scan Methods, Key Metrics Queries (+17 more)

### Community 20 - "Authentication — Business Rules"
Cohesion: 0.07
Nodes (25): Agent Skills, AI Operating Manual, API Tasks, Appwrite Development, Architecture Questions, Backend Tasks, Core Principles, Database Tasks (+17 more)

### Community 21 - "Authentication — API (Auth Service)"
Cohesion: 0.08
Nodes (25): Acceptable Responses, Actions Demonstrate Understanding, Anti-Patterns, Avoiding Agreement Theater, Bad Pushback, Core Mindset, Forbidden Phrases, Good Pushback Format (+17 more)

### Community 22 - "Campaigns — Business Rules"
Cohesion: 0.08
Nodes (21): Accept → Create Order, Field, Kepemilikan, Offers — Business Rules, Status Offer, offers, Offers — Database, `acceptOffer()` — [Client SDK] *(memicu Appwrite Function `create-order`)* (+13 more)

### Community 23 - "Community 23"
Cohesion: 0.08
Nodes (24): Advanced Artifact Management, Artifact Management, Artifact Promotion, Best Practices, Build Caching Strategy, Build Optimization, Build Optimization, Container Registry Lifecycle (+16 more)

### Community 24 - "Community 24"
Cohesion: 0.08
Nodes (26): `addCampaignAsset()` — [Client SDK], `ai-fraud-precheck` — [Appwrite Function], `approveSubmission()` — [Client SDK], Appwrite Functions (Server-side), `calculate-campaign-reward` — [Appwrite Function], `campaign-claimed` — [Appwrite Function], `campaign-published` — [Appwrite Function], Campaign Service (+18 more)

### Community 25 - "Notification Service"
Cohesion: 0.10
Nodes (17): Field Wajib Paket, Kepemilikan, Platform Fee, Rate Cards — Business Rules, Status Rate Card, Appwrite Functions (Server-side), `createRateCard()` — [Client SDK], `deleteRateCard()` — [Client SDK] (+9 more)

### Community 26 - "Appwrite Functions"
Cohesion: 0.09
Nodes (21): Algolia DocSearch, Analytics Integration, Build Optimization, CDN & Caching, Code Example Testing, Custom Analytics, Documentation Systems & Infrastructure, Documentation Testing (+13 more)

### Community 27 - "Halaman"
Cohesion: 0.14
Nodes (10): Daftar Dokumen, Modul AI, Daftar Dokumen, Modul Campaigns, Daftar Dokumen, Modul Chat, Daftar Dokumen, Modul Orders (+2 more)

### Community 28 - "Halaman"
Cohesion: 0.10
Nodes (20): API Client Generation, Architecture Decisions, BFF (Backend for Frontend), Blue-Green Deployment, CI/CD Configuration (GitHub Actions), Database Migrations, Deployment Pipeline, End-to-End Testing (+12 more)

### Community 29 - "Workflow: Registration & Onboarding"
Cohesion: 0.13
Nodes (24): ApproveDeliverableInput, cancelOrder(), Deliverable, DeliverableSource, DeliverableStatus, getDeliverables(), getOrderById(), getRevisions() (+16 more)

### Community 30 - "Workflow: Campaign Pay-Per-View (PPV)"
Cohesion: 0.10
Nodes (19): After Review, Before You Start, Category 1: Missing Requirements, Category 2: Unnecessary Additions, Category 3: Interpretation Gaps, Common Mistakes to Avoid, Compliant Result, Core Directive (+11 more)

### Community 31 - "Workflow: Rate Card Order (Escrow)"
Cohesion: 0.10
Nodes (19): API Design Standards, API Documentation, API Versioning, CORS Configuration, Header Versioning (Alternative), HTTP Status Codes, Input Validation with Zod, OpenAPI/Swagger Setup (+11 more)

### Community 32 - "Workflow: Submission Fraud Check"
Cohesion: 0.10
Nodes (19): 00_Project, 01_Global, 02_Modules, 03_Workflows, 04_Decisions, 99_Templates, AI-First Design, Architecture (+11 more)

### Community 33 - "Workflow: Withdrawal"
Cohesion: 0.10
Nodes (19): compilerOptions, allowJs, baseUrl, esModuleInterop, module, moduleResolution, paths, resolveJsonModule (+11 more)

### Community 34 - "Workflow: Dispute"
Cohesion: 0.17
Nodes (15): account, appwriteClient, COLLECTIONS, FUNCTIONS, databases, functions, Claim, ClaimServiceError (+7 more)

### Community 35 - "20_Coding_Standards"
Cohesion: 0.10
Nodes (19): Alert Thresholds, Connection and Lock Monitoring, Connection and Process Monitoring, Cross-Platform Monitoring, Database Statistics, Essential Extensions, Health Check Queries, InnoDB Status Monitoring (+11 more)

### Community 36 - "Community 36"
Cohesion: 0.11
Nodes (18): Accessibility, Accessible Modal, Bundle Analysis, Code Splitting & Lazy Loading, Component Testing with Testing Library, Focus Trap, Frontend Patterns, Keyboard Navigation (+10 more)

### Community 37 - "00_Index.md"
Cohesion: 0.06
Nodes (31): appwrite, @opendataloader/pdf, dependencies, appwrite, @opendataloader/pdf, devDependencies, node-appwrite, @playwright/test (+23 more)

### Community 38 - "Orders — Testing"
Cohesion: 0.14
Nodes (10): AI — Database, ai_requests, rate_card_packages, rate_cards, Rate Cards — Database, Dokumen, Users, Istilah (+2 more)

### Community 39 - "Community 39"
Cohesion: 0.11
Nodes (19): Data Model — Collection yang Terlibat, Edge Cases, Events / Functions, Links, Modules Involved, Notifikasi, Purpose, State Transitions (+11 more)

### Community 40 - "Community 40"
Cohesion: 0.11
Nodes (17): Check for extra spaces, Content Hierarchy, Diagram Integration, FAQ Section, Information Architecture, Problem-Solution Format, Progressive Disclosure, Progressive Learning Path (+9 more)

### Community 41 - "Visi Marketiv"
Cohesion: 0.11
Nodes (17): Aggregation Strategies, CTE Optimization, Eliminate Subqueries, Execution Plan Analysis, Materialized vs Inline CTEs, MySQL EXPLAIN, Optimize DISTINCT, Optimize JOIN Order (+9 more)

### Community 42 - "Aturan Kerja Proyek"
Cohesion: 0.11
Nodes (17): Adoption Strategy, ArgoCD Application, Backstage Service Template, Best Practices, CLI Tool Example, Cost Allocation, Custom Backstage Plugin, GitOps Repository Structure (+9 more)

### Community 43 - "Community 43"
Cohesion: 0.11
Nodes (17): Backend Patterns, Circuit Breaker Pattern, Connection Pooling, Database Optimization, Distributed Tracing, Docker & Deployment, Graceful Shutdown, Idempotency (+9 more)

### Community 44 - "30_Naming_Convention"
Cohesion: 0.12
Nodes (17): Data Model — Collection yang Terlibat, Edge Cases, Events / Functions, Links, Modules Involved, Notifikasi, Purpose, State Transitions (+9 more)

### Community 45 - "60_Error_Handling"
Cohesion: 0.22
Nodes (9): Edge Cases, Links, Modules Involved, Nomor WhatsApp Admin, Purpose, Step-by-step Flow, Tahap 1: Hubungi Admin, Trigger (+1 more)

### Community 46 - "70_Testing_Strategy"
Cohesion: 0.18
Nodes (16): Campaign, CampaignBrief, CampaignServiceError, CampaignStatus, CampaignType, CreateCampaignInput, deleteCampaign(), GenerateBriefInput (+8 more)

### Community 47 - "80_Deployment"
Cohesion: 0.12
Nodes (15): GraphQL Schema Documentation, gRPC Documentation, Interactive API Documentation, Interactive Documentation Portals, Multi-Language Examples, Multi-Protocol Documentation, OpenAPI 3.1 Advanced Features, Quick Reference (+7 more)

### Community 48 - "Community 48"
Cohesion: 0.12
Nodes (15): Capture an Execution Plan, Common Operations & Examples, Constraints, Core Workflow, Create a Covering Index, Database Optimizer, Identify Top Slow Queries (PostgreSQL), MUST DO (+7 more)

### Community 49 - "Authentication — Testing"
Cohesion: 0.05
Nodes (42): 0. Refactor: Dashboard UMKM + 4 Function DTO, 10. Docs: Sinkronisasi Global, 11. Chore: Constants & Commits Tracker, 12. Chore: Update Graphify, 13. Feature: Platform Fee 2%, 13. Feature: Platform Fee 2%, 14. Chore: Config Sync, 15. Fix: Env Var Naming Convention di Semua Function (+34 more)

### Community 50 - "Authentication — Backend"
Cohesion: 0.19
Nodes (8): Dokumen, Notifications, Istilah, Konsep, Notifications — Concepts, Lihat Juga, Notifications — Events, Pola Implementasi

### Community 51 - "Campaigns — Testing"
Cohesion: 0.11
Nodes (18): Appwrite Functions (Server-side), `cancelPayment()` — [Appwrite Function callable], `create-escrow` — [Appwrite Function], `create-user-wallet` — [Appwrite Function], `createPayment()` — [Appwrite Function callable], `getPayment()` — [Client SDK], `getPayments()` — [Client SDK], `getTransactions()` — [Client SDK] (+10 more)

### Community 52 - "Campaigns — Concepts"
Cohesion: 0.12
Nodes (16): Data Model — Collection yang Terlibat, Edge Cases, Events / Functions, Links, Modules Involved, Notifikasi, Purpose, State Transitions (+8 more)

### Community 53 - "Chat — Testing"
Cohesion: 0.18
Nodes (20): archiveConversation(), ChatMessage, ChatServiceError, Conversation, CreateConversationInput, ensureParticipant(), getConversationById(), getConversations() (+12 more)

### Community 54 - "Chat — Business Rules"
Cohesion: 0.13
Nodes (14): Ask Questions, Don't Assume, Be Actionable, Not Just Critical, Be Constructive, Not Demanding, Be Specific, Not Vague, Critical (Must Fix), Feedback by Category, Feedback Examples, Good vs Bad Feedback (+6 more)

### Community 55 - "Community 55"
Cohesion: 0.13
Nodes (14): 1. Context (5 min), 2. Structure (10 min), 3. Code Details (20 min), 4. Tests (10 min), 5. Final Pass (5 min), Category Deep Dive, Comprehensive Review Checklist, Design Questions (+6 more)

### Community 56 - "Chat — Frontend"
Cohesion: 0.13
Nodes (14): Advanced Canary with Automated Analysis, ArgoCD Rollback, Blue-Green with Ingress, Canary with Istio, Deployment Metrics (DORA), Deployment Strategies, Kubernetes Rollback, Post-deployment Verification (+6 more)

### Community 57 - "`notifications`"
Cohesion: 0.13
Nodes (14): Auto-Remediation Script, Best Practices, Chaos Engineering, Communication Templates, Compliance Requirements, Evidence Collection & Forensics, Incident Classification, Incident Response (+6 more)

### Community 58 - "Notifications — Backend"
Cohesion: 0.12
Nodes (16): Data Model — Collection yang Terlibat, Edge Cases, Events / Functions, Jalur A: Direct Order (Tanpa Negosiasi), Jalur B: Custom Offer (Dengan Negosiasi), Links, Modules Involved, Notifikasi (+8 more)

### Community 59 - "Offers — Business Rules"
Cohesion: 0.15
Nodes (13): Data Model — Collection yang Terlibat, Edge Cases, Events / Functions, Links, Modules Involved, Notifikasi, Purpose, State Transitions (+5 more)

### Community 60 - "Community 60"
Cohesion: 0.22
Nodes (17): CreateRateCardInput, CreatorServiceError, deleteRateCard(), getMyRateCards(), getRateCardById(), loadPackages(), mapError(), mapPackage() (+9 more)

### Community 61 - "Komponen"
Cohesion: 0.14
Nodes (13): Code Documenter, Constraints, Core Workflow, Google-style Docstring (Python), JSDoc (TypeScript), Knowledge Reference, MUST DO, MUST NOT DO (+5 more)

### Community 62 - "Orders — Business Rules"
Cohesion: 0.14
Nodes (13): Code Reviewer, Constraints, Core Workflow, Knowledge Reference, Magic Number — Bad vs Good, MUST DO, MUST NOT DO, N+1 Query — Bad vs Good (+5 more)

### Community 63 - "Community 63"
Cohesion: 0.14
Nodes (13): Constraints, Core Workflow, DevOps Engineer, Knowledge Reference, Minimal Dockerfile Example, Minimal GitHub Actions Example, MUST DO, MUST NOT DO (+5 more)

### Community 64 - "Payments — Testing"
Cohesion: 0.14
Nodes (13): Common Skill Categories, Find Skills, How to Help Users Find Skills, Step 1: Understand What They Need, Step 2: Check the Leaderboard First, Step 3: Search for Skills, Step 4: Verify Quality Before Recommending, Step 5: Present Options to the User (+5 more)

### Community 65 - "Payments — Concepts"
Cohesion: 0.14
Nodes (13): Code Examples, Constraints, Controller with DTO Validation and Swagger, Core Workflow, Knowledge Reference, Module Definition, MUST DO, MUST NOT DO (+5 more)

### Community 66 - "Payments — Business Rules"
Cohesion: 0.13
Nodes (15): Appwrite Functions (Server-side), Authentication — API, `forgotPassword(email)` — [Function], `getCurrentUser()` — [Client SDK], Lihat Juga, `loginUser(email, password, role?)` — [Client SDK], `loginWithGoogle(role?)` — [Client SDK via Appwrite SDK], `logoutUser()` — [Client SDK] (+7 more)

### Community 67 - "Community 67"
Cohesion: 0.15
Nodes (13): 40_Folder_Structure, Appwrite Config (`src/lib/appwrite/`), Appwrite Functions (`functions/`), Appwrite Project Config (`appwrite/`), Environment Variables, Modules (`src/modules/`), Service Layer (`src/services/`), Shared Components (`src/components/`) (+5 more)

### Community 68 - "Community 68"
Cohesion: 0.06
Nodes (33): 1. `users`, 2. `umkm_profiles`, 3. `creator_profiles`, 4. `creator_social_accounts`, 5. `appeals`, 5. `creator_portfolios`, 6. `user_storage_usage` ⚠️ DORMANT (post-MVP), 7. `user_files` ⚠️ DORMANT (post-MVP) (+25 more)

### Community 69 - "Community 69"
Cohesion: 0.15
Nodes (13): `addSocialAccount()` — [Client SDK], Appwrite Functions (Server-side), `deleteFile()` — [Client SDK] ⚠️ DORMANT, `getMyFiles(filter)` — [Client SDK] ⚠️ DORMANT, `getProfile(userId)` — [Client SDK], `getStorageUsage()` — [Client SDK] ⚠️ DORMANT, Lihat Juga, `removeSocialAccount()` — [Client SDK] (+5 more)

### Community 70 - "Rate Cards — Testing"
Cohesion: 0.17
Nodes (3): isValidSignature(), TERMINAL_STATUSES, timingSafeEqual()

### Community 71 - "Users — Testing"
Cohesion: 0.27
Nodes (13): assertCampaignOwner(), CreateSubmissionInput, getSubmissionsByCampaign(), GetSubmissionsByCampaignOptions, isValidTikTokUrl(), mapError(), mapSubmission(), Submission (+5 more)

### Community 72 - "Users — Business Rules"
Cohesion: 0.17
Nodes (11): API Designer, Constraints, Core Workflow, Knowledge Reference, MUST DO, MUST NOT DO, OpenAPI 3.1 Resource Endpoint (copy-paste starter), Output Checklist (+3 more)

### Community 73 - "Users — API (Profile Service)"
Cohesion: 0.17
Nodes (12): Aturan Asset Campaign, Aturan Auto-Expire Claim, Aturan Budget, Aturan Claim, Aturan Fraud, Aturan Submission, Campaigns — Business Rules, Data Denormalisasi (+4 more)

### Community 74 - "ADR-003 — `orders` sebagai Aggregate Utama Alur Rate Card"
Cohesion: 0.24
Nodes (7): ensureCreatorProfile(), ensureStorageUsage(), ensureUmkmProfile(), ensureUserMirror(), findByUserId(), getTosAgreement(), publicOwnerPermissions()

### Community 75 - "ADR-004 — Pisahkan `fraud_checks` dari `campaign_submissions`"
Cohesion: 0.19
Nodes (4): ALLOWED_MIME_PREFIXES, ALLOWED_MIME_TYPES, isAllowedMimeType(), validatePayload()

### Community 76 - "ADR-005 — Simpan Counter Denormalisasi di `campaigns`"
Cohesion: 0.18
Nodes (10): Common Issues, Deep Nesting, God Functions, Magic Numbers/Strings, Missing Error Handling, Missing Null Checks, Mutable Shared State, N+1 Query Problem (+2 more)

### Community 78 - "Roadmap Pengembangan"
Cohesion: 0.21
Nodes (5): Authentication, Dokumen, Authentication — Concepts, Istilah, Konsep

### Community 79 - "50_Security_Guidelines"
Cohesion: 0.20
Nodes (10): ai-fraud-precheck, Appwrite Functions, Aturan Backend, calculate-campaign-reward, campaign-claimed, campaign-published, Campaigns — Backend, expire-stale-claims (+2 more)

### Community 80 - "AI — Overview"
Cohesion: 0.28
Nodes (13): CreateOfferInput, deleteOffer(), getOfferById(), getOfferOrThrow(), getOffers(), GetOffersOptions, mapError(), mapOffer() (+5 more)

### Community 81 - "Community 81"
Cohesion: 0.20
Nodes (9): API Documentation: FastAPI & Django, Custom Schema, Django REST Framework (drf-spectacular), Endpoint Documentation, FastAPI (Auto-generates from types), Quick Reference, Router with Tags, Serializer Documentation (+1 more)

### Community 82 - "Community 82"
Cohesion: 0.20
Nodes (9): API Documentation: NestJS & Express, Controller Documentation, DTO Documentation, Express (swagger-jsdoc), NestJS (@nestjs/swagger), Quick Reference, Route Documentation, Schema Documentation (+1 more)

### Community 83 - "Komponen"
Cohesion: 0.20
Nodes (9): API + Frontend Flow, Common Patterns, Create, CRUD Implementation, Delete, Form Handling, Quick Reference, Read (List with Pagination) (+1 more)

### Community 84 - "AI — Events"
Cohesion: 0.22
Nodes (6): 00_Project — Index, Daftar Dokumen, Dikecualikan dari MVP, Referensi, Ruang Lingkup MVP, Termasuk dalam MVP

### Community 85 - "Authentication — Overview"
Cohesion: 0.20
Nodes (10): AI Layer, Backend (BaaS), Deployment, Frontend, Payment Gateway, Referensi, State Management, Tech Stack (+2 more)

### Community 86 - "Authentication — User Flow"
Cohesion: 0.20
Nodes (10): 90_Design_System, Border Radius (`radius.js`), Inventaris Komponen, Layout Dashboard, Navigasi, Prinsip, Shadow (`shadows.js`), Spacing (`spacing.js`) — skala 4 (+2 more)

### Community 87 - "Campaigns — Overview"
Cohesion: 0.20
Nodes (9): Campaigns — Frontend, Create Campaign, Halaman Creator, Halaman UMKM, Job Board, Komponen, My Campaigns, My Claims (+1 more)

### Community 88 - "Community 88"
Cohesion: 0.11
Nodes (19): Alur 4-state (Pasal 11 T&C), Aturan Refund, Balance vs Pending Balance, Campaign Top-Up (Buyer Side), Escrow, Idempotensi, KYC (Pasal 11.8), Minimum Campaign Budget (+11 more)

### Community 89 - "Chat — Overview"
Cohesion: 0.20
Nodes (9): dependencies, @google-cloud/vertexai, node-appwrite, node-appwrite, main, name, type, version (+1 more)

### Community 90 - "Chat — User Flow"
Cohesion: 0.06
Nodes (35): 1. Cek env frontend, 1. OAuth provider atau platform Appwrite salah, 1. Sinkronkan repo dan console, 1. Tambah state eksplisit untuk OAuth callback, 1. Unit test auth service/session, 2. Appwrite Auth session sukses, tapi dokumen `users` belum ada, 2. Cek Appwrite OAuth, 2. Component/flow test OAuth callback (+27 more)

### Community 91 - "Chat — Events"
Cohesion: 0.14
Nodes (11): call(), decrementColumn(), endpointFor(), incrementColumn(), claimLedgerRow(), completeTopup(), deterministicId(), deterministicNotificationId() (+3 more)

### Community 92 - "Notifications — Testing"
Cohesion: 0.22
Nodes (5): createMidtransTransaction(), json(), PURPOSE_PREFIX, PURPOSES, validatePayload()

### Community 93 - "Notifications — Overview"
Cohesion: 0.22
Nodes (8): Async Functions, Class Documentation, Common Patterns, Function Documentation, Generic Types, Interface Documentation, Quick Reference, TypeScript JSDoc

### Community 94 - "Notifications — Business Rules"
Cohesion: 0.22
Nodes (8): Constraints, Core Workflow, Fullstack Guardian, MUST DO, MUST NOT DO, Output Templates, Reference Guide, Three-Perspective Example

### Community 95 - "Notifications — Frontend"
Cohesion: 0.22
Nodes (8): Apply Guards Globally, Auth Module Setup, Auth Service, Authentication & Guards, JWT Auth Guard, JWT Strategy, Quick Reference, Roles Guard

### Community 97 - "Offers — Overview"
Cohesion: 0.33
Nodes (6): escrows, payments, Payments — Database, transactions, wallets, withdrawals

### Community 98 - "Offers — Concepts"
Cohesion: 0.12
Nodes (16): Appwrite Functions, Aturan Backend, cancel-payment, create-escrow, create-payment, create-user-wallet, get-umkm-finance-summary, mature-pending-balance (+8 more)

### Community 99 - "Community 99"
Cohesion: 0.22
Nodes (8): Create/Edit Rate Card, Creator Profile, Discovery / Browse Creators, Halaman Creator, Halaman UMKM, Komponen, My Rate Cards, Rate Cards — Frontend

### Community 100 - "Orders — Overview"
Cohesion: 0.20
Nodes (10): Akun Sosial Creator, Atribut Opsional di Onboarding, Data Denormalisasi (disengaja), Data Registrasi dan Onboarding, Kelengkapan Profil, Lihat Juga, Social Media UMKM, Status Akun & Banding (Appeals) (+2 more)

### Community 101 - "Orders — Concepts"
Cohesion: 0.22
Nodes (8): Browse Creator, Edit Profile, Halaman, Komponen, Onboarding, Profile Creator, Profile UMKM, Users — Frontend

### Community 102 - "Community 102"
Cohesion: 0.12
Nodes (10): call(), decrementColumn(), endpointFor(), incrementColumn(), deterministicNotificationId(), deterministicTransactionId(), ensureTransaction(), ADR-0008 (+2 more)

### Community 103 - "Community 103"
Cohesion: 0.39
Nodes (7): mapError(), mapNotification(), markAllAsRead(), Notification, NotificationServiceError, getNotifications(), markAsRead()

### Community 104 - "Payments — Overview"
Cohesion: 0.25
Nodes (7): Class Documentation, Google Style (Recommended), NumPy Style, Python Docstrings, Quick Reference, Sections Available, Sphinx Style

### Community 105 - "Payments — User Flow"
Cohesion: 0.25
Nodes (7): Caching Dependencies, Common Workflow Patterns, Complete CI/CD Pipeline, GitHub Actions Pipelines, Matrix Builds (Multi-version testing), Quick Reference, Reusable Workflows

### Community 106 - "Rate Cards — Overview"
Cohesion: 0.25
Nodes (7): Authentication Patterns, Authorization Patterns, Input Validation, Per-Feature Security Checklist, Quick Reference, Rate Limiting, Security Checklist

### Community 107 - "Rate Cards — Concepts"
Cohesion: 0.25
Nodes (7): Custom Validation, DTO Patterns, DTOs & Validation, Enable Validation Globally, Nested Validation, Quick Reference, Transform & Sanitize

### Community 108 - "Rate Cards — Business Rules"
Cohesion: 0.25
Nodes (7): Custom Providers, Injection Patterns, Module with Providers, Quick Reference, Scope, Service Pattern, Services & Dependency Injection

### Community 109 - "Rate Cards — Events"
Cohesion: 0.25
Nodes (7): Controller Tests, E2E Tests, Mock Factory, Quick Reference, Service Tests, Testing Patterns, Unit Test Setup

### Community 110 - "Users — Overview"
Cohesion: 0.25
Nodes (8): 1. Campaign (Pay-Per-View), 2. Rate Card / Order (Escrow), Apa itu Marketiv, Bukan Apa, Dua Model Bisnis, Masalah yang Diselesaikan, Referensi, Visi Marketiv

### Community 111 - "Users — User Flow"
Cohesion: 0.25
Nodes (8): Alur Data Registrasi → Profil, Authentication — Business Rules, Data Registrasi per Role, Google OAuth, Lihat Juga, Reset Password, Role & Routing, Status Akun

### Community 112 - "Users — Backend"
Cohesion: 0.25
Nodes (7): Authentication — Frontend, Forgot Password, Halaman, Komponen, Landing Page, Login, Register

### Community 113 - "Users — Events"
Cohesion: 0.25
Nodes (7): Aturan Tanpa Sampel Fisik (*Digital Asset-Based*), Campaigns — Concepts, Istilah, Status Campaign, Status Claim, Status Submission, Tipe Campaign

### Community 114 - "ADR-001 — Gunakan Appwrite BaaS, Bukan Backend Custom"
Cohesion: 0.12
Nodes (15): campaign_assets, campaign_briefs, campaign_claims, campaign_submissions, campaigns, Campaigns — Database, fraud_checks, Cara Menambahkan Footage (Foto, Video, Dokumen) ke Marketiv (+7 more)

### Community 115 - "ADR-002 — Abstraksi Service Layer Wajib"
Cohesion: 0.20
Nodes (9): Chat — Testing, Conversation (`createConversation`), Di Luar MVP, Notifikasi, Offer dari Chat, Pesan (`sendMessage`), Read Receipt (`markConversationAsRead`), Realtime (+1 more)

### Community 116 - "ADR-006 — Gunakan Zustand untuk State Management, Bukan Redux"
Cohesion: 0.22
Nodes (9): Appwrite Functions (Server-side), `createNotification()` — [Internal/System], `getNotifications()` — [Client SDK], Lihat Juga, `markAllAsRead()` — [Client SDK], `markAsRead()` — [Client SDK], Notifications — API, Service Layer (Client SDK) (+1 more)

### Community 117 - "creator.service.js"
Cohesion: 0.22
Nodes (8): Halaman Creator, Halaman UMKM, Komponen, My Orders, My Orders, Order Detail, Orders — Frontend, Upload Deliverable

### Community 118 - "order.service.js"
Cohesion: 0.29
Nodes (6): Halaman, Komponen, Payments — Frontend, Top Up, Wallet Dashboard, Withdrawal

### Community 119 - "submission.service.js"
Cohesion: 0.20
Nodes (10): Appwrite Functions, Aturan Backend, create-user-profile, Cross-Module Dependencies, delete-file ⚠️ DORMANT, get-creator-directory, get-umkm-profile, Lihat Juga (+2 more)

### Community 120 - "user.service.js"
Cohesion: 0.11
Nodes (10): node-appwrite, runContentAnalysis(), @google/generative-ai, dependencies, @google/generative-ai, node-appwrite, main, name (+2 more)

### Community 121 - "Community 121"
Cohesion: 0.06
Nodes (34): 0. Ringkasan 1 menit, 1. Status blocker, 2. Yang perlu kalian lakukan (urutan), 3.1 🔴 `create-payment` — tidak ada payment yang pernah bisa dibuat, 3.2 🔴 `midtrans-webhook` — konsekuensi langsung dari 3.1, 3.3 🔴 Generator akan mengembalikan lubang keamanan, 3. Perbaikan kode yang kami lakukan di sisi kalian, 4. Function baru: `request-withdrawal` (+26 more)

### Community 122 - "Community 122"
Cohesion: 0.25
Nodes (7): node-appwrite, dependencies, node-appwrite, main, name, type, version

### Community 123 - "AI — Testing"
Cohesion: 0.25
Nodes (7): node-appwrite, dependencies, node-appwrite, main, name, type, version

### Community 124 - "AI — Concepts"
Cohesion: 0.25
Nodes (7): node-appwrite, dependencies, node-appwrite, main, name, type, version

### Community 125 - "AI — User Flow"
Cohesion: 0.25
Nodes (7): node-appwrite, dependencies, node-appwrite, main, name, type, version

### Community 126 - "Authentication — Concepts"
Cohesion: 0.25
Nodes (7): node-appwrite, dependencies, node-appwrite, main, name, type, version

### Community 127 - "Campaigns — User Flow"
Cohesion: 0.25
Nodes (7): node-appwrite, dependencies, node-appwrite, main, name, type, version

### Community 129 - "Community 129"
Cohesion: 0.25
Nodes (7): node-appwrite, dependencies, node-appwrite, main, name, type, version

### Community 130 - "package.json"
Cohesion: 0.25
Nodes (7): node-appwrite, dependencies, node-appwrite, main, name, type, version

### Community 131 - "package.json"
Cohesion: 0.25
Nodes (7): node-appwrite, dependencies, node-appwrite, main, name, type, version

### Community 132 - "Orders — User Flow"
Cohesion: 0.06
Nodes (34): 12.1. Kewajiban dan Larangan UMKM, 12.2. Kewajiban dan Larangan Kreator, 12.3. Transparansi AI, 12.4. Larangan Umum, 5.1. Ketentuan Umum, 5.2. Ketentuan Khusus UMKM, 5.3. Ketentuan Khusus Kreator, 7.1. Campaign Mode (Pay-Per-View) (+26 more)

### Community 133 - "Rate Cards — User Flow"
Cohesion: 0.06
Nodes (33): 0. Ringkasan 1 menit, A-1. Akar masalah: `appwrite push functions` mencabut hak akses Function, A-2. Kenapa lolos berbulan-bulan, A-3. Skrip pemulih kami sendiri ikut merusak, A. Insiden — kenapa "NO DRIFT" kemarin adalah lampu hijau palsu, B-1. Generator sekarang menulis `scopes`, B-2. Pagar regresi yang sebenarnya, B-3. Skrip perusak dimatikan, perkakas ops pindah ke repo (+25 more)

### Community 134 - "Community 134"
Cohesion: 0.25
Nodes (7): node-appwrite, dependencies, node-appwrite, main, name, type, version

### Community 135 - "Community 135"
Cohesion: 0.29
Nodes (6): Add to CI pipeline, Checklist During Documentation, Coverage Reports, Documentation Coverage Report Template, Framework-Specific Linting, Quick Reference

### Community 136 - "Users — Concepts"
Cohesion: 0.29
Nodes (6): Full Review Report Template, Quick Checks Before Submitting, Report Template, Severity Definitions, Time Boxing, Verdict Guidelines

### Community 137 - "auth.service.js"
Cohesion: 0.29
Nodes (6): Docker Compose (Development), Docker Patterns, .dockerignore Template, Multi-stage Dockerfile (Node.js), Multi-stage Dockerfile (Python), Security Best Practices

### Community 138 - "offer.service.js"
Cohesion: 0.29
Nodes (6): Common kubectl Commands, Complete Deployment Stack, ConfigMap and Secrets, Horizontal Pod Autoscaler, Kubernetes Manifests, Quick Reference

### Community 139 - "Community 139"
Cohesion: 0.29
Nodes (6): AWS ECS Fargate Setup, AWS RDS PostgreSQL, Best Practices, Common Commands, Terraform Infrastructure as Code, Variables and Outputs

### Community 140 - "Community 140"
Cohesion: 0.29
Nodes (7): 20_Coding_Standards, Arsitektur Modul (Feature-Based), Hooks, Konvensi Penamaan (ringkas), Service Layer (WAJIB), State Management (Zustand), Validasi (Zod)

### Community 141 - "Notifications — Events"
Cohesion: 0.29
Nodes (7): Authentication — User Flow, Creator, Forgot Password, Lihat Juga, Login, Register → Complete Profile, UMKM

### Community 142 - "Offers — User Flow"
Cohesion: 0.25
Nodes (7): Approve Deliverable (`approveDeliverable`), Deliverable (`uploadDeliverable`), Get Orders (`getOrders`), Orders — Testing, Revision (`requestRevision`), Service Layer (`order.service.ts`), Status Flow

### Community 143 - "Community 143"
Cohesion: 0.17
Nodes (11): Create Payment (`createPayment`), Escrow (Appwrite Function `create-escrow`, `release-escrow`), Get Payment (`getPayment`, `getPayments`), Midtrans Payment Gateway (Appwrite Function `create-payment`, `midtrans-webhook`), Payments — Testing, Pure Functions (`wallet.service.ts`), Service Layer (`payment.service.ts`, `wallet.service.ts`), Transaction (+3 more)

### Community 144 - "Community 144"
Cohesion: 0.29
Nodes (6): Istilah, Konsep, Payments — Concepts, Status Escrow, Status Payment, Status Withdrawal

### Community 145 - "chat.service.js"
Cohesion: 0.20
Nodes (9): Campaign Budget Refund (T-02), Checkout Created → Midtrans Payment, Deliverable Approved → Release Escrow, Midtrans Notification → Payment Status, Order Cancelled/Expired → Refund Escrow (T-02), Payment Success → Escrow Hold, Payments — Events, User Registered → Create Wallet (+1 more)

### Community 146 - "notification.service.js"
Cohesion: 0.17
Nodes (11): Delete File (`deleteFile`), Discovery (`searchCreators`), Get My Files (`getMyFiles`), Get Storage Usage (`getStorageUsage`), Onboarding, Profil, Service Layer (`user.service.ts`), Social Accounts (`addSocialAccount`, `removeSocialAccount`) (+3 more)

### Community 147 - "wallet.service.js"
Cohesion: 0.29
Nodes (6): node-appwrite, dependencies, node-appwrite, name, type, version

### Community 148 - "graphify.js"
Cohesion: 0.29
Nodes (6): node-appwrite, dependencies, node-appwrite, name, type, version

### Community 149 - "claim.service.js"
Cohesion: 0.06
Nodes (32): 0. Ringkasan 1 menit, 1. Respons atas §C Handoff — Daftar Kerja Tim Backend, 2. Respons atas Temuan Verifikasi Event Prefix, 3. ⛔ BLOCKER — `doAndDont` Tidak Bisa Dinaikkan ke 4000, 4. DTO `get-creator-negotiations` — `conversationId` + `isArchived`, §5 (Claim `expired` mengunci kreator) — FIX DITERAPKAN ✅, 5. Temuan Tambahan Saat Eksekusi, 5a. Endpoint region salah di prefs.json (+24 more)

### Community 150 - "Community 150"
Cohesion: 0.29
Nodes (6): node-appwrite, dependencies, node-appwrite, name, type, version

### Community 152 - "Community 152"
Cohesion: 0.29
Nodes (6): plugin, $schema, skills, paths, .agents/skills, /home/panjiangka1/Documents/dev/marketiv-web/00_BACKEND/.opencode/plugins/graphify.js

### Community 153 - "Community 153"
Cohesion: 0.33
Nodes (5): Design Template, Example: User Profile Update, Quick Reference, Technical Design Document, Three-Perspective Design

### Community 154 - "Community 154"
Cohesion: 0.33
Nodes (5): Backend Error Handling, Error Handling Patterns, Error Response Format, Frontend Error Handling, Quick Reference

### Community 155 - "Community 155"
Cohesion: 0.33
Nodes (5): Controller with Swagger, Controllers & Routing, Global Prefix & Versioning, Nested Routes, Quick Reference

### Community 156 - "Community 156"
Cohesion: 0.33
Nodes (6): Aturan Kerja Proyek, Dokumentasi sebagai Sumber Kebenaran, Pemeliharaan, Referensi, Satu Fakta Satu Lokasi, Service Layer Wajib

### Community 157 - "10_Glossary"
Cohesion: 0.33
Nodes (5): 10_Glossary, Aktor, Campaign & Konten, Finansial, Fraud

### Community 158 - "Community 158"
Cohesion: 0.33
Nodes (6): 30_Naming_Convention, Appwrite Function, Attribute (Appwrite), Collection (Appwrite), File & Komponen Frontend, Route (React Router)

### Community 159 - "Community 159"
Cohesion: 0.33
Nodes (6): 60_Error_Handling, Bentuk Error Standar, Bentuk Return Sukses, Penyajian di UI, Pola Service, Prinsip

### Community 160 - "Community 160"
Cohesion: 0.33
Nodes (6): 70_Testing_Strategy, Critical Flows (Wajib e2e), Fokus Per Layer, Prinsip, Struktur `tests/`, Tooling

### Community 161 - "Community 161"
Cohesion: 0.33
Nodes (6): 80_Deployment, Deploy Appwrite Functions, Deploy Backend (Appwrite Cloud), Deploy Frontend (Vercel), Environment Variables (Frontend / Vercel), Target

### Community 162 - "Community 162"
Cohesion: 0.12
Nodes (15): Approve Submission (`approveSubmission`), Campaigns — Testing, Claim Campaign (`claimCampaign`), Claim Service Layer (`claim.service.ts`), Create Campaign (`createCampaign`), Create Submission (`createSubmission`), Denormalisasi, Generate Brief (`generateBrief`) (+7 more)

### Community 163 - "Community 163"
Cohesion: 0.20
Nodes (9): Chat — Frontend, Chat List (Inbox), Chat Room, `getMyConversations()`, Halaman, Komponen, Service, `setConversationArchived(conversationId, archived)` (+1 more)

### Community 164 - "Chat — Events"
Cohesion: 0.33
Nodes (5): Chat — Events, Event yang Dikonsumsi, Event yang Diterbitkan, Integrasi Notifications, Lihat Juga

### Community 165 - "Community 165"
Cohesion: 0.33
Nodes (6): Attributes, Index, Lihat Juga, `notifications`, Notifications — Database, Permission

### Community 166 - "Community 166"
Cohesion: 0.33
Nodes (6): Appwrite Functions, Arsitektur, Integrasi Eksternal, Notifications — Backend, send-chat-notification, send-notification

### Community 167 - "Community 167"
Cohesion: 0.33
Nodes (5): Komponen, OfferCard, OfferForm, Offers — Frontend, OfferStatusBadge

### Community 168 - "Service Layer (`creator.service.ts`)"
Cohesion: 0.22
Nodes (8): Access Control, Create Rate Card (`createRateCard`), Discovery (via `user.service.ts` `searchCreators`), Get Rate Cards (`getRateCards`), Publish (via Flag Status), Rate Cards — Testing, Service Layer (`creator.service.ts`), Update Rate Card (`updateRateCard`)

### Community 169 - "Community 169"
Cohesion: 0.33
Nodes (5): Discovery Creator, File Manager, Onboarding Creator, Onboarding UMKM, Users — User Flow

### Community 170 - "Community 170"
Cohesion: 0.33
Nodes (5): ADR-003 — `orders` sebagai Aggregate Utama Alur Rate Card, Consequences, Context, Decision, Status

### Community 171 - "Community 171"
Cohesion: 0.33
Nodes (5): ADR-004 — Pisahkan `fraud_checks` dari `campaign_submissions`, Consequences, Context, Decision, Status

### Community 172 - "Community 172"
Cohesion: 0.33
Nodes (5): ADR-005 — Simpan Counter Denormalisasi di `campaigns`, Consequences, Context, Decision, Status

### Community 173 - "Community 173"
Cohesion: 0.33
Nodes (5): ADR-006 — Gunakan Zustand untuk State Management, Bukan Redux, Consequences, Context, Decision, Status

### Community 174 - "Community 174"
Cohesion: 0.33
Nodes (6): ADR-008 — Platform Fee 2% (Per-Modul), Consequences, Context, Decision, Referensi, Status

### Community 175 - "Community 175"
Cohesion: 0.33
Nodes (6): ADR-009 — Minimum Budget Campaign Rp50.000, Consequences, Context, Decision, Referensi, Status

### Community 177 - "Community 177"
Cohesion: 0.40
Nodes (5): 10 Fase Implementasi (Urutan Coding), 6 Sprint (12 Minggu), Prioritas, Referensi, Roadmap Pengembangan

### Community 178 - "Community 178"
Cohesion: 0.33
Nodes (6): 50_Security_Guidelines, Aturan Level Koleksi — permission Appwrite bersifat UNION, Function API Key Scope, Permission Matrix (CRUD per Collection), Pola Document-Level Permission, Tier Akses

### Community 179 - "Community 179"
Cohesion: 0.40
Nodes (4): AI — Overview, Batas Tanggung Jawab, Fitur, Koleksi yang Dimiliki

### Community 180 - "Community 180"
Cohesion: 0.40
Nodes (4): AI Brief Generator, AI — Frontend, Fraud Detection (tidak ada UI khusus), Komponen

### Community 181 - "Community 181"
Cohesion: 0.40
Nodes (4): AI — Events, Event yang Dikonsumsi, Event yang Diterbitkan, Lihat Juga

### Community 182 - "Community 182"
Cohesion: 0.13
Nodes (14): Authentication — Testing, Email Verification Sync (`user-email-verified`), Error Mapping (`mapError`), Forgot Password (`forgotPassword`), Get Current User (`getCurrentUser`), Google OAuth (`loginWithGoogle`), Login (`loginUser`), Logout (`logoutUser`) (+6 more)

### Community 183 - "Community 183"
Cohesion: 0.40
Nodes (5): Authentication — Overview, Batasan Kepemilikan, Ketergantungan, Lihat Juga, Ringkasan

### Community 184 - "Community 184"
Cohesion: 0.40
Nodes (5): Appwrite Auth SDK, Appwrite Functions, Aturan Implementasi, Authentication — Backend, Lihat Juga

### Community 185 - "Community 185"
Cohesion: 0.40
Nodes (4): Aktor, Alur End-to-End, Campaigns — Overview, Koleksi yang Dimiliki

### Community 186 - "Community 186"
Cohesion: 0.40
Nodes (4): Chat — Overview, Inti, Tautan, Tipe Pesan

### Community 187 - "Community 187"
Cohesion: 0.40
Nodes (4): Chat — User Flow, Membuat Offer dari Chat, Memulai Percakapan, Mengirim Pesan

### Community 188 - "Community 188"
Cohesion: 0.20
Nodes (9): Get Notifications (`getNotifications`), Mark All As Read (`markAllAsRead`), Mark As Read (`markAsRead`), Notifications — Testing, Pembuatan Notifikasi (Appwrite Functions), Pengiriman, Service Layer (`notification.service.ts`), Status Baca (+1 more)

### Community 189 - "Community 189"
Cohesion: 0.40
Nodes (5): Arsitektur, Collection yang Dimiliki, Lihat Juga, Notifications — Overview, Ringkasan

### Community 190 - "Community 190"
Cohesion: 0.40
Nodes (5): Kanal, Lihat Juga, Notifications — Business Rules, Status Baca, Trigger

### Community 191 - "Community 191"
Cohesion: 0.40
Nodes (4): Halaman, Komponen, Notification Center, Notifications — Frontend

### Community 192 - "Community 192"
Cohesion: 0.33
Nodes (5): Accept / Reject (`acceptOffer`, `rejectOffer`), Offers — Testing, Order Creation (via Appwrite Function `create-order`), Pembuatan Offer (`createOffer`), Service Layer (`offer.service.ts`)

### Community 193 - "Community 193"
Cohesion: 0.40
Nodes (4): Alur, Inti, Offers — Overview, Tautan

### Community 194 - "Community 194"
Cohesion: 0.40
Nodes (4): Istilah, Konsep, Offers — Concepts, Status Offer

### Community 195 - "Community 195"
Cohesion: 0.40
Nodes (4): Alur, Inti, Orders — Overview, Tautan

### Community 196 - "Community 196"
Cohesion: 0.40
Nodes (4): Istilah, Konsep, Orders — Concepts, Status Order

### Community 197 - "Community 197"
Cohesion: 0.40
Nodes (4): Komponen, Payments — Overview, Prinsip, Tautan

### Community 198 - "Community 198"
Cohesion: 0.40
Nodes (4): Alur Pembayaran Order, Alur Top Up (UMKM), Alur Withdrawal, Payments — User Flow

### Community 199 - "Community 199"
Cohesion: 0.40
Nodes (4): Aktor, Alur, Koleksi yang Dimiliki, Rate Cards — Overview

### Community 200 - "Community 200"
Cohesion: 0.40
Nodes (4): Istilah, Konsep, Rate Cards — Concepts, Status Rate Card

### Community 201 - "Community 201"
Cohesion: 0.40
Nodes (4): Event yang Dikonsumsi, Event yang Diterbitkan, Lihat Juga, Rate Cards — Events

### Community 202 - "Community 202"
Cohesion: 0.40
Nodes (5): Collection yang Dimiliki, Ketergantungan, Lihat Juga, Ringkasan, Users — Overview

### Community 203 - "Community 203"
Cohesion: 0.40
Nodes (4): Event yang Dikonsumsi, Event yang Diterbitkan, Lihat Juga, Users — Events

### Community 204 - "Community 204"
Cohesion: 0.40
Nodes (5): 03_Workflows — Index, Daftar Workflow, Lihat Juga, Prinsip Penulisan, Relasi Antar Workflow

### Community 205 - "Community 205"
Cohesion: 0.18
Nodes (10): ADR-001 — Gunakan Appwrite BaaS, Bukan Backend Custom, Consequences, Context, Decision, Status, ADR-002 — Abstraksi Service Layer Wajib, Consequences, Context (+2 more)

### Community 206 - "Community 206"
Cohesion: 0.06
Nodes (30): 10. Script Konversi, 1. Ringkasan T&C Marketiv V3-1, 22 Pasal — Poin Kunci, 2. Ringkasan Review CTO, 3. Midtrans T&C Template, 3 Temuan CAIO, 4. Ringkasan Review CAIO, 5. Kebutuhan Backend dari Review CAIO (+22 more)

### Community 207 - "Community 207"
Cohesion: 0.40
Nodes (5): ADR-007 — Minimum Withdraw Dipasang sebagai Konstanta Sistem (= Rp50.000), Consequences, Context, Decision, Status

### Community 208 - "Community 208"
Cohesion: 0.25
Nodes (7): dependencies, node-appwrite, node-appwrite, main, name, type, version

### Community 210 - "Community 210"
Cohesion: 0.10
Nodes (18): call(), decrementColumn(), endpointFor(), incrementColumn(), ACTIVE_STATUSES, createIrisPayout(), creditBackReversal(), deterministicLedgerId() (+10 more)

### Community 211 - "Community 211"
Cohesion: 0.50
Nodes (3): 02 — Modules, Daftar Modul, Lihat Juga

### Community 212 - "Community 212"
Cohesion: 0.50
Nodes (3): AI — Testing, Brief Generator (`ai-brief` Function + `generateBrief()` Service), Fraud Detection (`ai-fraud-precheck` Function)

### Community 213 - "Community 213"
Cohesion: 0.50
Nodes (3): AI — Concepts, Istilah, Konsep

### Community 214 - "Community 214"
Cohesion: 0.50
Nodes (3): AI — User Flow, Brief Generator, Fraud Detection

### Community 215 - "Community 215"
Cohesion: 0.07
Nodes (26): 12.2. Kewajiban dan Larangan Kreator, 13.3. Terlepas dari hasil pemeriksaan otomatis, UMKM tetap dapat menyetujui atau menolak Bukti Tayang yang masih berstatus menunggu. Bukti Tayang yang telah ditolak otomatis oleh sistem hanya dapat ditinjau ulang oleh admin., 14.2. Sengketa dapat diajukan oleh UMKM maupun Kreator yang menjadi pihak dalam transaksi terkait, misalnya karena hasil kerja tidak sesuai kesepakatan, Kreator tidak menyerahkan hasil hingga tenggat waktu, atau ketidaksesuaian lain., 5.1. Ketentuan Umum, 5.2. Ketentuan Khusus UMKM, 5.3. Ketentuan Khusus Kreator, 7.3. Custom Offer / Negosiasi, 8.1. Seluruh pembayaran diproses melalui Midtrans sebagai payment gateway. Marketiv tidak menerima pembayaran tunai maupun transfer langsung di luar Platform, dan tidak menyimpan nomor kartu, CVV, atau kredensial pembayaran mentah. (+18 more)

### Community 216 - "Community 216"
Cohesion: 0.50
Nodes (3): Alur Creator, Alur UMKM, Campaigns — User Flow

### Community 217 - "Community 217"
Cohesion: 0.50
Nodes (3): Chat — Concepts, Istilah, Konsep

### Community 218 - "Community 218"
Cohesion: 0.07
Nodes (26): Function Baru, P0 — Blocker Publikasi, P1 — Penting Sebelum MVP Lanjutan, Pengujian Wajib (sebelum sign-off), Perubahan Skema Ringkasan, T-01. Sinkronkan fee platform — keputusan: 2% launch → 5% di 1.000 transaksi, T-02. Implementasi jalur refund (Pasal 15, K-16), T-03. Implementasi status akun + mekanisme banding (Pasal 18, CAIO-02) (+18 more)

### Community 219 - "Community 219"
Cohesion: 0.50
Nodes (3): Alur Deliverable, Alur Order (Rate Card), Orders — User Flow

### Community 220 - "Community 220"
Cohesion: 0.50
Nodes (3): Alur Creator, Alur UMKM, Rate Cards — User Flow

### Community 221 - "Community 221"
Cohesion: 0.29
Nodes (6): call(), decrementColumn(), endpointFor(), incrementColumn(), deterministicNotificationId(), notify()

### Community 222 - "Community 222"
Cohesion: 0.50
Nodes (3): dependencies, @opencode-ai/plugin, @opencode-ai/plugin

### Community 223 - "Authentication — Events"
Cohesion: 0.50
Nodes (4): Authentication — Events, Email Verified, Lihat Juga, User Registered

### Community 227 - "Community 227"
Cohesion: 0.31
Nodes (6): call(), decrementColumn(), endpointFor(), incrementColumn(), deterministicNotificationId(), notify()

### Community 229 - "Community 229"
Cohesion: 0.39
Nodes (4): call(), decrementColumn(), endpointFor(), incrementColumn()

### Community 242 - "Sprint 4 Alur B — Handoff Tunggal"
Cohesion: 0.08
Nodes (25): 0. Ringkasan 1 Menit, A-1 🔴 Deliverable bisa disetujui siapa pun — escrow cair tanpa UMKM, A-2 🔴 `release-escrow` tidak memotong fee 2%, A-3 🔴 Bucket `user-files` membocorkan semua berkas, A-4 🟠 `release-escrow` tidak memeriksa status order, A-5 🟠 `ai-brief` menulis kolom tanpa clamp — brief hilang senyap, A. Temuan Keamanan pada Jalur Uang, B-1. 🔴 Ketatkan permission — gelombang 3 & 4 (+17 more)

### Community 243 - "Audit Live & Pengambilalihan Peran Backend"
Cohesion: 0.08
Nodes (24): 0. Perubahan Wewenang, 1. Cara Mengaudit Ulang, 2. Temuan — 6 Blocker Live, 3. Temuan Terberat — Berkas Unggahan Terbuka Publik, 4. Dua Koreksi atas Catatan Lama, 5. Temuan Tambahan, 6. Runbook — 5 Langkah Tulis ke Production, 6a. Peringatan urutan — `sync-env-all-functions.sh` (+16 more)

### Community 244 - "Perubahan Sisi Appwrite — Sprint 1 Integrasi Frontend"
Cohesion: 0.08
Nodes (24): 10. Yang **tidak** diubah, 1. Ringkasan perubahan, 2. Latar belakang: mengapa ada perubahan skema sama sekali, 3. Perubahan A — rename enum `fesyen` → `fashion`, 4. Perubahan B — kolom `creator_profiles.niche`, 5. Perubahan C — 4 Function DTO baru, 6. Keamanan, 7. Butuh keputusan tim backend (+16 more)

### Community 245 - "Perubahan Sisi Appwrite — Sprint 2 Integrasi Frontend"
Cohesion: 0.08
Nodes (24): 10. Yang **tidak** diubah, 1. Ringkasan perubahan, 2. Perubahan A — `Query` tidak pernah di-import (paling mendesak), 3. Perubahan B — notifikasi tanpa permission baris, 4. Perubahan C — 3 Function DTO baru, 5. Keamanan, 6. ⚠️ Temuan keamanan: `wallets` & `transactions` terbuka untuk semua user, 7. Butuh keputusan tim backend (+16 more)

### Community 246 - "main.js"
Cohesion: 0.20
Nodes (19): call(), decrementColumn(), endpointFor(), incrementColumn(), deterministicId(), deterministicNotificationId(), findEscrowByOrder(), findOrCreateWallet() (+11 more)

### Community 247 - "🚨 Penjelasan Masalah APPWRITE_FUNCTION_API_KEY"
Cohesion: 0.08
Nodes (23): Apa yang Terjadi Saat Runtime, Bukti Lengkap, Cara Kerja Appwrite (Dokumentasi Resmi), Cara Verifikasi (Tanpa Menyalakan Frontend), Fase 1: BUILD (saat deploy pertama kali), Fase 2: RUNTIME (saat Function dijalankan), File Terkait, Kenapa Belum Ketahuan? (+15 more)

### Community 248 - "Verifikasi `dd41686` — Prefix Event Sudah Benar, Tapi Wiring Lain Masih Kosong"
Cohesion: 0.08
Nodes (23): 0. Ringkasan 1 menit, 1. ✅ Yang sudah benar — 8 event database, 2. 🔴 W-1 sampai W-4 — wiring yang masih kosong, 3. 🟡 W-5 — kenapa push tidak membereskannya (ini akar masalahnya), 4. Skrip verifikasi (read-only, bisa dijalankan siapa saja), 5. Urutan uji yang membuktikan semuanya sekaligus, 6. Temuan lain di luar wiring, 7. Yang masih terbuka dari dokumen sebelumnya (+15 more)

### Community 249 - "5. Common Appwrite Console Operations"
Cohesion: 0.09
Nodes (22): 1. Deploy Functions, 2. Sync Environment Variables, 3. Push Database Columns, 4. Backfill / Verify Delete Permissions, 5.10. Database Indexes, 5.1. Update Auth Methods, 5.2. Update Auth Security, 5.3. Manage API Keys (+14 more)

### Community 250 - "review-tnc-marketiv-v3-cto.md"
Cohesion: 0.09
Nodes (22): Halaman 1, Halaman 10, Halaman 11, Halaman 12, Halaman 13, Halaman 14, Halaman 15, Halaman 16 (+14 more)

### Community 251 - "Task List"
Cohesion: 0.09
Nodes (21): Badge sumber views, Banner informasi (info tone), ❌ `CampaignSubmissionCard.tsx`, ❌ Creator Side — `ActiveWorkDetailView.tsx`, Desain Visual (Referensi v5.8), Links, Reward preview inline, Tab 14 — Views Audit & UI Consistency Sprint Plan (+13 more)

### Community 252 - "auth.service.ts"
Cohesion: 0.18
Nodes (20): AuthResult, AuthServiceError, buildAuthResult(), ensureUserRole(), forgotPassword(), getCurrentUser(), getWalletSafe(), LoginInput (+12 more)

### Community 253 - "Prompt — Fee dari Env + Snapshot (T-01) & Hapus Top-Up Reguler (T-19)"
Cohesion: 0.10
Nodes (20): 1. `functions/create-payment/src/main.js`, 1. Satu konstanta dari env, 2. `functions/create-escrow/src/main.js`, 2. Snapshot `fee_rate` ke escrow, 3. Cron `fee-rate-flip` (pemicu 1.000 transaksi), 3. Klien (BACA + sesuaikan minimal — jangan rombak), 4. Docs, 4. Test Phase 2 (wajib) (+12 more)

### Community 254 - "client.mjs"
Cohesion: 0.13
Nodes (14): BACKEND_FIELDS, { endpoint: ENDPOINT, key: KEY }, MANAGED_FIELDS, PASSTHROUGH_FIELDS, q, APPLY, found, argv (+6 more)

### Community 255 - "Campaigns — Views Tracking & Verifikasi Tayangan"
Cohesion: 0.10
Nodes (20): Alur MVP, API yang Digunakan, Aturan Bisnis Views (CTO-01, Pasal 7.1.f–g), Audit Log (T-04), Campaigns — Views Tracking & Verifikasi Tayangan, Cloud Functions Baru (Phase 2), Fraud Enhancement (Phase 2B), Keputusan T-04 (+12 more)

### Community 257 - "main.js"
Cohesion: 0.16
Nodes (13): byKey(), chunk(), countUnread(), deriveStage(), ADR-0008, listAll(), listByIds(), loadContext() (+5 more)

### Community 258 - "main.js"
Cohesion: 0.16
Nodes (13): byKey(), chunk(), countUnread(), deriveStage(), ADR-0008, listAll(), listByIds(), loadContext() (+5 more)

### Community 259 - "Prompt — Kepatuhan Akun: Versi T&C (T-14) & Verifikasi Email (T-15)"
Cohesion: 0.10
Nodes (19): 1. Skema, 1. Skema, 2. Function `user-email-verified` (sinkronisasi status Auth), 2. Simpan saat registrasi, 3. Function `accept-tos` (konsen ulang), 3. Gate withdrawal pertama, 4. Guard TOS di aksi finansial, AKSES CONSOLE APPWRITE — WAJIB VIA MCP (+11 more)

### Community 260 - "Audit Temuan CTO & CAIO vs Dokumentasi & Kode Backend"
Cohesion: 0.10
Nodes (19): Audit Temuan CTO & CAIO vs Dokumentasi & Kode Backend, Bagian A — 7 Blocker P0 CTO, Bagian B — Temuan P1 CTO (26 item), Bagian C — Klausul Hilang (8) — Implikasi Backend, Bagian D — Matriks Konsistensi (Hasil Audit Aktual), Bagian E — Temuan CAIO (3), Bagian F — Temuan Baru Audit (di luar review CTO/CAIO), CAIO-01 — Kepemilikan konten hasil kerja (Pasal 16.3) → ⚠️ SEBAGIAN (+11 more)

### Community 261 - "aw"
Cohesion: 0.16
Nodes (15): aw(), domains, getRow(), getUsers(), key, listRows(), makeRes(), parseJson() (+7 more)

### Community 262 - "Fix Google OAuth Login/Register — Laporan Hasil"
Cohesion: 0.11
Nodes (18): Appwrite OAuth Provider, Bukti Verifikasi, Database Mirror/Profile, Definisi Selesai, Drift Ditemukan, Environment Frontend, File Diubah, Fix Google OAuth Login/Register — Laporan Hasil (+10 more)

### Community 263 - "main.js"
Cohesion: 0.15
Nodes (10): call(), decrementColumn(), endpointFor(), incrementColumn(), creditBackReversal(), deterministicLedgerId(), deterministicNotificationId(), FINAL_STATUSES (+2 more)

### Community 264 - "payment.service.ts"
Cohesion: 0.16
Nodes (17): cancelPayment(), createPayment(), CreatePaymentInput, CreatePaymentResult, getPaidPayments(), getPayment(), getPayments(), GetPaymentsOptions (+9 more)

### Community 265 - "main.js"
Cohesion: 0.16
Nodes (8): chunk(), isBetterSocialAccount(), listAll(), listByIds(), NICHES, number(), resolvePrimarySocialAccounts(), resolveStartingPrices()

### Community 266 - "A. Permintaan Baru"
Cohesion: 0.11
Nodes (17): 0. Kenapa Dokumen Ini Ada Sekarang, A-1 🔴 `create-user-profile` tidak akan pernah jalan lewat event saat register, A-2 🟡 Trigger event `users.*.create` — dipertahankan atau dilepas?, A-3 🟡 Google OAuth — konfigurasi provider & callback, A-4 🔴 URL recovery password harus terdaftar, A-5 🟢 Baris `notifications` tidak bisa dihapus pemiliknya — disengaja?, A-6 🟢 Welcome notification yang didokumentasikan tapi tidak ada, A. Permintaan Baru (+9 more)

### Community 267 - "Prompt — Status Akun: Suspend, Terminate & Banding (T-03)"
Cohesion: 0.11
Nodes (17): 1. Skema, 2. Function `suspend-user` (admin tool), 3. Function `unsuspend-user` (admin tool), 4. Function `create-appeal` (user), 5. Function `review-appeal` (admin, hybrid), 6. Guard `requireActiveUser` di aksi finansial, AKSES CONSOLE APPWRITE — WAJIB VIA MCP, CONSTRAINT — jangan lakukan ini (+9 more)

### Community 268 - "main.js"
Cohesion: 0.15
Nodes (8): ACTIVE_CLAIM_STATUSES, chunk(), hasFreeSlot(), listAll(), listByIds(), listHeldEscrows(), number(), OPEN_ORDER_STATUSES

### Community 269 - "main.js"
Cohesion: 0.17
Nodes (8): chunk(), isBetterSocialAccount(), listAll(), listByIds(), NICHES, number(), pickPrimarySocialAccount(), resolveStartingPrice()

### Community 270 - "main.js"
Cohesion: 0.15
Nodes (6): call(), decrementColumn(), endpointFor(), incrementColumn(), deterministicNotificationId(), notify()

### Community 271 - "Prompt — Withdrawal 4-State + Midtrans Iris + Reversal + KYC + UMKM (T-06)"
Cohesion: 0.12
Nodes (16): 1. Skema, 2. Tulis ulang `request-withdrawal`, 3. Function `withdrawal-callback` (webhook Iris), 4. Function `verify-kyc` (admin tool), 5. Dokumentasi, AKSES CONSOLE APPWRITE — WAJIB VIA MCP, CONSTRAINT — jangan lakukan ini, DEFINISI SELESAI (+8 more)

### Community 272 - "sec-03-role-guard.test.ts"
Cohesion: 0.12
Nodes (5): Databases, Permission, Query, Role, store

### Community 273 - "Review Frontend atas Lapisan Delete/Cancel"
Cohesion: 0.12
Nodes (15): 0. Ringkasan 1 menit, 1. 🔴 T-1 — Unclaim adalah pintu satu arah, 2. 🟠 T-2 — `unclaimed` belum ada di dokumentasi, 3. 🟡 T-3 — Koreksi: frontend tidak bisa import dari `00_BACKEND/`, 4. 🔴 T-4 — Tagihan lama: `create-escrow` & `campaigns.remainingBudget`, 5. Hasil verifikasi klaim kalian, 6. Yang sudah kami kerjakan di sisi frontend, 7. Resolusi Backend (+7 more)

### Community 274 - "Prompt — Refund ke Wallet UMKM (T-02)"
Cohesion: 0.12
Nodes (15): 1. Function `refund-escrow` (inti), 2. Function `refund-order` (jalur otomatis + manual), 3. Jalur otomatis — event `orders.rows.*.update`, 4. Dokumentasi, AKSES CONSOLE APPWRITE — WAJIB VIA MCP, CONSTRAINT — jangan lakukan ini, DEFINISI SELESAI, KONTEKS SISTEM (baca sebelum mulai) (+7 more)

### Community 275 - "Prompt — Views Tracking: Angka Final Terkunci (T-04)"
Cohesion: 0.12
Nodes (15): 1. Skema, 2. `review-submission` — tulis jejak saat approve, 3. `calculate-campaign-reward` — baca angka final, 4. Log sumber data, AKSES CONSOLE APPWRITE — WAJIB VIA MCP, CONSTRAINT — jangan lakukan ini, DEFINISI SELESAI, KONTEKS SISTEM (baca sebelum mulai) (+7 more)

### Community 276 - "Prompt — Auto-Approve Review Rate Card (T-05)"
Cohesion: 0.12
Nodes (15): 1. Skema, 2. Function `track-order-review` (event: deliverable dikirim → set tenggat + revisi), 3. Function cron `auto-approve-orders`, 4. Definisi "satu revisi" — dokumentasi, AKSES CONSOLE APPWRITE — WAJIB VIA MCP, CONSTRAINT — jangan lakukan ini, DEFINISI SELESAI, KONTEKS SISTEM (baca sebelum mulai) (+7 more)

### Community 277 - "main.js"
Cohesion: 0.18
Nodes (7): call(), decrementColumn(), endpointFor(), incrementColumn(), deterministicNotificationId(), notify(), VALID_STATUS

### Community 278 - "Sprint 4 Alur A (Campaign / PPV) — Handoff Frontend"
Cohesion: 0.13
Nodes (14): 0. Ringkasan 1 menit, 1. Temuan arsitektur yang menentukan bentuk pekerjaan ini, 2. 🔴 B-1 — `submission.views` tidak pernah diisi, jadi reward selalu 0, 3. 🟠 B-2 — Tidak ada kolom untuk catatan review, 4. 🔴 B-3 — `claimCampaign` membaca kolom yang tidak ada, 5. Pertanyaan lama yang belum terjawab: claim `expired` mengunci selamanya, 6. Yang kami bangun, 7. Urutan uji yang kami sarankan setelah deploy (+6 more)

### Community 279 - "campaign-asset.service.ts"
Cohesion: 0.22
Nodes (13): addCampaignAsset(), AddCampaignAssetInput, assertCampaignOwner(), ASSET_TYPES, CampaignAsset, CampaignAssetServiceError, CampaignAssetSource, CampaignAssetType (+5 more)

### Community 280 - "Prompt — Perbaikan Integritas Finansial: Wallet & Reward"
Cohesion: 0.13
Nodes (14): AKSES CONSOLE APPWRITE — WAJIB VIA MCP, CONSTRAINT — jangan lakukan ini, DEFINISI SELESAI, FIX A — Reward campaign bisa dikredit dua kali, FIX B — Withdrawal bisa overdraw (saldo negatif), KONTEKS SISTEM (baca sebelum mulai), KONTEKS TUGAS TERKAIT — BACA FILE INI DULU, LAPORAN (format output) (+6 more)

### Community 281 - "Prompt — Metadata Konten: Kreditasi Kreator (T-12) & Penanda AI (T-13)"
Cohesion: 0.13
Nodes (14): 1. Skema — tambah kolom (dua sumber: generator + config), 2. Cek fungsi yang menulis kedua koleksi, 3. Dokumentasi, AKSES CONSOLE APPWRITE — WAJIB VIA MCP, CONSTRAINT — jangan lakukan ini, DEFINISI SELESAI, KONTEKS SISTEM (baca sebelum mulai), KONTEKS TUGAS TERKAIT — BACA FILE INI DULU (+6 more)

### Community 282 - "fund-campaign.mjs"
Cohesion: 0.16
Nodes (10): args, C(), campaignId, DRY, fmt(), FORCE, paymentId, poll() (+2 more)

### Community 283 - "main.js"
Cohesion: 0.29
Nodes (10): call(), decrementColumn(), endpointFor(), incrementColumn(), claimLedgerRow(), deterministicId(), findWallet(), isConflict() (+2 more)

### Community 284 - "loadConfig"
Cohesion: 0.15
Nodes (7): config, DRY, loadConfig(), config, DRY, config, DRY

### Community 285 - "Audit `mark-notifications-read` + `get-umkm-finance-summary` — 2026-08-11"
Cohesion: 0.15
Nodes (12): 1. `mark-notifications-read`, 1. `mark-notifications-read`, 1b. Remediation live `mark-notifications-read`, 2. `get-umkm-finance-summary`, 2. `get-umkm-finance-summary`, 3. `mark-conversation-read`, Audit code + schema, Audit `mark-notifications-read` + `get-umkm-finance-summary` — 2026-08-11 (+4 more)

### Community 286 - "package.json"
Cohesion: 0.15
Nodes (12): dependencies, node-appwrite, devDependencies, vitest, node-appwrite, vitest, main, name (+4 more)

### Community 287 - "main.js"
Cohesion: 0.19
Nodes (7): CAMPAIGN_ESCROW_STATUSES, CAMPAIGN_REFUNDABLE_STATUSES, chunk(), listAll(), listByIds(), listHeldEscrows(), ORDER_AWAITING_RELEASE_STATUSES

### Community 288 - "Konsep Fitur Delete — Draf Diskusi"
Cohesion: 0.15
Nodes (12): 0. Ringkasan 1 menit, 1. Kelas 1 — Layak Hard Delete, 2. Kelas 2 — Layak Soft Delete / Cancel (bukan hard delete), 3. Kelas 3 — Tidak Boleh Delete Sama Sekali, 4. Keputusan & Status Implementasi, 5. Ringkasan Implementasi, Konsep Fitur Delete — Draf Diskusi, Rujukan (+4 more)

### Community 289 - "T-01: Migrasi Fee Platform ke Environment Variables (Pasal 8.2 T&C) — Laporan Hasil"
Cohesion: 0.15
Nodes (12): Bukti Validasi, Definisi Selesai — TERPENUHI ✅, Deployment Live Console (MCP) — VERIFIED ✅, Dokumentasi Diperbarui (24 file), File Berubah (30 file), Perubahan Konfigurasi (3 tempat sinkron), Pola Implementasi (Ditiru dari Codebase Existing), Ringkasan Eksekutif (+4 more)

### Community 290 - "T-02: Implementasi Jalur Refund (Pasal 15 T&C) — Laporan Hasil"
Cohesion: 0.15
Nodes (12): Bukti Validasi, Definisi Selesai — TERPENUHI ✅, Deployment Live Console (MCP) — VERIFIED ✅, Dokumentasi Diperbarui (4 file), File Baru (6 file), Perubahan Konfigurasi (3 tempat sinkron), Pola Implementasi (Ditiru dari Codebase Existing), Ringkasan Eksekutif (+4 more)

### Community 291 - "Withdrawal 4-State + Midtrans Iris (T-06, T-17, T-18, Fix B, Pasal 11 & 15 T&C) — Laporan Hasil"
Cohesion: 0.15
Nodes (12): Baseline Merah (BUKAN regresi — terbukti `git stash` di state bersih), Bukti Validasi, Definisi Selesai — KODE TERPENUHI; DEPLOY PARTAIL, Deployment Live Console (MCP) — VALIDASI ULANG 2026-08-04 (setelah deploy), Dokumentasi Diperbarui (3 file), File Baru (6), Perubahan Konfigurasi (3 file), Pola Implementasi (+4 more)

### Community 292 - "main.js"
Cohesion: 0.21
Nodes (6): CAMPAIGN_ESCROW_STATUSES, chunk(), listAll(), listByIds(), ORDER_CLOSED_STATUSES, sumHeldEscrows()

### Community 293 - "main.js"
Cohesion: 0.21
Nodes (5): createAdminClient(), createDatabasesClient(), findAuthUserByEmail(), hitRateLimit(), rateLimitKey()

### Community 294 - "Blocker — `APPWRITE_FUNCTION_API_KEY` tidak ada saat runtime"
Cohesion: 0.17
Nodes (11): 1. Apa yang terjadi, 2. Yang dikatakan dokumentasi Appwrite, 3. Kenapa ini fatal, bukan sekadar warning, 4. Perbaikan yang disarankan, 5. Cara memverifikasi tanpa menyalakan frontend, 6. Status blocker lain dari handoff Sprint 2, 7. Yang berubah di frontend hari ini, 8. Resolusi — Yang Telah Dilakukan Backend (+3 more)

### Community 295 - "T-14 & T-15: Implementasi T&C & Verifikasi Email (CTO-11 & CTO-10) — Laporan Hasil"
Cohesion: 0.17
Nodes (11): Bukti Validasi, Definisi Selesai — TERPENUHI ✅, Deployment Live Console (MCP) — STATUS TERKINI ✅, Dokumentasi Diperbarui (6 file), File Baru (4 file), Perubahan Konfigurasi (5 file), Pola Implementasi, Ringkasan Eksekutif (+3 more)

### Community 296 - "drift.mjs"
Cohesion: 0.18
Nodes (8): SAFE_FIELDS, backend, byId, cfg, cfgIds, missing, orphan, safe

### Community 297 - "sync-function-vars.mjs"
Cohesion: 0.18
Nodes (6): DRY, failures, fns, FUNCTIONS_DIR, noEnv, onlyIdx

### Community 298 - "Audit Environment Variables Function — Project Marketiv (Live)"
Cohesion: 0.18
Nodes (10): 1. 🔴 KRITIS — Fungsi live TANPA env vars sama sekali (11), 2. 🟠 WARNING — Kurang `APPWRITE_DATABASE_ID`, 3. 🟠 STALE-DEPLOYMENT — Deployment aktif ≠ kode terbaru, 4. 🟡 NILAI SALAH / PLACEHOLDER, 5. 🟢 Lengkap, Audit Environment Variables Function — Project Marketiv (Live), Lampiran — Snapshot vars live (49 fungsi, pasca-fix 2026-08-10), Perbaikan yang disarankan (+2 more)

### Community 299 - "Remediation Audit Live — 2026-08-11"
Cohesion: 0.18
Nodes (10): 1. Aktivasi latest ready deployment, 2. Buat function live yang hilang, 3. Tutup false-positive dari source repo, Command utama, Dampak ke checklist, Remediation Audit Live — 2026-08-11, Sisa kerja yang masih layak dilakukan, Temuan awal (+2 more)

### Community 300 - "Pengaturan Keamanan Webhook Iris (withdrawal-callback)"
Cohesion: 0.18
Nodes (10): Catatan Keamanan, Langkah 1 — Generate secret token, Langkah 2 — Set environment variable di Appwrite, Langkah 3 — Set header di Midtrans Iris, Langkah 4 — Verifikasi, Langkah Setup, Latar Belakang, Mekanisme di Kode (+2 more)

### Community 301 - "main.js"
Cohesion: 0.20
Nodes (3): deterministicNotificationId(), notify(), VALID_PLATFORM

### Community 302 - "Verifikasi Resolusi T-1 & T-4 — Dua Masalah Tersisa"
Cohesion: 0.18
Nodes (10): 0. Ringkasan 1 menit, 1. ✅ V-1 — Hard delete tanpa hak hapus, 2. ✅ V-2 — Top-up campaign menambah uang di dua tempat, 3. Yang kami verifikasi dan hasilnya benar, 4. Penyesuaian di sisi kami, 5. Yang kami kerjakan berikutnya, ✅ Resolved, ✅ Resolved (+2 more)

### Community 303 - "T-05: Auto-Approve Review Rate Card (Pasal 7.2.e-f T&C) — Laporan Hasil"
Cohesion: 0.18
Nodes (10): Definisi Selesai — TERPENUHI ✅, Deployment Live Console (MCP) — VERIFIED ✅, Dokumentasi Diperbarui (4 file), File Berubah (12 file), Perubahan Konfigurasi (3 tempat sinkron), Ringkasan Eksekutif, Risiko Tersisa, T-05: Auto-Approve Review Rate Card (Pasal 7.2.e-f T&C) — Laporan Hasil (+2 more)

### Community 304 - "Report: Implementasi Metadata Transparansi AI & Kreditasi (T-12 & T-13)"
Cohesion: 0.18
Nodes (10): Database Schema Updates (Config & Generator), Definisi Selesai — TERPENUHI ✅, Dokumentasi Diperbarui, Penjagaan Function `updateDocument`, Report: Implementasi Metadata Transparansi AI & Kreditasi (T-12 & T-13), Ringkasan Perubahan (Scope), Risiko Tersisa, Sinkronisasi Appwrite Console Live (Via MCP) — VERIFIED ✅ (+2 more)

### Community 305 - "Rincian Temuan & Kebutuhan Frontend"
Cohesion: 0.18
Nodes (10): 1. F-01: Migrasi Fee Platform (T-01), 2. F-02: Dompet & Withdrawal UMKM (T-02, T-06), 3. F-03: Status Akun "Suspended" & Form Banding (T-03), 4. F-04: Tampilan Auto-Approve & Limit Revisi (T-05), 5. F-05: Withdrawal 4-State & Aturan KYC (T-06), 6. F-06: Verifikasi Views & Kalkulasi Reward Final (T-04), Audit Kebutuhan Frontend vs Implementasi T&C Backend, Kesimpulan (+2 more)

### Community 306 - "P1 — Penting (Penyempurnaan UX & Feedback)"
Cohesion: 0.18
Nodes (10): F-01: Global Account Status Blocker (Suspended State), F-02: Dashboard Keuangan & Withdrawal UMKM, F-03: Penyesuaian UI Form Approval Submission Campaign, F-04: UI Hitung Mundur Auto-Approve Rate Card, F-05: UI Riwayat Withdrawal 4-State & Info KYC, F-06: Penyesuaian Kalkulasi Fee Platform, F-07: Transparansi AI & Kreditasi Kreator, P0 — Blocker Publikasi / Arsitektur Inti (+2 more)

### Community 307 - "audit-live.mjs"
Cohesion: 0.20
Nodes (8): config, DB_ID_OPTIONAL_FUNCTIONS, listAll(), liveBucketById, liveFnById, liveTableById, order, problems

### Community 308 - "Smoke Test Order Flow — 2026-08-11"
Cohesion: 0.20
Nodes (9): Actor smoke, Cancel path, Catatan penting, Evidence hasil, Kesimpulan, Metode eksekusi, Paid path, Smoke Test Order Flow — 2026-08-11 (+1 more)

### Community 309 - "main.js"
Cohesion: 0.24
Nodes (3): createAdminClient(), createUsersClient(), findAuthUserByEmail()

### Community 310 - "🔧 Appwrite Function Events — Prefix TablesDB"
Cohesion: 0.20
Nodes (9): 8 Function yang Terkena, 🔧 Appwrite Function Events — Prefix TablesDB, Catatan, Evolusi Prefix Event Appwrite, File Terkait, Kendala CLI, Resolusi, Ringkasan (+1 more)

### Community 311 - "Phase 1 — FIX A + FIX B (Prompt #0) — Laporan Hasil"
Cohesion: 0.20
Nodes (9): Definisi Selesai — TERPENUHI ✅, Git Diff Scope (4 files), Perubahan Kode (3 file + 1 file baru), Phase 1 — FIX A + FIX B (Prompt #0) — Laporan Hasil, Rekomendasi Phase 2, Ringkasan Eksekutif, Risiko Tersisa (Sesuai Prompt Phase 1), Test Baru — SEMUA HIJAU ✅ (+1 more)

### Community 312 - "T-03: Implementasi Status Akun & Mekanisme Banding (Pasal 18 T&C) — Laporan Hasil"
Cohesion: 0.20
Nodes (9): Bukti Validasi, Definisi Selesai — TERPENUHI ✅, Deployment Live Console — VERIFIED ✅, File Baru & Diubah, Perubahan Konfigurasi (3 tempat sinkron), Pola Implementasi (Ditiru dari Codebase Existing), Ringkasan Eksekutif, Risiko Tersisa (+1 more)

### Community 313 - "inspect-campaign.mjs"
Cohesion: 0.25
Nodes (5): args, C(), campaignId, claimIds, fetchAll()

### Community 316 - "T-04: Implementasi Jejak Views Terkunci — Laporan Hasil"
Cohesion: 0.22
Nodes (8): Definisi Selesai — TERPENUHI ✅, Deployment Live Console (MCP) — VERIFIED ✅, File Diubah (4 file), Perubahan Konfigurasi Database Appwrite (MCP), Pola Implementasi, Ringkasan Eksekutif, T-04: Implementasi Jejak Views Terkunci — Laporan Hasil, Test Diperbarui & Diperbaiki (1 file) — SEMUA HIJAU ✅

### Community 317 - "audit-google-oauth.mjs"
Cohesion: 0.50
Nodes (7): auditOAuthRedirect(), auditPlatforms(), auditProvider(), CHECK_GOOGLE_PAGE, fail(), ok(), warn()

### Community 318 - "package.json"
Cohesion: 0.25
Nodes (7): dependencies, node-appwrite, node-appwrite, main, name, type, version

### Community 319 - "package.json"
Cohesion: 0.25
Nodes (7): dependencies, node-appwrite, node-appwrite, main, name, type, version

### Community 321 - "package.json"
Cohesion: 0.25
Nodes (7): dependencies, node-appwrite, node-appwrite, main, name, type, version

### Community 322 - "package.json"
Cohesion: 0.25
Nodes (7): dependencies, node-appwrite, node-appwrite, main, name, type, version

### Community 324 - "package.json"
Cohesion: 0.25
Nodes (7): dependencies, node-appwrite, node-appwrite, main, name, type, version

### Community 325 - "package.json"
Cohesion: 0.25
Nodes (7): dependencies, node-appwrite, node-appwrite, main, name, type, version

### Community 326 - "package.json"
Cohesion: 0.25
Nodes (7): dependencies, node-appwrite, node-appwrite, main, name, type, version

### Community 327 - "package.json"
Cohesion: 0.25
Nodes (7): dependencies, node-appwrite, node-appwrite, main, name, type, version

### Community 328 - "package.json"
Cohesion: 0.25
Nodes (7): dependencies, node-appwrite, node-appwrite, main, name, type, version

### Community 329 - "package.json"
Cohesion: 0.25
Nodes (7): dependencies, node-appwrite, node-appwrite, main, name, type, version

### Community 330 - "package.json"
Cohesion: 0.25
Nodes (7): dependencies, node-appwrite, node-appwrite, main, name, type, version

### Community 331 - "package.json"
Cohesion: 0.25
Nodes (7): dependencies, node-appwrite, node-appwrite, main, name, type, version

### Community 332 - "package.json"
Cohesion: 0.25
Nodes (7): dependencies, node-appwrite, node-appwrite, main, name, type, version

### Community 333 - "package.json"
Cohesion: 0.25
Nodes (7): dependencies, node-appwrite, node-appwrite, main, name, type, version

### Community 334 - "package.json"
Cohesion: 0.25
Nodes (7): dependencies, node-appwrite, node-appwrite, main, name, type, version

### Community 336 - "package.json"
Cohesion: 0.25
Nodes (7): dependencies, node-appwrite, node-appwrite, main, name, type, version

### Community 337 - "package.json"
Cohesion: 0.25
Nodes (7): dependencies, node-appwrite, node-appwrite, main, name, type, version

### Community 338 - "package.json"
Cohesion: 0.25
Nodes (7): dependencies, node-appwrite, node-appwrite, main, name, type, version

### Community 339 - "package.json"
Cohesion: 0.25
Nodes (7): dependencies, node-appwrite, node-appwrite, main, name, type, version

### Community 340 - "package.json"
Cohesion: 0.25
Nodes (7): dependencies, node-appwrite, node-appwrite, main, name, type, version

### Community 342 - "package.json"
Cohesion: 0.25
Nodes (7): dependencies, node-appwrite, node-appwrite, main, name, type, version

### Community 343 - "package.json"
Cohesion: 0.25
Nodes (7): dependencies, node-appwrite, node-appwrite, main, name, type, version

### Community 344 - "package.json"
Cohesion: 0.25
Nodes (7): dependencies, node-appwrite, node-appwrite, main, name, type, version

### Community 345 - "package.json"
Cohesion: 0.25
Nodes (7): dependencies, node-appwrite, node-appwrite, main, name, type, version

### Community 346 - "package.json"
Cohesion: 0.25
Nodes (7): dependencies, node-appwrite, node-appwrite, main, name, type, version

### Community 347 - "package.json"
Cohesion: 0.25
Nodes (7): dependencies, node-appwrite, node-appwrite, main, name, type, version

### Community 348 - "package.json"
Cohesion: 0.25
Nodes (7): dependencies, node-appwrite, node-appwrite, main, name, type, version

### Community 349 - "package.json"
Cohesion: 0.25
Nodes (7): dependencies, node-appwrite, node-appwrite, main, name, type, version

### Community 350 - "package.json"
Cohesion: 0.25
Nodes (7): dependencies, node-appwrite, node-appwrite, main, name, type, version

### Community 351 - "package.json"
Cohesion: 0.25
Nodes (7): dependencies, node-appwrite, node-appwrite, main, name, type, version

### Community 352 - "package.json"
Cohesion: 0.25
Nodes (7): dependencies, node-appwrite, node-appwrite, main, name, type, version

### Community 353 - "package.json"
Cohesion: 0.25
Nodes (7): dependencies, node-appwrite, node-appwrite, main, name, type, version

### Community 354 - "package.json"
Cohesion: 0.25
Nodes (7): dependencies, node-appwrite, node-appwrite, main, name, type, version

### Community 355 - "package.json"
Cohesion: 0.25
Nodes (7): dependencies, node-appwrite, node-appwrite, main, name, type, version

### Community 356 - "package.json"
Cohesion: 0.25
Nodes (7): dependencies, node-appwrite, node-appwrite, main, name, type, version

### Community 358 - "package.json"
Cohesion: 0.25
Nodes (7): dependencies, node-appwrite, node-appwrite, main, name, type, version

### Community 359 - "Bloker Frontend — Fitur Delete/Cancel"
Cohesion: 0.25
Nodes (7): Bloker Frontend — Fitur Delete/Cancel, ✅ Blokir 1 — Frontend Tidak Bisa Panggil Service (Resolved), ✅ Blokir 2 — Class 1 (Hard Delete) (Resolved), ✅ Blokir 3 — API Contract di `60_API.md` (Resolved), ✅ Blokir 4 — Chat Archive Backend (Resolved), 🔧 Koreksi Arsitektur (Penemuan Penting), Ringkasan Final

### Community 360 - "backfill-delete-permissions.ts"
Cohesion: 0.32
Nodes (7): backfillCollection(), client, databases, hasDeletePermission(), main(), Target, TARGETS

### Community 361 - "Panduan Eksekusi Prompt Backend (Roadmap T&C)"
Cohesion: 0.25
Nodes (7): Aturan Bersama Setiap Prompt (sudah tertulis di tiap file), Daftar Prompt, Dependensi Antar Task (ringkas), Matriks Bentrok File (kenapa urutannya begitu), Panduan Eksekusi Prompt Backend (Roadmap T&C), Status, Urutan WAJIB + Alasan

### Community 362 - "Prompt — Penyusunan Syarat & Ketentuan Marketiv V3.1 (Final)"
Cohesion: 0.25
Nodes (7): CONSTRAINT — jangan lakukan ini, DEFINISI SELESAI, FAKTA IMPLEMENTASI (Source of Truth), KONTEKS SISTEM (baca sebelum mulai), PERAN, Prompt — Penyusunan Syarat & Ketentuan Marketiv V3.1 (Final), TUGAS EKSEKUSI

### Community 363 - "configure-google-oauth.mjs"
Cohesion: 0.29
Nodes (4): APPLY, DISABLE, missing, PROMPT

### Community 366 - "package.json"
Cohesion: 0.29
Nodes (6): dependencies, node-appwrite, node-appwrite, name, type, version

### Community 372 - "require-active-role.test.ts"
Cohesion: 0.29
Nodes (3): DatabasesMock, Query, store

### Community 373 - "inspect-conversations.mjs"
Cohesion: 0.33
Nodes (4): badIds, brokenPerms, FIX, listAllRows()

### Community 374 - "package.json"
Cohesion: 0.33
Nodes (5): dependencies, node-appwrite, node-appwrite, name, type

### Community 379 - "package.json"
Cohesion: 0.33
Nodes (5): dependencies, node-appwrite, node-appwrite, name, type

### Community 381 - "Tests — Marketiv"
Cohesion: 0.33
Nodes (5): Cara Kerja Mock, Catatan Mismatch yang Ditemukan & Sudah Diperbaiki, Menjalankan, Struktur, Tests — Marketiv

### Community 382 - "fix-function-vars.mjs"
Cohesion: 0.40
Nodes (4): DELETE, DRY, SET, varsOf()

### Community 383 - "appwrite/ops"
Cohesion: 0.40
Nodes (4): appwrite/ops, Aturan yang lahir dari insiden, Catatan tentang `appwrite push functions`, Kapan perubahan berlaku

### Community 385 - "verify-delete-permissions.ts"
Cohesion: 0.40
Nodes (3): client, databases, TARGETS

### Community 390 - "harden-permissions.mjs"
Cohesion: 0.50
Nodes (3): BUCKET_TARGETS, DRY, TARGETS

### Community 391 - "taste.md"
Cohesion: 0.50
Nodes (3): file-upload, tech-stack, workflow

### Community 392 - "Domain Model — ERD Tingkat Tinggi"
Cohesion: 0.50
Nodes (4): Catatan Pemodelan, Domain Model — ERD Tingkat Tinggi, ERD Sederhana (Relationship Tree), Kelompok Domain & Modul Pemilik

### Community 393 - "Notifications — User Flow"
Cohesion: 0.50
Nodes (3): Membaca Notifikasi, Menerima Notifikasi, Notifications — User Flow

### Community 395 - "sync-env-all-functions.sh"
Cohesion: 0.83
Nodes (3): is_secret(), sync-env-all-functions.sh script, sync_function()

## Knowledge Gaps
- **2808 isolated node(s):** `$schema`, `.agents/skills`, `/home/panjiangka1/Documents/dev/marketiv-web/00_BACKEND/.opencode/plugins/graphify.js`, `@opencode-ai/plugin`, `DRY` (+2803 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **27 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `Campaigns — API` connect `Community 24` to `Offers — Testing`?**
  _High betweenness centrality (0.005) - this node is a cross-community bridge._
- **Why does `Users — API` connect `Community 69` to `Orders — Testing`?**
  _High betweenness centrality (0.004) - this node is a cross-community bridge._
- **What connects `$schema`, `.agents/skills`, `/home/panjiangka1/Documents/dev/marketiv-web/00_BACKEND/.opencode/plugins/graphify.js` to the rest of the system?**
  _2809 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `00_Index.md` be split into smaller, more focused modules?**
  _Cohesion score 0.09581646423751687 - nodes in this community are weakly interconnected._
- **Should `AGENTS.md` be split into smaller, more focused modules?**
  _Cohesion score 0.04521276595744681 - nodes in this community are weakly interconnected._
- **Should `Users — Database` be split into smaller, more focused modules?**
  _Cohesion score 0.11264367816091954 - nodes in this community are weakly interconnected._
- **Should `README.md` be split into smaller, more focused modules?**
  _Cohesion score 0.048625792811839326 - nodes in this community are weakly interconnected._