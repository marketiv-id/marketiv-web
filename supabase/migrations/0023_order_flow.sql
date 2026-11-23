-- =============================================================================
-- 0023_order_flow — alur order rate card (Fase 7).
--
-- Pengganti Function Appwrite + event trigger (dipanggil EKSPLISIT dari route):
--   * create_offer(...)          ← create-offer
--   * accept_offer(...)          ← update offer dari browser + event create-order
--   * reject_offer(...)          ← update offer dari browser + notifikasi create-order
--   * delete_offer(...)          ← delete offer dari browser
--   * cancel_order(...)          ← cancel-order
--   * submit_deliverable(...)    ← submit-ratecard-deliverable + track-order-review
--                                  + notify-order-activity (deliverable)
--   * request_revision(...)      ← request-ratecard-revision + sync-order-revision
--                                  + notify-order-activity (revisi)
--   * approve_deliverable(...)   ← update deliverables dari browser (STUB, tanpa uang)
--   * private.auto_approve_orders() + job pg_cron ← auto-approve-orders
--
-- Semua RPC publik: SECURITY INVOKER (dipanggil service_role dari Route Handler
-- yang sudah memverifikasi sesi + role), search_path kosong, EXECUTE hanya
-- service_role. Kepemilikan dicek di SQL dari argumen user sesi. Baris induk
-- dikunci `for update` sehingga dua request bersamaan diserialkan.
--
-- Kode error (dipetakan route lewat write-rpc.ts):
--   P0002 → 404, 42501 → 403, 22023 → 400, P0001 → 409.
--
-- UANG (Fase 8): approve/auto-approve hanya mengubah status. Pencairan escrow
-- (`release_escrow`) belum ada — lihat TODO(fase-08) di bawah.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Helper: batas revisi efektif sebuah order (port resolveRevisionLimit).
--   orders.revision_limit > 0 → itu; selain itu revisionLimit offer/paket
--   sumber (boleh 0); selain itu default 3.
-- -----------------------------------------------------------------------------
create or replace function private.order_revision_limit(p_order public.orders)
returns integer
language sql
stable
set search_path = ''
as $$
  select case
    when p_order.revision_limit > 0 then p_order.revision_limit
    else coalesce(
      (select o.revision_limit from public.offers o where o.id = p_order.offer_id),
      (select pk.revision_limit from public.rate_card_packages pk where pk.id = p_order.package_id),
      3
    )
  end;
$$;

revoke all on function private.order_revision_limit(public.orders) from public, anon, authenticated;
grant execute on function private.order_revision_limit(public.orders) to service_role;

-- -----------------------------------------------------------------------------
-- create_offer — Custom Offer UMKM di ruang negosiasi.
-- Peserta diambil dari percakapan (bukan body). Percakapan dikunci supaya dua
-- offer bersamaan tidak sama-sama lolos cek "masih ada offer pending".
-- -----------------------------------------------------------------------------
create or replace function public.create_offer(
  p_umkm_id uuid,
  p_conversation_id text,
  p_title text,
  p_description text,
  p_price bigint,
  p_deadline timestamptz,
  p_revision_limit integer,
  p_package_id text default null,
  p_creator_id uuid default null
)
returns jsonb
language plpgsql
volatile
security invoker
set search_path = ''
as $$
declare
  v_conv public.conversations;
  v_latest_offer public.offers;
  v_latest_order_status text;
  v_pkg_name text;
  v_pkg_price bigint;
  v_offer public.offers;
  v_summary text;
