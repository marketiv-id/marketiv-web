-- =============================================================================
-- 0021_files — file privat (bucket user-files) + kuota (Fase 6).
--
-- Pengganti Function `validate-and-upload` dan `delete-file`:
--   1. Route `/api/files/upload-url` memvalidasi lalu membuat signed upload URL
--      ke `<uid>/<uuid>.<ext>`; browser mengunggah LANGSUNG ke Storage.
--   2. Route `/api/files/confirm` memanggil `confirm_user_file()`: ukuran dan
--      MIME diambil dari metadata objek Storage yang SUDAH ada (bukan dari
--      klien), lalu baris `user_files` + kuota diperbarui dalam satu transaksi
--      dengan row lock pada `user_storage_usage`.
--   3. Route `DELETE /api/files/[id]` memanggil `delete_user_file()` (soft
--      delete + kembalikan kuota, atomik) lalu menghapus objek Storage.
--
-- Error bisnis: `raise … using errcode = 'P0001', hint = '<kode>'`. Route
-- memetakan hint → status HTTP (not_found 404, forbidden 403, quota_exceeded/
-- file_limit 409, invalid_file 400).
--
-- Keduanya SECURITY DEFINER (membaca storage.objects), search_path kosong,
-- EXECUTE hanya service_role. Kepemilikan dari argumen p_user_id = userId
-- sesi yang sudah diverifikasi route.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Berbagi baca dengan pihak lawan pada satu order (dulu: Permission.read untuk
-- pihak lawan di Appwrite). Yang disimpan ORDER-nya, bukan userId, supaya hak
-- baca selalu diturunkan dari baris `orders` saat diakses.
-- -----------------------------------------------------------------------------
alter table public.user_files
  add column if not exists shared_with_order_id text
    references public.orders (id) on delete set null;

create index if not exists user_files_shared_with_order_id_idx
  on public.user_files (shared_with_order_id)
  where shared_with_order_id is not null;

comment on column public.user_files.shared_with_order_id is
  'Order yang pihak lawannya ikut boleh membaca file ini (diverifikasi saat confirm).';

-- -----------------------------------------------------------------------------
-- Aturan file privat = aturan validate-and-upload ∩ allowed_mime_types bucket
-- user-files (0012). Satu sumber untuk SQL; route TS memakai daftar yang sama.
-- -----------------------------------------------------------------------------
create or replace function private.user_file_mime_allowed(p_mime text)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select p_mime = any (array[
    'image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml',
    'video/mp4', 'video/quicktime', 'video/x-msvideo',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation'
  ]);
$$;

-- -----------------------------------------------------------------------------
-- confirm_user_file — catat file yang sudah diunggah + debit kuota.
-- Idempoten per path: confirm ulang mengembalikan baris yang sama tanpa
-- mendebit kuota dua kali.
-- -----------------------------------------------------------------------------
create or replace function public.confirm_user_file(
  p_user_id uuid,
  p_path text,
  p_file_name text,
  p_shared_with_order_id text default null
)
returns public.user_files
language plpgsql
security definer
set search_path = ''
as $$
declare
  c_bucket constant text := 'user-files';
  c_max_bytes constant bigint := 20 * 1024 * 1024;
  c_max_active_files constant integer := 100;
  v_existing public.user_files;
  v_size bigint;
  v_mime text;
  v_usage public.user_storage_usage;
  v_share text;
  v_row public.user_files;
