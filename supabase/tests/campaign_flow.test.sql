-- pgTAP: alur campaign Fase 7 (0022_campaign_flow).
begin;
create extension if not exists pgtap with schema extensions;

select plan(50);

-- ── Akun ───────────────────────────────────────────────────────────────────
insert into auth.users (id, email, aud, role, raw_app_meta_data, raw_user_meta_data) values
  ('a7111111-1111-4111-8111-111111111111', 'cf-umkm@example.test', 'authenticated', 'authenticated', '{}', '{}'),
  ('c7111111-1111-4111-8111-111111111111', 'cf-kreator-1@example.test', 'authenticated', 'authenticated', '{}', '{}'),
  ('c7222222-2222-4222-8222-222222222222', 'cf-kreator-2@example.test', 'authenticated', 'authenticated', '{}', '{}'),
  ('c7333333-3333-4333-8333-333333333333', 'cf-kreator-3@example.test', 'authenticated', 'authenticated', '{}', '{}'),
  ('d7444444-4444-4444-8444-444444444444', 'cf-admin@example.test', 'authenticated', 'authenticated', '{}', '{}');
insert into public.users (id, role, email) values
  ('a7111111-1111-4111-8111-111111111111', 'umkm', 'cf-umkm@example.test'),
  ('c7111111-1111-4111-8111-111111111111', 'creator', 'cf-kreator-1@example.test'),
  ('c7222222-2222-4222-8222-222222222222', 'creator', 'cf-kreator-2@example.test'),
  ('c7333333-3333-4333-8333-333333333333', 'creator', 'cf-kreator-3@example.test'),
  ('d7444444-4444-4444-8444-444444444444', 'admin', 'cf-admin@example.test');
insert into public.creator_profiles (user_id, display_name, is_profile_completed) values
  ('c7111111-1111-4111-8111-111111111111', 'Kreator Satu', true),
  ('c7222222-2222-4222-8222-222222222222', 'Kreator Dua', true),
  ('c7333333-3333-4333-8333-333333333333', 'Belum Lengkap', false);

-- campaign aktif kuota 1, campaign draft, campaign dana habis, campaign kuota 5
insert into public.campaigns (id, umkm_id, title, category, type, status, budget, claim_limit, remaining_budget, submission_days) values
  ('cf_active', 'a7111111-1111-4111-8111-111111111111', 'Promo Bakso', 'kuliner', 'ugc', 'active', 100000, 1, 100000, 7),
  ('cf_draft',  'a7111111-1111-4111-8111-111111111111', 'Draft', 'kuliner', 'ugc', 'draft', 100000, 5, 0, 7),
  ('cf_empty',  'a7111111-1111-4111-8111-111111111111', 'Habis', 'kuliner', 'ugc', 'active', 100000, 5, 0, 7),
  ('cf_many',   'a7111111-1111-4111-8111-111111111111', 'Banyak', 'kuliner', 'ugc', 'active', 100000, 5, 100000, 0);

-- ── Hak akses ──────────────────────────────────────────────────────────────
select ok(
  not has_function_privilege('anon', 'public.claim_campaign(text, uuid)', 'execute')
  and not has_function_privilege('authenticated', 'public.claim_campaign(text, uuid)', 'execute')
  and has_function_privilege('service_role', 'public.claim_campaign(text, uuid)', 'execute'),
  'claim_campaign hanya service_role');
select ok(
  not has_function_privilege('authenticated', 'public.unclaim_campaign(text, uuid, text)', 'execute')
  and has_function_privilege('service_role', 'public.unclaim_campaign(text, uuid, text)', 'execute'),
  'unclaim_campaign hanya service_role');
select ok(
  not has_function_privilege('authenticated', 'public.submit_campaign_proof(uuid, text, text, text, text, text)', 'execute')
  and has_function_privilege('service_role', 'public.submit_campaign_proof(uuid, text, text, text, text, text)', 'execute'),
  'submit_campaign_proof hanya service_role');
