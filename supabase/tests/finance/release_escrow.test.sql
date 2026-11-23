-- pgTAP: release_escrow (0026).
begin;
create extension if not exists pgtap with schema extensions;
select plan(15);
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000000a1', 'umkm-fin@example.test'),
  ('00000000-0000-0000-0000-0000000000c1', 'creator-fin@example.test'),
  ('00000000-0000-0000-0000-0000000000d1', 'admin-fin@example.test');
insert into public.users (id, role, status, email) values
  ('00000000-0000-0000-0000-0000000000a1', 'umkm', 'active', 'umkm-fin@example.test'),
  ('00000000-0000-0000-0000-0000000000c1', 'creator', 'active', 'creator-fin@example.test'),
  ('00000000-0000-0000-0000-0000000000d1', 'admin', 'active', 'admin-fin@example.test');
insert into public.wallets (user_id) values
  ('00000000-0000-0000-0000-0000000000a1'), ('00000000-0000-0000-0000-0000000000c1');
insert into public.orders (id, umkm_id, creator_id, amount, status) values
  ('ro1', '00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-0000000000c1', 100000, 'in_progress'),
  ('ro2', '00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-0000000000c1', 50000, 'in_progress'),
  ('ro3', '00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-0000000000c1', 10000, 'revision');
insert into public.escrows (id, order_id, amount, status, fee_rate) values
  ('re1', 'ro1', 100000, 'held', 0.02),
  ('re2', 'ro2', 50000, 'held', 0.02),
  ('re3', 'ro3', 10000, 'releasing', 0);
insert into public.deliverables (id, order_id, source, file_url, version, status) values
  ('rd1', 'ro1', 'external_url', 'https://x.test/1', 1, 'approved'),
  ('rd2', 'ro2', 'external_url', 'https://x.test/2', 1, 'approved'),
  ('rd3', 'ro3', 'external_url', 'https://x.test/3', 1, 'approved');
insert into public.ratecard_deliverable_validations (deliverable_id, order_id, deliverable_version, source_snapshot, evidence_url_snapshot, status, reviewed_by) values
  ('rd1', 'ro1', 1, 'external_url', 'https://x.test/1', 'valid', '00000000-0000-0000-0000-0000000000d1'),
  ('rd2', 'ro2', 1, 'external_url', 'https://x.test/LAIN', 'valid', '00000000-0000-0000-0000-0000000000d1'),
  ('rd3', 'ro3', 1, 'external_url', 'https://x.test/3', 'valid', '00000000-0000-0000-0000-0000000000d1');

select is(public.release_escrow('ro1') ->> 'status', 'released', 'escrow dicairkan');
select is((select balance from public.wallets where user_id = '00000000-0000-0000-0000-0000000000c1'), 98000::bigint, 'kreator menerima amount - floor(2%)');
select is((select amount from public.transactions where reference_id = 're1' and type = 'fee'), 2000::bigint, 'fee 2% dicatat');
select is((select status from public.escrows where id = 're1'), 'released', 'escrow released');
select is((select status from public.orders where id = 'ro1'), 'completed', 'order completed');
select is(public.release_escrow('ro1') ->> 'status', 'already_released', 'panggilan ulang no-op');
select is((select balance from public.wallets where user_id = '00000000-0000-0000-0000-0000000000c1'), 98000::bigint, 'saldo tidak bertambah lagi');

-- Snapshot validasi tidak cocok → tidak cair.
select is(public.release_escrow('ro2') ->> 'status', 'not_releasable', 'validasi tidak cocok → not_releasable');
select is((select status from public.escrows where id = 're2'), 'held', 'escrow tetap held');

-- Escrow lama fee_rate 0 + status releasing → aturan 2%.
select is(public.release_escrow('ro3') ->> 'feeAmount', '200', 'fee_rate 0 diperlakukan 0.02');
select is((select balance from public.wallets where user_id = '00000000-0000-0000-0000-0000000000c1'), 107800::bigint, 'kredit escrow releasing lama');

-- Exception di tengah → rollback total.
update public.escrows set status = 'held' where id = 're2';
update public.ratecard_deliverable_validations set evidence_url_snapshot = 'https://x.test/2' where deliverable_id = 'rd2';
create function pg_temp.boom() returns trigger language plpgsql as $$ begin raise exception 'boom'; end; $$;
create trigger boom before update on public.orders for each row when (new.status = 'completed') execute function pg_temp.boom();
select throws_ok($$select public.release_escrow('ro2')$$, 'P0001', 'boom', 'error di tengah RPC');
select is((select count(*)::int from public.transactions where reference_id = 're2'), 0, 'ledger ikut rollback');
select is((select balance from public.wallets where user_id = '00000000-0000-0000-0000-0000000000c1'), 107800::bigint, 'saldo tidak berubah');
drop trigger boom on public.orders;

select is((select count(*)::int from public.finance_reconciliation where diff <> 0), 0, 'rekonsiliasi 0 selisih');
select * from finish();
rollback;
