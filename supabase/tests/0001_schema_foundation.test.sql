-- pgTAP: fondasi skema Fase 2. Jalankan dengan `supabase test db`.
begin;
create extension if not exists pgtap with schema extensions;

select plan(29);

-- 1. 32 tabel di schema public, semuanya dengan RLS aktif dan belum ada policy.
select is(
  (select count(*)::int from pg_tables where schemaname = 'public'),
  32,
  'public punya 32 tabel'
);
select is(
  (select count(*)::int from pg_tables where schemaname = 'public' and not rowsecurity),
  0,
  'RLS aktif di semua tabel public'
);
select is(
  (select count(*)::int from pg_policies where schemaname = 'public'),
  0,
  'belum ada policy (dibuat di Fase 3)'
);

-- 2. Semua tabel (kecuali legacy_user_map) punya trigger set_updated_at.
select is(
  (select count(*)::int
     from pg_tables t
    where t.schemaname = 'public'
      and t.tablename <> 'legacy_user_map'
      and not exists (
        select 1 from pg_trigger g
         where g.tgrelid = format('public.%I', t.tablename)::regclass
           and g.tgname = 'set_updated_at'
      )),
  0,
  'trigger set_updated_at terpasang di semua tabel ber-updated_at'
);

-- 3. users.id = auth.users.id
select fk_ok('public', 'users', 'id', 'auth', 'users', 'id', 'users.id → auth.users.id');
select col_type_is('public', 'users', 'id', 'uuid', 'users.id bertipe uuid');

-- 4. Semua kolom user_id/creator_id/umkm_id/sender_id/requested_by/reviewed_by/processed_by bertipe uuid.
select is(
  (select count(*)::int
     from information_schema.columns
    where table_schema = 'public'
      and column_name in ('user_id', 'creator_id', 'umkm_id', 'sender_id', 'requested_by', 'reviewed_by', 'processed_by')
      and data_type <> 'uuid'),
  0,
  'semua kolom referensi user bertipe uuid'
);

-- 5. Siklus conversations.offer_id ↔ offers: FK DEFERRABLE INITIALLY DEFERRED.
select ok(
  (select condeferrable and condeferred
     from pg_constraint
    where conname = 'conversations_offer_id_fkey'),
  'conversations.offer_id → offers DEFERRABLE INITIALLY DEFERRED'
);
select fk_ok('public', 'offers', 'conversation_id', 'public', 'conversations', 'id', 'offers.conversation_id → conversations.id');

-- 6. Unique index lama dipertahankan + unique idempotensi baru.
select col_is_unique('public', 'users', 'email', 'users.email unik');
select col_is_unique('public', 'orders', 'offer_id', 'orders.offer_id unik');
select col_is_unique('public', 'escrows', 'order_id', 'escrows.order_id unik');
select col_is_unique('public', 'payments', 'gateway_reference', 'payments.gateway_reference unik');
select index_is_unique('public', 'payments', 'payments_order_payment_key_key', 'payments.order_payment_key unik (partial)');
select col_is_unique('public', 'campaign_submissions', 'claim_id', 'campaign_submissions.claim_id unik');
select col_is_unique('public', 'ratecard_deliverable_validations', 'deliverable_id', 'validations.deliverable_id unik');
select col_is_unique('public', 'conversations', array['umkm_id', 'creator_id'], 'conversations(umkm_id, creator_id) unik');
select col_is_unique('public', 'transactions', array['reference_type', 'reference_id', 'type'], 'transactions(reference_type, reference_id, type) unik');
select col_is_unique('public', 'creator_social_accounts', array['creator_id', 'platform'], 'creator_social_accounts(creator_id, platform) unik');
select index_is_unique('public', 'campaign_claims', 'campaign_claims_active_key', 'klaim aktif unik per (campaign, kreator)');

-- 7. Uang bigint.
select col_type_is('public', 'wallets', 'balance', 'bigint', 'wallets.balance bigint');
select col_type_is('public', 'transactions', 'amount', 'bigint', 'transactions.amount bigint');
select col_type_is('public', 'campaigns', 'platforms', 'text[]', 'campaigns.platforms text[]');
select col_type_is('public', 'campaign_briefs', 'do_and_dont', 'jsonb', 'campaign_briefs.do_and_dont jsonb');
select col_type_is('public', 'offers', 'deadline', 'timestamp with time zone', 'offers.deadline timestamptz');

-- 8. Perilaku constraint (dijalankan sebagai postgres; data dibuang di rollback).
insert into auth.users (id, instance_id, aud, role, email)
values ('00000000-0000-4000-8000-000000000001', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'tap-umkm@example.test'),
       ('00000000-0000-4000-8000-000000000002', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'tap-creator@example.test');
insert into public.users (id, role, email)
values ('00000000-0000-4000-8000-000000000001', 'umkm', 'tap-umkm@example.test'),
       ('00000000-0000-4000-8000-000000000002', 'creator', 'tap-creator@example.test');

select throws_ok(
  $$insert into public.wallets (user_id, balance) values ('00000000-0000-4000-8000-000000000001', -1)$$,
  '23514', null, 'saldo negatif ditolak'
);
select throws_ok(
  $$insert into public.users (id, role, email) values ('00000000-0000-4000-8000-000000000009', 'umkm', 'x@example.test')$$,
  '23503', null, 'users tanpa auth.users ditolak'
);
select throws_ok(
  $$insert into public.campaigns (umkm_id, title, category, type, status) values ('00000000-0000-4000-8000-000000000001', 't', 'kuliner', 'ugc', 'Aktif')$$,
  '23514', null, 'status campaign di luar enum ditolak'
);

-- Percakapan + offer dalam satu transaksi berkat FK deferred.
select lives_ok(
  $$
    insert into public.conversations (id, umkm_id, creator_id, offer_id)
    values ('tap-conv', '00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000002', 'tap-offer');
    insert into public.offers (id, conversation_id, umkm_id, creator_id, title, price, deadline)
    values ('tap-offer', 'tap-conv', '00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000002', 'Offer', 100000, now() + interval '7 days');
    set constraints all immediate;
  $$,
  'conversation → offer yang dibuat belakangan lolos FK deferred'
);

select * from finish();
rollback;
