-- pgTAP: RLS, helper otorisasi, storage, realtime (Fase 3).
-- Jalankan dengan `supabase test db`. Semua data dibuat di dalam transaksi dan
-- di-rollback di akhir.
--
-- Simulasi sesi: `set local role <anon|authenticated>` + klaim JWT di
-- `request.jwt.claims` (sumber auth.uid()). `reset role` kembali ke postgres.
begin;
create extension if not exists pgtap with schema extensions;

select plan(71);

-- =============================================================================
-- Fixture (sebagai postgres, melewati RLS)
-- =============================================================================
-- A   = UMKM          11111111-…
-- B   = kreator       22222222-…
-- C   = UMKM lain     33333333-…
-- ADM = admin sah     44444444-… (app_metadata.role = admin, users.role = admin)
-- FAK = "admin palsu" 55555555-… (users.role = admin, TANPA app_metadata)
-- SUS = admin suspended 66666666-…
insert into auth.users (id, email, aud, role, raw_app_meta_data, raw_user_meta_data)
values
  ('11111111-1111-1111-1111-111111111111', 'a@example.test', 'authenticated', 'authenticated', '{}', '{}'),
  ('22222222-2222-2222-2222-222222222222', 'b@example.test', 'authenticated', 'authenticated', '{}', '{}'),
  ('33333333-3333-3333-3333-333333333333', 'c@example.test', 'authenticated', 'authenticated', '{}', '{}'),
  ('44444444-4444-4444-4444-444444444444', 'adm@example.test', 'authenticated', 'authenticated',
    '{"role": "admin"}', '{}'),
  -- user_metadata.role = admin TIDAK boleh berpengaruh.
  ('55555555-5555-5555-5555-555555555555', 'fak@example.test', 'authenticated', 'authenticated',
    '{}', '{"role": "admin"}'),
  ('66666666-6666-6666-6666-666666666666', 'sus@example.test', 'authenticated', 'authenticated',
    '{"role": "admin"}', '{}');

insert into public.users (id, role, status, email) values
  ('11111111-1111-1111-1111-111111111111', 'umkm', 'active', 'a@example.test'),
  ('22222222-2222-2222-2222-222222222222', 'creator', 'active', 'b@example.test'),
  ('33333333-3333-3333-3333-333333333333', 'umkm', 'active', 'c@example.test'),
  ('44444444-4444-4444-4444-444444444444', 'admin', 'active', 'adm@example.test'),
  ('55555555-5555-5555-5555-555555555555', 'admin', 'active', 'fak@example.test'),
  ('66666666-6666-6666-6666-666666666666', 'admin', 'suspended', 'sus@example.test');

insert into public.umkm_profiles (id, user_id, business_name) values
  ('up_a', '11111111-1111-1111-1111-111111111111', 'Toko A');
insert into public.creator_profiles (id, user_id, display_name) values
  ('cp_b', '22222222-2222-2222-2222-222222222222', 'Kreator B');
insert into public.creator_social_accounts (id, creator_id, platform, username) values
  ('sa_b', '22222222-2222-2222-2222-222222222222', 'tiktok', 'kreator_b');
insert into public.creator_portfolios (id, creator_id, title) values
  ('pf_b', '22222222-2222-2222-2222-222222222222', 'Portofolio B');

insert into public.rate_cards (id, creator_id, title, status) values
  ('rc_pub', '22222222-2222-2222-2222-222222222222', 'Rate card publik', 'published'),
  ('rc_draft', '22222222-2222-2222-2222-222222222222', 'Rate card draft', 'draft');
insert into public.rate_card_packages (id, rate_card_id, name, description, output, delivery_days, price) values
  ('pk_pub', 'rc_pub', 'Basic', 'Paket publik', '1 video', 3, 100000),
  ('pk_draft', 'rc_draft', 'Basic', 'Paket draft', '1 video', 3, 100000);

insert into public.campaigns (id, umkm_id, title, category, type, status) values
  ('camp_active', '11111111-1111-1111-1111-111111111111', 'Campaign aktif', 'kuliner', 'ugc', 'active'),
  ('camp_draft', '11111111-1111-1111-1111-111111111111', 'Campaign draft', 'kuliner', 'ugc', 'draft');
insert into public.campaign_briefs (id, campaign_id) values
  ('br_active', 'camp_active'),
  ('br_draft', 'camp_draft');
