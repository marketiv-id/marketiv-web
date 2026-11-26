-- =============================================================================
-- 0027_payments — pembayaran Midtrans (Fase 8). Pengganti Function
-- `create-payment`, `cancel-payment`, dan bagian status `midtrans-webhook`.
--
--   create_payment(...)          : payment `pending` idempoten (order: unique
--                                  order_payment_key; order & campaign: payment
--                                  pending yang ada dipakai ulang)
--   attach_payment_gateway(...)  : simpan snap_token / redirect_url
--   cancel_payment(...)          : pending → cancelled (pemilik)
--   mark_payment_status(...)     : pending → failed/expired/cancelled (webhook)
--   record_payment_event(...)    : anomali setelah/di luar alur normal (refund,
--                                  chargeback, settlement terlambat, nominal
--                                  salah, cancel gateway gagal) → payment_events
--                                  + notifikasi alert ke semua admin aktif
--   cancel_order(...)            : (ganti 0023) juga membatalkan payment
--                                  pending order itu dalam transaksi yang sama
--
-- Efek PAID (escrow / top-up / ledger) BUKAN di sini: webhook memanggil
-- `public.apply_payment_paid` (0026).
--
-- Semua: SECURITY DEFINER, search_path = '', EXECUTE hanya service_role,
-- transisi status bersyarat (`update … where status = 'pending'`).
-- Urutan kunci mengikuti 0025: campaigns → orders → payments.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- payment_events — catatan anomali pembayaran (tidak pernah diabaikan diam-diam).
-- -----------------------------------------------------------------------------
create table if not exists public.payment_events (
  id text primary key default gen_random_uuid()::text,
  payment_id text references public.payments (id) on delete restrict,
  gateway_reference text not null check (char_length(gateway_reference) <= 255),
  kind text not null check (kind in (
    'refund', 'chargeback', 'late_settlement', 'amount_mismatch', 'cancel_failed', 'unknown_status'
  )),
  transaction_status text not null check (char_length(transaction_status) <= 50),
  status_code text check (char_length(status_code) <= 10),
  gross_amount bigint,
  fraud_status text check (char_length(fraud_status) <= 50),
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- Midtrans mengirim ulang notifikasi yang sama: satu event (dan satu alert)
-- per payment × jenis × status gateway.
create unique index if not exists payment_events_dedup_key
  on public.payment_events (gateway_reference, kind, transaction_status);
create index if not exists payment_events_payment_id_idx on public.payment_events (payment_id);

alter table public.payment_events enable row level security;

drop policy if exists payment_events_select_admin on public.payment_events;
create policy payment_events_select_admin on public.payment_events
  for select to authenticated
  using ((select private.is_admin()));

revoke insert, update, delete, truncate on public.payment_events from anon, authenticated;
revoke select on public.payment_events from anon;

comment on table public.payment_events is
  'Anomali pembayaran Midtrans (refund/chargeback setelah paid, settlement terlambat, nominal salah, dst). Ditulis webhook; memicu alert admin.';

-- -----------------------------------------------------------------------------
-- Bentuk respons payment yang dipakai route.
-- -----------------------------------------------------------------------------
create or replace function private.payment_json(p public.payments, p_reused boolean)
returns jsonb
language sql
immutable
set search_path = ''
as $$
  select jsonb_build_object(
    'paymentId', p.id,
    'purpose', p.purpose,
    'status', p.status,
    'gatewayReference', p.gateway_reference,
    'amount', p.amount,
    'feeAmount', p.fee_amount,
    'totalAmount', p.total_amount,
    'orderId', p.order_id,
    'campaignId', p.campaign_id,
    'snapToken', p.snap_token,
    'redirectUrl', p.redirect_url,
    'reused', p_reused
  );
$$;

-- -----------------------------------------------------------------------------
-- create_payment — port create-payment (validasi + baris payment pending).
--
-- order    : order milik user, status pending_payment, nominal = order.amount;
--            payment paid → 409 (hint payment_already_paid); payment pending →
--            dipakai ulang. Unique order_payment_key mengunci satu payment aktif.
-- campaign : campaign milik user, status draft, nominal = budget; fee =
--            floor(amount × p_fee_rate); payment pending yang ada dipakai ulang.
-- -----------------------------------------------------------------------------
create or replace function public.create_payment(
  p_user_id uuid,
  p_purpose text,
  p_amount bigint,
  p_order_id text default null,
  p_campaign_id text default null,
  p_fee_rate numeric default 0.02
)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_user public.users;
  v_order public.orders;
  v_campaign public.campaigns;
  v_existing public.payments;
  v_payment public.payments;
  v_id text := gen_random_uuid()::text;
  v_fee bigint := 0;
begin
  if p_purpose is null or p_purpose not in ('order', 'campaign') then
    raise exception 'Tujuan pembayaran tidak valid.' using errcode = '22023';
  end if;
  if p_amount is null or p_amount <= 0 then
    raise exception 'Nominal pembayaran tidak valid.' using errcode = '22023';
  end if;
  if p_fee_rate is null or p_fee_rate < 0 or p_fee_rate > 1 then
    raise exception 'create_payment: fee rate tidak valid' using errcode = '22023';
  end if;
  if p_purpose = 'order' and (p_order_id is null or p_campaign_id is not null) then
    raise exception 'orderId wajib untuk pembayaran order.' using errcode = '22023';
  end if;
  if p_purpose = 'campaign' and (p_campaign_id is null or p_order_id is not null) then
    raise exception 'campaignId wajib untuk pembayaran campaign.' using errcode = '22023';
  end if;

  select * into v_user from public.users u where u.id = p_user_id;
  if not found or v_user.status <> 'active' then
    raise exception 'Akun Anda sedang tidak aktif.' using errcode = '42501';
  end if;

  if p_purpose = 'campaign' then
    select * into v_campaign from public.campaigns c where c.id = p_campaign_id for update;
    if not found then
      raise exception 'Campaign tidak ditemukan.' using errcode = 'P0002';
    end if;
    if v_campaign.umkm_id <> p_user_id then
      raise exception 'Campaign bukan milik akun ini.' using errcode = '42501';
    end if;
    if v_campaign.status <> 'draft' then
      raise exception 'Hanya campaign draft yang bisa didanai.' using errcode = 'P0001';
    end if;
    if v_campaign.budget <> p_amount then
      raise exception 'Nominal pembayaran tidak sama dengan budget campaign.' using errcode = 'P0001';
    end if;

    select * into v_existing
    from public.payments p
    where p.campaign_id = p_campaign_id and p.purpose = 'campaign' and p.status = 'pending'
      and p.amount = p_amount
    order by p.created_at desc, p.id desc
    limit 1;
    if found then
      return private.payment_json(v_existing, true);
    end if;

    v_fee := floor(p_amount * p_fee_rate)::bigint;
  else
    select * into v_order from public.orders o where o.id = p_order_id for update;
    if not found then
      raise exception 'Order tidak ditemukan.' using errcode = 'P0002';
    end if;
    if v_order.umkm_id <> p_user_id then
      raise exception 'Order bukan milik akun ini.' using errcode = '42501';
    end if;
    if v_order.amount <> p_amount then
      raise exception 'Nominal pembayaran tidak sama dengan nilai order.' using errcode = 'P0001';
    end if;

    select * into v_existing
    from public.payments p
    where p.order_id = p_order_id and p.purpose = 'order' and p.status in ('pending', 'paid')
    order by (p.status = 'paid') desc, p.created_at desc, p.id desc
    limit 1;
    if found and v_existing.status = 'paid' then
      raise exception 'Order ini sudah dibayar.'
        using errcode = 'P0001', hint = 'payment_already_paid:' || v_existing.id;
    end if;
    if found then
      return private.payment_json(v_existing, true);
    end if;
    if v_order.status <> 'pending_payment' then
      raise exception 'Order tidak sedang menunggu pembayaran.' using errcode = 'P0001';
    end if;
  end if;

  insert into public.payments (
    id, user_id, order_id, campaign_id, order_payment_key,
    amount, fee_amount, total_amount, purpose, gateway, gateway_reference, status
  )
  values (
    v_id, p_user_id,
    case when p_purpose = 'order' then p_order_id end,
    case when p_purpose = 'campaign' then p_campaign_id end,
    case when p_purpose = 'order' then 'order:' || p_order_id end,
    p_amount, v_fee, p_amount + v_fee, p_purpose, 'midtrans',
    (case when p_purpose = 'order' then 'ord-' else 'cmp-' end) || v_id,
    'pending'
  )
  returning * into v_payment;

  return private.payment_json(v_payment, false);
end;
$$;

comment on function public.create_payment(uuid, text, bigint, text, text, numeric) is
  'Payment pending idempoten untuk order/campaign milik user (pengganti create-payment). Hanya service_role.';

-- -----------------------------------------------------------------------------
-- attach_payment_gateway — simpan hasil Snap ke payment yang masih pending.
-- -----------------------------------------------------------------------------
create or replace function public.attach_payment_gateway(
  p_payment_id text,
  p_snap_token text,
  p_redirect_url text
)
returns boolean
language plpgsql
volatile
security definer
set search_path = ''
as $$
begin
  update public.payments p
     set snap_token = left(p_snap_token, 255),
         redirect_url = left(p_redirect_url, 2048)
   where p.id = p_payment_id and p.status = 'pending';
  return found;
end;
$$;

-- -----------------------------------------------------------------------------
-- cancel_payment — pemilik membatalkan payment pending.
--
-- Payment ORDER hanya boleh dibatalkan setelah gateway mengonfirmasi cancel
-- (`p_gateway_confirmed`): kalau tidak, Snap lama masih bisa dibayar padahal
-- kunci order sudah dilepas (perilaku cancel-payment lama).
-- -----------------------------------------------------------------------------
create or replace function public.cancel_payment(
  p_payment_id text,
  p_user_id uuid,
  p_gateway_confirmed boolean default false
)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_payment public.payments;
begin
  select * into v_payment from public.payments p where p.id = p_payment_id for update;
  if not found then
    raise exception 'Payment tidak ditemukan.' using errcode = 'P0002';
  end if;
  if v_payment.user_id <> p_user_id then
    raise exception 'Payment bukan milik akun ini.' using errcode = '42501';
  end if;
  if v_payment.status = 'cancelled' then
    return jsonb_build_object('ok', true, 'paymentId', v_payment.id, 'status', 'cancelled', 'alreadyCancelled', true);
  end if;
  if v_payment.status <> 'pending' then
    raise exception 'Hanya payment pending yang bisa dibatalkan (saat ini: %).', v_payment.status
      using errcode = 'P0001';
  end if;
  if v_payment.purpose = 'order' and not coalesce(p_gateway_confirmed, false) then
    raise exception 'Payment order masih aktif di gateway. Tunggu status Midtrans terkonfirmasi.'
      using errcode = 'P0001', hint = 'gateway_cancellation_required';
  end if;

  update public.payments p
     set status = 'cancelled',
         order_payment_key = null
   where p.id = v_payment.id and p.status = 'pending';

  return jsonb_build_object('ok', true, 'paymentId', v_payment.id, 'status', 'cancelled', 'alreadyCancelled', false);
end;
$$;

-- -----------------------------------------------------------------------------
-- mark_payment_status — status terminal non-paid dari webhook.
-- Hanya dari `pending`; terminal lain dibiarkan (idempoten). Payment order
-- melepas order_payment_key supaya UMKM bisa membayar ulang.
-- -----------------------------------------------------------------------------
create or replace function public.mark_payment_status(
  p_payment_id text,
  p_status text
)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_payment public.payments;
begin
  if p_status is null or p_status not in ('failed', 'expired', 'cancelled') then
    raise exception 'mark_payment_status: status tidak valid' using errcode = '22023';
  end if;

  update public.payments p
     set status = p_status,
         order_payment_key = null
   where p.id = p_payment_id and p.status = 'pending'
  returning * into v_payment;

  if found then
    return jsonb_build_object('changed', true, 'paymentId', v_payment.id, 'status', v_payment.status);
  end if;

  select * into v_payment from public.payments p where p.id = p_payment_id;
  if not found then
    raise exception 'Payment tidak ditemukan.' using errcode = 'P0002';
  end if;
  return jsonb_build_object('changed', false, 'paymentId', v_payment.id, 'status', v_payment.status);
end;
$$;

-- -----------------------------------------------------------------------------
-- record_payment_event — catat anomali + alert admin (idempoten per
-- gateway_reference × kind × transaction_status).
-- -----------------------------------------------------------------------------
create or replace function public.record_payment_event(
  p_gateway_reference text,
  p_kind text,
  p_transaction_status text,
  p_status_code text default null,
  p_gross_amount bigint default null,
  p_fraud_status text default null,
  p_payload jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_payment_id text;
  v_event_id text;
  v_title text;
begin
  select p.id into v_payment_id from public.payments p where p.gateway_reference = p_gateway_reference;

  insert into public.payment_events (
    payment_id, gateway_reference, kind, transaction_status, status_code, gross_amount, fraud_status, payload
  )
  values (
    v_payment_id, left(p_gateway_reference, 255), p_kind, left(coalesce(p_transaction_status, ''), 50),
    left(p_status_code, 10), p_gross_amount, left(p_fraud_status, 50), coalesce(p_payload, '{}'::jsonb)
  )
  on conflict (gateway_reference, kind, transaction_status) do nothing
  returning id into v_event_id;

  if v_event_id is null then
    return jsonb_build_object('recorded', false, 'paymentId', v_payment_id);
  end if;

  v_title := case p_kind
    when 'refund' then 'Refund Midtrans setelah dibayar'
    when 'chargeback' then 'Chargeback Midtrans'
    when 'late_settlement' then 'Pembayaran masuk setelah payment ditutup'
    when 'amount_mismatch' then 'Nominal notifikasi Midtrans tidak cocok'
    when 'cancel_failed' then 'Cancel transaksi Midtrans gagal'
    else 'Status Midtrans tidak dikenal'
  end;

  insert into public.notifications (id, user_id, title, message, type, is_read)
  select
    private.notification_id(v_event_id, 'payment_alert:' || u.id::text),
    u.id,
    v_title,
    left(format('Perlu tindakan manual. Referensi %s, status gateway "%s", nominal %s.',
      p_gateway_reference, p_transaction_status, coalesce(p_gross_amount::text, '-')), 1000),
    'system',
    false
  from public.users u
  where u.role = 'admin' and u.status = 'active'
  on conflict (id) do nothing;

  return jsonb_build_object('recorded', true, 'eventId', v_event_id, 'paymentId', v_payment_id);
end;
$$;

-- -----------------------------------------------------------------------------
-- cancel_order (ganti 0023) — juga membatalkan payment pending order itu dalam
-- transaksi yang sama (dulu stub Fase 7). Referensi gateway yang dibatalkan
-- dikembalikan supaya route bisa meminta cancel ke Midtrans.
-- -----------------------------------------------------------------------------
create or replace function public.cancel_order(p_order_id text, p_umkm_id uuid)
returns jsonb
language plpgsql
volatile
security invoker
set search_path = ''
as $$
declare
  v_order public.orders;
  v_refs jsonb;
begin
  select * into v_order from public.orders od where od.id = p_order_id for update;
  if not found then
    raise exception 'Order tidak ditemukan' using errcode = 'P0002';
  end if;
  if v_order.umkm_id <> p_umkm_id then
    raise exception 'Order bukan milik user ini' using errcode = '42501';
  end if;
  if v_order.status = 'cancelled' then
    return jsonb_build_object('ok', true, 'status', 'already_cancelled', 'cancelledPayments', '[]'::jsonb);
  end if;
  if v_order.status <> 'pending_payment' then
    raise exception 'Order status tidak dapat dibatalkan: %', v_order.status using errcode = 'P0001';
  end if;

  update public.orders od set status = 'cancelled' where od.id = v_order.id;

  with cancelled as (
    update public.payments p
       set status = 'cancelled',
           order_payment_key = null
     where p.order_id = v_order.id and p.purpose = 'order' and p.status = 'pending'
    returning p.gateway_reference
  )
  select coalesce(jsonb_agg(c.gateway_reference), '[]'::jsonb) into v_refs from cancelled c;

  return jsonb_build_object('ok', true, 'status', 'cancelled', 'cancelledPayments', v_refs);
end;
$$;

comment on function public.cancel_order(text, uuid) is
  'Batalkan order pending_payment milik UMKM + payment pending-nya (atomik). Hanya service_role.';

-- -----------------------------------------------------------------------------
-- Hak akses: hanya service_role.
-- -----------------------------------------------------------------------------
revoke all on function private.payment_json(public.payments, boolean) from public, anon, authenticated;
revoke all on function public.create_payment(uuid, text, bigint, text, text, numeric) from public, anon, authenticated;
revoke all on function public.attach_payment_gateway(text, text, text) from public, anon, authenticated;
revoke all on function public.cancel_payment(text, uuid, boolean) from public, anon, authenticated;
revoke all on function public.mark_payment_status(text, text) from public, anon, authenticated;
revoke all on function public.record_payment_event(text, text, text, text, bigint, text, jsonb) from public, anon, authenticated;
revoke all on function public.cancel_order(text, uuid) from public, anon, authenticated;

grant execute on function private.payment_json(public.payments, boolean) to service_role;
grant execute on function public.create_payment(uuid, text, bigint, text, text, numeric) to service_role;
grant execute on function public.attach_payment_gateway(text, text, text) to service_role;
grant execute on function public.cancel_payment(text, uuid, boolean) to service_role;
grant execute on function public.mark_payment_status(text, text) to service_role;
grant execute on function public.record_payment_event(text, text, text, text, bigint, text, jsonb) to service_role;
grant execute on function public.cancel_order(text, uuid) to service_role;