begin
  select * into v_conv from public.conversations c where c.id = p_conversation_id for update;
  if not found then
    raise exception 'Percakapan tidak ditemukan.' using errcode = 'P0002';
  end if;
  if v_conv.umkm_id <> p_umkm_id then
    raise exception 'Hanya UMKM dalam percakapan ini yang dapat mengirim penawaran.' using errcode = '42501';
  end if;
  if p_creator_id is not null and p_creator_id <> v_conv.creator_id then
    raise exception 'Kreator tidak sesuai dengan percakapan.' using errcode = '22023';
  end if;

  if exists (
    select 1 from public.offers o
    where o.conversation_id = p_conversation_id and o.status = 'pending'
  ) then
    raise exception 'Masih ada penawaran yang menunggu jawaban kreator. Tarik penawaran tersebut dulu sebelum mengirim yang baru.'
      using errcode = 'P0001';
  end if;

  -- Deal paralel: offer terbaru `accepted` tanpa order, atau order terbaru
  -- belum selesai/batal → tolak (sama dengan loadConversationDealState lama).
  select * into v_latest_offer
  from public.offers o
  where o.conversation_id = p_conversation_id
  order by o.created_at desc, o.id desc
  limit 1;

  select od.status into v_latest_order_status
  from public.orders od
  join public.offers o on o.id = od.offer_id
  where o.conversation_id = p_conversation_id
  order by od.created_at desc, od.id desc
  limit 1;

  if (v_latest_offer.status = 'accepted'
        and not exists (select 1 from public.orders od where od.offer_id = v_latest_offer.id))
     or (v_latest_order_status is not null and v_latest_order_status not in ('completed', 'cancelled')) then
    raise exception 'Masih ada kerja sama aktif dengan kreator ini. Selesaikan atau batalkan pesanan sebelumnya sebelum membuat penawaran baru.'
      using errcode = 'P0001';
  end if;

  -- Paket acuan opsional: harus nyata, milik kreator lawan bicara, dan rate
  -- card-nya masih published. Harga final tetap p_price (hasil negosiasi).
  if nullif(btrim(coalesce(p_package_id, '')), '') is not null then
    select pk.name, pk.price into v_pkg_name, v_pkg_price
    from public.rate_card_packages pk
    join public.rate_cards rc on rc.id = pk.rate_card_id
    where pk.id = p_package_id
      and rc.creator_id = v_conv.creator_id
      and rc.status = 'published';
    if not found then
      raise exception 'Paket acuan tidak valid, bukan milik kreator ini, atau tidak lagi dipublikasikan.'
        using errcode = '22023';
    end if;
  end if;

  insert into public.offers (
    conversation_id, umkm_id, creator_id, title, description, price, deadline, revision_limit,
    package_id, package_name_snapshot, package_price_snapshot, status
  )
  values (
    p_conversation_id, v_conv.umkm_id, v_conv.creator_id, p_title, nullif(p_description, ''),
    p_price, p_deadline, p_revision_limit,
    case when v_pkg_name is not null then p_package_id end,
    left(v_pkg_name, 100), v_pkg_price, 'pending'
  )
  returning * into v_offer;

  v_summary := left('Penawaran Khusus: ' || p_title, 2000);
  insert into public.messages (conversation_id, sender_id, message_type, content, offer_id)
  values (p_conversation_id, p_umkm_id, 'offer', v_summary, v_offer.id);

  update public.conversations c
     set last_message = left(v_summary, 1000),
         last_message_at = now(),
         offer_id = v_offer.id
   where c.id = p_conversation_id;

  return jsonb_build_object('offerId', v_offer.id);
end;
$$;

comment on function public.create_offer(uuid, text, text, text, bigint, timestamptz, integer, text, uuid) is
  'Buat Custom Offer + kartu chat (pengganti create-offer). Hanya service_role.';

-- -----------------------------------------------------------------------------
-- accept_offer — kreator menerima offer: status offer + order pending_payment
-- + pesan sistem + notifikasi UMKM dalam SATU transaksi. Idempoten: offer yang
-- sudah accepted mengembalikan order yang ada (unique orders.offer_id).
--
-- Deviasi dari create-order lama: syarat (UMKM aktif, kreator sudah setuju
-- ToS versi berjalan) dicek SEBELUM offer diterima. Dulu offer sudah
-- `accepted` lalu order gagal dibuat dan deal menggantung.
-- -----------------------------------------------------------------------------
create or replace function public.accept_offer(
  p_offer_id text,
  p_creator_id uuid,
  p_tos_version text
)
returns jsonb
language plpgsql
volatile
security invoker
set search_path = ''
as $$
declare
  v_offer public.offers;
  v_order public.orders;
  v_umkm public.users;
  v_creator public.users;
  v_text text;
