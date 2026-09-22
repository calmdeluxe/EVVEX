# New Trivia Hub Architecture (EBook-Linked)

Run the following SQL in your Supabase SQL Editor to enable the new EBook-linked trivia system.

```sql
-- TRIVIA HUB ARCHITECTURE (EBOOK-LINKED)
-- 1. Trivia Questions Table
CREATE TABLE IF NOT EXISTS public.trivia_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ebook_id UUID REFERENCES public.books(id) ON DELETE CASCADE NOT NULL,
  question TEXT NOT NULL,
  options TEXT[] NOT NULL,
  correct_answer TEXT NOT NULL,
  explanation TEXT,
  difficulty TEXT CHECK (difficulty IN ('Easy', 'Medium', 'Hard')) DEFAULT 'Medium',
  points INTEGER DEFAULT 10,
  order_number INTEGER,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. User Trivia Attempts Tracking
CREATE TABLE IF NOT EXISTS public.user_trivia_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  trivia_question_id UUID REFERENCES public.trivia_questions(id) ON DELETE CASCADE,
  is_correct BOOLEAN,
  answered_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Daily Trivia Attempts (For once-per-day limit)
CREATE TABLE IF NOT EXISTS public.daily_trivia_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  ebook_id UUID REFERENCES public.books(id) ON DELETE CASCADE,
  attempt_date DATE DEFAULT CURRENT_DATE,
  score INTEGER,
  total_questions INTEGER,
  completed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Enable RLS
ALTER TABLE public.trivia_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_trivia_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_trivia_attempts ENABLE ROW LEVEL SECURITY;

-- 5. Indexes
CREATE INDEX IF NOT EXISTS idx_trivia_questions_ebook_id ON public.trivia_questions(ebook_id);
CREATE INDEX IF NOT EXISTS idx_user_trivia_attempts_user_id ON public.user_trivia_attempts(user_id);
CREATE INDEX IF NOT EXISTS idx_daily_trivia_attempts_user_date ON public.daily_trivia_attempts(user_id, attempt_date);

-- 6. POLICIES
DROP POLICY IF EXISTS "Admin full access on trivia" ON public.trivia_questions;
DROP POLICY IF EXISTS "Users read trivia" ON public.trivia_questions;
DROP POLICY IF EXISTS "Users manage attempts" ON public.user_trivia_attempts;
DROP POLICY IF EXISTS "Users manage daily attempts" ON public.daily_trivia_attempts;

-- Admin can do anything
CREATE POLICY "Admin full access on trivia" ON public.trivia_questions 
FOR ALL USING (is_admin());

-- Users read trivia for books they own or free books
CREATE POLICY "Users read trivia" ON public.trivia_questions FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM ebook_purchases 
    WHERE ebook_purchases.ebook_id = public.trivia_questions.ebook_id 
    AND ebook_purchases.user_id = auth.uid()
  )
  OR
  EXISTS (
    SELECT 1 FROM books 
    WHERE books.id = public.trivia_questions.ebook_id 
    AND books.is_free = TRUE
  )
);

-- Users can manage their own attempts
CREATE POLICY "Users manage attempts" ON public.user_trivia_attempts
FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users manage daily attempts" ON public.daily_trivia_attempts
FOR ALL USING (auth.uid() = user_id);
```
