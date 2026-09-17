export const RECURSION_FIX_SQL = `-- RECURSION FIX FOR ROW-LEVEL SECURITY
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid() AND (is_admin = TRUE OR account_tier = 'admin')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.is_admin() TO public, anon, authenticated, service_role;
`;

export const FULL_SUPABASE_SQL = `-- EVENT PLATFORM DATABASE INITIALIZATION
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS app_role TEXT DEFAULT 'guest';
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT FALSE;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS account_tier TEXT DEFAULT 'free';
`;
