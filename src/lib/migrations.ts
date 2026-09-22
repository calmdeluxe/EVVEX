export const FULL_SUPABASE_SQL = `-- 0. HELPER FUNCTIONS
CREATE OR REPLACE FUNCTION is_admin() RETURNS boolean AS $$
  BEGIN
    RETURN (
      auth.jwt() ->> 'email' IN ('samuelchukwuemeke05@gmail.com')
    );
  END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.is_admin() TO public, anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public.increment_user_balance(
  p_user_id UUID, 
  p_wallet_delta INTEGER DEFAULT 0, 
  p_points_delta INTEGER DEFAULT 0, 
  p_total_earned_delta INTEGER DEFAULT 0
)
RETURNS VOID AS $$
BEGIN
  UPDATE public.users
  SET 
    wallet_balance = COALESCE(wallet_balance, 0) + p_wallet_delta,
    t_points = COALESCE(t_points, 0) + p_points_delta,
    total_earned = COALESCE(total_earned, 0) + p_total_earned_delta
  WHERE id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 1. INITIAL SETUP: Create Core Tables
CREATE TABLE IF NOT EXISTS public.users (
  id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  email TEXT UNIQUE,
  username TEXT UNIQUE,
  full_name TEXT,
  contact TEXT,
  phone TEXT UNIQUE,
  date_of_birth TEXT,
  is_admin BOOLEAN DEFAULT false,
  is_premium BOOLEAN DEFAULT false,
  is_suspended BOOLEAN DEFAULT false,
  is_approved_author BOOLEAN DEFAULT false,
  account_tier TEXT DEFAULT 'free',
  tier_expires_at TIMESTAMP WITH TIME ZONE,
  bank_name TEXT,
  account_number TEXT,
  account_name TEXT,
  t_points INTEGER DEFAULT 0,
  wallet_balance INTEGER DEFAULT 0,
  total_earned INTEGER DEFAULT 0,
  total_withdrawn INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

ALTER TABLE public.users ADD COLUMN IF NOT EXISTS date_of_birth TEXT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS phone TEXT;

DO $$ 
BEGIN 
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'unique_phone') THEN
    ALTER TABLE public.users ADD CONSTRAINT unique_phone UNIQUE (phone);
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.user_agreements (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  agreed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  ip_address TEXT,
  user_agent TEXT
);

CREATE TABLE IF NOT EXISTS public.config (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.books (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  cards_json JSONB DEFAULT '[]',
  price INTEGER DEFAULT 0,
  pdf_price INTEGER DEFAULT 0,
  public_slug TEXT UNIQUE,
  is_published BOOLEAN DEFAULT false,
  status INTEGER DEFAULT 0, 
  cover_image TEXT,
  admin_note TEXT,
  report_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.payment_requests (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.users(id),
  book_id UUID REFERENCES public.books ON DELETE CASCADE,
  amount INTEGER NOT NULL,
  method TEXT NOT NULL,
  receipt_url TEXT,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.author_applications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  fee_paid INTEGER DEFAULT 5000,
  paystack_reference TEXT,
  status TEXT DEFAULT 'pending',
  admin_note TEXT,
  reviewed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.trivias (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  book_id UUID REFERENCES public.books(id) ON DELETE SET NULL,
  slug TEXT UNIQUE,
  reward_points INTEGER DEFAULT 10,
  duration_seconds INTEGER DEFAULT 120,
  target_category TEXT DEFAULT 'all',
  expiry_at TIMESTAMP WITH TIME ZONE,
  status TEXT DEFAULT 'draft',
  thumbnail_url TEXT,
  price INTEGER DEFAULT 0,
  target_tier TEXT DEFAULT 'all',
  promotional_writeup TEXT,
  type TEXT DEFAULT 'marketing',
  creator_id UUID REFERENCES auth.users,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(book_id)
);

CREATE TABLE IF NOT EXISTS public.trivia_questions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  ebook_id UUID REFERENCES public.books(id) ON DELETE SET NULL,
  question TEXT NOT NULL,
  options TEXT[] NOT NULL,
  correct_answer TEXT NOT NULL,
  explanation TEXT,
  difficulty TEXT DEFAULT 'Medium',
  points INTEGER DEFAULT 10,
  order_number INTEGER,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.trivia_promos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  prize TEXT NOT NULL,
  start_time TIMESTAMP WITH TIME ZONE NOT NULL,
  end_time TIMESTAMP WITH TIME ZONE NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.transactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users,
  book_id UUID REFERENCES public.books ON DELETE SET NULL,
  buyer_email TEXT,
  amount INTEGER NOT NULL,
  commission INTEGER DEFAULT 0,
  author_earnings INTEGER DEFAULT 0,
  type TEXT DEFAULT 'purchase',
  paystack_reference TEXT,
  status TEXT DEFAULT 'successful',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.withdrawals (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users ON DELETE CASCADE,
  amount INTEGER NOT NULL,
  status TEXT DEFAULT 'pending', 
  bank_name TEXT,
  account_number TEXT,
  account_name TEXT,
  processed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.support_requests (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users,
  type TEXT,
  subject TEXT,
  message TEXT,
  status TEXT DEFAULT 'open',
  admin_response TEXT,
  resolved_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.admin_responses (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  request_id UUID REFERENCES public.support_requests(id) ON DELETE CASCADE,
  admin_id UUID REFERENCES auth.users,
  response TEXT NOT NULL,
  status_after TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.payment_verifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  transaction_type TEXT NOT NULL,
  reference_id UUID,
  amount DECIMAL NOT NULL,
  payment_method TEXT,
  transaction_ref TEXT UNIQUE,
  bank_name TEXT,
  account_name TEXT,
  account_number TEXT,
  proof_image_url TEXT,
  status TEXT DEFAULT 'pending',
  admin_note TEXT,
  approved_by UUID REFERENCES public.users(id),
  approved_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.reported_content (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  book_id UUID REFERENCES public.books ON DELETE CASCADE,
  reporter_id UUID REFERENCES auth.users,
  reason TEXT,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Access Control for eBooks (PHYSICAL TABLE synced via Trigger + Fallbacks)
DROP VIEW IF EXISTS public.ebook_purchases CASCADE;
DROP TABLE IF EXISTS public.ebook_purchases CASCADE;
CREATE TABLE public.ebook_purchases (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  ebook_id UUID REFERENCES public.books(id) ON DELETE CASCADE,
  purchase_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, ebook_id)
);

-- Sync successful transactions automatically into ebook_purchases
CREATE OR REPLACE FUNCTION public.sync_ebook_purchase()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'successful' AND NEW.type = 'purchase' THEN
    INSERT INTO public.ebook_purchases (user_id, ebook_id, purchase_date)
    VALUES (NEW.user_id, NEW.book_id, NEW.created_at)
    ON CONFLICT (user_id, ebook_id) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_sync_ebook_purchase ON public.transactions;
CREATE TRIGGER trg_sync_ebook_purchase
AFTER INSERT OR UPDATE OF status ON public.transactions
FOR EACH ROW
EXECUTE FUNCTION public.sync_ebook_purchase();

-- Backfill existing purchases
INSERT INTO public.ebook_purchases (user_id, ebook_id, purchase_date)
SELECT user_id, book_id AS ebook_id, created_at AS purchase_date
FROM public.transactions
WHERE status = 'successful' AND type = 'purchase'
ON CONFLICT (user_id, ebook_id) DO NOTHING;

CREATE TABLE IF NOT EXISTS public.affiliate_links (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  book_id UUID REFERENCES public.books(id) ON DELETE CASCADE,
  affiliate_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  affiliate_code TEXT UNIQUE NOT NULL,
  click_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.posts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  type TEXT DEFAULT 'announcement',
  admin_id UUID REFERENCES auth.users,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. SECURITY: Enable RLS and create Policies
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.books ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trivias ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trivia_participations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.withdrawals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reported_content ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.author_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_verifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trivia_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trivia_promos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ebook_purchases ENABLE ROW LEVEL SECURITY;

-- EMERGENCY REPAIR: Drop ALL existing policies to clear recursion
DO $$ 
DECLARE 
    pol record;
BEGIN 
    FOR pol IN (SELECT policyname, tablename FROM pg_policies WHERE schemaname = 'public') 
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', pol.policyname, pol.tablename);
    END LOOP;
END $$;

-- Policies using JWT claims to avoid recursion
CREATE POLICY "Users own profile" ON public.users FOR ALL USING (auth.uid() = id);
CREATE POLICY "Admins view users" ON public.users FOR SELECT USING (
  auth.jwt() ->> 'email' IN ('samuelchukwuemeke05@gmail.com')
);

CREATE POLICY "Admins config" ON public.config FOR ALL USING (
  auth.jwt() ->> 'email' IN ('samuelchukwuemeke05@gmail.com')
);

CREATE POLICY "Public common config" ON public.config FOR SELECT USING (
  key IN ('paystack_public_key', 'admin_bank_details')
);

CREATE POLICY "Public books" ON public.books FOR SELECT USING (status = 1 OR is_published IS TRUE OR is_published::text = '1' OR is_published::text = 'true');
CREATE POLICY "Authors books" ON public.books FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Admins books" ON public.books FOR ALL USING (
  auth.jwt() ->> 'email' IN ('samuelchukwuemeke05@gmail.com', 'chukwuemekedaniella@gmail.com')
);

CREATE POLICY "Public trivias" ON public.trivias FOR SELECT USING (true);
CREATE POLICY "Admins trivias" ON public.trivias FOR ALL USING (
  auth.jwt() ->> 'email' IN ('samuelchukwuemeke05@gmail.com', 'chukwuemekedaniella@gmail.com')
);

CREATE POLICY "Public trivia promos" ON public.trivia_promos FOR SELECT USING (true);
CREATE POLICY "Admins trivia promos" ON public.trivia_promos FOR ALL USING (
  auth.jwt() ->> 'email' IN ('samuelchukwuemeke05@gmail.com', 'chukwuemekedaniella@gmail.com')
);

CREATE POLICY "Users trivia" ON public.trivia_participations FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Admins trivia" ON public.trivia_participations FOR ALL USING (
  auth.jwt() ->> 'email' IN ('samuelchukwuemeke05@gmail.com')
);

CREATE POLICY "Public posts" ON public.posts FOR SELECT USING (is_active = true);
CREATE POLICY "Admins posts" ON public.posts FOR ALL USING (
  auth.jwt() ->> 'email' IN ('samuelchukwuemeke05@gmail.com')
);

CREATE POLICY "Users trans" ON public.transactions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own trans" ON public.transactions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins trans" ON public.transactions FOR ALL USING (is_admin());

CREATE POLICY "Users withdraw" ON public.withdrawals FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Admins withdraw" ON public.withdrawals FOR ALL USING (
  auth.jwt() ->> 'email' IN ('samuelchukwuemeke05@gmail.com')
);

CREATE POLICY "Users auth_app" ON public.author_applications FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins auth_app" ON public.author_applications FOR ALL USING (
  auth.jwt() ->> 'email' IN ('samuelchukwuemeke05@gmail.com')
);

CREATE POLICY "Users payment_req" ON public.payment_requests FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins payment_req" ON public.payment_requests FOR ALL USING (
  auth.jwt() ->> 'email' IN ('samuelchukwuemeke05@gmail.com')
);

CREATE POLICY "Users payment_ver" ON public.payment_verifications FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins payment_ver" ON public.payment_verifications FOR ALL USING (
  auth.jwt() ->> 'email' IN ('samuelchukwuemeke05@gmail.com')
);

CREATE POLICY "Admins responses" ON public.admin_responses FOR ALL USING (
  auth.jwt() ->> 'email' IN ('samuelchukwuemeke05@gmail.com')
);

-- SECURITY FIX: Force correct admin roles
UPDATE public.users SET is_admin = true, account_tier = 'admin' WHERE email IN ('samuelchukwuemeke05@gmail.com');

CREATE POLICY "Users support" ON public.support_requests FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Admins support" ON public.support_requests FOR ALL USING (
  auth.jwt() ->> 'email' IN ('samuelchukwuemeke05@gmail.com')
);

CREATE POLICY "Users view their purchases" ON public.ebook_purchases FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins view all purchases" ON public.ebook_purchases FOR ALL USING (is_admin());

-- 3. ANONYMOUS CONFESSIONS SYSTEM
CREATE TABLE IF NOT EXISTS public.anonymous_confessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '24 hours'),
  is_approved BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.anonymous_confessions ENABLE ROW LEVEL SECURITY;

-- Anyone with the right tier can read approved, non-expired confessions
CREATE POLICY "Tiered read active confessions" ON public.anonymous_confessions
  FOR SELECT USING (
    (is_approved = true AND expires_at > NOW()) AND (
      is_admin() OR 
      EXISTS (
        SELECT 1 FROM public.users 
        WHERE id = auth.uid() AND (is_premium = true OR account_tier = 'author')
      )
    )
  );

-- Only admins can insert confessions
CREATE POLICY "Only admins insert confessions" ON public.anonymous_confessions
  FOR INSERT WITH CHECK (is_admin());

-- Admins can view everything (for moderation)
CREATE POLICY "Admins select confessions" ON public.anonymous_confessions
  FOR SELECT USING (is_admin());

-- Admins can update (approve/reject)
CREATE POLICY "Admins update confessions" ON public.anonymous_confessions
  FOR UPDATE USING (is_admin());

-- Admins can delete
CREATE POLICY "Admins delete confessions" ON public.anonymous_confessions
  FOR DELETE USING (is_admin());

-- 4. AUTHOR NOTIFICATIONS SYSTEM
CREATE TABLE IF NOT EXISTS public.author_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  purchase_transaction_id UUID NULL REFERENCES public.transactions(id) ON DELETE SET NULL,
  ebook_id UUID NULL REFERENCES public.books(id) ON DELETE SET NULL,
  type TEXT NOT NULL DEFAULT 'purchase',
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_read BOOLEAN NOT NULL DEFAULT false,
  read_at TIMESTAMP WITH TIME ZONE NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

ALTER TABLE public.author_notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authors can view own notifications" ON public.author_notifications;
DROP POLICY IF EXISTS "Authors can update own notifications" ON public.author_notifications;

CREATE POLICY "Authors can view own notifications" ON public.author_notifications
  FOR SELECT USING (auth.uid() = author_id);

CREATE POLICY "Authors can update own notifications" ON public.author_notifications
  FOR UPDATE USING (auth.uid() = author_id);

CREATE INDEX IF NOT EXISTS idx_author_notifications_author_id_created ON public.author_notifications(author_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_author_notifications_transaction ON public.author_notifications(purchase_transaction_id);

CREATE OR REPLACE FUNCTION public.handle_purchase_notification()
RETURNS TRIGGER AS $$
DECLARE
  v_author_id UUID;
  v_book_title TEXT;
  v_buyer_name TEXT;
BEGIN
  IF NEW.type = 'purchase' AND NEW.status = 'successful' AND NEW.book_id IS NOT NULL THEN
    SELECT user_id, title INTO v_author_id, v_book_title
    FROM public.books
    WHERE id = NEW.book_id;

    IF v_author_id IS NOT NULL THEN
      v_buyer_name := COALESCE(NEW.buyer_email, 'A reader');

      INSERT INTO public.author_notifications (
        author_id,
        purchase_transaction_id,
        ebook_id,
        type,
        title,
        message,
        metadata
      ) VALUES (
        v_author_id,
        NEW.id,
        NEW.book_id,
        'purchase',
        'New Book Purchase!',
        v_buyer_name || ' successfully purchased your eBook "' || v_book_title || '" for ₦' || (NEW.amount)::text || '.',
        jsonb_build_object(
          'buyer_email', NEW.buyer_email,
          'amount', NEW.amount,
          'book_title', v_book_title
        )
      );
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS tr_on_purchase_notification ON public.transactions;

CREATE TRIGGER tr_on_purchase_notification
  AFTER INSERT OR UPDATE OF status ON public.transactions
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_purchase_notification();

-- 11. BOOKS PERFORMANCE INDEXES
CREATE INDEX IF NOT EXISTS idx_books_user_id ON public.books(user_id);
CREATE INDEX IF NOT EXISTS idx_books_is_published ON public.books(is_published);
CREATE INDEX IF NOT EXISTS idx_books_created_at ON public.books(created_at);
`;

