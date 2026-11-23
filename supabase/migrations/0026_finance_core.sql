-- =============================================================================
-- 0026_finance_core — RPC inti perpindahan uang (Fase 8).
--
-- Pengganti Function Appwrite:
--   create-escrow (+ efek paid midtrans-webhook) → apply_payment_paid
--   release-escrow                               → release_escrow
--   reconcile-release-escrow                     → private.reconcile_release_escrow (pg_cron */15)
--   refund-escrow / refund-order (order)         → refund_escrow
--   refund-order (campaign)                      → refund_campaign_budget
--   calculate-campaign-reward                    → credit_campaign_reward
--   fee-rate-flip                                → private.fee_rate_flip_check (pg_cron harian)
--
-- Enam prinsip (08-keuangan.md):
--   1. Satu perpindahan uang = satu RPC SECURITY DEFINER, search_path ''.
--   2. Kunci FOR UPDATE, urutan tetap: payments → campaigns → orders → escrows
--      → (submissions) → wallets. Wallet hanya dikunci di dalam post_ledger.
--   3. Ledger dulu, saldo kemudian: SEMUA perubahan saldo lewat
--      private.post_ledger (0025) — insert … on conflict do nothing returning.
--   4. Transisi status bersyarat (update … where status = … returning); 0 baris
--      = no-op idempoten.
--   5. CHECK balance/remaining_budget >= 0 sudah di DB (0004/0007).
--   6. EXECUTE hanya service_role.
--
-- Juga mengganti STUB Fase 7: review_submission (approve → kredit reward),
-- approve_deliverable dan private.auto_approve_orders (→ release_escrow).
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Konfigurasi keuangan (pengganti env FEE_RATE / ADMIN_NOTIFY_USER_ID).
-- fee_rate disnapshot ke escrows.fee_rate saat escrow dibuat (order lama tetap
-- memakai rate lamanya). Flip ke 5% tetap MANUAL (sama dengan fee-rate-flip
-- lama): `update private.finance_settings set value = '0.05' where key = 'fee_rate'`.
-- -----------------------------------------------------------------------------
create table if not exists private.finance_settings (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now()
);

insert into private.finance_settings (key, value) values
  ('fee_rate', '0.02'::jsonb),
  ('fee_flip_threshold', '1000'::jsonb)
on conflict (key) do nothing;

revoke all on private.finance_settings from public, anon, authenticated;
grant select on private.finance_settings to service_role;

