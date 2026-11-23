-- pgTAP: RPC baca kreator Fase 5 (0016_read_creator).
begin;
create extension if not exists pgtap with schema extensions;

select plan(27);

-- ── Hak eksekusi: hanya service_role ────────────────────────────────────────
select ok(
  not has_function_privilege('anon', 'public.creator_dashboard_summary(uuid)', 'execute')
  and not has_function_privilege('authenticated', 'public.creator_dashboard_summary(uuid)', 'execute')
  and has_function_privilege('service_role', 'public.creator_dashboard_summary(uuid)', 'execute'),
  'creator_dashboard_summary hanya service_role'
);
select ok(
  not has_function_privilege('anon', 'public.creator_negotiation_rows(uuid, text)', 'execute')
  and not has_function_privilege('authenticated', 'public.creator_negotiation_rows(uuid, text)', 'execute')
  and has_function_privilege('service_role', 'public.creator_negotiation_rows(uuid, text)', 'execute'),
  'creator_negotiation_rows hanya service_role'
);
select ok(
  not has_function_privilege('anon', 'public.creator_starting_prices(uuid[])', 'execute')
  and not has_function_privilege('authenticated', 'public.creator_starting_prices(uuid[])', 'execute')
  and has_function_privilege('service_role', 'public.creator_starting_prices(uuid[])', 'execute'),
  'creator_starting_prices hanya service_role'
);
select ok(
  not has_function_privilege('anon', 'public.creator_directory_page(integer, text)', 'execute')
  and not has_function_privilege('authenticated', 'public.creator_directory_page(integer, text)', 'execute')
  and has_function_privilege('service_role', 'public.creator_directory_page(integer, text)', 'execute'),
  'creator_directory_page hanya service_role'
);

-- ── Fixture ─────────────────────────────────────────────────────────────────
-- K = kreator yang diuji, K2 = kreator lain, U = UMKM.
insert into auth.users (id, email, aud, role, raw_app_meta_data, raw_user_meta_data) values
  ('cccccccc-0000-0000-0000-000000000001', 'k@example.test', 'authenticated', 'authenticated', '{}', '{}'),
  ('cccccccc-0000-0000-0000-000000000002', 'k2@example.test', 'authenticated', 'authenticated', '{}', '{}'),
  ('dddddddd-0000-0000-0000-000000000001', 'u@example.test', 'authenticated', 'authenticated', '{}', '{}');
insert into public.users (id, role, email) values
  ('cccccccc-0000-0000-0000-000000000001', 'creator', 'k@example.test'),
  ('cccccccc-0000-0000-0000-000000000002', 'creator', 'k2@example.test'),
  ('dddddddd-0000-0000-0000-000000000001', 'umkm', 'u@example.test');

insert into public.creator_profiles (id, user_id, display_name, rating, is_profile_completed) values
  ('cp-k', 'cccccccc-0000-0000-0000-000000000001', 'Kreator', 4.5, true),
  ('cp-k2', 'cccccccc-0000-0000-0000-000000000002', 'Kreator Dua', 4.5, true);
insert into public.umkm_profiles (user_id, business_name, logo_url) values
  ('dddddddd-0000-0000-0000-000000000001', 'Toko U', 'https://x/logo.png');

insert into public.wallets (user_id, balance, pending_balance) values
  ('cccccccc-0000-0000-0000-000000000001', 150000, 20000);

insert into public.campaigns (id, umkm_id, title, category, type, status, claim_limit, total_claims) values
  ('camp-open', 'dddddddd-0000-0000-0000-000000000001', 'Open', 'kuliner', 'ugc', 'active', 0, 5),
  ('camp-full', 'dddddddd-0000-0000-0000-000000000001', 'Full', 'kuliner', 'ugc', 'active', 2, 2),
  ('camp-slot', 'dddddddd-0000-0000-0000-000000000001', 'Slot', 'kuliner', 'ugc', 'active', 3, 1),
  ('camp-claimed', 'dddddddd-0000-0000-0000-000000000001', 'Claimed', 'kuliner', 'ugc', 'active', 0, 1),
  ('camp-draft', 'dddddddd-0000-0000-0000-000000000001', 'Draft', 'kuliner', 'ugc', 'draft', 0, 0);
