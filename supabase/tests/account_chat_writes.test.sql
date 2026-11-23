-- pgTAP: RPC tulis profil, ToS, banding, notifikasi, chat (0018_account_chat_writes).
begin;
create extension if not exists pgtap with schema extensions;

select plan(47);

-- ── Akun ───────────────────────────────────────────────────────────────────
insert into auth.users (id, email, aud, role, raw_app_meta_data, raw_user_meta_data) values
  ('a1111111-1111-4111-8111-111111111111', 'umkm-a@example.test', 'authenticated', 'authenticated', '{}', '{}'),
  ('b2222222-2222-4222-8222-222222222222', 'umkm-b@example.test', 'authenticated', 'authenticated', '{}', '{}'),
  ('c1111111-1111-4111-8111-111111111111', 'kreator-1@example.test', 'authenticated', 'authenticated', '{}', '{}'),
  ('c2222222-2222-4222-8222-222222222222', 'kreator-2@example.test', 'authenticated', 'authenticated', '{}', '{}'),
  ('d1111111-1111-4111-8111-111111111111', 'suspend@example.test', 'authenticated', 'authenticated', '{}', '{}'),
  ('d2222222-2222-4222-8222-222222222222', 'lama@example.test', 'authenticated', 'authenticated', '{}', '{}');
insert into public.users (id, role, email, phone, status, suspended_at, tos_version, tos_accepted_at) values
  ('a1111111-1111-4111-8111-111111111111', 'umkm', 'umkm-a@example.test', null, 'active', null, 'v1', now()),
  ('b2222222-2222-4222-8222-222222222222', 'umkm', 'umkm-b@example.test', null, 'active', null, null, null),
  ('c1111111-1111-4111-8111-111111111111', 'creator', 'kreator-1@example.test', null, 'active', null, null, null),
  ('c2222222-2222-4222-8222-222222222222', 'creator', 'kreator-2@example.test', null, 'active', null, null, null),
  ('d1111111-1111-4111-8111-111111111111', 'creator', 'suspend@example.test', null, 'suspended', now() - interval '2 days', null, null),
  ('d2222222-2222-4222-8222-222222222222', 'creator', 'lama@example.test', null, 'suspended', now() - interval '20 days', null, null);
insert into public.umkm_profiles (user_id, business_name) values
  ('a1111111-1111-4111-8111-111111111111', 'Kopi A');
insert into public.creator_profiles (user_id, display_name) values
  ('c1111111-1111-4111-8111-111111111111', 'Budi'),
  ('c2222222-2222-4222-8222-222222222222', 'Sari');
insert into public.creator_social_accounts (creator_id, platform, username) values
  ('c1111111-1111-4111-8111-111111111111', 'tiktok', 'budi.tt');

-- ── Hak akses ──────────────────────────────────────────────────────────────
select ok(
  not exists (
    select 1 from pg_proc p
    where p.pronamespace = 'public'::regnamespace
      and p.proname in ('update_profile', 'accept_tos', 'create_appeal', 'mark_notifications_read',
                        'set_notification_read', 'delete_notification', 'create_conversation',
                        'send_message', 'mark_conversation_read', 'set_conversation_archived')
      and (has_function_privilege('anon', p.oid, 'execute')
        or has_function_privilege('authenticated', p.oid, 'execute'))
  ),
  'RPC tulis tidak bisa dieksekusi anon/authenticated'
);
select is(
  (select count(*)::int from pg_proc p
    where p.pronamespace = 'public'::regnamespace
      and p.proname in ('update_profile', 'accept_tos', 'create_appeal', 'mark_notifications_read',
                        'set_notification_read', 'delete_notification', 'create_conversation',
                        'send_message', 'mark_conversation_read', 'set_conversation_archived')
      and has_function_privilege('service_role', p.oid, 'execute')),
  10,
  'service_role bisa mengeksekusi 10 RPC'
);
select is(
  private.notification_id('abc', 'chat_message'),
  'ntf' || left(encode(sha256(convert_to('abc:chat_message', 'UTF8')), 'hex'), 29),
  'notification_id = ntf + 29 hex sha256(source:kind)'
);

