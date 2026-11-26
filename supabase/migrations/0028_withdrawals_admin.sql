-- =============================================================================
-- 0028_withdrawals_admin — penarikan saldo + aksi admin terhadap user (Fase 8).
--
--   request_withdrawal(...)      ← request-withdrawal (withdrawal-transaction.js)
--   transition_withdrawal(...)   ← review-withdrawal  (withdrawal-transition.js)
--   admin_suspend_user(...)      ← suspend-user
--   admin_unsuspend_user(...)    ← unsuspend-user
--   admin_verify_kyc(...)        ← verify-kyc
--   admin_review_appeal(...)     ← review-appeal
--
-- Prinsip uang (08-keuangan.md):
--   * SECURITY DEFINER, search_path = '', EXECUTE hanya service_role.
--   * Saldo HANYA lewat private.post_ledger (0025): ledger dulu, saldo kemudian,
--     idempoten per (reference_type, reference_id, type). Overdraw → CHECK
--     wallets.balance >= 0 → seluruh transaksi rollback.
--   * Urutan kunci: users (serialisasi per pemohon) → withdrawals → wallets.
--   * Transisi status bersyarat (status lama dicek di baris yang dikunci).
--   * Setiap aksi admin dicatat private.log_admin_action dalam transaksi yang sama.
--
-- Kode error (dipetakan route): 22023 → 400, 42501 → 403, P0002 → 404,
-- P0001 → 409 (hint 'rate_limited' → 429).
-- =============================================================================

-- -----------------------------------------------------------------------------
-- ID withdrawal deterministik dari (user, requestKey): "wd" + 32 hex sha256 —
-- rumus sama dengan Function lama. Kunci idempotensi request ganda.
-- -----------------------------------------------------------------------------
create or replace function private.withdrawal_id(p_user_id uuid, p_request_key text)
returns text
language sql
immutable
set search_path = ''
as $$
  select 'wd' || left(encode(sha256(convert_to(p_user_id::text || ':' || p_request_key, 'UTF8')), 'hex'), 32);
$$;

revoke all on function private.withdrawal_id(uuid, text) from public, anon, authenticated;
grant execute on function private.withdrawal_id(uuid, text) to service_role;

-- -----------------------------------------------------------------------------
-- request_withdrawal — reserve saldo: withdrawal `requested` + ledger
-- `withdrawal` (debit, status pending) dalam SATU transaksi.
--
-- Guard inti (selalu): nominal/minimum, data rekening, role (kreator; UMKM
-- hanya dari refund/sisa budget dan wajib punya ledger refund), akun aktif,
-- ToS versi berjalan, saldo cukup, double-submit 60 detik.
-- Guard lanjutan (p_advanced_guards, default mati seperti
-- WITHDRAWAL_ADVANCED_GUARDS_ENABLED): email terverifikasi untuk penarikan
-- pertama, KYC untuk nominal besar, limit harian, cooling rekening baru.
-- -----------------------------------------------------------------------------
create or replace function public.request_withdrawal(
  p_user_id uuid,
  p_request_key text,
  p_amount bigint,
  p_payout_method text,
  p_provider_name text,
  p_account_number text,
  p_account_name text,
  p_tos_version text,
  p_source_origin text default null,
  p_minimum bigint default 50000,
  p_advanced_guards boolean default false,
  p_kyc_threshold bigint default 5000000,
  p_per_day_limit integer default 3,
  p_cooling_days integer default 3
)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_user public.users;
  v_provider text := btrim(coalesce(p_provider_name, ''));
  v_account text := btrim(coalesce(p_account_number, ''));
  v_name text := btrim(coalesce(p_account_name, ''));
  v_key text := coalesce(p_request_key, '');
  v_source text;
  v_id text;
  v_existing public.withdrawals;
  v_row public.withdrawals;
  v_tx text;
  v_balance bigint;
  v_today integer;