insert into public.campaign_claims (id, campaign_id, creator_id, status) values
  ('cl-1', 'camp-claimed', 'cccccccc-0000-0000-0000-000000000001', 'claimed'),
  ('cl-2', 'camp-draft', 'cccccccc-0000-0000-0000-000000000001', 'approved'),
  ('cl-3', 'camp-open', 'cccccccc-0000-0000-0000-000000000002', 'claimed');
insert into public.campaign_submissions (id, claim_id, campaign_id, creator_id, platform, post_url, views, status) values
  ('sub-1', 'cl-1', 'camp-claimed', 'cccccccc-0000-0000-0000-000000000001', 'tiktok', 'https://t/1', 10, 'pending'),
  ('sub-2', 'cl-2', 'camp-draft', 'cccccccc-0000-0000-0000-000000000001', 'tiktok', 'https://t/2', 1200, 'approved');

-- Rate card: published (paket 50k, 0, 75k), draft (10k — tidak boleh ikut).
insert into public.rate_cards (id, creator_id, title, status) values
  ('rc-pub', 'cccccccc-0000-0000-0000-000000000001', 'Pub', 'published'),
  ('rc-draft', 'cccccccc-0000-0000-0000-000000000001', 'Draft', 'draft');
insert into public.rate_card_packages (id, rate_card_id, name, description, output, delivery_days, price) values
  ('pkg-a', 'rc-pub', 'A', 'desc A', '1 video', 3, 50000),
  ('pkg-zero', 'rc-pub', 'Z', 'desc Z', '-', 3, 0),
  ('pkg-b', 'rc-pub', 'B', 'desc B', '2 video', 5, 75000),
  ('pkg-d', 'rc-draft', 'D', 'desc D', '-', 1, 10000);

-- Percakapan: conv-1 (offer lama ditolak + offer baru diterima → order + escrow +
-- 2 deliverable), conv-2 (tanpa pesan), conv-x milik K2.
insert into public.conversations (id, umkm_id, creator_id, last_message, last_message_at, created_at) values
  ('conv-1', 'dddddddd-0000-0000-0000-000000000001', 'cccccccc-0000-0000-0000-000000000001', 'halo', '2026-11-20T10:00:00Z', '2026-11-01T00:00:00Z');
insert into auth.users (id, email, aud, role) values
  ('dddddddd-0000-0000-0000-000000000002', 'u2@example.test', 'authenticated', 'authenticated');
insert into public.users (id, role, email) values ('dddddddd-0000-0000-0000-000000000002', 'umkm', 'u2@example.test');
insert into public.conversations (id, umkm_id, creator_id, created_at) values
  ('conv-2', 'dddddddd-0000-0000-0000-000000000002', 'cccccccc-0000-0000-0000-000000000001', '2026-11-05T00:00:00Z'),
  ('conv-x', 'dddddddd-0000-0000-0000-000000000001', 'cccccccc-0000-0000-0000-000000000002', '2026-11-05T00:00:00Z');
insert into public.offers (id, conversation_id, umkm_id, creator_id, title, price, deadline, status, created_at) values
  ('off-old', 'conv-1', 'dddddddd-0000-0000-0000-000000000001', 'cccccccc-0000-0000-0000-000000000001', 'Lama', 40000, '2026-12-01T00:00:00Z', 'rejected', '2026-11-02T00:00:00Z'),
  ('off-new', 'conv-1', 'dddddddd-0000-0000-0000-000000000001', 'cccccccc-0000-0000-0000-000000000001', 'Baru', 50000, '2026-12-05T00:00:00Z', 'accepted', '2026-11-03T00:00:00Z');
insert into public.orders (id, offer_id, package_id, creator_id, umkm_id, amount, status) values
  ('ord-1', 'off-new', 'pkg-a', 'cccccccc-0000-0000-0000-000000000001', 'dddddddd-0000-0000-0000-000000000001', 50000, 'in_progress');
