-- Quizoe Schema Extensions Migration SQL
-- 2026-06-07 09:30:00

-- Create custom trigger helper function if not exists
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 1. ADD ROLE COLUMN TO PROFILES TABLE
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS role text DEFAULT 'free' 
CHECK (role IN ('ceo', 'tutor', 'premium', 'free'));

-- 2. ADD REJECTION REASON AND SECURE CORRESPONDING COLUMNS TO CONTENT TABLES
ALTER TABLE public.ebooks ADD COLUMN IF NOT EXISTS status text DEFAULT 'draft' CHECK (status IN ('draft', 'pending', 'published', 'archived', 'rejected'));
ALTER TABLE public.ebooks ADD COLUMN IF NOT EXISTS rejection_reason text;

ALTER TABLE public.quizzes ADD COLUMN IF NOT EXISTS status text DEFAULT 'draft' CHECK (status IN ('draft', 'pending', 'published', 'archived', 'rejected'));
ALTER TABLE public.quizzes ADD COLUMN IF NOT EXISTS rejection_reason text;

-- 3. CREATE VIDEOS TABLE
CREATE TABLE IF NOT EXISTS public.videos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  author_user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  video_url text NOT NULL,
  status text DEFAULT 'pending' CHECK (status IN ('draft', 'pending', 'published', 'rejected')),
  rejection_reason text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Trigger for videos
DROP TRIGGER IF EXISTS videos_set_updated_at ON public.videos;
CREATE TRIGGER videos_set_updated_at
  BEFORE UPDATE ON public.videos
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 4. CREATE AUDIO TABLE
CREATE TABLE IF NOT EXISTS public.audio (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  author_user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  audio_url text NOT NULL,
  status text DEFAULT 'pending' CHECK (status IN ('draft', 'pending', 'published', 'rejected')),
  rejection_reason text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Trigger for audio
DROP TRIGGER IF EXISTS audio_set_updated_at ON public.audio;
CREATE TRIGGER audio_set_updated_at
  BEFORE UPDATE ON public.audio
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 5. CREATE COMMUNITIES TABLE
CREATE TABLE IF NOT EXISTS public.communities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  status text DEFAULT 'pending' CHECK (status IN ('draft', 'pending', 'published', 'rejected')),
  rejection_reason text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Trigger for communities
DROP TRIGGER IF EXISTS communities_set_updated_at ON public.communities;
CREATE TRIGGER communities_set_updated_at
  BEFORE UPDATE ON public.communities
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 6. CREATE HOUSES TABLE (Only CEO is allowed to write and manage)
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

-- Trigger for houses
DROP TRIGGER IF EXISTS houses_set_updated_at ON public.houses;
CREATE TRIGGER houses_set_updated_at
  BEFORE UPDATE ON public.houses
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 7. CREATE FEED_POSTS TABLE (Global announcements and creator feed)
CREATE TABLE IF NOT EXISTS public.feed_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  author_user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  author_name text NOT NULL,
  author_avatar text,
  content text NOT NULL,
  media_url text,
  media_type text CHECK (media_type IN ('image', 'video_placeholder')),
  is_announcement boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Trigger for feed_posts
DROP TRIGGER IF EXISTS feed_posts_set_updated_at ON public.feed_posts;
CREATE TRIGGER feed_posts_set_updated_at
  BEFORE UPDATE ON public.feed_posts
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 8. CREATE PLATFORM_SETTINGS TABLE
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

-- Trigger for platform_settings
DROP TRIGGER IF EXISTS platform_settings_set_updated_at ON public.platform_settings;
CREATE TRIGGER platform_settings_set_updated_at
  BEFORE UPDATE ON public.platform_settings
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Seed initial basic platform settings
INSERT INTO public.platform_settings (key, value_bool, value_num, value_text)
VALUES 
  ('vcoin_enabled', true, NULL, NULL),
  ('revenue_split', false, 0.70, '70% Tutor / 30% Platform')
ON CONFLICT (key) DO NOTHING;

-- 9. ROW LEVEL SECURITY (RLS) INSTRUCTIONS FOR EXTENSION TABLES
ALTER TABLE public.videos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audio ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.communities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.houses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feed_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.platform_settings ENABLE ROW LEVEL SECURITY;

-- Dynamic Policies for RLS
-- Videos
CREATE POLICY videos_select ON public.videos FOR SELECT USING (author_user_id = auth.uid() OR public.is_admin() OR status = 'published');
CREATE POLICY videos_insert ON public.videos FOR INSERT WITH CHECK (author_user_id = auth.uid() OR public.is_admin());
CREATE POLICY videos_update ON public.videos FOR UPDATE USING (author_user_id = auth.uid() OR public.is_admin());
CREATE POLICY videos_delete ON public.videos FOR DELETE USING (author_user_id = auth.uid() OR public.is_admin());

-- Audio
CREATE POLICY audio_select ON public.audio FOR SELECT USING (author_user_id = auth.uid() OR public.is_admin() OR status = 'published');
CREATE POLICY audio_insert ON public.audio FOR INSERT WITH CHECK (author_user_id = auth.uid() OR public.is_admin());
CREATE POLICY audio_update ON public.audio FOR UPDATE USING (author_user_id = auth.uid() OR public.is_admin());
CREATE POLICY audio_delete ON public.audio FOR DELETE USING (author_user_id = auth.uid() OR public.is_admin());

-- Communities
CREATE POLICY communities_select ON public.communities FOR SELECT USING (owner_user_id = auth.uid() OR public.is_admin() OR status = 'published');
CREATE POLICY communities_insert ON public.communities FOR INSERT WITH CHECK (owner_user_id = auth.uid() OR public.is_admin());
CREATE POLICY communities_update ON public.communities FOR UPDATE USING (owner_user_id = auth.uid() OR public.is_admin());
CREATE POLICY communities_delete ON public.communities FOR DELETE USING (owner_user_id = auth.uid() OR public.is_admin());

-- Houses (Only admin reads all, alters all. Normal users can view published ones)
CREATE POLICY houses_select ON public.houses FOR SELECT USING (true);
CREATE POLICY houses_all ON public.houses FOR ALL USING (public.is_admin());

-- Feed Posts (Readable by all authenticated users, writable by author/admin)
CREATE POLICY feed_posts_select ON public.feed_posts FOR SELECT USING (true);
CREATE POLICY feed_posts_insert ON public.feed_posts FOR INSERT WITH CHECK (author_user_id = auth.uid() OR public.is_admin());
CREATE POLICY feed_posts_update ON public.feed_posts FOR UPDATE USING (author_user_id = auth.uid() OR public.is_admin());
CREATE POLICY feed_posts_delete ON public.feed_posts FOR DELETE USING (author_user_id = auth.uid() OR public.is_admin());

-- Platform Settings (All can read, only admin can update)
CREATE POLICY settings_select ON public.platform_settings FOR SELECT USING (true);
CREATE POLICY settings_all ON public.platform_settings FOR ALL USING (public.is_admin());
