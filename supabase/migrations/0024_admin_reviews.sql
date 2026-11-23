-- =============================================================================
-- 0024_admin_reviews — keputusan Admin atas deliverable Rate Card (Fase 7).
--
--   * review_ratecard_deliverable(...) : pengganti Function
--     `review-ratecard-deliverable`.
--
-- Dipanggil HANYA oleh Route Handler admin (service role) setelah
-- `requireAdmin()`. Fungsi tetap memeriksa ulang bahwa `p_admin_id` adalah
-- admin aktif (defense in depth; `reviewed_by` disimpan dari argumen ini).
--
-- Review submission campaign memakai `review_submission` (0022, alur campaign)
-- dengan `p_as_admin = true` — tidak didefinisikan di sini.
--
-- Error → HTTP di route:
--   22023 → 400 (input), 42501 → 403, P0002 → 404, P0001 → 409 (aturan bisnis).
-- =============================================================================

create or replace function public.review_ratecard_deliverable(
  p_admin_id uuid,
  p_deliverable_id text,
  p_decision text,
  p_notes text default null
)
returns jsonb
language plpgsql
volatile
security invoker
set search_path = ''
as $$
declare
  v_notes text := left(btrim(coalesce(p_notes, '')), 2000);
  v_deliverable public.deliverables;
  v_order public.orders;
  v_latest_id text;
  v_existing public.ratecard_deliverable_validations;
  v_validation public.ratecard_deliverable_validations;
begin
  if p_deliverable_id is null or btrim(p_deliverable_id) = ''
     or p_decision is null or p_decision not in ('valid', 'invalid') then
    raise exception 'Input review tidak valid.' using errcode = '22023';
  end if;
  if p_decision = 'invalid' and v_notes = '' then
    raise exception 'Catatan wajib untuk keputusan invalid.' using errcode = '22023';
  end if;

  if not exists (
    select 1 from public.users u
    where u.id = p_admin_id and u.role = 'admin' and u.status = 'active'
  ) then
    raise exception 'Akses Admin ditolak.' using errcode = '42501';
  end if;

  -- Kunci deliverable supaya dua admin tidak memutus bersamaan.
  select * into v_deliverable
  from public.deliverables d
  where d.id = p_deliverable_id
  for update;
  if not found then
    raise exception 'Deliverable atau order tidak ditemukan.' using errcode = 'P0002';
  end if;

  select * into v_order from public.orders o where o.id = v_deliverable.order_id;
  if not found then
    raise exception 'Deliverable atau order tidak ditemukan.' using errcode = 'P0002';
  end if;

  -- Retry identik (admin + keputusan sama) → sukses tanpa efek ganda.
  select * into v_existing
  from public.ratecard_deliverable_validations v
  where v.deliverable_id = p_deliverable_id;
  if found then
    if v_existing.reviewed_by = p_admin_id and v_existing.status = p_decision then
      return jsonb_build_object(
        'success', true,
        'deliverableId', p_deliverable_id,
        'decision', v_existing.status,
        'reviewedAt', v_existing.reviewed_at,
        'alreadyReviewed', true
      );
    end if;
    raise exception 'Deliverable sudah memiliki keputusan final.' using errcode = 'P0001';
  end if;

  if coalesce(v_order.offer_id, '') = '' and coalesce(v_order.package_id, '') = '' then
    raise exception 'Deliverable bukan bagian dari Rate Card order.' using errcode = 'P0001';
  end if;
  if v_order.status not in ('in_progress', 'revision') then
    raise exception 'Order tidak berada pada tahap review.' using errcode = 'P0001';
  end if;
  if v_deliverable.status <> 'submitted' then
    raise exception 'Deliverable tidak menunggu validasi.' using errcode = 'P0001';
  end if;

  select d.id into v_latest_id
  from public.deliverables d
  where d.order_id = v_order.id
  order by d.version desc, d.created_at desc, d.id desc
  limit 1;
  if v_latest_id is distinct from p_deliverable_id then
    raise exception 'Deliverable bukan versi terbaru.' using errcode = 'P0001';
  end if;

  insert into public.ratecard_deliverable_validations (
    deliverable_id, order_id, deliverable_version, source_snapshot,
    evidence_url_snapshot, status, reviewed_by, review_notes, reviewed_at
  )
  values (
    p_deliverable_id, v_order.id, v_deliverable.version, v_deliverable.source,
    v_deliverable.file_url, p_decision, p_admin_id, nullif(v_notes, ''), now()
  )
  returning * into v_validation;

  -- Notifikasi (ID deterministik sama dengan Function lama → idempoten).
  insert into public.notifications (id, user_id, title, message, type, is_read)
  values
    (
      private.notification_id(p_deliverable_id, 'ratecard_validation_' || p_decision),
      v_order.creator_id,
      case when p_decision = 'valid' then 'Deliverable Tervalidasi' else 'Deliverable Perlu Diperbaiki' end,
      left(case when p_decision = 'valid'
        then 'Admin Marketiv sudah memvalidasi deliverable. UMKM dapat melanjutkan persetujuan.'
        else 'Admin Marketiv meminta perbaikan: ' || v_notes end, 1000),
      'order',
      false
    ),
    (
      private.notification_id(p_deliverable_id, 'ratecard_validation_' || p_decision || '_umkm'),
      v_order.umkm_id,
      case when p_decision = 'valid' then 'Deliverable Siap Direview' else 'Deliverable Tidak Valid' end,
      left(case when p_decision = 'valid'
        then 'Admin Marketiv sudah memvalidasi deliverable. Kamu dapat menyetujuinya setelah memeriksa hasil kerja.'
        else 'Admin Marketiv menolak deliverable: ' || v_notes end, 1000),
      'order',
      false
    )
  on conflict (id) do nothing;

  -- TODO(fase-08): tidak ada efek uang di sini (validasi admin hanya membuka
  -- jalan bagi UMKM menyetujui; pencairan escrow ada di approve/release).

  return jsonb_build_object(
    'success', true,
    'deliverableId', p_deliverable_id,
    'decision', v_validation.status,
    'reviewedAt', v_validation.reviewed_at
  );
end;
$$;

comment on function public.review_ratecard_deliverable(uuid, text, text, text) is
  'Keputusan Admin (valid/invalid) atas deliverable Rate Card terbaru + notifikasi. Hanya service_role.';

revoke all on function public.review_ratecard_deliverable(uuid, text, text, text)
  from public, anon, authenticated;
grant execute on function public.review_ratecard_deliverable(uuid, text, text, text)
  to service_role;
