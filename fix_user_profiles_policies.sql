-- Drop the problematic policies that cause infinite recursion
DROP POLICY IF EXISTS manager_read_profiles ON public.user_profiles;
DROP POLICY IF EXISTS admin_manage_profiles ON public.user_profiles;

-- Create new policies that avoid recursion by using JWT claims instead
-- Allow managers to read profiles based on JWT claims
CREATE POLICY manager_read_profiles ON public.user_profiles
  FOR SELECT USING (
    auth.jwt() ->> 'role' IN ('manager', 'admin')
  );

-- Allow admins to manage all profiles based on JWT claims
CREATE POLICY admin_manage_profiles ON public.user_profiles
  FOR ALL USING (
    auth.jwt() ->> 'role' = 'admin'
  );

-- Create a simple policy for initial setup
-- This policy allows anyone to select any row, useful for initial setup when no users exist yet
-- You can comment this out or remove it after initial setup
CREATE POLICY initial_setup_policy ON public.user_profiles
  FOR SELECT USING (true);

-- Make sure initial insertion works
CREATE POLICY initial_insert_policy ON public.user_profiles
  FOR INSERT WITH CHECK (true);

-- Ensure the JWT token contains the role claim
COMMENT ON TABLE public.user_profiles IS 'User profiles with role-based access control.
Make sure your JWT token includes a custom claim for "role" by setting it during sign-up/login.'; 