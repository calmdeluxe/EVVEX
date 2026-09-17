-- ==============================================================================
-- EVENT PLATFORM: NON-DESTRUCTIVE ROLE & EVENT ARCHITECTURE MIGRATION
-- Target: Supabase PostgreSQL
-- Safety: Additive only. Preserves Admin and MPR. Zero destructive drops.
-- ==============================================================================

-- 1. ADD 'app_role' COLUMN TO USERS TABLE (NON-DESTRUCTIVE)
-- Default is 'guest' (formerly 'free')
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS app_role TEXT DEFAULT 'guest' 
CHECK (app_role IN ('admin', 'mpr', 'event_host', 'patron', 'guest'));

-- 2. BACKFILL APP_ROLE FROM EXISTING ACCOUNT_TIER
UPDATE public.users 
SET app_role = CASE 
  WHEN is_admin = TRUE OR account_tier = 'admin' THEN 'admin'
  WHEN account_tier IN ('mpr', 'marketing_partner') THEN 'mpr'
  WHEN account_tier = 'author' THEN 'event_host'
  WHEN account_tier = 'premium' THEN 'patron'
  ELSE 'guest'
END
WHERE app_role IS NULL OR app_role = 'guest';

-- Also ensure specific owner email is flagged admin
UPDATE public.users 
SET app_role = 'admin', is_admin = TRUE, account_tier = 'admin'
WHERE lower(email) IN ('winbigonly@gmail.com', 'samuelchukwuemeke05@gmail.com');

-- 3. BIDIRECTIONAL SYNC TRIGGER: account_tier <-> app_role
-- Guarantees legacy queries reading account_tier and new queries reading app_role stay in 100% sync
CREATE OR REPLACE FUNCTION public.sync_user_roles()
RETURNS TRIGGER AS $$
BEGIN
  -- If app_role was modified, sync account_tier
  IF (TG_OP = 'UPDATE' AND NEW.app_role IS DISTINCT FROM OLD.app_role) OR (TG_OP = 'INSERT' AND NEW.app_role IS NOT NULL) THEN
    NEW.account_tier := CASE 
      WHEN NEW.app_role = 'admin' THEN 'admin'
      WHEN NEW.app_role = 'mpr' THEN 'mpr'
      WHEN NEW.app_role = 'event_host' THEN 'author'
      WHEN NEW.app_role = 'patron' THEN 'premium'
      ELSE 'free'
    END;
    IF NEW.app_role = 'admin' THEN
      NEW.is_admin := TRUE;
    END IF;
  -- If account_tier was modified, sync app_role
  ELSIF (TG_OP = 'UPDATE' AND NEW.account_tier IS DISTINCT FROM OLD.account_tier) OR (TG_OP = 'INSERT' AND NEW.account_tier IS NOT NULL) THEN
    NEW.app_role := CASE 
      WHEN NEW.account_tier = 'admin' OR NEW.is_admin = TRUE THEN 'admin'
      WHEN NEW.account_tier IN ('mpr', 'marketing_partner') THEN 'mpr'
      WHEN NEW.account_tier = 'author' THEN 'event_host'
      WHEN NEW.account_tier = 'premium' THEN 'patron'
      ELSE 'guest'
    END;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sync_user_roles ON public.users;
CREATE TRIGGER trg_sync_user_roles
BEFORE INSERT OR UPDATE ON public.users
FOR EACH ROW EXECUTE FUNCTION public.sync_user_roles();

-- 4. HELPER AUTH FUNCTIONS (SECURITY DEFINER)
CREATE OR REPLACE FUNCTION public.current_app_role()
RETURNS TEXT AS $$
DECLARE
  v_role TEXT;
BEGIN
  SELECT app_role INTO v_role FROM public.users WHERE id = auth.uid();
  RETURN COALESCE(v_role, 'guest');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.is_event_host()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.users 
    WHERE id = auth.uid() AND (app_role = 'event_host' OR app_role = 'admin' OR is_admin = TRUE)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.is_patron()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.users 
    WHERE id = auth.uid() AND (app_role IN ('patron', 'admin') OR is_admin = TRUE)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. EVENTS TABLE (FOUNDATION)
