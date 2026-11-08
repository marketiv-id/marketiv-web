-- =============================================================================
-- 0012_storage — 8 bucket Storage + policy storage.objects (Fase 3).
--
-- ID bucket = ID bucket Appwrite lama (sama dengan CHECK user_files.bucket_id).
-- Ekstensi & ukuran mengikuti 00_BACKEND/appwrite.config.json dan BUCKET_RULES
-- (src/lib/appwrite/storage.ts); ekstensi diterjemahkan ke MIME type.
--
-- Deviasi ukuran (keputusan pemilik di log Fase 0: seluruh stack plan Free):
--   plan Free Supabase membatasi file maks 50 MB, sehingga
--   portfolios (50 MB, tetap), campaign-assets (100 MB → 50 MB),
--   deliverables (500 MB → 50 MB). Batas dalam byte desimal (50_000_000),
--   sama dengan satuan BUCKET_RULES.
--
-- Format path objek: `{user_id}/{file_id}.{ext}` (tepat satu folder = auth.uid).
--
-- Policy client (authenticated) HANYA untuk bucket publik, dan hanya di folder
-- milik sendiri. Bucket privat tidak punya policy client sama sekali: upload
-- dan baca lewat signed URL yang dibuat Route Handler (service role).
-- Tidak ada policy UPDATE: file tidak ditimpa (upsert), ganti = file baru.
-- =============================================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  -- Publik ----------------------------------------------------------------
  ('avatars', 'avatars', true, 5000000,
    array['image/jpeg', 'image/png', 'image/webp']),
  ('creator-banners', 'creator-banners', true, 5000000,
    array['image/jpeg', 'image/png', 'image/webp']),
  ('logos', 'logos', true, 5000000,
    array['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml']),
  ('portfolios', 'portfolios', true, 50000000,
    array['image/jpeg', 'image/png', 'image/webp', 'application/pdf', 'video/mp4']),
  -- Appwrite: tanpa batas ekstensi → semua MIME (NULL).
  ('campaign-assets', 'campaign-assets', true, 50000000, null),
  -- Privat ----------------------------------------------------------------
  ('deliverables', 'deliverables', false, 50000000, null),
  ('fraud-evidence', 'fraud-evidence', false, 5000000,
    array['image/jpeg', 'image/png', 'application/pdf']),
  -- 20 MiB = 20 * 1024 * 1024 (sama dengan Appwrite).
  ('user-files', 'user-files', false, 20971520,
    array[
      'image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml',
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-powerpoint',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'video/mp4', 'video/quicktime', 'video/x-msvideo'
    ])
on conflict (id) do update
  set name = excluded.name,
      public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- -----------------------------------------------------------------------------
-- Policy storage.objects — bucket publik, folder milik sendiri.
--   * INSERT : upload baru ke `{auth.uid}/<file>`.
--   * SELECT : dibutuhkan Storage API untuk DELETE (remove = SELECT + DELETE);
--              isi bucket publik toh sudah bisa dibaca lewat URL publik.
--   * DELETE : hapus file di folder sendiri.
-- Syarat path: tepat satu folder (array_length = 1) dan folder = auth.uid().
-- -----------------------------------------------------------------------------
create policy public_buckets_insert_own_folder on storage.objects
  for insert to authenticated
  with check (
    bucket_id in ('avatars', 'creator-banners', 'logos', 'portfolios', 'campaign-assets')
    and array_length(storage.foldername(name), 1) = 1
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy public_buckets_select_own_folder on storage.objects
  for select to authenticated
  using (
    bucket_id in ('avatars', 'creator-banners', 'logos', 'portfolios', 'campaign-assets')
    and array_length(storage.foldername(name), 1) = 1
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy public_buckets_delete_own_folder on storage.objects
  for delete to authenticated
  using (
    bucket_id in ('avatars', 'creator-banners', 'logos', 'portfolios', 'campaign-assets')
    and array_length(storage.foldername(name), 1) = 1
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );
