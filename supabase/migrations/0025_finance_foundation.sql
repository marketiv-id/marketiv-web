-- =============================================================================
-- 0025_finance_foundation — fondasi bersama semua RPC uang (Fase 8).
--
-- Enam prinsip wajib (08-keuangan.md) dipusatkan di sini supaya setiap RPC uang
-- memakai SATU jalur yang sama untuk mengubah saldo:
--
--   private.post_ledger(...)  : ledger DULU (insert … on conflict do nothing
--                               returning id), saldo KEMUDIAN dan hanya bila
--                               insert berhasil. Panggilan ulang = no-op.
--   CHECK (balance >= 0)      : sudah ada di wallets (0007); overdraw → 23514 →
--                               seluruh transaksi pemanggil rollback.
--
-- Arah saldo per type ledger (`private.ledger_direction`):
--   +1 : release (escrow / campaign_submission), refund, withdrawal_reversal, mature
--   -1 : withdrawal
--    0 : payment (catatan bayar UMKM ke Midtrans, bukan saldo wallet), fee
--
-- Urutan kunci (hindari deadlock) untuk SEMUA RPC uang:
--   campaigns → orders → escrows → withdrawals → wallets (user_id terkecil dulu)
-- `post_ledger` mengunci wallet lewat UPDATE; RPC yang menyentuh lebih dari satu
-- wallet WAJIB memanggil post_ledger berurutan user_id ascending.
--
-- Juga: view `finance_reconciliation` (Σ ledger berarah = wallets.balance) dan
-- tabel audit `admin_actions`.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Arah efek saldo per type ledger.
-- -----------------------------------------------------------------------------
create or replace function private.ledger_direction(p_type text)
returns integer
language sql
immutable
set search_path = ''
as $$
  select case p_type
    when 'release' then 1
    when 'refund' then 1
    when 'withdrawal_reversal' then 1
    when 'mature' then 1
    when 'withdrawal' then -1
    else 0
  end;
$$;

comment on function private.ledger_direction(text) is
  'Arah efek saldo wallet per type ledger: +1 kredit, -1 debit, 0 catatan saja.';

-- -----------------------------------------------------------------------------
-- post_ledger — satu-satunya jalan mengubah wallets.balance.
--
-- Mengembalikan id transaksi bila BARU dicatat, NULL bila triple
-- (reference_type, reference_id, type) sudah ada (idempoten; saldo tidak
-- berubah). Saldo negatif → CHECK wallets → exception → rollback pemanggil.
-- -----------------------------------------------------------------------------
create or replace function private.post_ledger(
  p_user_id uuid,
  p_type text,
  p_amount bigint,
  p_reference_type text,
  p_reference_id text,
  p_status text default 'completed'
)
returns text
language plpgsql
volatile
security invoker
set search_path = ''
as $$
declare
  v_id text;
  v_dir integer := private.ledger_direction(p_type);
begin
  if p_user_id is null or p_reference_type is null or p_reference_id is null then
    raise exception 'post_ledger: argumen wajib' using errcode = '22023';
  end if;
  if p_amount is null or p_amount < 0 then
    raise exception 'post_ledger: nominal tidak valid' using errcode = '22023';
  end if;

  insert into public.transactions (user_id, amount, type, reference_type, reference_id, status)
  values (p_user_id, p_amount, p_type, p_reference_type, p_reference_id, p_status)
  on conflict (reference_type, reference_id, type) do nothing
  returning id into v_id;

  if v_id is null then
    return null; -- sudah pernah dicatat: no-op
  end if;

  if v_dir <> 0 and p_amount > 0 then
    insert into public.wallets (user_id) values (p_user_id)
    on conflict (user_id) do nothing;

    update public.wallets w
       set balance = w.balance + v_dir * p_amount
     where w.user_id = p_user_id;
  end if;

  return v_id;
end;
$$;

comment on function private.post_ledger(uuid, text, bigint, text, text, text) is
  'Ledger dulu (idempoten per reference_type+reference_id+type), saldo kemudian. NULL = sudah ada.';

revoke all on function private.ledger_direction(text) from public, anon, authenticated;
revoke all on function private.post_ledger(uuid, text, bigint, text, text, text) from public, anon, authenticated;
grant execute on function private.ledger_direction(text) to service_role;
grant execute on function private.post_ledger(uuid, text, bigint, text, text, text) to service_role;

-- -----------------------------------------------------------------------------
-- finance_reconciliation — per user: saldo wallet vs Σ ledger berarah.
-- `diff` harus 0 untuk setiap baris. Hanya service_role / admin (lewat route).
-- -----------------------------------------------------------------------------
create or replace view public.finance_reconciliation
with (security_invoker = true)
as
select
  w.user_id,
  w.balance,
  coalesce(l.ledger_balance, 0)::bigint as ledger_balance,
  (w.balance - coalesce(l.ledger_balance, 0))::bigint as diff
from public.wallets w
left join (
  select t.user_id, sum(private.ledger_direction(t.type) * t.amount) as ledger_balance
  from public.transactions t
  group by t.user_id
) l on l.user_id = w.user_id;

comment on view public.finance_reconciliation is
  'Rekonsiliasi: wallets.balance vs Σ ledger berarah per user. diff wajib 0.';

revoke all on public.finance_reconciliation from public, anon, authenticated;
grant select on public.finance_reconciliation to service_role;

-- -----------------------------------------------------------------------------
-- admin_actions — jejak audit setiap aksi admin (suspend, unsuspend, verify-kyc,
-- review-appeal, review-withdrawal, review submission/deliverable, …).
-- Ditulis hanya lewat RPC/route service role. Dibaca admin lewat RLS.
-- -----------------------------------------------------------------------------
create table if not exists public.admin_actions (
  id text primary key default gen_random_uuid()::text,
  admin_id uuid not null references public.users (id) on delete restrict,
  action text not null check (char_length(action) between 1 and 100),
  target_type text not null check (char_length(target_type) between 1 and 50),
  target_id text not null check (char_length(target_id) between 1 and 255),
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists admin_actions_target_idx on public.admin_actions (target_type, target_id, created_at desc);
create index if not exists admin_actions_admin_id_idx on public.admin_actions (admin_id, created_at desc);

alter table public.admin_actions enable row level security;

drop policy if exists admin_actions_select_admin on public.admin_actions;
create policy admin_actions_select_admin on public.admin_actions
  for select to authenticated
  using ((select private.is_admin()));

revoke insert, update, delete, truncate on public.admin_actions from anon, authenticated;
revoke select on public.admin_actions from anon;

create or replace function private.log_admin_action(
  p_admin_id uuid,
  p_action text,
  p_target_type text,
  p_target_id text,
  p_payload jsonb default '{}'::jsonb
)
returns text
language sql
volatile
security invoker
set search_path = ''
as $$
  insert into public.admin_actions (admin_id, action, target_type, target_id, payload)
  values (p_admin_id, p_action, p_target_type, p_target_id, coalesce(p_payload, '{}'::jsonb))
  returning id;
$$;

comment on function private.log_admin_action(uuid, text, text, text, jsonb) is
  'Catat satu aksi admin ke admin_actions (panggil di transaksi yang sama dengan aksinya).';

revoke all on function private.log_admin_action(uuid, text, text, text, jsonb) from public, anon, authenticated;
grant execute on function private.log_admin_action(uuid, text, text, text, jsonb) to service_role;
