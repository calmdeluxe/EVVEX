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
  
  -- Application type follows the five event-specific participation categories.
  application_type TEXT NOT NULL CHECK (application_type IN (
    'catering', 'decor', 'photography_videography', 'sound_lighting', 'security', 'dj', 'mc',
    'gate_scanner', 'usher', 'stage_manager',
    'artist_performer', 'speaker',
    'contestant', 'volunteer', 'participant',
    'sponsor', 'event_partner', 'ambassador'
  )),
  
  -- Application details
  applicant_name TEXT NOT NULL,
  applicant_email TEXT NOT NULL,
  applicant_phone TEXT,
  bio TEXT, -- Why you want to participate, experience, portfolio
  portfolio_url TEXT, -- Link to work samples, social media, etc.
  proposed_fee_kobo BIGINT DEFAULT 0 CHECK (proposed_fee_kobo >= 0),
  requirements TEXT, -- Special requirements (equipment, space, etc.)
  safety_rules_accepted BOOLEAN NOT NULL DEFAULT FALSE,
  
  -- Application status workflow
  status TEXT DEFAULT 'pending' CHECK (status IN (
    'pending', 'under_review', 'approved', 'rejected', 'needs_revision', 'withdrawn'
  )),
  
  -- Admin/organizer review
  reviewed_by UUID REFERENCES auth.users(id),
  reviewed_at TIMESTAMPTZ,
  review_notes TEXT, -- Feedback for applicant
  admin_fee_kobo BIGINT DEFAULT 0 CHECK (admin_fee_kobo >= 0), -- Approved contract fee; never the processing fee
  
  -- Paystack payment reference (for application fee)
  paystack_reference TEXT,
  application_fee_paid BOOLEAN DEFAULT FALSE,
  application_fee_kobo BIGINT DEFAULT 500000 CHECK (application_fee_kobo >= 0),
  
  -- Outcome: if approved, creates record in event_vendors or event_staff
  fulfilled_vendor_id UUID REFERENCES public.event_vendors(id),
  fulfilled_staff_id UUID REFERENCES public.event_staff(id),
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- One application per user per event per type
  UNIQUE(event_id, applicant_id, application_type)
);

ALTER TABLE public.event_applications
  ADD COLUMN IF NOT EXISTS safety_rules_accepted BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE public.event_applications
  ALTER COLUMN application_fee_kobo SET DEFAULT 500000;

ALTER TABLE public.event_applications
  DROP CONSTRAINT IF EXISTS event_applications_application_type_check,
  ADD CONSTRAINT event_applications_application_type_check CHECK (application_type IN (
    'catering', 'decor', 'photography_videography', 'sound_lighting', 'security', 'dj', 'mc',
    'gate_scanner', 'usher', 'stage_manager',
    'artist_performer', 'speaker',
    'contestant', 'volunteer', 'participant',
    'sponsor', 'event_partner', 'ambassador'
  )),
  DROP CONSTRAINT IF EXISTS event_applications_status_check,
  ADD CONSTRAINT event_applications_status_check CHECK (status IN (
    'pending', 'under_review', 'approved', 'rejected', 'needs_revision', 'withdrawn'
  ));

CREATE UNIQUE INDEX IF NOT EXISTS idx_event_applications_paystack_reference
  ON public.event_applications(paystack_reference)
  WHERE paystack_reference IS NOT NULL;

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

-- Applications and payment fields are written only by authenticated server routes.
DROP POLICY IF EXISTS "Authenticated users create applications" ON public.event_applications;

-- Review updates are performed only by authenticated Admin/MPR server routes.
DROP POLICY IF EXISTS "Hosts and admins update applications" ON public.event_applications;

-- 4. HELPER FUNCTION: Get application type label
CREATE OR REPLACE FUNCTION public.get_application_type_label(app_type TEXT)
RETURNS TEXT AS $$
BEGIN
  RETURN CASE app_type
    WHEN 'catering' THEN 'Caterer'
    WHEN 'mc' THEN 'Host / MC'
    WHEN 'dj' THEN 'DJ'
    WHEN 'photography_videography' THEN 'Photography / Videography'
    WHEN 'sound_lighting' THEN 'Sound / Lighting'
    WHEN 'security' THEN 'Security'
    WHEN 'decor' THEN 'Decorator'
    WHEN 'gate_scanner' THEN 'Gate Scanner'
    WHEN 'usher' THEN 'Usher'
    WHEN 'stage_manager' THEN 'Stage Manager'
    WHEN 'artist_performer' THEN 'Artist / Performer'
    WHEN 'speaker' THEN 'Speaker'
    WHEN 'contestant' THEN 'Contestant'
    WHEN 'volunteer' THEN 'Volunteer'
    WHEN 'participant' THEN 'Participant'
    WHEN 'sponsor' THEN 'Sponsor'
    WHEN 'event_partner' THEN 'Event Partner'
    WHEN 'ambassador' THEN 'Ambassador'
    ELSE app_type
  END;
END;
$$ LANGUAGE plpgsql;

