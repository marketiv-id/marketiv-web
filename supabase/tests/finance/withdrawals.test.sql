-- pgTAP: request_withdrawal + transition_withdrawal (0028). Semua di-rollback.
begin;
create extension if not exists pgtap with schema extensions;
select plan(30);

-- Kreator C (saldo 200.000), UMKM U (punya ledger refund), UMKM V (tanpa refund), Admin A.
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000fa001', 'wd-creator@example.test'),
  ('00000000-0000-0000-0000-0000000fa002', 'wd-umkm@example.test'),
  ('00000000-0000-0000-0000-0000000fa003', 'wd-umkm2@example.test'),
  ('00000000-0000-0000-0000-0000000fa009', 'wd-admin@example.test');
insert into public.users (id, role, status, email, tos_version, tos_accepted_at) values
  ('00000000-0000-0000-0000-0000000fa001', 'creator', 'active', 'wd-creator@example.test', 'v3.1', now()),
  ('00000000-0000-0000-0000-0000000fa002', 'umkm', 'active', 'wd-umkm@example.test', 'v3.1', now()),
  ('00000000-0000-0000-0000-0000000fa003', 'umkm', 'active', 'wd-umkm2@example.test', 'v3.1', now()),
  ('00000000-0000-0000-0000-0000000fa009', 'admin', 'active', 'wd-admin@example.test', 'v3.1', now());
insert into public.wallets (user_id) values
  ('00000000-0000-0000-0000-0000000fa001'),
  ('00000000-0000-0000-0000-0000000fa002'),
  ('00000000-0000-0000-0000-0000000fa003');
select private.post_ledger('00000000-0000-0000-0000-0000000fa001', 'release', 200000, 'escrow', 'esc-wd-1');
select private.post_ledger('00000000-0000-0000-0000-0000000fa002', 'refund', 80000, 'escrow', 'esc-wd-2');

-- Helper: panggil dengan argumen default.
create function pg_temp.req(p_user uuid, p_key text, p_amount bigint, p_account text default '1234567890')
returns jsonb language sql as $$
  select public.request_withdrawal(p_user, p_key, p_amount, 'bank', 'BCA', p_account, 'Kreator Uji', 'v3.1');
$$;

-- 1–4. Request pertama: withdrawal requested + ledger pending + saldo turun.
select is((pg_temp.req('00000000-0000-0000-0000-0000000fa001', 'key-aaaa-0001', 60000))->>'status', 'requested', 'request pertama requested');
select is((select balance from public.wallets where user_id = '00000000-0000-0000-0000-0000000fa001'), 140000::bigint, 'saldo didebit');
select is((select status from public.transactions where reference_type = 'withdrawal' and type = 'withdrawal'
           and reference_id = private.withdrawal_id('00000000-0000-0000-0000-0000000fa001', 'key-aaaa-0001')), 'pending', 'ledger pending');
select is((select id from public.withdrawals where user_id = '00000000-0000-0000-0000-0000000fa001'),
  private.withdrawal_id('00000000-0000-0000-0000-0000000fa001', 'key-aaaa-0001'), 'id deterministik (user, requestKey)');

-- 5–7. Request dua kali (requestKey sama) idempoten, saldo tidak turun lagi.
select is((pg_temp.req('00000000-0000-0000-0000-0000000fa001', 'key-aaaa-0001', 60000))->>'alreadyRequested', 'true', 'request ulang idempoten');
select is((select balance from public.wallets where user_id = '00000000-0000-0000-0000-0000000fa001'), 140000::bigint, 'saldo tidak didebit dua kali');
select throws_ok($$select pg_temp.req('00000000-0000-0000-0000-0000000fa001', 'key-aaaa-0001', 70000)$$,
  'P0001', 'Permintaan penarikan ini sudah diproses.', 'requestKey sama + isi berbeda → 409');

-- 8. Double-submit < 60 detik (nominal sama, key beda).
select throws_ok($$select pg_temp.req('00000000-0000-0000-0000-0000000fa001', 'key-aaaa-0002', 60000)$$,
  'P0001', 'Permintaan penarikan ini sudah diproses.', 'double-submit 60 detik ditolak');

-- 9–10. Saldo tidak cukup → tidak ada baris tersisa.
select throws_ok($$select pg_temp.req('00000000-0000-0000-0000-0000000fa001', 'key-aaaa-0003', 500000)$$,
  'P0001', 'Saldo tidak mencukupi', 'saldo kurang ditolak');
select is((select count(*)::int from public.withdrawals where id = private.withdrawal_id('00000000-0000-0000-0000-0000000fa001', 'key-aaaa-0003')),
  0, 'withdrawal gagal tidak tersisa (rollback)');

-- 11–14. Validasi payload & guard.
select throws_ok($$select pg_temp.req('00000000-0000-0000-0000-0000000fa001', 'key-aaaa-0004', 10000)$$,
  '22023', null, 'di bawah minimum → 400');
select throws_ok($$select pg_temp.req('00000000-0000-0000-0000-0000000fa001', 'key-aaaa-0005', 55000, '12ab')$$,
  '22023', 'Nomor rekening tidak valid', 'nomor rekening tidak valid');
select throws_ok($$select pg_temp.req('00000000-0000-0000-0000-0000000fa001', 'short', 55000)$$,
  '22023', 'requestKey wajib diisi', 'requestKey wajib');
select throws_ok($$select public.request_withdrawal('00000000-0000-0000-0000-0000000fa001', 'key-aaaa-0006', 55000, 'bank', 'BCA', '1234567890', 'X', 'v9')$$,
  '42501', 'Setujui T&C terbaru terlebih dahulu.', 'ToS lama ditolak');

