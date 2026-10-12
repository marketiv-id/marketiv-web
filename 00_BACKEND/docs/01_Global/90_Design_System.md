# 90_Design_System

**Pemilik tunggal design token Marketiv.** Token didefinisikan sebagai CSS variable Tailwind CSS 4 di `src/app/globals.css` (blok `:root` jembatan shadcn/ui + blok `@theme`); admin memakai salinan di `admin/src/app/globals.css`. Tidak ada folder `src/design-system/`. Referensi visual: `docs/design-system/marketiv-studio-system-v5-8.html` (root repo). Target UI: simple, mobile-first, hemat warna, fokus CTA.

## Prinsip

- **Simplicity First** — UMKM paham dashboard < 5 menit; hindari terlalu banyak menu/grafik/tombol.
- **Action Driven** — tiap halaman punya satu CTA utama (mis. Buat Campaign, Kirim Offer, Review Draft).
- **Mobile First** — prioritas Mobile → Tablet → Desktop.
- **Reduced motion** dihormati (`prefers-reduced-motion` mematikan animasi).

## Warna (`@theme` di `globals.css`)

- **Primary — Marketiv Orange**: `primary-50 #fff7ed` … `primary-500 #f97316` (default `--color-primary`, `--primary`, `--ring`) … `primary-900 #7c2d12` → button primary, link, active state.
- **Secondary — Deep Navy/Blue**: `secondary-50 #eef6ff` … `secondary-500 #1f7fd4` … `secondary-900 #102033`.
- **Status** (masing-masing punya varian `-soft` dan `-strong`):
  - Success `#16a34a` → payment success / approved / completed.
  - Warning `#d97706` → pending / waiting review / escrow.
  - Danger `#dc2626` (= `--destructive`) → rejected / fraud / cancelled.
  - Info `#2563eb`.
- **Neutral/Surface**: background `#fbf7ef`, card `#fffdf8`, foreground `#111827`, muted foreground `#737f91`, border `rgba(17,24,39,.10)`; skala `--color-neutral-*` hangat (`#fafaf7`, `#f8f5ef`, …).
- **Sidebar**: `--sidebar #0c172b` (navy gelap) dengan aksen primary.
- **Chart**: `--chart-1 #f97316`, `--chart-2 #1e3a5f`, `--chart-3 #16a34a`, `--chart-4 #2563eb`, `--chart-5 #7c3aed`.
- Mode gelap: kelas `.dark` saat ini placeholder (nilai sama dengan terang).

## Tipografi

- Font dimuat via `next/font/google` di `src/app/layout.tsx`: **Plus Jakarta Sans** (`--font-sans`, body) dan **Sora** (`--font-display`, heading/display); fallback Inter, system-ui.

## Border Radius

- Basis `--radius: 12px`.
- Skala: `radius-sm 8px`, `radius-md 12px`, `radius-lg 16px`, `radius-xl 20px`, `radius-2xl 24px`.

## Shadow

- Umum: `shadow-xs 0 1px 2px rgba(16,32,51,.04)`, `shadow-sm 0 4px 12px rgba(16,32,51,.06)`, `shadow-md 0 12px 28px rgba(16,32,51,.08)`, `shadow-lg 0 20px 48px rgba(16,32,51,.10)`.
- Khusus area: `shadow-kreator-*` (ungu/biru untuk dashboard kreator), `shadow-finance-action*` (oranye untuk aksi keuangan).

## Spacing

- Mengikuti skala bawaan Tailwind (kelipatan 4px); tidak ada token spacing kustom.

## Inventaris Komponen

**Dasar** (`src/components/ui/`, gaya shadcn di atas Radix UI): button, input, textarea, select/`marketiv-select`, checkbox, radio-group, switch, slider, form, label, card, `metric-card`, badge, avatar, dialog, alert-dialog, `confirm-dialog`, `responsive-modal`, drawer, sheet, popover, hover-card, tooltip, dropdown-menu, context-menu, menubar, navigation-menu, tabs, table, pagination, breadcrumb, accordion, collapsible, carousel, calendar, chart (recharts), progress, skeleton, `empty-state`, `creator-states`/`creator-skeletons`, sonner (toast), sidebar, input-otp, `MarketivLogo`.

**Dashboard** (`src/components/features/dashboard/`): `DashboardShell`, `DashboardSidebar`, `DashboardTopbar`, `DashboardHero`, `DashboardCard`, `CampaignCard`, `CampaignGrid`, `StatusBadge`, `ProgressBar`; `shared/` (`DashboardBadge`, `DashboardButton`, `DashboardStateCard`, `MarketplaceCard`, `LogoutConfirmDialog`, `HelpAdminModal`, …).

**Fitur**: `umkm-dashboard/` (overview, campaign, create-campaign, creators, negotiation, ratecard-review, finance, analytics, settings), `creator-dashboard/` (Job Pool, Pekerjaan Aktif, negosiasi, modals), `chatbot/` (`ChatbotPanel`), `auth/`, `landing/`, `onboarding/`, `legal/`.

**AI di UI**: AI Brief Generator di wizard buat campaign (`CreateCampaignWizard`); chatbot (`ChatbotPanel` → `/api/chat`). Komponen badge skor fraud khusus belum diimplementasikan (admin app belum menampilkan `fraudScore`).

## Layout Dashboard

- **UMKM** (`DashboardSidebar`): Ringkasan, Kampanye, Kreator, Negosiasi, Tinjauan Pekerjaan, Keuangan, Analitik, Notifikasi.
- **Creator** (`CreatorDashboardSidebar`): Ringkasan, Lowongan (Job Pool), Pekerjaan Aktif, Paket Harga (Rate Card), Negosiasi, Keuangan, Notifikasi.
- **Admin** (app `admin/`, `AdminSidebar`): Dashboard, Submissions, Rate Card Validations, Withdrawals.

## Navigasi

- Desktop: sidebar fixed (logo, menu, user menu).
- Mobile: sidebar shadcn berubah menjadi `Sheet` (`src/components/ui/sidebar.tsx`, `use-mobile.ts`). Bottom navigation belum diimplementasikan.