-- 5. HELPER FUNCTION: Check if application type requires fee
CREATE OR REPLACE FUNCTION public.application_type_requires_fee(app_type TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  -- A processing fee is separate from compensation proposed by the applicant.
  RETURN app_type IN (
    'catering', 'decor', 'photography_videography', 'sound_lighting', 'dj', 'mc',
    'artist_performer'
  );
END;
$$ LANGUAGE plpgsql;

-- 6. FULFILL ONLY SERVICE PROVIDER AND EVENT OPERATIONS APPLICATIONS
CREATE OR REPLACE FUNCTION public.fulfill_application(application_id UUID, reviewer_id UUID, final_fee_kobo BIGINT DEFAULT NULL, notes TEXT DEFAULT NULL)
RETURNS TABLE (success BOOLEAN, message TEXT, vendor_id UUID, staff_id UUID) AS $$
DECLARE
  app_record RECORD;
  new_vendor_id UUID;
  new_staff_id UUID;
  approved_fee_kobo BIGINT;
BEGIN
  SELECT * INTO app_record
  FROM public.event_applications
  WHERE id = application_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN QUERY SELECT FALSE, 'Application not found', NULL, NULL;
    RETURN;
  END IF;

  IF reviewer_id IS NULL OR NOT EXISTS (
    SELECT 1
    FROM public.users reviewer
    WHERE reviewer.id = fulfill_application.reviewer_id
      AND (
        reviewer.is_admin = TRUE
        OR reviewer.app_role IN ('admin', 'mpr')
        OR reviewer.account_tier IN ('admin', 'mpr', 'marketing_partner')
      )
  ) THEN
    RETURN QUERY SELECT FALSE, 'Reviewer is not authorized', NULL, NULL;
    RETURN;
  END IF;

  IF app_record.status != 'approved' THEN
    RETURN QUERY SELECT FALSE, 'Application must be approved first', NULL, NULL;
    RETURN;
  END IF;

  IF app_record.application_fee_kobo > 0 AND app_record.application_fee_paid IS NOT TRUE THEN
    RETURN QUERY SELECT FALSE, 'Application processing fee is unpaid', NULL, NULL;
    RETURN;
  END IF;

  IF app_record.application_type IN (
    'catering', 'decor', 'photography_videography', 'sound_lighting', 'security', 'dj', 'mc'
  ) THEN
    IF app_record.fulfilled_vendor_id IS NOT NULL THEN
      RETURN QUERY SELECT TRUE, 'Vendor record already exists', app_record.fulfilled_vendor_id, NULL;
      RETURN;
    END IF;

    approved_fee_kobo := COALESCE(final_fee_kobo, app_record.admin_fee_kobo, 0);
    IF approved_fee_kobo < 0 THEN
      RETURN QUERY SELECT FALSE, 'Approved contract fee cannot be negative', NULL, NULL;
      RETURN;
    END IF;

    INSERT INTO public.event_vendors (
      event_id, user_id, vendor_name, service_category, agreed_fee_kobo, contract_status, notes
    ) VALUES (
      app_record.event_id,
      app_record.applicant_id,
      app_record.applicant_name,
      app_record.application_type,
      approved_fee_kobo,
      'accepted',
      COALESCE(notes, app_record.review_notes, 'Approved from application')
    ) RETURNING id INTO new_vendor_id;

    UPDATE public.event_applications
    SET fulfilled_vendor_id = new_vendor_id,
        admin_fee_kobo = approved_fee_kobo,
        review_notes = COALESCE(notes, app_record.review_notes),
        reviewed_by = reviewer_id,
        reviewed_at = NOW(),
        updated_at = NOW()
    WHERE id = application_id;

    RETURN QUERY SELECT TRUE, 'Vendor record created', new_vendor_id, NULL;

  ELSIF app_record.application_type IN ('gate_scanner', 'usher', 'stage_manager') THEN
    INSERT INTO public.event_staff (
      event_id, user_id, role_title, assigned_by
    ) VALUES (
      app_record.event_id,
      app_record.applicant_id,
      app_record.application_type,
      reviewer_id
    )
    ON CONFLICT (event_id, user_id) DO UPDATE
      SET role_title = EXCLUDED.role_title,
          assigned_by = EXCLUDED.assigned_by
    RETURNING id INTO new_staff_id;

    UPDATE public.event_applications
    SET fulfilled_staff_id = new_staff_id,
        review_notes = COALESCE(notes, app_record.review_notes),
        reviewed_by = reviewer_id,
        reviewed_at = NOW(),
        updated_at = NOW()
    WHERE id = application_id;

    RETURN QUERY SELECT TRUE, 'Staff record created', NULL, new_staff_id;

  ELSE
    UPDATE public.event_applications
    SET review_notes = COALESCE(notes, app_record.review_notes),
        reviewed_by = reviewer_id,
        reviewed_at = NOW(),
        updated_at = NOW()
    WHERE id = application_id;

    RETURN QUERY SELECT TRUE, 'Application remains the source of truth', NULL, NULL;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

-- 7. GRANT PERMISSIONS
REVOKE INSERT, UPDATE, DELETE ON public.event_applications FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.event_applications TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.event_applications TO service_role;
GRANT EXECUTE ON FUNCTION public.get_application_type_label TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.application_type_requires_fee TO authenticated, anon;
REVOKE ALL ON FUNCTION public.fulfill_application(UUID, UUID, BIGINT, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.fulfill_application(UUID, UUID, BIGINT, TEXT) TO service_role;