-- pgTAP: file privat + kuota (0021_files). Semua data di-rollback.
begin;
create extension if not exists pgtap with schema extensions;

select plan(24);

-- Fixture ---------------------------------------------------------------------
insert into auth.users (id, email, aud, role, raw_app_meta_data, raw_user_meta_data) values
  ('f1111111-1111-4111-8111-111111111111', 'file-umkm@example.test', 'authenticated', 'authenticated', '{}', '{}'),
  ('f2222222-2222-4222-8222-222222222222', 'file-kreator@example.test', 'authenticated', 'authenticated', '{}', '{}'),
  ('f3333333-3333-4333-8333-333333333333', 'file-lain@example.test', 'authenticated', 'authenticated', '{}', '{}');
insert into public.users (id, role, email) values
  ('f1111111-1111-4111-8111-111111111111', 'umkm', 'file-umkm@example.test'),
  ('f2222222-2222-4222-8222-222222222222', 'creator', 'file-kreator@example.test'),
  ('f3333333-3333-4333-8333-333333333333', 'creator', 'file-lain@example.test');
-- Kuota kreator 1000 byte supaya batas mudah diuji.
insert into public.user_storage_usage (user_id, used_bytes, quota_bytes, file_count) values
  ('f2222222-2222-4222-8222-222222222222', 0, 1000, 0),
  ('f3333333-3333-4333-8333-333333333333', 0, 1000, 100);
insert into public.orders (id, creator_id, umkm_id, amount, status) values
  ('file-ord1', 'f2222222-2222-4222-8222-222222222222', 'f1111111-1111-4111-8111-111111111111', 100000, 'in_progress');

-- Objek Storage "sudah diunggah" (metadata diisi Storage API sungguhan).
insert into storage.objects (bucket_id, name, owner, metadata) values
  ('user-files', 'f2222222-2222-4222-8222-222222222222/a.pdf', 'f2222222-2222-4222-8222-222222222222',
    '{"size": 600, "mimetype": "application/pdf"}'),
  ('user-files', 'f2222222-2222-4222-8222-222222222222/b.pdf', 'f2222222-2222-4222-8222-222222222222',
    '{"size": 600, "mimetype": "application/pdf"}'),
  ('user-files', 'f2222222-2222-4222-8222-222222222222/c.exe', 'f2222222-2222-4222-8222-222222222222',
    '{"size": 10, "mimetype": "application/x-msdownload"}'),
  ('user-files', 'f2222222-2222-4222-8222-222222222222/big.mp4', 'f2222222-2222-4222-8222-222222222222',
    '{"size": 30000000, "mimetype": "video/mp4"}'),
  ('user-files', 'f3333333-3333-4333-8333-333333333333/x.pdf', 'f3333333-3333-4333-8333-333333333333',
    '{"size": 10, "mimetype": "application/pdf"}');

-- Hak akses -------------------------------------------------------------------
select ok(not has_function_privilege('anon', 'public.confirm_user_file(uuid, text, text, text)', 'execute'),
  'confirm_user_file: anon tidak bisa execute');
select ok(not has_function_privilege('authenticated', 'public.confirm_user_file(uuid, text, text, text)', 'execute'),
  'confirm_user_file: authenticated tidak bisa execute');
select ok(has_function_privilege('service_role', 'public.confirm_user_file(uuid, text, text, text)', 'execute'),
  'confirm_user_file: service_role bisa execute');
select ok(not has_function_privilege('authenticated', 'public.delete_user_file(uuid, text)', 'execute'),
  'delete_user_file: authenticated tidak bisa execute');
select ok(has_function_privilege('service_role', 'public.delete_user_file(uuid, text)', 'execute'),
  'delete_user_file: service_role bisa execute');

-- Confirm ---------------------------------------------------------------------
select is(
  (public.confirm_user_file('f2222222-2222-4222-8222-222222222222', 'f2222222-2222-4222-8222-222222222222/a.pdf',
    'Brief.pdf', 'file-ord1')).size_bytes,
  600::bigint,
  'confirm: ukuran dari metadata Storage, bukan klien');
select is(
  (select shared_with_order_id from public.user_files where storage_file_id = 'f2222222-2222-4222-8222-222222222222/a.pdf'),
  'file-ord1', 'confirm: pengunggah pihak order → dibagikan');
select is(
  (select used_bytes from public.user_storage_usage where user_id = 'f2222222-2222-4222-8222-222222222222'),
  600::bigint, 'confirm: used_bytes bertambah');
select is(
  (select file_count from public.user_storage_usage where user_id = 'f2222222-2222-4222-8222-222222222222'),
  1, 'confirm: file_count bertambah');

