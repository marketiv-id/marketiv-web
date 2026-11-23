-- =============================================================================
-- 0022_campaign_flow — alur campaign mode (Fase 7).
--
-- Pengganti Function / event trigger Appwrite:
--   * claim_campaign(...)        ← tulis langsung campaign_claims + event
--                                  `campaign-claimed` (increment totalClaims
--                                  async + notifikasi UMKM)
--   * unclaim_campaign(...)      ← unclaim-campaign
--   * submit_campaign_proof(...) ← submit-campaign-proof
--   * record_fraud_check(...)    ← tulisan akhir ai-fraud-precheck
--   * review_submission(...)     ← review-submission (TANPA uang; reward Fase 8)
--   * private.expire_stale_claims() + job pg_cron ← expire-stale-claims (cron)
--
-- Semua RPC publik: SECURITY INVOKER (dipanggil service_role dari route yang
-- sudah memverifikasi sesi), search_path kosong, EXECUTE hanya service_role.
-- Identitas pemanggil SELALU dari argumen `p_*_id` yang diisi route dari sesi.
--
-- Urutan lock konsisten: campaigns → campaign_claims → campaign_submissions,
-- supaya klaim, batal klaim, review, dan cron tidak saling deadlock.
--
-- Error ke route (src/server/conversations/write-rpc.ts):
--   P0002 → 404, 42501 → 403, 22023 → 400, P0001 → 409; 23505 → 409.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- claim_campaign — kreator mengambil campaign aktif.
--
-- Aturan (claimCampaignInAppwrite + campaign-claimed lama):
--   * campaign ada dan `active`; dana tersisa (`remaining_budget > 0`)
--   * profil kreator lengkap
--   * kuota: `total_claims < claim_limit` (sama dengan guard lama; claim_limit 0
--     = tidak menerima klaim, seperti incrementColumn max 0 di Appwrite)
--   * satu klaim non-expired per (campaign, kreator) — unique parsial
--     `campaign_claims_active_key` juga menjaga race (23505 → 409)
-- Baris campaign dikunci, jadi dua kreator yang berebut slot terakhir
-- diserialkan: yang kedua melihat kuota penuh. Dulu klaim dibuat dulu lalu
-- di-expire asinkron oleh event; sekarang ditolak sebelum ada baris.
-- -----------------------------------------------------------------------------
create or replace function public.claim_campaign(p_campaign_id text, p_creator_id uuid)
returns jsonb
language plpgsql
volatile
security invoker
set search_path = ''
as $$
declare
  v_campaign public.campaigns;
  v_claim public.campaign_claims;
  v_creator_name text;
  v_completed boolean;
begin
  if p_campaign_id is null or p_creator_id is null then
    raise exception 'Campaign tidak valid.' using errcode = '22023';
  end if;

  select * into v_campaign
  from public.campaigns c
  where c.id = p_campaign_id
  for update;
  if not found then
    raise exception 'Campaign tidak ditemukan.' using errcode = 'P0002';
  end if;
  if v_campaign.status <> 'active' then
    raise exception 'Campaign ini sudah tidak aktif.' using errcode = 'P0001';
  end if;
  if v_campaign.remaining_budget <= 0 then
    raise exception 'Dana campaign ini sudah habis.' using errcode = 'P0001';
  end if;

  select cp.is_profile_completed, nullif(btrim(cp.display_name), '')
    into v_completed, v_creator_name
  from public.creator_profiles cp
  where cp.user_id = p_creator_id;
  if not coalesce(v_completed, false) then
    raise exception 'Lengkapi profil kreator dulu sebelum mengambil pekerjaan.' using errcode = 'P0001';
  end if;

  if v_campaign.total_claims >= v_campaign.claim_limit then
    raise exception 'Kuota kreator untuk campaign ini sudah penuh.' using errcode = 'P0001';
  end if;

  if exists (
    select 1 from public.campaign_claims cl
    where cl.campaign_id = p_campaign_id
      and cl.creator_id = p_creator_id
      and cl.status <> 'expired'
  ) then
    raise exception 'Kamu sudah pernah mengambil campaign ini.' using errcode = 'P0001';
  end if;

  insert into public.campaign_claims (campaign_id, creator_id, status, claimed_at)
  values (p_campaign_id, p_creator_id, 'claimed', now())
  returning * into v_claim;

  update public.campaigns c
     set total_claims = c.total_claims + 1
   where c.id = p_campaign_id;

  -- Notifikasi UMKM (port campaign-claimed). ID deterministik (claim, 'claim').
  insert into public.notifications (id, user_id, title, message, type, is_read)
  values (
    private.notification_id(v_claim.id, 'claim'),
    v_campaign.umkm_id,
    'Campaign Di-klaim',
    left(format('%s mengklaim campaign "%s"', coalesce(v_creator_name, 'Seorang kreator'), v_campaign.title), 1000),
    'claim',
    false
  )
  on conflict (id) do nothing;

  return jsonb_build_object(
    'claimId', v_claim.id,
    'campaignId', p_campaign_id,
    'status', v_claim.status,
    'claimedAt', v_claim.claimed_at
  );
