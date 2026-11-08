-- =============================================================================
-- 0001_core_users — fondasi skema Marketiv (migrasi Appwrite → Supabase, Fase 2)
--
-- Konvensi (lihat docs/marketiv-supabase-migration-v1/02-fondasi-skema.md):
--   * Row PK   : id text primary key default gen_random_uuid()::text.
--                ID Appwrite lama ($id) dipertahankan saat migrasi data.
--   * User ref : uuid, FK ke public.users(id). public.users.id = auth.users.id.
--                ID Auth Appwrite lama dipetakan lewat public.legacy_user_map.
--   * Uang     : bigint not null default 0 check (>= 0), satuan rupiah.
--   * Enum     : text + CHECK (col in (...)); daftar nilai diambil dari kode
--                (termasuk nilai yang hanya dibandingkan), bukan hanya dari config.
--   * Waktu    : created_at / updated_at timestamptz + trigger set_updated_at().
--                Kolom `createdAt` buatan app di Appwrite digabung ke created_at.
--   * RLS      : aktif di semua tabel, TANPA policy (policy dibuat di Fase 3).
--                Akibatnya anon/authenticated tidak bisa membaca apa pun dulu;
--                service_role (melewati RLS) tetap bisa.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Trigger bersama: isi updated_at setiap UPDATE.
-- -----------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

comment on function public.set_updated_at() is
  'Trigger BEFORE UPDATE: mengisi kolom updated_at dengan now().';

