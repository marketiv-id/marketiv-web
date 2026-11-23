-- pgTAP: apply_payment_paid (0026). Di-rollback di akhir.
begin;
create extension if not exists pgtap with schema extensions;
select plan(17);
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
  ('fo1', '00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-0000000000c1', 100000, 'pending_payment'),
  ('fo4', '00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-0000000000c1', 70000, 'cancelled');
insert into public.campaigns (id, umkm_id, title, category, type, platforms, budget, reward_per_1000_views, claim_limit, status) values
  ('fc1', '00000000-0000-0000-0000-0000000000a1', 'Uji', 'kuliner', 'ugc', array['tiktok'], 50000, 5000, 5, 'draft');
insert into public.payments (id, user_id, order_id, campaign_id, amount, total_amount, fee_amount, purpose, gateway_reference, status) values
  ('fp1', '00000000-0000-0000-0000-0000000000a1', 'fo1', null, 100000, 100000, 0, 'order', 'ref-fp1', 'pending'),
  ('fp2', '00000000-0000-0000-0000-0000000000a1', null, 'fc1', 50000, 51000, 1000, 'campaign', 'ref-fp2', 'pending'),
  ('fp3', '00000000-0000-0000-0000-0000000000a1', null, 'fc1', 50000, 51000, 1000, 'campaign', 'ref-fp3', 'expired'),
  ('fp4', '00000000-0000-0000-0000-0000000000a1', 'fo4', null, 70000, 70000, 0, 'order', 'ref-fp4', 'pending');

-- Nominal salah ditolak, tanpa efek.
select throws_ok($$select public.apply_payment_paid('fp1', 'ref-fp1', 99999)$$, 'P0001', null, 'gross_amount salah ditolak');
select is((select status from public.payments where id = 'fp1'), 'pending', 'payment tetap pending');
select is((select count(*)::int from public.escrows where order_id = 'fo1'), 0, 'tidak ada escrow');

-- Bayar order.
select is(public.apply_payment_paid('fp1', 'ref-fp1', 100000) ->> 'status', 'paid', 'order: lunas');
select is((select status from public.payments where id = 'fp1'), 'paid', 'payment paid');
select is((select status || ':' || amount || ':' || fee_rate from public.escrows where order_id = 'fo1'), 'held:100000:0.0200', 'escrow held + fee_rate snapshot');
select is((select status from public.orders where id = 'fo1'), 'in_progress', 'order in_progress');
select is((select count(*)::int from public.transactions where reference_type = 'order' and reference_id = 'fo1' and type = 'payment'), 1, 'ledger payment dicatat');
select is((select balance from public.wallets where user_id = '00000000-0000-0000-0000-0000000000a1'), 0::bigint, 'saldo UMKM tidak berubah (payment arah 0)');

-- Panggilan ulang no-op.
select is(public.apply_payment_paid('fp1', 'ref-fp1', 100000) ->> 'status', 'already_paid', 'panggilan ulang idempoten');
select is((select count(*)::int from public.escrows where order_id = 'fo1'), 1, 'escrow tetap satu');

-- Top-up campaign: total_amount (budget + fee buyer-side) dicek, remaining_budget += amount.
select is(public.apply_payment_paid('fp2', 'ref-fp2', 51000) ->> 'status', 'paid', 'campaign: lunas');
select is(public.apply_payment_paid('fp2', 'ref-fp2', 51000) ->> 'status', 'already_paid', 'campaign: ulang no-op');
select is((select remaining_budget from public.campaigns where id = 'fc1'), 50000::bigint, 'remaining_budget naik sekali');

-- Payment non-pending dan order tidak menunggu bayar → exception (alert di webhook).
select throws_ok($$select public.apply_payment_paid('fp3', 'ref-fp3', 51000)$$, 'P0001', null, 'payment expired ditolak');
select throws_ok($$select public.apply_payment_paid('fp4', 'ref-fp4', 70000)$$, 'P0001', null, 'order cancelled ditolak');

select ok(not has_function_privilege('authenticated', 'public.apply_payment_paid(text, text, bigint)', 'execute'), 'authenticated tidak bisa execute');
select * from finish();
rollback;