end;
$$;

comment on function public.claim_campaign(text, uuid) is
  'Klaim campaign (lock campaign, cek status/dana/kuota/profil, +total_claims, notifikasi UMKM). Hanya service_role.';

-- -----------------------------------------------------------------------------
-- unclaim_campaign — batalkan klaim `claimed` milik sendiri (HARD DELETE, sama
-- dengan unclaim-campaign) dan kembalikan slot. Satu transaksi: tidak ada lagi
-- jalur "hapus berhasil, decrement gagal, pulihkan klaim".
-- -----------------------------------------------------------------------------
create or replace function public.unclaim_campaign(
  p_claim_id text,
  p_creator_id uuid,
  p_campaign_id text default null
)
returns jsonb
language plpgsql
volatile
security invoker
set search_path = ''
as $$
declare
  v_campaign_id text;
  v_claim public.campaign_claims;
begin
  if p_claim_id is null or p_creator_id is null then
    raise exception 'Claim ID wajib diisi.' using errcode = '22023';
  end if;

  select cl.campaign_id into v_campaign_id
  from public.campaign_claims cl
  where cl.id = p_claim_id;
  if not found or (p_campaign_id is not null and v_campaign_id <> p_campaign_id) then
    raise exception 'Claim tidak ditemukan.' using errcode = 'P0002';
  end if;

  -- Urutan lock: campaign → claim.
  perform 1 from public.campaigns c where c.id = v_campaign_id for update;

  select * into v_claim
  from public.campaign_claims cl
  where cl.id = p_claim_id
  for update;
  if not found then
    raise exception 'Claim tidak ditemukan.' using errcode = 'P0002';
  end if;
  if v_claim.creator_id <> p_creator_id then
    raise exception 'Claim bukan milik Anda.' using errcode = '42501';
  end if;
  if v_claim.status <> 'claimed' then
    raise exception 'Hanya claim berstatus claimed yang dapat dibatalkan.' using errcode = 'P0001';
  end if;

  delete from public.campaign_claims cl where cl.id = p_claim_id;

  update public.campaigns c
     set total_claims = greatest(0, c.total_claims - 1)
   where c.id = v_claim.campaign_id;

  return jsonb_build_object('success', true, 'claimId', p_claim_id);
end;
$$;

comment on function public.unclaim_campaign(text, uuid, text) is
  'Batalkan klaim claimed milik kreator (hapus + kembalikan slot, atomik). Hanya service_role.';

-- -----------------------------------------------------------------------------
-- submit_campaign_proof — bukti tayang untuk klaim `claimed` milik kreator.
-- Validasi bentuk URL/platform di route (zod); di sini kepemilikan + status.
-- Satu submission per klaim (unique claim_id).
-- -----------------------------------------------------------------------------
create or replace function public.submit_campaign_proof(
  p_creator_id uuid,
  p_campaign_id text,
  p_claim_id text,
  p_platform text,
  p_post_url text,
  p_caption text default null
)
returns jsonb
language plpgsql
volatile
security invoker
set search_path = ''
as $$
declare
  v_claim public.campaign_claims;
  v_campaign public.campaigns;
  v_submission public.campaign_submissions;
