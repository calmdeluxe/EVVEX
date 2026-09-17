-- 🔥 EMERGENCY SUPABASE REPAIR SQL 🔥
-- ---------------------------------------------------------
-- INSTRUCTIONS:
-- 1. Copy ALL of this code.
-- 2. Go to: https://supabase.com/dashboard/project/_/sql
-- 3. Paste and click "RUN".
-- 4. Refresh your app.
-- ---------------------------------------------------------

-- STEP 1: Nuke all recursive policies on the users table instantly
DO $$ 
DECLARE 
    pol record;
BEGIN 
    FOR pol IN (SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'users') 
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.users', pol.policyname);
    END LOOP;
END $$;

-- STEP 2: Restore the users table with SAFE, NON-RECURSIVE policies
-- We use auth.jwt() instead of querying the table to avoid the recursion loop.
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "safe_select_self" ON public.users 
FOR SELECT USING (auth.uid() = id);

CREATE POLICY "safe_update_self" ON public.users 
FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "safe_admin_access" ON public.users 
FOR SELECT USING (
  auth.jwt() ->> 'email' = 'samuelchukwuemeke05@gmail.com'
);

-- STEP 3: Ensure ONLY the CEO email is marked as admin
UPDATE public.users SET is_admin = false;
UPDATE public.users 
SET is_admin = true, account_tier = 'admin'
WHERE email = 'samuelchukwuemeke05@gmail.com';

-- STEP 4: (Optional) Fix other potentially recursive tables
DO $$ 
DECLARE 
    pol record;
BEGIN 
    FOR pol IN (SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'books') 
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.books', pol.policyname);
    END LOOP;
END $$;

ALTER TABLE public.books ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public_view_books" ON public.books FOR SELECT USING (status = '1' OR status = 'approved' OR status = 'published' OR is_published = true OR is_published = 'true');
CREATE POLICY "author_manage_books" ON public.books FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "admin_manage_books" ON public.books FOR ALL USING (
  auth.jwt() ->> 'email' = 'samuelchukwuemeke05@gmail.com'
);

-- REPAIR COMPLETE. Refresh your app.
