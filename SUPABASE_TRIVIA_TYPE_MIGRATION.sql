-- ==============================================================================
-- CALMREADER TRIVIA ENGINE: TYPE MIGRATION & UNIFIED ELIGIBILITY RLS POLICIES
-- ==============================================================================
-- Restructures the Trivia Engine to support two distinct categories:
-- 1. Marketing Trivia ('marketing'):
--    - Purpose: Discover and engage readers.
--    - Requirements: Active + unexpired.
--    - Book purchase/reading is OPTIONAL (questions are open to all users).
--
-- 2. Reader-Reward Trivia ('reader_reward'):
--    - Purpose: Reward genuine readers who consumed the content.
--    - Requirements: Active + unexpired + owned/purchased eBook + read >= 90%.
--    - Book purchase/reading is REQUIRED.
-- ==============================================================================

-- 1. ADD 'type' COLUMN TO trivias TABLE
ALTER TABLE public.trivias 
ADD COLUMN IF NOT EXISTS type TEXT DEFAULT 'marketing';

-- Ensure existing trivias have a default type of 'marketing' if null
UPDATE public.trivias 
SET type = 'marketing' 
WHERE type IS NULL;

-- Add check constraint for valid types
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'check_trivias_type'
  ) THEN
    ALTER TABLE public.trivias 
    ADD CONSTRAINT check_trivias_type CHECK (type IN ('marketing', 'reader_reward'));
  END IF;
END $$;

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_trivias_type ON public.trivias(type);
CREATE INDEX IF NOT EXISTS idx_trivias_status ON public.trivias(status);

-- ------------------------------------------------------------------------------
-- 2. UPDATE ROW LEVEL SECURITY (RLS) ON public.trivias
-- ------------------------------------------------------------------------------
ALTER TABLE public.trivias ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public trivias" ON public.trivias;
DROP POLICY IF EXISTS "public_view_trivias_policy" ON public.trivias;
DROP POLICY IF EXISTS "Admins trivias" ON public.trivias;

-- Public read access: Anyone can view active, launched, or published trivias
CREATE POLICY "public_view_trivias_policy" 
ON public.trivias
FOR SELECT
USING (
  status IN ('active', 'published', 'launched')
  OR
  creator_id = auth.uid()
  OR
  EXISTS (
    SELECT 1 FROM public.users 
    WHERE users.id = auth.uid() 
    AND (users.account_tier = 'admin' OR users.is_admin = TRUE OR users.role = 'admin')
  )
  OR
  auth.jwt() ->> 'email' IN ('samuelchukwuemeke05@gmail.com', 'chukwuemekedaniella@gmail.com')
);

-- Admin management access on trivias (Role-based)
CREATE POLICY "admins_manage_trivias_policy"
ON public.trivias
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.users 
    WHERE users.id = auth.uid() 
    AND (users.account_tier = 'admin' OR users.is_admin = TRUE OR users.role = 'admin')
  )
  OR
  auth.jwt() ->> 'email' IN ('samuelchukwuemeke05@gmail.com', 'chukwuemekedaniella@gmail.com')
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.users 
    WHERE users.id = auth.uid() 
    AND (users.account_tier = 'admin' OR users.is_admin = TRUE OR users.role = 'admin')
  )
  OR
  auth.jwt() ->> 'email' IN ('samuelchukwuemeke05@gmail.com', 'chukwuemekedaniella@gmail.com')
);

-- Creators/MPRs can insert and update their own drafts
CREATE POLICY "creators_manage_own_trivias"
ON public.trivias
FOR ALL
USING (creator_id = auth.uid())
WITH CHECK (creator_id = auth.uid());


-- ------------------------------------------------------------------------------
-- 3. UPDATE ROW LEVEL SECURITY (RLS) ON public.trivia_questions
-- ------------------------------------------------------------------------------
ALTER TABLE public.trivia_questions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admin full access on trivia" ON public.trivia_questions;
DROP POLICY IF EXISTS "Users read trivia" ON public.trivia_questions;
DROP POLICY IF EXISTS "Public can view questions" ON public.trivia_questions;

-- Admin full management access (Role-based)
CREATE POLICY "Admin full access on trivia" 
ON public.trivia_questions
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.users 
    WHERE users.id = auth.uid() 
    AND (users.account_tier = 'admin' OR users.is_admin = TRUE OR users.role = 'admin')
  )
  OR
  auth.jwt() ->> 'email' IN ('samuelchukwuemeke05@gmail.com', 'chukwuemekedaniella@gmail.com')
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.users 
    WHERE users.id = auth.uid() 
    AND (users.account_tier = 'admin' OR users.is_admin = TRUE OR users.role = 'admin')
  )
  OR
  auth.jwt() ->> 'email' IN ('samuelchukwuemeke05@gmail.com', 'chukwuemekedaniella@gmail.com')
);

-- Users Read Policy:
-- Marketing Trivia questions: completely accessible to everyone!
-- Reader-Reward Trivia questions: accessible if eBook purchased or free eBook.
-- General Knowledge questions: accessible to everyone.
CREATE POLICY "Users read trivia" 
ON public.trivia_questions
FOR SELECT
USING (
  -- 1. General trivia questions (no ebook linked)
  (ebook_id IS NULL)
  OR
  -- 2. Marketing Trivia questions (open access by design)
  EXISTS (
    SELECT 1 FROM public.trivias 
    WHERE trivias.id = public.trivia_questions.trivia_id 
    AND (trivias.type = 'marketing' OR trivias.type IS NULL)
  )
  OR
  EXISTS (
    SELECT 1 FROM public.trivias 
    WHERE trivias.book_id = public.trivia_questions.ebook_id 
    AND (trivias.type = 'marketing' OR trivias.type IS NULL)
  )
  OR
  -- 3. Reader-Reward Trivia: User owns the eBook
  EXISTS (
    SELECT 1 FROM public.ebook_purchases 
    WHERE ebook_purchases.ebook_id = public.trivia_questions.ebook_id 
    AND ebook_purchases.user_id = auth.uid()
  )
  OR
  -- 4. Reader-Reward Trivia: The linked eBook is free
  EXISTS (
    SELECT 1 FROM public.books 
    WHERE books.id = public.trivia_questions.ebook_id 
    AND (books.is_free = TRUE OR books.price = 0 OR books.price IS NULL)
  )
);
