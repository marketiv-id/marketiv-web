-- pgTAP: RPC baca admin Fase 5 (admin_ratecard_deliverable_queue).
begin;
create extension if not exists pgtap with schema extensions;

select plan(9);

insert into auth.users (id, email, aud, role, raw_app_meta_data, raw_user_meta_data) values
  ('11111111-1111-1111-1111-111111111111', 'umkm@example.test', 'authenticated', 'authenticated', '{}', '{}'),
  ('22222222-2222-2222-2222-222222222222', 'kreator@example.test', 'authenticated', 'authenticated', '{}', '{}'),
  ('33333333-3333-3333-3333-333333333333', 'admin@example.test', 'authenticated', 'authenticated', '{"role":"admin"}', '{}');
insert into public.users (id, role, status, email) values
  ('11111111-1111-1111-1111-111111111111', 'umkm', 'active', 'umkm@example.test'),
  ('22222222-2222-2222-2222-222222222222', 'creator', 'active', 'kreator@example.test'),
  ('33333333-3333-3333-3333-333333333333', 'admin', 'active', 'admin@example.test');
insert into public.umkm_profiles (user_id, business_name) values
  ('11111111-1111-1111-1111-111111111111', 'Toko Uji');
insert into public.creator_profiles (user_id, display_name) values
  ('22222222-2222-2222-2222-222222222222', 'Kreator Uji');

insert into public.orders (id, creator_id, umkm_id, amount, status, package_name_snapshot) values
  ('o-ok',       '22222222-2222-2222-2222-222222222222', '11111111-1111-1111-1111-111111111111', 150000, 'in_progress', 'Paket A'),
  ('o-revision', '22222222-2222-2222-2222-222222222222', '11111111-1111-1111-1111-111111111111', 90000,  'revision',    null),
  ('o-done',     '22222222-2222-2222-2222-222222222222', '11111111-1111-1111-1111-111111111111', 50000,  'completed',   'Paket C'),
  ('o-valid',    '22222222-2222-2222-2222-222222222222', '11111111-1111-1111-1111-111111111111', 70000,  'in_progress', 'Paket D');

insert into public.deliverables (id, order_id, source, file_url, version, status, notes, created_at) values
  -- o-ok: v1 lama (bukan terbaru) + v2 terbaru → hanya v2
  ('d-ok-v1', 'o-ok', 'external_url', 'https://x.test/1', 1, 'submitted', null, '2026-01-01T00:00:00Z'),
  ('d-ok-v2', 'o-ok', 'storage',      'https://x.test/2', 2, 'submitted', 'revisi', '2026-01-03T00:00:00Z'),
  -- o-revision: satu deliverable → masuk
  ('d-rev',   'o-revision', 'external_url', 'https://x.test/r', 1, 'submitted', null, '2026-01-02T00:00:00Z'),
  -- o-done: order selesai → keluar
  ('d-done',  'o-done', 'external_url', 'https://x.test/d', 1, 'submitted', null, '2026-01-04T00:00:00Z'),
  -- o-valid: sudah divalidasi → keluar
  ('d-valid', 'o-valid', 'external_url', 'https://x.test/v', 1, 'submitted', null, '2026-01-05T00:00:00Z');

insert into public.ratecard_deliverable_validations
  (deliverable_id, order_id, deliverable_version, source_snapshot, evidence_url_snapshot, status, reviewed_by)
values ('d-valid', 'o-valid', 1, 'external_url', 'https://x.test/v', 'valid', '33333333-3333-3333-3333-333333333333');

-- 1. Hak eksekusi
select ok(
  not has_function_privilege('anon', 'public.admin_ratecard_deliverable_queue(integer)', 'execute')
  and not has_function_privilege('authenticated', 'public.admin_ratecard_deliverable_queue(integer)', 'execute'),
  'admin_ratecard_deliverable_queue tidak bisa dipanggil anon/authenticated'
);
select ok(
  has_function_privilege('service_role', 'public.admin_ratecard_deliverable_queue(integer)', 'execute'),
  'admin_ratecard_deliverable_queue bisa dipanggil service_role'
);
select is(
  (select prosecdef from pg_proc where oid = 'public.admin_ratecard_deliverable_queue(integer)'::regprocedure),
  false, 'SECURITY INVOKER'
);

-- 2. Aturan antrean
select is(
  (select string_agg(deliverable_id, ',' order by submitted_at desc) from public.admin_ratecard_deliverable_queue()),
  'd-ok-v2,d-rev',
  'hanya deliverable terbaru, belum divalidasi, order in_progress/revision; terbaru dulu'
);
select is(
  (select creator_display_name || '|' || umkm_business_name || '|' || amount::text || '|' || package_name_snapshot
     from public.admin_ratecard_deliverable_queue() where deliverable_id = 'd-ok-v2'),
  'Kreator Uji|Toko Uji|150000|Paket A',
  'join profil kreator/UMKM + snapshot order'
);
select is(
  (select package_name_snapshot from public.admin_ratecard_deliverable_queue() where deliverable_id = 'd-rev'),
  null, 'snapshot paket null diteruskan (fallback di route)'
);
select is((select count(*)::int from public.admin_ratecard_deliverable_queue(1)), 1, 'p_limit dihormati');
select is((select count(*)::int from public.admin_ratecard_deliverable_queue(0)), 1, 'p_limit < 1 dibatasi ke 1');

-- 3. Index pendukung ada
select has_index('public', 'deliverables', 'deliverables_order_id_version_idx', 'index versi terbaru per order');

select * from finish();
rollback;