insert into public.campaign_assets (id, campaign_id, source, type, file_url) values
  ('as_active', 'camp_active', 'external_url', 'link', 'https://example.test/a'),
  ('as_draft', 'camp_draft', 'external_url', 'link', 'https://example.test/d');
insert into public.campaign_claims (id, campaign_id, creator_id) values
  ('cl_b', 'camp_active', '22222222-2222-2222-2222-222222222222');

insert into public.wallets (id, user_id, balance) values
  ('w_a', '11111111-1111-1111-1111-111111111111', 1000),
  ('w_b', '22222222-2222-2222-2222-222222222222', 2000),
  ('w_c', '33333333-3333-3333-3333-333333333333', 3000);

insert into public.notifications (id, user_id, title, message, type) values
  ('n_a', '11111111-1111-1111-1111-111111111111', 'Hai A', 'pesan', 'system'),
  ('n_b', '22222222-2222-2222-2222-222222222222', 'Hai B', 'pesan', 'system');

insert into public.conversations (id, umkm_id, creator_id) values
  ('conv_ab', '11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222'),
  ('conv_cb', '33333333-3333-3333-3333-333333333333', '22222222-2222-2222-2222-222222222222');
insert into public.messages (id, conversation_id, sender_id, content) values
  ('m_ab', 'conv_ab', '11111111-1111-1111-1111-111111111111', 'halo B'),
  ('m_cb', 'conv_cb', '33333333-3333-3333-3333-333333333333', 'halo B dari C');

insert into public.orders (id, umkm_id, creator_id, amount, status) values
  ('ord_ab', '11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222', 100000, 'in_progress'),
  ('ord_cb', '33333333-3333-3333-3333-333333333333', '22222222-2222-2222-2222-222222222222', 100000, 'in_progress');
insert into public.deliverables (id, order_id, source, file_url) values
  ('dl_ab', 'ord_ab', 'external_url', 'https://example.test/v1'),
  ('dl_cb', 'ord_cb', 'external_url', 'https://example.test/v2');
insert into public.escrows (id, order_id, amount) values
  ('es_ab', 'ord_ab', 100000);

-- =============================================================================
-- 1. Struktur: hanya policy SELECT, hak tulis dicabut, helper aman
-- =============================================================================
select is(
  (select count(*)::int from pg_policies where schemaname = 'public' and cmd <> 'SELECT'),
  0,
  'tidak ada policy INSERT/UPDATE/DELETE/ALL di schema public'
);
select is(
  (select count(*)::int
     from pg_tables t
    where t.schemaname = 'public'
      and not exists (
        select 1 from pg_policies p
         where p.schemaname = 'public' and p.tablename = t.tablename
      )),
  0,
  'setiap tabel public punya minimal satu policy'
);
select is(
  (select count(*)::int
     from pg_class c
    where c.relnamespace = 'public'::regnamespace
      and c.relkind in ('r', 'p', 'v', 'm')
      and (
        has_table_privilege('authenticated', c.oid, 'INSERT,UPDATE,DELETE,TRUNCATE')
        or has_table_privilege('anon', c.oid, 'INSERT,UPDATE,DELETE,TRUNCATE')
      )),
  0,
  'anon/authenticated tidak punya hak INSERT/UPDATE/DELETE/TRUNCATE di tabel public mana pun'
);
select is(
  (select count(*)::int
     from pg_policies
    where schemaname = 'public'
      and permissive = 'PERMISSIVE'
      and tablename in ('escrows', 'fraud_checks', 'ratecard_deliverable_validations',
                        'ai_requests', 'otp_rate_limits', 'legacy_user_map')),
  0,
  'tabel server-only tidak punya policy permissive'
);
select is(
  (select count(*)::int
     from pg_proc p
    where p.pronamespace = 'private'::regnamespace
      and p.proname in ('current_user_row', 'is_admin', 'is_conversation_participant', 'is_order_party')
      and p.prosecdef
      and p.provolatile = 's'
      and p.proconfig @> array['search_path=""']),
  4,
  '4 helper: security definer, stable, search_path kosong'
);
select is(
  (select count(*)::int
     from pg_proc p
    where p.pronamespace = 'public'::regnamespace
      and p.prosecdef
      and (has_function_privilege('anon', p.oid, 'execute')
           or has_function_privilege('authenticated', p.oid, 'execute'))),
  0,
  'tidak ada fungsi SECURITY DEFINER di public yang bisa dipanggil anon/authenticated (Data API)'
);
select ok(
  not exists (
    select 1 from pg_proc p
     where p.pronamespace = 'private'::regnamespace
       and p.proname = 'is_admin'
       and (p.prosrc ilike '%user_meta%' or p.prosrc ilike '%raw_user_meta_data%')
  ),
  'is_admin() tidak membaca user_metadata'
);