begin
  select * into v_offer from public.offers o where o.id = p_offer_id for update;
  if not found then
    raise exception 'Penawaran tidak ditemukan.' using errcode = 'P0002';
  end if;
  if v_offer.creator_id <> p_creator_id then
    raise exception 'Hanya kreator penerima yang dapat menjawab penawaran ini.' using errcode = '42501';
  end if;

  if v_offer.status = 'accepted' then
    select * into v_order from public.orders od where od.offer_id = v_offer.id;
    if found then
      return jsonb_build_object('offerId', v_offer.id, 'orderId', v_order.id,
                                'status', v_order.status, 'alreadyAccepted', true);
    end if;
  elsif v_offer.status <> 'pending' then
    raise exception 'Penawaran ini sudah dijawab sebelumnya.' using errcode = 'P0001';
  end if;

  select * into v_umkm from public.users u where u.id = v_offer.umkm_id;
  if not found or v_umkm.status <> 'active' then
    raise exception 'Pesanan tidak dapat dibuat karena akun UMKM sedang tidak aktif.' using errcode = 'P0001';
  end if;
  select * into v_creator from public.users u where u.id = p_creator_id;
  if not found or v_creator.status <> 'active' then
    raise exception 'Akun kamu sedang tidak aktif.' using errcode = '42501';
  end if;
  if v_creator.tos_version is distinct from p_tos_version or v_creator.tos_accepted_at is null then
    raise exception 'Setujui Syarat & Ketentuan terbaru dulu sebelum menerima penawaran.' using errcode = 'P0001';
  end if;

  update public.offers o set status = 'accepted' where o.id = v_offer.id;

  insert into public.orders (
    offer_id, creator_id, umkm_id, package_id, package_name_snapshot, package_price_snapshot,
    amount, status, revision_limit
  )
  values (
    v_offer.id, v_offer.creator_id, v_offer.umkm_id, v_offer.package_id,
    v_offer.package_name_snapshot, v_offer.package_price_snapshot,
    v_offer.price, 'pending_payment', v_offer.revision_limit
  )
  on conflict (offer_id) do nothing
  returning * into v_order;
  if v_order.id is null then
    select * into v_order from public.orders od where od.offer_id = v_offer.id;
  end if;

  v_text := left(format('Penawaran "%s" diterima kreator. Menunggu pembayaran UMKM.', v_offer.title), 2000);
  insert into public.messages (conversation_id, sender_id, message_type, content, offer_id)
  values (v_offer.conversation_id, p_creator_id, 'system', v_text, v_offer.id);
  update public.conversations c
     set last_message = left(v_text, 1000), last_message_at = now()
   where c.id = v_offer.conversation_id;

  insert into public.notifications (id, user_id, title, message, type, is_read)
  values (
    private.notification_id(v_order.id, 'order_created'),
    v_offer.umkm_id,
    'Penawaran Diterima',
    left(format('Kreator menerima penawaran "%s". Selesaikan pembayaran agar pengerjaan bisa dimulai.', v_offer.title), 1000),
    'order_created',
    false
  )
  on conflict (id) do nothing;

  return jsonb_build_object('offerId', v_offer.id, 'orderId', v_order.id,
                            'status', v_order.status, 'alreadyAccepted', false);
end;
$$;

comment on function public.accept_offer(text, uuid, text) is
  'Terima offer → order pending_payment + pesan sistem + notifikasi (atomik, idempoten). Hanya service_role.';

-- -----------------------------------------------------------------------------
-- reject_offer — kreator menolak offer pending + notifikasi UMKM.
-- -----------------------------------------------------------------------------
create or replace function public.reject_offer(p_offer_id text, p_creator_id uuid)
returns jsonb
language plpgsql
volatile
security invoker
set search_path = ''
as $$
declare
  v_offer public.offers;