begin
  -- 1. Validasi payload (port validatePayload).
  if p_amount is null or p_amount <= 0 then
    raise exception 'Jumlah penarikan tidak valid' using errcode = '22023';
  end if;
  if p_amount < coalesce(p_minimum, 0) then
    raise exception 'Minimum penarikan Rp%', to_char(p_minimum, 'FM999G999G999G999') using errcode = '22023';
  end if;
  if p_payout_method is null or p_payout_method not in ('bank', 'ewallet') then
    raise exception 'Metode penarikan tidak valid' using errcode = '22023';
  end if;
  if v_provider = '' or v_account = '' or v_name = '' then
    raise exception 'Lengkapi data penarikan' using errcode = '22023';
  end if;
  if v_account !~ '^\d{6,20}$' then
    raise exception 'Nomor rekening tidak valid' using errcode = '22023';
  end if;
  if char_length(v_provider) > 100 then
    raise exception 'Nama bank/e-wallet terlalu panjang' using errcode = '22023';
  end if;
  if char_length(v_name) > 255 then
    raise exception 'Nama pemilik rekening terlalu panjang' using errcode = '22023';
  end if;
  if v_key !~ '^[A-Za-z0-9-]{8,64}$' then
    raise exception 'requestKey wajib diisi' using errcode = '22023';
  end if;

  -- 2. Kunci baris users: serialisasi semua request penarikan satu pemohon
  --    (limit harian, double-submit, dan cek saldo tidak bisa balapan).
  select * into v_user from public.users u where u.id = p_user_id for update;
  if not found then
    raise exception 'Profil pengguna tidak ditemukan' using errcode = 'P0002';
  end if;

  -- 3. Role + sumber saldo.
  if v_user.role = 'creator' then
    v_source := 'creator';
  elsif v_user.role = 'umkm' then
    if p_source_origin is null or p_source_origin not in ('umkm_refund', 'umkm_budget')
       or not exists (
         select 1 from public.transactions t
         where t.user_id = p_user_id and t.type = 'refund'
       ) then
      raise exception 'Saldo UMKM hanya dapat ditarik dari refund atau sisa budget.' using errcode = '42501';
    end if;
    v_source := p_source_origin;
  else
    raise exception 'Hanya kreator yang dapat menarik saldo.' using errcode = '42501';
  end if;

  if v_user.status <> 'active' then
    raise exception 'Akun Anda sedang tidak aktif.' using errcode = '42501';
  end if;
  if v_user.tos_version is distinct from p_tos_version or v_user.tos_accepted_at is null then
    raise exception 'Setujui T&C terbaru terlebih dahulu.' using errcode = '42501';
  end if;

  -- 4. Guard lanjutan (kebijakan strict; default mati).
  if coalesce(p_advanced_guards, false) then
    if v_user.email_verified_at is null
       and not exists (select 1 from public.withdrawals w where w.user_id = p_user_id) then
      raise exception 'Verifikasi email sebelum penarikan pertama.' using errcode = '42501';
    end if;
    if p_amount >= coalesce(p_kyc_threshold, 0) and v_user.kyc_status <> 'verified' then
      raise exception 'Verifikasi KYC dulu melalui WhatsApp admin.' using errcode = '42501';
    end if;
  end if;

  -- 5. Idempotensi: requestKey yang sama → withdrawal yang sama.
  v_id := private.withdrawal_id(p_user_id, v_key);
  select * into v_existing from public.withdrawals w where w.id = v_id for update;
  if found then
    if v_existing.amount <> p_amount
       or v_existing.payout_method <> p_payout_method
       or v_existing.provider_name <> v_provider
       or v_existing.account_number <> v_account
       or v_existing.account_name <> v_name
       or v_existing.status <> 'requested' then
      raise exception 'Permintaan penarikan ini sudah diproses.' using errcode = 'P0001';
    end if;
    select t.id into v_tx
    from public.transactions t
    where t.reference_type = 'withdrawal' and t.reference_id = v_id and t.type = 'withdrawal';
    select w.balance into v_balance from public.wallets w where w.user_id = p_user_id;
    return jsonb_build_object(
      'withdrawalId', v_existing.id,
      'amount', v_existing.amount,
      'status', 'requested',
      'requestedAt', v_existing.created_at,
      'balanceAfter', coalesce(v_balance, 0),
      'transactionId', v_tx,
      'alreadyRequested', true
    );
  end if;

  -- 6. Limit harian + cooling (hanya klaim baru, guard lanjutan).
  if coalesce(p_advanced_guards, false) then
    select count(*)::integer into v_today
    from public.withdrawals w
    where w.user_id = p_user_id
      and w.status <> 'failed'
      and w.created_at >= date_trunc('day', now());
    if v_today >= coalesce(p_per_day_limit, 3) then
      raise exception 'Batas penarikan harian tercapai (%/hari).', coalesce(p_per_day_limit, 3)
        using errcode = 'P0001', hint = 'rate_limited';
    end if;
    if exists (
      select 1 from public.withdrawals w
      where w.user_id = p_user_id
        and w.status in ('requested', 'processing', 'succeeded')
        and w.created_at >= now() - make_interval(days => coalesce(p_cooling_days, 3))
        and not (w.account_number = v_account and w.provider_name = v_provider)
    ) then
      raise exception 'Akun penarikan baru perlu pending % hari.', coalesce(p_cooling_days, 3)
        using errcode = 'P0001', hint = 'rate_limited';
    end if;
  end if;

  -- 7. Double-submit tidak sengaja (selalu aktif): nominal sama < 60 detik.
  if exists (
    select 1 from public.withdrawals w
    where w.user_id = p_user_id
      and w.amount = p_amount
      and w.status <> 'failed'
      and w.created_at > now() - interval '60 seconds'
  ) then
    raise exception 'Permintaan penarikan ini sudah diproses.' using errcode = 'P0001';
  end if;

  -- 8. Saldo cukup (pesan jelas; CHECK di wallets tetap jadi pengaman akhir).
  select w.balance into v_balance from public.wallets w where w.user_id = p_user_id;
  if not found then
    raise exception 'Wallet tidak ditemukan' using errcode = 'P0002';
  end if;
  if v_balance < p_amount then
    raise exception 'Saldo tidak mencukupi' using errcode = 'P0001';
  end if;

  -- 9. withdrawals → wallets: baris withdrawal, lalu ledger debit (post_ledger).
  insert into public.withdrawals (
    id, user_id, amount, payout_method, provider_name, account_number, account_name,
    status, requester_role, source_origin, kyc_status
  )
  values (
    v_id, p_user_id, p_amount, p_payout_method, v_provider, v_account, v_name,
    'requested', v_user.role, v_source, v_user.kyc_status
  )
  returning * into v_row;

  begin
    v_tx := private.post_ledger(p_user_id, 'withdrawal', p_amount, 'withdrawal', v_id, 'pending');
  exception when check_violation then
    raise exception 'Saldo tidak mencukupi' using errcode = 'P0001';
  end;
  if v_tx is null then
    -- Ledger sudah ada untuk withdrawal baru = data tidak konsisten. Batalkan.
    raise exception 'Ledger penarikan sudah ada. Hubungi admin.' using errcode = 'P0001';
  end if;

  select w.balance into v_balance from public.wallets w where w.user_id = p_user_id;

  insert into public.notifications (id, user_id, title, message, type, is_read)
  values (
    private.notification_id(v_id, 'withdrawal'),
    p_user_id,
    'Pengajuan Penarikan Diterima',
    left(format('Pengajuan penarikan Rp%s diterima. Saldo sudah dialokasikan dan umumnya diproses dalam 1–2 hari kerja.',
      to_char(p_amount, 'FM999G999G999G999')), 1000),
    'keuangan',
    false
  )
  on conflict (id) do nothing;

  return jsonb_build_object(
    'withdrawalId', v_row.id,
    'amount', v_row.amount,
    'status', 'requested',
    'requestedAt', v_row.created_at,
    'balanceAfter', v_balance,
    'transactionId', v_tx,
    'alreadyRequested', false
  );
