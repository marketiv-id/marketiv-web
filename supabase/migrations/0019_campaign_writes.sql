-- =============================================================================
-- 0019_campaign_writes — RPC tulis campaign UMKM (Fase 6).
--
--   * create_campaign_draft(...) : campaign + brief + aset dalam SATU transaksi
--                                  (pengganti createDocument ×3 dari browser).
--   * publish_campaign(...)      : draft → active (patch-campaign-status
--                                  action=publish) + notifikasi kreator
--                                  (pengganti trigger campaign-published).
--
-- Dipanggil HANYA oleh Route Handler `/api/campaigns/**` (service role) setelah
-- `requireUser({ role: "umkm" })`; `p_umkm_id` = userId sesi, tidak pernah dari
-- body. SECURITY INVOKER (service role melewati RLS sendiri), search_path
-- kosong, EXECUTE dicabut dari public/anon/authenticated.
--
-- Celah #2 (README): kolom uang/status TIDAK pernah dibaca dari argumen —
-- status='draft', remaining_budget=0, spent_amount=0, total_claims=0,
-- published_at=null selalu dipaksa di sini.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- create_campaign_draft
--
-- p_campaign : { title, thumbnail_url, category, type, platforms?, description,
--                budget, reward_per_1000_views, claim_limit, submission_days }
--              (sudah divalidasi zod di route; CHECK tabel tetap berlaku)
-- p_brief    : null | { objective, content_angle, cta, brief_detail,
--                       do_and_dont (object|null), generated_by_ai }
-- p_asset    : null | { file_url, file_name }
--
-- Mengembalikan baris campaign yang dibuat.
-- -----------------------------------------------------------------------------
create or replace function public.create_campaign_draft(
  p_umkm_id uuid,
  p_campaign jsonb,
  p_brief jsonb default null,
  p_asset jsonb default null
)
returns public.campaigns
language plpgsql
volatile
security invoker
set search_path = ''
as $$
declare
  v_row public.campaigns;
begin
  if p_umkm_id is null then
    raise exception 'create_campaign_draft: p_umkm_id wajib diisi' using errcode = '22023';
  end if;
  if p_campaign is null or jsonb_typeof(p_campaign) <> 'object' then
    raise exception 'create_campaign_draft: p_campaign wajib objek' using errcode = '22023';
  end if;

  insert into public.campaigns (
    umkm_id, title, thumbnail_url, category, type, platforms, description,
    budget, reward_per_1000_views, claim_limit, submission_days,
    -- Dipaksa server (celah #2):
    status, remaining_budget, spent_amount, total_claims, published_at
  )
  values (
    p_umkm_id,
    p_campaign->>'title',
    coalesce(p_campaign->>'thumbnail_url', ''),
    p_campaign->>'category',
    p_campaign->>'type',
    coalesce(
      (select array_agg(value) from jsonb_array_elements_text(p_campaign->'platforms') as value),
      array['tiktok']::text[]
    ),
    p_campaign->>'description',
    (p_campaign->>'budget')::bigint,
    (p_campaign->>'reward_per_1000_views')::bigint,
    (p_campaign->>'claim_limit')::integer,
    coalesce((p_campaign->>'submission_days')::integer, 7),
    'draft', 0, 0, 0, null
  )
  returning * into v_row;

  if p_brief is not null and jsonb_typeof(p_brief) = 'object' then
    insert into public.campaign_briefs (
      campaign_id, objective, content_angle, cta, brief_detail, do_and_dont, generated_by_ai
    )
    values (
      v_row.id,
      coalesce(p_brief->>'objective', ''),
      p_brief->>'content_angle',
      p_brief->>'cta',
      p_brief->>'brief_detail',
      case when jsonb_typeof(p_brief->'do_and_dont') = 'object' then p_brief->'do_and_dont' end,
      coalesce((p_brief->>'generated_by_ai')::boolean, false)
    );
  end if;

  if p_asset is not null and jsonb_typeof(p_asset) = 'object' then
    insert into public.campaign_assets (campaign_id, source, type, file_url, file_name)
    values (
      v_row.id,
      'external',
      'link',
      p_asset->>'file_url',
      coalesce(nullif(p_asset->>'file_name', ''), 'Folder Aset Eksternal')
    );
  end if;

  return v_row;
end;
$$;

comment on function public.create_campaign_draft(uuid, jsonb, jsonb, jsonb) is
  'Campaign draft + brief + aset dalam satu transaksi; status/uang dipaksa server. Hanya service_role.';

-- -----------------------------------------------------------------------------
-- publish_campaign — draft → active.
--
-- Hasil (text):
--   'not_found'   campaign tidak ada / bukan milik p_umkm_id   → 404
--   'not_draft'   status bukan draft                           → 409
--   'underfunded' remaining_budget < budget                    → 409
--   'published'   berhasil
--
-- Baris campaign dikunci (FOR UPDATE) supaya dua publish bersamaan, atau publish
-- yang bersamaan dengan webhook pembayaran, tidak membaca dana yang basi.
--
-- Efek samping (dulu Function `campaign-published`): notifikasi in-app
-- "Campaign Baru" untuk setiap kreator dengan profil lengkap. ID notifikasi
-- deterministik sama dengan Function lama — sha256("<campaign>:<creator>:
-- campaign_published") → 'ntf' + 29 hex — jadi publish ulang tidak menggandakan
-- (ON CONFLICT DO NOTHING). Function lama membatasi 100 kreator (artefak
-- paginasi Appwrite); di sini semua kreator yang memenuhi syarat.
-- -----------------------------------------------------------------------------
create or replace function public.publish_campaign(p_umkm_id uuid, p_campaign_id text)
returns text
language plpgsql
volatile
security invoker
set search_path = ''
as $$
declare
  v_campaign public.campaigns;
begin
  select * into v_campaign
  from public.campaigns c
  where c.id = p_campaign_id and c.umkm_id = p_umkm_id
  for update;

  if not found then
    return 'not_found';
  end if;
  if v_campaign.status <> 'draft' then
    return 'not_draft';
  end if;
  if v_campaign.remaining_budget < v_campaign.budget then
    return 'underfunded';
  end if;

  update public.campaigns
     set status = 'active',
         published_at = now()
   where id = v_campaign.id;

  insert into public.notifications (id, user_id, title, message, type, is_read)
  select
    'ntf' || left(
      encode(
        pg_catalog.sha256(convert_to(v_campaign.id || ':' || cp.user_id::text || ':campaign_published', 'UTF8')),
        'hex'
      ),
      29
    ),
    cp.user_id,
    'Campaign Baru',
    left(format('Campaign "%s" tersedia — cek sekarang', v_campaign.title), 1000),
    'campaign_published',
    false
  from public.creator_profiles cp
  where cp.is_profile_completed
  on conflict (id) do nothing;

  return 'published';
end;
$$;

comment on function public.publish_campaign(uuid, text) is
  'Terbitkan campaign draft yang sudah didanai + notifikasi kreator (idempoten). Hanya service_role.';

-- -----------------------------------------------------------------------------
-- Hak akses: hanya service_role.
-- -----------------------------------------------------------------------------
revoke all on function public.create_campaign_draft(uuid, jsonb, jsonb, jsonb) from public, anon, authenticated;
revoke all on function public.publish_campaign(uuid, text) from public, anon, authenticated;

grant execute on function public.create_campaign_draft(uuid, jsonb, jsonb, jsonb) to service_role;
grant execute on function public.publish_campaign(uuid, text) to service_role;