begin
  select * into v_offer from public.offers o where o.id = p_offer_id for update;
  if not found then
    raise exception 'Penawaran tidak ditemukan.' using errcode = 'P0002';
  end if;
  if v_offer.creator_id <> p_creator_id then
    raise exception 'Hanya kreator penerima yang dapat menjawab penawaran ini.' using errcode = '42501';
  end if;
  if v_offer.status = 'rejected' then
    return jsonb_build_object('offerId', v_offer.id, 'status', 'rejected', 'alreadyRejected', true);
  end if;
  if v_offer.status <> 'pending' then
    raise exception 'Penawaran ini sudah dijawab sebelumnya.' using errcode = 'P0001';
  end if;

  update public.offers o set status = 'rejected' where o.id = v_offer.id;

  insert into public.notifications (id, user_id, title, message, type, is_read)
  values (
    private.notification_id(v_offer.id, 'offer_rejected'),
    v_offer.umkm_id,
    'Penawaran Ditolak',
    left(format('Kreator menolak penawaran "%s". Kamu bisa menawar ulang di ruang negosiasi.', v_offer.title), 1000),
    'offer_rejected',
    false
  )
  on conflict (id) do nothing;

  return jsonb_build_object('offerId', v_offer.id, 'status', 'rejected', 'alreadyRejected', false);
end;
$$;

comment on function public.reject_offer(text, uuid) is
  'Tolak offer pending + notifikasi UMKM. Hanya service_role.';

-- -----------------------------------------------------------------------------
-- delete_offer — UMKM menarik offer yang belum dijawab. Baris dihapus
-- (messages.offer_id / conversations.offer_id → set null lewat FK).
-- -----------------------------------------------------------------------------
create or replace function public.delete_offer(p_offer_id text, p_umkm_id uuid)
returns boolean
language plpgsql
volatile
security invoker
set search_path = ''
as $$
declare
  v_offer public.offers;
begin
  select * into v_offer
  from public.offers o
  where o.id = p_offer_id and o.umkm_id = p_umkm_id
  for update;
  if not found then
    raise exception 'Penawaran tidak ditemukan.' using errcode = 'P0002';
  end if;
  if v_offer.status <> 'pending' then
    raise exception 'Hanya penawaran yang belum direspons yang bisa dihapus.' using errcode = 'P0001';
  end if;
  delete from public.offers o where o.id = v_offer.id;
  return true;
end;
$$;

comment on function public.delete_offer(text, uuid) is
  'Tarik offer pending milik UMKM. Hanya service_role.';

-- -----------------------------------------------------------------------------
-- cancel_order — UMKM membatalkan order yang BELUM dibayar (pending_payment).
-- Tidak ada uang yang bergerak di status ini. Payment pending yang menyertai
-- dibatalkan lewat cancel-payment (Fase 8).
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
begin
  select * into v_order from public.orders od where od.id = p_order_id for update;
  if not found then
    raise exception 'Order tidak ditemukan' using errcode = 'P0002';
  end if;
  if v_order.umkm_id <> p_umkm_id then
    raise exception 'Order bukan milik user ini' using errcode = '42501';
  end if;
  if v_order.status = 'cancelled' then
    return jsonb_build_object('ok', true, 'status', 'already_cancelled');
  end if;
  if v_order.status <> 'pending_payment' then
    raise exception 'Order status tidak dapat dibatalkan: %', v_order.status using errcode = 'P0001';
  end if;
  update public.orders od set status = 'cancelled' where od.id = v_order.id;
  return jsonb_build_object('ok', true, 'status', 'cancelled');
end;
$$;

comment on function public.cancel_order(text, uuid) is
  'Batalkan order pending_payment milik UMKM. Hanya service_role.';