end;
$$;

comment on function public.request_withdrawal(uuid, text, bigint, text, text, text, text, text, text, bigint, boolean, bigint, integer, integer) is
  'Ajukan penarikan: withdrawal requested + ledger debit pending (atomik, idempoten per requestKey). Hanya service_role.';

-- -----------------------------------------------------------------------------
-- private.assert_active_admin — admin = users.role admin + status active.
-- (Route juga memeriksa app_metadata.role lewat requireAdmin.)
-- -----------------------------------------------------------------------------
create or replace function private.assert_active_admin(p_admin_id uuid)
returns void
language plpgsql
stable
set search_path = ''
as $$
begin
  if not exists (
    select 1 from public.users u
    where u.id = p_admin_id and u.role = 'admin' and u.status = 'active'
  ) then
    raise exception 'Akses Admin ditolak.' using errcode = '42501';
  end if;
end;
$$;

revoke all on function private.assert_active_admin(uuid) from public, anon, authenticated;
grant execute on function private.assert_active_admin(uuid) to service_role;

-- -----------------------------------------------------------------------------
-- transition_withdrawal — review admin (port withdrawal-transition.js):
--   start_processing : requested  → processing
--   mark_succeeded   : processing → succeeded (ledger pending → completed)
--   fail             : requested|processing → reversed
--                      (ledger debit → failed + ledger withdrawal_reversal kredit)
-- Transisi lain → 409. Reversal idempoten (unique ledger + status bersyarat).
-- -----------------------------------------------------------------------------
create or replace function public.transition_withdrawal(
  p_admin_id uuid,
  p_withdrawal_id text,
  p_action text,
  p_transfer_reference text default null,
  p_failure_reason text default null,
  p_admin_note text default null
)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_w public.withdrawals;
  v_primary public.transactions;
  v_ref text := nullif(left(btrim(coalesce(p_transfer_reference, '')), 255), '');
  v_reason text := nullif(left(btrim(coalesce(p_failure_reason, '')), 500), '');
  v_note text := nullif(left(btrim(coalesce(p_admin_note, '')), 1000), '');
  v_status text;
  v_amount_text text;