create or replace function private.finance_fee_rate()
returns numeric
language sql
stable
set search_path = ''
as $$
  select coalesce(
    (select (s.value #>> '{}')::numeric from private.finance_settings s where s.key = 'fee_rate'),
    0.02
  );
$$;

-- Dipakai route create-payment (fee buyer-side campaign) — hanya service_role.
create or replace function public.get_fee_rate()
returns numeric
language sql
stable
security definer
set search_path = ''
as $$
  select private.finance_fee_rate();
$$;

comment on function public.get_fee_rate() is
  'Fee rate platform berlaku (private.finance_settings.fee_rate, default 0.02). Hanya service_role.';

-- Rate efektif sebuah escrow: snapshot > 0, kalau 0 (data lama) pakai 0.02.
create or replace function private.escrow_fee_rate(p_rate numeric)
returns numeric
language sql
immutable
set search_path = ''
as $$
  select case when coalesce(p_rate, 0) > 0 then p_rate else 0.02 end;
$$;

create or replace function private.rupiah(p_amount bigint)
returns text
language sql
immutable
set search_path = ''
as $$
  select 'Rp' || replace(to_char(coalesce(p_amount, 0), 'FM999G999G999G999G990'), ',', '.');
$$;

-- -----------------------------------------------------------------------------
-- apply_payment_paid — efek pembayaran sukses (settlement/capture Midtrans).
--
-- Dipanggil webhook SETELAH signature diverifikasi. Nominal Midtrans
-- (gross_amount) wajib = total_amount (fallback amount untuk baris lama).
--   order    : escrow `held` (fee_rate snapshot), ledger `payment` (order),
--              order pending_payment → in_progress, notifikasi kedua pihak.
--   campaign / topup : ledger `payment` (payment), remaining_budget += amount.
-- Idempoten: payment sudah `paid` → no-op. Payment non-pending (expired,
-- cancelled, failed) → exception hint `not_pending` (webhook memicu alert;
-- tidak ada uang yang dipindah otomatis).
-- -----------------------------------------------------------------------------
create or replace function public.apply_payment_paid(
  p_payment_id text,
  p_gateway_reference text,
  p_gross_amount bigint
)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_payment public.payments;
  v_expected bigint;
  v_order public.orders;
  v_campaign public.campaigns;
  v_escrow public.escrows;
  v_ledger text;
begin
  select * into v_payment from public.payments p where p.id = p_payment_id for update;
  if not found then
    raise exception 'Payment tidak ditemukan.' using errcode = 'P0002';
  end if;
  if p_gateway_reference is not null and v_payment.gateway_reference <> p_gateway_reference then
    raise exception 'Referensi gateway tidak cocok.' using errcode = 'P0001', hint = 'reference_mismatch';
  end if;

  v_expected := case when v_payment.total_amount > 0 then v_payment.total_amount else v_payment.amount end;
  if p_gross_amount is null or p_gross_amount <> v_expected then
    raise exception 'Nominal pembayaran tidak cocok.' using errcode = 'P0001', hint = 'amount_mismatch';
  end if;

  if v_payment.status = 'paid' then
    return jsonb_build_object('status', 'already_paid', 'paymentId', v_payment.id, 'purpose', v_payment.purpose);
  end if;
  if v_payment.status <> 'pending' then
    raise exception 'Payment % berstatus %, tidak bisa ditandai lunas.', v_payment.id, v_payment.status
      using errcode = 'P0001', hint = 'not_pending';
  end if;

  if v_payment.purpose = 'order' then
    if v_payment.order_id is null then
      raise exception 'Payment order tanpa order_id.' using errcode = 'P0001', hint = 'invalid_payment';
    end if;
    select * into v_order from public.orders o where o.id = v_payment.order_id for update;
    if not found then
      raise exception 'Order tidak ditemukan.' using errcode = 'P0002';
    end if;
    if v_order.status <> 'pending_payment' then
      raise exception 'Order % berstatus %, tidak menunggu pembayaran.', v_order.id, v_order.status
        using errcode = 'P0001', hint = 'order_not_payable';
    end if;
    if v_order.amount <> v_payment.amount then
      raise exception 'Nominal payment tidak sama dengan order.' using errcode = 'P0001', hint = 'amount_mismatch';
    end if;

    update public.payments p
       set status = 'paid', paid_at = now()
     where p.id = v_payment.id and p.status = 'pending';

    insert into public.escrows (order_id, amount, status, fee_rate)
    values (v_order.id, v_payment.amount, 'held', private.finance_fee_rate())
    on conflict (order_id) do nothing;
    select * into v_escrow from public.escrows e where e.order_id = v_order.id for update;

    v_ledger := private.post_ledger(v_payment.user_id, 'payment', v_payment.amount, 'order', v_order.id);

    update public.orders o
       set status = 'in_progress'
     where o.id = v_order.id and o.status = 'pending_payment';

    insert into public.notifications (id, user_id, title, message, type, is_read)
    values
      (private.notification_id(v_escrow.id, 'escrow_held_umkm'), v_order.umkm_id,
       'Pembayaran Berhasil',
       format('Dana %s sudah ditahan di escrow. Kreator bisa mulai mengerjakan pesananmu.', private.rupiah(v_escrow.amount)),
       'escrow_held', false),
      (private.notification_id(v_escrow.id, 'escrow_held_creator'), v_order.creator_id,
       'Pesanan Siap Dikerjakan',
       format('UMKM sudah membayar %s ke escrow. Silakan mulai mengerjakan dan kirim hasilnya lewat ruang negosiasi.', private.rupiah(v_escrow.amount)),
       'escrow_held', false)
    on conflict (id) do nothing;

    return jsonb_build_object('status', 'paid', 'paymentId', v_payment.id, 'purpose', 'order',
                              'orderId', v_order.id, 'escrowId', v_escrow.id, 'amount', v_escrow.amount);
  end if;

  -- campaign / topup: dana masuk ke remaining_budget campaign (bukan wallet).
  if v_payment.campaign_id is null then
    raise exception 'Payment campaign tanpa campaign_id.' using errcode = 'P0001', hint = 'invalid_payment';
  end if;
  select * into v_campaign from public.campaigns c where c.id = v_payment.campaign_id for update;
  if not found then
    raise exception 'Campaign tidak ditemukan.' using errcode = 'P0002';
  end if;

  update public.payments p
     set status = 'paid', paid_at = now()
   where p.id = v_payment.id and p.status = 'pending';

  v_ledger := private.post_ledger(v_payment.user_id, 'payment', v_payment.amount, 'payment', v_payment.id);
  if v_ledger is not null then
    update public.campaigns c
       set remaining_budget = c.remaining_budget + v_payment.amount
     where c.id = v_campaign.id
    returning * into v_campaign;
  end if;

  return jsonb_build_object('status', 'paid', 'paymentId', v_payment.id, 'purpose', v_payment.purpose,
                            'campaignId', v_campaign.id, 'remainingBudget', v_campaign.remaining_budget);
end;
$$;

comment on function public.apply_payment_paid(text, text, bigint) is
  'Payment pending → paid + escrow/top-up + ledger (atomik, idempoten). Hanya service_role.';

-- -----------------------------------------------------------------------------
-- release_escrow — cairkan escrow order ke wallet kreator.
--
-- Syarat (sama dengan release-escrow lama, state dibaca ulang dari DB):
--   order in_progress/revision; deliverable TERBARU berstatus approved; validasi
--   Admin `valid` yang snapshot-nya cocok (order, versi, source, URL).
-- Syarat belum terpenuhi → {status: 'not_releasable', reason} tanpa efek.
-- Kreator menerima amount − floor(amount × fee_rate); fee dicatat (arah 0).
-- Escrow → released, order → completed. Idempoten.
-- -----------------------------------------------------------------------------
create or replace function public.release_escrow(p_order_id text)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_order public.orders;
  v_escrow public.escrows;
  v_deliverable public.deliverables;
  v_validation public.ratecard_deliverable_validations;
  v_rate numeric;
  v_fee bigint;
  v_net bigint;
begin
  select * into v_order from public.orders o where o.id = p_order_id for update;
  if not found then
    raise exception 'Order tidak ditemukan.' using errcode = 'P0002';
  end if;

  select * into v_escrow from public.escrows e where e.order_id = p_order_id for update;
  if not found then
    return jsonb_build_object('status', 'not_releasable', 'reason', 'escrow_not_found', 'orderId', p_order_id);
  end if;
  if v_escrow.status = 'released' then
    return jsonb_build_object('status', 'already_released', 'orderId', p_order_id, 'escrowId', v_escrow.id);
  end if;
  if v_escrow.status not in ('held', 'releasing') then
    return jsonb_build_object('status', 'not_releasable', 'reason', 'escrow_' || v_escrow.status, 'orderId', p_order_id);
  end if;
  if v_order.status not in ('in_progress', 'revision') then
    return jsonb_build_object('status', 'not_releasable', 'reason', 'order_' || v_order.status, 'orderId', p_order_id);
  end if;

  select * into v_deliverable
  from public.deliverables d
  where d.order_id = p_order_id
  order by d.version desc, d.created_at desc, d.id desc
  limit 1;
  if not found or v_deliverable.status <> 'approved' then
    return jsonb_build_object('status', 'not_releasable', 'reason', 'deliverable_not_approved', 'orderId', p_order_id);
  end if;

  select * into v_validation
  from public.ratecard_deliverable_validations v
  where v.deliverable_id = v_deliverable.id;
  if not found
     or v_validation.status <> 'valid'
     or v_validation.order_id <> p_order_id
     or v_validation.deliverable_version <> v_deliverable.version
     or v_validation.source_snapshot is distinct from v_deliverable.source
     or v_validation.evidence_url_snapshot is distinct from v_deliverable.file_url then
    return jsonb_build_object('status', 'not_releasable', 'reason', 'validation_missing', 'orderId', p_order_id);
  end if;

  v_rate := private.escrow_fee_rate(v_escrow.fee_rate);
  v_fee := floor(v_escrow.amount * v_rate)::bigint;
  v_net := v_escrow.amount - v_fee;

  perform private.post_ledger(v_order.creator_id, 'release', v_net, 'escrow', v_escrow.id);
  if v_fee > 0 then
    perform private.post_ledger(v_order.creator_id, 'fee', v_fee, 'escrow', v_escrow.id);
  end if;

  update public.escrows e set status = 'released'
   where e.id = v_escrow.id and e.status in ('held', 'releasing');
  update public.orders o set status = 'completed', review_deadline_at = null
   where o.id = p_order_id and o.status in ('in_progress', 'revision');

  insert into public.notifications (id, user_id, title, message, type, is_read)
  values
    (private.notification_id(v_escrow.id, 'escrow_released_creator'), v_order.creator_id,
     'Dana Sudah Cair',
     case when v_fee > 0
       then format('Pesanan selesai. %s masuk ke saldomu setelah dipotong fee platform %s%% (%s).',
                   private.rupiah(v_net), trim(to_char(v_rate * 100, 'FM990.##')), private.rupiah(v_fee))
       else format('Pesanan selesai. %s masuk ke saldomu.', private.rupiah(v_net)) end,
     'escrow_released', false),
    (private.notification_id(v_escrow.id, 'escrow_released_umkm'), v_order.umkm_id,
     'Pesanan Selesai',
     format('Kamu menyetujui hasil kerjanya dan dana %s sudah dilepaskan ke kreator.', private.rupiah(v_escrow.amount)),
     'order_completed', false)
  on conflict (id) do nothing;

  return jsonb_build_object('status', 'released', 'orderId', p_order_id, 'escrowId', v_escrow.id,
                            'creatorAmount', v_net, 'feeAmount', v_fee);
end;
$$;

comment on function public.release_escrow(text) is
  'Cairkan escrow (approved + validasi valid) ke wallet kreator dikurangi fee (atomik, idempoten). Hanya service_role.';

-- -----------------------------------------------------------------------------
-- refund_escrow — kembalikan escrow `held` utuh ke wallet UMKM (dispute /
-- order batal setelah bayar). Escrow `released` TIDAK bisa di-refund.
-- Status escrow, ledger refund, saldo, dan status order dalam SATU transaksi:
-- tidak ada lagi jendela "escrow refunded tapi dana belum masuk".
-- -----------------------------------------------------------------------------
create or replace function public.refund_escrow(p_order_id text, p_reason text default null)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_order public.orders;
  v_escrow public.escrows;
begin
  select * into v_order from public.orders o where o.id = p_order_id for update;
  if not found then
    raise exception 'Order tidak ditemukan.' using errcode = 'P0002';
  end if;
  select * into v_escrow from public.escrows e where e.order_id = p_order_id for update;
  if not found then
    raise exception 'Escrow untuk order ini tidak ditemukan.' using errcode = 'P0002';
  end if;
  if v_escrow.status = 'refunded' then
    return jsonb_build_object('status', 'already_refunded', 'orderId', p_order_id, 'escrowId', v_escrow.id);
  end if;
  if v_escrow.status <> 'held' then
    raise exception 'Escrow berstatus %, tidak bisa di-refund.', v_escrow.status
      using errcode = 'P0001', hint = 'escrow_not_held';
  end if;

  update public.escrows e set status = 'refunded'
   where e.id = v_escrow.id and e.status = 'held';

  perform private.post_ledger(v_order.umkm_id, 'refund', v_escrow.amount, 'escrow', v_escrow.id);

  update public.orders o
     set status = 'cancelled', review_deadline_at = null
   where o.id = p_order_id and o.status not in ('cancelled', 'expired', 'completed');

  insert into public.notifications (id, user_id, title, message, type, is_read)
  values (private.notification_id(v_escrow.id, 'refund_escrow'), v_order.umkm_id,
          'Refund Diterima',
          format('Pesanan dibatalkan. Dana %s sudah dikembalikan ke saldo Wallet UMKM-mu.', private.rupiah(v_escrow.amount)),
          'refund', false)
  on conflict (id) do nothing;

  return jsonb_build_object('status', 'refunded', 'orderId', p_order_id, 'escrowId', v_escrow.id,
                            'amount', v_escrow.amount, 'reason', nullif(btrim(coalesce(p_reason, '')), ''));
end;
$$;

comment on function public.refund_escrow(text, text) is
  'Refund escrow held ke wallet UMKM + order cancelled (atomik, idempoten). Hanya service_role.';

-- -----------------------------------------------------------------------------
-- refund_campaign_budget — sisa remaining_budget campaign cancelled/completed
-- kembali ke wallet UMKM (jalur campaign refund-order lama).
-- -----------------------------------------------------------------------------
create or replace function public.refund_campaign_budget(p_campaign_id text)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_campaign public.campaigns;
  v_amount bigint;
  v_ledger text;
begin
  select * into v_campaign from public.campaigns c where c.id = p_campaign_id for update;
  if not found then
    raise exception 'Campaign tidak ditemukan.' using errcode = 'P0002';
  end if;
  if v_campaign.status not in ('cancelled', 'completed') then
    raise exception 'Hanya campaign cancelled/completed yang sisa budget-nya bisa dikembalikan.'
      using errcode = 'P0001', hint = 'campaign_not_closed';
  end if;
  v_amount := v_campaign.remaining_budget;
  if v_amount <= 0 then
    return jsonb_build_object('status', 'nothing_to_refund', 'campaignId', p_campaign_id);
  end if;

  v_ledger := private.post_ledger(v_campaign.umkm_id, 'refund', v_amount, 'campaign', v_campaign.id);
  if v_ledger is null then
    return jsonb_build_object('status', 'already_refunded', 'campaignId', p_campaign_id);
  end if;

  update public.campaigns c set remaining_budget = 0 where c.id = v_campaign.id;

  insert into public.notifications (id, user_id, title, message, type, is_read)
  values (private.notification_id(v_campaign.id, 'refund_campaign'), v_campaign.umkm_id,
          'Sisa Budget Dikembalikan',
          format('Sisa budget campaign %s sudah dikembalikan ke saldo Wallet UMKM-mu.', private.rupiah(v_amount)),
          'refund', false)
  on conflict (id) do nothing;

  return jsonb_build_object('status', 'refunded', 'campaignId', p_campaign_id, 'amount', v_amount);
end;
$$;

comment on function public.refund_campaign_budget(text) is
  'Kembalikan sisa budget campaign tertutup ke wallet UMKM (atomik, idempoten). Hanya service_role.';

-- -----------------------------------------------------------------------------
-- credit_campaign_reward — kredit reward submission approved.
--
-- Membaca ULANG submission dari DB (bukan payload event). reward =
-- min(floor(views/1000 × reward_per_1000_views), remaining_budget), views =
-- views_count bila views_final, selain itu views. Kunci campaign lalu
-- submission. Ledger `release` (campaign_submission) → saldo kreator →
-- remaining_budget −= reward, spent_amount += reward; budget habis → campaign
-- completed. Reward 0 → tanpa ledger. Idempoten.
-- -----------------------------------------------------------------------------
create or replace function public.credit_campaign_reward(p_submission_id text)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_campaign_id text;
  v_campaign public.campaigns;
  v_submission public.campaign_submissions;
  v_views bigint;
  v_reward bigint;
  v_ledger text;
begin
  select s.campaign_id into v_campaign_id from public.campaign_submissions s where s.id = p_submission_id;
  if not found then
    raise exception 'Submission tidak ditemukan.' using errcode = 'P0002';
  end if;

  select * into v_campaign from public.campaigns c where c.id = v_campaign_id for update;
  select * into v_submission from public.campaign_submissions s where s.id = p_submission_id for update;

  if v_submission.status <> 'approved' then
    return jsonb_build_object('status', 'not_approved', 'submissionId', p_submission_id);
  end if;

  if exists (
    select 1 from public.transactions t
    where t.reference_type = 'campaign_submission' and t.reference_id = p_submission_id and t.type = 'release'
  ) then
    return jsonb_build_object('status', 'already_credited', 'submissionId', p_submission_id);
  end if;

  v_views := case when v_submission.views_final then coalesce(v_submission.views_count, 0) else coalesce(v_submission.views, 0) end;
  v_reward := least(
    floor(v_views::numeric * v_campaign.reward_per_1000_views / 1000)::bigint,
    v_campaign.remaining_budget
  );

  if v_reward <= 0 then
    return jsonb_build_object('status', 'no_reward', 'submissionId', p_submission_id, 'reward', 0);
  end if;

  v_ledger := private.post_ledger(v_submission.creator_id, 'release', v_reward, 'campaign_submission', p_submission_id);
  if v_ledger is null then
    return jsonb_build_object('status', 'already_credited', 'submissionId', p_submission_id);
  end if;

  update public.campaigns c
     set remaining_budget = c.remaining_budget - v_reward,
         spent_amount = c.spent_amount + v_reward
   where c.id = v_campaign.id
  returning * into v_campaign;

  if v_campaign.remaining_budget <= 0 and v_campaign.status in ('active', 'paused') then
    update public.campaigns c set status = 'completed' where c.id = v_campaign.id;
  end if;

  insert into public.notifications (id, user_id, title, message, type, is_read)
  values (private.notification_id(p_submission_id, 'reward'), v_submission.creator_id,
          'Reward Campaign',
          format('Reward %s sudah masuk ke saldo dan bisa kamu tarik.', private.rupiah(v_reward)),
          'reward', false)
  on conflict (id) do nothing;

  return jsonb_build_object('status', 'credited', 'submissionId', p_submission_id, 'reward', v_reward,
                            'remainingBudget', v_campaign.remaining_budget);
end;
$$;

comment on function public.credit_campaign_reward(text) is
  'Kredit reward submission approved ke wallet kreator dari budget campaign (atomik, idempoten). Hanya service_role.';

-- -----------------------------------------------------------------------------
-- STUB Fase 7 → nyata: review_submission (approve → credit_campaign_reward).
-- Signature dan respons dipertahankan; respons approve kini membawa `reward`.
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
  v_reward jsonb;
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
    -- Fase 8: reward dikredit dalam transaksi yang sama (pengganti event
    -- calculate-campaign-reward). Kunci campaign → submission sudah dipegang.
    v_reward := public.credit_campaign_reward(p_submission_id);
  end if;
  return jsonb_build_object(
    'success', true,
    'campaignId', v_campaign_id,
    'status', p_decision,
    'reviewedBy', p_reviewer_id,
    'reward', coalesce((v_reward ->> 'reward')::bigint, 0)
  );
end;
$$;

-- -----------------------------------------------------------------------------
-- STUB Fase 7 → nyata: approve_deliverable memanggil release_escrow. Dana cair
-- hanya bila validasi Admin `valid` sudah ada (aturan release-escrow lama);
-- kalau belum, deliverable tetap approved dan escrow menunggu (reconcile job
-- mencoba lagi).
-- -----------------------------------------------------------------------------
create or replace function public.approve_deliverable(
  p_deliverable_id text,
  p_umkm_id uuid,
  p_order_id text default null
)
returns jsonb
language plpgsql
volatile
security invoker
set search_path = ''
as $$
declare
  v_deliverable public.deliverables;
  v_order public.orders;
  v_release jsonb;
begin
  select * into v_deliverable from public.deliverables d where d.id = p_deliverable_id;
  if not found then
    raise exception 'Deliverable tidak ditemukan.' using errcode = 'P0002';
  end if;
  -- Urutan kunci: orders → (escrows di release_escrow) → deliverables.
  select * into v_order from public.orders od where od.id = v_deliverable.order_id for update;
  if not found or v_order.umkm_id <> p_umkm_id then
    raise exception 'Pesanan tidak ditemukan.' using errcode = 'P0002';
  end if;
  if p_order_id is not null and p_order_id <> v_order.id then
    raise exception 'Deliverable tidak sesuai dengan pesanan.' using errcode = '22023';
  end if;
  select * into v_deliverable from public.deliverables d where d.id = p_deliverable_id for update;
  if v_deliverable.status = 'approved' then
    raise exception 'Deliverable ini sudah disetujui.' using errcode = 'P0001';
  end if;
  update public.deliverables d set status = 'approved' where d.id = v_deliverable.id;
  update public.orders od
     set review_deadline_at = null,
         reminder_sent_at = null
   where od.id = v_order.id;

  v_release := public.release_escrow(v_order.id);

  return jsonb_build_object('ok', true, 'deliverableId', v_deliverable.id,
                            'orderId', v_order.id, 'status', 'approved',
                            'release', v_release ->> 'status');
end;
$$;

comment on function public.approve_deliverable(text, uuid, text) is
  'UMKM menyetujui deliverable + release_escrow bila validasi admin valid. Hanya service_role.';

-- -----------------------------------------------------------------------------
-- STUB Fase 7 → nyata: auto_approve_orders memanggil release_escrow untuk
-- setiap order yang deliverable-nya baru di-auto-approve.
-- -----------------------------------------------------------------------------
create or replace function private.auto_approve_orders()
returns jsonb
language plpgsql
volatile
security invoker
set search_path = ''
as $$
declare
  v_approved integer := 0;
  v_reminders integer := 0;
  v_released integer := 0;
  v_order_ids text[];
  v_order_id text;
  v_release jsonb;
begin
  with due as (
    select d.id as deliverable_id, od.id as order_id, od.umkm_id
    from public.deliverables d
    join public.orders od on od.id = d.order_id
    where d.status in ('submitted', 'delivered')
      and od.status in ('in_progress', 'revision')
      and od.review_deadline_at is not null
      and od.review_deadline_at <= now()
    for update of d, od skip locked
  ),
  approved as (
    update public.deliverables d
       set status = 'approved'
      from due
     where d.id = due.deliverable_id
    returning due.order_id, due.umkm_id
  ),
  flagged as (
    update public.orders od
       set auto_approved = true,
           reminder_sent_at = coalesce(od.reminder_sent_at, now())
      from (select distinct order_id from approved) a
     where od.id = a.order_id
    returning od.id
  ),
  notified as (
    insert into public.notifications (id, user_id, title, message, type, is_read)
    select distinct
      private.notification_id(a.order_id, 'auto_approved'),
      a.umkm_id,
      'Pesanan Otomatis Disetujui',
      'Tenggat waktu review telah lewat. Pesanan disetujui otomatis.',
      'system',
      false
    from approved a
    on conflict (id) do nothing
    returning 1
  )
  select count(*), array_agg(distinct order_id) into v_approved, v_order_ids from approved;

  -- Fase 8: cairkan escrow (hanya bila validasi admin valid; release_escrow
  -- memeriksa sendiri). Gagal satu order tidak menggagalkan yang lain.
  if v_order_ids is not null then
    foreach v_order_id in array v_order_ids loop
      begin
        v_release := public.release_escrow(v_order_id);
        if v_release ->> 'status' = 'released' then
          v_released := v_released + 1;
        end if;
      exception when others then
        raise warning 'auto_approve_orders: release_escrow % gagal: %', v_order_id, sqlerrm;
      end;
    end loop;
  end if;

  with upcoming as (
    select od.id, od.umkm_id
    from public.orders od
    where od.status in ('in_progress', 'revision')
      and od.review_deadline_at is not null
      and od.reminder_sent_at is null
      and od.review_deadline_at > now()
      and od.review_deadline_at <= now() + interval '24 hours'
    for update skip locked
  ),
  marked as (
    update public.orders od
       set reminder_sent_at = now()
      from upcoming u
     where od.id = u.id
    returning u.id, u.umkm_id
  ),
  notified as (
    insert into public.notifications (id, user_id, title, message, type, is_read)
    select
      private.notification_id(m.id, 'reminder_h1'),
      m.umkm_id,
      'Tenggat Review H-1',
      'Tenggat waktu review hasil pesanan tersisa kurang dari 24 jam.',
      'system',
      false
    from marked m
    on conflict (id) do nothing
    returning 1
  )
  select count(*) into v_reminders from marked;
  return jsonb_build_object('approvedCount', v_approved, 'releasedCount', v_released, 'reminderCount', v_reminders);
end;
$$;

comment on function private.auto_approve_orders() is
  'Job pg_cron: auto-approve deliverable lewat tenggat + release_escrow + pengingat H-1.';

-- -----------------------------------------------------------------------------
-- reconcile_release_escrow — job */15: escrow held/releasing yang syarat
-- release-nya sudah terpenuhi tapi belum cair (mis. validasi admin datang
-- setelah approve, data lama berstatus `releasing`) dicoba lagi. Aman karena
-- release_escrow idempoten.
-- -----------------------------------------------------------------------------
create or replace function private.reconcile_release_escrow()
returns jsonb
language plpgsql
volatile
security invoker
set search_path = ''
as $$
declare
  v_row record;
  v_result jsonb;
  v_released integer := 0;
  v_failed integer := 0;
begin
  for v_row in
    select e.order_id
    from public.escrows e
    join public.orders o on o.id = e.order_id
    where e.status in ('held', 'releasing')
      and o.status in ('in_progress', 'revision')
      and exists (
        select 1 from public.deliverables d
        join public.ratecard_deliverable_validations v on v.deliverable_id = d.id and v.status = 'valid'
        where d.order_id = e.order_id and d.status = 'approved'
      )
    order by e.created_at
    limit 200
  loop
    begin
      v_result := public.release_escrow(v_row.order_id);
      if v_result ->> 'status' = 'released' then
        v_released := v_released + 1;
      end if;
    exception when others then
      v_failed := v_failed + 1;
      raise warning 'reconcile_release_escrow: % gagal: %', v_row.order_id, sqlerrm;
    end;
  end loop;
  return jsonb_build_object('released', v_released, 'failed', v_failed);
end;
$$;

comment on function private.reconcile_release_escrow() is
  'Job pg_cron */15: coba ulang release_escrow untuk escrow yang syaratnya sudah terpenuhi.';

-- -----------------------------------------------------------------------------
-- fee_rate_flip_check — job harian (port fee-rate-flip): hitung ledger
-- completed; ≥ threshold → notifikasi semua admin aktif (sekali per hari).
-- TIDAK mengubah fee_rate (flip tetap manual, sama dengan Function lama).
-- -----------------------------------------------------------------------------
create or replace function private.fee_rate_flip_check()
returns jsonb
language plpgsql
volatile
security invoker
set search_path = ''
as $$
declare
  v_count bigint;
  v_threshold bigint := coalesce(
    (select (s.value #>> '{}')::bigint from private.finance_settings s where s.key = 'fee_flip_threshold'), 1000);
  v_rate numeric := private.finance_fee_rate();
  v_reached boolean;
begin
  select count(*) into v_count from public.transactions t where t.status = 'completed';
  v_reached := v_count >= v_threshold;
  if v_reached then
    insert into public.notifications (id, user_id, title, message, type, is_read)
    select private.notification_id('fee-rate-flip-' || to_char(now() at time zone 'UTC', 'YYYY-MM-DD') || ':' || u.id::text,
                                   'fee_rate_flip_alert'),
           u.id,
           'Fee Rate Flip Threshold Tercapai',
           format('Transaksi completed: %s (threshold: %s). Fee rate saat ini: %s%%. Ubah manual di private.finance_settings bila perlu.',
                  v_count, v_threshold, trim(to_char(v_rate * 100, 'FM990.##'))),
           'system', false
    from public.users u
    where u.role = 'admin' and u.status = 'active'
    on conflict (id) do nothing;
  end if;
  return jsonb_build_object('count', v_count, 'thresholdReached', v_reached, 'rate', v_rate);
end;
$$;

comment on function private.fee_rate_flip_check() is
  'Job pg_cron harian: pantau threshold transaksi completed untuk flip fee manual.';

-- -----------------------------------------------------------------------------
-- Hak akses.
-- -----------------------------------------------------------------------------
revoke all on function private.finance_fee_rate() from public, anon, authenticated;
revoke all on function private.escrow_fee_rate(numeric) from public, anon, authenticated;
revoke all on function private.rupiah(bigint) from public, anon, authenticated;
revoke all on function public.get_fee_rate() from public, anon, authenticated;
revoke all on function public.apply_payment_paid(text, text, bigint) from public, anon, authenticated;
revoke all on function public.release_escrow(text) from public, anon, authenticated;
revoke all on function public.refund_escrow(text, text) from public, anon, authenticated;
revoke all on function public.refund_campaign_budget(text) from public, anon, authenticated;
revoke all on function public.credit_campaign_reward(text) from public, anon, authenticated;
revoke all on function public.review_submission(uuid, text, text, text, boolean, bigint, numeric) from public, anon, authenticated;
revoke all on function public.approve_deliverable(text, uuid, text) from public, anon, authenticated;
revoke all on function private.auto_approve_orders() from public, anon, authenticated;
revoke all on function private.reconcile_release_escrow() from public, anon, authenticated;
revoke all on function private.fee_rate_flip_check() from public, anon, authenticated;

grant execute on function private.finance_fee_rate() to service_role;
grant execute on function private.escrow_fee_rate(numeric) to service_role;
grant execute on function private.rupiah(bigint) to service_role;
grant execute on function public.get_fee_rate() to service_role;
grant execute on function public.apply_payment_paid(text, text, bigint) to service_role;
grant execute on function public.release_escrow(text) to service_role;
grant execute on function public.refund_escrow(text, text) to service_role;
grant execute on function public.refund_campaign_budget(text) to service_role;
grant execute on function public.credit_campaign_reward(text) to service_role;
grant execute on function public.review_submission(uuid, text, text, text, boolean, bigint, numeric) to service_role;
grant execute on function public.approve_deliverable(text, uuid, text) to service_role;
grant execute on function private.auto_approve_orders() to service_role;
grant execute on function private.reconcile_release_escrow() to service_role;
grant execute on function private.fee_rate_flip_check() to service_role;

-- -----------------------------------------------------------------------------
-- pg_cron (idempoten per nama).
-- -----------------------------------------------------------------------------
create extension if not exists pg_cron with schema pg_catalog;
select cron.schedule('reconcile-release-escrow', '*/15 * * * *', $$select private.reconcile_release_escrow()$$);
select cron.schedule('fee-rate-flip', '0 0 * * *', $$select private.fee_rate_flip_check()$$);
