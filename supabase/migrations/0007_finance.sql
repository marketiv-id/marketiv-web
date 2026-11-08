-- =============================================================================
-- 0007_finance — wallet, payment, ledger (transactions), escrow, withdrawal.
--
-- Semua nominal dalam rupiah (bigint, >= 0). Arah uang ditentukan `type`
-- ledger, bukan tanda nominal. Perpindahan uang nantinya hanya lewat RPC
-- SECURITY DEFINER dengan row lock (Fase 8); tabel ini hanya fondasinya.
-- Semua FK ke user/order memakai RESTRICT: data uang tidak boleh ikut terhapus.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- wallets — satu per user.
-- -----------------------------------------------------------------------------
create table public.wallets (
  id text primary key default gen_random_uuid()::text,
  user_id uuid not null unique references public.users (id) on delete restrict,
  balance bigint not null default 0 check (balance >= 0),
  pending_balance bigint not null default 0 check (pending_balance >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- -----------------------------------------------------------------------------
-- payments — pembayaran Midtrans (order rate card atau dana campaign).
-- order_payment_key = 'order:<orderId>' selama payment order masih hidup; di-null-kan
-- saat failed/expired/cancelled, jadi unique-nya partial (hanya yang not null).
-- gateway 'manual-dev' / 'manual-smoke' ditulis skrip ops staging lama.
-- -----------------------------------------------------------------------------
create table public.payments (
  id text primary key default gen_random_uuid()::text,
  user_id uuid not null references public.users (id) on delete restrict,
  order_id text references public.orders (id) on delete restrict,
  order_payment_key text check (char_length(order_payment_key) <= 255),
  campaign_id text references public.campaigns (id) on delete restrict,
  amount bigint not null default 0 check (amount >= 0),
  total_amount bigint not null default 0 check (total_amount >= 0),
  fee_amount bigint not null default 0 check (fee_amount >= 0),
  purpose text not null check (purpose in ('order', 'campaign', 'topup')),
  gateway text not null default 'midtrans' check (gateway in ('midtrans', 'manual-dev', 'manual-smoke')),
  gateway_reference text not null check (char_length(gateway_reference) <= 255),
  snap_token text check (char_length(snap_token) <= 255),
  redirect_url text check (char_length(redirect_url) <= 2048),
  status text not null default 'pending'
    check (status in ('pending', 'paid', 'failed', 'expired', 'cancelled')),
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint payments_gateway_reference_key unique (gateway_reference)
);

create unique index payments_order_payment_key_key
  on public.payments (order_payment_key)
  where order_payment_key is not null;
create index payments_user_id_idx on public.payments (user_id);
create index payments_order_id_idx on public.payments (order_id);
create index payments_campaign_id_idx on public.payments (campaign_id);
create index payments_status_idx on public.payments (status);
create index payments_purpose_idx on public.payments (purpose);

-- -----------------------------------------------------------------------------
-- transactions — ledger wallet.
-- reference_id polimorfik (order, payment, escrow, campaign, campaign_submission,
-- transaction, withdrawal), jadi TANPA FK. Unique (reference_type, reference_id,
-- type) membuat setiap efek ledger idempoten: tidak ada alur yang sah menulis dua
-- baris dengan triple yang sama (release vs fee untuk escrow yang sama berbeda type).
-- ID deterministik lama (`tx…`) dipertahankan.
-- -----------------------------------------------------------------------------
create table public.transactions (
  id text primary key default gen_random_uuid()::text,
  user_id uuid not null references public.users (id) on delete restrict,
  amount bigint not null default 0 check (amount >= 0),
  type text not null check (type in (
    'payment', 'release', 'fee', 'refund', 'mature', 'withdrawal', 'withdrawal_reversal'
  )),
  reference_id text check (char_length(reference_id) <= 255),
  reference_type text check (reference_type in (
    'order', 'payment', 'escrow', 'campaign', 'campaign_submission', 'transaction', 'withdrawal'
  )),
  status text not null default 'pending'
    check (status in ('pending', 'processing', 'completed', 'matured', 'failed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint transactions_reference_type_reference_id_type_key unique (reference_type, reference_id, type)
);

create index transactions_user_id_created_at_idx on public.transactions (user_id, created_at desc);
create index transactions_reference_id_idx on public.transactions (reference_id);
create index transactions_status_idx on public.transactions (status);

-- -----------------------------------------------------------------------------
-- escrows — dana order yang ditahan sampai release/refund. Satu per order.
-- fee_rate = snapshot env FEE_RATE saat escrow dibuat (mis. 0.02). Nilai 0 pada
-- data lama diperlakukan release-escrow sebagai 0.02.
-- -----------------------------------------------------------------------------
create table public.escrows (
  id text primary key default gen_random_uuid()::text,
  order_id text not null unique references public.orders (id) on delete restrict,
  amount bigint not null default 0 check (amount >= 0),
  status text not null default 'held' check (status in ('held', 'releasing', 'released', 'refunded')),
  fee_rate numeric(5, 4) not null default 0 check (fee_rate >= 0 and fee_rate <= 1),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index escrows_status_idx on public.escrows (status);

-- -----------------------------------------------------------------------------
-- withdrawals — penarikan saldo. Nilai enum mengikuti enum Appwrite.
-- Status lama 'processed' (wallet.service.ts legacy) sengaja TIDAK diterima.
-- -----------------------------------------------------------------------------
create table public.withdrawals (
  id text primary key default gen_random_uuid()::text,
  user_id uuid not null references public.users (id) on delete restrict,
  amount bigint not null default 0 check (amount >= 0),
  payout_method text not null check (payout_method in ('bank', 'ewallet')),
  provider_name text not null check (char_length(provider_name) <= 100),
  account_number text not null check (char_length(account_number) <= 100),
  account_name text not null check (char_length(account_name) <= 255),
  status text not null default 'requested'
    check (status in ('requested', 'processing', 'succeeded', 'failed', 'reversed')),
  processing_at timestamptz,
  processed_at timestamptz,
  processed_by uuid references public.users (id) on delete restrict,
  transfer_reference text check (char_length(transfer_reference) <= 255),
  admin_note text check (char_length(admin_note) <= 1000),
  failure_reason text check (char_length(failure_reason) <= 500),
  reversed_at timestamptz,
  requester_role text check (requester_role in ('creator', 'umkm')),
  source_origin text check (source_origin in ('creator', 'umkm_refund', 'umkm_budget')),
  kyc_status text check (kyc_status in ('none', 'pending_wa', 'verified')),
  iris_reference text check (char_length(iris_reference) <= 255),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index withdrawals_user_id_idx on public.withdrawals (user_id);
create index withdrawals_status_idx on public.withdrawals (status);
create index withdrawals_processed_by_idx on public.withdrawals (processed_by);

-- -----------------------------------------------------------------------------
-- Trigger updated_at + RLS
-- -----------------------------------------------------------------------------
create trigger set_updated_at before update on public.wallets
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.payments
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.transactions
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.escrows
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.withdrawals
  for each row execute function public.set_updated_at();

alter table public.wallets enable row level security;
alter table public.payments enable row level security;
alter table public.transactions enable row level security;
alter table public.escrows enable row level security;
alter table public.withdrawals enable row level security;