-- -----------------------------------------------------------------------------
-- submit_deliverable — kreator mengirim hasil kerja (baris BARU, version + 1).
-- Sekaligus: tenggat review 3 hari (track-order-review), order revision →
-- in_progress, dan notifikasi UMKM (notify-order-activity).
--
-- source 'storage': p_file_id = baris user_files milik kreator, aktif. Bila
-- belum dibagikan, dibagikan ke order ini (pengganti Permission.read UMKM).
-- file_url = route stabil `/api/files/<id>/url?redirect=1` (diisi route).
-- -----------------------------------------------------------------------------
create or replace function public.submit_deliverable(
  p_order_id text,
  p_creator_id uuid,
  p_source text,
  p_file_url text,
  p_file_id text default null,
  p_notes text default null
)
returns jsonb
language plpgsql
volatile
security invoker
set search_path = ''
as $$
declare
  v_order public.orders;
  v_file public.user_files;
  v_version integer;
  v_deliverable public.deliverables;
begin
  if p_source not in ('external_url', 'storage') then
    raise exception 'Sumber deliverable tidak valid.' using errcode = '22023';
  end if;

  select * into v_order from public.orders od where od.id = p_order_id for update;
  if not found then
    raise exception 'Pesanan tidak ditemukan.' using errcode = 'P0002';
  end if;
  if v_order.creator_id <> p_creator_id then
    raise exception 'Hanya kreator pengerja yang dapat mengirim deliverable.' using errcode = '42501';
  end if;
  if v_order.status not in ('in_progress', 'revision') then
    raise exception 'Deliverable hanya bisa dikirim saat pesanan sedang dikerjakan atau direvisi.' using errcode = 'P0001';
  end if;

  if p_source = 'storage' then
    select * into v_file from public.user_files f where f.id = p_file_id for update;
    if not found then
      raise exception 'Berkas tidak ditemukan.' using errcode = 'P0002';
    end if;
    if v_file.user_id <> p_creator_id then
      raise exception 'Berkas harus milik kreator yang sedang login.' using errcode = '42501';
    end if;
    if v_file.status <> 'active' then
      raise exception 'Berkas sudah tidak aktif.' using errcode = 'P0001';
    end if;
    if v_file.shared_with_order_id is null then
      update public.user_files f set shared_with_order_id = v_order.id where f.id = v_file.id;
    elsif v_file.shared_with_order_id <> v_order.id then
      raise exception 'Berkas sudah dibagikan ke pesanan lain. Unggah ulang berkasnya.' using errcode = 'P0001';
    end if;
  end if;

  select coalesce(max(d.version), 0) + 1 into v_version
  from public.deliverables d
  where d.order_id = v_order.id;

  insert into public.deliverables (order_id, source, file_url, file_id, notes, version, status)
  values (
    v_order.id, p_source, p_file_url,
    case when p_source = 'storage' then p_file_id end,
    nullif(p_notes, ''), v_version, 'submitted'
  )
  returning * into v_deliverable;

  update public.orders od
     set status = 'in_progress',
         review_deadline_at = v_deliverable.created_at + interval '3 days',
         revision_count = greatest(od.revision_count, v_version - 1),
         revision_limit = private.order_revision_limit(v_order),
         reminder_sent_at = null
   where od.id = v_order.id;

  insert into public.notifications (id, user_id, title, message, type, is_read)
  values (
    private.notification_id(v_deliverable.id, 'deliverable_submitted'),
    v_order.umkm_id,
    'Hasil Kerja Masuk',
    format('Kreator mengirim hasil kerja versi %s. Buka ruang negosiasi untuk meninjau dan menyetujuinya.', v_version),
    'deliverable_submitted',
    false
  )
  on conflict (id) do nothing;

  return to_jsonb(v_deliverable);
end;
$$;

comment on function public.submit_deliverable(text, uuid, text, text, text, text) is
  'Kirim deliverable (version+1) + tenggat review + notifikasi UMKM (atomik). Hanya service_role.';