-- =============================================================================
-- 2. Anon: hanya profil, rate card published, campaign non-draft
-- =============================================================================
set local role anon;
select set_config('request.jwt.claims', '{"role": "anon"}', true);

select is((select count(*)::int from public.umkm_profiles), 1, 'anon melihat profil UMKM');
select is((select count(*)::int from public.creator_profiles), 1, 'anon melihat profil kreator');
select is((select count(*)::int from public.creator_social_accounts), 1, 'anon melihat akun sosial kreator');
select is((select count(*)::int from public.creator_portfolios), 1, 'anon melihat portofolio kreator');
select results_eq(
  'select id from public.rate_cards order by id',
  $$values ('rc_pub'::text)$$,
  'anon hanya melihat rate card published'
);
select results_eq(
  'select id from public.rate_card_packages order by id',
  $$values ('pk_pub'::text)$$,
  'anon hanya melihat paket dari rate card published'
);
select results_eq(
  'select id from public.campaigns order by id',
  $$values ('camp_active'::text)$$,
  'anon hanya melihat campaign non-draft'
);
select results_eq(
  'select id from public.campaign_briefs order by id',
  $$values ('br_active'::text)$$,
  'anon hanya melihat brief campaign non-draft'
);
select results_eq(
  'select id from public.campaign_assets order by id',
  $$values ('as_active'::text)$$,
  'anon hanya melihat aset campaign non-draft'
);
select throws_ok('select * from public.users', '42501', null, 'anon tidak bisa SELECT users');
select throws_ok('select * from public.wallets', '42501', null, 'anon tidak bisa SELECT wallets');
select throws_ok('select * from public.messages', '42501', null, 'anon tidak bisa SELECT messages');
select throws_ok('select * from public.campaign_claims', '42501', null, 'anon tidak bisa SELECT campaign_claims');
select throws_ok(
  $$insert into public.campaigns (umkm_id, title, category, type, status)
    values ('11111111-1111-1111-1111-111111111111', 'x', 'x', 'ugc', 'active')$$,
  '42501', null, 'anon tidak bisa INSERT campaigns'
);
select is((select private.is_admin()), false, 'anon bukan admin');

-- =============================================================================
-- 3. User A (UMKM)
-- =============================================================================
reset role;
set local role authenticated;
select set_config('request.jwt.claims',
  '{"sub": "11111111-1111-1111-1111-111111111111", "role": "authenticated"}', true);

-- 3a. Data milik sendiri saja
select results_eq(
  'select id from public.users order by id',
  $$values ('11111111-1111-1111-1111-111111111111'::uuid)$$,
  'A hanya melihat baris users miliknya'
);
select results_eq(
  'select id from public.wallets order by id',
  $$values ('w_a'::text)$$,
  'A hanya melihat wallet miliknya'
);
select is(
  (select count(*)::int from public.wallets where user_id = '22222222-2222-2222-2222-222222222222'),
  0, 'A tidak bisa SELECT wallet milik B'
);
select results_eq(
  'select id from public.notifications order by id',
  $$values ('n_a'::text)$$,
  'A hanya melihat notifikasi miliknya'
);
select results_eq(
  'select id from public.messages order by id',
  $$values ('m_ab'::text)$$,
  'A hanya melihat pesan di percakapan yang ia ikuti'
);
select is(
  (select count(*)::int from public.messages where conversation_id = 'conv_cb'),
  0, 'A tidak bisa SELECT pesan percakapan C–B'
);
select results_eq(
  'select id from public.conversations order by id',
  $$values ('conv_ab'::text)$$,
  'A hanya melihat percakapan miliknya'
);
select results_eq(
  'select id from public.orders order by id',
  $$values ('ord_ab'::text)$$,
  'A hanya melihat order miliknya'
);
select is(
  (select count(*)::int from public.orders where id = 'ord_cb'),
  0, 'A tidak bisa SELECT order C–B'
);
select results_eq(
  'select id from public.deliverables order by id',
  $$values ('dl_ab'::text)$$,
  'A hanya melihat deliverable order miliknya'
);
select results_eq(
  'select id from public.campaigns order by id',
  $$values ('camp_active'::text), ('camp_draft'::text)$$,
  'A melihat campaign draft miliknya'
);
select results_eq(
  'select id from public.campaign_claims order by id',
  $$values ('cl_b'::text)$$,
  'A (pemilik campaign) melihat klaim di campaign-nya'
);
select results_eq(
  'select id from public.rate_cards order by id',
  $$values ('rc_pub'::text)$$,
  'A tidak melihat rate card draft milik B'
);
select throws_ok('select * from public.escrows', '42501', null, 'A tidak bisa SELECT escrows (server-only)');
select throws_ok('select * from public.legacy_user_map', '42501', null, 'A tidak bisa SELECT legacy_user_map');

