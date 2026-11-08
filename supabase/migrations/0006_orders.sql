-- =============================================================================
-- 0006_orders — order rate card, deliverable, revisi, validasi deliverable admin.
-- Order terkait uang, jadi FK ke user/offer memakai RESTRICT (tidak ikut terhapus).
-- =============================================================================

-- -----------------------------------------------------------------------------
-- orders
-- `status`: pending_payment/in_progress/revision/completed/cancelled ditulis
-- Functions lama; escrow/approved/expired hanya dibandingkan (dipertahankan).
-- -----------------------------------------------------------------------------
create table public.orders (
  id text primary key default gen_random_uuid()::text,
  offer_id text unique references public.offers (id) on delete restrict,
  package_id text references public.rate_card_packages (id) on delete set null,
  package_name_snapshot text check (char_length(package_name_snapshot) <= 100),
  package_price_snapshot bigint check (package_price_snapshot >= 0),
  creator_id uuid not null references public.users (id) on delete restrict,
  umkm_id uuid not null references public.users (id) on delete restrict,
  amount bigint not null default 0 check (amount >= 0),
  status text not null default 'pending_payment' check (status in (
    'pending_payment', 'escrow', 'in_progress', 'revision',
    'approved', 'completed', 'cancelled', 'expired'
  )),
  review_deadline_at timestamptz,
  auto_approved boolean not null default false,
  revision_count integer not null default 0 check (revision_count >= 0),
  revision_limit integer not null default 0 check (revision_limit >= 0),
  reminder_sent_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index orders_package_id_idx on public.orders (package_id);
create index orders_creator_id_idx on public.orders (creator_id);
create index orders_umkm_id_idx on public.orders (umkm_id);
create index orders_status_idx on public.orders (status);
create index orders_created_at_idx on public.orders (created_at desc);
create index orders_review_deadline_at_idx on public.orders (review_deadline_at)
  where review_deadline_at is not null;

-- -----------------------------------------------------------------------------
-- deliverables — hasil kerja kreator per order (berversi).
-- `status` 'delivered' hanya dibandingkan auto-approve-orders (legacy).
-- -----------------------------------------------------------------------------
create table public.deliverables (
  id text primary key default gen_random_uuid()::text,
  order_id text not null references public.orders (id) on delete cascade,
  source text not null check (source in ('storage', 'external_url')),
  file_url text not null check (char_length(file_url) <= 2048),
  file_id text check (char_length(file_id) <= 255),
  notes text check (char_length(notes) <= 2000),
  version integer not null default 1 check (version >= 0),
  status text not null default 'submitted'
    check (status in ('submitted', 'revision_requested', 'approved', 'delivered')),
  creator_credit text check (char_length(creator_credit) <= 255),
  ai_generated boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index deliverables_order_id_idx on public.deliverables (order_id);
create index deliverables_created_at_idx on public.deliverables (created_at desc);

-- -----------------------------------------------------------------------------
-- revisions — permintaan revisi dari UMKM.
-- -----------------------------------------------------------------------------
create table public.revisions (
  id text primary key default gen_random_uuid()::text,
  order_id text not null references public.orders (id) on delete cascade,
  requested_by uuid not null references public.users (id) on delete restrict,
  message text not null check (char_length(message) <= 2000),
  status text not null default 'open' check (status in ('open', 'resolved')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index revisions_order_id_idx on public.revisions (order_id);
create index revisions_requested_by_idx on public.revisions (requested_by);
create index revisions_status_idx on public.revisions (status);

-- -----------------------------------------------------------------------------
-- ratecard_deliverable_validations — hasil review admin atas deliverable.
-- Satu validasi per deliverable. 'pending' hanya default DTO, tidak disimpan.
-- -----------------------------------------------------------------------------
create table public.ratecard_deliverable_validations (
  id text primary key default gen_random_uuid()::text,
  deliverable_id text not null unique references public.deliverables (id) on delete cascade,
  order_id text not null references public.orders (id) on delete cascade,
  deliverable_version integer not null check (deliverable_version >= 0),
  source_snapshot text not null check (source_snapshot in ('storage', 'external_url')),
  evidence_url_snapshot text not null check (char_length(evidence_url_snapshot) <= 2048),
  status text not null check (status in ('valid', 'invalid')),
  reviewed_by uuid not null references public.users (id) on delete restrict,
  review_notes text check (char_length(review_notes) <= 2000),
  reviewed_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index ratecard_deliverable_validations_order_id_idx on public.ratecard_deliverable_validations (order_id);
create index ratecard_deliverable_validations_reviewed_by_idx on public.ratecard_deliverable_validations (reviewed_by);
create index ratecard_deliverable_validations_status_idx on public.ratecard_deliverable_validations (status);
create index ratecard_deliverable_validations_reviewed_at_idx on public.ratecard_deliverable_validations (reviewed_at desc);

-- -----------------------------------------------------------------------------
-- Trigger updated_at + RLS
-- -----------------------------------------------------------------------------
create trigger set_updated_at before update on public.orders
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.deliverables
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.revisions
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.ratecard_deliverable_validations
  for each row execute function public.set_updated_at();

alter table public.orders enable row level security;
alter table public.deliverables enable row level security;
alter table public.revisions enable row level security;
alter table public.ratecard_deliverable_validations enable row level security;
