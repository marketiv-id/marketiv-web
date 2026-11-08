-- =============================================================================
-- 0003_files — kuota storage per user dan registry file user.
-- bucket_id mengikuti ID bucket Appwrite lama; bucket Supabase dibuat di Fase 3
-- dengan ID yang sama.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- user_storage_usage — satu baris per user. Byte memakai bigint (Appwrite
-- integer dibatasi 999.999.999 ≈ 953 MiB; Postgres tidak perlu batas itu).
-- -----------------------------------------------------------------------------
create table public.user_storage_usage (
  id text primary key default gen_random_uuid()::text,
  user_id uuid not null unique references public.users (id) on delete cascade,
  used_bytes bigint not null default 0 check (used_bytes >= 0),
  quota_bytes bigint not null default 104857600 check (quota_bytes >= 0),
  file_count integer not null default 0 check (file_count >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- -----------------------------------------------------------------------------
-- user_files — registry file yang diunggah lewat validate-and-upload.
-- Soft delete: status 'deleted' + deleted_at.
-- -----------------------------------------------------------------------------
create table public.user_files (
  id text primary key default gen_random_uuid()::text,
  user_id uuid not null references public.users (id) on delete cascade,
  storage_file_id text not null check (char_length(storage_file_id) <= 255),
  bucket_id text not null check (bucket_id in (
    'avatars', 'creator-banners', 'logos', 'portfolios',
    'campaign-assets', 'deliverables', 'fraud-evidence', 'user-files'
  )),
  file_name text not null check (char_length(file_name) <= 255),
  mime_type text not null check (char_length(mime_type) <= 100),
  size_bytes bigint not null check (size_bytes >= 0),
  status text not null default 'active' check (status in ('active', 'deleted')),
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint user_files_storage_file_id_key unique (storage_file_id),
  -- deleted_at hanya boleh terisi pada file berstatus 'deleted'.
  constraint user_files_deleted_at_check check (deleted_at is null or status = 'deleted')
);

create index user_files_user_id_status_idx on public.user_files (user_id, status);
create index user_files_status_created_at_idx on public.user_files (status, created_at desc);

-- -----------------------------------------------------------------------------
-- Trigger updated_at + RLS
-- -----------------------------------------------------------------------------
create trigger set_updated_at before update on public.user_storage_usage
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.user_files
  for each row execute function public.set_updated_at();

alter table public.user_storage_usage enable row level security;
alter table public.user_files enable row level security;
