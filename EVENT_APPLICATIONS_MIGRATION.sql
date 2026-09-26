-- ==============================================================================
-- EVENT APPLICATIONS SYSTEM
-- Allows users to apply for participation in events (Artists, Vendors, Staff, etc.)
-- Uses existing event_vendors and event_staff tables for fulfillment
-- ==============================================================================

-- 1. CREATE EVENT APPLICATIONS TABLE
CREATE TABLE IF NOT EXISTS public.event_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID REFERENCES public.events(id) ON DELETE CASCADE NOT NULL,
  applicant_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  
  -- Application type maps to event_vendors.service_category or event_staff.role_title
  application_type TEXT NOT NULL CHECK (application_type IN (
    -- Vendor/service categories (map to event_vendors.service_category)
    'catering', 'mc', 'dj', 'photography', 'ushers', 'security', 'decor',
    -- Staff roles (map to event_staff.role_title) 
    'gate_scanner', 'usher', 'stage_manager',
    -- Additional participation types
    'artist_performer', 'speaker', 'exhibitor', 'event_partner', 
    'ambassador', 'sponsor', 'volunteer', 'contestant', 'other'
  )),
  
  -- Application details
  applicant_name TEXT NOT NULL,
  applicant_email TEXT NOT NULL,
  applicant_phone TEXT,
  bio TEXT, -- Why you want to participate, experience, portfolio
  portfolio_url TEXT, -- Link to work samples, social media, etc.
  proposed_fee_kobo BIGINT DEFAULT 0, -- For paid participation (vendor/artist)
  requirements TEXT, -- Special requirements (equipment, space, etc.)
  
  -- Application status workflow
  status TEXT DEFAULT 'pending' CHECK (status IN (
    'pending', 'under_review', 'approved', 'rejected', 'needs_revision', 'withdrawn'
  )),
  
  -- Admin/organizer review
  reviewed_by UUID REFERENCES auth.users(id),
  reviewed_at TIMESTAMPTZ,
  review_notes TEXT, -- Feedback for applicant
  admin_fee_kobo BIGINT DEFAULT 0, -- Final agreed fee (may differ from proposed)
  
  -- Paystack payment reference (for application fee)
  paystack_reference TEXT,
  application_fee_paid BOOLEAN DEFAULT FALSE,
  application_fee_kobo BIGINT DEFAULT 0,
  
  -- Outcome: if approved, creates record in event_vendors or event_staff
  fulfilled_vendor_id UUID REFERENCES public.event_vendors(id),
  fulfilled_staff_id UUID REFERENCES public.event_staff(id),
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- One application per user per event per type
  UNIQUE(event_id, applicant_id, application_type)
);

CREATE INDEX IF NOT EXISTS idx_event_applications_event_id ON public.event_applications(event_id);
CREATE INDEX IF NOT EXISTS idx_event_applications_applicant_id ON public.event_applications(applicant_id);
CREATE INDEX IF NOT EXISTS idx_event_applications_status ON public.event_applications(status);

-- 2. ENABLE RLS
ALTER TABLE public.event_applications ENABLE ROW LEVEL SECURITY;

-- 3. RLS POLICIES
-- Applicants can view their own applications
DROP POLICY IF EXISTS "Applicants view own applications" ON public.event_applications;
CREATE POLICY "Applicants view own applications" ON public.event_applications
FOR SELECT USING (applicant_id = auth.uid());

-- Event organizers (hosts) can view applications for their events
DROP POLICY IF EXISTS "Event hosts view applications for own events" ON public.event_applications;
CREATE POLICY "Event hosts view applications for own events" ON public.event_applications
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.events 
    WHERE events.id = event_applications.event_id 
    AND events.created_by = auth.uid()
  )
);

-- Admins and MPR can view all applications
DROP POLICY IF EXISTS "Admins and MPR view all applications" ON public.event_applications;
CREATE POLICY "Admins and MPR view all applications" ON public.event_applications
FOR SELECT USING (
  public.is_admin() OR EXISTS (
    SELECT 1 FROM public.users WHERE id = auth.uid() AND (app_role = 'mpr' OR account_tier = 'mpr')
  )
);

-- Authenticated users can create applications
DROP POLICY IF EXISTS "Authenticated users create applications" ON public.event_applications;
CREATE POLICY "Authenticated users create applications" ON public.event_applications
FOR INSERT WITH CHECK (
  auth.uid() = applicant_id
);

-- Event hosts and admins can update application status
DROP POLICY IF EXISTS "Hosts and admins update applications" ON public.event_applications;
CREATE POLICY "Hosts and admins update applications" ON public.event_applications
FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM public.events 
    WHERE events.id = event_applications.event_id 
    AND events.created_by = auth.uid()
  ) OR public.is_admin()
);