begin
  if p_platform is null or p_platform not in ('tiktok', 'instagram') then
    raise exception 'Platform tidak valid.' using errcode = '22023';
  end if;
  if nullif(btrim(coalesce(p_post_url, '')), '') is null then
    raise exception 'URL bukti tayang tidak valid untuk platform yang dipilih.' using errcode = '22023';
  end if;

  select * into v_campaign from public.campaigns c where c.id = p_campaign_id;
  if not found then
    raise exception 'Campaign tidak ditemukan.' using errcode = 'P0002';
  end if;

  select * into v_claim
  from public.campaign_claims cl
  where cl.id = p_claim_id
    and cl.creator_id = p_creator_id
    and cl.campaign_id = p_campaign_id
  for update;
  if not found then
    raise exception 'Pekerjaan tidak ditemukan.' using errcode = 'P0002';
  end if;
  if v_claim.status <> 'claimed'
     or exists (select 1 from public.campaign_submissions s where s.claim_id = p_claim_id) then
    raise exception 'Bukti untuk pekerjaan ini sudah pernah dikirim.' using errcode = 'P0001';
  end if;

  insert into public.campaign_submissions (
    claim_id, campaign_id, creator_id, platform, post_url, caption, views, status
  )
  values (
    p_claim_id, p_campaign_id, p_creator_id, p_platform, btrim(p_post_url),
    nullif(left(btrim(coalesce(p_caption, '')), 1000), ''), 0, 'pending'
  )
  returning * into v_submission;

  update public.campaign_claims cl set status = 'submitted' where cl.id = p_claim_id;

  insert into public.notifications (id, user_id, title, message, type, is_read)
  values (
    private.notification_id(v_submission.id, 'submission'),
    v_campaign.umkm_id,
    'Bukti Kerja Baru',
    left(format('Kreator mengirim bukti kerja untuk campaign "%s".', v_campaign.title), 1000),
    'campaign',
    false
  )
  on conflict (id) do nothing;

  return jsonb_build_object(
    'success', true,
    'submissionId', v_submission.id,
    'claimId', p_claim_id,
    'campaignId', p_campaign_id,
    'status', v_submission.status
  );
end;
$$;

comment on function public.submit_campaign_proof(uuid, text, text, text, text, text) is
  'Kirim bukti tayang untuk klaim milik kreator (+ klaim submitted, notifikasi UMKM). Hanya service_role.';

-- -----------------------------------------------------------------------------
-- record_fraud_check — hasil ai-fraud-precheck: skor + status ke submission dan
-- satu baris audit fraud_checks, atomik.
-- -----------------------------------------------------------------------------
create or replace function public.record_fraud_check(
  p_submission_id text,
  p_score integer,
  p_result text,
  p_reason text
)
returns void
language plpgsql
volatile
security invoker
set search_path = ''
as $$
begin
  if p_result not in ('safe', 'review', 'rejected') or p_score is null or p_score < 0 then
    raise exception 'Hasil fraud check tidak valid.' using errcode = '22023';
  end if;
  update public.campaign_submissions s
     set fraud_score = least(p_score, 100),
         fraud_status = p_result
   where s.id = p_submission_id;
  if not found then
    raise exception 'Submission tidak ditemukan.' using errcode = 'P0002';
  end if;
  insert into public.fraud_checks (submission_id, score, result, reason)
  values (p_submission_id, least(p_score, 100), p_result, left(coalesce(nullif(p_reason, ''), 'Lolos semua validasi'), 2000));
end;
$$;

comment on function public.record_fraud_check(text, integer, text, text) is
  'Simpan hasil fraud precheck ke submission + fraud_checks (atomik). Hanya service_role.';

