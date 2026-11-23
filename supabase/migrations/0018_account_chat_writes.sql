-- =============================================================================
-- 0018_account_chat_writes — RPC tulis profil, ToS, banding, notifikasi, chat
-- (Fase 6).
--
-- Pengganti Function Appwrite:
--   update_profile               ← update-profile (+ completion.js)
--   accept_tos                   ← accept-tos (action "accept")
--   create_appeal                ← create-appeal
--   mark_notifications_read      ← mark-notifications-read
--   set_notification_read        ← updateDocument notifications dari browser
--   delete_notification          ← deleteDocument notifications dari browser
--   create_conversation          ← create-conversation
--   send_message                 ← send-message + send-chat-notification (in-app saja)
--   mark_conversation_read       ← mark-conversation-read (SATU UPDATE, bukan loop)
--   set_conversation_archived    ← patch-conversation-archive
--
-- Semua: SECURITY INVOKER (dipanggil client service role dari Route Handler
-- yang sudah memverifikasi sesi; service role melewati RLS), search_path
-- kosong, EXECUTE hanya service_role. Kepemilikan SELALU ditegakkan di dalam
-- fungsi lewat argumen p_user_id (= userId sesi, bukan dari body).
--
-- Kode error (dipetakan route ke HTTP, pesan diteruskan ke UI):
--   P0002 → 404, 42501 → 403, 22023 → 400, P0001 → 409.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Helper: ID notifikasi deterministik (sama dengan Function lama:
-- `ntf` + 29 hex pertama sha256("<sourceId>:<kind>")). Membuat notifikasi
-- idempoten: insert ulang untuk sumber yang sama → on conflict do nothing.
-- -----------------------------------------------------------------------------
create or replace function private.notification_id(p_source_id text, p_kind text)
returns text
language sql
immutable
set search_path = ''
as $$
  select 'ntf' || left(encode(sha256(convert_to(p_source_id || ':' || p_kind, 'UTF8')), 'hex'), 29);
$$;

revoke all on function private.notification_id(text, text) from public, anon, authenticated;
grant execute on function private.notification_id(text, text) to service_role;

-- -----------------------------------------------------------------------------
-- update_profile — whitelist field per role, completion dihitung server-side,
-- flag tidak pernah turun (true → true). p_patch = objek camelCase seperti body
-- Function lama; key yang tidak di-whitelist diabaikan, `isProfileCompleted`
-- di body selalu diabaikan.
-- -----------------------------------------------------------------------------
create or replace function public.update_profile(p_user_id uuid, p_patch jsonb)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_user public.users;
  v_umkm public.umkm_profiles;
  v_creator public.creator_profiles;
  v_was_completed boolean;
  v_evaluated boolean;
  v_tiktok text;
  v_patch jsonb := coalesce(p_patch, '{}'::jsonb);