insert into public.escrows (order_id, amount, status, fee_rate) values ('ord-1', 50000, 'held', 0.02);
insert into public.deliverables (id, order_id, source, file_url, version) values
  ('dlv-1', 'ord-1', 'external_url', 'https://v/1', 1),
  ('dlv-2', 'ord-1', 'external_url', 'https://v/2', 2);
insert into public.messages (conversation_id, sender_id, content, read_at) values
  ('conv-1', 'dddddddd-0000-0000-0000-000000000001', 'a', null),
  ('conv-1', 'dddddddd-0000-0000-0000-000000000001', 'b', null),
  ('conv-1', 'dddddddd-0000-0000-0000-000000000001', 'c', now()),
  ('conv-1', 'cccccccc-0000-0000-0000-000000000001', 'd', null);

-- Ledger: release campaign 30k (bulan ini), release escrow 49k (tahun lalu),
-- fee (bukan pendapatan), milik K2 (tidak ikut).
insert into public.transactions (user_id, amount, type, reference_id, reference_type, status, created_at) values
  ('cccccccc-0000-0000-0000-000000000001', 30000, 'release', 'sub-2', 'campaign_submission', 'completed', now()),
  ('cccccccc-0000-0000-0000-000000000001', 49000, 'release', 'esc-old', 'escrow', 'completed', now() - interval '1 year'),
  ('cccccccc-0000-0000-0000-000000000001', 1000, 'fee', 'esc-old', 'escrow', 'completed', now()),
  ('cccccccc-0000-0000-0000-000000000002', 99999, 'release', 'sub-x', 'campaign_submission', 'completed', now());

-- ── creator_dashboard_summary ───────────────────────────────────────────────
select is(
  public.creator_dashboard_summary('cccccccc-0000-0000-0000-000000000001'),
  jsonb_build_object(
    'availableJobsCount', 2,          -- camp-open + camp-slot
    'activeJobsCount', 1,             -- cl-1 claimed
    'pendingSubmissionsCount', 1,
    'balance', 150000,
    'pendingPayouts', 20000,
    'validatedViewsCount', 1200,
    'activeRateCardsCount', 1,
    'negotiationOrdersCount', 1,
    'escrowBalance', 50000,
    'totalEarnings', 79000,
    'thisMonthEarnings', 30000,
    'campaignEarnings', 30000,
    'rateCardEarnings', 49000
  ),
  'dashboard summary K sesuai logika main.js lama'
);
select is(
  public.creator_dashboard_summary('eeeeeeee-0000-0000-0000-000000000009')->>'balance',
  '0',
  'tanpa wallet → saldo 0'
);
select is(
  (public.creator_dashboard_summary('eeeeeeee-0000-0000-0000-000000000009')->>'availableJobsCount')::int,
  3,
  'kreator tanpa klaim melihat semua campaign aktif yang punya slot'
);

