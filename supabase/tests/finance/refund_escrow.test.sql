-- pgTAP: refund_escrow + refund_campaign_budget (0026).
begin;
create extension if not exists pgtap with schema extensions;
select plan(13);
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000000a1', 'umkm-fin@example.test'),
  ('00000000-0000-0000-0000-0000000000c1', 'creator-fin@example.test'),
  ('00000000-0000-0000-0000-0000000000d1', 'admin-fin@example.test');
insert into public.users (id, role, status, email) values
  ('00000000-0000-0000-0000-0000000000a1', 'umkm', 'active', 'umkm-fin@example.test'),
  ('00000000-0000-0000-0000-0000000000c1', 'creator', 'active', 'creator-fin@example.test'),
  ('00000000-0000-0000-0000-0000000000d1', 'admin', 'active', 'admin-fin@example.test');
insert into public.wallets (user_id) values
  ('00000000-0000-0000-0000-0000000000a1'), ('00000000-0000-0000-0000-0000000000c1');
insert into public.orders (id, umkm_id, creator_id, amount, status) values
  ('fo1', '00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-0000000000c1', 80000, 'in_progress'),
  ('fo2', '00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-0000000000c1', 60000, 'completed'),
  ('fo3', '00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-0000000000c1', 40000, 'in_progress');
insert into public.escrows (id, order_id, amount, status, fee_rate) values
  ('fe1', 'fo1', 80000, 'held', 0.02), ('fe2', 'fo2', 60000, 'released', 0.02), ('fe3', 'fo3', 40000, 'held', 0.02);
insert into public.campaigns (id, umkm_id, title, category, type, platforms, budget, reward_per_1000_views, claim_limit, status, remaining_budget) values
  ('fc1', '00000000-0000-0000-0000-0000000000a1', 'Tutup', 'kuliner', 'ugc', array['tiktok'], 50000, 5000, 5, 'cancelled', 30000),
  ('fc2', '00000000-0000-0000-0000-0000000000a1', 'Aktif', 'kuliner', 'ugc', array['tiktok'], 50000, 5000, 5, 'active', 30000);

select is(public.refund_escrow('fo1', 'dispute') ->> 'status', 'refunded', 'escrow held di-refund');
select is((select balance from public.wallets where user_id = '00000000-0000-0000-0000-0000000000a1'), 80000::bigint, 'UMKM dikredit utuh');
select is((select status from public.escrows where id = 'fe1') || '/' || (select status from public.orders where id = 'fo1'), 'refunded/cancelled', 'escrow refunded + order cancelled');
select is(public.refund_escrow('fo1', 'dispute') ->> 'status', 'already_refunded', 'panggilan ulang no-op');
select is((select balance from public.wallets where user_id = '00000000-0000-0000-0000-0000000000a1'), 80000::bigint, 'tidak kredit dua kali');
select throws_ok($$select public.refund_escrow('fo2', null)$$, 'P0001', null, 'escrow released tidak bisa di-refund');

-- Rollback: exception setelah escrow flip → semuanya batal (bug "dana hilang" lama).
create function pg_temp.boom() returns trigger language plpgsql as $$ begin raise exception 'boom'; end; $$;
create trigger boom before update on public.orders for each row when (new.status = 'cancelled') execute function pg_temp.boom();
select throws_ok($$select public.refund_escrow('fo3', null)$$, 'P0001', 'boom', 'error di tengah RPC');
select is((select status from public.escrows where id = 'fe3'), 'held', 'escrow tetap held');
select is((select count(*)::int from public.transactions where reference_id = 'fe3'), 0, 'ledger ikut rollback');
drop trigger boom on public.orders;

-- Sisa budget campaign.
select is(public.refund_campaign_budget('fc1') ->> 'amount', '30000', 'sisa budget dikembalikan');
select is((select remaining_budget from public.campaigns where id = 'fc1'), 0::bigint, 'remaining_budget jadi 0');
select throws_ok($$select public.refund_campaign_budget('fc2')$$, 'P0001', null, 'campaign aktif ditolak');
select is((select count(*)::int from public.finance_reconciliation where diff <> 0), 0, 'rekonsiliasi 0 selisih');
select * from finish();
rollback;
