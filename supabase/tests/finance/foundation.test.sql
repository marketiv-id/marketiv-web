-- pgTAP: fondasi ledger (0025). Semua di dalam transaksi, di-rollback.
begin;
create extension if not exists pgtap with schema extensions;
select plan(14);

-- Pengguna uji (auth.users → public.users → wallets).
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-00000000f001', 'fin1@example.test'),
  ('00000000-0000-0000-0000-00000000f002', 'fin2@example.test');
insert into public.users (id, role, status, email) values
  ('00000000-0000-0000-0000-00000000f001', 'creator', 'active', 'fin1@example.test'),
  ('00000000-0000-0000-0000-00000000f002', 'admin', 'active', 'fin2@example.test');

-- 1–3. Kredit pertama mencatat ledger + menaikkan saldo (wallet dibuat bila belum ada).
select isnt(
  private.post_ledger('00000000-0000-0000-0000-00000000f001', 'release', 10000, 'escrow', 'esc-1'),
  null, 'kredit pertama mengembalikan id transaksi');
select is((select balance from public.wallets where user_id = '00000000-0000-0000-0000-00000000f001'),
  10000::bigint, 'saldo naik sesuai kredit');
select is((select count(*)::int from public.transactions where reference_id = 'esc-1'), 1, 'satu baris ledger');

-- 4–5. Panggilan kedua (triple sama) no-op.
select is(
  private.post_ledger('00000000-0000-0000-0000-00000000f001', 'release', 10000, 'escrow', 'esc-1'),
  null, 'panggilan ulang mengembalikan NULL');
select is((select balance from public.wallets where user_id = '00000000-0000-0000-0000-00000000f001'),
  10000::bigint, 'saldo tidak berubah pada panggilan ulang');

-- 6. type berbeda untuk referensi yang sama tetap dicatat (fee = arah 0).
select isnt(
  private.post_ledger('00000000-0000-0000-0000-00000000f001', 'fee', 200, 'escrow', 'esc-1'),
  null, 'fee dicatat terpisah');
select is((select balance from public.wallets where user_id = '00000000-0000-0000-0000-00000000f001'),
  10000::bigint, 'fee tidak mengubah saldo');

-- 8–9. Debit melebihi saldo → exception (CHECK balance >= 0), tidak ada ledger tersisa.
select throws_ok(
  $$select private.post_ledger('00000000-0000-0000-0000-00000000f001', 'withdrawal', 20000, 'withdrawal', 'wd-x')$$,
  '23514', null, 'overdraw ditolak CHECK');
select is((select count(*)::int from public.transactions where reference_id = 'wd-x'), 0,
  'ledger overdraw ikut rollback');

-- 10. Debit valid.
select isnt(
  private.post_ledger('00000000-0000-0000-0000-00000000f001', 'withdrawal', 4000, 'withdrawal', 'wd-1', 'pending'),
  null, 'debit withdrawal dicatat');
select is((select balance from public.wallets where user_id = '00000000-0000-0000-0000-00000000f001'),
  6000::bigint, 'saldo turun sesuai debit');

-- 12. Rekonsiliasi = 0 selisih.
select is((select diff from public.finance_reconciliation where user_id = '00000000-0000-0000-0000-00000000f001'),
  0::bigint, 'finance_reconciliation diff = 0');

-- 13. Hak akses: anon/authenticated tidak bisa execute post_ledger.
select ok(not has_function_privilege('authenticated', 'private.post_ledger(uuid, text, bigint, text, text, text)', 'execute'),
  'authenticated tidak bisa execute post_ledger');

-- 14. admin_actions tercatat lewat helper.
select isnt(private.log_admin_action('00000000-0000-0000-0000-00000000f002', 'suspend_user', 'user',
  '00000000-0000-0000-0000-00000000f001', '{"reason":"uji"}'), null, 'log_admin_action menulis audit');

select * from finish();
rollback;