-- 15–17. UMKM: wajib sumber refund/budget + ledger refund.
select throws_ok($$select pg_temp.req('00000000-0000-0000-0000-0000000fa002', 'key-umkm-0001', 55000)$$,
  '42501', 'Saldo UMKM hanya dapat ditarik dari refund atau sisa budget.', 'UMKM tanpa sourceOrigin ditolak');
select throws_ok($$select public.request_withdrawal('00000000-0000-0000-0000-0000000fa003', 'key-umkm-0002', 55000, 'bank', 'BCA', '1234567890', 'U', 'v3.1', 'umkm_refund')$$,
  '42501', null, 'UMKM tanpa ledger refund ditolak');
select is((public.request_withdrawal('00000000-0000-0000-0000-0000000fa002', 'key-umkm-0003', 55000, 'bank', 'BCA', '1234567890', 'U', 'v3.1', 'umkm_refund'))->>'status',
  'requested', 'UMKM dengan refund boleh menarik');

-- 18. Guard lanjutan: limit harian (limit 1, sudah ada 1 hari ini).
select throws_ok($$select public.request_withdrawal('00000000-0000-0000-0000-0000000fa001', 'key-aaaa-0007', 51000, 'bank', 'BCA', '1234567890', 'K', 'v3.1', null, 50000, true, 5000000, 1, 3)$$,
  'P0001', null, 'limit harian (guard lanjutan) ditolak');

-- 19–20. Transisi: hanya admin; requested → processing.
select throws_ok(format($$select public.transition_withdrawal('00000000-0000-0000-0000-0000000fa001', %L, 'start_processing')$$,
  private.withdrawal_id('00000000-0000-0000-0000-0000000fa001', 'key-aaaa-0001')),
  '42501', 'Akses Admin ditolak.', 'non-admin ditolak');
select is((public.transition_withdrawal('00000000-0000-0000-0000-0000000fa009',
  private.withdrawal_id('00000000-0000-0000-0000-0000000fa001', 'key-aaaa-0001'), 'start_processing'))->>'status',
  'processing', 'requested → processing');

-- 21. Transisi tidak valid.
select throws_ok(format($$select public.transition_withdrawal('00000000-0000-0000-0000-0000000fa009', %L, 'start_processing')$$,
  private.withdrawal_id('00000000-0000-0000-0000-0000000fa001', 'key-aaaa-0001')),
  'P0001', null, 'processing → start_processing ditolak (409)');

-- 22–24. fail: kredit balik + ledger primer failed.
select is((public.transition_withdrawal('00000000-0000-0000-0000-0000000fa009',
  private.withdrawal_id('00000000-0000-0000-0000-0000000fa001', 'key-aaaa-0001'), 'fail', null, 'Rekening tidak aktif'))->>'status',
  'reversed', 'processing → reversed');
select is((select balance from public.wallets where user_id = '00000000-0000-0000-0000-0000000fa001'), 200000::bigint, 'saldo dikembalikan');
select is((select status from public.transactions where reference_type = 'withdrawal' and type = 'withdrawal'
           and reference_id = private.withdrawal_id('00000000-0000-0000-0000-0000000fa001', 'key-aaaa-0001')), 'failed', 'ledger debit → failed');

-- 25–26. Reversal idempoten: fail kedua ditolak, saldo tetap.
select throws_ok(format($$select public.transition_withdrawal('00000000-0000-0000-0000-0000000fa009', %L, 'fail', null, 'lagi')$$,
  private.withdrawal_id('00000000-0000-0000-0000-0000000fa001', 'key-aaaa-0001')),
  'P0001', null, 'fail kedua ditolak');
select is((select balance from public.wallets where user_id = '00000000-0000-0000-0000-0000000fa001'), 200000::bigint, 'saldo tidak dikredit dua kali');

-- 27–28. Jalur sukses: request → processing → succeeded (ledger completed).
select pg_temp.req('00000000-0000-0000-0000-0000000fa001', 'key-aaaa-0010', 70000);
select public.transition_withdrawal('00000000-0000-0000-0000-0000000fa009',
  private.withdrawal_id('00000000-0000-0000-0000-0000000fa001', 'key-aaaa-0010'), 'start_processing');
select throws_ok(format($$select public.transition_withdrawal('00000000-0000-0000-0000-0000000fa009', %L, 'mark_succeeded')$$,
  private.withdrawal_id('00000000-0000-0000-0000-0000000fa001', 'key-aaaa-0010')),
  '22023', 'Referensi transfer wajib diisi.', 'succeeded wajib referensi transfer');
select is((public.transition_withdrawal('00000000-0000-0000-0000-0000000fa009',
  private.withdrawal_id('00000000-0000-0000-0000-0000000fa001', 'key-aaaa-0010'), 'mark_succeeded', 'TRF-001'))->>'status',
  'succeeded', 'processing → succeeded');

-- 29. Audit tercatat untuk tiap transisi admin (processing, fail, processing, succeeded).
select is((select count(*)::int from public.admin_actions where admin_id = '00000000-0000-0000-0000-0000000fa009'
           and target_type = 'withdrawal'), 4, 'admin_actions mencatat 4 transisi');

-- 30. Rekonsiliasi 0 selisih untuk semua user uji.
select is((select count(*)::int from public.finance_reconciliation
           where user_id::text like '00000000-0000-0000-0000-0000000fa%' and diff <> 0), 0, 'rekonsiliasi = 0 selisih');

select * from finish();
rollback;