select ok(
  not has_function_privilege('authenticated', 'public.review_submission(uuid, text, text, text, boolean, bigint, numeric)', 'execute')
  and has_function_privilege('service_role', 'public.review_submission(uuid, text, text, text, boolean, bigint, numeric)', 'execute'),
  'review_submission hanya service_role');
select ok(
  not has_function_privilege('authenticated', 'public.record_fraud_check(text, integer, text, text)', 'execute')
  and has_function_privilege('service_role', 'public.record_fraud_check(text, integer, text, text)', 'execute'),
  'record_fraud_check hanya service_role');
select ok(
  not has_function_privilege('authenticated', 'private.expire_stale_claims()', 'execute')
  and not has_function_privilege('anon', 'private.expire_stale_claims()', 'execute'),
  'expire_stale_claims tidak bisa dipanggil anon/authenticated');

-- ── claim_campaign ─────────────────────────────────────────────────────────
select throws_ok($$ select public.claim_campaign('nope', 'c7111111-1111-4111-8111-111111111111') $$,
  'P0002', 'Campaign tidak ditemukan.', 'campaign tidak ada → P0002');
select throws_ok($$ select public.claim_campaign('cf_draft', 'c7111111-1111-4111-8111-111111111111') $$,
  'P0001', 'Campaign ini sudah tidak aktif.', 'campaign draft ditolak');
select throws_ok($$ select public.claim_campaign('cf_empty', 'c7111111-1111-4111-8111-111111111111') $$,
  'P0001', 'Dana campaign ini sudah habis.', 'dana habis ditolak');
select throws_ok($$ select public.claim_campaign('cf_active', 'c7333333-3333-4333-8333-333333333333') $$,
  'P0001', 'Lengkapi profil kreator dulu sebelum mengambil pekerjaan.', 'profil belum lengkap ditolak');

create temp table claim1 on commit drop as
select public.claim_campaign('cf_active', 'c7111111-1111-4111-8111-111111111111') as r;
select is((select r->>'status' from claim1), 'claimed', 'klaim berhasil');
select is((select total_claims from public.campaigns where id = 'cf_active'), 1, 'total_claims naik');
select is(
  (select count(*)::int from public.notifications
   where id = private.notification_id((select r->>'claimId' from claim1), 'claim')
     and user_id = 'a7111111-1111-4111-8111-111111111111' and type = 'claim'
     and message = 'Kreator Satu mengklaim campaign "Promo Bakso"'),
  1, 'notifikasi UMKM campaign-claimed');
-- slot terakhir sudah terisi: kreator kedua ditolak (lock campaign → kuota dibaca terbaru)
select throws_ok($$ select public.claim_campaign('cf_active', 'c7222222-2222-4222-8222-222222222222') $$,
  'P0001', 'Kuota kreator untuk campaign ini sudah penuh.', 'slot terakhir: kreator kedua ditolak');
select lives_ok($$ select public.claim_campaign('cf_many', 'c7111111-1111-4111-8111-111111111111') $$,
  'klaim cf_many pertama');
select throws_ok($$ select public.claim_campaign('cf_many', 'c7111111-1111-4111-8111-111111111111') $$,
  'P0001', 'Kamu sudah pernah mengambil campaign ini.', 'klaim ganda ditolak');
select throws_ok($$ insert into public.campaign_claims (campaign_id, creator_id, status)
                    values ('cf_many', 'c7111111-1111-4111-8111-111111111111', 'claimed') $$,
  '23505', null, 'unique parsial menjaga klaim ganda (race)');

-- ── unclaim_campaign ───────────────────────────────────────────────────────
create temp table claim2 on commit drop as
select public.claim_campaign('cf_many', 'c7222222-2222-4222-8222-222222222222') as r;
select throws_ok(format($$ select public.unclaim_campaign(%L, 'c7111111-1111-4111-8111-111111111111') $$,
  (select r->>'claimId' from claim2)), '42501', 'Claim bukan milik Anda.', 'unclaim milik orang lain → 42501');
