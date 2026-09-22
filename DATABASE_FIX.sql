-- Comprehensive Fix for Trivia and Marketplace errors
-- Run this in your Supabase SQL Editor

-- 1. Ensure is_admin() function exists and is correct
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid() AND (is_admin = TRUE OR account_tier = 'admin')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.is_admin() TO public, anon, authenticated, service_role;

-- 2. Ensure Users table has all wallet columns
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS t_points INTEGER DEFAULT 0;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS wallet_balance INTEGER DEFAULT 0;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS total_earned INTEGER DEFAULT 0;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS total_withdrawn INTEGER DEFAULT 0;

-- 3. Fix potential type mismatch for status in books
-- Use text to match the pendng/approved/rejected system
ALTER TABLE public.books ALTER COLUMN status TYPE TEXT;

-- 4. Ensure Trivia tables exist with correct relationships
CREATE TABLE IF NOT EXISTS public.trivias (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  book_id UUID REFERENCES public.books(id) ON DELETE SET NULL,
  reward_points INTEGER DEFAULT 100,
  expiry_at TIMESTAMP WITH TIME ZONE NOT NULL,
  duration_seconds INTEGER DEFAULT 120,
  target_category TEXT DEFAULT 'all',
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.trivia_questions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  trivia_id UUID REFERENCES public.trivias(id) ON DELETE CASCADE,
  question_text TEXT NOT NULL,
  options JSONB NOT NULL,
  correct_option_index INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.trivia_participations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  trivia_id UUID REFERENCES public.trivias(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  score INTEGER NOT NULL,
  total_questions INTEGER NOT NULL,
  points_earned INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  UNIQUE(trivia_id, user_id)
);

-- 5. Final check on buyer_access (for market access errors)
CREATE TABLE IF NOT EXISTS public.buyer_access (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  book_id UUID REFERENCES public.books(id) ON DELETE CASCADE,
  buyer_email TEXT,
  access_token TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 6. Re-enable RLS and setup basic policies (Safe to re-run)
ALTER TABLE public.trivias ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trivia_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trivia_participations ENABLE ROW LEVEL SECURITY;

-- Drop and recreate policies to ensure they are fresh
DROP POLICY IF EXISTS "Everyone can view active trivias" ON public.trivias;
CREATE POLICY "Everyone can view active trivias" ON public.trivias FOR SELECT USING (expiry_at > NOW());

DROP POLICY IF EXISTS "Admins can manage trivias" ON public.trivias;
CREATE POLICY "Admins can manage trivias" ON public.trivias FOR ALL USING (is_admin());

DROP POLICY IF EXISTS "Users can view questions" ON public.trivia_questions;
CREATE POLICY "Users can view questions" ON public.trivia_questions FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can view own participations" ON public.trivia_participations;
CREATE POLICY "Users can view own participations" ON public.trivia_participations FOR SELECT USING (auth.uid() = user_id);

-- 7. PERFORMANCE OPTIMIZATIONS (PREVENTS STATEMENT TIMEOUTS)
-- Index on columns used in public list filtering and descending created_at sort order.
CREATE INDEX IF NOT EXISTS idx_books_is_published ON public.books(is_published);
CREATE INDEX IF NOT EXISTS idx_books_created_at ON public.books(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_books_published_date ON public.books(is_published, created_at DESC);

