-- pgTAP: review_ratecard_deliverable (0024). Semua data di-rollback.
begin;
create extension if not exists pgtap with schema extensions;

select plan(18);

insert into auth.users (id, email, aud, role, raw_app_meta_data) values
  ('a2400000-0000-4000-8000-000000000001', 'a24-umkm@example.test', 'authenticated', 'authenticated', '{}'),
  ('a2400000-0000-4000-8000-000000000002', 'a24-kreator@example.test', 'authenticated', 'authenticated', '{}'),
  ('a2400000-0000-4000-8000-000000000003', 'a24-admin@example.test', 'authenticated', 'authenticated', '{"role":"admin"}'),
  ('a2400000-0000-4000-8000-000000000004', 'a24-admin2@example.test', 'authenticated', 'authenticated', '{"role":"admin"}'),
  ('a2400000-0000-4000-8000-000000000005', 'a24-sus@example.test', 'authenticated', 'authenticated', '{"role":"admin"}');
insert into public.users (id, role, status, email) values
  ('a2400000-0000-4000-8000-000000000001', 'umkm', 'active', 'a24-umkm@example.test'),
  ('a2400000-0000-4000-8000-000000000002', 'creator', 'active', 'a24-kreator@example.test'),
  ('a2400000-0000-4000-8000-000000000003', 'admin', 'active', 'a24-admin@example.test'),
  ('a2400000-0000-4000-8000-000000000004', 'admin', 'active', 'a24-admin2@example.test'),
  ('a2400000-0000-4000-8000-000000000005', 'admin', 'suspended', 'a24-sus@example.test');

insert into public.rate_cards (id, creator_id, title, status) values
  ('a24-rc', 'a2400000-0000-4000-8000-000000000002', 'RC', 'published');
insert into public.rate_card_packages (id, rate_card_id, name, description, output, delivery_days, price) values
  ('a24-pk', 'a24-rc', 'Basic', 'Paket', '1 video', 3, 100000);

insert into public.orders (id, package_id, creator_id, umkm_id, amount, status) values
  ('a24-o1', 'a24-pk', 'a2400000-0000-4000-8000-000000000002', 'a2400000-0000-4000-8000-000000000001', 100000, 'in_progress'),
  ('a24-o2', 'a24-pk', 'a2400000-0000-4000-8000-000000000002', 'a2400000-0000-4000-8000-000000000001', 100000, 'revision'),
  ('a24-o3', 'a24-pk', 'a2400000-0000-4000-8000-000000000002', 'a2400000-0000-4000-8000-000000000001', 100000, 'completed'),
  ('a24-o4', null,     'a2400000-0000-4000-8000-000000000002', 'a2400000-0000-4000-8000-000000000001', 100000, 'in_progress');

insert into public.deliverables (id, order_id, source, file_url, version, status, created_at) values
  ('a24-d1-v1', 'a24-o1', 'external_url', 'https://x.test/1', 1, 'submitted', now() - interval '2 days'),
  ('a24-d1-v2', 'a24-o1', 'storage',      'https://x.test/2', 2, 'submitted', now() - interval '1 day'),
  ('a24-d2',    'a24-o2', 'external_url', 'https://x.test/3', 1, 'submitted', now()),
  ('a24-d3',    'a24-o3', 'external_url', 'https://x.test/4', 1, 'submitted', now()),
  ('a24-d4',    'a24-o4', 'external_url', 'https://x.test/5', 1, 'submitted', now()),
  ('a24-d5',    'a24-o2', 'external_url', 'https://x.test/6', 0, 'revision_requested', now() - interval '3 days');

-- Hak akses ------------------------------------------------------------------
select ok(
  not has_function_privilege('anon', 'public.review_ratecard_deliverable(uuid, text, text, text)', 'execute')
  and not has_function_privilege('authenticated', 'public.review_ratecard_deliverable(uuid, text, text, text)', 'execute'),
  'anon/authenticated tidak bisa execute'
);
select ok(
  has_function_privilege('service_role', 'public.review_ratecard_deliverable(uuid, text, text, text)', 'execute'),
  'service_role bisa execute'
);

