-- pgTAP: 0029 — validasi Admin setelah UMKM approve mencairkan escrow (tidak macet).
begin;
create extension if not exists pgtap with schema extensions;
select plan(9);
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000009a1', 'umkm-rv@example.test'),
  ('00000000-0000-0000-0000-0000000009c1', 'creator-rv@example.test'),
  ('00000000-0000-0000-0000-0000000009d1', 'admin-rv@example.test');
insert into public.users (id, role, status, email) values
  ('00000000-0000-0000-0000-0000000009a1', 'umkm', 'active', 'umkm-rv@example.test'),
  ('00000000-0000-0000-0000-0000000009c1', 'creator', 'active', 'creator-rv@example.test'),
  ('00000000-0000-0000-0000-0000000009d1', 'admin', 'active', 'admin-rv@example.test');
insert into public.wallets (user_id) values
  ('00000000-0000-0000-0000-0000000009a1'), ('00000000-0000-0000-0000-0000000009c1');
-- offer_id diperlukan supaya terhitung order rate card (FK deferred → offer dibuat).
insert into public.conversations (id, umkm_id, creator_id) values
  ('rv-conv', '00000000-0000-0000-0000-0000000009a1', '00000000-0000-0000-0000-0000000009c1');
insert into public.offers (id, conversation_id, umkm_id, creator_id, title, price, deadline, revision_limit, status) values
  ('rv-off', 'rv-conv', '00000000-0000-0000-0000-0000000009a1', '00000000-0000-0000-0000-0000000009c1', 'RV', 100000, now() + interval '7 days', 2, 'accepted');
insert into public.orders (id, offer_id, umkm_id, creator_id, amount, status) values
  ('rv-o1', 'rv-off', '00000000-0000-0000-0000-0000000009a1', '00000000-0000-0000-0000-0000000009c1', 100000, 'in_progress');
insert into public.escrows (id, order_id, amount, status, fee_rate) values ('rv-e1', 'rv-o1', 100000, 'held', 0.02);
-- UMKM sudah menyetujui SEBELUM validasi Admin.
insert into public.deliverables (id, order_id, source, file_url, version, status) values
  ('rv-d1', 'rv-o1', 'external_url', 'https://x.test/rv', 1, 'approved');

select is(public.release_escrow('rv-o1') ->> 'status', 'not_releasable', 'tanpa validasi admin escrow belum cair');

select is(
  public.review_ratecard_deliverable('00000000-0000-0000-0000-0000000009d1', 'rv-d1', 'valid') -> 'release' ->> 'status',
  'released', 'validasi valid atas deliverable approved mencairkan escrow');
select is((select status from public.escrows where id = 'rv-e1'), 'released', 'escrow released');
select is((select status from public.orders where id = 'rv-o1'), 'completed', 'order completed');
select is((select balance from public.wallets where user_id = '00000000-0000-0000-0000-0000000009c1'),
  98000::bigint, 'kreator menerima amount - fee 2%');

select is(
  (public.review_ratecard_deliverable('00000000-0000-0000-0000-0000000009d1', 'rv-d1', 'valid') ->> 'alreadyReviewed')::boolean,
  true, 'review ulang identik → alreadyReviewed');
select is((select balance from public.wallets where user_id = '00000000-0000-0000-0000-0000000009c1'),
  98000::bigint, 'saldo tidak bertambah pada review ulang');

-- Deliverable submitted (belum disetujui UMKM): validasi valid TIDAK mencairkan.
insert into public.offers (id, conversation_id, umkm_id, creator_id, title, price, deadline, revision_limit, status) values
  ('rv-off2', 'rv-conv', '00000000-0000-0000-0000-0000000009a1', '00000000-0000-0000-0000-0000000009c1', 'RV2', 50000, now() + interval '7 days', 2, 'accepted');
insert into public.orders (id, offer_id, umkm_id, creator_id, amount, status) values
  ('rv-o2', 'rv-off2', '00000000-0000-0000-0000-0000000009a1', '00000000-0000-0000-0000-0000000009c1', 50000, 'in_progress');
insert into public.escrows (id, order_id, amount, status, fee_rate) values ('rv-e2', 'rv-o2', 50000, 'held', 0.02);
insert into public.deliverables (id, order_id, source, file_url, version, status) values
  ('rv-d2', 'rv-o2', 'external_url', 'https://x.test/rv2', 1, 'submitted');
select is(
  public.review_ratecard_deliverable('00000000-0000-0000-0000-0000000009d1', 'rv-d2', 'valid') -> 'release',
  null, 'deliverable belum disetujui UMKM: validasi tidak mencairkan');

select is((select count(*)::int from public.finance_reconciliation where diff <> 0), 0, 'rekonsiliasi 0 selisih');
select * from finish();
rollback;
