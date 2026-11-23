-- pgTAP: alur order rate card (0023_order_flow).
begin;
create extension if not exists pgtap with schema extensions;

select plan(40);

-- ── Akun & percakapan ──────────────────────────────────────────────────────
insert into auth.users (id, email, aud, role, raw_app_meta_data, raw_user_meta_data) values
  ('a1111111-1111-4111-8111-111111111111', 'of-umkm@example.test', 'authenticated', 'authenticated', '{}', '{}'),
  ('a2222222-2222-4222-8222-222222222222', 'of-umkm2@example.test', 'authenticated', 'authenticated', '{}', '{}'),
  ('c1111111-1111-4111-8111-111111111111', 'of-kreator@example.test', 'authenticated', 'authenticated', '{}', '{}'),
  ('c2222222-2222-4222-8222-222222222222', 'of-kreator2@example.test', 'authenticated', 'authenticated', '{}', '{}');
insert into public.users (id, role, email, status, tos_version, tos_accepted_at) values
  ('a1111111-1111-4111-8111-111111111111', 'umkm', 'of-umkm@example.test', 'active', 'v3.1', now()),
  ('a2222222-2222-4222-8222-222222222222', 'umkm', 'of-umkm2@example.test', 'active', 'v3.1', now()),
  ('c1111111-1111-4111-8111-111111111111', 'creator', 'of-kreator@example.test', 'active', 'v3.1', now()),
  ('c2222222-2222-4222-8222-222222222222', 'creator', 'of-kreator2@example.test', 'active', 'v1', now());
insert into public.conversations (id, umkm_id, creator_id) values
  ('conv-a', 'a1111111-1111-4111-8111-111111111111', 'c1111111-1111-4111-8111-111111111111'),
  ('conv-b', 'a1111111-1111-4111-8111-111111111111', 'c2222222-2222-4222-8222-222222222222');
insert into public.rate_cards (id, creator_id, title, status) values
  ('rc-pub', 'c1111111-1111-4111-8111-111111111111', 'Paket', 'published'),
  ('rc-draft', 'c1111111-1111-4111-8111-111111111111', 'Draft', 'draft');
insert into public.rate_card_packages (id, rate_card_id, name, description, output, price, revision_limit, delivery_days) values
  ('pk-pub', 'rc-pub', 'Paket Video', 'Video promosi', '1 video', 300000, 2, 3),
  ('pk-draft', 'rc-draft', 'Draft', 'Draft', '1 foto', 100000, 1, 3);

-- ── Hak akses ──────────────────────────────────────────────────────────────
select ok(
  not exists (
    select 1 from pg_proc p
    where ((p.pronamespace = 'public'::regnamespace
            and p.proname in ('create_offer', 'accept_offer', 'reject_offer', 'delete_offer', 'cancel_order',
                              'submit_deliverable', 'request_revision', 'approve_deliverable'))
        or (p.pronamespace = 'private'::regnamespace and p.proname in ('auto_approve_orders', 'order_revision_limit')))
      and (has_function_privilege('anon', p.oid, 'execute')
        or has_function_privilege('authenticated', p.oid, 'execute'))
  ),
  'RPC order tidak bisa dieksekusi anon/authenticated'
);
select is(
  (select count(*)::int from pg_proc p
    where p.pronamespace = 'public'::regnamespace
      and p.proname in ('create_offer', 'accept_offer', 'reject_offer', 'delete_offer', 'cancel_order',
                        'submit_deliverable', 'request_revision', 'approve_deliverable')
      and has_function_privilege('service_role', p.oid, 'execute')),
  8, 'service_role bisa mengeksekusi 8 RPC');
select is((select schedule from cron.job where jobname = 'auto-approve-orders'), '0 * * * *',
  'job pg_cron auto-approve-orders terdaftar tiap jam');

-- ── create_offer ───────────────────────────────────────────────────────────
select throws_ok(
  $$ select public.create_offer('a2222222-2222-4222-8222-222222222222', 'conv-a', 'X', '', 100000, now() + interval '5 days', 1) $$,
  '42501', null, 'offer oleh UMKM bukan peserta → 42501');