-- ── update_profile UMKM ────────────────────────────────────────────────────
select is(
  public.update_profile('a1111111-1111-4111-8111-111111111111',
    '{"category":"kuliner","city":"Bandung","description":"pendek","isProfileCompleted":true,"email":"x@y"}')
    ->> 'isProfileCompleted',
  'false',
  'UMKM: deskripsi < 20 → belum lengkap; isProfileCompleted dari body diabaikan'
);
select is((select email from public.users where id = 'a1111111-1111-4111-8111-111111111111'),
  'umkm-a@example.test', 'UMKM: field di luar whitelist (email) tidak ditulis');
select is(
  public.update_profile('a1111111-1111-4111-8111-111111111111',
    '{"description":"Kopi susu gula aren sejak 2019","phone":"081234567890","address":"Jl. Merdeka"}'),
  jsonb_build_object(
    'success', true, 'role', 'umkm', 'isProfileCompleted', true,
    'businessName', 'Kopi A', 'category', 'kuliner', 'city', 'Bandung',
    'description', 'Kopi susu gula aren sejak 2019', 'tiktok', '', 'logoUrl', '',
    'address', 'Jl. Merdeka', 'phone', '081234567890'),
  'UMKM: lengkap → flag true, phone/address ke users, DTO sama dengan Function'
);
select is((select phone from public.users where id = 'a1111111-1111-4111-8111-111111111111'),
  '081234567890', 'UMKM: phone tersimpan di users');
select is(
  public.update_profile('a1111111-1111-4111-8111-111111111111', '{"description":""}') ->> 'isProfileCompleted',
  'true',
  'UMKM: flag tidak pernah turun'
);
select is(
  public.update_profile('a1111111-1111-4111-8111-111111111111', '{"logoUrl":"https://cdn/logo.png"}') ->> 'logoUrl',
  'https://cdn/logo.png',
  'UMKM: patch parsial (logoUrl saja)'
);

-- ── update_profile kreator ─────────────────────────────────────────────────
select is(
  public.update_profile('c1111111-1111-4111-8111-111111111111',
    '{"niche":"kuliner","city":"Jakarta","bio":"Kreator kuliner nusantara asli"}'),
  jsonb_build_object(
    'success', true, 'role', 'creator', 'isProfileCompleted', true,
    'displayName', 'Budi', 'niche', 'kuliner', 'city', 'Jakarta',
    'bio', 'Kreator kuliner nusantara asli', 'avatarUrl', '', 'bannerUrl', '',
    'tiktokUsername', 'budi.tt'),
  'Kreator: lengkap dengan TikTok → flag true, DTO sama dengan Function'
);
select is(
  public.update_profile('c2222222-2222-4222-8222-222222222222',
    '{"niche":"fashion","city":"Solo","bio":"Kreator fashion lokal yang keren"}') ->> 'isProfileCompleted',
  'false',
  'Kreator: tanpa TikTok → belum lengkap'
);
select throws_ok(
  $$ select public.update_profile('b2222222-2222-4222-8222-222222222222', '{"city":"X"}') $$,
  'P0002', 'Profil UMKM tidak ditemukan.', 'UMKM tanpa profil → P0002'
);
select throws_ok(
  $$ select public.update_profile('99999999-9999-4999-8999-999999999999', '{}') $$,
  'P0002', 'Profil pengguna tidak ditemukan.', 'user tidak ada → P0002'
);

-- ── accept_tos ─────────────────────────────────────────────────────────────
select is(
  public.accept_tos('a1111111-1111-4111-8111-111111111111', 'v3.1'),
  '{"success": true, "tos_version": "v3.1", "alreadyAccepted": false}'::jsonb,
  'accept_tos: versi baru → alreadyAccepted false'
);
select is((select tos_version from public.users where id = 'a1111111-1111-4111-8111-111111111111'),
  'v3.1', 'accept_tos: versi tersimpan');
select is(
  public.accept_tos('a1111111-1111-4111-8111-111111111111', 'v3.1') ->> 'alreadyAccepted',
  'true',
  'accept_tos: idempoten'
);
select throws_ok(
  $$ select public.accept_tos('a1111111-1111-4111-8111-111111111111', '') $$,
  '22023', 'tos_version wajib diisi.', 'accept_tos: versi kosong → 22023'
);

