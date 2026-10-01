-- 20261002000100_enhance_realtime_publications.sql
-- Ensure full replica identity for all core tables so real-time updates broadcast all columns
-- and add menu_items, stores, community_likes, and store_visits to supabase_realtime.

ALTER TABLE public.orders REPLICA IDENTITY FULL;
ALTER TABLE public.table_reservations REPLICA IDENTITY FULL;
ALTER TABLE public.notifications REPLICA IDENTITY FULL;
ALTER TABLE public.menu_items REPLICA IDENTITY FULL;
ALTER TABLE public.stores REPLICA IDENTITY FULL;
ALTER TABLE public.community_posts REPLICA IDENTITY FULL;
ALTER TABLE public.community_comments REPLICA IDENTITY FULL;
ALTER TABLE public.community_likes REPLICA IDENTITY FULL;
ALTER TABLE public.store_visits REPLICA IDENTITY FULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'menu_items'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.menu_items;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'stores'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.stores;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'community_likes'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.community_likes;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'store_visits'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.store_visits;
  END IF;
END $$;
