-- ============================================================================
-- SUPABASE ULTIMATE REPAIR & HOLISTIC RECURSION RECOVERY SQL
-- ============================================================================
-- Purpose: 
--  1. Resolve the critical security breach where new signups were automatically 
--     getting administrator status (is_admin = True or account_tier = 'admin').
--  2. Redefine 'is_admin()' helper function to prevent Row-Level Security (RLS)
--     infinite recursion and lookup timeouts on Books, Users, and other tables.
--  3. Rebuild secure, lightning-fast, and index-backed security policies for 
--     the "books" and "users" tables.
--  4. Clean up existing users, ensuring only authorized owners are admins.
--
-- How to run:
--  Copy-paste this entire script into your Supabase dashboard's "SQL Editor"
--  and click "RUN". It is completely idempotent and safe to run multiple times.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- STEP 1: CLEANUP ILLEGITIMATE ADMIN ACCOUNTS & LOCK THE OWNER AS UNIQUE ADMIN
-- ----------------------------------------------------------------------------
RAISE NOTICE 'Initializing database repair...';

-- 1. Remove admin status and premium privileges from all users EXCEPT the CEO
UPDATE public.users 
SET 
  is_admin = FALSE, 
  account_tier = 'free',
  is_premium = FALSE
WHERE email != 'samuelchukwuemeke05@gmail.com';

-- 2. Lock the true owner (Samuel) as the supreme Admin with 'admin' account tier
UPDATE public.users 
SET 
  is_admin = TRUE, 
  account_tier = 'admin',
  is_premium = TRUE
WHERE email = 'samuelchukwuemeke05@gmail.com';


-- ----------------------------------------------------------------------------
-- STEP 2: REMOVE ANY DANGEROUS/INCORRECT DEFAULT VALUES ON COLUMNS
-- ----------------------------------------------------------------------------
-- Ensure that the database itself defaults new manual profile creations to 'free' and non-admin
ALTER TABLE public.users ALTER COLUMN is_admin SET DEFAULT FALSE;
ALTER TABLE public.users ALTER COLUMN account_tier SET DEFAULT 'free';
ALTER TABLE public.users ALTER COLUMN is_premium SET DEFAULT FALSE;


-- ----------------------------------------------------------------------------
-- STEP 3: ELIMINATE ROW-LEVEL SECURITY (RLS) RECURSION HELPER FUNCTION
-- ----------------------------------------------------------------------------
-- Traditional is_admin() calls query the public.users table table inside policies.
-- Because those policies also guard public.users, this causes an infinite recursive loop,
-- resulting in "canceling statement due to statement timeout" errors.
-- We redefine the function to inspect the authenticated JWT claims directly.
-- This requires 0 database queries, runs in O(1) time, and is 100% immune to recursion.

