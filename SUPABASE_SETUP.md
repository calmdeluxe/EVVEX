# Supabase Setup Instructions

To get CalmReader working with Supabase, you need to:

1. **Create a Supabase Project**: Go to [supabase.com](https://supabase.com) and create a new project.
2. **Get API Keys**: Go to **Project Settings > API** and copy the:
   - `Project URL`
   - `anon public` key (This is a very long string starting with `eyJ...`)
   - **CRITICAL**: Do NOT use your Paystack keys (starting with `sb_`, `pk_`, or `sk_`) here.
3. **Set Environment Variables**: In AI Studio Build, go to **Settings** and add:
   - `VITE_SUPABASE_URL`: Your Project URL
   - `VITE_SUPABASE_ANON_KEY`: Your `anon public` key
4. **Run SQL Schema**: Go to the **SQL Editor** in Supabase and run the following script to create the necessary tables:

```sql
-- Users table
CREATE TABLE users (
  id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  email TEXT UNIQUE,
  username TEXT UNIQUE,
  full_name TEXT,
  contact TEXT,
  is_admin BOOLEAN DEFAULT false,
  is_premium BOOLEAN DEFAULT false,
  is_suspended BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Books table
CREATE TABLE books (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  cards_json JSONB DEFAULT '[]',
  price INTEGER DEFAULT 0,
  public_slug TEXT UNIQUE,
  is_published BOOLEAN DEFAULT false,
  status TEXT DEFAULT 'pending', -- pending, approved, rejected, flagged
  admin_note TEXT,
  report_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Admin Posts table
CREATE TABLE posts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  content TEXT,
  type TEXT DEFAULT 'announcement', -- 'announcement' or 'ad'
  link_url TEXT,
  is_active BOOLEAN DEFAULT true,
  admin_id UUID REFERENCES auth.users,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Config table (for Paystack keys, etc.)
CREATE TABLE config (
  key TEXT PRIMARY KEY,
  value TEXT,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Reported Content table
CREATE TABLE reported_content (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  book_id UUID REFERENCES books ON DELETE CASCADE,
  card_index INTEGER,
  reporter_id TEXT,
  reason TEXT,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Buyer Access table
CREATE TABLE buyer_access (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  book_id UUID REFERENCES books ON DELETE CASCADE,
  buyer_email TEXT,
  access_token TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Transactions table
CREATE TABLE transactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  book_id UUID REFERENCES books ON DELETE CASCADE,
  buyer_email TEXT,
  amount INTEGER NOT NULL,
  commission INTEGER NOT NULL,
  author_earnings INTEGER NOT NULL,
  paystack_reference TEXT,
  status TEXT DEFAULT 'successful',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Withdrawals table
CREATE TABLE withdrawals (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users ON DELETE CASCADE,
  amount INTEGER NOT NULL,
  status TEXT DEFAULT 'pending', -- 'pending', 'approved', 'rejected', 'paid'
  bank_name TEXT,
  account_number TEXT,
  account_name TEXT,
  processed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Enable Row Level Security (RLS)
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE books ENABLE ROW LEVEL SECURITY;
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE config ENABLE ROW LEVEL SECURITY;
ALTER TABLE reported_content ENABLE ROW LEVEL SECURITY;
ALTER TABLE buyer_access ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE withdrawals ENABLE ROW LEVEL SECURITY;

-- Helper function to check if user is admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid() AND is_admin = TRUE
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- USERS Table Policies
CREATE POLICY "Admins can view all users" ON public.users FOR SELECT USING (is_admin());
CREATE POLICY "Users can view own profile" ON public.users FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Admins can update all users" ON public.users FOR UPDATE USING (is_admin());
CREATE POLICY "Users can update own profile" ON public.users FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Admins can delete users" ON public.users FOR DELETE USING (is_admin());

-- BOOKS Table Policies
CREATE POLICY "Admins can view all books" ON public.books FOR SELECT USING (is_admin());
CREATE POLICY "Users can view own books" ON public.books FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Public can view published books" ON public.books FOR SELECT USING (is_published = TRUE);
CREATE POLICY "Admins can insert books" ON public.books FOR INSERT WITH CHECK (is_admin());
CREATE POLICY "Users can insert own books" ON public.books FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins can update all books" ON public.books FOR UPDATE USING (is_admin());
CREATE POLICY "Users can update own books" ON public.books FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Admins can delete all books" ON public.books FOR DELETE USING (is_admin());
CREATE POLICY "Users can delete own books" ON public.books FOR DELETE USING (auth.uid() = user_id);

-- TRANSACTIONS Table Policies
CREATE POLICY "Admins can view all transactions" ON public.transactions FOR SELECT USING (is_admin());
CREATE POLICY "Users can view own transactions" ON public.transactions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins can insert transactions" ON public.transactions FOR INSERT WITH CHECK (is_admin());

-- WITHDRAWALS Table Policies
CREATE POLICY "Admins can view all withdrawals" ON public.withdrawals FOR SELECT USING (is_admin());
CREATE POLICY "Users can view own withdrawals" ON public.withdrawals FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own withdrawals" ON public.withdrawals FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins can update withdrawals" ON public.withdrawals FOR UPDATE USING (is_admin());

-- POSTS Table Policies
CREATE POLICY "Everyone can view active posts" ON public.posts FOR SELECT USING (is_active = TRUE);
CREATE POLICY "Admins can manage posts" ON public.posts FOR ALL USING (is_admin());

-- CONFIG Table Policies
CREATE POLICY "Config is viewable by everyone." ON config FOR SELECT USING (true);
CREATE POLICY "Admins can manage config." ON config FOR ALL USING (is_admin());

-- REPORTED_CONTENT Table Policies
CREATE POLICY "Admins can manage reports" ON public.reported_content FOR ALL USING (is_admin());
CREATE POLICY "Anyone can report content." ON reported_content FOR INSERT WITH CHECK (true);

-- BUYER_ACCESS Table Policies
CREATE POLICY "Buyer access is viewable by everyone." ON buyer_access FOR SELECT USING (true);
CREATE POLICY "Anyone can insert buyer access." ON buyer_access FOR INSERT WITH CHECK (true);
```
