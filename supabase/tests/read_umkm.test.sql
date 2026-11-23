-- pgTAP: RPC baca UMKM Fase 5 (0015_read_umkm).
-- Fixture kecil; angka yang diharapkan dihitung dengan aturan Function lama
-- (get-umkm-dashboard-summary / get-umkm-finance-summary / get-umkm-negotiations
-- / get-umkm-ratecard-reviews). Nilai yang sama dipakai unit test
-- src/server/umkm/__tests__/summaries.test.ts.
begin;
create extension if not exists pgtap with schema extensions;

select plan(24);

-- ── Akun ───────────────────────────────────────────────────────────────────
insert into auth.users (id, email, aud, role, raw_app_meta_data, raw_user_meta_data) values
  ('a1111111-1111-4111-8111-111111111111', 'umkm-a@example.test', 'authenticated', 'authenticated', '{}', '{}'),
  ('b2222222-2222-4222-8222-222222222222', 'umkm-b@example.test', 'authenticated', 'authenticated', '{}', '{}'),
  ('c1111111-1111-4111-8111-111111111111', 'kreator-1@example.test', 'authenticated', 'authenticated', '{}', '{}'),
  ('c2222222-2222-4222-8222-222222222222', 'kreator-2@example.test', 'authenticated', 'authenticated', '{}', '{}');
insert into public.users (id, role, email) values
  ('a1111111-1111-4111-8111-111111111111', 'umkm', 'umkm-a@example.test'),
  ('b2222222-2222-4222-8222-222222222222', 'umkm', 'umkm-b@example.test'),
  ('c1111111-1111-4111-8111-111111111111', 'creator', 'kreator-1@example.test'),
  ('c2222222-2222-4222-8222-222222222222', 'creator', 'kreator-2@example.test');
insert into public.creator_profiles (user_id, display_name, avatar_url) values
  ('c1111111-1111-4111-8111-111111111111', 'Budi Kreator', 'https://cdn/budi.png'),
  ('c2222222-2222-4222-8222-222222222222', 'Sari', null);

-- ── Campaign + submission ─────────────────────────────────────────────────
insert into public.campaigns (id, umkm_id, title, category, type, status, spent_amount, remaining_budget) values
  ('camp1', 'a1111111-1111-4111-8111-111111111111', 'Aktif', 'kuliner', 'ugc', 'active', 100000, 150000),
  ('camp2', 'a1111111-1111-4111-8111-111111111111', 'Selesai', 'kuliner', 'ugc', 'completed', 50000, 20000),
  ('camp3', 'a1111111-1111-4111-8111-111111111111', 'Draft', 'kuliner', 'ugc', 'draft', 0, 0),
  ('camp4', 'a1111111-1111-4111-8111-111111111111', 'Jeda', 'kuliner', 'ugc', 'paused', 0, 50000),
  ('campB', 'b2222222-2222-4222-8222-222222222222', 'Milik B', 'kuliner', 'ugc', 'active', 999, 999);
insert into public.campaign_claims (id, campaign_id, creator_id) values
  ('cl1', 'camp1', 'c1111111-1111-4111-8111-111111111111'),
  ('cl2', 'camp1', 'c2222222-2222-4222-8222-222222222222'),
  ('cl3', 'camp2', 'c1111111-1111-4111-8111-111111111111'),
  ('clB', 'campB', 'c1111111-1111-4111-8111-111111111111');
insert into public.campaign_submissions (id, claim_id, campaign_id, creator_id, platform, post_url, views, status) values
  ('sub1', 'cl1', 'camp1', 'c1111111-1111-4111-8111-111111111111', 'tiktok', 'https://t/1', 1000, 'approved'),
  ('sub2', 'cl2', 'camp1', 'c2222222-2222-4222-8222-222222222222', 'tiktok', 'https://t/2', 500, 'pending'),
  ('sub3', 'cl3', 'camp2', 'c1111111-1111-4111-8111-111111111111', 'tiktok', 'https://t/3', 9999, 'rejected'),
  ('subB', 'clB', 'campB', 'c1111111-1111-4111-8111-111111111111', 'tiktok', 'https://t/B', 7777, 'pending');

-- ── Rate card, percakapan, offer ──────────────────────────────────────────
insert into public.rate_cards (id, creator_id, title, status) values
  ('rc1', 'c1111111-1111-4111-8111-111111111111', 'RC Budi', 'published');
insert into public.rate_card_packages (id, rate_card_id, name, description, output, delivery_days, price, revision_limit) values
  ('pk1', 'rc1', 'Paket Basic', 'desk paket', '1 video TikTok', 5, 250000, 3);