begin
  if p_action is null or p_action not in ('start_processing', 'mark_succeeded', 'fail') then
    raise exception 'Action withdrawal tidak valid.' using errcode = '22023';
  end if;
  if p_action = 'mark_succeeded' and v_ref is null then
    raise exception 'Referensi transfer wajib diisi.' using errcode = '22023';
  end if;
  if p_action = 'fail' and v_reason is null then
    raise exception 'Alasan kegagalan wajib diisi.' using errcode = '22023';
  end if;

  perform private.assert_active_admin(p_admin_id);

  select * into v_w from public.withdrawals w where w.id = p_withdrawal_id for update;
  if not found then
    raise exception 'Withdrawal tidak ditemukan.' using errcode = 'P0002';
  end if;

  if (p_action = 'start_processing' and v_w.status <> 'requested')
     or (p_action = 'mark_succeeded' and v_w.status <> 'processing')
     or (p_action = 'fail' and v_w.status not in ('requested', 'processing')) then
    raise exception 'Transisi % dengan action % tidak diizinkan.', v_w.status, p_action using errcode = 'P0001';
  end if;

  if p_action <> 'start_processing' then
    select * into v_primary
    from public.transactions t
    where t.reference_type = 'withdrawal'
      and t.reference_id = v_w.id
      and t.type = 'withdrawal'
      and t.user_id = v_w.user_id
      and t.amount = v_w.amount
    for update;
    if not found or v_primary.status <> 'pending' then
      raise exception 'Ledger withdrawal pending tidak ditemukan.' using errcode = 'P0001';
    end if;
  end if;

  v_amount_text := to_char(v_w.amount, 'FM999G999G999G999');

  if p_action = 'start_processing' then
    update public.withdrawals w
       set status = 'processing', processing_at = now(), processed_by = p_admin_id
     where w.id = v_w.id;
    v_status := 'processing';
    insert into public.notifications (id, user_id, title, message, type, is_read)
    values (private.notification_id(v_w.id, 'withdrawal_processing'), v_w.user_id,
            'Penarikan Sedang Diproses', 'Penarikan saldo Anda sedang diproses tim Marketiv.',
            'keuangan', false)
    on conflict (id) do nothing;
  elsif p_action = 'mark_succeeded' then
    update public.transactions t set status = 'completed' where t.id = v_primary.id;
    update public.withdrawals w
       set status = 'succeeded', processed_at = now(), processed_by = p_admin_id,
           transfer_reference = v_ref, admin_note = coalesce(v_note, w.admin_note)
     where w.id = v_w.id;
    v_status := 'succeeded';
    insert into public.notifications (id, user_id, title, message, type, is_read)
    values (private.notification_id(v_w.id, 'withdrawal_succeeded'), v_w.user_id,
            'Penarikan Berhasil', format('Penarikan Rp%s berhasil ditransfer.', v_amount_text),
            'keuangan', false)
    on conflict (id) do nothing;
  else
    update public.transactions t set status = 'failed' where t.id = v_primary.id;
    -- Kredit balik lewat post_ledger (idempoten per withdrawal).
    perform private.post_ledger(v_w.user_id, 'withdrawal_reversal', v_w.amount, 'withdrawal', v_w.id, 'completed');
    update public.withdrawals w
       set status = 'reversed', failure_reason = v_reason, reversed_at = now(),
           processed_at = now(), processed_by = p_admin_id,
           admin_note = coalesce(v_note, w.admin_note)
     where w.id = v_w.id;
    v_status := 'reversed';
    insert into public.notifications (id, user_id, title, message, type, is_read)
    values (private.notification_id(v_w.id, 'withdrawal_reversed'), v_w.user_id,
            'Saldo Penarikan Dikembalikan',
            format('Penarikan Rp%s tidak dapat diproses dan saldo sudah dikembalikan.', v_amount_text),
            'keuangan', false)
    on conflict (id) do nothing;
  end if;

  perform private.log_admin_action(
    p_admin_id, 'withdrawal_' || p_action, 'withdrawal', v_w.id,
    jsonb_strip_nulls(jsonb_build_object(
      'from', v_w.status, 'to', v_status, 'amount', v_w.amount,
      'transferReference', v_ref, 'failureReason', v_reason, 'adminNote', v_note
    ))
  );

  return jsonb_build_object('success', true, 'withdrawalId', v_w.id, 'status', v_status);
