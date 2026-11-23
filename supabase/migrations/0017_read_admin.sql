-- =============================================================================
-- 0017_read_admin — jalur baca app admin (Fase 5).
--
--   * admin_ratecard_deliverable_queue(p_limit) : pengganti loop N+1 di
--     Function get-admin-ratecard-deliverable-queue (3 query per deliverable).
--
-- Dipanggil HANYA oleh Route Handler admin (service role) setelah
-- `requireAdmin()` memverifikasi sesi. SECURITY INVOKER: service role melewati
-- RLS sendiri; EXECUTE dicabut dari public/anon/authenticated.
--
-- Antrean submission / withdrawal / ringkasan dashboard cukup dengan query
-- batch `.in()` (jumlah round-trip konstan), jadi tidak butuh RPC.
-- =============================================================================

-- Deliverable terbaru per order: `order by version desc, created_at desc`.
create index if not exists deliverables_order_id_version_idx
  on public.deliverables (order_id, version desc, created_at desc);

-- Antrean validasi hanya membaca deliverable berstatus `submitted`.
create index if not exists deliverables_submitted_created_at_idx
  on public.deliverables (created_at desc)
  where status = 'submitted';

-- -----------------------------------------------------------------------------
-- admin_ratecard_deliverable_queue — deliverable Rate Card yang menunggu
-- validasi Admin. Aturan sama dengan Function lama:
--   * deliverable.status = 'submitted'
--   * belum punya baris ratecard_deliverable_validations
--   * order.status in ('in_progress', 'revision')
--   * deliverable adalah versi TERBARU untuk order-nya
-- Urut terbaru dulu, maksimum p_limit (default 100, batas 1..100).
--
-- Deviasi kecil yang disengaja: Function lama mengambil 100 deliverable
-- `submitted` terbaru LALU menyaring, sehingga kandidat valid di luar 100 baris
-- itu tidak pernah muncul. Di sini penyaringan dulu, baru dibatasi.
-- -----------------------------------------------------------------------------
create or replace function public.admin_ratecard_deliverable_queue(p_limit integer default 100)
returns table (
  deliverable_id text,
  order_id text,
  version integer,
  source text,
  file_url text,
  notes text,
  submitted_at timestamptz,
  creator_id uuid,
  creator_display_name text,
  umkm_id uuid,
  umkm_business_name text,
  package_name_snapshot text,
  amount bigint
)
language sql
stable
security invoker
set search_path = ''
as $$
  select
    d.id,
    o.id,
    d.version,
    d.source,
    d.file_url,
    d.notes,
    d.created_at,
    o.creator_id,
    cp.display_name,
    o.umkm_id,
    up.business_name,
    o.package_name_snapshot,
    o.amount
  from public.deliverables d
  join public.orders o on o.id = d.order_id
  left join public.creator_profiles cp on cp.user_id = o.creator_id
  left join public.umkm_profiles up on up.user_id = o.umkm_id
  where d.status = 'submitted'
    and o.status in ('in_progress', 'revision')
    and not exists (
      select 1
      from public.ratecard_deliverable_validations v
      where v.deliverable_id = d.id
    )
    and d.id = (
      select latest.id
      from public.deliverables latest
      where latest.order_id = d.order_id
      order by latest.version desc, latest.created_at desc, latest.id desc
      limit 1
    )
  order by d.created_at desc, d.id desc
  limit least(greatest(coalesce(p_limit, 100), 1), 100);
$$;

comment on function public.admin_ratecard_deliverable_queue(integer) is
  'Antrean validasi deliverable Rate Card untuk Admin (tanpa N+1). Hanya service_role.';

revoke all on function public.admin_ratecard_deliverable_queue(integer)
  from public, anon, authenticated;
grant execute on function public.admin_ratecard_deliverable_queue(integer)
  to service_role;
