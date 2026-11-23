-- pgTAP: aksi admin terhadap user + banding (0028). Semua di-rollback.
begin;
create extension if not exists pgtap with schema extensions;
select plan(20);

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000fb001', 'au-user@example.test'),
  ('00000000-0000-0000-0000-0000000fb002', 'au-admin2@example.test'),
  ('00000000-0000-0000-0000-0000000fb009', 'au-admin@example.test');
insert into public.users (id, role, status, email) values
  ('00000000-0000-0000-0000-0000000fb001', 'creator', 'active', 'au-user@example.test'),
  ('00000000-0000-0000-0000-0000000fb002', 'admin', 'active', 'au-admin2@example.test'),
  ('00000000-0000-0000-0000-0000000fb009', 'admin', 'active', 'au-admin@example.test');

-- 1–3. Guard.
select throws_ok($$select public.admin_suspend_user('00000000-0000-0000-0000-0000000fb001', '00000000-0000-0000-0000-0000000fb009', 'suspended', 'x')$$,
  '42501', 'Akses Admin ditolak.', 'non-admin tidak bisa suspend');
select throws_ok($$select public.admin_suspend_user('00000000-0000-0000-0000-0000000fb009', '00000000-0000-0000-0000-0000000fb009', 'suspended', 'x')$$,
  '42501', null, 'admin tidak bisa suspend diri sendiri');
select throws_ok($$select public.admin_suspend_user('00000000-0000-0000-0000-0000000fb009', '00000000-0000-0000-0000-0000000fb002', 'suspended', 'x')$$,
  '42501', null, 'admin tidak bisa suspend admin lain');

-- 4–7. Suspend.
select is((public.admin_suspend_user('00000000-0000-0000-0000-0000000fb009', '00000000-0000-0000-0000-0000000fb001', 'suspended', 'Spam'))->>'status',
  'suspended', 'user aktif → suspended');
select ok((select suspended_at is not null and status = 'suspended' from public.users where id = '00000000-0000-0000-0000-0000000fb001'),
  'status + suspended_at tersimpan');
select throws_ok($$select public.admin_suspend_user('00000000-0000-0000-0000-0000000fb009', '00000000-0000-0000-0000-0000000fb001', 'suspended', 'lagi')$$,
  'P0001', null, 'suspend ulang → 409');
select is((select count(*)::int from public.notifications where user_id = '00000000-0000-0000-0000-0000000fb001' and title = 'Akun Ditangguhkan'),
  1, 'notifikasi suspend');

-- 8–10. Banding approved memulihkan akun.
insert into public.appeals (id, user_id, action_ref, reason, deadline_at, sla_decided_at, status)
values ('apl-1', '00000000-0000-0000-0000-0000000fb001', 'suspend', 'Salah paham', now() + interval '14 days', now() + interval '7 days', 'submitted');
select throws_ok($$select public.admin_review_appeal('00000000-0000-0000-0000-0000000fb009', 'apl-1', 'maybe')$$,
  '22023', 'Invalid decision', 'keputusan tidak valid');
select is((public.admin_review_appeal('00000000-0000-0000-0000-0000000fb009', 'apl-1', 'approved', 'Dipulihkan'))->>'status',
  'approved', 'banding approved');
select is((select status from public.users where id = '00000000-0000-0000-0000-0000000fb001'), 'active', 'akun aktif lagi');
select throws_ok($$select public.admin_review_appeal('00000000-0000-0000-0000-0000000fb009', 'apl-1', 'rejected')$$,
  'P0001', 'Appeal is already decided', 'banding final tidak bisa diputus ulang');

-- 12–15. Suspend siklus kedua tetap mendapat notifikasi; unsuspend.
select public.admin_suspend_user('00000000-0000-0000-0000-0000000fb009', '00000000-0000-0000-0000-0000000fb001', 'suspended', 'Kedua');
select is((select count(*)::int from public.notifications where user_id = '00000000-0000-0000-0000-0000000fb001' and title = 'Akun Ditangguhkan'),
  2, 'siklus suspend kedua tetap dinotifikasi');
select is((public.admin_unsuspend_user('00000000-0000-0000-0000-0000000fb009', '00000000-0000-0000-0000-0000000fb001', 'OK'))->>'status',
  'active', 'unsuspend');
select throws_ok($$select public.admin_unsuspend_user('00000000-0000-0000-0000-0000000fb009', '00000000-0000-0000-0000-0000000fb001')$$,
  'P0001', 'User is already active', 'unsuspend user aktif → 409');
select public.admin_suspend_user('00000000-0000-0000-0000-0000000fb009', '00000000-0000-0000-0000-0000000fb001', 'terminated', 'Fraud');
select throws_ok($$select public.admin_unsuspend_user('00000000-0000-0000-0000-0000000fb009', '00000000-0000-0000-0000-0000000fb001')$$,
  'P0001', 'Cannot unsuspend terminated user directly', 'terminated tidak bisa dipulihkan langsung');

-- 16–18. KYC idempoten.
select is((public.admin_verify_kyc('00000000-0000-0000-0000-0000000fb009', '00000000-0000-0000-0000-0000000fb001'))->>'alreadyVerified',
  'false', 'KYC diverifikasi');
select is((select kyc_status from public.users where id = '00000000-0000-0000-0000-0000000fb001'), 'verified', 'kyc_status verified');
select is((public.admin_verify_kyc('00000000-0000-0000-0000-0000000fb009', '00000000-0000-0000-0000-0000000fb001'))->>'alreadyVerified',
  'true', 'verify ulang idempoten');

-- 19. Audit: suspend, approve appeal, suspend, unsuspend, terminate, kyc = 6.
select is((select count(*)::int from public.admin_actions where admin_id = '00000000-0000-0000-0000-0000000fb009'), 6,
  'semua aksi admin tercatat di admin_actions');

-- 20. Hak akses.
select ok(not has_function_privilege('authenticated', 'public.admin_suspend_user(uuid, uuid, text, text)', 'execute')
  and not has_function_privilege('anon', 'public.request_withdrawal(uuid, text, bigint, text, text, text, text, text, text, bigint, boolean, bigint, integer, integer)', 'execute'),
  'RPC 0028 tidak bisa dieksekusi anon/authenticated');

select * from finish();
rollback;
