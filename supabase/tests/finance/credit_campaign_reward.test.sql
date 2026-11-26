-- pgTAP: credit_campaign_reward + review_submission (0026).
begin;
create extension if not exists pgtap with schema extensions;
select plan(14);
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
insert into public.campaigns (id, umkm_id, title, category, type, platforms, budget, reward_per_1000_views, claim_limit, status, remaining_budget) values
  ('cc1', '00000000-0000-0000-0000-0000000000a1', 'Reward', 'kuliner', 'ugc', array['tiktok'], 100000, 5000, 5, 'active', 100000),
  ('cc2', '00000000-0000-0000-0000-0000000000a1', 'Review', 'kuliner', 'ugc', array['tiktok'], 100000, 3000, 5, 'active', 100000);
insert into public.campaign_claims (id, campaign_id, creator_id, status) values
  ('cl1', 'cc1', '00000000-0000-0000-0000-0000000000c1', 'approved'),
  ('cl2', 'cc1', '00000000-0000-0000-0000-0000000000a1', 'approved'),
  ('cl3', 'cc1', '00000000-0000-0000-0000-0000000000d1', 'submitted'),
  ('cl4', 'cc2', '00000000-0000-0000-0000-0000000000c1', 'submitted');
insert into public.campaign_submissions (id, claim_id, campaign_id, creator_id, platform, post_url, status, views, views_count, views_final, created_at) values
  ('cs1', 'cl1', 'cc1', '00000000-0000-0000-0000-0000000000c1', 'tiktok', 'https://t/1', 'approved', 1, 10000, true, now()),
  ('cs2', 'cl2', 'cc1', '00000000-0000-0000-0000-0000000000c1', 'tiktok', 'https://t/2', 'approved', 30000, 0, false, now()),
  ('cs3', 'cl3', 'cc1', '00000000-0000-0000-0000-0000000000c1', 'tiktok', 'https://t/3', 'pending', 5000, 0, false, now()),
  ('cs4', 'cl4', 'cc2', '00000000-0000-0000-0000-0000000000c1', 'tiktok', 'https://t/4', 'pending', 0, 0, false, now() - interval '4 days');

select is(public.credit_campaign_reward('cs1') ->> 'reward', '50000', 'reward = floor(views_count/1000 × rate)');
select is((select balance from public.wallets where user_id = '00000000-0000-0000-0000-0000000000c1'), 50000::bigint, 'kreator dikredit');
select is((select remaining_budget || '/' || spent_amount from public.campaigns where id = 'cc1'), '50000/50000', 'budget berkurang, spent bertambah');
select is(public.credit_campaign_reward('cs1') ->> 'status', 'already_credited', 'panggilan ulang no-op');
select is((select balance from public.wallets where user_id = '00000000-0000-0000-0000-0000000000c1'), 50000::bigint, 'tidak kredit dua kali');

-- Dibatasi sisa budget, budget habis → campaign completed.
select is(public.credit_campaign_reward('cs2') ->> 'reward', '50000', 'reward dibatasi remaining_budget');
select is((select remaining_budget || '/' || status from public.campaigns where id = 'cc1'), '0/completed', 'budget habis → completed');
select is(public.credit_campaign_reward('cs3') ->> 'status', 'not_approved', 'submission pending tidak dikredit');

-- Rollback: exception setelah kredit → semuanya batal.
create function pg_temp.boom() returns trigger language plpgsql as $$ begin raise exception 'boom'; end; $$;
create trigger boom before update on public.campaigns for each row when (new.id = 'cc2') execute function pg_temp.boom();
update public.campaign_submissions set status = 'approved', views_final = true, views_count = 2000 where id = 'cs4';
select throws_ok($$select public.credit_campaign_reward('cs4')$$, 'P0001', 'boom', 'error di tengah RPC');
select is((select count(*)::int from public.transactions where reference_id = 'cs4'), 0, 'ledger ikut rollback');
drop trigger boom on public.campaigns;
update public.campaign_submissions set status = 'pending', views_final = false, views_count = 0 where id = 'cs4';

-- Review admin approve → reward dikredit dalam transaksi yang sama.
select is(public.review_submission('00000000-0000-0000-0000-0000000000d1', 'cs4', 'approved', null, true, 2000) ->> 'reward', '6000', 'review approve mengkredit reward');
select is((select balance from public.wallets where user_id = '00000000-0000-0000-0000-0000000000c1'), 106000::bigint, 'saldo kreator total benar');
select is((select count(*)::int from public.finance_reconciliation where diff <> 0), 0, 'rekonsiliasi 0 selisih');
select ok(not has_function_privilege('anon', 'public.credit_campaign_reward(text)', 'execute'), 'anon tidak bisa execute');
select * from finish();
rollback;