-- 3b. Celah #1: tidak bisa mengubah role sendiri
select throws_ok(
  $$update public.users set role = 'admin' where id = '11111111-1111-1111-1111-111111111111'$$,
  '42501', null, 'celah #1: A tidak bisa UPDATE users.role'
);
select throws_ok(
  $$update public.users set status = 'active', kyc_status = 'verified'
     where id = '11111111-1111-1111-1111-111111111111'$$,
  '42501', null, 'A tidak bisa UPDATE users.status/kyc_status'
);
-- 3c. Celah #2: tidak bisa membuat campaign dari browser
select throws_ok(
  $$insert into public.campaigns (umkm_id, title, category, type, status, remaining_budget)
    values ('11111111-1111-1111-1111-111111111111', 'Gratis', 'kuliner', 'ugc', 'active', 999999999)$$,
  '42501', null, 'celah #2: A tidak bisa INSERT campaigns'
);
select throws_ok(
  $$update public.campaigns set status = 'active' where id = 'camp_draft'$$,
  '42501', null, 'A tidak bisa UPDATE campaigns'
);
select throws_ok(
  $$update public.wallets set balance = 999999999 where user_id = '11111111-1111-1111-1111-111111111111'$$,
  '42501', null, 'A tidak bisa UPDATE wallet miliknya'
);
select throws_ok(
  $$insert into public.messages (conversation_id, sender_id, content)
    values ('conv_ab', '11111111-1111-1111-1111-111111111111', 'x')$$,
  '42501', null, 'A tidak bisa INSERT messages langsung'
);
select throws_ok(
  $$delete from public.notifications where id = 'n_a'$$,
  '42501', null, 'A tidak bisa DELETE notifikasi'
);

-- 3d. Helper
select is((select private.is_admin()), false, 'A bukan admin');
select is(private.is_conversation_participant('conv_ab'), true, 'A peserta conv_ab');
select is(private.is_conversation_participant('conv_cb'), false, 'A bukan peserta conv_cb');
select is(private.is_order_party('ord_cb'), false, 'A bukan pihak ord_cb');
select is((private.current_user_row()).role, 'umkm', 'current_user_row() mengembalikan baris A');

-- =============================================================================
-- 4. User B (kreator) dan C (UMKM lain)
-- =============================================================================
select set_config('request.jwt.claims',
  '{"sub": "22222222-2222-2222-2222-222222222222", "role": "authenticated"}', true);
select results_eq(
  'select id from public.rate_card_packages order by id',
  $$values ('pk_draft'::text), ('pk_pub'::text)$$,
  'B (pemilik) melihat paket rate card draft miliknya'
);
select results_eq(
  'select id from public.messages order by id',
  $$values ('m_ab'::text), ('m_cb'::text)$$,
  'B melihat pesan di kedua percakapannya'
);
select results_eq(
  'select id from public.campaign_claims order by id',
  $$values ('cl_b'::text)$$,
  'B (kreator) melihat klaim miliknya'
);

select set_config('request.jwt.claims',
  '{"sub": "33333333-3333-3333-3333-333333333333", "role": "authenticated"}', true);
select is((select count(*)::int from public.campaign_claims), 0, 'C tidak melihat klaim campaign milik A');
select is((select count(*)::int from public.campaigns where status = 'draft'), 0, 'C tidak melihat campaign draft milik A');
select is((select count(*)::int from public.deliverables where order_id = 'ord_ab'), 0, 'C tidak melihat deliverable order A–B');

