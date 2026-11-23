-- pgTAP: RPC tulis rate card kreator Fase 6 (0020_creator_writes).
begin;
create extension if not exists pgtap with schema extensions;

select plan(21);

-- ── Hak eksekusi: hanya service_role ────────────────────────────────────────
select ok(
  not has_function_privilege('anon', 'public.creator_create_rate_card(uuid, text, text, text, integer, bigint, integer, text)', 'execute')
  and not has_function_privilege('authenticated', 'public.creator_create_rate_card(uuid, text, text, text, integer, bigint, integer, text)', 'execute')
  and has_function_privilege('service_role', 'public.creator_create_rate_card(uuid, text, text, text, integer, bigint, integer, text)', 'execute'),
  'creator_create_rate_card hanya service_role'
);
select ok(
  not has_function_privilege('anon', 'public.creator_update_rate_card_package(uuid, text, text, text, text, text, integer, bigint, integer, text)', 'execute')
  and not has_function_privilege('authenticated', 'public.creator_update_rate_card_package(uuid, text, text, text, text, text, integer, bigint, integer, text)', 'execute')
  and has_function_privilege('service_role', 'public.creator_update_rate_card_package(uuid, text, text, text, text, text, integer, bigint, integer, text)', 'execute'),
  'creator_update_rate_card_package hanya service_role'
);
select ok(
  not has_function_privilege('anon', 'public.creator_delete_rate_card(uuid, text, text)', 'execute')
  and not has_function_privilege('authenticated', 'public.creator_delete_rate_card(uuid, text, text)', 'execute')
  and has_function_privilege('service_role', 'public.creator_delete_rate_card(uuid, text, text)', 'execute'),
  'creator_delete_rate_card hanya service_role'
);

-- ── Fixture: K = kreator diuji, K2 = kreator lain, U = UMKM ─────────────────
insert into auth.users (id, email, aud, role, raw_app_meta_data, raw_user_meta_data) values
  ('c6000000-0000-0000-0000-000000000001', 'w-k@example.test', 'authenticated', 'authenticated', '{}', '{}'),
  ('c6000000-0000-0000-0000-000000000002', 'w-k2@example.test', 'authenticated', 'authenticated', '{}', '{}'),
  ('d6000000-0000-0000-0000-000000000001', 'w-u@example.test', 'authenticated', 'authenticated', '{}', '{}');
insert into public.users (id, role, email) values
  ('c6000000-0000-0000-0000-000000000001', 'creator', 'w-k@example.test'),
  ('c6000000-0000-0000-0000-000000000002', 'creator', 'w-k2@example.test'),
  ('d6000000-0000-0000-0000-000000000001', 'umkm', 'w-u@example.test');

-- ── create: parent + paket atomik, status, batas 3 ──────────────────────────
select is(
  (public.creator_create_rate_card('c6000000-0000-0000-0000-000000000001', 'Paket 1', 'Desk', 'Out', 3, 150000, 1, 'published')
    -> 'package' ->> 'name'),
  'Paket 1',
  'create mengembalikan paket'
);
select is(
  (select rc.status || '|' || rc.title from public.rate_cards rc
    where rc.creator_id = 'c6000000-0000-0000-0000-000000000001'),
  'published|Paket 1',
  'parent dibuat dengan judul = nama paket dan status dari argumen'
);
select is(
  (select count(*)::int from public.rate_card_packages pk
     join public.rate_cards rc on rc.id = pk.rate_card_id
    where rc.creator_id = 'c6000000-0000-0000-0000-000000000001'),
  1,
  'satu paket per parent'
);
do $$
begin
  perform public.creator_create_rate_card('c6000000-0000-0000-0000-000000000001', 'Paket 2', 'Desk', 'Out', 3, 1000, 0, 'draft');
  perform public.creator_create_rate_card('c6000000-0000-0000-0000-000000000001', 'Paket 3', 'Desk', 'Out', 3, 1000, 0, 'draft');