end;
$$;

comment on function public.transition_withdrawal(uuid, text, text, text, text, text) is
  'Review penarikan oleh admin (processing/succeeded/reversed + kredit balik idempoten + audit). Hanya service_role.';

-- -----------------------------------------------------------------------------
-- admin_suspend_user — active → suspended|terminated (+ suspended_at).
-- Admin tidak boleh menangguhkan diri sendiri atau admin lain.
-- -----------------------------------------------------------------------------
create or replace function public.admin_suspend_user(
  p_admin_id uuid,
  p_user_id uuid,
  p_status text,
  p_reason text
)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_user public.users;
  v_reason text := left(btrim(coalesce(p_reason, '')), 500);
  v_at timestamptz := clock_timestamp();
  v_deadline timestamptz;
  v_kind text;
  v_notification text;
begin
  if p_user_id is null or p_status is null or v_reason = '' then
    raise exception 'Missing required fields' using errcode = '22023';
  end if;
  if p_status not in ('suspended', 'terminated') then
    raise exception 'Invalid status' using errcode = '22023';
  end if;
  perform private.assert_active_admin(p_admin_id);
  if p_user_id = p_admin_id then
    raise exception 'Admin tidak dapat menangguhkan akunnya sendiri.' using errcode = '42501';
  end if;

  select * into v_user from public.users u where u.id = p_user_id for update;
  if not found then
    raise exception 'User not found' using errcode = 'P0002';
  end if;
  if v_user.role = 'admin' then
    raise exception 'Akun Admin tidak dapat ditangguhkan dari sini.' using errcode = '42501';
  end if;
  if v_user.status <> 'active' then
    raise exception 'User is already suspended or terminated' using errcode = 'P0001';
  end if;

  update public.users u set status = p_status, suspended_at = v_at where u.id = p_user_id;

  v_deadline := v_at + interval '14 days';
  v_kind := case when p_status = 'suspended' then 'account_suspended' else 'account_terminated' end;
  -- sourceId menyertakan waktu suspend supaya siklus suspend berikutnya tetap
  -- mendapat notifikasi (ID lama per user hanya sekali seumur hidup).
  v_notification := private.notification_id(p_user_id::text || ':' || to_char(v_at, 'YYYYMMDDHH24MISSUS'), v_kind);
  insert into public.notifications (id, user_id, title, message, type, is_read)
  values (
    v_notification, p_user_id,
    case when p_status = 'suspended' then 'Akun Ditangguhkan' else 'Akun Dihentikan' end,
    left(format('Akun Anda %s karena: %s. Anda dapat mengajukan banding dalam waktu 14 hari (hingga %s).',
      case when p_status = 'suspended' then 'ditangguhkan' else 'dihentikan' end,
      v_reason, to_char(v_deadline at time zone 'UTC', 'YYYY-MM-DD')), 1000),
    'system', false
  )
  on conflict (id) do nothing;

  perform private.log_admin_action(p_admin_id, 'user_' || p_status, 'user', p_user_id::text,
    jsonb_build_object('reason', v_reason, 'from', v_user.status));

  return jsonb_build_object('status', p_status, 'deadlineAt', v_deadline, 'notificationId', v_notification);
