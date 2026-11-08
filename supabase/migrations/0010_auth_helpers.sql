-- =============================================================================
-- 0010_auth_helpers — helper otorisasi untuk policy RLS (migrasi Fase 3).
--
-- Semua helper berada di schema `private`, BUKAN `public`:
--   * Schema `public` diekspos lewat Data API (PostgREST). Fungsi SECURITY
--     DEFINER di sana otomatis menjadi endpoint RPC yang bisa dipanggil anon/
--     authenticated (advisor `*_security_definer_function_executable`).
--   * `private` tidak ada di `[api].schemas`, jadi tidak bisa dipanggil lewat
--     REST. anon/authenticated tetap butuh USAGE + EXECUTE karena policy RLS
--     dievaluasi dengan hak role yang sedang query.
--
-- Aturan setiap helper:
--   * `security definer` (membaca tabel tanpa terkena RLS, menghindari policy
--     rekursif), `stable`, `set search_path = ''`, semua objek fully-qualified.
--   * Identitas pemanggil SELALU dari `auth.uid()` (JWT terverifikasi), tidak
--     pernah dari argumen.
--   * TIDAK membaca `raw_user_meta_data` / `user_metadata` (bisa diubah user).
-- =============================================================================

create schema if not exists private;

comment on schema private is
  'Helper internal (otorisasi RLS). Tidak diekspos lewat Data API.';

revoke all on schema private from public;
grant usage on schema private to anon, authenticated, service_role;

-- -----------------------------------------------------------------------------
-- current_user_row() — baris public.users milik pemanggil (atau NULL).
-- -----------------------------------------------------------------------------
create or replace function private.current_user_row()
returns public.users
language sql
stable
security definer
set search_path = ''
as $$
  select u.*
    from public.users u
   where u.id = (select auth.uid());
$$;

comment on function private.current_user_row() is
  'Baris public.users milik auth.uid(); NULL bila tidak login / belum punya profil.';

-- -----------------------------------------------------------------------------
-- is_admin() — admin aktif.
--
-- Syarat (semua wajib, AND):
--   1. auth.users.raw_app_meta_data ->> 'role' = 'admin'
--      app_metadata hanya bisa diubah service role (allowlist Fase 4/9).
--      Dibaca dari tabel, bukan dari JWT, supaya pencabutan berlaku seketika
--      (klaim JWT baru segar setelah token di-refresh).
--   2. public.users.role = 'admin'   (sesuai dokumen Fase 3)
--   3. public.users.status = 'active' (admin yang di-suspend kehilangan akses)
--
-- users.role saja TIDAK cukup (celah #1/#5: dulu kolom ini bisa diubah user).
-- Sejak Fase 3 browser tidak punya hak tulis apa pun, tetapi syarat app_metadata
-- tetap dipertahankan sebagai sumber kebenaran (keputusan log Fase 0 & 2).
-- -----------------------------------------------------------------------------
create or replace function private.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
      from auth.users au
      join public.users u on u.id = au.id
     where au.id = (select auth.uid())
       and au.raw_app_meta_data ->> 'role' = 'admin'
       and u.role = 'admin'
       and u.status = 'active'
  );
$$;

comment on function private.is_admin() is
  'TRUE bila pemanggil admin aktif: app_metadata.role = admin, users.role = admin, users.status = active. Tidak pernah membaca user_metadata.';

-- -----------------------------------------------------------------------------
-- is_conversation_participant(conv_id) — pemanggil adalah UMKM atau kreator
-- percakapan tersebut.
-- -----------------------------------------------------------------------------
create or replace function private.is_conversation_participant(conv_id text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
      from public.conversations c
     where c.id = conv_id
       and (select auth.uid()) in (c.umkm_id, c.creator_id)
  );
$$;

comment on function private.is_conversation_participant(text) is
  'TRUE bila auth.uid() adalah umkm_id atau creator_id percakapan.';

-- -----------------------------------------------------------------------------
-- is_order_party(order_id) — pemanggil adalah UMKM atau kreator order tersebut.
-- -----------------------------------------------------------------------------
create or replace function private.is_order_party(order_id text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
      from public.orders o
     where o.id = order_id
       and (select auth.uid()) in (o.umkm_id, o.creator_id)
  );
$$;

comment on function private.is_order_party(text) is
  'TRUE bila auth.uid() adalah umkm_id atau creator_id order.';

-- -----------------------------------------------------------------------------
-- Hak eksekusi: cabut default PUBLIC, beri eksplisit ke role API (dibutuhkan
-- saat evaluasi policy) dan service_role.
-- -----------------------------------------------------------------------------
revoke all on function private.current_user_row() from public;
revoke all on function private.is_admin() from public;
revoke all on function private.is_conversation_participant(text) from public;
revoke all on function private.is_order_party(text) from public;

grant execute on function private.current_user_row() to authenticated, service_role;
grant execute on function private.is_admin() to anon, authenticated, service_role;
grant execute on function private.is_conversation_participant(text) to authenticated, service_role;
grant execute on function private.is_order_party(text) to authenticated, service_role;