end
$$;
select throws_ok(
  $$ select public.creator_create_rate_card('c6000000-0000-0000-0000-000000000001', 'Paket 4', 'Desk', 'Out', 3, 1000, 0, 'draft') $$,
  'P0001',
  'Maksimal 3 paket. Hapus satu paket dulu.',
  'paket ke-4 ditolak (P0001, pesan lama)'
);
select is(
  (select count(*)::int from public.rate_cards where creator_id = 'c6000000-0000-0000-0000-000000000001'),
  3,
  'penolakan tidak menyisakan parent hantu'
);
select throws_ok(
  $$ select public.creator_create_rate_card('c6000000-0000-0000-0000-000000000001', 'X', 'D', 'O', 1, 1000, 0, 'archived') $$,
  '22023',
  null,
  'status asing ditolak'
);
select lives_ok(
  $$ select public.creator_create_rate_card('c6000000-0000-0000-0000-000000000002', 'K2', 'D', 'O', 1, 1000, 0, 'published') $$,
  'batas dihitung per kreator'
);

-- ── update: in-place + mirror, kepemilikan ──────────────────────────────────
create temp table t_ids on commit drop as
select rc.id as rc_id, pk.id as pk_id
from public.rate_cards rc join public.rate_card_packages pk on pk.rate_card_id = rc.id
where rc.creator_id = 'c6000000-0000-0000-0000-000000000001' and rc.title = 'Paket 1';
create temp table t_other on commit drop as
select rc.id as rc_id, pk.id as pk_id
from public.rate_cards rc join public.rate_card_packages pk on pk.rate_card_id = rc.id
where rc.creator_id = 'c6000000-0000-0000-0000-000000000002';

select is(
  public.creator_update_rate_card_package('c6000000-0000-0000-0000-000000000001',
    (select rc_id from t_other), (select pk_id from t_other), 'Curi', 'D', 'O', 1, 1000, 0, 'draft'),
  null,
  'update rate card kreator lain → NULL'
);
select is(
  (select name from public.rate_card_packages where id = (select pk_id from t_other)),
  'K2',
  'paket kreator lain tidak berubah'
);
select is(
  public.creator_update_rate_card_package('c6000000-0000-0000-0000-000000000001',
    (select rc_id from t_ids), (select pk_id from t_other), 'Salah', 'D', 'O', 1, 1000, 0, 'draft'),
  null,
  'paket yang bukan anak rate card itu → NULL'
);
select is(
  (public.creator_update_rate_card_package('c6000000-0000-0000-0000-000000000001',
    (select rc_id from t_ids), (select pk_id from t_ids), 'Paket 1b', 'D2', 'O2', 5, 200000, 2, 'draft') -> 'package' ->> 'id'),
  (select pk_id from t_ids),
  'update mempertahankan id paket (in-place)'
);
select is(
  (select rc.title || '|' || rc.status from public.rate_cards rc where rc.id = (select rc_id from t_ids)),
  'Paket 1b|draft',
  'judul + status di-mirror ke parent'
);
select is(
  (select rc.status from public.rate_cards rc where rc.id = (select rc_id from t_ids)
     and public.creator_update_rate_card_package('c6000000-0000-0000-0000-000000000001',
       (select rc_id from t_ids), (select pk_id from t_ids), 'Paket 1b', 'D2', 'O2', 5, 200000, 2, null) is not null),
  'draft',
  'p_status null tidak mengubah status'
);

-- ── delete: kepemilikan, order berjalan, cascade ───────────────────────────
select is(
  public.creator_delete_rate_card('c6000000-0000-0000-0000-000000000001', (select rc_id from t_other)),
  false,
  'hapus rate card kreator lain → false'
);
insert into public.orders (id, creator_id, umkm_id, package_id, amount, status) values
  ('ord-w-1', 'c6000000-0000-0000-0000-000000000001', 'd6000000-0000-0000-0000-000000000001',
   (select pk_id from t_ids), 200000, 'in_progress');
select throws_ok(
  $$ select public.creator_delete_rate_card('c6000000-0000-0000-0000-000000000001', (select rc_id from t_ids)) $$,
  'P0001',
  'Paket tidak bisa dihapus karena masih ada order berjalan. Jadikan Draft saja.',
  'order berjalan menolak hapus'
);
update public.orders set status = 'completed' where id = 'ord-w-1';
select is(
  public.creator_delete_rate_card('c6000000-0000-0000-0000-000000000001', (select rc_id from t_ids), (select pk_id from t_ids)),
  true,
  'hapus paket terakhir berhasil setelah order selesai'
);
select is(
  (select count(*)::int from public.rate_cards where id = (select rc_id from t_ids)),
  0,
  'parent tanpa paket ikut dihapus'
);
select is(
  (select package_id from public.orders where id = 'ord-w-1'),
  null,
  'orders.package_id menjadi NULL (FK set null), riwayat order tetap'
);

select * from finish();
rollback;
