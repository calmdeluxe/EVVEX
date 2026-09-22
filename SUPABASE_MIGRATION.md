-- CalmReader Database Migration
-- Run this in the Supabase SQL Editor

-- 1. Extend users table (already exists, adding new columns)
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS is_premium BOOLEAN DEFAULT FALSE;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS is_verified_author BOOLEAN DEFAULT FALSE;

-- 1b. Fix RLS Policies for user signup
-- Allow users to create their own profile during signup
DROP POLICY IF EXISTS "Users can insert own profile" ON public.users;
CREATE POLICY "Users can insert own profile" ON public.users FOR INSERT WITH CHECK (auth.uid() = id);
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS signup_ip TEXT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS total_earned INTEGER DEFAULT 0;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS total_withdrawn INTEGER DEFAULT 0;

-- 2. Extend books table with admin approval fields
-- CRITICAL: Run this to fix "Could not find column 'status'" errors!
ALTER TABLE public.books ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending'; -- pending, approved, rejected, flagged
ALTER TABLE public.books ADD COLUMN IF NOT EXISTS admin_note TEXT;
ALTER TABLE public.books ADD COLUMN IF NOT EXISTS report_count INTEGER DEFAULT 0;

-- 3. Affiliate links table
CREATE TABLE IF NOT EXISTS public.affiliate_links (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    book_id UUID REFERENCES public.books(id) ON DELETE CASCADE NOT NULL,
    affiliate_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    affiliate_code TEXT UNIQUE NOT NULL,
    click_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Referrals table (platform-level user referrals)
CREATE TABLE IF NOT EXISTS public.referrals (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    referrer_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    referred_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    reward_granted BOOLEAN DEFAULT FALSE,
    reward_amount INTEGER DEFAULT 100,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Transactions table for all earnings (author, affiliate, referral, withdrawal)
CREATE TABLE IF NOT EXISTS public.transactions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    type TEXT CHECK (type IN ('author_earning', 'affiliate_commission', 'referral_bonus', 'withdrawal', 'premium_upgrade')),
    amount INTEGER NOT NULL,
    book_id UUID REFERENCES public.books(id),
    affiliate_link_id UUID REFERENCES public.affiliate_links(id),
    status TEXT DEFAULT 'completed',
    paystack_reference TEXT,
    commission INTEGER DEFAULT 0, -- Platform commission
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. Withdrawals table
CREATE TABLE IF NOT EXISTS public.withdrawals (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    amount INTEGER NOT NULL,
    bank_name TEXT NOT NULL,
    account_number TEXT NOT NULL,
    account_name TEXT NOT NULL,
    status TEXT DEFAULT 'pending',
    admin_note TEXT,
    processed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 7. Reports table for user-generated flags
CREATE TABLE IF NOT EXISTS public.reported_content (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    book_id UUID REFERENCES public.books(id) ON DELETE CASCADE NOT NULL,
    reporter_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    reason TEXT NOT NULL,
    status TEXT DEFAULT 'pending', -- pending, dismissed, removed
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 8. RPC for incrementing report count
CREATE OR REPLACE FUNCTION increment_book_report_count(book_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE public.books
  SET report_count = report_count + 1
  WHERE id = book_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 9. RPC for incrementing affiliate clicks
CREATE OR REPLACE FUNCTION increment_affiliate_clicks(link_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE public.affiliate_links
  SET click_count = click_count + 1
  WHERE id = link_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 10. RLS Policies (Ensure admins can see everything)
-- Note: These are basic. You should refine them based on your security needs.

ALTER TABLE public.affiliate_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.withdrawals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reported_content ENABLE ROW LEVEL SECURITY;

-- Admin bypass function (if not already created)
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN (
    SELECT is_admin 
    FROM public.users 
    WHERE id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Policies for transactions
CREATE POLICY "Users can view own transactions" ON public.transactions
FOR SELECT USING (auth.uid() = user_id OR is_admin());

-- Policies for withdrawals
CREATE POLICY "Users can view own withdrawals" ON public.withdrawals
FOR SELECT USING (auth.uid() = user_id OR is_admin());

CREATE POLICY "Users can create withdrawals" ON public.withdrawals
FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Policies for books (only approved books are public)
DROP POLICY IF EXISTS "Public can view approved books" ON public.books;
CREATE POLICY "Public can view approved books" ON public.books
FOR SELECT USING (status = 'approved' OR auth.uid() = user_id OR is_admin());