export const ANONYMOUS_CONFESSIONS_SQL = `
-- ANONYMOUS CONFESSIONS TABLE (Redundant if FULL_SUPABASE_SQL is run)
CREATE TABLE IF NOT EXISTS public.anonymous_confessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '24 hours'),
  is_approved BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.anonymous_confessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read active confessions" ON public.anonymous_confessions;
CREATE POLICY "Tiered read active confessions" ON public.anonymous_confessions
  FOR SELECT USING (
    (is_approved = true AND expires_at > NOW()) AND (
      is_admin() OR 
      EXISTS (
        SELECT 1 FROM public.users 
        WHERE id = auth.uid() AND (is_premium = true OR account_tier = 'author')
      )
    )
  );

DROP POLICY IF EXISTS "Premium users insert confessions" ON public.anonymous_confessions;
CREATE POLICY "Only admins insert confessions" ON public.anonymous_confessions
  FOR INSERT WITH CHECK (is_admin());

DROP POLICY IF EXISTS "Admins select confessions" ON public.anonymous_confessions;
CREATE POLICY "Admins select confessions" ON public.anonymous_confessions
  FOR SELECT USING (is_admin());

DROP POLICY IF EXISTS "Admins update confessions" ON public.anonymous_confessions;
CREATE POLICY "Admins update confessions" ON public.anonymous_confessions
  FOR UPDATE USING (is_admin());

DROP POLICY IF EXISTS "Admins delete confessions" ON public.anonymous_confessions;
CREATE POLICY "Admins delete confessions" ON public.anonymous_confessions
  FOR DELETE USING (is_admin());
`;