-- =============================================================================
-- 5. Admin (celah #5): hanya app_metadata.role + users.role + status active
-- =============================================================================
select set_config('request.jwt.claims',
  '{"sub": "44444444-4444-4444-4444-444444444444", "role": "authenticated"}', true);
select is((select private.is_admin()), true, 'admin sah: is_admin() = true');
select is((select count(*)::int from public.wallets), 3, 'admin membaca semua wallet');
select throws_ok(
  $$update public.users set status = 'suspended' where id = '11111111-1111-1111-1111-111111111111'$$,
  '42501', null, 'admin pun tidak bisa menulis dari browser (wajib lewat route)'
);

select set_config('request.jwt.claims',
  '{"sub": "55555555-5555-5555-5555-555555555555", "role": "authenticated", "user_metadata": {"role": "admin"}}', true);
select is((select private.is_admin()), false, 'users.role/user_metadata admin tanpa app_metadata: bukan admin');
select is((select count(*)::int from public.wallets), 0, 'admin palsu tidak membaca wallet orang lain');

select set_config('request.jwt.claims',
  '{"sub": "66666666-6666-6666-6666-666666666666", "role": "authenticated"}', true);
select is((select private.is_admin()), false, 'admin suspended: bukan admin');

-- =============================================================================
-- 6. Storage
-- =============================================================================
reset role;
select is(
  (select count(*)::int from storage.buckets
    where id in ('avatars', 'creator-banners', 'logos', 'portfolios', 'campaign-assets') and public),
  5, '5 bucket publik'
);
select is(
  (select count(*)::int from storage.buckets
    where id in ('deliverables', 'fraud-evidence', 'user-files') and not public),
  3, '3 bucket privat'
);
select results_eq(
  $$select id, file_size_limit from storage.buckets
     where id in ('avatars', 'creator-banners', 'logos', 'portfolios', 'campaign-assets',
                  'deliverables', 'fraud-evidence', 'user-files')
     order by id$$,
  $$values ('avatars'::text, 5000000::bigint), ('campaign-assets', 50000000), ('creator-banners', 5000000),
           ('deliverables', 50000000), ('fraud-evidence', 5000000), ('logos', 5000000),
           ('portfolios', 50000000), ('user-files', 20971520)$$,
  'file_size_limit per bucket (Free: maks 50 MB)'
);
select is(
  (select allowed_mime_types from storage.buckets where id = 'avatars'),
  array['image/jpeg', 'image/png', 'image/webp'],
  'MIME avatars = jpg/jpeg/png/webp'
);

set local role authenticated;
select set_config('request.jwt.claims',
  '{"sub": "11111111-1111-1111-1111-111111111111", "role": "authenticated"}', true);
select lives_ok(
  $$insert into storage.objects (bucket_id, name, owner_id)
    values ('avatars', '11111111-1111-1111-1111-111111111111/f1.png', '11111111-1111-1111-1111-111111111111')$$,
  'A bisa upload ke avatars/{uid_sendiri}/x.png'
);
select throws_ok(
  $$insert into storage.objects (bucket_id, name, owner_id)
    values ('avatars', '22222222-2222-2222-2222-222222222222/x.png', '11111111-1111-1111-1111-111111111111')$$,
  '42501', null, 'upload ke avatars/{uid_lain}/x.png ditolak'
);
select throws_ok(
  $$insert into storage.objects (bucket_id, name, owner_id)
    values ('avatars', '11111111-1111-1111-1111-111111111111/sub/x.png', '11111111-1111-1111-1111-111111111111')$$,
  '42501', null, 'upload ke subfolder di bawah folder sendiri ditolak (format path)'
);
select throws_ok(
  $$insert into storage.objects (bucket_id, name, owner_id)
    values ('deliverables', '11111111-1111-1111-1111-111111111111/x.mp4', '11111111-1111-1111-1111-111111111111')$$,
  '42501', null, 'upload langsung ke bucket privat ditolak (wajib signed URL)'
);
select is(
  (select count(*)::int from storage.objects where bucket_id = 'avatars'),
  1, 'A hanya melihat objek di folder miliknya'
);

-- =============================================================================
-- 7. Realtime
-- =============================================================================
reset role;
select is(
  (select string_agg(tablename::text, ',' order by tablename::text)
     from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public'),
  'messages,notifications',
  'messages & notifications dipublikasikan ke supabase_realtime'
);

select * from finish();
rollback;
