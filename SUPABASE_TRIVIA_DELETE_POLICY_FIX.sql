-- ======================================================================
-- SUPABASE SECURITY & RLS REPAIR: TRIVIA DELETION SYSTEM
-- ======================================================================
-- This script fixes the issue where trivia challenges could not be deleted
-- because Row-Level Security (RLS) policies on 'daily_trivia_attempts' 
-- and other tracking tables prevented administrators from deleting entries 
-- belonging to other users.
--
-- Running this script ensures that:
-- 1. All necessary tables have RLS enabled correctly.
-- 2. The database admin ('samuelchukwuemeke05@gmail.com') has full, absolute
--    override permissions (ALL operations: SELECT, INSERT, UPDATE, DELETE) 
--    across all trivia-related tables.
-- 3. Soft or hard deleted items are prevented from being fetched.
-- ======================================================================

BEGIN;

-----------------------------------------------------------
-- 1. POLICIES FOR: public.trivias (Main trivia configurations)
-----------------------------------------------------------
ALTER TABLE public.trivias ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public_view_trivias" ON public.trivias;
DROP POLICY IF EXISTS "public_view_trivias_policy" ON public.trivias;
DROP POLICY IF EXISTS "Public trivias" ON public.trivias;
DROP POLICY IF EXISTS "Admins trivias" ON public.trivias;
DROP POLICY IF EXISTS "Users can request trivias" ON public.trivias;
DROP POLICY IF EXISTS "Users can view own requested trivias" ON public.trivias;

-- Policy A: Anyone can view active, approved trivia configurations
CREATE POLICY "public_view_trivias_policy" 
ON public.trivias 
FOR SELECT 
USING (
  status = 'active' 
  OR 
  auth.jwt() ->> 'email' IN ('samuelchukwuemeke05@gmail.com')
  OR
  creator_id = auth.uid()
);

-- Policy B: Admins have unrestricted, full root access on trivias (including delete/insert/update)
CREATE POLICY "Admins trivias" 
ON public.trivias
FOR ALL
USING (
  auth.jwt() ->> 'email' IN ('samuelchukwuemeke05@gmail.com')
)
WITH CHECK (
  auth.jwt() ->> 'email' IN ('samuelchukwuemeke05@gmail.com')
);

-- Policy C: Logged-in authors/premium users can request new trivia submissions (status must be 'pending' or 'draft')
CREATE POLICY "Users can request trivias" 
ON public.trivias
FOR INSERT
WITH CHECK (
  auth.uid() IS NOT NULL 
  AND (status = 'pending' OR status = 'draft')
);


-----------------------------------------------------------
-- 2. POLICIES FOR: public.trivia_questions
-----------------------------------------------------------
ALTER TABLE public.trivia_questions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admin full access on trivia" ON public.trivia_questions;
DROP POLICY IF EXISTS "Users read trivia" ON public.trivia_questions;

-- Policy A: Full access to Admins (including delete/insert/update)
CREATE POLICY "Admin full access on trivia" 
ON public.trivia_questions
FOR ALL
USING (
  auth.jwt() ->> 'email' IN ('samuelchukwuemeke05@gmail.com')
)
WITH CHECK (
  auth.jwt() ->> 'email' IN ('samuelchukwuemeke05@gmail.com')
);

-- Policy B: Users can select questions for general trivias or books they own/free books
CREATE POLICY "Users read trivia" 
ON public.trivia_questions
FOR SELECT
USING (
  (ebook_id IS NULL)
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
-- 3. POLICIES FOR: public.daily_trivia_attempts
-----------------------------------------------------------
ALTER TABLE public.daily_trivia_attempts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage daily attempts" ON public.daily_trivia_attempts;

-- Policy A: Users can select, insert, and update their own daily submission attempts
-- Policy B: Admins have full access, allowing them to delete attempts when pruning/deleting trivias
CREATE POLICY "Users manage daily attempts" 
ON public.daily_trivia_attempts
FOR ALL
USING (
  auth.uid() = user_id 
  OR 
  auth.jwt() ->> 'email' IN ('samuelchukwuemeke05@gmail.com')
)
WITH CHECK (
  auth.uid() = user_id 
  OR 
  auth.jwt() ->> 'email' IN ('samuelchukwuemeke05@gmail.com')
);


-----------------------------------------------------------
-- 4. POLICIES FOR: public.user_trivia_attempts
-----------------------------------------------------------
ALTER TABLE public.user_trivia_attempts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage attempts" ON public.user_trivia_attempts;

-- Policy A: Users can manage their individual question attempts
-- Policy B: Admins can do anything, including deletion
CREATE POLICY "Users manage attempts" 
ON public.user_trivia_attempts
FOR ALL
USING (
  auth.uid() = user_id 
  OR 
  auth.jwt() ->> 'email' IN ('samuelchukwuemeke05@gmail.com')
)
WITH CHECK (
  auth.uid() = user_id 
  OR 
  auth.jwt() ->> 'email' IN ('samuelchukwuemeke05@gmail.com')
);


-----------------------------------------------------------
-- 5. POLICIES FOR: public.trivia_participations
-----------------------------------------------------------
ALTER TABLE public.trivia_participations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage participations" ON public.trivia_participations;

CREATE POLICY "Users manage participations" 
ON public.trivia_participations
FOR ALL
USING (
  auth.uid() = user_id 
  OR 
  auth.jwt() ->> 'email' IN ('samuelchukwuemeke05@gmail.com')
)
WITH CHECK (
  auth.uid() = user_id 
  OR 
  auth.jwt() ->> 'email' IN ('samuelchukwuemeke05@gmail.com')
);

COMMIT;