select throws_ok(format($$ select public.unclaim_campaign(%L, 'c7222222-2222-4222-8222-222222222222', 'cf_active') $$,
  (select r->>'claimId' from claim2)), 'P0002', 'Claim tidak ditemukan.', 'campaign path tidak cocok → 404');
select is((select total_claims from public.campaigns where id = 'cf_many'), 2, 'cf_many total_claims 2');
select is(
  (select public.unclaim_campaign((select r->>'claimId' from claim2), 'c7222222-2222-4222-8222-222222222222', 'cf_many')->>'success'),
  'true', 'unclaim berhasil');
select is((select count(*)::int from public.campaign_claims where id = (select r->>'claimId' from claim2)), 0, 'klaim dihapus');
select is((select total_claims from public.campaigns where id = 'cf_many'), 1, 'slot dikembalikan');

-- ── submit_campaign_proof ──────────────────────────────────────────────────
select throws_ok(format($$ select public.submit_campaign_proof('c7222222-2222-4222-8222-222222222222', 'cf_active', %L, 'tiktok', 'https://www.tiktok.com/@a/video/1') $$,
  (select r->>'claimId' from claim1)), 'P0002', 'Pekerjaan tidak ditemukan.', 'bukti untuk klaim orang lain → 404');
select throws_ok(format($$ select public.submit_campaign_proof('c7111111-1111-4111-8111-111111111111', 'cf_active', %L, 'youtube', 'https://youtube.com/x') $$,
  (select r->>'claimId' from claim1)), '22023', 'Platform tidak valid.', 'platform tidak didukung → 400');
create temp table sub1 on commit drop as
select public.submit_campaign_proof('c7111111-1111-4111-8111-111111111111', 'cf_active',
  (select r->>'claimId' from claim1), 'tiktok', 'https://www.tiktok.com/@a/video/1', '  caption ') as r;
select is((select r->>'status' from sub1), 'pending', 'submission pending');
select is((select status from public.campaign_claims where id = (select r->>'claimId' from claim1)), 'submitted', 'klaim submitted');
select is((select caption from public.campaign_submissions where id = (select r->>'submissionId' from sub1)), 'caption', 'caption di-trim');
select is(
  (select count(*)::int from public.notifications
   where id = private.notification_id((select r->>'submissionId' from sub1), 'submission') and type = 'campaign'),
  1, 'notifikasi bukti kerja ke UMKM');
select throws_ok(format($$ select public.submit_campaign_proof('c7111111-1111-4111-8111-111111111111', 'cf_active', %L, 'tiktok', 'https://www.tiktok.com/@a/video/2') $$,
  (select r->>'claimId' from claim1)), 'P0001', 'Bukti untuk pekerjaan ini sudah pernah dikirim.', 'bukti kedua ditolak');

-- ── record_fraud_check ─────────────────────────────────────────────────────
select lives_ok(format($$ select public.record_fraud_check(%L, 45, 'review', 'URL duplikat') $$,
  (select r->>'submissionId' from sub1)), 'fraud check tersimpan');
select is(
  (select fraud_status || ':' || fraud_score from public.campaign_submissions where id = (select r->>'submissionId' from sub1)),
  'review:45', 'fraud_status + skor di submission');
select is((select count(*)::int from public.fraud_checks where submission_id = (select r->>'submissionId' from sub1)), 1, 'baris fraud_checks');

-- ── review_submission ──────────────────────────────────────────────────────
select throws_ok(format($$ select public.review_submission('a7111111-1111-4111-8111-111111111111', %L, 'approved', null, false, 100) $$,
  (select r->>'submissionId' from sub1)), '42501', 'Akses ditolak: Hanya Admin Marketiv yang dapat memvalidasi submission.', 'non-admin ditolak');
select throws_ok(format($$ select public.review_submission('d7444444-4444-4444-8444-444444444444', %L, 'approved', null, true, null) $$,
  (select r->>'submissionId' from sub1)), '22023', 'Jumlah views tidak valid.', 'approve tanpa views → 400');