CREATE TABLE IF NOT EXISTS public.events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by UUID REFERENCES auth.users(id) ON DELETE RESTRICT NOT NULL,
  title TEXT NOT NULL,
  slug TEXT UNIQUE,
  tagline TEXT,
  description TEXT,
  category TEXT DEFAULT 'mixer' CHECK (category IN ('quiz', 'food', 'party', 'birthday', 'surprise_party', 'engagement', 'concert', 'praise_concert', 'pageantry', 'auction', 'showcase', 'mixer', 'other')),
  cover_image TEXT,
  gallery JSONB DEFAULT '[]'::jsonb,
  venue_name TEXT NOT NULL,
  venue_address TEXT,
  city TEXT DEFAULT 'Lagos',
  state TEXT DEFAULT 'Lagos State',
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ,
  age_restriction TEXT DEFAULT '18+',
  dress_code TEXT,
  is_private BOOLEAN DEFAULT FALSE,
  is_patron_only BOOLEAN DEFAULT FALSE,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'submitted', 'under_review', 'approved', 'published', 'completed', 'archived', 'cancelled')),
  rejection_reason TEXT,
  reviewed_by UUID REFERENCES auth.users(id),
  reviewed_at TIMESTAMPTZ,
  max_capacity INTEGER DEFAULT 100,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_events_created_by ON public.events(created_by);
CREATE INDEX IF NOT EXISTS idx_events_status ON public.events(status);
CREATE INDEX IF NOT EXISTS idx_events_start_time ON public.events(start_time);