export const TRIVIA_SYSTEM_SQL = `
-- TRIVIA HUB ARCHITECTURE (EBOOK-LINKED)
-- 1. Trivia Questions Table
CREATE TABLE IF NOT EXISTS public.trivia_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ebook_id UUID REFERENCES public.books(id) ON DELETE CASCADE,
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
  won BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Trivia Promos Table
CREATE TABLE IF NOT EXISTS public.trivia_promos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  prize TEXT NOT NULL,
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Enable RLS
ALTER TABLE public.trivia_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_trivia_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_trivia_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trivia_promos ENABLE ROW LEVEL SECURITY;

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

-- Users read trivia: Marketing trivia questions are open to everyone, Reader-Reward trivias require eBook ownership or free eBook
CREATE POLICY "Users read trivia" ON public.trivia_questions FOR SELECT USING (
  (ebook_id IS NULL)
  OR
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
  EXISTS (
    SELECT 1 FROM public.ebook_purchases 
    WHERE ebook_purchases.ebook_id = public.trivia_questions.ebook_id 
    AND ebook_purchases.user_id = auth.uid()
  )
  OR
  EXISTS (
    SELECT 1 FROM public.books 
    WHERE books.id = public.trivia_questions.ebook_id 
    AND (books.is_free = TRUE OR books.price = 0 OR books.price IS NULL)
  )
);

-- Users can manage their own attempts
CREATE POLICY "Users manage attempts" ON public.user_trivia_attempts
FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users manage daily attempts" ON public.daily_trivia_attempts
FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Public trivia promos" ON public.trivia_promos FOR SELECT USING (true);
CREATE POLICY "Admin full access on trivia promos" ON public.trivia_promos FOR ALL USING (is_admin());

-- Fix all reader_reward trivias that are missing a start date
UPDATE public.trivias
SET requires_premium = false
WHERE type = 'reader_reward' 
  AND requires_premium = true 
  AND starts_at IS NULL;

-- Set a default start date for all active trivias
UPDATE public.trivias
SET starts_at = COALESCE(starts_at, created_at, NOW())
WHERE is_active = true 
  AND status = 'active' 
  AND starts_at IS NULL;

-- Fix the RLS policy for trivias table
DROP POLICY IF EXISTS "trivias_public_select" ON public.trivias;
DROP POLICY IF EXISTS "Public trivias" ON public.trivias;

CREATE POLICY "trivias_public_select" ON public.trivias
FOR SELECT
TO anon, authenticated
USING (
  requires_premium = false
  OR (requires_premium = true AND starts_at IS NOT NULL)
  OR (type = 'marketing' AND is_active = true AND status = 'active')
);
`;

