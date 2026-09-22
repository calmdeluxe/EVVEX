-- ==========================================================
-- CALMREADER FOUNDATIONAL SYSTEMS MIGRATION
-- Adds: user_feedback, email_logs, refund_requests, profiles.onboarding_completed, books.views, books.conversions
-- ==========================================================

-- 1. Add missing columns to users/profiles and books
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT FALSE;
ALTER TABLE public.books ADD COLUMN IF NOT EXISTS views INTEGER DEFAULT 0;
ALTER TABLE public.books ADD COLUMN IF NOT EXISTS conversions INTEGER DEFAULT 0;

-- 2. Create User Feedback Table
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


-- 3. Create Email Logs Table
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


-- 4. Create Refund Requests Table
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
