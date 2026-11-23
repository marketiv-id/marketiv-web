-- =============================================================================
-- 0020_creator_writes — RPC tulis rate card kreator (Fase 6).
--
-- Model lama: 1 baris `rate_cards` per paket UI (1:1). Status ada di parent,
-- judul parent = nama paket. Dulu ditulis dua langkah dari browser (parent lalu
-- anak, dengan rollback manual bila anak gagal). Di sini satu transaksi.
--
--   * creator_create_rate_card(...)          : parent + paket, batas 3 per kreator
--   * creator_update_rate_card_package(...)  : paket in-place + mirror judul/status
--   * creator_delete_rate_card(...)          : paket/parent, tolak bila ada order berjalan
--
-- Semua SECURITY INVOKER (dipanggil service_role dari Route Handler yang sudah
-- memverifikasi sesi kreator; service_role melewati RLS), search_path kosong,
-- EXECUTE hanya service_role. Kepemilikan: p_creator_id = userId sesi.
--
-- Error aturan bisnis = `raise exception` tanpa errcode (P0001) → route
-- memetakannya ke 409 dengan pesan apa adanya. "Tidak ditemukan / bukan
-- milik" dikembalikan sebagai NULL (route memutuskan statusnya).
-- =============================================================================

-- -----------------------------------------------------------------------------
-- creator_create_rate_card — buat parent + satu paket. Maksimal 3 rate card per
-- kreator; dua request bersamaan diserialkan dengan row lock baris users
-- kreator, jadi batas tidak bisa dilewati lewat race.
-- -----------------------------------------------------------------------------
create or replace function public.creator_create_rate_card(
  p_creator_id uuid,
  p_name text,
  p_description text,
  p_output text,
  p_delivery_days integer,
  p_price bigint,
  p_revision_limit integer,
  p_status text
)
returns jsonb
language plpgsql
volatile
security invoker
set search_path = ''
as $$
declare
  v_card public.rate_cards;
  v_package public.rate_card_packages;
begin
  if p_status not in ('draft', 'published') then
    raise exception 'creator_create_rate_card: status tidak valid' using errcode = '22023';
  end if;

  perform 1 from public.users u where u.id = p_creator_id for update;
  if not found then
    raise exception 'creator_create_rate_card: kreator tidak ditemukan' using errcode = '22023';
  end if;

  if (select count(*) from public.rate_cards rc where rc.creator_id = p_creator_id) >= 3 then
    raise exception 'Maksimal 3 paket. Hapus satu paket dulu.';
  end if;

  insert into public.rate_cards (creator_id, title, description, status)
  values (p_creator_id, p_name, p_description, p_status)
  returning * into v_card;

  insert into public.rate_card_packages (
    rate_card_id, name, description, output, delivery_days, price, revision_limit
  )
  values (v_card.id, p_name, p_description, p_output, p_delivery_days, p_price, p_revision_limit)
  returning * into v_package;

  return jsonb_build_object('rate_card', to_jsonb(v_card), 'package', to_jsonb(v_package));
end;
$$;

comment on function public.creator_create_rate_card(uuid, text, text, text, integer, bigint, integer, text) is
  'Buat rate card + paket (atomik, maks 3 per kreator). Hanya service_role.';

-- -----------------------------------------------------------------------------
-- creator_update_rate_card_package — update paket in-place (JANGAN
-- delete-recreate: orders.package_id harus stabil) lalu mirror judul + status
-- ke parent. p_status null = status parent tidak diubah.
-- NULL bila rate card bukan milik kreator / paket bukan anak rate card itu.
-- -----------------------------------------------------------------------------
create or replace function public.creator_update_rate_card_package(
  p_creator_id uuid,
  p_rate_card_id text,
  p_package_id text,
  p_name text,
  p_description text,
  p_output text,
  p_delivery_days integer,
  p_price bigint,
  p_revision_limit integer,
  p_status text default null
)
returns jsonb
language plpgsql
volatile
security invoker
set search_path = ''
as $$
declare
  v_card public.rate_cards;
  v_package public.rate_card_packages;