-- Validasi input & admin -----------------------------------------------------
select throws_ok(
  $$ select public.review_ratecard_deliverable('a2400000-0000-4000-8000-000000000003', 'a24-d2', 'maybe') $$,
  '22023', 'Input review tidak valid.', 'keputusan tak dikenal → 22023'
);
select throws_ok(
  $$ select public.review_ratecard_deliverable('a2400000-0000-4000-8000-000000000003', 'a24-d2', 'invalid', '   ') $$,
  '22023', 'Catatan wajib untuk keputusan invalid.', 'invalid tanpa catatan → 22023'
);
select throws_ok(
  $$ select public.review_ratecard_deliverable('a2400000-0000-4000-8000-000000000001', 'a24-d2', 'valid') $$,
  '42501', 'Akses Admin ditolak.', 'UMKM bukan admin → 42501'
);
select throws_ok(
  $$ select public.review_ratecard_deliverable('a2400000-0000-4000-8000-000000000005', 'a24-d2', 'valid') $$,
  '42501', 'Akses Admin ditolak.', 'admin suspended → 42501'
);
select throws_ok(
  $$ select public.review_ratecard_deliverable('a2400000-0000-4000-8000-000000000003', 'nope', 'valid') $$,
  'P0002', 'Deliverable atau order tidak ditemukan.', 'deliverable tidak ada → P0002'
);

-- Aturan bisnis ---------------------------------------------------------------
select throws_ok(
  $$ select public.review_ratecard_deliverable('a2400000-0000-4000-8000-000000000003', 'a24-d4', 'valid') $$,
  'P0001', 'Deliverable bukan bagian dari Rate Card order.', 'order non rate card → P0001'
);
select throws_ok(
  $$ select public.review_ratecard_deliverable('a2400000-0000-4000-8000-000000000003', 'a24-d3', 'valid') $$,
  'P0001', 'Order tidak berada pada tahap review.', 'order completed → P0001'
);
select throws_ok(
  $$ select public.review_ratecard_deliverable('a2400000-0000-4000-8000-000000000003', 'a24-d1-v1', 'valid') $$,
  'P0001', 'Deliverable bukan versi terbaru.', 'versi lama → P0001'
);
select throws_ok(
  $$ select public.review_ratecard_deliverable('a2400000-0000-4000-8000-000000000003', 'a24-d5', 'valid') $$,
  'P0001', 'Deliverable tidak menunggu validasi.', 'status bukan submitted → P0001'
);

-- Sukses + idempoten ----------------------------------------------------------
select is(
  public.review_ratecard_deliverable('a2400000-0000-4000-8000-000000000003', 'a24-d1-v2', 'valid') ->> 'decision',
  'valid',
  'deliverable terbaru divalidasi'
);
select results_eq(
  $$ select status, deliverable_version, source_snapshot, evidence_url_snapshot, reviewed_by::text
     from public.ratecard_deliverable_validations where deliverable_id = 'a24-d1-v2' $$,
  $$ values ('valid'::text, 2, 'storage'::text, 'https://x.test/2'::text, 'a2400000-0000-4000-8000-000000000003'::text) $$,
  'baris validasi menyimpan snapshot deliverable'
);
select is(
  (select count(*)::int from public.notifications
    where id in (private.notification_id('a24-d1-v2', 'ratecard_validation_valid'),
                 private.notification_id('a24-d1-v2', 'ratecard_validation_valid_umkm'))),
  2,
  'notifikasi kreator + UMKM dengan ID deterministik'
);
select is(
  public.review_ratecard_deliverable('a2400000-0000-4000-8000-000000000003', 'a24-d1-v2', 'valid') ->> 'alreadyReviewed',
  'true',
  'retry identik → sukses tanpa efek ganda'
);
select is(
  (select count(*)::int from public.notifications where user_id in
    ('a2400000-0000-4000-8000-000000000001', 'a2400000-0000-4000-8000-000000000002')),
  2,
  'retry tidak menambah notifikasi'
);
select throws_ok(
  $$ select public.review_ratecard_deliverable('a2400000-0000-4000-8000-000000000004', 'a24-d1-v2', 'invalid', 'beda') $$,
  'P0001', 'Deliverable sudah memiliki keputusan final.', 'keputusan berbeda setelah final → P0001'
);
select is(
  public.review_ratecard_deliverable('a2400000-0000-4000-8000-000000000003', 'a24-d2', 'invalid', 'Video buram') ->> 'decision',
  'invalid',
  'invalid dengan catatan untuk order revision'
);

select * from finish();
rollback;
