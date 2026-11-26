-- pgTAP: pembayaran Midtrans (0027_payments). Semua di-rollback.
begin;
create extension if not exists pgtap with schema extensions;
select plan(32);

insert into auth.users (id, email, aud, role, raw_app_meta_data, raw_user_meta_data) values
  ('b1111111-1111-4111-8111-111111111111', 'pay-umkm@example.test', 'authenticated', 'authenticated', '{}', '{}'),
  ('b2222222-2222-4222-8222-222222222222', 'pay-umkm2@example.test', 'authenticated', 'authenticated', '{}', '{}'),
  ('b3333333-3333-4333-8333-333333333333', 'pay-kreator@example.test', 'authenticated', 'authenticated', '{}', '{}'),
  ('b4444444-4444-4444-8444-444444444444', 'pay-admin@example.test', 'authenticated', 'authenticated', '{}', '{}'),
  ('b5555555-5555-4555-8555-555555555555', 'pay-suspended@example.test', 'authenticated', 'authenticated', '{}', '{}');
insert into public.users (id, role, email, status) values
  ('b1111111-1111-4111-8111-111111111111', 'umkm', 'pay-umkm@example.test', 'active'),
  ('b2222222-2222-4222-8222-222222222222', 'umkm', 'pay-umkm2@example.test', 'active'),
  ('b3333333-3333-4333-8333-333333333333', 'creator', 'pay-kreator@example.test', 'active'),
  ('b4444444-4444-4444-8444-444444444444', 'admin', 'pay-admin@example.test', 'active'),
  ('b5555555-5555-4555-8555-555555555555', 'umkm', 'pay-suspended@example.test', 'suspended');
insert into public.campaigns (id, umkm_id, title, category, type, platforms, budget, reward_per_1000_views, claim_limit, status) values
  ('pc-draft', 'b1111111-1111-4111-8111-111111111111', 'Promo', 'kuliner', 'ugc', array['tiktok'], 100000, 5000, 5, 'draft'),
  ('pc-active', 'b1111111-1111-4111-8111-111111111111', 'Aktif', 'kuliner', 'ugc', array['tiktok'], 100000, 5000, 5, 'active');
insert into public.orders (id, umkm_id, creator_id, amount, status) values
  ('po-1', 'b1111111-1111-4111-8111-111111111111', 'b3333333-3333-4333-8333-333333333333', 150000, 'pending_payment'),
  ('po-2', 'b1111111-1111-4111-8111-111111111111', 'b3333333-3333-4333-8333-333333333333', 150000, 'pending_payment'),
  ('po-ip', 'b1111111-1111-4111-8111-111111111111', 'b3333333-3333-4333-8333-333333333333', 150000, 'in_progress');

-- ── Hak akses ──────────────────────────────────────────────────────────────
select ok(not exists (
  select 1 from pg_proc p
  where p.pronamespace = 'public'::regnamespace
    and p.proname in ('create_payment', 'attach_payment_gateway', 'cancel_payment', 'mark_payment_status',
                      'record_payment_event', 'cancel_order')
    and (has_function_privilege('anon', p.oid, 'execute') or has_function_privilege('authenticated', p.oid, 'execute'))
), 'RPC payment tidak bisa dieksekusi anon/authenticated');
select ok(not has_table_privilege('authenticated', 'public.payment_events', 'insert'),
  'payment_events tidak bisa ditulis client');

-- ── create_payment: validasi ───────────────────────────────────────────────
select throws_ok($$ select public.create_payment('b5555555-5555-4555-8555-555555555555', 'order', 150000, 'po-1') $$,
  '42501', null, 'akun suspended ditolak');
select throws_ok($$ select public.create_payment('b2222222-2222-4222-8222-222222222222', 'order', 150000, 'po-1') $$,
  '42501', null, 'order milik UMKM lain ditolak');
select throws_ok($$ select public.create_payment('b1111111-1111-4111-8111-111111111111', 'order', 1000, 'po-1') $$,
  'P0001', null, 'nominal tidak sama dengan order → P0001');
select throws_ok($$ select public.create_payment('b1111111-1111-4111-8111-111111111111', 'order', 150000, 'po-ip') $$,
  'P0001', null, 'order bukan pending_payment ditolak');
select throws_ok($$ select public.create_payment('b1111111-1111-4111-8111-111111111111', 'topup', 150000) $$,
  '22023', null, 'purpose tidak dikenal ditolak');
select throws_ok($$ select public.create_payment('b1111111-1111-4111-8111-111111111111', 'campaign', 100000, null, 'pc-active') $$,
  'P0001', null, 'campaign non-draft tidak bisa didanai');
select throws_ok($$ select public.create_payment('b1111111-1111-4111-8111-111111111111', 'campaign', 99000, null, 'pc-draft') $$,
  'P0001', null, 'nominal campaign harus = budget');