select throws_ok(
  $$ select public.create_offer('a1111111-1111-4111-8111-111111111111', 'conv-a', 'X', '', 100000, now() + interval '5 days', 1, null, 'c2222222-2222-4222-8222-222222222222') $$,
  '22023', null, 'creatorId body tidak cocok percakapan → 22023');
select throws_ok(
  $$ select public.create_offer('a1111111-1111-4111-8111-111111111111', 'conv-a', 'X', '', 100000, now() + interval '5 days', 1, 'pk-draft') $$,
  '22023', null, 'paket dari rate card draft ditolak');
select ok(
  (public.create_offer('a1111111-1111-4111-8111-111111111111', 'conv-a', 'Video Promo', 'Lingkup', 250000,
     now() + interval '5 days', 2, 'pk-pub') ->> 'offerId') is not null,
  'offer dibuat');
select is(
  (select row(package_name_snapshot, package_price_snapshot, status)::text from public.offers where conversation_id = 'conv-a'),
  row('Paket Video', 300000::bigint, 'pending')::text,
  'snapshot paket tersimpan, status pending');
select is(
  (select message_type || '|' || content from public.messages where conversation_id = 'conv-a'),
  'offer|Penawaran Khusus: Video Promo', 'kartu offer di chat');
select is((select offer_id from public.conversations where id = 'conv-a'),
  (select id from public.offers where conversation_id = 'conv-a'), 'conversations.offer_id terisi');
select throws_ok(
  $$ select public.create_offer('a1111111-1111-4111-8111-111111111111', 'conv-a', 'Kedua', '', 100000, now() + interval '5 days', 1) $$,
  'P0001', null, 'offer kedua saat masih ada pending → 409');

-- ── accept_offer ───────────────────────────────────────────────────────────
select throws_ok(
  format($$ select public.accept_offer(%L, 'c2222222-2222-4222-8222-222222222222', 'v3.1') $$,
    (select id from public.offers where conversation_id = 'conv-a')),
  '42501', null, 'accept oleh kreator lain → 42501');
select is(
  public.accept_offer((select id from public.offers where conversation_id = 'conv-a'),
    'c1111111-1111-4111-8111-111111111111', 'v3.1') ->> 'alreadyAccepted',
  'false', 'accept pertama membuat order');
select is(
  public.accept_offer((select id from public.offers where conversation_id = 'conv-a'),
    'c1111111-1111-4111-8111-111111111111', 'v3.1') ->> 'alreadyAccepted',
  'true', 'accept kedua idempoten');
select is((select count(*)::int from public.orders where offer_id = (select id from public.offers where conversation_id = 'conv-a')),
  1, 'accept ganda → tetap satu order');
select is(
  (select row(status, amount, revision_limit, package_name_snapshot)::text from public.orders
    where offer_id = (select id from public.offers where conversation_id = 'conv-a')),
  row('pending_payment', 250000::bigint, 2, 'Paket Video')::text,
  'order pending_payment, amount = harga offer, snapshot & batas revisi dari offer');
select is((select count(*)::int from public.messages where conversation_id = 'conv-a' and message_type = 'system'),
  1, 'pesan sistem satu kali');
select is((select count(*)::int from public.notifications where user_id = 'a1111111-1111-4111-8111-111111111111' and type = 'order_created'),
  1, 'notifikasi order_created ke UMKM satu kali');
select throws_ok(
  $$ select public.create_offer('a1111111-1111-4111-8111-111111111111', 'conv-a', 'Baru', '', 100000, now() + interval '5 days', 1) $$,
  'P0001', null, 'offer baru saat order masih aktif → 409');

-- ToS kreator belum versi berjalan → accept ditolak, offer tetap pending.
select ok((public.create_offer('a1111111-1111-4111-8111-111111111111', 'conv-b', 'Foto', '', 100000,
  now() + interval '5 days', 0) ->> 'offerId') is not null, 'offer conv-b dibuat');
select throws_ok(
  format($$ select public.accept_offer(%L, 'c2222222-2222-4222-8222-222222222222', 'v3.1') $$,
    (select id from public.offers where conversation_id = 'conv-b')),
  'P0001', null, 'kreator belum setuju ToS terbaru → accept ditolak');