insert into public.conversations (id, umkm_id, creator_id, last_message, last_message_at, umkm_archived, created_at) values
  ('conv1', 'a1111111-1111-4111-8111-111111111111', 'c1111111-1111-4111-8111-111111111111', 'Sudah kirim', '2026-11-12T09:00:00Z', false, '2026-11-01T00:00:00Z'),
  ('conv2', 'a1111111-1111-4111-8111-111111111111', 'c2222222-2222-4222-8222-222222222222', null, null, true, '2026-11-02T00:00:00Z'),
  ('convB', 'b2222222-2222-4222-8222-222222222222', 'c1111111-1111-4111-8111-111111111111', 'B', '2026-11-01T00:00:00Z', false, '2026-11-01T00:00:00Z');
insert into public.offers (id, conversation_id, umkm_id, creator_id, title, price, deadline, revision_limit, package_id, status, created_at) values
  ('offA', 'conv1', 'a1111111-1111-4111-8111-111111111111', 'c1111111-1111-4111-8111-111111111111', 'Lama', 200000, '2026-11-20T00:00:00Z', 1, null, 'rejected', '2026-11-03T00:00:00Z'),
  ('offB', 'conv1', 'a1111111-1111-4111-8111-111111111111', 'c1111111-1111-4111-8111-111111111111', 'Video Review', 300000, '2026-11-20T00:00:00Z', 2, 'pk1', 'accepted', '2026-11-05T00:00:00Z'),
  ('offX', 'convB', 'b2222222-2222-4222-8222-222222222222', 'c1111111-1111-4111-8111-111111111111', 'Milik B', 1, '2026-11-20T00:00:00Z', 0, null, 'pending', '2026-11-05T00:00:00Z');
insert into public.messages (conversation_id, sender_id, content, read_at) values
  ('conv1', 'c1111111-1111-4111-8111-111111111111', 'belum dibaca 1', null),
  ('conv1', 'c1111111-1111-4111-8111-111111111111', 'belum dibaca 2', null),
  ('conv1', 'c1111111-1111-4111-8111-111111111111', 'sudah dibaca', now()),
  ('conv1', 'a1111111-1111-4111-8111-111111111111', 'dikirim UMKM sendiri', null),
  ('convB', 'c1111111-1111-4111-8111-111111111111', 'milik B', null);

-- ── Order, escrow, deliverable ────────────────────────────────────────────
insert into public.orders (id, offer_id, package_id, package_name_snapshot, creator_id, umkm_id, amount, status, created_at) values
  ('ord1', null, null, null, 'c1111111-1111-4111-8111-111111111111', 'a1111111-1111-4111-8111-111111111111', 200000, 'completed', '2026-11-06T00:00:00Z'),
  ('ord2', 'offB', 'pk1', 'Paket Basic', 'c1111111-1111-4111-8111-111111111111', 'a1111111-1111-4111-8111-111111111111', 100000, 'in_progress', '2026-11-07T00:00:00Z'),
  ('ord3', null, 'pk1', null, 'c1111111-1111-4111-8111-111111111111', 'a1111111-1111-4111-8111-111111111111', 150000, 'approved', '2026-11-08T00:00:00Z'),
  ('ord4', null, null, null, 'c2222222-2222-4222-8222-222222222222', 'a1111111-1111-4111-8111-111111111111', 50000, 'pending_payment', '2026-11-09T00:00:00Z'),
  ('ord5', null, null, null, 'c2222222-2222-4222-8222-222222222222', 'a1111111-1111-4111-8111-111111111111', 70000, 'cancelled', '2026-11-10T00:00:00Z'),
  ('ordB', null, 'pk1', null, 'c1111111-1111-4111-8111-111111111111', 'b2222222-2222-4222-8222-222222222222', 777, 'in_progress', '2026-11-10T00:00:00Z');
insert into public.escrows (order_id, amount, status) values
  ('ord2', 100000, 'held'),
  ('ord3', 150000, 'held'),
  ('ord1', 200000, 'released'),
  ('ordB', 777, 'held');
insert into public.deliverables (id, order_id, source, file_url, version, created_at) values
  ('dlv1', 'ord2', 'external_url', 'https://t/v1', 1, '2026-11-10T00:00:00Z'),
  ('dlv2', 'ord2', 'external_url', 'https://t/v2', 2, '2026-11-12T00:00:00Z');
insert into public.ratecard_deliverable_validations
  (deliverable_id, order_id, deliverable_version, source_snapshot, evidence_url_snapshot, status, reviewed_by) values
  ('dlv1', 'ord2', 1, 'external_url', 'https://t/v1', 'invalid', 'c2222222-2222-4222-8222-222222222222'),
  ('dlv2', 'ord2', 2, 'external_url', 'https://t/v2', 'valid', 'c2222222-2222-4222-8222-222222222222');