begin
  if p_user_id is null or p_path is null then
    raise exception 'confirm_user_file: argumen wajib' using errcode = '22023';
  end if;

  -- Path wajib `<uid>/<nama>` (tepat satu folder = pemilik).
  if split_part(p_path, '/', 1) <> p_user_id::text
     or array_length(string_to_array(p_path, '/'), 1) <> 2
     or split_part(p_path, '/', 2) = '' then
    raise exception 'Path file tidak valid.' using errcode = 'P0001', hint = 'forbidden';
  end if;

  if nullif(btrim(coalesce(p_file_name, '')), '') is null or char_length(p_file_name) > 255 then
    raise exception 'Nama file tidak valid.' using errcode = 'P0001', hint = 'invalid_file';
  end if;

  -- Kunci kuota dulu: serialisasi semua confirm/delete milik user yang sama,
  -- termasuk confirm ulang path yang sama.
  select * into v_usage
  from public.user_storage_usage u
  where u.user_id = p_user_id
  for update;
  if not found then
    raise exception 'Kuota penyimpanan tidak ditemukan.' using errcode = 'P0001', hint = 'not_found';
  end if;

  select * into v_existing
  from public.user_files f
  where f.storage_file_id = p_path;
  if found then
    if v_existing.user_id <> p_user_id or v_existing.bucket_id <> c_bucket then
      raise exception 'File milik pengguna lain.' using errcode = 'P0001', hint = 'forbidden';
    end if;
    return v_existing;
  end if;

  -- Ukuran & MIME dari objek Storage yang sudah tersimpan, bukan dari klien.
  select (o.metadata ->> 'size')::bigint, o.metadata ->> 'mimetype'
    into v_size, v_mime
  from storage.objects o
  where o.bucket_id = c_bucket and o.name = p_path;
  if not found then
    raise exception 'File belum diunggah.' using errcode = 'P0001', hint = 'not_found';
  end if;

  if v_size is null or v_size <= 0 or v_size > c_max_bytes then
    raise exception 'Ukuran file tidak valid (maksimal 20 MB).' using errcode = 'P0001', hint = 'invalid_file';
  end if;
  if v_mime is null or not private.user_file_mime_allowed(v_mime) then
    raise exception 'Tipe file tidak diizinkan.' using errcode = 'P0001', hint = 'invalid_file';
  end if;

  if v_usage.file_count >= c_max_active_files then
    raise exception 'Batas jumlah file aktif tercapai.' using errcode = 'P0001', hint = 'file_limit';
  end if;
  if v_usage.used_bytes + v_size > v_usage.quota_bytes then
    raise exception 'Kuota penyimpanan penuh.' using errcode = 'P0001', hint = 'quota_exceeded';
  end if;

  -- Berbagi hanya bila pengunggah memang pihak order (gagal terbuka seperti
  -- versi lama: order salah → file tetap tersimpan, hanya tidak dibagikan).
  if p_shared_with_order_id is not null then
    select o.id into v_share
    from public.orders o
    where o.id = p_shared_with_order_id
      and (o.umkm_id = p_user_id or o.creator_id = p_user_id);
  end if;

  insert into public.user_files (
    user_id, storage_file_id, bucket_id, file_name, mime_type, size_bytes, status, shared_with_order_id
  )
  values (p_user_id, p_path, c_bucket, btrim(p_file_name), v_mime, v_size, 'active', v_share)
  returning * into v_row;

  update public.user_storage_usage u
     set used_bytes = u.used_bytes + v_size,
         file_count = u.file_count + 1
   where u.id = v_usage.id;

  return v_row;
end;
$$;

comment on function public.confirm_user_file(uuid, text, text, text) is
  'Catat file privat yang sudah diunggah + debit kuota (atomik, idempoten per path). Hanya service_role.';

-- -----------------------------------------------------------------------------
-- delete_user_file — soft delete + kembalikan kuota. Idempoten: file yang
-- sudah 'deleted' dikembalikan apa adanya tanpa mengubah kuota.
-- Objek Storage dihapus route SETELAH fungsi ini sukses.
-- -----------------------------------------------------------------------------
create or replace function public.delete_user_file(p_user_id uuid, p_file_id text)
returns public.user_files
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_file public.user_files;
begin
  select * into v_file
  from public.user_files f
  where f.id = p_file_id
  for update;
  if not found then
    raise exception 'File tidak ditemukan.' using errcode = 'P0001', hint = 'not_found';
  end if;
  if v_file.user_id <> p_user_id then
    raise exception 'Akses ditolak.' using errcode = 'P0001', hint = 'forbidden';
  end if;
  if v_file.status = 'deleted' then
    return v_file;
  end if;

  update public.user_files f
     set status = 'deleted',
         deleted_at = now()
   where f.id = v_file.id
  returning * into v_file;

  update public.user_storage_usage u
     set used_bytes = greatest(0, u.used_bytes - v_file.size_bytes),
         file_count = greatest(0, u.file_count - 1)
   where u.user_id = p_user_id;

  return v_file;
end;
$$;

comment on function public.delete_user_file(uuid, text) is
  'Soft delete file privat + kembalikan kuota (atomik, idempoten). Hanya service_role.';

-- -----------------------------------------------------------------------------
-- Hak akses: hanya service_role.
-- -----------------------------------------------------------------------------
revoke all on function private.user_file_mime_allowed(text) from public, anon, authenticated;
revoke all on function public.confirm_user_file(uuid, text, text, text) from public, anon, authenticated;
revoke all on function public.delete_user_file(uuid, text) from public, anon, authenticated;

grant execute on function private.user_file_mime_allowed(text) to service_role;
grant execute on function public.confirm_user_file(uuid, text, text, text) to service_role;
grant execute on function public.delete_user_file(uuid, text) to service_role;
