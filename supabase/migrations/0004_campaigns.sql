-- =============================================================================
-- 0004_campaigns — campaign, brief, aset, klaim, submission, fraud check.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- campaigns
-- `category` teks bebas (lihat umkm_profiles.category).
-- `status`: draft/active/paused/completed ditulis kode; cancelled dibandingkan
-- refund-order (REFUNDABLE_CAMPAIGN_STATUSES). `full` hanya tab UI, tidak disimpan.
-- -----------------------------------------------------------------------------
create table public.campaigns (
  id text primary key default gen_random_uuid()::text,
  umkm_id uuid not null references public.users (id) on delete restrict,
  title text not null check (char_length(title) <= 255),
  category text not null check (char_length(category) <= 100),
  type text not null check (type in ('ugc', 'clipping')),
  platforms text[] not null default array['tiktok']::text[]
    check (cardinality(platforms) >= 1 and platforms <@ array['tiktok', 'instagram', 'youtube']::text[]),
  description text check (char_length(description) <= 2000),
  budget bigint not null default 0 check (budget >= 0),
  reward_per_1000_views bigint not null default 0 check (reward_per_1000_views >= 0),
  status text not null default 'draft'
    check (status in ('draft', 'active', 'paused', 'completed', 'cancelled')),
  claim_limit integer not null default 0 check (claim_limit >= 0),
  submission_days integer not null default 7 check (submission_days >= 0),
  total_claims integer not null default 0 check (total_claims >= 0),
  spent_amount bigint not null default 0 check (spent_amount >= 0),
  remaining_budget bigint not null default 0 check (remaining_budget >= 0),
  published_at timestamptz,
  thumbnail_url text not null default '' check (char_length(thumbnail_url) <= 2048),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index campaigns_umkm_id_idx on public.campaigns (umkm_id);
create index campaigns_status_idx on public.campaigns (status);
create index campaigns_category_idx on public.campaigns (category);
create index campaigns_published_at_idx on public.campaigns (published_at desc);
create index campaigns_remaining_budget_idx on public.campaigns (remaining_budget);

-- -----------------------------------------------------------------------------
-- campaign_briefs — GABUNGAN tabel Appwrite `campaign_briefs` (lama) dan
-- `6ab530d00018edb50097` (campaign_briefs_v2, yang aktif). Bila satu campaign
-- punya brief di keduanya, baris v2 yang dipakai.
-- `do_and_dont` = {"do": string[], "dont": string[]} (dulu JSON string ≤ 400 char).
-- `materials`  = string[] (dulu materialsJson, tidak pernah ditulis kode).
-- -----------------------------------------------------------------------------
create table public.campaign_briefs (
  id text primary key default gen_random_uuid()::text,
  campaign_id text not null unique references public.campaigns (id) on delete cascade,
  objective text check (char_length(objective) <= 2000),
  content_angle text check (char_length(content_angle) <= 2000),
  cta text check (char_length(cta) <= 1000),
  brief_detail text check (char_length(brief_detail) <= 10000),
  do_and_dont jsonb check (do_and_dont is null or jsonb_typeof(do_and_dont) = 'object'),
  materials jsonb not null default '[]'::jsonb check (jsonb_typeof(materials) = 'array'),
  generated_by_ai boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- -----------------------------------------------------------------------------
-- campaign_assets — aset campaign. Saat ini hanya link eksternal.
-- `source`: 'external' (frontend) dan 'external_url' (service lama) sama artinya;
-- dinormalisasi saat refactor tulis (Fase 7).
-- -----------------------------------------------------------------------------
create table public.campaign_assets (
  id text primary key default gen_random_uuid()::text,
  campaign_id text not null references public.campaigns (id) on delete cascade,
  source text not null check (source in ('external', 'external_url', 'storage')),
  type text not null check (type in ('link', 'image', 'video', 'document')),
  file_url text not null check (char_length(file_url) <= 2048),
  file_name text check (char_length(file_name) <= 255),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index campaign_assets_campaign_id_idx on public.campaign_assets (campaign_id);

-- -----------------------------------------------------------------------------
-- campaign_claims — kreator mengklaim slot campaign.
-- Klaim aktif (status ≠ 'expired') unik per (campaign, kreator), sesuai guard
-- di claimCampaignInAppwrite / claim.service.ts. Klaim expired = riwayat.
-- -----------------------------------------------------------------------------
create table public.campaign_claims (
  id text primary key default gen_random_uuid()::text,
  campaign_id text not null references public.campaigns (id) on delete cascade,
  creator_id uuid not null references public.users (id) on delete cascade,
  status text not null default 'claimed'
    check (status in ('claimed', 'submitted', 'approved', 'rejected', 'expired')),
  claimed_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index campaign_claims_active_key
  on public.campaign_claims (campaign_id, creator_id)
  where status <> 'expired';
create index campaign_claims_campaign_id_idx on public.campaign_claims (campaign_id);
create index campaign_claims_creator_id_idx on public.campaign_claims (creator_id);
create index campaign_claims_status_idx on public.campaign_claims (status);
create index campaign_claims_claimed_at_idx on public.campaign_claims (claimed_at desc);

-- -----------------------------------------------------------------------------
-- campaign_submissions — bukti konten per klaim (satu per klaim).
-- -----------------------------------------------------------------------------
create table public.campaign_submissions (
  id text primary key default gen_random_uuid()::text,
  claim_id text not null unique references public.campaign_claims (id) on delete restrict,
  campaign_id text not null references public.campaigns (id) on delete restrict,
  creator_id uuid not null references public.users (id) on delete restrict,
  platform text not null check (platform in ('tiktok', 'instagram', 'youtube')),
  post_url text not null check (char_length(post_url) <= 2048),
  caption text check (char_length(caption) <= 1000),
  views bigint not null default 0 check (views >= 0),
  views_count bigint check (views_count >= 0),
  views_captured_at timestamptz,
  views_source text check (views_source in ('api', 'scrape', 'manual_admin')),
  views_final boolean not null default false,
  engagement bigint check (engagement >= 0),
  fraud_score integer check (fraud_score >= 0),
  fraud_status text check (fraud_status in ('safe', 'review', 'rejected')),
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  review_notes text check (char_length(review_notes) <= 1000),
  creator_credit text check (char_length(creator_credit) <= 255),
  ai_generated boolean not null default false,
  ai_disclosed boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index campaign_submissions_campaign_id_idx on public.campaign_submissions (campaign_id);
create index campaign_submissions_creator_id_idx on public.campaign_submissions (creator_id);
create index campaign_submissions_status_idx on public.campaign_submissions (status);
create index campaign_submissions_fraud_status_idx on public.campaign_submissions (fraud_status);

-- -----------------------------------------------------------------------------
-- fraud_checks — hasil AI fraud precheck per submission.
-- -----------------------------------------------------------------------------
create table public.fraud_checks (
  id text primary key default gen_random_uuid()::text,
  submission_id text not null references public.campaign_submissions (id) on delete cascade,
  score integer not null check (score >= 0),
  result text not null check (result in ('safe', 'review', 'rejected')),
  reason text check (char_length(reason) <= 2000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index fraud_checks_submission_id_idx on public.fraud_checks (submission_id);
create index fraud_checks_result_idx on public.fraud_checks (result);
create index fraud_checks_created_at_idx on public.fraud_checks (created_at desc);

-- -----------------------------------------------------------------------------
-- Trigger updated_at + RLS
-- -----------------------------------------------------------------------------
create trigger set_updated_at before update on public.campaigns
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.campaign_briefs
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.campaign_assets
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.campaign_claims
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.campaign_submissions
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.fraud_checks
  for each row execute function public.set_updated_at();

alter table public.campaigns enable row level security;
alter table public.campaign_briefs enable row level security;
alter table public.campaign_assets enable row level security;
alter table public.campaign_claims enable row level security;
alter table public.campaign_submissions enable row level security;
alter table public.fraud_checks enable row level security;