end;
$$;

comment on function public.admin_suspend_user(uuid, uuid, text, text) is
  'Tangguhkan/hentikan user aktif (+ notifikasi + audit). Hanya service_role.';

-- -----------------------------------------------------------------------------
-- admin_unsuspend_user — suspended → active. terminated tidak bisa dipulihkan
-- langsung (sama dengan Function lama).
-- -----------------------------------------------------------------------------
create or replace function public.admin_unsuspend_user(
  p_admin_id uuid,
  p_user_id uuid,
  p_note text default null
)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_user public.users;
  v_note text := nullif(left(btrim(coalesce(p_note, '')), 500), '');
  v_notification text;
begin
  if p_user_id is null then
    raise exception 'Missing userId' using errcode = '22023';
  end if;
  perform private.assert_active_admin(p_admin_id);

  select * into v_user from public.users u where u.id = p_user_id for update;
  if not found then
    raise exception 'User not found' using errcode = 'P0002';
  end if;
  if v_user.status = 'terminated' then
    raise exception 'Cannot unsuspend terminated user directly' using errcode = 'P0001';
  end if;
  if v_user.status = 'active' then
    raise exception 'User is already active' using errcode = 'P0001';
  end if;

  update public.users u set status = 'active' where u.id = p_user_id;

  v_notification := private.notification_id(
    p_user_id::text || ':' || coalesce(to_char(v_user.suspended_at, 'YYYYMMDDHH24MISSUS'), ''), 'account_restored');
  insert into public.notifications (id, user_id, title, message, type, is_read)
  values (v_notification, p_user_id, 'Akun Dipulihkan',
          left(btrim('Status akun Anda telah dikembalikan menjadi aktif. ' || coalesce(v_note, '')), 1000),
          'system', false)
  on conflict (id) do nothing;

  perform private.log_admin_action(p_admin_id, 'user_unsuspended', 'user', p_user_id::text,
    jsonb_strip_nulls(jsonb_build_object('note', v_note, 'from', v_user.status)));

  return jsonb_build_object('status', 'active', 'notificationId', v_notification);
end;
$$;

comment on function public.admin_unsuspend_user(uuid, uuid, text) is
  'Pulihkan user suspended (+ notifikasi + audit). Hanya service_role.';

-- -----------------------------------------------------------------------------
-- admin_verify_kyc — kyc_status → verified (idempoten).
-- -----------------------------------------------------------------------------
create or replace function public.admin_verify_kyc(p_admin_id uuid, p_user_id uuid)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_user public.users;
begin
  if p_user_id is null then
    raise exception 'userId wajib diisi' using errcode = '22023';
  end if;
  perform private.assert_active_admin(p_admin_id);

  select * into v_user from public.users u where u.id = p_user_id for update;
  if not found then
    raise exception 'Profil user tidak ditemukan' using errcode = 'P0002';
  end if;
  if v_user.kyc_status = 'verified' then
    return jsonb_build_object('status', 'ok', 'userId', p_user_id, 'kyc_status', 'verified', 'alreadyVerified', true);
  end if;

  update public.users u set kyc_status = 'verified', kyc_verified_at = now() where u.id = p_user_id;

  insert into public.notifications (id, user_id, title, message, type, is_read)
  values (private.notification_id(p_user_id::text, 'kyc_verified'), p_user_id,
          'Verifikasi KYC Disetujui',
          'Dokumen KYC Anda telah diverifikasi. Anda kini dapat menarik saldo tanpa batas nominal.',
          'keuangan', false)
  on conflict (id) do nothing;

  perform private.log_admin_action(p_admin_id, 'user_kyc_verified', 'user', p_user_id::text,
    jsonb_build_object('from', v_user.kyc_status));

  return jsonb_build_object('status', 'ok', 'userId', p_user_id, 'kyc_status', 'verified', 'alreadyVerified', false);
end;
$$;

comment on function public.admin_verify_kyc(uuid, uuid) is
  'Tandai KYC user verified (+ notifikasi + audit, idempoten). Hanya service_role.';

