-- ==========================================
-- COMPLETE SYSTEM SYNCHRONIZATION: TRIVIA SYSTEM
-- ==========================================
-- This script contains the single-point-of-truth definition for 
-- the entire trivia architecture on your Supabase instance.
--
-- Running this script ensures that:
-- 1. All necessary tables are initialized with accurate types, defaults, and keys.
-- 2. Your columns (such as duration_seconds, status, slug, thumbnail_url) are added/fixed.
-- 3. High-performance indexes are created.
-- 4. Row-Level Security (RLS) is correctly enabled.
-- 5. Non-recursive security policies are put in place to avoid infinite recursion loops.
-- ==========================================

BEGIN;

-- ========================================================
-- 1. TABLES CREATION & GRACEFUL ALTERS (IDEMPOTENT SETUP)
-- ========================================================

-----------------------------------------------------------
-- TABLE: public.trivias (Main trivia sessions)
-----------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.trivias (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  book_id UUID, -- Foreign key is set up separately to ensure safety
  slug TEXT,
  reward_points INTEGER DEFAULT 10,
  duration_seconds INTEGER DEFAULT 120,
  target_category TEXT DEFAULT 'all',
  expiry_at TIMESTAMP WITH TIME ZONE,
  status TEXT DEFAULT 'draft',
  thumbnail_url TEXT,
  creator_id UUID REFERENCES auth.users,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Ensure correct columns and safe expansion of the table
ALTER TABLE public.trivias ADD COLUMN IF NOT EXISTS duration_seconds INTEGER DEFAULT 120;
ALTER TABLE public.trivias ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'draft';
ALTER TABLE public.trivias ADD COLUMN IF NOT EXISTS thumbnail_url TEXT;
ALTER TABLE public.trivias ADD COLUMN IF NOT EXISTS slug TEXT;
ALTER TABLE public.trivias ADD COLUMN IF NOT EXISTS target_category TEXT DEFAULT 'all';

-- Add unique constraint on slug if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'trivias_slug_key'
  ) THEN
    ALTER TABLE public.trivias ADD CONSTRAINT trivias_slug_key UNIQUE (slug);
  END IF;
END $$;

-- Add unique constraint on book_id if not exists (One trivia session per book)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'trivias_book_id_key'
  ) THEN
    ALTER TABLE public.trivias ADD CONSTRAINT trivias_book_id_key UNIQUE (book_id);
  END IF;
END $$;

-- Add foreign key constraint safely
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'trivias_book_id_fkey'
  ) THEN
    ALTER TABLE public.trivias ADD CONSTRAINT trivias_book_id_fkey FOREIGN KEY (book_id) REFERENCES public.books(id) ON DELETE SET NULL;
  END IF;
END $$;

-----------------------------------------------------------
-- TABLE: public.trivia_questions (Question bank for each session)
-----------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.trivia_questions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  ebook_id UUID, -- Pointed to book id
  question TEXT NOT NULL,
  options TEXT[] NOT NULL, -- PostgreSQL array of options
  correct_answer TEXT NOT NULL,
  explanation TEXT,
  difficulty TEXT DEFAULT 'Medium',
  points INTEGER DEFAULT 10,
  order_number INTEGER,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Safe addition of constraints on trivia_questions
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'trivia_questions_ebook_id_fkey'
  ) THEN
    ALTER TABLE public.trivia_questions ADD CONSTRAINT trivia_questions_ebook_id_fkey FOREIGN KEY (ebook_id) REFERENCES public.books(id) ON DELETE SET NULL;
  END IF;
END $$;

-----------------------------------------------------------
-- TABLE: public.user_trivia_attempts
-----------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.user_trivia_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  trivia_question_id UUID,
  is_correct BOOLEAN,
  answered_at TIMESTAMPTZ DEFAULT NOW()
);

-- Safe addition of foreign keys for user_trivia_attempts
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'user_trivia_attempts_user_id_fkey'
  ) THEN
    ALTER TABLE public.user_trivia_attempts ADD CONSTRAINT user_trivia_attempts_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'user_trivia_attempts_trivia_question_id_fkey'
  ) THEN
    ALTER TABLE public.user_trivia_attempts ADD CONSTRAINT user_trivia_attempts_trivia_question_id_fkey FOREIGN KEY (trivia_question_id) REFERENCES public.trivia_questions(id) ON DELETE CASCADE;
  END IF;
END $$;

-----------------------------------------------------------
-- TABLE: public.daily_trivia_attempts (Allows strict enforce of limits)
-----------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.daily_trivia_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  ebook_id UUID,
  attempt_date DATE DEFAULT CURRENT_DATE,
  score INTEGER,
  total_questions INTEGER,
  completed BOOLEAN DEFAULT FALSE,
  won BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Safe addition of foreign keys for daily_trivia_attempts
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'daily_trivia_attempts_user_id_fkey'
  ) THEN
    ALTER TABLE public.daily_trivia_attempts ADD CONSTRAINT daily_trivia_attempts_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'daily_trivia_attempts_ebook_id_fkey'
  ) THEN
    ALTER TABLE public.daily_trivia_attempts ADD CONSTRAINT daily_trivia_attempts_ebook_id_fkey FOREIGN KEY (ebook_id) REFERENCES public.books(id) ON DELETE CASCADE;
  END IF;