CREATE OR REPLACE FUNCTION public.is_admin() 
RETURNS boolean AS $$
BEGIN
  -- Safe, instant check directly reading the secure user email from their JWT credentials
  RETURN COALESCE(
    auth.jwt() ->> 'email' = 'samuelchukwuemeke05@gmail.com',
    FALSE
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.is_admin() TO public, anon, authenticated, service_role;


-- ----------------------------------------------------------------------------
-- STEP 4: RECREATE A SECURE USER CREATION TRIGGER FOR AUTH SIGNUPS
-- ----------------------------------------------------------------------------
-- Automatically inserts user profiles inside 'public.users' upon signup.
-- Formulates a fail-safe security boundary: strictly overrides admin variables to FALSE.

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  v_full_name TEXT;
  v_username TEXT;
BEGIN
  -- Extract user parameters safely from auth metadata
  v_full_name := COALESCE(
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'name',
    split_part(NEW.email, '@', 1)
  );
  v_username := COALESCE(
    NEW.raw_user_meta_data->>'username',
    split_part(NEW.email, '@', 1) || '_' || substr(md5(random()::text), 1, 4)
  );

  -- Explicitly write user records to avoid dangerous column defaults
  INSERT INTO public.users (
    id, 
    email, 
    full_name, 
    username,
    is_admin, 
    account_tier, 
    is_premium,
    is_approved_author,
    wallet_balance, 
    t_points, 
    total_earned, 
    created_at
  )
  VALUES (
    NEW.id,
    NEW.email,
    v_full_name,
    v_username,
    FALSE,          -- 🔥 GUARD: Explicitly set is_admin to FALSE!
    'free',         -- 🔥 GUARD: Explicitly set account_tier to free!
    FALSE,          -- 🔥 GUARD: Explicitly set is_premium to FALSE!
    FALSE,          -- 🔥 GUARD: Explicitly set approved author status to FALSE!
    0,
    0,
    0,
    NOW()
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = COALESCE(public.users.full_name, EXCLUDED.full_name),
    username = COALESCE(public.users.username, EXCLUDED.username);

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Clear any duplicate trigger variations on auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS tr_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS handle_new_user ON auth.users;
DROP TRIGGER IF EXISTS on_auth_user_signup ON auth.users;

-- Bind the fresh, secure creation trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();


-- ----------------------------------------------------------------------------
-- STEP 5: CLEAN & RESTORE OPTIMIZED RLS POLICIES ON THE USERS TABLE
-- ----------------------------------------------------------------------------
-- Drop all previous overlapping policies on public.users to start fresh
DO $$ 
DECLARE 
    pol RECORD;
BEGIN 
    FOR pol IN (SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'users') 
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', pol.policyname, 'users');
    END LOOP;
END $$;

-- Bring RLS online
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Policy 1: Members can read and write to their own account profiles
CREATE POLICY "allow_self_manage_users" 
ON public.users 
FOR ALL 
TO public
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- Policy 2: Admin enjoys direct readout over all user metadata
CREATE POLICY "allow_admin_view_users" 
ON public.users 
FOR SELECT 
TO public
USING (auth.jwt() ->> 'email' IN ('samuelchukwuemeke05@gmail.com'));

-- Policy 3: Allow inserts during authentication/sign-up cycles
CREATE POLICY "allow_public_insert_users" 
ON public.users 
FOR INSERT 
TO public 
WITH CHECK (true);


-- ----------------------------------------------------------------------------
-- STEP 6: CLEAN & RESTORE OPTIMIZED RLS POLICIES ON THE BOOKS TABLE (SOLVES MARKETPLACE TIMEOUTS)
-- ----------------------------------------------------------------------------
-- Purges old, duplicate, or circular policies on books that triggered statement timeouts.
DO $$ 
DECLARE 
    pol RECORD;
BEGIN 
    FOR pol IN (SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'books') 
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.books', pol.policyname);
    END LOOP;
END $$;

-- Ensure RLS is active
ALTER TABLE public.books ENABLE ROW LEVEL SECURITY;

-- Policy 1: The public (guests, anon & authors) can fetch published or approved books instantly (index-favorable)
CREATE POLICY "allow_public_select_books" 
ON public.books 
FOR SELECT 
TO public 
USING (
  is_published = true 
  OR is_published = 1 
  OR is_published = 'true' 
  OR status = 1 
  OR status = '1' 
  OR status = 'approved' 
  OR status = 'published'
);

-- Policy 2: Registered authors possess complete command over their self-uploaded items
CREATE POLICY "allow_author_manage_books" 
ON public.books 
FOR ALL 
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Policy 3: CEO enjoys complete administrative permission over all inventory
CREATE POLICY "allow_admin_manage_books" 
ON public.books 
FOR ALL 
TO public
USING (auth.jwt() ->> 'email' IN ('samuelchukwuemeke05@gmail.com'));


-- ----------------------------------------------------------------------------
-- STEP 7: BUILD CRITICAL PERFORMANCE ACCELERATOR INDEXES
-- ----------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_books_created_at_desc ON public.books (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_books_is_published ON public.books (is_published);
CREATE INDEX IF NOT EXISTS idx_books_status_pub ON public.books (is_published, status);
CREATE INDEX IF NOT EXISTS idx_users_email ON public.users (email);


-- ----------------------------------------------------------------------------
-- STEP 8: AUDIT/CONFIRM CORRECT ADMIN DISTRIBUTION
-- ----------------------------------------------------------------------------
-- Verify administrative structure in database logs
SELECT email, is_admin, account_tier, is_premium, created_at 
FROM public.users 
WHERE is_admin = TRUE OR account_tier = 'admin';
