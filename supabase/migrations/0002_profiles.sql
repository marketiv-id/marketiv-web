-- =============================================================================
-- 0002_profiles — profil UMKM & kreator, akun sosial, portofolio.
-- Semua kolom *_id / creator_id berisi ID user (bukan $id baris profil),
-- sesuai data Appwrite (audit Fase 0: semua merujuk ID Auth).
-- =============================================================================

-- -----------------------------------------------------------------------------
-- umkm_profiles — satu per user UMKM.
-- `category` dibiarkan teks bebas: kode menulis id niche (kuliner, fashion, …)
-- tetapi create-user-profile menulis '' dan nilai bebas dari prefs.
-- -----------------------------------------------------------------------------
create table public.umkm_profiles (
  id text primary key default gen_random_uuid()::text,
  user_id uuid not null unique references public.users (id) on delete cascade,
  business_name text not null check (char_length(business_name) <= 255),
  category text not null default '' check (char_length(category) <= 100),
  description text check (char_length(description) <= 2000),
  city text check (char_length(city) <= 100),
  tiktok text check (char_length(tiktok) <= 255),
  logo_url text check (char_length(logo_url) <= 2048),
  is_profile_completed boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index umkm_profiles_city_idx on public.umkm_profiles (city);
create index umkm_profiles_category_idx on public.umkm_profiles (category);
create index umkm_profiles_is_profile_completed_idx on public.umkm_profiles (is_profile_completed);

-- -----------------------------------------------------------------------------
-- creator_profiles — satu per user kreator.
-- -----------------------------------------------------------------------------
create table public.creator_profiles (
  id text primary key default gen_random_uuid()::text,
  user_id uuid not null unique references public.users (id) on delete cascade,
  display_name text not null check (char_length(display_name) <= 255),
  bio text check (char_length(bio) <= 2000),
  city text check (char_length(city) <= 100),
  avatar_url text check (char_length(avatar_url) <= 2048),
  banner_url text check (char_length(banner_url) <= 2048),
  niche text check (niche in ('kuliner', 'fashion', 'pariwisata', 'edukasi', 'kecantikan', 'lainnya')),
  total_followers integer not null default 0 check (total_followers >= 0),
  total_orders integer not null default 0 check (total_orders >= 0),
  rating numeric(4, 2) not null default 0 check (rating >= 0),
  is_profile_completed boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index creator_profiles_display_name_idx on public.creator_profiles (display_name);
create index creator_profiles_city_idx on public.creator_profiles (city);
create index creator_profiles_niche_idx on public.creator_profiles (niche);
create index creator_profiles_rating_idx on public.creator_profiles (rating);
create index creator_profiles_total_followers_idx on public.creator_profiles (total_followers);
create index creator_profiles_is_profile_completed_idx on public.creator_profiles (is_profile_completed);

-- -----------------------------------------------------------------------------
-- creator_social_accounts — satu akun per (kreator, platform). Unique baru untuk
-- idempotensi upsert (Appwrite hanya punya index biasa).
-- -----------------------------------------------------------------------------
create table public.creator_social_accounts (
  id text primary key default gen_random_uuid()::text,
  creator_id uuid not null references public.users (id) on delete cascade,
  platform text not null check (platform in ('tiktok', 'instagram', 'youtube')),
  username text not null check (char_length(username) <= 255),
  followers integer not null default 0 check (followers >= 0),
  engagement_rate numeric(7, 4) not null default 0 check (engagement_rate >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint creator_social_accounts_creator_id_platform_key unique (creator_id, platform)
);

create index creator_social_accounts_platform_idx on public.creator_social_accounts (platform);
create index creator_social_accounts_followers_idx on public.creator_social_accounts (followers);

-- -----------------------------------------------------------------------------
-- creator_portfolios
-- -----------------------------------------------------------------------------
create table public.creator_portfolios (
  id text primary key default gen_random_uuid()::text,
  creator_id uuid not null references public.users (id) on delete cascade,
  title text not null check (char_length(title) <= 255),
  description text check (char_length(description) <= 2000),
  thumbnail_url text check (char_length(thumbnail_url) <= 2048),
  portfolio_url text check (char_length(portfolio_url) <= 2048),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index creator_portfolios_creator_id_idx on public.creator_portfolios (creator_id);

-- -----------------------------------------------------------------------------
-- Trigger updated_at + RLS
-- -----------------------------------------------------------------------------
create trigger set_updated_at before update on public.umkm_profiles
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.creator_profiles
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.creator_social_accounts
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.creator_portfolios
  for each row execute function public.set_updated_at();

alter table public.umkm_profiles enable row level security;
alter table public.creator_profiles enable row level security;
alter table public.creator_social_accounts enable row level security;
alter table public.creator_portfolios enable row level security;