-- -----------------------------------------------------------------------------
-- admin_review_appeal — submitted|under_review → approved|rejected.
-- approved memulihkan user (kecuali sudah active).
-- -----------------------------------------------------------------------------
create or replace function public.admin_review_appeal(
  p_admin_id uuid,
  p_appeal_id text,
  p_decision text,
  p_note text default null
)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_appeal public.appeals;
  v_note text := nullif(left(btrim(coalesce(p_note, '')), 1000), '');
  v_kind text;
  v_notification text;
begin
  if p_appeal_id is null or p_decision is null then
    raise exception 'Missing appealId or decision' using errcode = '22023';
  end if;
  if p_decision not in ('approved', 'rejected') then
    raise exception 'Invalid decision' using errcode = '22023';
  end if;
  perform private.assert_active_admin(p_admin_id);

  select * into v_appeal from public.appeals a where a.id = p_appeal_id for update;
  if not found then
    raise exception 'Appeal not found' using errcode = 'P0002';
  end if;
  if v_appeal.status in ('approved', 'rejected') then
    raise exception 'Appeal is already decided' using errcode = 'P0001';
  end if;

  -- appeals → users (urutan kunci tetap).
  perform 1 from public.users u where u.id = v_appeal.user_id for update;

  update public.appeals a
     set status = p_decision, decision = coalesce(v_note, ''), decided_at = now()
   where a.id = v_appeal.id;

  if p_decision = 'approved' then
    update public.users u set status = 'active' where u.id = v_appeal.user_id and u.status <> 'active';
    v_kind := 'account_restored';
    v_notification := private.notification_id(v_appeal.id, v_kind);
    insert into public.notifications (id, user_id, title, message, type, is_read)
    values (v_notification, v_appeal.user_id, 'Banding Disetujui',
            left(btrim('Banding Anda disetujui. Status akun Anda telah dikembalikan menjadi aktif. ' || coalesce(v_note, '')), 1000),
            'system', false)
    on conflict (id) do nothing;
  else
    v_kind := 'appeal_rejected';
    v_notification := private.notification_id(v_appeal.id, v_kind);
    insert into public.notifications (id, user_id, title, message, type, is_read)
    values (v_notification, v_appeal.user_id, 'Banding Ditolak',
            left(btrim('Banding Anda ditolak. ' || coalesce(v_note, '')), 1000),
            'system', false)
    on conflict (id) do nothing;
  end if;

  perform private.log_admin_action(p_admin_id, 'appeal_' || p_decision, 'appeal', v_appeal.id,
    jsonb_strip_nulls(jsonb_build_object('userId', v_appeal.user_id, 'note', v_note)));

  return jsonb_build_object('status', p_decision, 'notificationId', v_notification);
end;
$$;

comment on function public.admin_review_appeal(uuid, text, text, text) is
  'Putuskan banding (approved memulihkan akun) + notifikasi + audit. Hanya service_role.';

-- -----------------------------------------------------------------------------
-- Hak akses: hanya service_role.
-- -----------------------------------------------------------------------------
revoke all on function public.request_withdrawal(uuid, text, bigint, text, text, text, text, text, text, bigint, boolean, bigint, integer, integer)
  from public, anon, authenticated;
revoke all on function public.transition_withdrawal(uuid, text, text, text, text, text) from public, anon, authenticated;
revoke all on function public.admin_suspend_user(uuid, uuid, text, text) from public, anon, authenticated;
revoke all on function public.admin_unsuspend_user(uuid, uuid, text) from public, anon, authenticated;
revoke all on function public.admin_verify_kyc(uuid, uuid) from public, anon, authenticated;
revoke all on function public.admin_review_appeal(uuid, text, text, text) from public, anon, authenticated;

grant execute on function public.request_withdrawal(uuid, text, bigint, text, text, text, text, text, text, bigint, boolean, bigint, integer, integer)
  to service_role;
grant execute on function public.transition_withdrawal(uuid, text, text, text, text, text) to service_role;
grant execute on function public.admin_suspend_user(uuid, uuid, text, text) to service_role;
grant execute on function public.admin_unsuspend_user(uuid, uuid, text) to service_role;
grant execute on function public.admin_verify_kyc(uuid, uuid) to service_role;
grant execute on function public.admin_review_appeal(uuid, text, text, text) to service_role;
