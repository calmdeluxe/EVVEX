-- ==============================================================================
-- CALMREADER MPR AUDIT TRAIL & ANALYTICS MIGRATION
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.mpr_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mpr_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  admin_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  action_type TEXT NOT NULL, -- 'created_trivia', 'edited_trivia', 'submitted_trivia', 'recruited_author', 'recruited_user', 'shared_link', 'requested_payout', 'approved_trivia', 'rejected_trivia', 'admin_updated_mpr'
  target_type TEXT NOT NULL, -- 'trivia', 'profile', 'withdrawal', 'referral', 'campaign'
  target_id TEXT NOT NULL,
  details JSONB DEFAULT '{}'::jsonb,
  ip_address TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Performance indices
CREATE INDEX IF NOT EXISTS idx_mpr_audit_log_mpr_id ON public.mpr_audit_log(mpr_id);
CREATE INDEX IF NOT EXISTS idx_mpr_audit_log_admin_id ON public.mpr_audit_log(admin_id);
CREATE INDEX IF NOT EXISTS idx_mpr_audit_log_action_type ON public.mpr_audit_log(action_type);
CREATE INDEX IF NOT EXISTS idx_mpr_audit_log_target_type ON public.mpr_audit_log(target_type);
CREATE INDEX IF NOT EXISTS idx_mpr_audit_log_created_at ON public.mpr_audit_log(created_at DESC);

-- Enable RLS
ALTER TABLE public.mpr_audit_log ENABLE ROW LEVEL SECURITY;

-- Admins and Service Role can manage all
DROP POLICY IF EXISTS "Admins and service manage mpr_audit_log" ON public.mpr_audit_log;
CREATE POLICY "Admins and service manage mpr_audit_log" ON public.mpr_audit_log FOR ALL USING (true);

-- MPR can only view their own logs
DROP POLICY IF EXISTS "MPRs view own audit log" ON public.mpr_audit_log;
CREATE POLICY "MPRs view own audit log" ON public.mpr_audit_log FOR SELECT USING (
  auth.uid() = mpr_id
);
