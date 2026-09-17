-- CalmReader Migration v3: THE FINAL INTEGER RECONCILIATION
-- Run this in the Supabase SQL Editor to fix syntax errors and align with the app's internal logic.

-- 1. RECONCILE THE 'status' COLUMN (INTEGER 0/1)
-- 0 = draft/pending, 1 = approved
ALTER TABLE public.books ALTER COLUMN status DROP DEFAULT;
ALTER TABLE public.books 
ALTER COLUMN status TYPE INTEGER USING (
  CASE 
    WHEN status::text IN ('approved', 'published', '1', 'true') THEN 1 
    ELSE 0 
  END
);
ALTER TABLE public.books ALTER COLUMN status SET DEFAULT 0;

-- 2. RECONCILE 'is_published' (INTEGER 0/1)
ALTER TABLE public.books ALTER COLUMN is_published DROP DEFAULT;
ALTER TABLE public.books 
ALTER COLUMN is_published TYPE INTEGER USING (
  CASE 
    WHEN is_published::text IN ('1', 'true', 'TRUE') THEN 1 
    ELSE 0 
  END
);
ALTER TABLE public.books ALTER COLUMN is_published SET DEFAULT 0;

-- 3. ENSURE 'report_count' IS INTEGER
ALTER TABLE public.books ADD COLUMN IF NOT EXISTS report_count INTEGER DEFAULT 0;
ALTER TABLE public.books ALTER COLUMN report_count TYPE INTEGER USING COALESCE(report_count::integer, 0);

-- 4. ENSURE 'admin_note' IS TEXT
ALTER TABLE public.books ADD COLUMN IF NOT EXISTS admin_note TEXT;

-- 5. RECONCILE USER FLAGS (INTEGER 0/1)
ALTER TABLE public.users ALTER COLUMN is_admin DROP DEFAULT;
ALTER TABLE public.users 
ALTER COLUMN is_admin TYPE INTEGER USING (CASE WHEN is_admin::text IN ('1', 'true', 'TRUE') THEN 1 ELSE 0 END);
ALTER TABLE public.users ALTER COLUMN is_admin SET DEFAULT 0;

ALTER TABLE public.users ADD COLUMN IF NOT EXISTS is_premium INTEGER DEFAULT 0;
ALTER TABLE public.users 
ALTER COLUMN is_premium TYPE INTEGER USING (CASE WHEN is_premium::text IN ('1', 'true', 'TRUE') THEN 1 ELSE 0 END);

ALTER TABLE public.users ADD COLUMN IF NOT EXISTS is_suspended INTEGER DEFAULT 0;
ALTER TABLE public.users 
ALTER COLUMN is_suspended TYPE INTEGER USING (CASE WHEN is_suspended::text IN ('1', 'true', 'TRUE') THEN 1 ELSE 0 END);

-- 6. ENSURE CRITICAL COLUMNS EXIST
ALTER TABLE public.books ADD COLUMN IF NOT EXISTS public_slug TEXT UNIQUE;
ALTER TABLE public.books ADD COLUMN IF NOT EXISTS cards_json JSONB DEFAULT '[]';

-- 7. RE-EMPOWER RLS POLICIES FOR INTEGER SCHEMA
DROP POLICY IF EXISTS "Public can view approved books" ON public.books;
CREATE POLICY "Public can view approved books" ON public.books
FOR SELECT USING (status = 1 OR auth.uid() = user_id OR (
  EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND is_admin = 1)
));

-- Final Success Check
COMMENT ON TABLE public.books IS 'Schema reconciled to INTEGER Standard (0/1). Fixed on 2026-04-17.';
