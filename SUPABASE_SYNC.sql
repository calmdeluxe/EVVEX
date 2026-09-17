-- ====================================================================
--              SUPABASE COMPLETE SCHEMA & REPAIR SYNC SCRIPT
-- ====================================================================
-- This script contains the exact table structures, columns, defaults, 
-- stored procedures, permissions, and Row Level Security (RLS) policies 
-- to run in your Supabase SQL Editor to synchronize your database.
-- Run this non-destructively (will preserve your existing data/columns).

-- ==========================================
-- 0. STRENGTHEN THE ENVIRONMENT & EXTENSIONS
-- ==========================================
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ==========================================
-- 1. POLISHED ADMINISTRATIVE FUNCTIONS
-- ==========================================
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid() AND (is_admin = TRUE OR account_tier = 'admin')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Expressly grant execution permissions to all roles to avoid permission errors on RLS
GRANT EXECUTE ON FUNCTION public.is_admin() TO public, anon, authenticated, service_role;


-- ==========================================
-- 2. CORE USERS DIRECTORY SCHEMA
-- ==========================================
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  account_tier TEXT DEFAULT 'free',
  is_admin BOOLEAN DEFAULT FALSE,
  is_approved_author BOOLEAN DEFAULT FALSE,
  is_premium BOOLEAN DEFAULT FALSE,
  is_suspended BOOLEAN DEFAULT FALSE,
  wallet_balance INTEGER DEFAULT 0,
  t_points INTEGER DEFAULT 0,
  total_earned INTEGER DEFAULT 0,
  total_withdrawn INTEGER DEFAULT 0,
  tier_expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);


-- ==========================================
-- 3. INTERACTIVE CHANNELS (SESSIONS & LOGS)
-- ==========================================

-- A. "Who's Online" Presence Tracker
CREATE TABLE IF NOT EXISTS public.user_sessions (
  user_id UUID PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
  last_active_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- B. Audit Trail / Diagnostic User logs
CREATE TABLE IF NOT EXISTS public.user_activity (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  action TEXT NOT NULL, -- e.g., 'login', 'read_book', 'trivia_solved', etc.
  metadata TEXT, -- JSON text or custom string detailing the action
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- C. Session heartbeats stored-procedure function
CREATE OR REPLACE FUNCTION public.update_user_session(p_user_id UUID)
RETURNS VOID AS $$
BEGIN
  INSERT INTO public.user_sessions (user_id, last_active_at)
  VALUES (p_user_id, TIMEZONE('utc'::text, NOW()))
  ON CONFLICT (user_id)
  DO UPDATE SET last_active_at = TIMEZONE('utc'::text, NOW());
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Expressly grant execution permissions for authenticated users to perform ping heartbeats
GRANT EXECUTE ON FUNCTION public.update_user_session(UUID) TO authenticated, service_role;


-- ==========================================
-- 4. CORE EBOOKS CATALOGUE SCHEMA
-- ==========================================
CREATE TABLE IF NOT EXISTS public.books (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  price INTEGER DEFAULT 0 NOT NULL,
  pdf_price INTEGER DEFAULT 0,
  cover_image TEXT,
  pdf_url TEXT,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  is_published BOOLEAN DEFAULT FALSE,
  status TEXT DEFAULT 'pending',
  public_slug TEXT UNIQUE NOT NULL,
  cards_json JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);


-- ==========================================
-- 5. TRIVIA HUBS SCHEMA
-- ==========================================
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


-- ==========================================
-- 6. BUYER BOOK ACCESS & EARNINGS SCHEMA
-- ==========================================
CREATE TABLE IF NOT EXISTS public.buyer_access (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  book_id UUID REFERENCES public.books(id) ON DELETE CASCADE,
  buyer_email TEXT,
  access_token TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.ebook_purchases (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  book_id UUID REFERENCES public.books(id) ON DELETE CASCADE,
  purchased_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  UNIQUE(user_id, book_id)
);

CREATE TABLE IF NOT EXISTS public.transactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  amount INTEGER NOT NULL,
  type TEXT NOT NULL, -- e.g., 'withdrawal', 'payout', 'deposit', etc.
  bank_name TEXT,
  account_number TEXT,
  account_name TEXT,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);


-- ==========================================
-- 7. ENABLE ROW LEVEL SECURITY & DEFINE POLICIES
-- ==========================================

-- Enable security on auditing/interactive tables
ALTER TABLE public.user_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_activity ENABLE ROW LEVEL SECURITY;

-- Sessions policies
DROP POLICY IF EXISTS "Admins can view all user sessions" ON public.user_sessions;
CREATE POLICY "Admins can view all user sessions" ON public.user_sessions 
FOR SELECT USING (is_admin());

DROP POLICY IF EXISTS "Users can view and edit own sessions" ON public.user_sessions;
CREATE POLICY "Users can view and edit own sessions" ON public.user_sessions
FOR ALL USING (auth.uid() = user_id);

-- User activity policies
DROP POLICY IF EXISTS "Admins can view all activities" ON public.user_activity;
CREATE POLICY "Admins can view all activities" ON public.user_activity 
FOR SELECT USING (is_admin());

DROP POLICY IF EXISTS "Users can write own logs" ON public.user_activity;
CREATE POLICY "Users can write own logs" ON public.user_activity 
FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can view own logs" ON public.user_activity;
CREATE POLICY "Users can view own logs" ON public.user_activity 
FOR SELECT USING (auth.uid() = user_id);

-- Standard table grants to authenticated roles
GRANT ALL ON public.user_sessions TO authenticated;
GRANT ALL ON public.user_activity TO authenticated;
GRANT USAGE ON SCHEMA public TO authenticated;


-- ==========================================
-- 8. PERFORMANCE INDEXES
-- ==========================================
CREATE INDEX IF NOT EXISTS idx_books_is_published ON public.books(is_published);
CREATE INDEX IF NOT EXISTS idx_books_created_at ON public.books(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_books_published_date ON public.books(is_published, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_activity_user_id ON public.user_activity(user_id);
CREATE INDEX IF NOT EXISTS idx_user_activity_created_at ON public.user_activity(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_sessions_last_active ON public.user_sessions(last_active_at DESC);

-- SETUP COMPLETE. RUN THIS IN YOUR SUPABASE SQL EDITOR TO SYNCHRONIZE PERFECTLY.