select is((select status from public.offers where conversation_id = 'conv-b'), 'pending', 'offer tetap pending');
select is(
  public.reject_offer((select id from public.offers where conversation_id = 'conv-b'), 'c2222222-2222-4222-8222-222222222222') ->> 'status',
  'rejected', 'reject offer');
select is((select count(*)::int from public.notifications where type = 'offer_rejected'), 1, 'notifikasi offer_rejected');
select throws_ok(
  format($$ select public.delete_offer(%L, 'a1111111-1111-4111-8111-111111111111') $$,
    (select id from public.offers where conversation_id = 'conv-b')),
  'P0001', null, 'offer yang sudah dijawab tidak bisa ditarik');

-- ── cancel_order ───────────────────────────────────────────────────────────
select throws_ok(
  format($$ select public.cancel_order(%L, 'a2222222-2222-4222-8222-222222222222') $$,
    (select id from public.orders where offer_id = (select id from public.offers where conversation_id = 'conv-a'))),
  '42501', null, 'cancel order milik UMKM lain → 42501');

-- ── deliverable + revisi ───────────────────────────────────────────────────
update public.orders set status = 'in_progress'
 where offer_id = (select id from public.offers where conversation_id = 'conv-a');
create temp table t_order as
  select id from public.orders where offer_id = (select id from public.offers where conversation_id = 'conv-a');

select throws_ok(
  format($$ select public.submit_deliverable(%L, 'c2222222-2222-4222-8222-222222222222', 'external_url', 'https://x.test/v1') $$,
    (select id from t_order)),
  '42501', null, 'deliverable oleh kreator lain → 42501');
select is(
  (public.submit_deliverable((select id from t_order), 'c1111111-1111-4111-8111-111111111111', 'external_url', 'https://x.test/v1') ->> 'version')::int,
  1, 'deliverable v1');
select ok(
  (select review_deadline_at between now() + interval '71 hours' and now() + interval '73 hours' from public.orders where id = (select id from t_order)),
  'tenggat review 3 hari');
select is((select count(*)::int from public.notifications where type = 'deliverable_submitted'), 1, 'notifikasi deliverable ke UMKM');

select is(public.request_revision((select id from t_order), 'a1111111-1111-4111-8111-111111111111', 'Tolong ganti musik') ->> 'status',
  'open', 'revisi 1');
select is(public.request_revision((select id from t_order), 'a1111111-1111-4111-8111-111111111111', 'Tolong ganti musik') ->> 'id',
  (select id from public.revisions where order_id = (select id from t_order) limit 1), 'revisi idempoten untuk deliverable yang sama');
select is((select status from public.orders where id = (select id from t_order)), 'revision', 'order → revision');

select is(
  (public.submit_deliverable((select id from t_order), 'c1111111-1111-4111-8111-111111111111', 'external_url', 'https://x.test/v2') ->> 'version')::int,
  2, 'deliverable v2, order kembali in_progress');
select ok(public.request_revision((select id from t_order), 'a1111111-1111-4111-8111-111111111111', 'Revisi kedua') ? 'id', 'revisi 2');
select is(
  (public.submit_deliverable((select id from t_order), 'c1111111-1111-4111-8111-111111111111', 'external_url', 'https://x.test/v3') ->> 'version')::int,
  3, 'deliverable v3');
select throws_ok(
  format($$ select public.request_revision(%L, 'a1111111-1111-4111-8111-111111111111', 'Revisi ketiga') $$, (select id from t_order)),
  'P0001', 'Batas revisi (2) sudah tercapai. Setujui apa adanya atau buka sengketa.',
  'revisi melebihi batas → 409');

-- ── auto-approve (cron) ────────────────────────────────────────────────────
update public.orders set review_deadline_at = now() - interval '1 minute' where id = (select id from t_order);
select is((private.auto_approve_orders() ->> 'approvedCount')::int, 1, 'auto-approve menyetujui deliverable lewat tenggat');
select is(
  (select d.status || '|' || o.auto_approved from public.deliverables d join public.orders o on o.id = d.order_id
    where d.order_id = (select id from t_order) and d.version = 3),
  'approved|true', 'deliverable approved + order.auto_approved');
select is((private.auto_approve_orders() ->> 'approvedCount')::int, 0, 'auto-approve idempoten');

select * from finish();
rollback;
