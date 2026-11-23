-- =============================================================================
-- 0016_read_creator — RPC baca untuk Route Handler kreator (Fase 5).
--
-- Pengganti agregasi di Function Appwrite:
--   * creator_dashboard_summary(user)       ← get-creator-dashboard-summary
--   * creator_negotiation_rows(user, conv)  ← join 9 collection get-creator-negotiations
--   * creator_starting_prices(creators[])   ← resolveStartingPrice(s) (profile & directory)
--   * creator_directory_page(limit, cursor) ← listPage + total get-creator-directory
--
-- Semua: STABLE, SECURITY INVOKER, search_path kosong, hanya service_role yang
-- boleh EXECUTE (route sudah memverifikasi sesi lalu memakai client service
-- role; service role melewati RLS, jadi INVOKER cukup). Filter kepemilikan
-- (p_user_id) selalu ada di dalam query.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Index keyset direktori: profil lengkap, rating tertinggi dulu, id sebagai
-- pemutus seri (cursor). Partial supaya hanya profil yang tampil di direktori.
-- -----------------------------------------------------------------------------
create index if not exists creator_profiles_directory_idx
  on public.creator_profiles (rating desc, id)
  where is_profile_completed;

-- -----------------------------------------------------------------------------
-- creator_dashboard_summary — satu objek CreatorMetric (lihat main.js lama).
-- Angka uang dijumlahkan di DB, tidak di klien.
-- -----------------------------------------------------------------------------
create or replace function public.creator_dashboard_summary(p_user_id uuid)
returns jsonb
language sql
stable
security invoker
set search_path = ''
as $$
  with
  claims as (
    select c.campaign_id, c.status
    from public.campaign_claims c
    where c.creator_id = p_user_id
  ),
  creator_orders as (
    select o.id, o.status
    from public.orders o
    where o.creator_id = p_user_id
  ),
  earnings as (
    select t.amount, t.reference_type, t.created_at
    from public.transactions t
    where t.user_id = p_user_id
      and t.type = 'release'
  )
  select jsonb_build_object(
    -- Job Pool: campaign aktif yang masih punya slot (claim_limit 0 = tanpa
    -- batas) dan belum pernah diklaim kreator ini (klaim status apa pun).
    'availableJobsCount', (
      select count(*)
      from public.campaigns cp
      where cp.status = 'active'
        and (cp.claim_limit <= 0 or cp.total_claims < cp.claim_limit)
        and not exists (select 1 from claims cl where cl.campaign_id = cp.id)
    ),
    'activeJobsCount', (select count(*) from claims where status in ('claimed', 'submitted')),
    'pendingSubmissionsCount', (
      select count(*) from public.campaign_submissions s
      where s.creator_id = p_user_id and s.status = 'pending'
    ),
    'balance', coalesce((select w.balance from public.wallets w where w.user_id = p_user_id), 0),
    'pendingPayouts', coalesce((select w.pending_balance from public.wallets w where w.user_id = p_user_id), 0),
    'validatedViewsCount', (
      select coalesce(sum(s.views), 0) from public.campaign_submissions s
      where s.creator_id = p_user_id and s.status = 'approved'
    ),
    'activeRateCardsCount', (
      select count(*) from public.rate_cards rc
      where rc.creator_id = p_user_id and rc.status = 'published'
    ),
    'negotiationOrdersCount', (
      select count(*) from creator_orders
      where status in ('pending_payment', 'escrow', 'in_progress', 'revision', 'approved')
    ),
    -- escrows tidak menyimpan creator_id: kepemilikan lewat order kreator.
    'escrowBalance', (
      select coalesce(sum(e.amount), 0)
      from public.escrows e
      join creator_orders o on o.id = e.order_id
      where e.status = 'held'
    ),
    'totalEarnings', (
      select coalesce(sum(amount), 0) from earnings
      where reference_type in ('campaign_submission', 'escrow')
    ),
    -- Bulan berjalan dalam UTC (sama dengan getUTCMonth() di main.js lama);
    -- semua `release`, apa pun reference_type-nya.
    'thisMonthEarnings', (
      select coalesce(sum(amount), 0) from earnings
      where date_trunc('month', created_at at time zone 'UTC') = date_trunc('month', now() at time zone 'UTC')
    ),
    'campaignEarnings', (
      select coalesce(sum(amount), 0) from earnings where reference_type = 'campaign_submission'
    ),
    'rateCardEarnings', (
      select coalesce(sum(amount), 0) from earnings where reference_type = 'escrow'
    )
  );
$$;

comment on function public.creator_dashboard_summary(uuid) is
  'DTO CreatorMetric (pengganti get-creator-dashboard-summary). Hanya service_role.';

