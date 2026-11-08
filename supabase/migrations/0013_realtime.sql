-- =============================================================================
-- 0013_realtime — publikasi Realtime (Fase 3).
--
-- Subscriber lama (Appwrite) hanya untuk `messages` dan `notifications`.
-- Postgres Changes menghormati RLS: subscriber hanya menerima baris yang lolos
-- policy SELECT (messages → peserta percakapan; notifications → pemilik).
-- =============================================================================

alter publication supabase_realtime add table public.messages, public.notifications;
