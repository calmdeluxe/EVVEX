-- Migration Script: Quizoe Database Schema Update
-- Targets: Supabase PostgreSQL instance
-- Updates: Adds 'role' to profiles/users, content moderation status columns, 'houses', 'feed_posts', and 'platform_settings' tables with RLS and triggers.

-- Helper dynamic function to automatically refresh the updated_at timestamp
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 1. EXTEND PROFILE OR USER ENTITY ROLES
-- Safely appends role column to public.profiles if it exists, otherwise creates it.
DO $$ 
BEGIN
  BEGIN
    ALTER TABLE public.profiles 
    ADD COLUMN IF NOT EXISTS role text DEFAULT 'free' 
    CHECK (role IN ('ceo', 'tutor', 'premium', 'free'));
  EXCEPTION
    WHEN undefined_table THEN
      -- If a profiles table does not exist yet to wrap auth.users, create it
      CREATE TABLE IF NOT EXISTS public.profiles (
        id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
        username text UNIQUE NOT NULL,
        avatar_url text,
        role text DEFAULT 'free' CHECK (role IN ('ceo', 'tutor', 'premium', 'free')),
        created_at timestamptz DEFAULT now(),
        updated_at timestamptz DEFAULT now()
      );
  END;
END $$;

-- 2. ENHANCE EXISTING CONTENT TABLES FOR MODERATION
-- Appends status ('draft', 'pending', 'published', 'archived', 'rejected') and rejection_reason columns
DO $$ 
BEGIN
  -- Validate 'ebooks' exists before altering
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'ebooks') THEN
    ALTER TABLE public.ebooks ADD COLUMN IF NOT EXISTS status text DEFAULT 'draft' CHECK (status IN ('draft', 'pending', 'published', 'archived', 'rejected'));
    ALTER TABLE public.ebooks ADD COLUMN IF NOT EXISTS rejection_reason text;
  END IF;

  -- Validate 'quizzes' exists before altering
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'quizzes') THEN
    ALTER TABLE public.quizzes ADD COLUMN IF NOT EXISTS status text DEFAULT 'draft' CHECK (status IN ('draft', 'pending', 'published', 'archived', 'rejected'));
    ALTER TABLE public.quizzes ADD COLUMN IF NOT EXISTS rejection_reason text;
  END IF;
END $$;

-- 3. CREATE HOUSES TABLE
-- Only CEO has administrative authorization to deploy houses
CREATE TABLE IF NOT EXISTS public.houses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  description text,
  banner_url text,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  status text DEFAULT 'published' CHECK (status IN ('draft', 'pending', 'published', 'rejected')),
  rejection_reason text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

DROP TRIGGER IF EXISTS houses_set_updated_at ON public.houses;
CREATE TRIGGER houses_set_updated_at
  BEFORE UPDATE ON public.houses
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 4. CREATE FEED_POSTS TABLE
-- Global bulletin, creator portfolio items and announcements
CREATE TABLE IF NOT EXISTS public.feed_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  author_user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  author_name text NOT NULL,
  author_avatar text,
  content text NOT NULL,
  media_url text,
  media_type text CHECK (media_type IN ('image', 'video_placeholder')),
  likes_count integer DEFAULT 0,
  shares_count integer DEFAULT 0,
  is_announcement boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

DROP TRIGGER IF EXISTS feed_posts_set_updated_at ON public.feed_posts;
CREATE TRIGGER feed_posts_set_updated_at
  BEFORE UPDATE ON public.feed_posts
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 5. CREATE PLATFORM_SETTINGS TABLE
-- Handles global parameters such as revenue split (e.g. 70/30 metrics)
CREATE TABLE IF NOT EXISTS public.platform_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text UNIQUE NOT NULL,
  value_text text,
  value_bool boolean DEFAULT false,
  value_num numeric,
  updated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

DROP TRIGGER IF EXISTS platform_settings_set_updated_at ON public.platform_settings;
CREATE TRIGGER platform_settings_set_updated_at
  BEFORE UPDATE ON public.platform_settings
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Populate standard platform parameters
INSERT INTO public.platform_settings (key, value_bool, value_num, value_text)
VALUES 
  ('vcoin_enabled', true, NULL, 'Vanguard coin system toggle'),
  ('revenue_split', false, 0.70, '70% Tutor / 30% Platform settings')
ON CONFLICT (key) DO NOTHING;

-- 6. ENABLE ROW LEVEL SECURITY (RLS) FOR STRUCTURAL TABLES
ALTER TABLE public.houses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feed_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.platform_settings ENABLE ROW LEVEL SECURITY;

-- 7. DEFINE ACCESS POLICIES
-- Houses: Publicly queryable; write permission restricted to creators / CEO admins
CREATE POLICY IF NOT EXISTS houses_select ON public.houses FOR SELECT USING (true);
CREATE POLICY IF NOT EXISTS houses_all ON public.houses 
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE profiles.id = auth.uid() AND profiles.role = 'ceo'
    )
  );

-- Feed Posts: Publicly queryable; authenticated users can write their own
CREATE POLICY IF NOT EXISTS feed_posts_select ON public.feed_posts FOR SELECT USING (true);
CREATE POLICY IF NOT EXISTS feed_posts_insert ON public.feed_posts FOR INSERT WITH CHECK (author_user_id = auth.uid());
CREATE POLICY IF NOT EXISTS feed_posts_update ON public.feed_posts FOR UPDATE USING (author_user_id = auth.uid());
CREATE POLICY IF NOT EXISTS feed_posts_delete ON public.feed_posts FOR DELETE USING (author_user_id = auth.uid());

-- Platform Settings: Read access granted; write protection limited to CEO
CREATE POLICY IF NOT EXISTS settings_select ON public.platform_settings FOR SELECT USING (true);
CREATE POLICY IF NOT EXISTS settings_write ON public.platform_settings 
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE profiles.id = auth.uid() AND profiles.role = 'ceo'
    )
  );