begin
  select * into v_user from public.users u where u.id = p_user_id for update;
  if not found then
    raise exception 'Profil pengguna tidak ditemukan.' using errcode = 'P0002';
  end if;

  if v_user.role = 'umkm' then
    select * into v_umkm from public.umkm_profiles p where p.user_id = p_user_id for update;
    if not found then
      raise exception 'Profil UMKM tidak ditemukan.' using errcode = 'P0002';
    end if;
    v_was_completed := v_umkm.is_profile_completed;

    update public.umkm_profiles p set
      business_name = case when v_patch ? 'businessName' then v_patch->>'businessName' else p.business_name end,
      category = case when v_patch ? 'category' then v_patch->>'category' else p.category end,
      city = case when v_patch ? 'city' then v_patch->>'city' else p.city end,
      description = case when v_patch ? 'description' then v_patch->>'description' else p.description end,
      tiktok = case when v_patch ? 'tiktok' then v_patch->>'tiktok' else p.tiktok end,
      logo_url = case when v_patch ? 'logoUrl' then v_patch->>'logoUrl' else p.logo_url end
    where p.id = v_umkm.id
    returning * into v_umkm;

    if v_patch ? 'phone' or v_patch ? 'address' then
      update public.users u set
        phone = case when v_patch ? 'phone' then v_patch->>'phone' else u.phone end,
        address = case when v_patch ? 'address' then v_patch->>'address' else u.address end
      where u.id = p_user_id
      returning * into v_user;
    end if;

    -- completion.js: businessName, category, city non-empty; description ≥ 20;
    -- phone seluler Indonesia. TikTok UMKM opsional.
    v_evaluated :=
      char_length(btrim(coalesce(v_umkm.business_name, ''))) > 0
      and char_length(btrim(coalesce(v_umkm.category, ''))) > 0
      and char_length(btrim(coalesce(v_umkm.city, ''))) > 0
      and char_length(btrim(coalesce(v_umkm.description, ''))) >= 20
      and btrim(coalesce(v_user.phone, '')) ~ '^(\+62|62|0)8[0-9]{8,11}$';

    if v_was_completed is distinct from (v_was_completed or v_evaluated) then
      update public.umkm_profiles p set is_profile_completed = true
      where p.id = v_umkm.id
      returning * into v_umkm;
    end if;

    return jsonb_build_object(
      'success', true,
      'role', 'umkm',
      'isProfileCompleted', v_umkm.is_profile_completed,
      'businessName', v_umkm.business_name,
      'category', v_umkm.category,
      'city', v_umkm.city,
      'description', v_umkm.description,
      'tiktok', coalesce(v_umkm.tiktok, ''),
      'logoUrl', coalesce(v_umkm.logo_url, ''),
      'address', coalesce(v_user.address, ''),
      'phone', coalesce(v_user.phone, '')
    );
  elsif v_user.role = 'creator' then
    select * into v_creator from public.creator_profiles p where p.user_id = p_user_id for update;
    if not found then
      raise exception 'Profil kreator tidak ditemukan.' using errcode = 'P0002';
    end if;
    v_was_completed := v_creator.is_profile_completed;

    update public.creator_profiles p set
      display_name = case when v_patch ? 'displayName' then v_patch->>'displayName' else p.display_name end,
      niche = case when v_patch ? 'niche' then nullif(v_patch->>'niche', '') else p.niche end,
      city = case when v_patch ? 'city' then v_patch->>'city' else p.city end,
      bio = case when v_patch ? 'bio' then v_patch->>'bio' else p.bio end,
      avatar_url = case when v_patch ? 'avatarUrl' then v_patch->>'avatarUrl' else p.avatar_url end,
      banner_url = case when v_patch ? 'bannerUrl' then v_patch->>'bannerUrl' else p.banner_url end
    where p.id = v_creator.id
    returning * into v_creator;

    select s.username into v_tiktok
    from public.creator_social_accounts s
    where s.creator_id = p_user_id and s.platform = 'tiktok'
    limit 1;

    -- completion.js: displayName, niche, city non-empty; bio ≥ 20; TikTok ada.
    v_evaluated :=
      char_length(btrim(coalesce(v_creator.display_name, ''))) > 0
      and char_length(btrim(coalesce(v_creator.niche, ''))) > 0
      and char_length(btrim(coalesce(v_creator.city, ''))) > 0
      and char_length(btrim(coalesce(v_creator.bio, ''))) >= 20
      and char_length(btrim(coalesce(v_tiktok, ''))) > 0;

    if v_was_completed is distinct from (v_was_completed or v_evaluated) then
      update public.creator_profiles p set is_profile_completed = true
      where p.id = v_creator.id
      returning * into v_creator;
    end if;

    return jsonb_build_object(
      'success', true,
      'role', 'creator',
      'isProfileCompleted', v_creator.is_profile_completed,
      'displayName', v_creator.display_name,
      'niche', v_creator.niche,
      'city', v_creator.city,
      'bio', v_creator.bio,
      'avatarUrl', coalesce(v_creator.avatar_url, ''),
      'bannerUrl', coalesce(v_creator.banner_url, ''),
      'tiktokUsername', coalesce(v_tiktok, '')
    );
  else
    raise exception 'Role tidak didukung untuk update profil.' using errcode = '22023';
  end if;