export const RECURSION_FIX_SQL = `
-- MINIMAL RECURSION FIX (Run this if you see recursion errors)
DO $$ 
DECLARE pol record;
BEGIN 
  FOR pol IN (SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'users') 
  LOOP EXECUTE format('DROP POLICY IF EXISTS %I ON public.users', pol.policyname); END LOOP;
END $$;

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
CREATE POLICY "safe_view" ON public.users FOR SELECT USING (auth.uid() = id);
CREATE POLICY "safe_update" ON public.users FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "safe_admin" ON public.users FOR SELECT USING (
  auth.jwt() ->> 'email' IN ('samuelchukwuemeke05@gmail.com')
);
`;

export const MARKETPLACE_TIGHTENING_SQL = `
-- 1. CLEANUP GHOST EBOOKS (Soft-deleted but maybe still referenced)
DELETE FROM public.books WHERE status = -1 OR admin_note LIKE '%[DELETED]%';

-- 2. ADD CASCADE DELETES TO RELATED TABLES (Ensure absolute removal)
-- Transactions should probably stay for accounting, but we can set book_id to null
ALTER TABLE public.transactions DROP CONSTRAINT IF EXISTS transactions_book_id_fkey;
ALTER TABLE public.transactions ADD CONSTRAINT transactions_book_id_fkey 
  FOREIGN KEY (book_id) REFERENCES public.books(id) ON DELETE SET NULL;

-- Trivias should be removed if book is gone
ALTER TABLE public.trivias DROP CONSTRAINT IF EXISTS trivias_book_id_fkey;
ALTER TABLE public.trivias ADD CONSTRAINT trivias_book_id_fkey 
  FOREIGN KEY (book_id) REFERENCES public.books(id) ON DELETE CASCADE;

-- Payment requests
ALTER TABLE public.payment_requests DROP CONSTRAINT IF EXISTS payment_requests_book_id_fkey;
ALTER TABLE public.payment_requests ADD CONSTRAINT payment_requests_book_id_fkey 
  FOREIGN KEY (book_id) REFERENCES public.books(id) ON DELETE CASCADE;

-- Reports
ALTER TABLE public.reported_content DROP CONSTRAINT IF EXISTS reported_content_book_id_fkey;
ALTER TABLE public.reported_content ADD CONSTRAINT reported_content_book_id_fkey 
  FOREIGN KEY (book_id) REFERENCES public.books(id) ON DELETE CASCADE;

-- Affiliate Links
ALTER TABLE public.affiliate_links DROP CONSTRAINT IF EXISTS affiliate_links_book_id_fkey;
ALTER TABLE public.affiliate_links ADD CONSTRAINT affiliate_links_book_id_fkey 
  FOREIGN KEY (book_id) REFERENCES public.books(id) ON DELETE CASCADE;

-- 3. CLEAN UP ANY ORPHANED RECORDS (Defensive)
-- If any hypothetical discovery tables exist, clean them
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'discovery_items') THEN
        DELETE FROM discovery_items WHERE ebook_id NOT IN (SELECT id FROM books);
    END IF;
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'featured_content') THEN
        DELETE FROM featured_content WHERE content_id NOT IN (SELECT id FROM books);
    END IF;
END $$;

-- 4. ENSURE STRICT RLS FOR PUBLIC DISCOVERY
DROP POLICY IF EXISTS "Public books" ON public.books;
CREATE POLICY "Public books" ON public.books FOR SELECT USING (
  (status = 1 OR is_published IS TRUE OR is_published::text = '1' OR is_published::text = 'true') AND (admin_note IS NULL OR admin_note NOT LIKE '%[DELETED]%')
);
`;