-- 6. TICKET TIERS TABLE
CREATE TABLE IF NOT EXISTS public.event_ticket_tiers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID REFERENCES public.events(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL, -- 'Standard', 'VIP', 'VVIP Table of 5', 'Early Bird'
  tier_type TEXT DEFAULT 'standard' CHECK (tier_type IN ('early_bird', 'standard', 'vip', 'vvip', 'table', 'patron_exclusive')),
  price_kobo BIGINT DEFAULT 0, -- Price in kobo for Paystack (e.g. 500000 = 5,000 NGN)
  currency TEXT DEFAULT 'NGN',
  capacity INTEGER NOT NULL DEFAULT 50,
  sold_count INTEGER DEFAULT 0,
  is_patron_only BOOLEAN DEFAULT FALSE,
  sales_start TIMESTAMPTZ,
  sales_end TIMESTAMPTZ,
  perks JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ticket_tiers_event_id ON public.event_ticket_tiers(event_id);

-- 7. PURCHASED TICKETS TABLE (QR CODE & ATTENDANCE)
CREATE TABLE IF NOT EXISTS public.event_tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_number TEXT UNIQUE NOT NULL,
  event_id UUID REFERENCES public.events(id) ON DELETE RESTRICT NOT NULL,
  tier_id UUID REFERENCES public.event_ticket_tiers(id) ON DELETE RESTRICT NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  attendee_name TEXT NOT NULL,
  attendee_email TEXT NOT NULL,
  attendee_phone TEXT,
  price_paid_kobo BIGINT DEFAULT 0,
  paystack_reference TEXT,
  payment_status TEXT DEFAULT 'success' CHECK (payment_status IN ('pending', 'success', 'failed', 'refunded')),
  checked_in BOOLEAN DEFAULT FALSE,
  checked_in_at TIMESTAMPTZ,
  checked_in_by UUID REFERENCES auth.users(id),
  qr_code_hash TEXT UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_event_tickets_event_id ON public.event_tickets(event_id);
CREATE INDEX IF NOT EXISTS idx_event_tickets_user_id ON public.event_tickets(user_id);
CREATE INDEX IF NOT EXISTS idx_event_tickets_ticket_number ON public.event_tickets(ticket_number);

-- 8. EVENT PARTICIPANTS: VENDORS & STAFF JUNCTION
-- Caterer, MC, Photographer, Usher, Sound, Bouncer
CREATE TABLE IF NOT EXISTS public.event_vendors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID REFERENCES public.events(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  vendor_name TEXT NOT NULL,
  service_category TEXT NOT NULL, -- 'catering', 'mc', 'dj', 'photography', 'ushers', 'security', 'decor'
  agreed_fee_kobo BIGINT DEFAULT 0,
  contract_status TEXT DEFAULT 'briefed' CHECK (contract_status IN ('briefed', 'accepted', 'completed', 'cancelled')),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.event_staff (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID REFERENCES public.events(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role_title TEXT DEFAULT 'scanner', -- 'gate_scanner', 'usher', 'stage_manager'
  assigned_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(event_id, user_id)
);

-- 9. EVENT PAYOUT REQUESTS
CREATE TABLE IF NOT EXISTS public.event_payout_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID REFERENCES public.events(id) ON DELETE RESTRICT NOT NULL,
  host_id UUID REFERENCES auth.users(id) ON DELETE RESTRICT NOT NULL,
  gross_revenue_kobo BIGINT NOT NULL,
  platform_fee_kobo BIGINT NOT NULL,
  net_payout_kobo BIGINT NOT NULL,
  bank_name TEXT NOT NULL,
  account_number TEXT NOT NULL,
  account_name TEXT NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'disbursed')),
  rejection_reason TEXT,
  processed_by UUID REFERENCES auth.users(id),
  processed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 10. ENABLE ROW LEVEL SECURITY
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_ticket_tiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_vendors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_staff ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_payout_requests ENABLE ROW LEVEL SECURITY;

-- 11. RLS POLICIES FOR EVENTS
-- Anyone can view published public events
DROP POLICY IF EXISTS "Public can view published events" ON public.events;
CREATE POLICY "Public can view published events" ON public.events
FOR SELECT USING (
  status = 'published' AND is_private = FALSE
);

-- Patrons can view patron-exclusive published events
DROP POLICY IF EXISTS "Patrons view patron events" ON public.events;
CREATE POLICY "Patrons view patron events" ON public.events
FOR SELECT USING (
  status = 'published' AND is_patron_only = TRUE AND public.is_patron()
);

-- Event Hosts can view and edit their own events in any status
DROP POLICY IF EXISTS "Hosts view and edit own events" ON public.events;
CREATE POLICY "Hosts view and edit own events" ON public.events
FOR ALL USING (
  created_by = auth.uid()
);

-- Admins and MPR have full access to view and review events
DROP POLICY IF EXISTS "Admins and MPR manage events" ON public.events;
CREATE POLICY "Admins and MPR manage events" ON public.events
FOR ALL USING (
  public.is_admin() OR EXISTS (
    SELECT 1 FROM public.users WHERE id = auth.uid() AND (app_role = 'mpr' OR account_tier = 'mpr')
  )
);

-- 12. RLS POLICIES FOR TICKETS
-- Attendees view only their own tickets
DROP POLICY IF EXISTS "Attendees view own tickets" ON public.event_tickets;
CREATE POLICY "Attendees view own tickets" ON public.event_tickets
FOR SELECT USING (
  user_id = auth.uid()
);

-- Event hosts can view all tickets for their own events (for guestlist and gate check)
DROP POLICY IF EXISTS "Hosts view tickets for own events" ON public.event_tickets;
CREATE POLICY "Hosts view tickets for own events" ON public.event_tickets
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.events 
    WHERE events.id = event_tickets.event_id AND events.created_by = auth.uid()
  ) OR public.is_admin()
);

-- Gate staff can update check-in status
DROP POLICY IF EXISTS "Staff checkin tickets" ON public.event_tickets;
CREATE POLICY "Staff checkin tickets" ON public.event_tickets
FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM public.events WHERE events.id = event_tickets.event_id AND events.created_by = auth.uid()
  ) OR EXISTS (
    SELECT 1 FROM public.event_staff WHERE event_staff.event_id = event_tickets.event_id AND event_staff.user_id = auth.uid()
  ) OR public.is_admin()
);

-- Grant appropriate permissions
GRANT SELECT, INSERT, UPDATE ON public.events TO authenticated;
GRANT SELECT ON public.events TO anon;
GRANT SELECT, INSERT, UPDATE ON public.event_ticket_tiers TO authenticated;
GRANT SELECT ON public.event_ticket_tiers TO anon;
GRANT SELECT, INSERT, UPDATE ON public.event_tickets TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.event_vendors TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.event_staff TO authenticated;
GRANT SELECT, INSERT ON public.event_payout_requests TO authenticated;