-- 4. HELPER FUNCTION: Get application type label
CREATE OR REPLACE FUNCTION public.get_application_type_label(app_type TEXT)
RETURNS TEXT AS $$
BEGIN
  RETURN CASE app_type
    WHEN 'catering' THEN 'Caterer'
    WHEN 'mc' THEN 'Host / MC'
    WHEN 'dj' THEN 'DJ'
    WHEN 'photography' THEN 'Photographer / Videographer'
    WHEN 'ushers' THEN 'Usher'
    WHEN 'security' THEN 'Security / Bouncer'
    WHEN 'decor' THEN 'Decorator'
    WHEN 'gate_scanner' THEN 'Gate Scanner'
    WHEN 'usher' THEN 'Usher'
    WHEN 'stage_manager' THEN 'Stage Manager'
    WHEN 'artist_performer' THEN 'Artist / Performer'
    WHEN 'speaker' THEN 'Speaker'
    WHEN 'exhibitor' THEN 'Exhibitor'
    WHEN 'event_partner' THEN 'Event Partner'
    WHEN 'ambassador' THEN 'Ambassador'
    WHEN 'sponsor' THEN 'Sponsor'
    WHEN 'volunteer' THEN 'Volunteer'
    WHEN 'contestant' THEN 'Contestant'
    WHEN 'other' THEN 'Other'
    ELSE app_type
  END;
END;
$$ LANGUAGE plpgsql;

-- 5. HELPER FUNCTION: Check if application type requires fee
CREATE OR REPLACE FUNCTION public.application_type_requires_fee(app_type TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  -- Paid participation types (vendors, artists, etc. pay to apply or have fees)
  RETURN app_type IN (
    'catering', 'mc', 'dj', 'photography', 'decor', 'artist_performer', 
    'exhibitor', 'sponsor', 'event_partner'
  );
END;
$$ LANGUAGE plpgsql;

-- 6. HELPER FUNCTION: Auto-create vendor/staff record on approval
CREATE OR REPLACE FUNCTION public.fulfill_application(application_id UUID, reviewer_id UUID, final_fee_kobo BIGINT DEFAULT NULL, notes TEXT DEFAULT NULL)
RETURNS TABLE (success BOOLEAN, message TEXT, vendor_id UUID, staff_id UUID) AS $$
DECLARE
  app_record RECORD;
  new_vendor_id UUID;
  new_staff_id UUID;
  app_type_category TEXT;
BEGIN
  -- Get the application
  SELECT * INTO app_record FROM public.event_applications WHERE id = application_id;
  
  IF NOT FOUND THEN
    RETURN QUERY SELECT FALSE, 'Application not found', NULL, NULL;
    RETURN;
  END IF;
  
  IF app_record.status != 'approved' THEN
    RETURN QUERY SELECT FALSE, 'Application must be approved first', NULL, NULL;
    RETURN;
  END IF;
  
  -- Determine if this maps to vendor or staff
  IF app_record.application_type IN (
    'catering', 'mc', 'dj', 'photography', 'ushers', 'security', 'decor',
    'artist_performer', 'speaker', 'exhibitor', 'event_partner', 'ambassador', 'sponsor'
  ) THEN
    -- Create event_vendors record
    INSERT INTO public.event_vendors (
      event_id, user_id, vendor_name, service_category, agreed_fee_kobo, contract_status, notes
    ) VALUES (
      app_record.event_id,
      app_record.applicant_id,
      app_record.applicant_name,
      app_record.application_type,
      COALESCE(final_fee_kobo, app_record.admin_fee_kobo, app_record.proposed_fee_kobo, 0),
      'accepted',
      COALESCE(notes, app_record.review_notes, 'Approved from application')
    ) RETURNING id INTO new_vendor_id;
    
    -- Update application with fulfillment
    UPDATE public.event_applications 
    SET fulfilled_vendor_id = new_vendor_id,
        admin_fee_kobo = COALESCE(final_fee_kobo, app_record.admin_fee_kobo, app_record.proposed_fee_kobo, 0),
        review_notes = COALESCE(notes, app_record.review_notes),
        reviewed_by = reviewer_id,
        reviewed_at = NOW(),
        updated_at = NOW()
    WHERE id = application_id;
    
    RETURN QUERY SELECT TRUE, 'Vendor record created', new_vendor_id, NULL;
    
  ELSIF app_record.application_type IN (
    'gate_scanner', 'usher', 'stage_manager', 'volunteer', 'contestant'
  ) THEN
    -- Create event_staff record
    INSERT INTO public.event_staff (
      event_id, user_id, role_title, assigned_by
    ) VALUES (
      app_record.event_id,
      app_record.applicant_id,
      app_record.application_type,
      reviewer_id
    ) RETURNING id INTO new_staff_id;
    
    -- Update application with fulfillment
    UPDATE public.event_applications 
    SET fulfilled_staff_id = new_staff_id,
        review_notes = COALESCE(notes, app_record.review_notes),
        reviewed_by = reviewer_id,
        reviewed_at = NOW(),
        updated_at = NOW()
    WHERE id = application_id;
    
    RETURN QUERY SELECT TRUE, 'Staff record created', NULL, new_staff_id;
    
  ELSE
    -- For ambassador, sponsor, other - just mark as fulfilled without vendor/staff record
    UPDATE public.event_applications 
    SET review_notes = COALESCE(notes, app_record.review_notes),
        reviewed_by = reviewer_id,
        reviewed_at = NOW(),
        updated_at = NOW()
    WHERE id = application_id;
    
    RETURN QUERY SELECT TRUE, 'Application approved (no vendor/staff record needed)', NULL, NULL;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. GRANT PERMISSIONS
GRANT SELECT, INSERT, UPDATE ON public.event_applications TO authenticated;
GRANT SELECT ON public.event_applications TO anon;
GRANT EXECUTE ON FUNCTION public.get_application_type_label TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.application_type_requires_fee TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.fulfill_application TO authenticated;