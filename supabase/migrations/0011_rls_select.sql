-- =============================================================================
-- 0011_rls_select — policy RLS (Fase 3): browser HANYA membaca.
--
-- Prinsip:
--   * Hanya policy SELECT untuk anon/authenticated. Tidak ada policy INSERT,
--     UPDATE, atau DELETE untuk client di tabel mana pun. Semua tulis lewat
--     Next.js Route Handler dengan service role (melewati RLS).
--       → menutup celah #1 (user mengubah users.role/status/kyc_status sendiri)
--       → menutup celah #2 (campaign aktif dibuat dari browser)
--   * Lapisan kedua: hak INSERT/UPDATE/DELETE/TRUNCATE dicabut dari anon dan
--     authenticated di schema public (termasuk default privileges untuk tabel
--     yang dibuat migration berikutnya).
--   * Satu policy permissive per tabel per role (hindari advisor
--     multiple_permissive_policies). Akses admin digabung lewat
--     `(select private.is_admin())`, dievaluasi sekali per query (initPlan).
--   * `auth.uid()` selalu dibungkus `(select auth.uid())`.
--   * Kolom yang dipakai policy sudah ber-index sejak Fase 2 (lihat log
--     progress/fase-03.md untuk daftar index per policy).
-- =============================================================================

-- =============================================================================
-- A. Publik (anon + authenticated)
-- =============================================================================

create policy umkm_profiles_select_public on public.umkm_profiles
  for select to anon, authenticated
  using (true);

create policy creator_profiles_select_public on public.creator_profiles
  for select to anon, authenticated
  using (true);

create policy creator_social_accounts_select_public on public.creator_social_accounts
  for select to anon, authenticated
  using (true);

create policy creator_portfolios_select_public on public.creator_portfolios
  for select to anon, authenticated
  using (true);

-- Rate card: published untuk semua; draft hanya untuk pemilik (dan admin).
create policy rate_cards_select_published_or_owner on public.rate_cards
  for select to anon, authenticated
  using (
    status = 'published'
    or creator_id = (select auth.uid())
    or (select private.is_admin())
  );

-- Paket mengikuti visibilitas rate card induknya (paket rate card draft tidak
-- bocor ke publik).
create policy rate_card_packages_select_via_rate_card on public.rate_card_packages
  for select to anon, authenticated
  using (
    rate_card_id in (
      select rc.id
        from public.rate_cards rc
       where rc.status = 'published'
          or rc.creator_id = (select auth.uid())
          or (select private.is_admin())
    )
  );

-- =============================================================================
-- B. Publik setelah publish: campaign non-draft untuk semua; draft hanya
--    pemilik (UMKM) dan admin. Brief & aset mengikuti campaign-nya.
-- =============================================================================

create policy campaigns_select_published_or_owner on public.campaigns
  for select to anon, authenticated
  using (
    status <> 'draft'
    or umkm_id = (select auth.uid())
    or (select private.is_admin())
  );

create policy campaign_briefs_select_via_campaign on public.campaign_briefs
  for select to anon, authenticated
  using (
    campaign_id in (
      select c.id
        from public.campaigns c
       where c.status <> 'draft'
          or c.umkm_id = (select auth.uid())
          or (select private.is_admin())
    )
  );

create policy campaign_assets_select_via_campaign on public.campaign_assets
  for select to anon, authenticated
  using (
    campaign_id in (
      select c.id
        from public.campaigns c
       where c.status <> 'draft'
          or c.umkm_id = (select auth.uid())
          or (select private.is_admin())
    )
  );

-- =============================================================================
-- C. Pemilik baris (authenticated)
-- =============================================================================

create policy users_select_own on public.users
  for select to authenticated
  using (id = (select auth.uid()) or (select private.is_admin()));

create policy wallets_select_own on public.wallets
  for select to authenticated
  using (user_id = (select auth.uid()) or (select private.is_admin()));

create policy transactions_select_own on public.transactions
  for select to authenticated
  using (user_id = (select auth.uid()) or (select private.is_admin()));

create policy payments_select_own on public.payments
  for select to authenticated
  using (user_id = (select auth.uid()) or (select private.is_admin()));

create policy withdrawals_select_own on public.withdrawals
  for select to authenticated
  using (user_id = (select auth.uid()) or (select private.is_admin()));

create policy notifications_select_own on public.notifications
  for select to authenticated
  using (user_id = (select auth.uid()) or (select private.is_admin()));

create policy user_files_select_own on public.user_files
  for select to authenticated
  using (user_id = (select auth.uid()) or (select private.is_admin()));

create policy user_storage_usage_select_own on public.user_storage_usage
  for select to authenticated
  using (user_id = (select auth.uid()) or (select private.is_admin()));

create policy appeals_select_own on public.appeals
  for select to authenticated
  using (user_id = (select auth.uid()) or (select private.is_admin()));