-- -----------------------------------------------------------------------------
-- request_revision — UMKM meminta revisi atas deliverable TERBARU.
-- Idempoten per deliverable terbaru: bila sudah `revision_requested`, revisi
-- terbuka yang ada dikembalikan (dulu: ID deterministik order:deliverable).
-- -----------------------------------------------------------------------------
create or replace function public.request_revision(
  p_order_id text,
  p_umkm_id uuid,
  p_message text
)
returns jsonb
language plpgsql
volatile
security invoker
set search_path = ''
as $$
declare
  v_order public.orders;
  v_latest public.deliverables;
  v_revision public.revisions;
  v_limit integer;
  v_count integer;
  v_message text := btrim(coalesce(p_message, ''));
begin
  if v_message = '' then
    raise exception 'Alasan revisi wajib diisi.' using errcode = '22023';
  end if;
  if char_length(v_message) > 2000 then
    raise exception 'Alasan revisi maksimal 2000 karakter.' using errcode = '22023';
  end if;

  select * into v_order from public.orders od where od.id = p_order_id for update;
  if not found or v_order.umkm_id <> p_umkm_id then
    raise exception 'Pesanan tidak ditemukan.' using errcode = 'P0002';
  end if;
  if v_order.status not in ('in_progress', 'revision') then
    raise exception 'Pesanan tidak dalam status yang dapat direvisi.' using errcode = 'P0001';
  end if;

  select * into v_latest
  from public.deliverables d
  where d.order_id = v_order.id
  order by d.version desc, d.created_at desc, d.id desc
  limit 1
  for update;
  if not found then
    raise exception 'Deliverable terbaru belum siap untuk diminta revisi.' using errcode = 'P0001';
  end if;

  if v_latest.status = 'revision_requested' then
    select * into v_revision
    from public.revisions r
    where r.order_id = v_order.id and r.requested_by = p_umkm_id and r.created_at >= v_latest.created_at
    order by r.created_at desc
    limit 1;
    if found then
      return to_jsonb(v_revision);
    end if;
  end if;
  if v_latest.status <> 'submitted' then
    raise exception 'Deliverable terbaru belum siap untuk diminta revisi.' using errcode = 'P0001';
  end if;

  v_limit := private.order_revision_limit(v_order);
  select count(*)::integer into v_count from public.revisions r where r.order_id = v_order.id;
  if v_count >= v_limit then
    raise exception 'Batas revisi (%) sudah tercapai. Setujui apa adanya atau buka sengketa.', v_limit
      using errcode = 'P0001';
  end if;

  insert into public.revisions (order_id, requested_by, message, status)
  values (v_order.id, p_umkm_id, v_message, 'open')
  returning * into v_revision;

  update public.deliverables d set status = 'revision_requested' where d.id = v_latest.id;
  update public.orders od
     set status = 'revision',
         review_deadline_at = null,
         reminder_sent_at = null
   where od.id = v_order.id;

  insert into public.notifications (id, user_id, title, message, type, is_read)
  values (
    private.notification_id(v_revision.id, 'revision_requested'),
    v_order.creator_id,
    'UMKM Minta Revisi',
    left('"' || v_message || '"', 900),
    'revision_requested',
    false
  )
  on conflict (id) do nothing;

  return to_jsonb(v_revision);
end;
$$;

comment on function public.request_revision(text, uuid, text) is
  'Minta revisi deliverable terbaru (batas revisi, idempoten) + notifikasi kreator. Hanya service_role.';

