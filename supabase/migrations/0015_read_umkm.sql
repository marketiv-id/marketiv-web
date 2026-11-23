-- =============================================================================
-- 0015_read_umkm — RPC baca untuk Route Handler GET UMKM (Fase 5).
--
-- Pengganti agregasi di Appwrite Function:
--   * umkm_dashboard_summary(uuid)                → get-umkm-dashboard-summary
--   * umkm_finance_summary(uuid)                  → get-umkm-finance-summary
--   * umkm_negotiation_context(uuid, text)        → get-umkm-negotiations
--   * umkm_ratecard_review_context(uuid, text)    → get-umkm-ratecard-reviews
--
-- Function lama memuat semua dokumen (paginasi 100/halaman, berhenti di 5000)
-- lalu menjumlah di memori; versi ini satu round-trip per request.
-- Dashboard & finance mengembalikan DTO jadi (angka saja). Negotiation &
-- review mengembalikan baris mentah per tabel (jsonb) — pemetaan ke DTO tetap
-- di TypeScript (src/server/umkm/*.ts) supaya aturan fallback/derivasi stage
-- satu tempat dan bisa diuji unit.
--
-- Semua: STABLE, SECURITY INVOKER (dipanggil service_role dari route yang
-- sudah memverifikasi sesi + role; service_role melewati RLS), search_path
-- kosong, EXECUTE hanya service_role. Kepemilikan ditegakkan lewat argumen
-- p_umkm_id = userId sesi (bukan dari body).
--
-- Index: semua filter memakai index yang sudah ada di 0002–0007
-- (campaigns_umkm_id_idx, orders_umkm_id_idx, conversations unique
-- (umkm_id, creator_id), offers_conversation_id_idx, messages_unread_idx,
-- escrows/deliverables/revisions order_id, validations deliverable_id unique,
-- payments_user_id_idx, transactions_user_id_created_at_idx). Tidak ada index baru.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- umkm_dashboard_summary — DTO `UmkmDashboardSummary`.
-- -----------------------------------------------------------------------------
create or replace function public.umkm_dashboard_summary(p_umkm_id uuid)
returns jsonb
language sql
stable
security invoker
set search_path = ''
as $$
  with c as (
    select cp.id, cp.status, cp.spent_amount, cp.remaining_budget
    from public.campaigns cp
    where cp.umkm_id = p_umkm_id
  ),
  o as (
    select od.id, od.status, od.amount
    from public.orders od
    where od.umkm_id = p_umkm_id
  ),
  s as (
    select sub.status, sub.views
    from public.campaign_submissions sub
    where sub.campaign_id in (select c.id from c)
  )
  select jsonb_build_object(
    'activeCampaigns', (select count(*) from c where c.status = 'active'),
    'completedCampaigns', (select count(*) from c where c.status = 'completed'),
    'totalViews', (select coalesce(sum(s.views), 0) from s where s.status <> 'rejected'),
    'totalSpent',
      (select coalesce(sum(c.spent_amount), 0) from c)
      + (select coalesce(sum(o.amount), 0) from o where o.status = 'completed'),
    'escrowBalance',
      (select coalesce(sum(c.remaining_budget), 0) from c where c.status in ('active', 'paused'))
      + (select coalesce(sum(e.amount), 0)
           from public.escrows e
          where e.status = 'held' and e.order_id in (select o.id from o)),
    'pendingSubmissions', (select count(*) from s where s.status = 'pending'),
    'activeNegotiations', (select count(*) from o where o.status not in ('completed', 'cancelled')),
    'pendingPayments', (select count(*) from o where o.status = 'pending_payment'),
    'isTruncated', false
  );
$$;

comment on function public.umkm_dashboard_summary(uuid) is
  'DTO UmkmDashboardSummary (pengganti get-umkm-dashboard-summary). Hanya service_role.';

-- -----------------------------------------------------------------------------
-- umkm_finance_summary — `{ finance: UmkmFinanceSummary, escrow: EscrowOverview }`.
-- -----------------------------------------------------------------------------
create or replace function public.umkm_finance_summary(p_umkm_id uuid)
returns jsonb
language sql
stable
security invoker
set search_path = ''
as $$
  with pay as (
    select p.status, p.total_amount, p.fee_amount
    from public.payments p
    where p.user_id = p_umkm_id
  ),
  c as (
    select cp.status, cp.remaining_budget
    from public.campaigns cp
    where cp.umkm_id = p_umkm_id
  ),
  held as (
    select e.amount, od.status as order_status
    from public.escrows e
    join public.orders od on od.id = e.order_id
    where od.umkm_id = p_umkm_id and e.status = 'held'
  ),
  v as (
    select
      (select coalesce(sum(c.remaining_budget), 0) from c where c.status in ('active', 'paused')) as campaign_escrow,
      (select coalesce(sum(held.amount), 0) from held) as rate_card_escrow,
      (select coalesce(sum(held.amount), 0) from held where held.order_status = 'approved') as pending_release,
      (select coalesce(sum(c.remaining_budget), 0) from c where c.status = 'completed') as refund_eligible
  )
  select jsonb_build_object(
    'finance', jsonb_build_object(
      'totalExpenses', (select coalesce(sum(pay.total_amount), 0) from pay where pay.status = 'paid'),
      'escrowBalance', v.campaign_escrow + v.rate_card_escrow,
      'pendingPayments', (select coalesce(sum(pay.total_amount), 0) from pay where pay.status = 'pending'),
      'refundsReceived', (
        select coalesce(sum(t.amount), 0)
        from public.transactions t
        where t.user_id = p_umkm_id and t.type = 'refund'
      ),
      'platformFees', (select coalesce(sum(pay.fee_amount), 0) from pay where pay.status = 'paid'),
      'successfulTransactionsCount', (select count(*) from pay where pay.status = 'paid'),
      'isTruncated', false
    ),
    'escrow', jsonb_build_object(
      'activeEscrow', v.campaign_escrow + v.rate_card_escrow,
      'pendingRelease', v.pending_release,
      'refundEligible', v.refund_eligible,
      'campaignEscrow', v.campaign_escrow,
      'rateCardEscrow', v.rate_card_escrow,
      'isTruncated', false
    )
  )
  from v;
$$;

comment on function public.umkm_finance_summary(uuid) is
  'DTO { finance, escrow } (pengganti get-umkm-finance-summary). Hanya service_role.';

-- -----------------------------------------------------------------------------
-- umkm_negotiation_context — baris mentah untuk DTO `NegotiationOrder`.
--
-- p_conversation_id null → semua percakapan UMKM (created_at desc);
-- terisi → maksimal satu, tetap difilter umkm_id (id tebakan milik UMKM lain
-- = kosong = 404 di route, tidak membocorkan keberadaannya).
--
-- Offer aktif = offer TERBARU per percakapan; deliverable = versi TERTINGGI per
-- order (sama dengan pickLatestOffers / pickLatestDeliverables lama).
-- -----------------------------------------------------------------------------
create or replace function public.umkm_negotiation_context(
  p_umkm_id uuid,
  p_conversation_id text default null
)
returns jsonb
language sql
stable
security invoker
set search_path = ''
as $$
  with conv as (
    select cv.*
    from public.conversations cv
    where cv.umkm_id = p_umkm_id
      and (p_conversation_id is null or cv.id = p_conversation_id)
  ),
  latest_offer as (
    select distinct on (ofr.conversation_id) ofr.*
    from public.offers ofr
    where ofr.conversation_id in (select conv.id from conv)
    order by ofr.conversation_id, ofr.created_at desc, ofr.id
  ),
  ord as (
    select od.*
    from public.orders od
    where od.offer_id in (select latest_offer.id from latest_offer)
  ),
  latest_deliverable as (
    select distinct on (d.order_id) d.*
    from public.deliverables d
    where d.order_id in (select ord.id from ord)
    order by d.order_id, d.version desc, d.created_at desc, d.id
  )
  select jsonb_build_object(
    'conversations', coalesce((
      select jsonb_agg(to_jsonb(conv) order by conv.created_at desc, conv.id) from conv
    ), '[]'::jsonb),
    'unread', coalesce((
      select jsonb_agg(jsonb_build_object('conversation_id', m.conversation_id, 'count', m.cnt))
      from (
        select msg.conversation_id, count(*) as cnt
        from public.messages msg
        where msg.conversation_id in (select conv.id from conv)
          and msg.read_at is null
          and msg.sender_id <> p_umkm_id
        group by msg.conversation_id
      ) m
    ), '[]'::jsonb),
    'offers', coalesce((select jsonb_agg(to_jsonb(latest_offer)) from latest_offer), '[]'::jsonb),
    'creators', coalesce((
      select jsonb_agg(to_jsonb(cp))
      from public.creator_profiles cp
      where cp.user_id in (select conv.creator_id from conv)
    ), '[]'::jsonb),
    'orders', coalesce((select jsonb_agg(to_jsonb(ord)) from ord), '[]'::jsonb),
    'packages', coalesce((
      select jsonb_agg(to_jsonb(pk))
      from public.rate_card_packages pk
      where pk.id in (select ord.package_id from ord)
    ), '[]'::jsonb),
    'escrows', coalesce((
      select jsonb_agg(to_jsonb(e))
      from public.escrows e
      where e.order_id in (select ord.id from ord)
    ), '[]'::jsonb),
    'deliverables', coalesce((select jsonb_agg(to_jsonb(latest_deliverable)) from latest_deliverable), '[]'::jsonb),
    'validations', coalesce((
      select jsonb_agg(to_jsonb(val))
      from public.ratecard_deliverable_validations val
      where val.deliverable_id in (select latest_deliverable.id from latest_deliverable)
    ), '[]'::jsonb)
  );
$$;

comment on function public.umkm_negotiation_context(uuid, text) is
  'Baris mentah ruang negosiasi UMKM (pengganti get-umkm-negotiations). Hanya service_role.';

-- -----------------------------------------------------------------------------
-- umkm_ratecard_review_context — baris mentah untuk DTO `RatecardReview`.
--
-- Hanya order rate card (punya offer_id atau package_id), milik p_umkm_id.
-- p_order_id terisi → maksimal satu order.
-- -----------------------------------------------------------------------------
create or replace function public.umkm_ratecard_review_context(
  p_umkm_id uuid,
  p_order_id text default null
)
returns jsonb
language sql
stable
security invoker
set search_path = ''
as $$
  with ord as (
    select od.*
    from public.orders od
    where od.umkm_id = p_umkm_id
      and (p_order_id is null or od.id = p_order_id)
      and (coalesce(od.offer_id, '') <> '' or coalesce(od.package_id, '') <> '')
  ),
  dlv as (
    select d.*
    from public.deliverables d
    where d.order_id in (select ord.id from ord)
  )
  select jsonb_build_object(
    'orders', coalesce((
      select jsonb_agg(to_jsonb(ord) order by ord.created_at desc, ord.id) from ord
    ), '[]'::jsonb),
    'offers', coalesce((
      select jsonb_agg(to_jsonb(ofr))
      from public.offers ofr
      where ofr.id in (select ord.offer_id from ord)
    ), '[]'::jsonb),
    'creators', coalesce((
      select jsonb_agg(to_jsonb(cp))
      from public.creator_profiles cp
      where cp.user_id in (select ord.creator_id from ord)
    ), '[]'::jsonb),
    'packages', coalesce((
      select jsonb_agg(to_jsonb(pk))
      from public.rate_card_packages pk
      where pk.id in (select ord.package_id from ord)
    ), '[]'::jsonb),
    'escrows', coalesce((
      select jsonb_agg(to_jsonb(e))
      from public.escrows e
      where e.order_id in (select ord.id from ord)
    ), '[]'::jsonb),
    'deliverables', coalesce((select jsonb_agg(to_jsonb(dlv)) from dlv), '[]'::jsonb),
    'revisions', coalesce((
      select jsonb_agg(to_jsonb(r))
      from public.revisions r
      where r.order_id in (select ord.id from ord)
    ), '[]'::jsonb),
    'validations', coalesce((
      select jsonb_agg(to_jsonb(val))
      from public.ratecard_deliverable_validations val
      where val.deliverable_id in (select dlv.id from dlv)
    ), '[]'::jsonb)
  );
$$;

comment on function public.umkm_ratecard_review_context(uuid, text) is
  'Baris mentah review pekerjaan rate card UMKM (pengganti get-umkm-ratecard-reviews). Hanya service_role.';

-- -----------------------------------------------------------------------------
-- Hak akses: hanya service_role.
-- -----------------------------------------------------------------------------
revoke all on function public.umkm_dashboard_summary(uuid) from public, anon, authenticated;
revoke all on function public.umkm_finance_summary(uuid) from public, anon, authenticated;
revoke all on function public.umkm_negotiation_context(uuid, text) from public, anon, authenticated;
revoke all on function public.umkm_ratecard_review_context(uuid, text) from public, anon, authenticated;

grant execute on function public.umkm_dashboard_summary(uuid) to service_role;
grant execute on function public.umkm_finance_summary(uuid) to service_role;
grant execute on function public.umkm_negotiation_context(uuid, text) to service_role;
grant execute on function public.umkm_ratecard_review_context(uuid, text) to service_role;
