-- ==========================================
-- ULTIMATE TRIVIA SYSTEM SCHEMA FIX
-- ==========================================
-- This script ensures ALL required tables and columns exist for the Trivia System.
-- Run this in your Supabase SQL Editor if you see "Not-Null Constraint" or "Column Missing" errors.

-- 1. TRIVIAS Table (Campaigns/Sessions)
CREATE TABLE IF NOT EXISTS public.trivias (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    book_id UUID REFERENCES public.books(id) ON DELETE CASCADE UNIQUE,
    title TEXT NOT NULL,
    description TEXT,
    status TEXT DEFAULT 'draft', -- draft, active, archived
    reward_points INTEGER DEFAULT 0,
    duration_seconds INTEGER DEFAULT 600,
    expiry_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. TRIVIA_QUESTIONS Table
CREATE TABLE IF NOT EXISTS public.trivia_questions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    ebook_id UUID REFERENCES public.books(id) ON DELETE CASCADE,
    question TEXT NOT NULL,
    options TEXT[] DEFAULT '{}',
    correct_answer TEXT NOT NULL,
    correct_option_index INTEGER, -- Nullable to prevent 500 errors
    explanation TEXT,
    difficulty TEXT DEFAULT 'Medium',
    points INTEGER DEFAULT 10,
    order_number INTEGER,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Ensure all columns exist and constraints are relaxed
ALTER TABLE public.trivia_questions ADD COLUMN IF NOT EXISTS explanation TEXT;
ALTER TABLE public.trivia_questions ADD COLUMN IF NOT EXISTS difficulty TEXT DEFAULT 'Medium';
ALTER TABLE public.trivia_questions ADD COLUMN IF NOT EXISTS points INTEGER DEFAULT 10;
ALTER TABLE public.trivia_questions ADD COLUMN IF NOT EXISTS order_number INTEGER;
ALTER TABLE public.trivia_questions ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;
ALTER TABLE public.trivia_questions ADD COLUMN IF NOT EXISTS correct_option_index INTEGER;
ALTER TABLE public.trivia_questions ALTER COLUMN correct_option_index DROP NOT NULL;

-- Fix for 'questions' column in 'trivias' table if it exists (older schema residual)
DO $$ 
BEGIN 
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'trivias' AND column_name = 'questions') THEN
        ALTER TABLE public.trivias ALTER COLUMN questions DROP NOT NULL;
    END IF;
END $$;

-- 3. DAILY_TRIVIA_ATTEMPTS Table (Summary of a user's trivia run)
CREATE TABLE IF NOT EXISTS public.daily_trivia_attempts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    ebook_id UUID REFERENCES public.books(id),
    score INTEGER DEFAULT 0,
    total_questions INTEGER DEFAULT 0,
    completed BOOLEAN DEFAULT TRUE,
    attempt_date DATE DEFAULT CURRENT_DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ENFORCE: One attempt EVER per user per book (Fraud Prevention)
DROP INDEX IF EXISTS idx_one_attempt_per_book;
DROP INDEX IF EXISTS idx_one_attempt_general;
CREATE UNIQUE INDEX idx_one_attempt_per_book ON public.daily_trivia_attempts (user_id, ebook_id) WHERE ebook_id IS NOT NULL;
CREATE UNIQUE INDEX idx_one_attempt_general ON public.daily_trivia_attempts (user_id) WHERE ebook_id IS NULL;

-- 4. USER_TRIVIA_ATTEMPTS Table (Detailed tracking per question)
CREATE TABLE IF NOT EXISTS public.user_trivia_attempts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    trivia_question_id UUID REFERENCES public.trivia_questions(id) ON DELETE CASCADE,
    is_correct BOOLEAN NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. EBOOK_PURCHASES Table (Access Control)
CREATE TABLE IF NOT EXISTS public.ebook_purchases (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    ebook_id UUID REFERENCES public.books(id) ON DELETE CASCADE,
    purchase_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, ebook_id)
);

-- 6. WITHDRAWALS Table
CREATE TABLE IF NOT EXISTS public.withdrawals (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    amount INTEGER NOT NULL,
    bank_name TEXT NOT NULL,
    account_number TEXT NOT NULL,
    account_name TEXT NOT NULL,
    status TEXT DEFAULT 'pending', -- pending, completed, rejected
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 7. TRIVIA_PROMOS Table
CREATE TABLE IF NOT EXISTS public.trivia_promos (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    title TEXT NOT NULL,
    prize TEXT NOT NULL,
    start_time TIMESTAMP WITH TIME ZONE NOT NULL,
    end_time TIMESTAMP WITH TIME ZONE NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS and setup policies for trivia_promos
ALTER TABLE public.trivia_promos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can view active trivia promos" ON public.trivia_promos;
CREATE POLICY "Public can view active trivia promos" ON public.trivia_promos FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admins have full access on trivia promos" ON public.trivia_promos;
CREATE POLICY "Admins have full access on trivia promos" ON public.trivia_promos FOR ALL USING (
    auth.jwt() ->> 'email' IN ('samuelchukwuemeke05@gmail.com')
);

-- Add Index for Author Stats performance
CREATE INDEX IF NOT EXISTS idx_withdrawals_user ON public.withdrawals(user_id);
CREATE INDEX IF NOT EXISTS idx_ebook_purchases_book ON public.ebook_purchases(ebook_id);
CREATE INDEX IF NOT EXISTS idx_transactions_book ON public.transactions(book_id);
CREATE INDEX IF NOT EXISTS idx_daily_attempts_book ON public.daily_trivia_attempts(ebook_id);

-- Force PostgREST Cache Refresh
NOTIFY pgrst, 'reload schema';
COMMENT ON TABLE public.trivia_questions IS 'Trivia Questions Store - Refreshed ' || now();
COMMENT ON TABLE public.daily_trivia_attempts IS 'User Trivia Participation - Refreshed ' || now();