-- -----------------------------------------------------------------------------
-- users — profil inti per akun. PK = auth.users.id.
-- Appwrite: tabel `users`. Kolom `userId` (ID Auth lama) pindah ke legacy_user_map;
-- `$id` lama baris users dibuang (tidak dirujuk tabel mana pun, audit Fase 0 A6).
-- `role` di sini hanya data profil. Otorisasi admin TIDAK boleh membaca kolom ini
-- (celah #1/#5); sumber kebenaran role = auth.users.raw_app_meta_data (Fase 4).
-- -----------------------------------------------------------------------------
create table public.users (
  id uuid primary key references auth.users (id) on delete cascade,
  role text not null check (role in ('umkm', 'creator', 'admin')),
  status text not null default 'active' check (status in ('active', 'suspended', 'terminated')),
  email text not null check (char_length(email) <= 255),
  phone text check (char_length(phone) <= 50),
  address text check (char_length(address) <= 500),
  suspended_at timestamptz,
  tos_version text check (char_length(tos_version) <= 20),
  tos_accepted_at timestamptz,
  email_verified_at timestamptz,
  kyc_status text not null default 'none' check (kyc_status in ('none', 'pending_wa', 'verified')),
  kyc_verified_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint users_email_key unique (email)
);

create index users_role_idx on public.users (role);
create index users_status_idx on public.users (status);

comment on table public.users is 'Profil inti user. id = auth.users.id. Appwrite: users.';
comment on column public.users.role is
  'Role profil (umkm/creator/admin). BUKAN sumber otorisasi; pakai app_metadata.role.';

-- -----------------------------------------------------------------------------
-- legacy_user_map — ID Auth Appwrite lama → UUID Supabase.
-- Merujuk auth.users (bukan public.users) karena ada akun Auth tanpa baris
-- users (audit Fase 0 A5). Tidak untuk dibaca browser.
-- -----------------------------------------------------------------------------
create table public.legacy_user_map (
  legacy_user_id text primary key check (char_length(legacy_user_id) <= 255),
  user_id uuid not null unique references auth.users (id) on delete cascade,
  legacy_users_row_id text check (char_length(legacy_users_row_id) <= 255),
  migrated_at timestamptz not null default now()
);

comment on table public.legacy_user_map is
  'Peta ID Auth Appwrite lama (users.userId) → auth.users.id. Diisi saat migrasi data.';
comment on column public.legacy_user_map.legacy_users_row_id is
  'Nilai $id lama baris tabel users Appwrite (≠ ID Auth), hanya untuk audit.';

-- -----------------------------------------------------------------------------
-- otp_rate_limits — rate limit OTP per key (hash email+ip). Tanpa FK user.
-- -----------------------------------------------------------------------------
create table public.otp_rate_limits (
  id text primary key default gen_random_uuid()::text,
  key text not null check (char_length(key) <= 64),
  email text not null check (char_length(email) <= 255),
  ip text not null check (char_length(ip) <= 100),
  count integer not null default 0 check (count >= 0),
  window_start timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint otp_rate_limits_key_key unique (key)
);

create index otp_rate_limits_email_idx on public.otp_rate_limits (email);
create index otp_rate_limits_ip_idx on public.otp_rate_limits (ip);
create index otp_rate_limits_updated_at_idx on public.otp_rate_limits (updated_at);

-- -----------------------------------------------------------------------------
-- appeals — banding atas tindakan admin (suspend, dll.).
-- -----------------------------------------------------------------------------
create table public.appeals (
  id text primary key default gen_random_uuid()::text,
  user_id uuid not null references public.users (id) on delete cascade,
  action_ref text not null check (char_length(action_ref) <= 255),
  reason text not null check (char_length(reason) <= 1000),
  evidence text check (char_length(evidence) <= 2048),
  deadline_at timestamptz not null,
  sla_decided_at timestamptz not null,
  status text not null default 'submitted'
    check (status in ('submitted', 'under_review', 'approved', 'rejected')),
  decision text check (char_length(decision) <= 1000),
  decided_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index appeals_user_id_status_idx on public.appeals (user_id, status);
create index appeals_status_idx on public.appeals (status);

-- -----------------------------------------------------------------------------
-- notifications — notifikasi in-app (realtime di Fase 6).
-- Nilai `type` = semua string yang ditulis Functions lama + yang dibandingkan UI.
-- ID deterministik lama (`ntf…`, `tx…`) dipertahankan.
-- -----------------------------------------------------------------------------
create table public.notifications (
  id text primary key default gen_random_uuid()::text,
  user_id uuid not null references public.users (id) on delete cascade,
  title text not null check (char_length(title) <= 255),
  message text not null check (char_length(message) <= 1000),
  type text not null check (type in (
    'system', 'keuangan', 'campaign', 'campaign_published', 'claim', 'claim_expired',
    'reward', 'reward_matured', 'escrow_held', 'escrow_released',
    'order', 'order_created', 'order_completed', 'order_tos_blocked',
    'offer_created', 'offer_rejected', 'refund', 'chat_message',
    'deliverable_submitted', 'revision_requested', 'submission_approved',
    'withdrawal', 'payment'
  )),
  is_read boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index notifications_user_id_created_at_idx on public.notifications (user_id, created_at desc);
create index notifications_user_id_unread_idx on public.notifications (user_id) where not is_read;

-- -----------------------------------------------------------------------------
-- ai_requests — log pemakaian fitur AI.
-- -----------------------------------------------------------------------------
create table public.ai_requests (
  id text primary key default gen_random_uuid()::text,
  user_id uuid not null references public.users (id) on delete cascade,
  feature text not null check (feature in ('brief', 'fraud', 'landing')),
  prompt text not null check (char_length(prompt) <= 5000),
  response text check (char_length(response) <= 10000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index ai_requests_user_id_created_at_idx on public.ai_requests (user_id, created_at desc);
create index ai_requests_feature_idx on public.ai_requests (feature);

-- -----------------------------------------------------------------------------
-- Trigger updated_at + RLS
-- -----------------------------------------------------------------------------
create trigger set_updated_at before update on public.users
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.otp_rate_limits
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.appeals
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.notifications
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.ai_requests
  for each row execute function public.set_updated_at();

alter table public.users enable row level security;
alter table public.legacy_user_map enable row level security;
alter table public.otp_rate_limits enable row level security;
alter table public.appeals enable row level security;
alter table public.notifications enable row level security;
alter table public.ai_requests enable row level security;

-- Tabel internal: tidak pernah dibaca browser, jadi hak akses role API dicabut
-- (pertahanan berlapis di atas RLS). service_role tetap punya akses.
revoke all on table public.legacy_user_map from anon, authenticated;
revoke all on table public.otp_rate_limits from anon, authenticated;