begin
  if p_status is not null and p_status not in ('draft', 'published') then
    raise exception 'creator_update_rate_card_package: status tidak valid' using errcode = '22023';
  end if;

  select * into v_card
  from public.rate_cards rc
  where rc.id = p_rate_card_id and rc.creator_id = p_creator_id
  for update;
  if not found then
    return null;
  end if;

  update public.rate_card_packages pk
     set name = p_name,
         description = p_description,
         output = p_output,
         delivery_days = p_delivery_days,
         price = p_price,
         revision_limit = p_revision_limit
   where pk.id = p_package_id and pk.rate_card_id = v_card.id
  returning * into v_package;
  if not found then
    return null;
  end if;

  update public.rate_cards rc
     set title = p_name,
         status = coalesce(p_status, rc.status)
   where rc.id = v_card.id
  returning * into v_card;

  return jsonb_build_object('rate_card', to_jsonb(v_card), 'package', to_jsonb(v_package));
end;
$$;

comment on function public.creator_update_rate_card_package(uuid, text, text, text, text, text, integer, bigint, integer, text) is
  'Update paket rate card + mirror judul/status parent (atomik). Hanya service_role.';

-- -----------------------------------------------------------------------------
-- creator_delete_rate_card — hapus paket (p_package_id terisi) atau seluruh
-- rate card (null). Ditolak bila paket yang terdampak dipakai order berjalan.
-- Parent ikut dihapus bila tidak menyisakan paket (rate card tanpa paket jadi
-- "hantu" di direktori UMKM). Mengembalikan false bila tidak ditemukan/bukan
-- milik kreator.
-- -----------------------------------------------------------------------------
create or replace function public.creator_delete_rate_card(
  p_creator_id uuid,
  p_rate_card_id text,
  p_package_id text default null
)
returns boolean
language plpgsql
volatile
security invoker
set search_path = ''
as $$
begin
  perform 1
  from public.rate_cards rc
  where rc.id = p_rate_card_id and rc.creator_id = p_creator_id
  for update;
  if not found then
    return false;
  end if;

  if p_package_id is not null and not exists (
    select 1 from public.rate_card_packages pk
    where pk.id = p_package_id and pk.rate_card_id = p_rate_card_id
  ) then
    return false;
  end if;

  if exists (
    select 1
    from public.orders o
    join public.rate_card_packages pk on pk.id = o.package_id
    where pk.rate_card_id = p_rate_card_id
      and (p_package_id is null or pk.id = p_package_id)
      and o.status in ('pending_payment', 'escrow', 'in_progress', 'revision', 'approved')
  ) then
    raise exception 'Paket tidak bisa dihapus karena masih ada order berjalan. Jadikan Draft saja.';
  end if;

  if p_package_id is not null then
    delete from public.rate_card_packages pk where pk.id = p_package_id;
    if exists (select 1 from public.rate_card_packages pk where pk.rate_card_id = p_rate_card_id) then
      return true;
    end if;
  end if;

  -- Cascade menghapus paket yang tersisa; orders.package_id → set null.
  delete from public.rate_cards rc where rc.id = p_rate_card_id;
  return true;
end;
$$;

comment on function public.creator_delete_rate_card(uuid, text, text) is
  'Hapus paket/rate card milik kreator; tolak bila ada order berjalan. Hanya service_role.';

-- -----------------------------------------------------------------------------
-- Hak akses: hanya service_role.
-- -----------------------------------------------------------------------------
revoke all on function public.creator_create_rate_card(uuid, text, text, text, integer, bigint, integer, text)
  from public, anon, authenticated;
revoke all on function public.creator_update_rate_card_package(uuid, text, text, text, text, text, integer, bigint, integer, text)
  from public, anon, authenticated;
revoke all on function public.creator_delete_rate_card(uuid, text, text)
  from public, anon, authenticated;

grant execute on function public.creator_create_rate_card(uuid, text, text, text, integer, bigint, integer, text)
  to service_role;
grant execute on function public.creator_update_rate_card_package(uuid, text, text, text, text, text, integer, bigint, integer, text)
  to service_role;
grant execute on function public.creator_delete_rate_card(uuid, text, text)
  to service_role;
