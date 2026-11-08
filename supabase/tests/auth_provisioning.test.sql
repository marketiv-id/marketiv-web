-- pgTAP: RPC auth Fase 4 (provision_user, hit_otp_rate_limit).
begin;
create extension if not exists pgtap with schema extensions;

select plan(22);

insert into auth.users (id, email, aud, role, raw_app_meta_data, raw_user_meta_data) values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'umkm@example.test', 'authenticated', 'authenticated', '{}', '{}'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'kreator@example.test', 'authenticated', 'authenticated', '{}', '{}');

-- 1. Hak eksekusi: hanya service_role.
select ok(
  not has_function_privilege('anon', 'public.provision_user(uuid, text, text, text, text, boolean)', 'execute')
  and not has_function_privilege('authenticated', 'public.provision_user(uuid, text, text, text, text, boolean)', 'execute'),
  'provision_user tidak bisa dipanggil anon/authenticated'
);
select ok(
  has_function_privilege('service_role', 'public.provision_user(uuid, text, text, text, text, boolean)', 'execute'),
  'provision_user bisa dipanggil service_role'
);
select ok(
  not has_function_privilege('authenticated', 'public.hit_otp_rate_limit(text, text, text, integer, integer)', 'execute'),
  'hit_otp_rate_limit tidak bisa dipanggil authenticated'
);

-- 2. Role di-whitelist.
select throws_ok(
  $$select public.provision_user('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'admin', 'umkm@example.test')$$,
  '22023', null, 'role admin ditolak'
);
select throws_ok(
  $$select public.provision_user('cccccccc-cccc-cccc-cccc-cccccccccccc', 'umkm', 'x@example.test')$$,
  'P0002', null, 'akun auth yang tidak ada ditolak'
);

-- 3. UMKM: users + profil + wallet + kuota, satu panggilan.
select is(
  (select role from public.provision_user('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'umkm', 'UMKM@example.test', '08123456789')),
  'umkm', 'provision UMKM mengembalikan baris users'
);
select is((select email from public.users where id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'), 'umkm@example.test', 'email di-lowercase');
select is((select phone from public.users where id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'), '08123456789', 'phone tersimpan');
select is((select status from public.users where id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'), 'active', 'status active');
select ok((select email_verified_at is null from public.users where id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'), 'email belum terverifikasi');
select is((select count(*)::int from public.umkm_profiles where user_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'), 1, 'profil UMKM dibuat');
select is((select count(*)::int from public.creator_profiles where user_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'), 0, 'tanpa profil kreator');
select is((select balance from public.wallets where user_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'), 0::bigint, 'wallet saldo 0');
select is((select quota_bytes from public.user_storage_usage where user_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'), 104857600::bigint, 'kuota storage default 100 MiB');

-- 4. Idempoten & role tidak bisa diubah lewat pemanggilan ulang.
select lives_ok(
  $$select public.provision_user('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'creator', 'umkm@example.test', null, 'Coba', true)$$,
  'pemanggilan ulang tidak error'
);
select is((select role from public.users where id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'), 'umkm', 'role baris lama tidak berubah');
select is(
  (select count(*)::int from public.wallets where user_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa')
  + (select count(*)::int from public.umkm_profiles where user_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa')
  + (select count(*)::int from public.creator_profiles where user_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'),
  2, 'tidak ada wallet/profil ganda'
);
select ok((select email_verified_at is not null from public.users where id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'), 'kolom kosong dilengkapi (email_verified_at)');

-- 5. Kreator dengan display name (Google: email terverifikasi).
select is(
  (select role from public.provision_user('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'creator', 'kreator@example.test', null, 'Kreator B', true)),
  'creator', 'provision kreator'
);
select is((select display_name from public.creator_profiles where user_id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'), 'Kreator B', 'display_name kreator tersimpan');

-- 6. Rate limit OTP: 3 lolos, ke-4 diblokir.
select results_eq(
  $$select blocked from (
      select (public.hit_otp_rate_limit('password:k', 'x@example.test', '1.1.1.1', 3, 600)).blocked
      from generate_series(1, 4)
    ) t$$,
  $$values (false), (false), (false), (true)$$,
  'rate limit: 3 lolos lalu diblokir'
);
select ok(
  (select retry_after_seconds between 1 and 600 from public.hit_otp_rate_limit('password:k', 'x@example.test', '1.1.1.1', 3, 600)),
  'retry_after_seconds dalam jendela'
);

select * from finish();
rollback;