-- -----------------------------------------------------------------------------
-- approve_deliverable — UMKM menyetujui deliverable. STUB FASE 7: hanya status.
-- TODO(fase-08): panggil release_escrow (butuh validasi Admin `valid`) yang
-- memindahkan dana ke wallet kreator dan menandai order `completed`.
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
begin
  select * into v_deliverable from public.deliverables d where d.id = p_deliverable_id for update;
  if not found then
    raise exception 'Deliverable tidak ditemukan.' using errcode = 'P0002';
  end if;
  select * into v_order from public.orders od where od.id = v_deliverable.order_id for update;
  if not found or v_order.umkm_id <> p_umkm_id then
    raise exception 'Pesanan tidak ditemukan.' using errcode = 'P0002';
  end if;
  if p_order_id is not null and p_order_id <> v_order.id then
    raise exception 'Deliverable tidak sesuai dengan pesanan.' using errcode = '22023';
  end if;
  if v_deliverable.status = 'approved' then
    raise exception 'Deliverable ini sudah disetujui.' using errcode = 'P0001';
  end if;

  update public.deliverables d set status = 'approved' where d.id = v_deliverable.id;
  update public.orders od
     set review_deadline_at = null,
         reminder_sent_at = null
   where od.id = v_order.id;

  return jsonb_build_object('ok', true, 'deliverableId', v_deliverable.id,
                            'orderId', v_order.id, 'status', 'approved');
end;
$$;

comment on function public.approve_deliverable(text, uuid, text) is
  'STUB Fase 7: setujui deliverable (status saja, belum release escrow). Hanya service_role.';

-- -----------------------------------------------------------------------------
-- private.auto_approve_orders — job pg_cron tiap jam.
--   1. Deliverable submitted/delivered pada order in_progress/revision yang
--      tenggat review-nya lewat → approved, order.auto_approved = true,
--      notifikasi UMKM. TODO(fase-08): release escrow.
--   2. Pengingat H-1: order dengan tenggat dalam 24 jam ke depan dan belum
--      diingatkan → reminder_sent_at + notifikasi UMKM.
-- Schema `private` tidak diekspos Data API.
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
  select count(*) into v_approved from approved;

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

  -- TODO(fase-08): release escrow untuk deliverable yang baru auto-approved.
  return jsonb_build_object('approvedCount', v_approved, 'reminderCount', v_reminders);
end;
$$;

comment on function private.auto_approve_orders() is
  'Job pg_cron: auto-approve deliverable lewat tenggat + pengingat H-1 (tanpa uang, Fase 8).';

revoke all on function private.auto_approve_orders() from public, anon, authenticated;
grant execute on function private.auto_approve_orders() to service_role;

-- -----------------------------------------------------------------------------
-- pg_cron: tiap jam. cron.schedule meng-upsert berdasarkan nama job.
-- -----------------------------------------------------------------------------
create extension if not exists pg_cron with schema pg_catalog;

select cron.schedule('auto-approve-orders', '0 * * * *', $$select private.auto_approve_orders()$$);

-- -----------------------------------------------------------------------------
-- Hak akses RPC publik: hanya service_role.
-- -----------------------------------------------------------------------------
revoke all on function public.create_offer(uuid, text, text, text, bigint, timestamptz, integer, text, uuid)
  from public, anon, authenticated;
revoke all on function public.accept_offer(text, uuid, text) from public, anon, authenticated;
revoke all on function public.reject_offer(text, uuid) from public, anon, authenticated;
revoke all on function public.delete_offer(text, uuid) from public, anon, authenticated;
revoke all on function public.cancel_order(text, uuid) from public, anon, authenticated;
revoke all on function public.submit_deliverable(text, uuid, text, text, text, text) from public, anon, authenticated;
revoke all on function public.request_revision(text, uuid, text) from public, anon, authenticated;
revoke all on function public.approve_deliverable(text, uuid, text) from public, anon, authenticated;

grant execute on function public.create_offer(uuid, text, text, text, bigint, timestamptz, integer, text, uuid)
  to service_role;
grant execute on function public.accept_offer(text, uuid, text) to service_role;
grant execute on function public.reject_offer(text, uuid) to service_role;
grant execute on function public.delete_offer(text, uuid) to service_role;
grant execute on function public.cancel_order(text, uuid) to service_role;
grant execute on function public.submit_deliverable(text, uuid, text, text, text, text) to service_role;
grant execute on function public.request_revision(text, uuid, text) to service_role;
grant execute on function public.approve_deliverable(text, uuid, text) to service_role;