-- =============================================================================
-- D. Kreator pengklaim + UMKM pemilik campaign (authenticated)
-- =============================================================================

create policy campaign_claims_select_creator_or_campaign_owner on public.campaign_claims
  for select to authenticated
  using (
    creator_id = (select auth.uid())
    or campaign_id in (
      select c.id from public.campaigns c where c.umkm_id = (select auth.uid())
    )
    or (select private.is_admin())
  );

create policy campaign_submissions_select_creator_or_campaign_owner on public.campaign_submissions
  for select to authenticated
  using (
    creator_id = (select auth.uid())
    or campaign_id in (
      select c.id from public.campaigns c where c.umkm_id = (select auth.uid())
    )
    or (select private.is_admin())
  );

-- =============================================================================
-- E. Dua pihak: UMKM dan kreator (authenticated)
-- =============================================================================

create policy conversations_select_participant on public.conversations
  for select to authenticated
  using (
    umkm_id = (select auth.uid())
    or creator_id = (select auth.uid())
    or (select private.is_admin())
  );

create policy messages_select_participant on public.messages
  for select to authenticated
  using (
    private.is_conversation_participant(conversation_id)
    or (select private.is_admin())
  );

create policy offers_select_party on public.offers
  for select to authenticated
  using (
    umkm_id = (select auth.uid())
    or creator_id = (select auth.uid())
    or (select private.is_admin())
  );

create policy orders_select_party on public.orders
  for select to authenticated
  using (
    umkm_id = (select auth.uid())
    or creator_id = (select auth.uid())
    or (select private.is_admin())
  );

create policy deliverables_select_order_party on public.deliverables
  for select to authenticated
  using (
    private.is_order_party(order_id)
    or (select private.is_admin())
  );

create policy revisions_select_order_party on public.revisions
  for select to authenticated
  using (
    private.is_order_party(order_id)
    or (select private.is_admin())
  );

-- =============================================================================
-- F. Server-only: tidak ada akses client sama sekali.
--    Policy RESTRICTIVE `using (false)` menegaskan niat secara eksplisit (dan
--    membuat advisor rls_enabled_no_policy diam). Tanpa policy permissive,
--    hasilnya tetap tolak semua; hak tabel juga dicabut di bagian G.
-- =============================================================================

create policy escrows_deny_client on public.escrows
  as restrictive for select to anon, authenticated using (false);

create policy fraud_checks_deny_client on public.fraud_checks
  as restrictive for select to anon, authenticated using (false);

create policy ratecard_deliverable_validations_deny_client on public.ratecard_deliverable_validations
  as restrictive for select to anon, authenticated using (false);

create policy ai_requests_deny_client on public.ai_requests
  as restrictive for select to anon, authenticated using (false);

create policy otp_rate_limits_deny_client on public.otp_rate_limits
  as restrictive for select to anon, authenticated using (false);

create policy legacy_user_map_deny_client on public.legacy_user_map
  as restrictive for select to anon, authenticated using (false);

-- =============================================================================
-- G. Hak tabel (lapisan kedua di bawah RLS)
-- =============================================================================

-- G1. Tidak ada tulis dari role API di tabel mana pun di schema public.
revoke insert, update, delete, truncate, references, trigger
  on all tables in schema public from anon, authenticated;

-- G2. Tabel server-only: cabut semua hak role API.
revoke all on table
  public.escrows,
  public.fraud_checks,
  public.ratecard_deliverable_validations,
  public.ai_requests,
  public.otp_rate_limits,
  public.legacy_user_map
  from anon, authenticated;

-- G3. Tabel yang butuh login: anon tidak perlu SELECT sama sekali.
revoke select on table
  public.users,
  public.wallets,
  public.transactions,
  public.payments,
  public.withdrawals,
  public.notifications,
  public.user_files,
  public.user_storage_usage,
  public.appeals,
  public.campaign_claims,
  public.campaign_submissions,
  public.conversations,
  public.messages,
  public.offers,
  public.orders,
  public.deliverables,
  public.revisions
  from anon;

-- G4. Default untuk objek yang dibuat migration berikutnya (oleh postgres):
--     tabel baru tidak otomatis bisa ditulis anon/authenticated, dan fungsi baru
--     (mis. RPC uang SECURITY DEFINER di Fase 7/8) tidak otomatis bisa
--     dipanggil anon/authenticated. Grant eksplisit bila memang diperlukan.
alter default privileges for role postgres in schema public
  revoke insert, update, delete, truncate, references, trigger on tables from anon, authenticated;
alter default privileges for role postgres in schema public
  revoke execute on functions from public, anon, authenticated;

-- G5. Fungsi yang sudah ada di public (trigger set_updated_at) tidak perlu
--     dieksekusi langsung oleh role API.
revoke execute on function public.set_updated_at() from public, anon, authenticated;
