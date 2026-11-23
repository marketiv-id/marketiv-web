-- pgTAP: RPC tulis campaign Fase 6 (0019_campaign_writes).
begin;
create extension if not exists pgtap with schema extensions;

select plan(20);

-- ── Akun ───────────────────────────────────────────────────────────────────
insert into auth.users (id, email, aud, role, raw_app_meta_data, raw_user_meta_data) values
  ('a1111111-1111-4111-8111-111111111111', 'cw-umkm-a@example.test', 'authenticated', 'authenticated', '{}', '{}'),
  ('b2222222-2222-4222-8222-222222222222', 'cw-umkm-b@example.test', 'authenticated', 'authenticated', '{}', '{}'),
  ('c1111111-1111-4111-8111-111111111111', 'cw-kreator-1@example.test', 'authenticated', 'authenticated', '{}', '{}'),
  ('c2222222-2222-4222-8222-222222222222', 'cw-kreator-2@example.test', 'authenticated', 'authenticated', '{}', '{}');
insert into public.users (id, role, email) values
  ('a1111111-1111-4111-8111-111111111111', 'umkm', 'cw-umkm-a@example.test'),
  ('b2222222-2222-4222-8222-222222222222', 'umkm', 'cw-umkm-b@example.test'),
  ('c1111111-1111-4111-8111-111111111111', 'creator', 'cw-kreator-1@example.test'),
  ('c2222222-2222-4222-8222-222222222222', 'creator', 'cw-kreator-2@example.test');
insert into public.creator_profiles (user_id, display_name, is_profile_completed) values
  ('c1111111-1111-4111-8111-111111111111', 'Lengkap', true),
  ('c2222222-2222-4222-8222-222222222222', 'Belum', false);

-- ── Hak akses ──────────────────────────────────────────────────────────────
select ok(
  not has_function_privilege('anon', 'public.create_campaign_draft(uuid, jsonb, jsonb, jsonb)', 'execute')
  and not has_function_privilege('authenticated', 'public.create_campaign_draft(uuid, jsonb, jsonb, jsonb)', 'execute')
  and has_function_privilege('service_role', 'public.create_campaign_draft(uuid, jsonb, jsonb, jsonb)', 'execute'),
  'create_campaign_draft hanya service_role'
);
select ok(
  not has_function_privilege('anon', 'public.publish_campaign(uuid, text)', 'execute')
  and not has_function_privilege('authenticated', 'public.publish_campaign(uuid, text)', 'execute')
  and has_function_privilege('service_role', 'public.publish_campaign(uuid, text)', 'execute'),
  'publish_campaign hanya service_role'
);

-- ── create_campaign_draft ─────────────────────────────────────────────────
-- Body berbahaya: status/uang/umkm lain diselipkan — harus diabaikan.
create temp table created on commit drop as
select * from public.create_campaign_draft(
  'a1111111-1111-4111-8111-111111111111',
  '{"title":"Promo","thumbnail_url":"","category":"kuliner","type":"ugc","description":"desk",
    "budget":100000,"reward_per_1000_views":5000,"claim_limit":10,"submission_days":5,
    "status":"active","remaining_budget":999999,"spent_amount":5,"total_claims":7,
    "umkm_id":"b2222222-2222-4222-8222-222222222222","published_at":"2026-01-01T00:00:00Z"}'::jsonb,
  '{"objective":"o","content_angle":"a","cta":"beli","brief_detail":"detail",
    "do_and_dont":{"do":["x"],"dont":["y"]},"generated_by_ai":true}'::jsonb,
  '{"file_url":"https://drive.google.com/drive/folders/abc","file_name":""}'::jsonb
);

select is((select status from created), 'draft', 'status dipaksa draft');
select is((select remaining_budget from created), 0::bigint, 'remaining_budget dipaksa 0');
select is((select spent_amount from created), 0::bigint, 'spent_amount dipaksa 0');
select is((select total_claims from created), 0, 'total_claims dipaksa 0');
select is((select umkm_id from created), 'a1111111-1111-4111-8111-111111111111'::uuid, 'umkm_id dari argumen, bukan body');
select ok((select published_at is null from created), 'published_at null');
select is((select platforms from created), array['tiktok']::text[], 'platforms default tiktok');
select is((select submission_days from created), 5, 'submission_days dari body');
select is(
  (select do_and_dont from public.campaign_briefs where campaign_id = (select id from created)),
  '{"do":["x"],"dont":["y"]}'::jsonb,
  'brief tersimpan dengan do_and_dont objek'
);
select is(
  (select file_name || '|' || source || '|' || type from public.campaign_assets where campaign_id = (select id from created)),
  'Folder Aset Eksternal|external|link',
  'aset default nama + source external/link'
);

-- Atomik: brief rusak (CHECK) membatalkan campaign juga.
select throws_ok(
  $$ select public.create_campaign_draft(
       'a1111111-1111-4111-8111-111111111111',
       '{"title":"Gagal","category":"kuliner","type":"ugc","description":"d","budget":100000,
         "reward_per_1000_views":1,"claim_limit":1}'::jsonb,
       jsonb_build_object('brief_detail', repeat('x', 10001)),
       null) $$,
  '23514',
  null,
  'brief melanggar CHECK → seluruh transaksi gagal'
);
select is(
  (select count(*)::int from public.campaigns where title = 'Gagal'),
  0,
  'tidak ada campaign yatim setelah gagal'
);

-- ── publish_campaign ──────────────────────────────────────────────────────
insert into public.campaigns (id, umkm_id, title, category, type, status, budget, remaining_budget) values
  ('cw_funded', 'a1111111-1111-4111-8111-111111111111', 'Didanai', 'kuliner', 'ugc', 'draft', 100000, 100000),
  ('cw_under', 'a1111111-1111-4111-8111-111111111111', 'Kurang', 'kuliner', 'ugc', 'draft', 100000, 50000),
  ('cw_active', 'a1111111-1111-4111-8111-111111111111', 'Aktif', 'kuliner', 'ugc', 'active', 100000, 100000);

select is(public.publish_campaign('b2222222-2222-4222-8222-222222222222', 'cw_funded'), 'not_found', 'milik UMKM lain → not_found');
select is(public.publish_campaign('a1111111-1111-4111-8111-111111111111', 'cw_under'), 'underfunded', 'dana kurang → underfunded');
select is(public.publish_campaign('a1111111-1111-4111-8111-111111111111', 'cw_active'), 'not_draft', 'bukan draft → not_draft');
select is(public.publish_campaign('a1111111-1111-4111-8111-111111111111', 'cw_funded'), 'published', 'didanai → published');
select ok(
  (select status = 'active' and published_at is not null from public.campaigns where id = 'cw_funded'),
  'status active + published_at terisi'
);
-- Notifikasi: hanya kreator profil lengkap, id deterministik sama dengan Function lama.
select results_eq(
  $$ select id, user_id, type from public.notifications
     where type = 'campaign_published' and message like '%Didanai%' order by id $$,
  $$ values (
       'ntf' || left(encode(sha256(convert_to('cw_funded:c1111111-1111-4111-8111-111111111111:campaign_published', 'UTF8')), 'hex'), 29),
       'c1111111-1111-4111-8111-111111111111'::uuid,
       'campaign_published'::text
     ) $$,
  'notifikasi kreator profil lengkap, id deterministik'
);

select * from finish();
rollback;
