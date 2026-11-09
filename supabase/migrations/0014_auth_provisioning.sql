-- =============================================================================
-- 0014_auth_provisioning — RPC auth untuk Route Handler (Fase 4).
--
--   * provision_user(...)      : pengganti Function create-user-profile +
--                                create-user-wallet (event users.*.create).
--   * hit_otp_rate_limit(...)  : pengganti rate limit di request-password-otp.
--
-- Keduanya SECURITY DEFINER dan HANYA bisa dipanggil service_role (route yang
-- sudah memverifikasi sesi). EXECUTE dicabut dari public/anon/authenticated
-- secara eksplisit (selain default privileges dari 0011).
-- =============================================================================

-- -----------------------------------------------------------------------------
-- provision_user — buat baris users + profil sesuai role + wallet + kuota
-- storage dalam SATU transaksi. Idempoten: memanggil ulang tidak menggandakan
-- apa pun dan tidak pernah mengubah role baris yang sudah ada.
--
-- Role di-whitelist umkm/creator. Admin tidak pernah dibuat lewat jalur ini
-- (celah #1/#5: role dari body request).
-- -----------------------------------------------------------------------------
create or replace function public.provision_user(
  p_user_id uuid,
  p_role text,
  p_email text,
  p_phone text default null,
  p_display_name text default null,
  p_email_verified boolean default false
)
returns public.users
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_row public.users;
  v_phone text := nullif(btrim(coalesce(p_phone, '')), '');
  v_display_name text := left(btrim(coalesce(p_display_name, '')), 255);
begin
  if p_user_id is null then
    raise exception 'provision_user: p_user_id wajib diisi' using errcode = '22023';
  end if;
  if p_role is null or p_role not in ('umkm', 'creator') then
    raise exception 'provision_user: role tidak valid (%)', p_role using errcode = '22023';
  end if;
  if nullif(btrim(coalesce(p_email, '')), '') is null then
    raise exception 'provision_user: email wajib diisi' using errcode = '22023';
  end if;

  -- Akun Auth harus ada (FK users.id → auth.users juga menjaga ini).
  if not exists (select 1 from auth.users au where au.id = p_user_id) then
    raise exception 'provision_user: akun auth % tidak ditemukan', p_user_id using errcode = 'P0002';
  end if;

  insert into public.users (id, role, status, email, phone, email_verified_at)
  values (
    p_user_id,
    p_role,
    'active',
    lower(btrim(p_email)),
    v_phone,
    case when p_email_verified then now() end
  )
  on conflict (id) do nothing;

  -- Baris lama: hanya melengkapi kolom kosong. Role/status TIDAK pernah diubah.
  update public.users u
     set phone = coalesce(u.phone, v_phone),
         email_verified_at = coalesce(u.email_verified_at, case when p_email_verified then now() end)
   where u.id = p_user_id
     and ((u.phone is null and v_phone is not null)
       or (u.email_verified_at is null and p_email_verified))
  returning * into v_row;

  if v_row.id is null then
    select * into v_row from public.users u where u.id = p_user_id;
  end if;

  -- Profil mengikuti role baris yang tersimpan (bukan argumen), supaya
  -- pemanggilan ulang dengan role berbeda tidak membuat profil ganda.
  if v_row.role = 'umkm' then
    insert into public.umkm_profiles (user_id, business_name)
    values (p_user_id, '')
    on conflict (user_id) do nothing;
  elsif v_row.role = 'creator' then
    insert into public.creator_profiles (user_id, display_name)
    values (p_user_id, v_display_name)
    on conflict (user_id) do nothing;
  end if;

  insert into public.wallets (user_id) values (p_user_id)
  on conflict (user_id) do nothing;

  insert into public.user_storage_usage (user_id) values (p_user_id)
  on conflict (user_id) do nothing;

  return v_row;
end;
$$;

comment on function public.provision_user(uuid, text, text, text, text, boolean) is
  'Buat users + profil + wallet + user_storage_usage (idempoten, satu transaksi). Hanya service_role.';

revoke all on function public.provision_user(uuid, text, text, text, text, boolean)
  from public, anon, authenticated;
grant execute on function public.provision_user(uuid, text, text, text, text, boolean)
  to service_role;

-- -----------------------------------------------------------------------------
-- hit_otp_rate_limit — catat satu permintaan OTP dan beri tahu apakah diblokir.
-- Atomik (INSERT … ON CONFLICT DO UPDATE), jadi dua permintaan bersamaan tidak
-- bisa sama-sama lolos di batas terakhir.
--
-- Perilaku sama dengan request-password-otp lama: maksimum p_max permintaan per
-- jendela p_window_seconds per kunci (hash email+ip); jendela mulai ulang
-- setelah lewat.
-- -----------------------------------------------------------------------------
create or replace function public.hit_otp_rate_limit(
  p_key text,
  p_email text,
  p_ip text,
  p_max integer,
  p_window_seconds integer
)
returns table (blocked boolean, retry_after_seconds integer)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_now timestamptz := now();
  v_row public.otp_rate_limits;
begin
  if p_max is null or p_max < 1 or p_window_seconds is null or p_window_seconds < 1 then
    raise exception 'hit_otp_rate_limit: batas tidak valid' using errcode = '22023';
  end if;

  insert into public.otp_rate_limits as r (key, email, ip, count, window_start)
  values (p_key, left(p_email, 255), left(coalesce(p_ip, 'unknown'), 100), 1, v_now)
  on conflict (key) do update
    set count = case
                  when r.window_start <= v_now - make_interval(secs => p_window_seconds) then 1
                  else r.count + 1
                end,
        window_start = case
                         when r.window_start <= v_now - make_interval(secs => p_window_seconds) then v_now
                         else r.window_start
                       end,
        email = excluded.email,
        ip = excluded.ip
  returning * into v_row;

  if v_row.count > p_max then
    return query select
      true,
      greatest(
        1,
        ceil(extract(epoch from (v_row.window_start + make_interval(secs => p_window_seconds) - v_now)))::integer
      );
  else
    return query select false, 0;
  end if;
end;
$$;

comment on function public.hit_otp_rate_limit(text, text, text, integer, integer) is
  'Rate limit permintaan OTP (atomik). Hanya service_role.';

revoke all on function public.hit_otp_rate_limit(text, text, text, integer, integer)
  from public, anon, authenticated;
grant execute on function public.hit_otp_rate_limit(text, text, text, integer, integer)
  to service_role;