insert into public.revisions (order_id, requested_by, message) values
  ('ord2', 'a1111111-1111-4111-8111-111111111111', 'Ganti musik');

-- ── Payment + ledger ──────────────────────────────────────────────────────
insert into public.payments (user_id, amount, total_amount, fee_amount, purpose, gateway_reference, status) values
  ('a1111111-1111-4111-8111-111111111111', 290000, 300000, 10000, 'campaign', 'ref-1', 'paid'),
  ('a1111111-1111-4111-8111-111111111111', 210000, 215000, 5000, 'order', 'ref-2', 'paid'),
  ('a1111111-1111-4111-8111-111111111111', 100000, 102000, 2000, 'order', 'ref-3', 'pending'),
  ('a1111111-1111-4111-8111-111111111111', 5000, 5000, 0, 'order', 'ref-4', 'failed'),
  ('b2222222-2222-4222-8222-222222222222', 1, 1, 1, 'order', 'ref-B', 'paid');
insert into public.transactions (user_id, amount, type, reference_id, reference_type) values
  ('a1111111-1111-4111-8111-111111111111', 25000, 'refund', 'camp2', 'campaign'),
  ('a1111111-1111-4111-8111-111111111111', 5000, 'release', 'x', 'escrow'),
  ('b2222222-2222-4222-8222-222222222222', 1, 'refund', 'campB', 'campaign');

-- ── 1. Hak eksekusi ───────────────────────────────────────────────────────
select ok(
  not has_function_privilege('anon', 'public.umkm_dashboard_summary(uuid)', 'execute')
  and not has_function_privilege('authenticated', 'public.umkm_dashboard_summary(uuid)', 'execute')
  and has_function_privilege('service_role', 'public.umkm_dashboard_summary(uuid)', 'execute'),
  'umkm_dashboard_summary hanya service_role'
);
select ok(
  not has_function_privilege('anon', 'public.umkm_finance_summary(uuid)', 'execute')
  and not has_function_privilege('authenticated', 'public.umkm_finance_summary(uuid)', 'execute')
  and has_function_privilege('service_role', 'public.umkm_finance_summary(uuid)', 'execute'),
  'umkm_finance_summary hanya service_role'
);
select ok(
  not has_function_privilege('anon', 'public.umkm_negotiation_context(uuid, text)', 'execute')
  and not has_function_privilege('authenticated', 'public.umkm_negotiation_context(uuid, text)', 'execute')
  and has_function_privilege('service_role', 'public.umkm_negotiation_context(uuid, text)', 'execute'),
  'umkm_negotiation_context hanya service_role'
);
select ok(
  not has_function_privilege('anon', 'public.umkm_ratecard_review_context(uuid, text)', 'execute')
  and not has_function_privilege('authenticated', 'public.umkm_ratecard_review_context(uuid, text)', 'execute')
  and has_function_privilege('service_role', 'public.umkm_ratecard_review_context(uuid, text)', 'execute'),
  'umkm_ratecard_review_context hanya service_role'
);
select is(
  (select count(*)::int from pg_proc p
    where p.pronamespace = 'public'::regnamespace
      and p.proname in ('umkm_dashboard_summary', 'umkm_finance_summary', 'umkm_negotiation_context', 'umkm_ratecard_review_context')
      and (p.prosecdef or p.provolatile <> 's' or not (p.proconfig @> array['search_path=""']))),
  0,
  'keempat RPC: SECURITY INVOKER, STABLE, search_path kosong'
);

-- ── 2. Dashboard summary ──────────────────────────────────────────────────
select is(
  public.umkm_dashboard_summary('a1111111-1111-4111-8111-111111111111'),
  jsonb_build_object(
    'activeCampaigns', 1,
    'completedCampaigns', 1,
    'totalViews', 1500,
    'totalSpent', 350000,
    'escrowBalance', 450000,
    'pendingSubmissions', 1,
    'activeNegotiations', 3,
    'pendingPayments', 1,
    'isTruncated', false
  ),
  'dashboard summary UMKM A sesuai aturan Function lama'
);
select is(
  public.umkm_dashboard_summary('d0000000-0000-4000-8000-000000000000')->>'totalSpent',
  '0',
  'UMKM tanpa data → angka nol, bukan null'
);

