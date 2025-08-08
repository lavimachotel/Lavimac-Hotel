-- Drop all existing policies first to prevent conflicts
DROP POLICY IF EXISTS manager_read_profiles ON public.user_profiles;
DROP POLICY IF EXISTS admin_manage_profiles ON public.user_profiles;
DROP POLICY IF EXISTS read_own_profile ON public.user_profiles;
DROP POLICY IF EXISTS service_insert_profiles ON public.user_profiles;
DROP POLICY IF EXISTS initial_setup_policy ON public.user_profiles;
DROP POLICY IF EXISTS initial_insert_policy ON public.user_profiles;

-- Create a simple access policy that allows all authenticated users to select and insert
-- This is a temporary solution to get things working
CREATE POLICY "temp_all_access" ON public.user_profiles
  FOR ALL USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- Allow anonymous access for initial setup
CREATE POLICY "anon_select" ON public.user_profiles
  FOR SELECT USING (true);

CREATE POLICY "anon_insert" ON public.user_profiles
  FOR INSERT WITH CHECK (true);

-- For production, after you have at least one admin user set up, 
-- you should replace these policies with proper ones that check roles.
COMMENT ON TABLE public.user_profiles IS 'User profiles with temporary open access. Replace policies with more restrictive ones after setup.'; 