-- Idempoten
select is(
  (public.confirm_user_file('f2222222-2222-4222-8222-222222222222', 'f2222222-2222-4222-8222-222222222222/a.pdf',
    'Brief.pdf', null)).id,
  (select id from public.user_files where storage_file_id = 'f2222222-2222-4222-8222-222222222222/a.pdf'),
  'confirm ulang path sama → baris sama');
select is(
  (select used_bytes from public.user_storage_usage where user_id = 'f2222222-2222-4222-8222-222222222222'),
  600::bigint, 'confirm ulang tidak mendebit kuota dua kali');

-- Kuota: confirm kedua (600 + 600 > 1000) ditolak — row lock membuat ini juga
-- berlaku untuk dua confirm bersamaan (yang kedua menunggu lalu melihat 600).
select throws_ok(
  $$ select public.confirm_user_file('f2222222-2222-4222-8222-222222222222',
       'f2222222-2222-4222-8222-222222222222/b.pdf', 'b.pdf', null) $$,
  'P0001', 'Kuota penyimpanan penuh.', 'confirm melebihi kuota → P0001');
select is(
  (select count(*)::int from public.user_files where storage_file_id = 'f2222222-2222-4222-8222-222222222222/b.pdf'),
  0, 'confirm gagal kuota tidak menulis user_files');

select throws_ok(
  $$ select public.confirm_user_file('f3333333-3333-4333-8333-333333333333',
       'f3333333-3333-4333-8333-333333333333/x.pdf', 'x.pdf', null) $$,
  'P0001', 'Batas jumlah file aktif tercapai.', 'file_count >= 100 → ditolak');
select throws_ok(
  $$ select public.confirm_user_file('f2222222-2222-4222-8222-222222222222',
       'f2222222-2222-4222-8222-222222222222/c.exe', 'c.exe', null) $$,
  'P0001', 'Tipe file tidak diizinkan.', 'MIME di luar daftar → ditolak');
select throws_ok(
  $$ select public.confirm_user_file('f2222222-2222-4222-8222-222222222222',
       'f2222222-2222-4222-8222-222222222222/big.mp4', 'big.mp4', null) $$,
  'P0001', 'Ukuran file tidak valid (maksimal 20 MB).', 'ukuran > 20 MiB → ditolak');
select throws_ok(
  $$ select public.confirm_user_file('f2222222-2222-4222-8222-222222222222',
       'f2222222-2222-4222-8222-222222222222/tidak-ada.pdf', 'x.pdf', null) $$,
  'P0001', 'File belum diunggah.', 'objek belum ada → ditolak');
select throws_ok(
  $$ select public.confirm_user_file('f2222222-2222-4222-8222-222222222222',
       'f3333333-3333-4333-8333-333333333333/x.pdf', 'x.pdf', null) $$,
  'P0001', 'Path file tidak valid.', 'path folder user lain → ditolak');

-- Berbagi gagal terbuka: user bukan pihak order → tersimpan tanpa share.
update public.user_storage_usage set file_count = 0 where user_id = 'f3333333-3333-4333-8333-333333333333';
select is(
  (public.confirm_user_file('f3333333-3333-4333-8333-333333333333', 'f3333333-3333-4333-8333-333333333333/x.pdf',
    'x.pdf', 'file-ord1')).shared_with_order_id,
  null, 'bukan pihak order → tidak dibagikan');

-- Delete ----------------------------------------------------------------------
select throws_ok(
  $$ select public.delete_user_file('f3333333-3333-4333-8333-333333333333',
       (select id from public.user_files where storage_file_id = 'f2222222-2222-4222-8222-222222222222/a.pdf')) $$,
  'P0001', 'Akses ditolak.', 'delete oleh bukan pemilik → ditolak');
select is(
  (public.delete_user_file('f2222222-2222-4222-8222-222222222222',
    (select id from public.user_files where storage_file_id = 'f2222222-2222-4222-8222-222222222222/a.pdf'))).status,
  'deleted', 'delete: status deleted');
select is(
  (select used_bytes from public.user_storage_usage where user_id = 'f2222222-2222-4222-8222-222222222222'),
  0::bigint, 'delete: used_bytes dikembalikan');
select lives_ok(
  $$ select public.delete_user_file('f2222222-2222-4222-8222-222222222222',
       (select id from public.user_files where storage_file_id = 'f2222222-2222-4222-8222-222222222222/a.pdf')) $$,
  'delete ulang idempoten');
select is(
  (select used_bytes from public.user_storage_usage where user_id = 'f2222222-2222-4222-8222-222222222222'),
  0::bigint, 'delete ulang tidak mengubah kuota');

select * from finish();
rollback;