-- ── 3. Finance summary ────────────────────────────────────────────────────
select is(
  public.umkm_finance_summary('a1111111-1111-4111-8111-111111111111'),
  jsonb_build_object(
    'finance', jsonb_build_object(
      'totalExpenses', 515000, 'escrowBalance', 450000, 'pendingPayments', 102000,
      'refundsReceived', 25000, 'platformFees', 15000, 'successfulTransactionsCount', 2,
      'isTruncated', false),
    'escrow', jsonb_build_object(
      'activeEscrow', 450000, 'pendingRelease', 150000, 'refundEligible', 20000,
      'campaignEscrow', 200000, 'rateCardEscrow', 250000, 'isTruncated', false)
  ),
  'finance summary UMKM A sesuai aturan Function lama'
);
select is(
  public.umkm_finance_summary('d0000000-0000-4000-8000-000000000000')->'finance'->>'successfulTransactionsCount',
  '0',
  'finance UMKM tanpa data → nol'
);

-- ── 4. Negotiation context ────────────────────────────────────────────────
select is(
  (select jsonb_agg(c->>'id') from jsonb_array_elements(
     public.umkm_negotiation_context('a1111111-1111-4111-8111-111111111111')->'conversations') c),
  '["conv2", "conv1"]'::jsonb,
  'hanya percakapan UMKM A, created_at desc'
);
select is(
  public.umkm_negotiation_context('a1111111-1111-4111-8111-111111111111')->'offers'->0->>'id',
  'offB',
  'offer TERBARU per percakapan yang dipilih'
);
select is(
  jsonb_array_length(public.umkm_negotiation_context('a1111111-1111-4111-8111-111111111111')->'offers'),
  1,
  'percakapan tanpa offer tidak menambah baris offer'
);
select is(
  public.umkm_negotiation_context('a1111111-1111-4111-8111-111111111111')->'unread',
  '[{"conversation_id": "conv1", "count": 2}]'::jsonb,
  'unread = pesan lawan bicara dengan read_at null'
);
select is(
  (select jsonb_agg(o->>'id') from jsonb_array_elements(
     public.umkm_negotiation_context('a1111111-1111-4111-8111-111111111111')->'orders') o),
  '["ord2"]'::jsonb,
  'order diambil lewat offer aktif'
);
select is(
  public.umkm_negotiation_context('a1111111-1111-4111-8111-111111111111')->'deliverables',
  (select jsonb_agg(to_jsonb(d)) from public.deliverables d where d.id = 'dlv2'),
  'deliverable versi tertinggi saja'
);
select is(
  (select jsonb_agg(v->>'status') from jsonb_array_elements(
     public.umkm_negotiation_context('a1111111-1111-4111-8111-111111111111')->'validations') v),
  '["valid"]'::jsonb,
  'validasi hanya untuk deliverable terbaru'
);
select is(
  (select jsonb_agg(c->>'display_name' order by c->>'display_name') from jsonb_array_elements(
     public.umkm_negotiation_context('a1111111-1111-4111-8111-111111111111')->'creators') c),
  '["Budi Kreator", "Sari"]'::jsonb,
  'profil kreator lawan bicara'
);
select is(
  public.umkm_negotiation_context('a1111111-1111-4111-8111-111111111111', 'convB')->'conversations',
  '[]'::jsonb,
  'conversationId milik UMKM lain → kosong (route menjawab 404)'
);
select is(
  jsonb_array_length(public.umkm_negotiation_context('a1111111-1111-4111-8111-111111111111', 'conv1')->'conversations'),
  1,
  'conversationId milik sendiri → satu percakapan'
);

-- ── 5. Rate card review context ───────────────────────────────────────────
select is(
  (select jsonb_agg(o->>'id') from jsonb_array_elements(
     public.umkm_ratecard_review_context('a1111111-1111-4111-8111-111111111111')->'orders') o),
  '["ord3", "ord2"]'::jsonb,
  'hanya order rate card (offer/paket) milik UMKM A, created_at desc'
);
select is(
  jsonb_array_length(public.umkm_ratecard_review_context('a1111111-1111-4111-8111-111111111111')->'deliverables'),
  2,
  'seluruh riwayat deliverable ikut'
);
select is(
  public.umkm_ratecard_review_context('a1111111-1111-4111-8111-111111111111', 'ordB')->'orders',
  '[]'::jsonb,
  'orderId milik UMKM lain → kosong (route menjawab 404)'
);
select is(
  public.umkm_ratecard_review_context('a1111111-1111-4111-8111-111111111111', 'ord1')->'orders',
  '[]'::jsonb,
  'order non-rate-card tidak masuk'
);
select is(
  (select jsonb_agg(o->>'id') from jsonb_array_elements(
     public.umkm_ratecard_review_context('a1111111-1111-4111-8111-111111111111', 'ord2')->'offers') o),
  '["offB"]'::jsonb,
  'offer order ikut untuk judul/scope/conversationId'
);

select * from finish();
rollback;