-- ── create_payment: order idempoten ────────────────────────────────────────
create temp table r1 as select public.create_payment('b1111111-1111-4111-8111-111111111111', 'order', 150000, 'po-1') as j;
select is((select (j->>'reused')::boolean from r1), false, 'payment order baru');
select is((select j->>'gatewayReference' from r1), 'ord-' || (select j->>'paymentId' from r1), 'gateway_reference = ord-<id>');
select ok(char_length((select j->>'gatewayReference' from r1)) <= 50, 'gateway_reference ≤ 50 karakter (batas Midtrans)');
select is((select (j->>'totalAmount')::bigint from r1), 150000::bigint, 'order tanpa fee');
create temp table r2 as select public.create_payment('b1111111-1111-4111-8111-111111111111', 'order', 150000, 'po-1') as j;
select is((select j->>'paymentId' from r2), (select j->>'paymentId' from r1), 'panggilan ulang memakai payment pending yang sama');
select is((select (j->>'reused')::boolean from r2), true, 'reused = true');
select is((select count(*)::int from public.payments where order_id = 'po-1'), 1, 'hanya satu payment untuk order');

-- ── create_payment: campaign + fee ─────────────────────────────────────────
create temp table c1 as select public.create_payment('b1111111-1111-4111-8111-111111111111', 'campaign', 100000, null, 'pc-draft', 0.02) as j;
select is((select (j->>'feeAmount')::bigint from c1), 2000::bigint, 'fee campaign = floor(amount × rate)');
select is((select (j->>'totalAmount')::bigint from c1), 102000::bigint, 'total = amount + fee');
select is((select public.create_payment('b1111111-1111-4111-8111-111111111111', 'campaign', 100000, null, 'pc-draft', 0.02)->>'paymentId'),
  (select j->>'paymentId' from c1), 'payment campaign pending dipakai ulang');

-- ── attach / cancel ────────────────────────────────────────────────────────
select ok(public.attach_payment_gateway((select j->>'paymentId' from c1), 'snap-tok', 'https://app.sandbox.midtrans.com/x'),
  'attach snap token ke payment pending');
select throws_ok(format($$ select public.cancel_payment(%L, 'b2222222-2222-4222-8222-222222222222') $$, (select j->>'paymentId' from c1)),
  '42501', null, 'cancel payment orang lain ditolak');
select throws_ok(format($$ select public.cancel_payment(%L, 'b1111111-1111-4111-8111-111111111111') $$, (select j->>'paymentId' from r1)),
  'P0001', null, 'cancel payment order tanpa konfirmasi gateway ditolak');
select is((public.cancel_payment((select j->>'paymentId' from c1), 'b1111111-1111-4111-8111-111111111111'))->>'status',
  'cancelled', 'cancel payment campaign pending');
select is((public.cancel_payment((select j->>'paymentId' from c1), 'b1111111-1111-4111-8111-111111111111'))->>'alreadyCancelled',
  'true', 'cancel ulang idempoten');

-- ── mark_payment_status ────────────────────────────────────────────────────
create temp table r3 as select public.create_payment('b1111111-1111-4111-8111-111111111111', 'order', 150000, 'po-2') as j;
select is((public.mark_payment_status((select j->>'paymentId' from r3), 'expired'))->>'changed', 'true', 'pending → expired');
select is((select order_payment_key from public.payments where id = (select j->>'paymentId' from r3)), null, 'expired melepas order_payment_key');
select is((public.mark_payment_status((select j->>'paymentId' from r3), 'failed'))->>'status', 'expired',
  'status terminal tidak berubah lagi (idempoten)');

-- ── cancel_order membatalkan payment pending ───────────────────────────────
select is((select (public.cancel_order('po-1', 'b1111111-1111-4111-8111-111111111111'))->'cancelledPayments'->>0),
  (select j->>'gatewayReference' from r1), 'cancel_order mengembalikan referensi payment yang dibatalkan');
select is((select status from public.payments where id = (select j->>'paymentId' from r1)), 'cancelled',
  'payment pending order ikut cancelled');

-- ── record_payment_event: refund setelah paid → event + alert admin ────────
update public.payments set status = 'paid' where id = (select j->>'paymentId' from r3);
select is((public.record_payment_event((select j->>'gatewayReference' from r3), 'refund', 'refund', '200', 150000))->>'recorded',
  'true', 'refund setelah paid tercatat');
select is((select count(*)::int from public.notifications where user_id = 'b4444444-4444-4444-8444-444444444444'),
  1, 'admin aktif menerima alert');
select is((public.record_payment_event((select j->>'gatewayReference' from r3), 'refund', 'refund', '200', 150000))->>'recorded',
  'false', 'notifikasi ulang tidak menggandakan event/alert');

select * from finish();
rollback;