export const UPGRADE_SYSTEM_SQL = `-- UPGRADE TOKENS & TIER MANAGEMENT (RESILIENT VERSION)
-- 1. Ensure columns exist
DO $$
BEGIN
    -- users table columns
    IF NOT EXISTS (SELECT FROM pg_attribute WHERE attrelid = 'public.users'::regclass AND attname = 'account_tier') THEN
        ALTER TABLE public.users ADD COLUMN account_tier TEXT DEFAULT 'free';
    END IF;
    IF NOT EXISTS (SELECT FROM pg_attribute WHERE attrelid = 'public.users'::regclass AND attname = 'is_premium') THEN
        ALTER TABLE public.users ADD COLUMN is_premium BOOLEAN DEFAULT false;
    END IF;
    IF NOT EXISTS (SELECT FROM pg_attribute WHERE attrelid = 'public.users'::regclass AND attname = 'is_approved_author') THEN
        ALTER TABLE public.users ADD COLUMN is_approved_author BOOLEAN DEFAULT false;
    END IF;
    IF NOT EXISTS (SELECT FROM pg_attribute WHERE attrelid = 'public.users'::regclass AND attname = 'tier_expires_at') THEN
        ALTER TABLE public.users ADD COLUMN tier_expires_at TIMESTAMP WITH TIME ZONE;
    END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.upgrade_tokens (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  token TEXT UNIQUE NOT NULL,
  user_email TEXT,
  target_tier TEXT NOT NULL CHECK (target_tier IN ('premium', 'author', 'admin', 'free')),
  is_used BOOLEAN DEFAULT false,
  benefit_duration_days INTEGER,
  token_expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '7 days'),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Ensure benefit_duration_days exists if table was created earlier without it
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_attribute WHERE attrelid = 'public.upgrade_tokens'::regclass AND attname = 'benefit_duration_days') THEN
        ALTER TABLE public.upgrade_tokens ADD COLUMN benefit_duration_days INTEGER;
    END IF;
    IF NOT EXISTS (SELECT FROM pg_attribute WHERE attrelid = 'public.upgrade_tokens'::regclass AND attname = 'token_expires_at') THEN
        ALTER TABLE public.upgrade_tokens ADD COLUMN token_expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '7 days');
    END IF;
END $$;

ALTER TABLE public.upgrade_tokens ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins full access on upgrade_tokens" ON public.upgrade_tokens;
CREATE POLICY "Admins full access on upgrade_tokens" ON public.upgrade_tokens FOR ALL USING (
  auth.jwt() ->> 'email' IN ('samuelchukwuemeke05@gmail.com')
);
DROP POLICY IF EXISTS "Users view own tokens" ON public.upgrade_tokens;
CREATE POLICY "Users view own tokens" ON public.upgrade_tokens FOR SELECT USING (user_email = auth.jwt()->>'email');

-- Tier Management Functions
CREATE OR REPLACE FUNCTION public.admin_set_user_tier(p_email TEXT, p_new_tier TEXT, p_duration_days INTEGER DEFAULT NULL)
RETURNS void AS $$
BEGIN
  UPDATE public.users 
  SET account_tier = p_new_tier,
      is_premium = (p_new_tier IN ('premium', 'author', 'admin')),
      is_approved_author = (p_new_tier IN ('author', 'admin')),
      tier_expires_at = CASE WHEN p_duration_days IS NOT NULL THEN (NOW() + (p_duration_days || ' days')::INTERVAL) ELSE NULL END
  WHERE email = p_email;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.redeem_upgrade_token(p_token TEXT)
RETURNS JSONB AS $$
DECLARE
  v_token_record RECORD;
BEGIN
  -- 1. Find the token
  SELECT * INTO v_token_record FROM public.upgrade_tokens 
  WHERE token = p_token AND is_used = false AND (token_expires_at IS NULL OR token_expires_at > NOW());
  
  IF v_token_record IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid, used, or expired token');
  END IF;
  
  -- 2. Check email restriction
  IF v_token_record.user_email IS NOT NULL AND v_token_record.user_email != auth.jwt()->>'email' THEN
    RETURN jsonb_build_object('success', false, 'error', 'This token is restricted to: ' || v_token_record.user_email);
  END IF;
  
  -- 3. Validation guard for tier
  IF v_token_record.target_tier NOT IN ('premium', 'author', 'admin') THEN
     RETURN jsonb_build_object('success', false, 'error', 'Invalid target tier in token configuration');
  END IF;

  -- 4. Update the user
  UPDATE public.users 
  SET account_tier = v_token_record.target_tier,
      is_premium = (v_token_record.target_tier IN ('premium', 'author', 'admin')),
      is_approved_author = (v_token_record.target_tier IN ('author', 'admin')),
      tier_expires_at = CASE 
        WHEN v_token_record.benefit_duration_days IS NOT NULL THEN (NOW() + (v_token_record.benefit_duration_days || ' days')::INTERVAL) 
        ELSE NULL 
      END
  WHERE id = auth.uid();
  
  -- 5. Mark as used
  UPDATE public.upgrade_tokens SET is_used = true WHERE id = v_token_record.id;
  
  RETURN jsonb_build_object('success', true, 'new_tier', v_token_record.target_tier);
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

`;