-- ── create_appeal ──────────────────────────────────────────────────────────
select throws_ok(
  $$ select public.create_appeal('c1111111-1111-4111-8111-111111111111', 'tolong') $$,
  '42501', 'Akun Anda berstatus aktif, tidak bisa banding.', 'banding: akun aktif → 42501'
);
select throws_ok(
  $$ select public.create_appeal('d2222222-2222-4222-8222-222222222222', 'tolong') $$,
  '42501', 'Batas waktu banding telah berakhir.', 'banding: lewat 14 hari → 42501'
);
select throws_ok(
  $$ select public.create_appeal('d1111111-1111-4111-8111-111111111111', '  ') $$,
  '22023', 'Alasan banding wajib diisi.', 'banding: alasan kosong → 22023'
);
select is(
  public.create_appeal('d1111111-1111-4111-8111-111111111111', 'Saya tidak curang', null, null) ->> 'status',
  'submitted',
  'banding: berhasil'
);
select is(
  (select action_ref || '|' || (deadline_at = (select suspended_at from public.users where id = 'd1111111-1111-4111-8111-111111111111') + interval '14 days')::text
     from public.appeals where user_id = 'd1111111-1111-4111-8111-111111111111'),
  'unknown|true',
  'banding: action_ref default "unknown", deadline = suspended_at + 14 hari'
);
select is(
  (select count(*)::int from public.notifications
    where user_id = 'd1111111-1111-4111-8111-111111111111' and title = 'Banding Diterima' and type = 'system'),
  1,
  'banding: notifikasi in-app dibuat'
);
select throws_ok(
  $$ select public.create_appeal('d1111111-1111-4111-8111-111111111111', 'lagi') $$,
  'P0001', 'Anda sudah memiliki banding yang sedang diproses.', 'banding: satu yang terbuka saja → P0001'
);

-- ── Notifikasi ─────────────────────────────────────────────────────────────
insert into public.notifications (id, user_id, title, message, type, is_read) values
  ('n1', 'a1111111-1111-4111-8111-111111111111', 't', 'm', 'system', false),
  ('n2', 'a1111111-1111-4111-8111-111111111111', 't', 'm', 'system', false),
  ('n3', 'a1111111-1111-4111-8111-111111111111', 't', 'm', 'system', true),
  ('nB', 'b2222222-2222-4222-8222-222222222222', 't', 'm', 'system', false);
select is(
  public.mark_notifications_read('a1111111-1111-4111-8111-111111111111', array['n1', 'n2', 'n3', 'nB', 'nope']),
  2,
  'mark_notifications_read: hanya milik sendiri & yang belum dibaca'
);
select is((select is_read from public.notifications where id = 'nB'), false, 'notifikasi orang lain tidak tersentuh');
select is(public.set_notification_read('a1111111-1111-4111-8111-111111111111', 'n1', false), false, 'set_notification_read: bisa set unread');
select throws_ok(
  $$ select public.set_notification_read('a1111111-1111-4111-8111-111111111111', 'nB', true) $$,
  'P0002', 'Notifikasi tidak ditemukan.', 'set_notification_read: milik orang lain → P0002'
);
select throws_ok(
  $$ select public.delete_notification('a1111111-1111-4111-8111-111111111111', 'nB') $$,
  'P0002', 'Notifikasi tidak ditemukan.', 'delete_notification: milik orang lain → P0002'
);
select ok(public.delete_notification('a1111111-1111-4111-8111-111111111111', 'n3'), 'delete_notification: milik sendiri');
select is((select count(*)::int from public.notifications where id = 'n3'), 0, 'notifikasi terhapus');

-- ── create_conversation ────────────────────────────────────────────────────
select ok(
  public.create_conversation('a1111111-1111-4111-8111-111111111111', 'c1111111-1111-4111-8111-111111111111') is not null,
  'create_conversation: membuat percakapan'
);
select is(
  public.create_conversation('a1111111-1111-4111-8111-111111111111', 'c1111111-1111-4111-8111-111111111111'),
  (select id from public.conversations
    where umkm_id = 'a1111111-1111-4111-8111-111111111111' and creator_id = 'c1111111-1111-4111-8111-111111111111'),
  'create_conversation: idempoten per pasangan'
);
select throws_ok(
  $$ select public.create_conversation('a1111111-1111-4111-8111-111111111111', 'b2222222-2222-4222-8222-222222222222') $$,
  '22023', 'Kreator tidak valid.', 'create_conversation: lawan bukan kreator → 22023'
);
select throws_ok(
  $$ select public.create_conversation('a1111111-1111-4111-8111-111111111111', 'a1111111-1111-4111-8111-111111111111') $$,
  '22023', 'Tidak bisa memulai percakapan dengan diri sendiri.', 'create_conversation: diri sendiri → 22023'
);

