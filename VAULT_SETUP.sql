-- VAULT_SETUP.sql
-- Run this in your Supabase SQL Editor to provision the central Vault table and policies.

-- 1. Create Vault Table
CREATE TABLE IF NOT EXISTS public.vault (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  type TEXT NOT NULL, -- 'trivia_question', 'puzzle', 'image'
  content JSONB NOT NULL, -- holds question/options/answer structures
  tags TEXT, -- comma-separated tags
  difficulty TEXT DEFAULT 'medium', -- 'easy', 'medium', 'hard'
  image_url TEXT, -- optional image url attachment
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Enable Row Level Security (RLS)
ALTER TABLE public.vault ENABLE ROW LEVEL SECURITY;

-- 3. Create Security Policies
DROP POLICY IF EXISTS "Allow authenticated users to read vault" ON public.vault;
DROP POLICY IF EXISTS "Allow admins to manage vault" ON public.vault;

CREATE POLICY "Allow authenticated users to read vault" 
ON public.vault 
FOR SELECT 
USING (auth.role() = 'authenticated');

CREATE POLICY "Allow admins to manage vault" 
ON public.vault 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.users
    WHERE users.id = auth.uid() AND users.is_admin = true
  )
);

-- 4. Create Index for faster fetching
CREATE INDEX IF NOT EXISTS idx_vault_type_created ON public.vault(type, created_at DESC);