export const AUTHOR_NOTIFICATIONS_SQL = `
-- AUTHOR NOTIFICATIONS SYSTEM
CREATE TABLE IF NOT EXISTS public.author_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  purchase_transaction_id UUID NULL REFERENCES public.transactions(id) ON DELETE SET NULL,
  ebook_id UUID NULL REFERENCES public.books(id) ON DELETE SET NULL,
  type TEXT NOT NULL DEFAULT 'purchase',
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_read BOOLEAN NOT NULL DEFAULT false,
  read_at TIMESTAMP WITH TIME ZONE NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

ALTER TABLE public.author_notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authors can view own notifications" ON public.author_notifications;
DROP POLICY IF EXISTS "Authors can update own notifications" ON public.author_notifications;

CREATE POLICY "Authors can view own notifications" ON public.author_notifications
  FOR SELECT USING (auth.uid() = author_id);

CREATE POLICY "Authors can update own notifications" ON public.author_notifications
  FOR UPDATE USING (auth.uid() = author_id);

CREATE INDEX IF NOT EXISTS idx_author_notifications_author_id_created ON public.author_notifications(author_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_author_notifications_transaction ON public.author_notifications(purchase_transaction_id);

CREATE OR REPLACE FUNCTION public.handle_purchase_notification()
RETURNS TRIGGER AS $$
DECLARE
  v_author_id UUID;
  v_book_title TEXT;
  v_buyer_name TEXT;
BEGIN
  IF NEW.type = 'purchase' AND NEW.status = 'successful' AND NEW.book_id IS NOT NULL THEN
    SELECT user_id, title INTO v_author_id, v_book_title
    FROM public.books
    WHERE id = NEW.book_id;

    IF v_author_id IS NOT NULL THEN
      v_buyer_name := COALESCE(NEW.buyer_email, 'A reader');

      INSERT INTO public.author_notifications (
        author_id,
        purchase_transaction_id,
        ebook_id,
        type,
        title,
        message,
        metadata
      ) VALUES (
        v_author_id,
        NEW.id,
        NEW.book_id,
        'purchase',
        'New Book Purchase!',
        v_buyer_name || ' successfully purchased your eBook "' || v_book_title || '" for ₦' || (NEW.amount)::text || '.',
        jsonb_build_object(
          'buyer_email', NEW.buyer_email,
          'amount', NEW.amount,
          'book_title', v_book_title
        )
      );
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS tr_on_purchase_notification ON public.transactions;

CREATE TRIGGER tr_on_purchase_notification
  AFTER INSERT OR UPDATE OF status ON public.transactions
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_purchase_notification();

-- Admin Audit Logs
CREATE TABLE IF NOT EXISTS public.admin_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  admin_email TEXT,
  action TEXT NOT NULL,
  target_id TEXT,
  target_type TEXT,
  details JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);
ALTER TABLE public.admin_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins view admin_logs" ON public.admin_logs;
CREATE POLICY "Admins view admin_logs" ON public.admin_logs FOR SELECT USING (true);
DROP POLICY IF EXISTS "Admins insert admin_logs" ON public.admin_logs;
CREATE POLICY "Admins insert admin_logs" ON public.admin_logs FOR INSERT WITH CHECK (true);

-- Help FAQs and Articles
CREATE TABLE IF NOT EXISTS public.help_faqs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category TEXT DEFAULT 'General',
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  order_number INT DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
ALTER TABLE public.help_faqs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public view help_faqs" ON public.help_faqs;
CREATE POLICY "Public view help_faqs" ON public.help_faqs FOR SELECT USING (true);
DROP POLICY IF EXISTS "Admins manage help_faqs" ON public.help_faqs;
CREATE POLICY "Admins manage help_faqs" ON public.help_faqs FOR ALL USING (true);

-- Foundational Systems Columns & Tables
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT FALSE;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS mpr_code TEXT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS mpr_commission_rate INTEGER DEFAULT 10;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS total_mpr_earnings INTEGER DEFAULT 0;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS pending_mpr_earnings INTEGER DEFAULT 0;
ALTER TABLE public.books ADD COLUMN IF NOT EXISTS views INTEGER DEFAULT 0;
ALTER TABLE public.books ADD COLUMN IF NOT EXISTS conversions INTEGER DEFAULT 0;

CREATE TABLE IF NOT EXISTS public.user_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  user_email TEXT,
  type TEXT CHECK (type IN ('bug', 'feature', 'general')),
  subject TEXT NOT NULL,
  description TEXT NOT NULL,
  screenshot_url TEXT,
  status TEXT DEFAULT 'new' CHECK (status IN ('new', 'in_progress', 'completed')),
  admin_response TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.user_feedback ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public insert user_feedback" ON public.user_feedback;
CREATE POLICY "Public insert user_feedback" ON public.user_feedback FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "Users view own user_feedback" ON public.user_feedback;
CREATE POLICY "Users view own user_feedback" ON public.user_feedback FOR SELECT USING (true);
DROP POLICY IF EXISTS "Admins manage user_feedback" ON public.user_feedback;
CREATE POLICY "Admins manage user_feedback" ON public.user_feedback FOR ALL USING (true);

CREATE TABLE IF NOT EXISTS public.email_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_email TEXT NOT NULL,
  subject TEXT NOT NULL,
  template_name TEXT NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  status TEXT DEFAULT 'sent' CHECK (status IN ('sent', 'failed', 'queued')),
  error_message TEXT,
  sent_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.email_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins manage email_logs" ON public.email_logs;
CREATE POLICY "Admins manage email_logs" ON public.email_logs FOR ALL USING (true);

CREATE TABLE IF NOT EXISTS public.refund_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  user_email TEXT,
  transaction_id UUID REFERENCES public.transactions(id) ON DELETE CASCADE,
  reason TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  admin_note TEXT,
  processed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.refund_requests ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public insert refund_requests" ON public.refund_requests;
CREATE POLICY "Public insert refund_requests" ON public.refund_requests FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "Users view own refund_requests" ON public.refund_requests;
CREATE POLICY "Users view own refund_requests" ON public.refund_requests FOR SELECT USING (true);
DROP POLICY IF EXISTS "Admins manage refund_requests" ON public.refund_requests;
CREATE POLICY "Admins manage refund_requests" ON public.refund_requests FOR ALL USING (true);

-- Trivia Type Migration (Marketing vs Reader-Reward)
ALTER TABLE public.trivias ADD COLUMN IF NOT EXISTS type TEXT DEFAULT 'marketing';
UPDATE public.trivias SET type = 'marketing' WHERE type IS NULL;
CREATE INDEX IF NOT EXISTS idx_trivias_type ON public.trivias(type);

-- MPR Audit Trail
CREATE TABLE IF NOT EXISTS public.mpr_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mpr_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  admin_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  action_type TEXT NOT NULL,
  target_type TEXT NOT NULL,
  target_id TEXT NOT NULL,
  details JSONB DEFAULT '{}'::jsonb,
  ip_address TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_mpr_audit_log_mpr_id ON public.mpr_audit_log(mpr_id);
CREATE INDEX IF NOT EXISTS idx_mpr_audit_log_action_type ON public.mpr_audit_log(action_type);
CREATE INDEX IF NOT EXISTS idx_mpr_audit_log_created_at ON public.mpr_audit_log(created_at DESC);
ALTER TABLE public.mpr_audit_log ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins and service manage mpr_audit_log" ON public.mpr_audit_log;
CREATE POLICY "Admins and service manage mpr_audit_log" ON public.mpr_audit_log FOR ALL USING (true);
DROP POLICY IF EXISTS "MPRs view own audit log" ON public.mpr_audit_log;
CREATE POLICY "MPRs view own audit log" ON public.mpr_audit_log FOR SELECT USING (auth.uid() = mpr_id);

-- Trivia Access & RLS Policy
ALTER TABLE public.trivias ADD COLUMN IF NOT EXISTS requires_premium BOOLEAN DEFAULT FALSE;
ALTER TABLE public.trivias ADD COLUMN IF NOT EXISTS starts_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE public.trivias ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;

UPDATE public.trivias
SET requires_premium = false
WHERE type = 'reader_reward' 
  AND requires_premium = true 
  AND starts_at IS NULL;

UPDATE public.trivias
SET starts_at = COALESCE(starts_at, created_at, NOW())
WHERE is_active = true 
  AND status = 'active' 
  AND starts_at IS NULL;

DROP POLICY IF EXISTS "trivias_public_select" ON public.trivias;
DROP POLICY IF EXISTS "Public trivias" ON public.trivias;

CREATE POLICY "trivias_public_select" ON public.trivias
FOR SELECT
TO anon, authenticated
USING (
  requires_premium = false
  OR (requires_premium = true AND starts_at IS NOT NULL)
  OR (type = 'marketing' AND is_active = true AND status = 'active')
);

-- =========================================================================
-- PUBLISHING SYSTEM: IPC vs FC CONTENT TYPES, REVENUE SPLIT, MPR REFERRALS, & CAMPAIGN CONTRACTS
-- =========================================================================

-- 1. Books Table Columns for Content Types & Rights
ALTER TABLE public.books ADD COLUMN IF NOT EXISTS content_type TEXT DEFAULT 'fc';
ALTER TABLE public.books ADD COLUMN IF NOT EXISTS word_count INTEGER DEFAULT 0;
ALTER TABLE public.books ADD COLUMN IF NOT EXISTS mpr_referral_code TEXT;
ALTER TABLE public.books ADD COLUMN IF NOT EXISTS author_share INTEGER DEFAULT 30;
ALTER TABLE public.books ADD COLUMN IF NOT EXISTS platform_share INTEGER DEFAULT 50;
ALTER TABLE public.books ADD COLUMN IF NOT EXISTS mpr_share INTEGER DEFAULT 20;
ALTER TABLE public.books ADD COLUMN IF NOT EXISTS exclusivity_end_date TIMESTAMPTZ;
ALTER TABLE public.books ADD COLUMN IF NOT EXISTS rights_declared BOOLEAN DEFAULT FALSE;
ALTER TABLE public.books ADD COLUMN IF NOT EXISTS exclusivity_declared BOOLEAN DEFAULT FALSE;
ALTER TABLE public.books ADD COLUMN IF NOT EXISTS ipc_conversion_status TEXT DEFAULT 'none';
ALTER TABLE public.books ADD COLUMN IF NOT EXISTS ipc_applied_at TIMESTAMPTZ;
ALTER TABLE public.books ADD COLUMN IF NOT EXISTS ipc_approved_at TIMESTAMPTZ;

-- 2. Users Table Columns for MPR Referral Tracking
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS referral_code TEXT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS referred_by_mpr UUID REFERENCES public.users(id) ON DELETE SET NULL;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS mpr_referral_locked BOOLEAN DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS idx_users_referred_by_mpr ON public.users(referred_by_mpr);
CREATE INDEX IF NOT EXISTS idx_books_content_type ON public.books(content_type);
CREATE INDEX IF NOT EXISTS idx_books_mpr_referral_code ON public.books(mpr_referral_code);

-- 3. Campaign Contracts Table
CREATE TABLE IF NOT EXISTS public.campaign_contracts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  mpr_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  book_id UUID REFERENCES public.books(id) ON DELETE CASCADE,
  campaign_fee INTEGER NOT NULL,
  platform_fee INTEGER NOT NULL,
  mpr_payout INTEGER NOT NULL,
  status TEXT DEFAULT 'pending',
  success_metrics JSONB DEFAULT '{"target_clicks":500,"target_reads":100,"target_sales":20,"current_clicks":0,"current_reads":0,"current_sales":0}'::jsonb,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  payout_release_date TIMESTAMPTZ,
  dispute_reason TEXT,
  dispute_opened_at TIMESTAMPTZ,
  dispute_resolved_at TIMESTAMPTZ,
  author_signature BOOLEAN DEFAULT FALSE,
  mpr_signature BOOLEAN DEFAULT FALSE,
  payment_reference TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_campaign_contracts_author ON public.campaign_contracts(author_id);
CREATE INDEX IF NOT EXISTS idx_campaign_contracts_mpr ON public.campaign_contracts(mpr_id);
CREATE INDEX IF NOT EXISTS idx_campaign_contracts_book ON public.campaign_contracts(book_id);
CREATE INDEX IF NOT EXISTS idx_campaign_contracts_status ON public.campaign_contracts(status);

ALTER TABLE public.campaign_contracts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public and users can view their own contracts" ON public.campaign_contracts;
CREATE POLICY "Public and users can view their own contracts" ON public.campaign_contracts
  FOR SELECT USING (
    auth.uid() = author_id 
    OR auth.uid() = mpr_id 
    OR EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND (is_admin = true OR account_tier = 'admin'))
  );

DROP POLICY IF EXISTS "Authors and MPRs can update their contracts" ON public.campaign_contracts;
CREATE POLICY "Authors and MPRs can update their contracts" ON public.campaign_contracts
  FOR ALL USING (
    auth.uid() = author_id 
    OR auth.uid() = mpr_id 
    OR EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND (is_admin = true OR account_tier = 'admin'))
  );

UPDATE public.books 
SET content_type = 'fc',
    author_share = 30,
    platform_share = 50,
    mpr_share = 20
WHERE content_type IS NULL;
`;