-- ── send_message ───────────────────────────────────────────────────────────
create temp table t_conv as
  select id from public.conversations
  where umkm_id = 'a1111111-1111-4111-8111-111111111111' and creator_id = 'c1111111-1111-4111-8111-111111111111';
create temp table t_msg as
  select public.send_message('a1111111-1111-4111-8111-111111111111', (select id from t_conv), '  Halo kak  ') as dto;
select is(
  (select dto - 'id' - 'createdAt' from t_msg),
  jsonb_build_object(
    'conversationId', (select id from t_conv), 'senderId', 'a1111111-1111-4111-8111-111111111111',
    'senderRole', 'umkm', 'type', 'text', 'content', 'Halo kak', 'isRead', false),
  'send_message: DTO ChatMessage (teks di-trim)'
);
select is(
  (select last_message from public.conversations where id = (select id from t_conv)),
  'Halo kak',
  'send_message: ringkasan percakapan diperbarui'
);
select is(
  (select user_id::text || '|' || type || '|' || message from public.notifications
    where id = private.notification_id((select dto ->> 'id' from t_msg), 'chat_message')),
  'c1111111-1111-4111-8111-111111111111|chat_message|Halo kak',
  'send_message: notifikasi in-app untuk lawan bicara'
);
select throws_ok(
  format($$ select public.send_message('b2222222-2222-4222-8222-222222222222', %L, 'hai') $$, (select id from t_conv)),
  'P0002', 'Percakapan tidak ditemukan.', 'send_message: bukan peserta → P0002'
);
select throws_ok(
  format($$ select public.send_message('a1111111-1111-4111-8111-111111111111', %L, '   ') $$, (select id from t_conv)),
  '22023', 'Pesan tidak boleh kosong.', 'send_message: pesan kosong → 22023'
);
select throws_ok(
  format($$ select public.send_message('a1111111-1111-4111-8111-111111111111', %L, repeat('x', 2001)) $$, (select id from t_conv)),
  '22023', 'Pesan maksimal 2000 karakter.', 'send_message: > 2000 karakter → 22023'
);

-- ── mark_conversation_read ────────────────────────────────────────────────
select public.send_message('c1111111-1111-4111-8111-111111111111', (select id from t_conv), 'balas 1');
select public.send_message('c1111111-1111-4111-8111-111111111111', (select id from t_conv), 'balas 2');
select is(
  public.mark_conversation_read('a1111111-1111-4111-8111-111111111111', (select id from t_conv)),
  2,
  'mark_conversation_read: hanya pesan lawan bicara yang belum dibaca'
);
select is(
  (select count(*)::int from public.messages
    where conversation_id = (select id from t_conv) and sender_id = 'a1111111-1111-4111-8111-111111111111' and read_at is not null),
  0,
  'mark_conversation_read: pesan sendiri tidak ditandai'
);
select throws_ok(
  format($$ select public.mark_conversation_read('b2222222-2222-4222-8222-222222222222', %L) $$, (select id from t_conv)),
  'P0002', 'Percakapan tidak ditemukan.', 'mark_conversation_read: bukan peserta → P0002'
);

-- ── set_conversation_archived ─────────────────────────────────────────────
select is(
  public.set_conversation_archived('c1111111-1111-4111-8111-111111111111', (select id from t_conv), true) ->> 'isArchived',
  'true',
  'arsip: kreator mengarsipkan'
);
select is(
  (select umkm_archived::text || '|' || creator_archived::text from public.conversations where id = (select id from t_conv)),
  'false|true',
  'arsip: hanya kolom milik peran pemanggil'
);
select throws_ok(
  format($$ select public.set_conversation_archived('b2222222-2222-4222-8222-222222222222', %L, true) $$, (select id from t_conv)),
  'P0002', 'Percakapan tidak ditemukan.', 'arsip: bukan peserta → P0002'
);

select * from finish();
rollback;