-- -----------------------------------------------------------------------------
-- creator_negotiation_rows — satu baris per percakapan kreator dengan seluruh
-- join yang dibutuhkan DTO CreatorNegotiation. Pemetaan DTO (stage, fee, dst.)
-- tetap di TypeScript (src/server/creator/negotiations.ts).
--
-- Urutan: pesan terbaru di atas, percakapan tanpa pesan di bawah, seri
-- diputus created_at desc (sama dengan sort stabil di main.js lama).
-- -----------------------------------------------------------------------------
create or replace function public.creator_negotiation_rows(
  p_user_id uuid,
  p_conversation_id text default null
)
returns table (
  conversation jsonb,
  offer jsonb,
  "order" jsonb,
  package jsonb,
  umkm jsonb,
  escrow jsonb,
  deliverable jsonb,
  validation jsonb,
  unread_count integer
)
language sql
stable
security invoker
set search_path = ''
as $$
  select
    to_jsonb(c) as conversation,
    to_jsonb(ofr) as offer,
    to_jsonb(ord) as "order",
    to_jsonb(pkg) as package,
    to_jsonb(up) as umkm,
    to_jsonb(esc) as escrow,
    to_jsonb(dlv) as deliverable,
    to_jsonb(val) as validation,
    (
      select count(*)::integer
      from public.messages m
      where m.conversation_id = c.id
        and m.read_at is null
        and m.sender_id <> p_user_id
    ) as unread_count
  from public.conversations c
  -- Offer aktif = yang terbaru per percakapan.
  left join lateral (
    select o.*
    from public.offers o
    where o.conversation_id = c.id
    order by o.created_at desc, o.id desc
    limit 1
  ) ofr on true
  left join public.orders ord on ord.offer_id = ofr.id
  left join public.rate_card_packages pkg on pkg.id = ord.package_id
  left join public.umkm_profiles up on up.user_id = c.umkm_id
  left join public.escrows esc on esc.order_id = ord.id
  -- Deliverable = versi tertinggi per order.
  left join lateral (
    select d.*
    from public.deliverables d
    where d.order_id = ord.id
    order by d.version desc, d.created_at desc, d.id desc
    limit 1
  ) dlv on true
  left join public.ratecard_deliverable_validations val on val.deliverable_id = dlv.id
  where c.creator_id = p_user_id
    and (p_conversation_id is null or c.id = p_conversation_id)
  order by c.last_message_at desc nulls last, c.created_at desc, c.id desc;
$$;

comment on function public.creator_negotiation_rows(uuid, text) is
  'Join percakapan kreator untuk DTO CreatorNegotiation (pengganti get-creator-negotiations). Hanya service_role.';

-- -----------------------------------------------------------------------------
-- creator_starting_prices — harga paket termurah (> 0) dari rate card
-- `published` per kreator. Draft tidak pernah ikut (dilihat UMKM).
-- Kreator tanpa harga tidak muncul di hasil (pemanggil memakai 0).
-- -----------------------------------------------------------------------------
create or replace function public.creator_starting_prices(p_creator_ids uuid[])
returns table (creator_id uuid, starting_price bigint)
language sql
stable
security invoker
set search_path = ''
as $$
  select rc.creator_id, min(p.price) as starting_price
  from public.rate_cards rc
  join public.rate_card_packages p on p.rate_card_id = rc.id
  where rc.creator_id = any (p_creator_ids)
    and rc.status = 'published'
    and p.price > 0
  group by rc.creator_id;
$$;

comment on function public.creator_starting_prices(uuid[]) is
  'Harga mulai per kreator (paket published termurah). Hanya service_role.';

-- -----------------------------------------------------------------------------
-- creator_directory_page — satu halaman profil lengkap (rating desc, id asc)
-- dengan keyset cursor = creator_profiles.id baris terakhir, plus total.
--
-- Cursor tidak dikenal → error 22023 (route memetakannya ke 400).
-- -----------------------------------------------------------------------------
create or replace function public.creator_directory_page(p_limit integer, p_cursor text default null)
returns jsonb
language plpgsql
stable
security invoker
set search_path = ''
as $$
declare
  v_cursor_rating numeric;
  v_items jsonb;
  v_total integer;
begin
  if p_limit is null or p_limit < 1 or p_limit > 100 then
    raise exception 'creator_directory_page: limit tidak valid' using errcode = '22023';
  end if;

  if p_cursor is not null then
    select cp.rating into v_cursor_rating
    from public.creator_profiles cp
    where cp.id = p_cursor and cp.is_profile_completed;
    if not found then
      raise exception 'creator_directory_page: cursor tidak dikenal' using errcode = '22023';
    end if;
  end if;

  select coalesce(jsonb_agg(to_jsonb(page) order by page.rating desc, page.id), '[]'::jsonb)
    into v_items
  from (
    select cp.*
    from public.creator_profiles cp
    where cp.is_profile_completed
      and (
        p_cursor is null
        or cp.rating < v_cursor_rating
        or (cp.rating = v_cursor_rating and cp.id > p_cursor)
      )
    order by cp.rating desc, cp.id
    limit p_limit
  ) page;

  select count(*)::integer into v_total
  from public.creator_profiles cp
  where cp.is_profile_completed;

  return jsonb_build_object('items', v_items, 'total', v_total);
end;
$$;

comment on function public.creator_directory_page(integer, text) is
  'Halaman direktori kreator (keyset rating desc, id). Hanya service_role.';

-- -----------------------------------------------------------------------------
-- Hak akses: hanya service_role.
-- -----------------------------------------------------------------------------
revoke all on function public.creator_dashboard_summary(uuid) from public, anon, authenticated;
revoke all on function public.creator_negotiation_rows(uuid, text) from public, anon, authenticated;
revoke all on function public.creator_starting_prices(uuid[]) from public, anon, authenticated;
revoke all on function public.creator_directory_page(integer, text) from public, anon, authenticated;

grant execute on function public.creator_dashboard_summary(uuid) to service_role;
grant execute on function public.creator_negotiation_rows(uuid, text) to service_role;
grant execute on function public.creator_starting_prices(uuid[]) to service_role;
grant execute on function public.creator_directory_page(integer, text) to service_role;