-- ── creator_negotiation_rows ────────────────────────────────────────────────
select is(
  (select array_agg(conversation->>'id') from public.creator_negotiation_rows('cccccccc-0000-0000-0000-000000000001')),
  array['conv-1', 'conv-2'],
  'hanya percakapan milik K; pesan terbaru di atas, tanpa pesan di bawah'
);
select is(
  (select offer->>'id' from public.creator_negotiation_rows('cccccccc-0000-0000-0000-000000000001', 'conv-1')),
  'off-new', 'offer aktif = terbaru'
);
select is(
  (select "order"->>'id' from public.creator_negotiation_rows('cccccccc-0000-0000-0000-000000000001', 'conv-1')),
  'ord-1', 'order dari offer aktif'
);
select is(
  (select package->>'id' from public.creator_negotiation_rows('cccccccc-0000-0000-0000-000000000001', 'conv-1')),
  'pkg-a', 'paket dari order'
);
select is(
  (select umkm->>'business_name' from public.creator_negotiation_rows('cccccccc-0000-0000-0000-000000000001', 'conv-1')),
  'Toko U', 'profil UMKM lawan bicara'
);
select is(
  (select escrow->>'status' from public.creator_negotiation_rows('cccccccc-0000-0000-0000-000000000001', 'conv-1')),
  'held', 'escrow order'
);
select is(
  (select deliverable->>'id' from public.creator_negotiation_rows('cccccccc-0000-0000-0000-000000000001', 'conv-1')),
  'dlv-2', 'deliverable versi tertinggi'
);
select ok(
  (select validation is null from public.creator_negotiation_rows('cccccccc-0000-0000-0000-000000000001', 'conv-1')),
  'belum ada validasi'
);
select is(
  (select unread_count from public.creator_negotiation_rows('cccccccc-0000-0000-0000-000000000001', 'conv-1')),
  2, 'unread = pesan lawan bicara dengan read_at kosong'
);
select is(
  (select count(*)::int from public.creator_negotiation_rows('cccccccc-0000-0000-0000-000000000001', 'conv-x')),
  0, 'percakapan kreator lain tidak terbaca walau id ditebak'
);
select ok(
  (select offer is null and "order" is null from public.creator_negotiation_rows('cccccccc-0000-0000-0000-000000000001', 'conv-2')),
  'percakapan tanpa offer → offer/order null'
);

-- ── creator_starting_prices ─────────────────────────────────────────────────
select is(
  (select starting_price from public.creator_starting_prices(array['cccccccc-0000-0000-0000-000000000001']::uuid[])),
  50000::bigint, 'paket published termurah > 0; draft & harga 0 diabaikan'
);
select is(
  (select count(*)::int from public.creator_starting_prices(array['cccccccc-0000-0000-0000-000000000002']::uuid[])),
  0, 'kreator tanpa rate card published tidak muncul'
);

-- ── creator_directory_page ──────────────────────────────────────────────────
-- Tambah profil: rating lebih tinggi (cp-top), profil belum lengkap (tidak ikut).
insert into auth.users (id, email, aud, role) values
  ('cccccccc-0000-0000-0000-000000000003', 'k3@example.test', 'authenticated', 'authenticated'),
  ('cccccccc-0000-0000-0000-000000000004', 'k4@example.test', 'authenticated', 'authenticated');
insert into public.users (id, role, email) values
  ('cccccccc-0000-0000-0000-000000000003', 'creator', 'k3@example.test'),
  ('cccccccc-0000-0000-0000-000000000004', 'creator', 'k4@example.test');
insert into public.creator_profiles (id, user_id, display_name, rating, is_profile_completed) values
  ('cp-top', 'cccccccc-0000-0000-0000-000000000003', 'Top', 4.9, true),
  ('cp-incomplete', 'cccccccc-0000-0000-0000-000000000004', 'Belum', 5, false);

select is(
  (select jsonb_path_query_array(public.creator_directory_page(2), '$.items[*].id')),
  '["cp-top", "cp-k"]'::jsonb,
  'halaman 1: rating desc, seri diputus id asc'
);
select is((public.creator_directory_page(2)->>'total')::int, 3, 'total = semua profil lengkap');
select is(
  (select jsonb_path_query_array(public.creator_directory_page(2, 'cp-k'), '$.items[*].id')),
  '["cp-k2"]'::jsonb,
  'halaman 2 lewat keyset cursor (rating sama, id lebih besar)'
);
select is(
  (select jsonb_path_query_array(public.creator_directory_page(2, 'cp-k2'), '$.items[*].id')),
  '[]'::jsonb,
  'cursor terakhir → halaman kosong'
);
select throws_ok(
  $$select public.creator_directory_page(2, 'tidak-ada')$$,
  '22023', null, 'cursor tidak dikenal ditolak'
);
select throws_ok(
  $$select public.creator_directory_page(0)$$,
  '22023', null, 'limit 0 ditolak'
);
select ok(
  (select indexdef like '%WHERE is_profile_completed%' from pg_indexes where indexname = 'creator_profiles_directory_idx'),
  'index keyset direktori parsial'
);

select * from finish();
rollback;
