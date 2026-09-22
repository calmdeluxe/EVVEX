-- SQL Fix for Trivia Backend alignment
-- Run this in your Supabase SQL Editor to fix the 500 errors

-- 1. Fix trivias table
ALTER TABLE public.trivias ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'draft';
ALTER TABLE public.trivias ADD COLUMN IF NOT EXISTS thumbnail_url TEXT;
ALTER TABLE public.trivias ADD CONSTRAINT trivias_book_id_key UNIQUE (book_id);

-- 2. Fix trivia_questions table (align with server.ts code)
-- This might be tricky if you already have data, but we need to rename or add columns

-- Rename columns if they exist with old names
DO $$
BEGIN
    -- Fix question field
    IF EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'trivia_questions' AND column_name = 'question_text') THEN
        ALTER TABLE public.trivia_questions RENAME COLUMN question_text TO question;
    END IF;
    
    -- Fix options field (if JSONB, we might need manual conversion, but adding as TEXT[] first for server.ts)
    -- Actually just add the ones server.ts expects if missing
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'trivia_questions' AND column_name = 'question') THEN
        ALTER TABLE public.trivia_questions ADD COLUMN question TEXT NOT NULL DEFAULT '';
    END IF;
    
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'trivia_questions' AND column_name = 'options') THEN
        ALTER TABLE public.trivia_questions ADD COLUMN options TEXT[] NOT NULL DEFAULT '{}';
    END IF;

    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'trivia_questions' AND column_name = 'correct_answer') THEN
        ALTER TABLE public.trivia_questions ADD COLUMN correct_answer TEXT NOT NULL DEFAULT '';
    END IF;

    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'trivia_questions' AND column_name = 'explanation') THEN
        ALTER TABLE public.trivia_questions ADD COLUMN explanation TEXT;
    END IF;

    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'trivia_questions' AND column_name = 'difficulty') THEN
        ALTER TABLE public.trivia_questions ADD COLUMN difficulty TEXT DEFAULT 'Medium';
    END IF;

    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'trivia_questions' AND column_name = 'points') THEN
        ALTER TABLE public.trivia_questions ADD COLUMN points INTEGER DEFAULT 10;
    END IF;

    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'trivia_questions' AND column_name = 'order_number') THEN
        ALTER TABLE public.trivia_questions ADD COLUMN order_number INTEGER;
    END IF;

    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'trivia_questions' AND column_name = 'is_active') THEN
        ALTER TABLE public.trivia_questions ADD COLUMN is_active BOOLEAN DEFAULT TRUE;
    END IF;
END $$;

-- 3. Create ebook_purchases view (Crucial for trivia RLS)
CREATE OR REPLACE VIEW public.ebook_purchases AS
SELECT user_id, book_id as ebook_id
FROM public.transactions
WHERE status = 'successful' AND type = 'purchase';

-- Ensure permissions
GRANT SELECT ON public.ebook_purchases TO authenticated, anon, service_role;

-- 4. Create and align trivia_promos
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

GRANT SELECT, INSERT, UPDATE, DELETE ON public.trivia_promos TO authenticated, anon, service_role;