export const PUBLISHING_SYSTEM_IPC_FC_SQL = `-- PUBLISHING SYSTEM: TWO-LANE ECONOMY (ENTERTAINMENT VS INDEPENDENT), REVENUE SPLIT, MPR BOUNDARIES, & CAMPAIGN CONTRACTS
-- Run this in your Supabase SQL Editor to activate the Two-Lane publishing architecture

-- 1. Books Table Columns
ALTER TABLE public.books ADD COLUMN IF NOT EXISTS publishing_lane TEXT DEFAULT 'lane_a';
ALTER TABLE public.books ADD COLUMN IF NOT EXISTS content_type TEXT DEFAULT 'lane_a';
ALTER TABLE public.books ADD COLUMN IF NOT EXISTS word_count INTEGER DEFAULT 0;
ALTER TABLE public.books ADD COLUMN IF NOT EXISTS mpr_referral_code TEXT;
ALTER TABLE public.books ADD COLUMN IF NOT EXISTS author_share INTEGER DEFAULT 30;
ALTER TABLE public.books ADD COLUMN IF NOT EXISTS platform_share INTEGER DEFAULT 50;
ALTER TABLE public.books ADD COLUMN IF NOT EXISTS mpr_share INTEGER DEFAULT 20;
ALTER TABLE public.books ADD COLUMN IF NOT EXISTS trivia_rights_granted BOOLEAN DEFAULT TRUE;
ALTER TABLE public.books ADD COLUMN IF NOT EXISTS exclusivity_end_date TIMESTAMPTZ;
ALTER TABLE public.books ADD COLUMN IF NOT EXISTS rights_declared BOOLEAN DEFAULT FALSE;
ALTER TABLE public.books ADD COLUMN IF NOT EXISTS exclusivity_declared BOOLEAN DEFAULT FALSE;
ALTER TABLE public.books ADD COLUMN IF NOT EXISTS ipc_conversion_status TEXT DEFAULT 'none';
ALTER TABLE public.books ADD COLUMN IF NOT EXISTS ipc_applied_at TIMESTAMPTZ;
ALTER TABLE public.books ADD COLUMN IF NOT EXISTS ipc_approved_at TIMESTAMPTZ;

-- 2. Users Table Columns for MPR Referral Tracking & 6-Month Switch Rule
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS referral_code TEXT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS referred_by_mpr UUID REFERENCES public.users(id) ON DELETE SET NULL;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS mpr_assigned_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS mpr_referral_locked BOOLEAN DEFAULT FALSE;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS mpr_last_switch_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_users_referred_by_mpr ON public.users(referred_by_mpr);
CREATE INDEX IF NOT EXISTS idx_books_publishing_lane ON public.books(publishing_lane);
CREATE INDEX IF NOT EXISTS idx_books_content_type ON public.books(content_type);
CREATE INDEX IF NOT EXISTS idx_books_mpr_referral_code ON public.books(mpr_referral_code);

-- 3. Campaign Contracts Table (₦2,000 - ₦50,000 Escrow with 7-Day Holdback)
CREATE TABLE IF NOT EXISTS public.campaign_contracts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  mpr_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  book_id BIGINT REFERENCES public.books(id) ON DELETE CASCADE,
  campaign_fee INTEGER NOT NULL,
  platform_fee INTEGER NOT NULL,
  mpr_payout INTEGER NOT NULL,
  status TEXT DEFAULT 'pending',
  success_metrics JSONB DEFAULT '{"target_clicks":500,"target_reads":100,"target_sales":20,"current_clicks":0,"current_reads":0,"current_sales":0}'::jsonb,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  payout_release_date TIMESTAMPTZ,
  dispute_reason TEXT,
  dispute_opened_at TIMESTAMPTZ,
  dispute_resolved_at TIMESTAMPTZ,
  author_signature BOOLEAN DEFAULT FALSE,
  mpr_signature BOOLEAN DEFAULT FALSE,
  payment_reference TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_campaign_contracts_author ON public.campaign_contracts(author_id);
CREATE INDEX IF NOT EXISTS idx_campaign_contracts_mpr ON public.campaign_contracts(mpr_id);
CREATE INDEX IF NOT EXISTS idx_campaign_contracts_book ON public.campaign_contracts(book_id);
CREATE INDEX IF NOT EXISTS idx_campaign_contracts_status ON public.campaign_contracts(status);

ALTER TABLE public.campaign_contracts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public and users can view their own contracts" ON public.campaign_contracts;
CREATE POLICY "Public and users can view their own contracts" ON public.campaign_contracts
  FOR SELECT USING (
    auth.uid() = author_id 
    OR auth.uid() = mpr_id 
    OR EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND (is_admin = true OR account_tier = 'admin'))
  );

DROP POLICY IF EXISTS "Authors and MPRs can update their contracts" ON public.campaign_contracts;
CREATE POLICY "Authors and MPRs can update their contracts" ON public.campaign_contracts
  FOR ALL USING (
    auth.uid() = author_id 
    OR auth.uid() = mpr_id 
    OR EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND (is_admin = true OR account_tier = 'admin'))
  );

UPDATE public.books 
SET content_type = 'lane_a',
    publishing_lane = 'lane_a',
    author_share = 30,
    platform_share = 50,
    mpr_share = 20
WHERE content_type IS NULL;
`;