end;
$$;

-- -----------------------------------------------------------------------------
-- accept_tos — idempoten. Validasi versi (== versi aktif) dilakukan route.
-- -----------------------------------------------------------------------------
create or replace function public.accept_tos(p_user_id uuid, p_version text)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_user public.users;
begin
  if nullif(btrim(coalesce(p_version, '')), '') is null then
    raise exception 'tos_version wajib diisi.' using errcode = '22023';
  end if;

  select * into v_user from public.users u where u.id = p_user_id for update;
  if not found then
    raise exception 'Profil pengguna tidak ditemukan.' using errcode = 'P0002';
  end if;

  if v_user.tos_version = p_version and v_user.tos_accepted_at is not null then
    return jsonb_build_object('success', true, 'alreadyAccepted', true, 'tos_version', p_version);
  end if;

  update public.users u
     set tos_version = p_version,
         tos_accepted_at = now()
   where u.id = p_user_id;

  return jsonb_build_object('success', true, 'alreadyAccepted', false, 'tos_version', p_version);
end;
$$;

-- -----------------------------------------------------------------------------
-- create_appeal — banding akun nonaktif dalam 14 hari sejak suspend, maksimal
-- satu banding terbuka. Baris users dikunci supaya dua request bersamaan tidak
-- sama-sama lolos cek "banding terbuka".
-- -----------------------------------------------------------------------------
create or replace function public.create_appeal(
  p_user_id uuid,
  p_reason text,
  p_evidence text default null,
  p_action_ref text default null
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_user public.users;
  v_deadline timestamptz;
  v_sla timestamptz := now() + interval '7 days';
  v_appeal_id text;
  v_notification_id text;
begin
  if nullif(btrim(coalesce(p_reason, '')), '') is null then
    raise exception 'Alasan banding wajib diisi.' using errcode = '22023';
  end if;

  select * into v_user from public.users u where u.id = p_user_id for update;
  if not found then
    raise exception 'Profil pengguna tidak ditemukan.' using errcode = 'P0002';
  end if;
  if v_user.status = 'active' then
    raise exception 'Akun Anda berstatus aktif, tidak bisa banding.' using errcode = '42501';
  end if;
  if v_user.suspended_at is null then
    raise exception 'Tanggal suspend tidak ditemukan.' using errcode = '22023';
  end if;

  v_deadline := v_user.suspended_at + interval '14 days';
  if now() > v_deadline then
    raise exception 'Batas waktu banding telah berakhir.' using errcode = '42501';
  end if;

  if exists (
    select 1 from public.appeals a
    where a.user_id = p_user_id and a.status in ('submitted', 'under_review')
  ) then
    raise exception 'Anda sudah memiliki banding yang sedang diproses.' using errcode = 'P0001';
  end if;

  insert into public.appeals (user_id, action_ref, reason, evidence, deadline_at, sla_decided_at, status)
  values (
    p_user_id,
    coalesce(nullif(btrim(coalesce(p_action_ref, '')), ''), 'unknown'),
    p_reason,
    nullif(p_evidence, ''),
    v_deadline,
    v_sla,
    'submitted'
  )
  returning id into v_appeal_id;

  v_notification_id := private.notification_id(v_appeal_id, 'appeal_submitted');
  insert into public.notifications (id, user_id, title, message, type, is_read)
  values (
    v_notification_id,
    p_user_id,
    'Banding Diterima',
    'Banding Anda telah kami terima dan akan direview dalam waktu 7 hari kerja.',
    'system',
    false
  )
  on conflict (id) do nothing;

  return jsonb_build_object(
    'appealId', v_appeal_id,
    'status', 'submitted',
    'slaDecidedAt', v_sla,
    'notificationId', v_notification_id
  );
end;
$$;

-- -----------------------------------------------------------------------------
-- Notifikasi — hanya milik sendiri.
-- -----------------------------------------------------------------------------
create or replace function public.mark_notifications_read(p_user_id uuid, p_ids text[])
returns integer
language sql
security invoker
set search_path = ''
as $$
  with updated as (
    update public.notifications n
       set is_read = true
     where n.user_id = p_user_id
       and n.id = any (p_ids)
       and not n.is_read
    returning 1
  )
  select count(*)::integer from updated;
$$;

create or replace function public.set_notification_read(p_user_id uuid, p_id text, p_is_read boolean)
returns boolean
language plpgsql
security invoker
set search_path = ''
as $$
begin
  update public.notifications n
     set is_read = p_is_read
   where n.id = p_id and n.user_id = p_user_id;
  if not found then
    raise exception 'Notifikasi tidak ditemukan.' using errcode = 'P0002';
  end if;
  return p_is_read;
end;
$$;

create or replace function public.delete_notification(p_user_id uuid, p_id text)
returns boolean
language plpgsql
security invoker
set search_path = ''
as $$
begin
  delete from public.notifications n where n.id = p_id and n.user_id = p_user_id;
  if not found then
    raise exception 'Notifikasi tidak ditemukan.' using errcode = 'P0002';
  end if;
  return true;
end;
$$;

-- -----------------------------------------------------------------------------
-- create_conversation — idempoten per pasangan (unique umkm_id, creator_id).
-- Pemanggil selalu UMKM (route memakai requireUser role umkm); lawan harus akun
-- kreator yang ada.
-- -----------------------------------------------------------------------------
create or replace function public.create_conversation(p_umkm_id uuid, p_creator_id uuid)
returns text
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_id text;
begin
  if p_creator_id is null or p_creator_id = p_umkm_id then
    raise exception 'Tidak bisa memulai percakapan dengan diri sendiri.' using errcode = '22023';
  end if;
  if not exists (
    select 1 from public.users u where u.id = p_creator_id and u.role = 'creator'
  ) then
    raise exception 'Kreator tidak valid.' using errcode = '22023';
  end if;

  insert into public.conversations (umkm_id, creator_id, last_message, last_message_at, is_archived)
  values (p_umkm_id, p_creator_id, '', now(), false)
  on conflict (umkm_id, creator_id) do nothing
  returning id into v_id;

  if v_id is null then
    select c.id into v_id
    from public.conversations c
    where c.umkm_id = p_umkm_id and c.creator_id = p_creator_id;
  end if;
  return v_id;
end;
$$;

-- -----------------------------------------------------------------------------
-- send_message — pesan teks + ringkasan percakapan + notifikasi in-app lawan
-- bicara, dalam SATU transaksi. Mengembalikan DTO ChatMessage.
-- Bukan peserta → P0002 (404; tidak membocorkan keberadaan percakapan).
-- -----------------------------------------------------------------------------
create or replace function public.send_message(
  p_sender_id uuid,
  p_conversation_id text,
  p_content text
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_conv public.conversations;
  v_text text := btrim(coalesce(p_content, ''));
  v_msg public.messages;
  v_receiver uuid;
begin
  if v_text = '' then
    raise exception 'Pesan tidak boleh kosong.' using errcode = '22023';
  end if;
  if char_length(v_text) > 2000 then
    raise exception 'Pesan maksimal 2000 karakter.' using errcode = '22023';
  end if;

  select * into v_conv from public.conversations c where c.id = p_conversation_id;
  if not found or (v_conv.umkm_id <> p_sender_id and v_conv.creator_id <> p_sender_id) then
    raise exception 'Percakapan tidak ditemukan.' using errcode = 'P0002';
  end if;

  insert into public.messages (conversation_id, sender_id, message_type, content)
  values (p_conversation_id, p_sender_id, 'text', v_text)
  returning * into v_msg;

  update public.conversations c
     set last_message = left(v_text, 1000),
         last_message_at = v_msg.created_at
   where c.id = p_conversation_id;

  v_receiver := case when v_conv.umkm_id = p_sender_id then v_conv.creator_id else v_conv.umkm_id end;
  insert into public.notifications (id, user_id, title, message, type, is_read)
  values (
    private.notification_id(v_msg.id, 'chat_message'),
    v_receiver,
    'Pesan chat baru',
    left(v_text, 120),
    'chat_message',
    false
  )
  on conflict (id) do nothing;

  return jsonb_build_object(
    'id', v_msg.id,
    'conversationId', p_conversation_id,
    'senderId', p_sender_id,
    'senderRole', case when v_conv.umkm_id = p_sender_id then 'umkm' else 'creator' end,
    'type', 'text',
    'content', v_text,
    'isRead', false,
    'createdAt', v_msg.created_at
  );
end;
$$;

-- -----------------------------------------------------------------------------
-- mark_conversation_read — SATU update untuk semua pesan lawan bicara yang
-- belum dibaca (dulu loop sampai 100/200 update). Mengembalikan jumlahnya.
-- -----------------------------------------------------------------------------
create or replace function public.mark_conversation_read(p_user_id uuid, p_conversation_id text)
returns integer
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_count integer;
begin
  if not exists (
    select 1 from public.conversations c
    where c.id = p_conversation_id
      and (c.umkm_id = p_user_id or c.creator_id = p_user_id)
  ) then
    raise exception 'Percakapan tidak ditemukan.' using errcode = 'P0002';
  end if;

  update public.messages m
     set read_at = now()
   where m.conversation_id = p_conversation_id
     and m.sender_id <> p_user_id
     and m.read_at is null;
  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

-- -----------------------------------------------------------------------------
-- set_conversation_archived — arsip per peran (umkm_archived / creator_archived).
-- -----------------------------------------------------------------------------
create or replace function public.set_conversation_archived(
  p_user_id uuid,
  p_conversation_id text,
  p_archived boolean
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_conv public.conversations;
begin
  if p_archived is null then
    raise exception 'isArchived wajib boolean.' using errcode = '22023';
  end if;

  select * into v_conv from public.conversations c where c.id = p_conversation_id for update;
  if not found or (v_conv.umkm_id <> p_user_id and v_conv.creator_id <> p_user_id) then
    raise exception 'Percakapan tidak ditemukan.' using errcode = 'P0002';
  end if;

  if v_conv.umkm_id = p_user_id then
    update public.conversations c set umkm_archived = p_archived where c.id = p_conversation_id;
  else
    update public.conversations c set creator_archived = p_archived where c.id = p_conversation_id;
  end if;

  return jsonb_build_object('ok', true, 'conversationId', p_conversation_id, 'isArchived', p_archived);
end;
$$;

-- -----------------------------------------------------------------------------
-- Hak akses: hanya service_role.
-- -----------------------------------------------------------------------------
revoke all on function public.update_profile(uuid, jsonb) from public, anon, authenticated;
revoke all on function public.accept_tos(uuid, text) from public, anon, authenticated;
revoke all on function public.create_appeal(uuid, text, text, text) from public, anon, authenticated;
revoke all on function public.mark_notifications_read(uuid, text[]) from public, anon, authenticated;
revoke all on function public.set_notification_read(uuid, text, boolean) from public, anon, authenticated;
revoke all on function public.delete_notification(uuid, text) from public, anon, authenticated;
revoke all on function public.create_conversation(uuid, uuid) from public, anon, authenticated;
revoke all on function public.send_message(uuid, text, text) from public, anon, authenticated;
revoke all on function public.mark_conversation_read(uuid, text) from public, anon, authenticated;
revoke all on function public.set_conversation_archived(uuid, text, boolean) from public, anon, authenticated;

grant execute on function public.update_profile(uuid, jsonb) to service_role;
grant execute on function public.accept_tos(uuid, text) to service_role;
grant execute on function public.create_appeal(uuid, text, text, text) to service_role;
grant execute on function public.mark_notifications_read(uuid, text[]) to service_role;
grant execute on function public.set_notification_read(uuid, text, boolean) to service_role;
grant execute on function public.delete_notification(uuid, text) to service_role;
grant execute on function public.create_conversation(uuid, uuid) to service_role;
grant execute on function public.send_message(uuid, text, text) to service_role;
grant execute on function public.mark_conversation_read(uuid, text) to service_role;
grant execute on function public.set_conversation_archived(uuid, text, boolean) to service_role;
