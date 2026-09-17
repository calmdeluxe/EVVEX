-- SQL Migration & Repair Script
-- -------------------------------------------------------------
-- Purpose: Eradicate any Supabase Row-Level Security (RLS) constraints
-- that might prevent eBooks and other products from appearing 
-- on the Landing Page or Dashboard trending segments.
-- 
-- Run this script in your Supabase SQL Editor as a Superuser / Admin.
-- -------------------------------------------------------------

-- 1. Ensure RLS is active but totally permissive for SELECT actions (Recommended)
-- This grants public, unconditional SELECT access to all rows in the 'books' table,
-- ensuring that status filters or publication tags never get rejected by policies.
DROP POLICY IF EXISTS "public_view_books" ON public.books;
DROP POLICY IF EXISTS "Public can view published books" ON public.books;
DROP POLICY IF EXISTS "Public can view approved books" ON public.books;
DROP POLICY IF EXISTS "public_view_books_unconditional" ON public.books;

CREATE POLICY "public_view_books_unconditional" 
ON public.books 
FOR SELECT 
TO public 
USING (true);

-- 2. Audit/Permissiveness for other core tables
DROP POLICY IF EXISTS "public_view_trivias" ON public.trivias;
CREATE POLICY "public_view_trivias" 
ON public.trivias 
FOR SELECT 
TO public 
USING (true);

-- 3. In case you want to completely disable RLS on the books table for testing or absolute certainty:
-- ALTER TABLE public.books DISABLE ROW LEVEL SECURITY;

-- 4. Re-verify table structures and default constraints
ALTER TABLE public.books ALTER COLUMN is_published SET DEFAULT 1;
ALTER TABLE public.books ALTER COLUMN status SET DEFAULT 1;

-- 5. Force existing draft books to be visible for public browsing (Optional)
-- UPDATE public.books SET is_published = 1, status = 1 WHERE is_published = 0 OR status = 0;