END $$;

-----------------------------------------------------------
-- TABLE: public.trivia_promos (Main live promotional systems)
-----------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.trivia_promos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  prize TEXT NOT NULL,
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);


-- ========================================================
-- 2. HIGH PERFORMANCE INDEXING (FOR OPTIMIZED LOOKUPS)
-- ========================================================
CREATE INDEX IF NOT EXISTS idx_trivias_book_id ON public.trivias(book_id);
CREATE INDEX IF NOT EXISTS idx_trivias_slug ON public.trivias(slug);
CREATE INDEX IF NOT EXISTS idx_trivia_questions_ebook_id ON public.trivia_questions(ebook_id);
CREATE INDEX IF NOT EXISTS idx_user_trivia_attempts_user_id ON public.user_trivia_attempts(user_id);
CREATE INDEX IF NOT EXISTS idx_daily_trivia_attempts_user_date ON public.daily_trivia_attempts(user_id, attempt_date);


-- ========================================================
-- 3. SECURITY: ROW LEVEL SECURITY (RLS) CONFIGURATION
-- ========================================================
ALTER TABLE public.trivias ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trivia_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_trivia_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_trivia_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trivia_promos ENABLE ROW LEVEL SECURITY;

-- ========================================================
-- 4. NON-RECURSIVE SECURITY POLICIES (COMPREHENSIVE POLICIES)
-- ========================================================

-- Clean up any prior conflicting/clashing/stale policies
DROP POLICY IF EXISTS "Public trivias" ON public.trivias;
DROP POLICY IF EXISTS "Admins trivias" ON public.trivias;
DROP POLICY IF EXISTS "Admin full access on trivia" ON public.trivia_questions;
DROP POLICY IF EXISTS "Users read trivia" ON public.trivia_questions;
DROP POLICY IF EXISTS "Users manage attempts" ON public.user_trivia_attempts;
DROP POLICY IF EXISTS "Users manage daily attempts" ON public.daily_trivia_attempts;
DROP POLICY IF EXISTS "Public trivia promos" ON public.trivia_promos;
DROP POLICY IF EXISTS "Admin full access on trivia promos" ON public.trivia_promos;

-----------------------------------------------------------
-- POLICIES FOR: public.trivias
-----------------------------------------------------------
-- Policy A: Anyone can view active or general trivia configurations
CREATE POLICY "Public trivias" ON public.trivias
  FOR SELECT
  USING (true);

-- Policy B: Only authorized admins can initialize/delete/alter trivia sessions
CREATE POLICY "Admins trivias" ON public.trivias
  FOR ALL
  USING (
    auth.jwt() ->> 'email' IN ('samuelchukwuemeke05@gmail.com')
  );

-----------------------------------------------------------
-- POLICIES FOR: public.trivia_questions
-----------------------------------------------------------
-- Policy A: Full access to Admins to build the question pool
CREATE POLICY "Admin full access on trivia" ON public.trivia_questions
  FOR ALL
  USING (
    auth.jwt() ->> 'email' IN ('samuelchukwuemeke05@gmail.com')
  );

-- Policy B: Users can select questions only for books they purchased OR for free books
CREATE POLICY "Users read trivia" ON public.trivia_questions
  FOR SELECT
  USING (
    (ebook_id IS NULL) -- General knowledge trivia questions
    OR
    EXISTS (
      SELECT 1 FROM public.ebook_purchases 
      WHERE ebook_purchases.ebook_id = public.trivia_questions.ebook_id 
      AND ebook_purchases.user_id = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1 FROM public.books 
      WHERE books.id = public.trivia_questions.ebook_id 
      AND books.is_free = TRUE
    )
  );

-----------------------------------------------------------
-- POLICIES FOR: public.user_trivia_attempts
-----------------------------------------------------------
-- Policy A: Owners manage their individual question attempt records
CREATE POLICY "Users manage attempts" ON public.user_trivia_attempts
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-----------------------------------------------------------
-- POLICIES FOR: public.daily_trivia_attempts
-----------------------------------------------------------
-- Policy A: Owners create, select and manage their daily submission progress records
CREATE POLICY "Users manage daily attempts" ON public.daily_trivia_attempts
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-----------------------------------------------------------
-- POLICIES FOR: public.trivia_promos
-----------------------------------------------------------
-- Policy A: General public can read current promotional details
CREATE POLICY "Public trivia promos" ON public.trivia_promos
  FOR SELECT
  USING (true);

-- Policy B: Admins retain complete system control
CREATE POLICY "Admin full access on trivia promos" ON public.trivia_promos
  FOR ALL
  USING (
    auth.jwt() ->> 'email' IN ('samuelchukwuemeke05@gmail.com')
  );

COMMIT;
