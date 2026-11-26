-- pgTAP: approve_deliverable, auto_approve_orders, reconcile_release_escrow, fee_rate_flip_check (0026).
begin;
create extension if not exists pgtap with schema extensions;
select plan(11);
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
insert into public.orders (id, umkm_id, creator_id, amount, status, review_deadline_at) values
  ('jo1', '00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-0000000000c1', 100000, 'in_progress', now() + interval '2 days'),
  ('jo2', '00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-0000000000c1', 50000, 'in_progress', now() - interval '1 hour'),
  ('jo3', '00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-0000000000c1', 20000, 'in_progress', null);
insert into public.escrows (id, order_id, amount, status, fee_rate) values
  ('je1', 'jo1', 100000, 'held', 0.02), ('je2', 'jo2', 50000, 'held', 0.02), ('je3', 'jo3', 20000, 'held', 0.02);
insert into public.deliverables (id, order_id, source, file_url, version, status) values
  ('jd1', 'jo1', 'external_url', 'https://x/1', 1, 'submitted'),
  ('jd2', 'jo2', 'external_url', 'https://x/2', 1, 'submitted'),
  ('jd3', 'jo3', 'external_url', 'https://x/3', 1, 'approved');
insert into public.ratecard_deliverable_validations (deliverable_id, order_id, deliverable_version, source_snapshot, evidence_url_snapshot, status, reviewed_by) values
  ('jd1', 'jo1', 1, 'external_url', 'https://x/1', 'valid', '00000000-0000-0000-0000-0000000000d1'),
  ('jd2', 'jo2', 1, 'external_url', 'https://x/2', 'valid', '00000000-0000-0000-0000-0000000000d1'),
  ('jd3', 'jo3', 1, 'external_url', 'https://x/3', 'valid', '00000000-0000-0000-0000-0000000000d1');

-- UMKM approve → escrow cair.
select is(public.approve_deliverable('jd1', '00000000-0000-0000-0000-0000000000a1', 'jo1') ->> 'release', 'released', 'approve melepas escrow');
select is((select status from public.orders where id = 'jo1'), 'completed', 'order completed');

-- Auto-approve (tenggat lewat) → escrow cair.
select is((private.auto_approve_orders() ->> 'releasedCount'), '1', 'auto-approve melepas escrow');
select is((select status from public.escrows where id = 'je2'), 'released', 'escrow jo2 released');

-- Reconcile: approved + valid tapi escrow masih held.
select is((private.reconcile_release_escrow() ->> 'released'), '1', 'reconcile mencairkan escrow tertinggal');
select is((private.reconcile_release_escrow() ->> 'released'), '0', 'reconcile ulang no-op');
select is((select balance from public.wallets where user_id = '00000000-0000-0000-0000-0000000000c1'), 166600::bigint, 'total kredit kreator = 98% × 170000');

select is((private.fee_rate_flip_check() ->> 'thresholdReached'), 'false', 'fee flip: di bawah threshold');
select is((select count(*)::int from cron.job where jobname in ('reconcile-release-escrow', 'fee-rate-flip', 'auto-approve-orders')), 3, 'job cron terdaftar');
select is((select count(*)::int from public.finance_reconciliation where diff <> 0), 0, 'rekonsiliasi 0 selisih');
select is(public.get_fee_rate(), 0.02, 'get_fee_rate default 0.02');
select * from finish();
rollback;