-- -----------------------------------------------------------------------------
-- review_submission — setujui/tolak bukti kerja (port review-submission).
--
-- Hanya Admin Marketiv (sama dengan Function lama): `p_as_admin` diisi route
-- dari `isAdminUser()` (app_metadata + users.role), tidak pernah dari body.
-- Approve mewajibkan `p_views` dan periode observasi `p_observation_hours`
-- (default 72 jam, env VIEW_VALIDATION_DELAY_HOURS) sejak submission dibuat.
--
-- Approve TIDAK memindah uang: kredit reward kreator dikerjakan Fase 8
-- (`credit_campaign_reward`). Reject mengembalikan satu slot kuota.
-- -----------------------------------------------------------------------------
create or replace function public.review_submission(
  p_reviewer_id uuid,
  p_submission_id text,
  p_decision text,
  p_note text default null,
  p_as_admin boolean default false,
  p_views bigint default null,
  p_observation_hours numeric default 72
)
returns jsonb
language plpgsql
volatile
security invoker
set search_path = ''
as $$
declare
  v_submission public.campaign_submissions;
  v_campaign_id text;
  v_note text := nullif(left(btrim(coalesce(p_note, '')), 1000), '');
  v_eligible_at timestamptz;
begin
  if p_decision is null or p_decision not in ('approved', 'rejected') then
    raise exception 'Status review tidak valid.' using errcode = '22023';
  end if;
  if p_decision = 'approved' and (p_views is null or p_views < 0) then
    raise exception 'Jumlah views tidak valid.' using errcode = '22023';
  end if;

  select s.campaign_id into v_campaign_id
  from public.campaign_submissions s
  where s.id = p_submission_id;
  if not found then
    raise exception 'Submission tidak ditemukan.' using errcode = 'P0002';
  end if;

  -- Urutan lock: campaign → submission.
  perform 1 from public.campaigns c where c.id = v_campaign_id for update;
  if not found then
    raise exception 'Submission tidak ditemukan.' using errcode = 'P0002';
  end if;

  select * into v_submission
  from public.campaign_submissions s
  where s.id = p_submission_id
  for update;
  if v_submission.status <> 'pending' then
    raise exception 'Submission ini sudah pernah direview.' using errcode = 'P0001';
  end if;

  if not coalesce(p_as_admin, false) then
    raise exception 'Akses ditolak: Hanya Admin Marketiv yang dapat memvalidasi submission.' using errcode = '42501';
  end if;

  if p_decision = 'approved' then
    v_eligible_at := v_submission.created_at
      + make_interval(secs => greatest(coalesce(p_observation_hours, 72), 0) * 3600);
    if now() < v_eligible_at then
      raise exception 'Views belum dapat difinalisasi. Periode observasi % jam belum selesai.',
        trim(to_char(greatest(coalesce(p_observation_hours, 72), 0), 'FM999990.##'))
        using errcode = 'P0001', hint = to_char(v_eligible_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"');
    end if;

    update public.campaign_submissions s
       set status = 'approved',
           views = p_views,
           views_count = p_views,
           views_captured_at = now(),
           views_source = 'manual_admin',
           views_final = true,
           review_notes = coalesce(v_note, s.review_notes)
     where s.id = p_submission_id;
  else
    update public.campaign_submissions s
       set status = 'rejected',
           review_notes = coalesce(v_note, s.review_notes)
     where s.id = p_submission_id;
  end if;

  -- Status klaim mengikuti hasil review.
  update public.campaign_claims cl set status = p_decision where cl.id = v_submission.claim_id;

  if p_decision = 'rejected' then
    update public.campaigns c
       set total_claims = greatest(0, c.total_claims - 1)
     where c.id = v_campaign_id;

    insert into public.notifications (id, user_id, title, message, type, is_read)
    values (
      private.notification_id(p_submission_id, 'submission_rejected'),
      v_submission.creator_id,
      'Bukti Kerja Ditolak',
      left(coalesce('Bukti kerja Anda ditolak: ' || v_note,
        'Bukti kerja Anda ditolak oleh Marketiv. Periksa catatan review.'), 1000),
      'campaign',
      false
    )
    on conflict (id) do nothing;
  else
    -- TODO(fase-08): credit_campaign_reward — kredit reward kreator (views ×
    -- reward_per_1000_views, potong remaining_budget, ledger) dalam transaksi ini.
    insert into public.notifications (id, user_id, title, message, type, is_read)
    values (
      private.notification_id(p_submission_id, 'submission_approved'),
      v_submission.creator_id,
      'Bukti Kerja Disetujui',
      left(format('Bukti kerja Anda disetujui dengan %s views.', p_views), 1000),
      'submission_approved',
      false
    )
    on conflict (id) do nothing;
  end if;

  return jsonb_build_object(
    'success', true,
    'campaignId', v_campaign_id,
    'status', p_decision,
    'reviewedBy', p_reviewer_id
  );
end;
$$;

comment on function public.review_submission(uuid, text, text, text, boolean, bigint, numeric) is
  'Review bukti kerja oleh Admin (status + klaim + kuota + notifikasi; reward = Fase 8). Hanya service_role.';

-- -----------------------------------------------------------------------------
-- private.expire_stale_claims — klaim `claimed` yang lewat batas
-- `submission_days` (0/null → 7 hari, sama dengan `Number(x) || 7`) diubah ke
-- `expired`, slot dikembalikan, kreator diberi notifikasi. Set-based, satu
-- statement; dijalankan pg_cron tiap 6 jam. Schema `private` tidak diekspos
-- Data API.
-- -----------------------------------------------------------------------------
create or replace function private.expire_stale_claims()
returns integer
language plpgsql
volatile
security invoker
set search_path = ''
as $$
declare
  v_count integer;
begin
  with stale as (
    select cl.id, cl.campaign_id, cl.creator_id, cp.title,
           coalesce(nullif(cp.submission_days, 0), 7) as days
    from public.campaign_claims cl
    join public.campaigns cp on cp.id = cl.campaign_id
    where cl.status = 'claimed'
      and cl.claimed_at + make_interval(days => coalesce(nullif(cp.submission_days, 0), 7)) <= now()
    order by cl.campaign_id
    for update of cp, cl skip locked
  ),
  expired as (
    update public.campaign_claims cl
       set status = 'expired'
      from stale
     where cl.id = stale.id
    returning stale.*
  ),
  dec as (
    update public.campaigns c
       set total_claims = greatest(0, c.total_claims - e.cnt)
      from (select campaign_id, count(*)::integer as cnt from expired group by campaign_id) e
     where c.id = e.campaign_id
    returning c.id
  ),
  notified as (
    insert into public.notifications (id, user_id, title, message, type, is_read)
    select private.notification_id(e.id, 'claim_expired'),
           e.creator_id,
           'Claim Expired',
           left(format('Claim-mu di "%s" expired karena kamu tidak submit dalam %s hari', e.title, e.days), 1000),
           'claim_expired',
           false
    from expired e
    on conflict (id) do nothing
    returning 1
  )
  select count(*)::integer into v_count from expired;

  return v_count;
end;
$$;

comment on function private.expire_stale_claims() is
  'Cron: expire klaim yang lewat submission_days + kembalikan slot + notifikasi (pengganti expire-stale-claims).';

-- -----------------------------------------------------------------------------
-- Hak akses
-- -----------------------------------------------------------------------------
revoke all on function public.claim_campaign(text, uuid) from public, anon, authenticated;
revoke all on function public.unclaim_campaign(text, uuid, text) from public, anon, authenticated;
revoke all on function public.submit_campaign_proof(uuid, text, text, text, text, text) from public, anon, authenticated;
revoke all on function public.record_fraud_check(text, integer, text, text) from public, anon, authenticated;
revoke all on function public.review_submission(uuid, text, text, text, boolean, bigint, numeric) from public, anon, authenticated;
revoke all on function private.expire_stale_claims() from public, anon, authenticated;

grant execute on function public.claim_campaign(text, uuid) to service_role;
grant execute on function public.unclaim_campaign(text, uuid, text) to service_role;
grant execute on function public.submit_campaign_proof(uuid, text, text, text, text, text) to service_role;
grant execute on function public.record_fraud_check(text, integer, text, text) to service_role;
grant execute on function public.review_submission(uuid, text, text, text, boolean, bigint, numeric) to service_role;

-- -----------------------------------------------------------------------------
-- pg_cron: expire-stale-claims tiap 6 jam. `cron.schedule` dengan nama yang
-- sama memperbarui job yang ada (idempoten).
-- -----------------------------------------------------------------------------
create extension if not exists pg_cron with schema pg_catalog;

select cron.schedule(
  'expire-stale-claims',
  '0 */6 * * *',
  $$select private.expire_stale_claims()$$
);