select throws_ok(format($$ select public.review_submission('d7444444-4444-4444-8444-444444444444', %L, 'approved', null, true, 1000) $$,
  (select r->>'submissionId' from sub1)), 'P0001', 'Views belum dapat difinalisasi. Periode observasi 72 jam belum selesai.', 'observasi 72 jam belum lewat');
select is(
  (select public.review_submission('d7444444-4444-4444-8444-444444444444', (select r->>'submissionId' from sub1),
     'approved', 'bagus', true, 1500, 0)->>'status'),
  'approved', 'approve (observasi 0 jam)');
select is(
  (select status || ':' || views || ':' || views_count || ':' || views_source || ':' || views_final || ':' || review_notes
   from public.campaign_submissions where id = (select r->>'submissionId' from sub1)),
  'approved:1500:1500:manual_admin:true:bagus', 'submission approved + views final');
select is((select status from public.campaign_claims where id = (select r->>'claimId' from claim1)), 'approved', 'klaim approved');
select is((select total_claims from public.campaigns where id = 'cf_active'), 1, 'approve tidak mengubah kuota');
select throws_ok(format($$ select public.review_submission('d7444444-4444-4444-8444-444444444444', %L, 'rejected', null, true) $$,
  (select r->>'submissionId' from sub1)), 'P0001', 'Submission ini sudah pernah direview.', 'review ulang ditolak');

-- reject mengembalikan slot + notifikasi
create temp table claim3 on commit drop as
select public.claim_campaign('cf_many', 'c7222222-2222-4222-8222-222222222222') as r;
create temp table sub3 on commit drop as
select public.submit_campaign_proof('c7222222-2222-4222-8222-222222222222', 'cf_many',
  (select r->>'claimId' from claim3), 'instagram', 'https://www.instagram.com/p/abc') as r;
select is(
  (select public.review_submission('d7444444-4444-4444-8444-444444444444', (select r->>'submissionId' from sub3),
     'rejected', 'tidak sesuai', true)->>'status'),
  'rejected', 'reject');
select is((select total_claims from public.campaigns where id = 'cf_many'), 1, 'reject mengembalikan slot');
select is(
  (select message from public.notifications
   where id = private.notification_id((select r->>'submissionId' from sub3), 'submission_rejected')),
  'Bukti kerja Anda ditolak: tidak sesuai', 'notifikasi penolakan ke kreator');

-- ── expire_stale_claims ────────────────────────────────────────────────────
-- klaim cf_many kreator 1: submission_days 0 → 7 hari; mundurkan claimed_at 8 hari.
update public.campaign_claims set claimed_at = now() - interval '8 days'
 where campaign_id = 'cf_many' and creator_id = 'c7111111-1111-4111-8111-111111111111';
-- klaim baru (belum lewat) tidak tersentuh
insert into public.campaign_claims (id, campaign_id, creator_id, status, claimed_at)
values ('cf_fresh', 'cf_many', 'c7333333-3333-4333-8333-333333333333', 'claimed', now() - interval '6 days');
update public.campaigns set total_claims = 2 where id = 'cf_many';
select is(private.expire_stale_claims(), 1, 'satu klaim kedaluwarsa');
select is((select status from public.campaign_claims
           where campaign_id = 'cf_many' and creator_id = 'c7111111-1111-4111-8111-111111111111'), 'expired', 'status expired');
select is((select status from public.campaign_claims where id = 'cf_fresh'), 'claimed', 'klaim baru tidak tersentuh');
select is((select total_claims from public.campaigns where id = 'cf_many'), 1, 'slot dikembalikan');
select is(private.expire_stale_claims(), 0, 'idempoten: jalan kedua tidak mengubah apa pun');
select is(
  (select count(*)::int from cron.job where jobname = 'expire-stale-claims' and schedule = '0 */6 * * *'
     and command = 'select private.expire_stale_claims()'),
  1, 'job pg_cron terdaftar');

select * from finish();
rollback;
