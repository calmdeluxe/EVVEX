# Supabase Emergency Repair

If you are seeing **"infinite recursion detected in policy for relation 'users'"** or facing database errors, please follow these steps:

### 1. Clear Existing Policies
Run this SQL in your [Supabase SQL Editor](https://supabase.com/dashboard/project/_/sql):

```sql
-- Step 1: Drop EVERY policy on the users table to stop recursion instantly
DO $$ 
DECLARE 
    pol record;
BEGIN 
    FOR pol IN (SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'users') 
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.users', pol.policyname);
    END LOOP;
END $$;

-- Step 2: Set new, safe policies that use JWT claims (to avoid recursion)
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile v2" ON public.users 
FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile v2" ON public.users 
FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Admins view all users v2" ON public.users 
FOR SELECT USING (
  auth.jwt() ->> 'email' = 'samuelchukwuemeke05@gmail.com'
);
```

### 2. Verify Service Role Key
Ensure you have the `SUPABASE_SERVICE_ROLE_KEY` (starts with `eyJ...`) added to your AI Studio Settings. 
The server uses this key to bypass RLS, which is the most reliable way to avoid these errors.

### 3. Check Table Existence
If banners are failing with 500, ensure the `trivias` and `books` tables exist.
You can re-run the full migration from `src/lib/migrations.ts` if needed.
