-- =============================================================================
-- 0005_ratecards_chat — rate card, paket, percakapan, pesan, penawaran (offer).
--
-- Siklus FK: offers.conversation_id → conversations, dan
-- conversations.offer_id → offers. FK kedua dibuat DEFERRABLE INITIALLY DEFERRED
-- supaya percakapan + offer bisa dibuat dalam satu transaksi (RPC Fase 7).
-- =============================================================================

-- -----------------------------------------------------------------------------
-- rate_cards
-- -----------------------------------------------------------------------------
create table public.rate_cards (
  id text primary key default gen_random_uuid()::text,
  creator_id uuid not null references public.users (id) on delete cascade,
  title text not null check (char_length(title) <= 255),
  description text check (char_length(description) <= 2000),
  status text not null default 'draft' check (status in ('draft', 'published')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index rate_cards_creator_id_idx on public.rate_cards (creator_id);
create index rate_cards_status_idx on public.rate_cards (status);
create index rate_cards_created_at_idx on public.rate_cards (created_at desc);

-- -----------------------------------------------------------------------------
-- rate_card_packages
-- -----------------------------------------------------------------------------
create table public.rate_card_packages (
  id text primary key default gen_random_uuid()::text,
  rate_card_id text not null references public.rate_cards (id) on delete cascade,
  name text not null check (char_length(name) <= 100),
  description text not null check (char_length(description) <= 2000),
  output text not null check (char_length(output) <= 2000),
  delivery_days integer not null check (delivery_days >= 0),
  price bigint not null default 0 check (price >= 0),
  revision_limit integer not null default 0 check (revision_limit >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index rate_card_packages_rate_card_id_idx on public.rate_card_packages (rate_card_id);
create index rate_card_packages_price_idx on public.rate_card_packages (price);

-- -----------------------------------------------------------------------------
-- conversations — satu percakapan per pasangan (UMKM, kreator).
-- offer_id = offer terakhir yang ditautkan; FK ditambahkan setelah tabel offers.
-- -----------------------------------------------------------------------------
create table public.conversations (
  id text primary key default gen_random_uuid()::text,
  umkm_id uuid not null references public.users (id) on delete cascade,
  creator_id uuid not null references public.users (id) on delete cascade,
  offer_id text,
  last_message text check (char_length(last_message) <= 1000),
  last_message_at timestamptz,
  umkm_archived boolean not null default false,
  creator_archived boolean not null default false,
  is_archived boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint conversations_umkm_id_creator_id_key unique (umkm_id, creator_id),
  constraint conversations_distinct_parties_check check (umkm_id <> creator_id)
);

create index conversations_creator_id_idx on public.conversations (creator_id);
create index conversations_offer_id_idx on public.conversations (offer_id);
create index conversations_last_message_at_idx on public.conversations (last_message_at desc);

-- -----------------------------------------------------------------------------
-- offers — penawaran UMKM ke kreator di dalam percakapan.
-- `deadline` dulu string ISO; sekarang timestamptz.
-- "Tarik penawaran" menghapus baris, jadi FK yang merujuk offer memakai SET NULL.
-- -----------------------------------------------------------------------------
create table public.offers (
  id text primary key default gen_random_uuid()::text,
  conversation_id text not null references public.conversations (id) on delete cascade,
  umkm_id uuid not null references public.users (id) on delete cascade,
  creator_id uuid not null references public.users (id) on delete cascade,
  title text not null check (char_length(title) <= 255),
  description text check (char_length(description) <= 2000),
  price bigint not null default 0 check (price >= 0),
  deadline timestamptz not null,
  revision_limit integer not null default 0 check (revision_limit >= 0),
  package_id text references public.rate_card_packages (id) on delete set null,
  package_name_snapshot text check (char_length(package_name_snapshot) <= 100),
  package_price_snapshot bigint check (package_price_snapshot >= 0),
  status text not null default 'pending' check (status in ('pending', 'accepted', 'rejected')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index offers_conversation_id_idx on public.offers (conversation_id);
create index offers_umkm_id_idx on public.offers (umkm_id);
create index offers_creator_id_idx on public.offers (creator_id);
create index offers_package_id_idx on public.offers (package_id);
create index offers_status_idx on public.offers (status);
create index offers_created_at_idx on public.offers (created_at desc);

alter table public.conversations
  add constraint conversations_offer_id_fkey
  foreign key (offer_id) references public.offers (id)
  on delete set null
  deferrable initially deferred;

-- -----------------------------------------------------------------------------
-- messages
-- `message_type`: text/offer ditulis; system/image/file hanya dibandingkan
-- (dipertahankan supaya fitur lama/akan datang tidak ditolak).
-- -----------------------------------------------------------------------------
create table public.messages (
  id text primary key default gen_random_uuid()::text,
  conversation_id text not null references public.conversations (id) on delete cascade,
  sender_id uuid not null references public.users (id) on delete cascade,
  message_type text not null default 'text'
    check (message_type in ('text', 'offer', 'system', 'image', 'file')),
  content text check (char_length(content) <= 2000),
  offer_id text references public.offers (id) on delete set null,
  read_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index messages_conversation_id_created_at_idx on public.messages (conversation_id, created_at);
create index messages_sender_id_idx on public.messages (sender_id);
create index messages_offer_id_idx on public.messages (offer_id);
create index messages_unread_idx on public.messages (conversation_id) where read_at is null;

-- -----------------------------------------------------------------------------
-- Trigger updated_at + RLS
-- -----------------------------------------------------------------------------
create trigger set_updated_at before update on public.rate_cards
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.rate_card_packages
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.conversations
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.offers
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.messages
  for each row execute function public.set_updated_at();

alter table public.rate_cards enable row level security;
alter table public.rate_card_packages enable row level security;
alter table public.conversations enable row level security;
alter table public.offers enable row level security;
alter table public.messages enable row level security;
