-- Function to set up user permissions without directly accessing auth.users table
CREATE OR REPLACE FUNCTION public.setup_user_permissions(user_id UUID, user_role TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Update the user_profiles table with the role
  -- This avoids direct access to auth.users table
  UPDATE public.user_profiles
  SET role = user_role
  WHERE user_id = setup_user_permissions.user_id;

  -- Grant default permissions based on role
  IF user_role = 'admin' THEN
    -- Insert admin permissions
    INSERT INTO public.user_permissions (user_id, permission_id)
    VALUES 
      (setup_user_permissions.user_id, 'view_guests'),
      (setup_user_permissions.user_id, 'edit_guests'),
      (setup_user_permissions.user_id, 'delete_guests'),
      (setup_user_permissions.user_id, 'view_rooms'),
      (setup_user_permissions.user_id, 'edit_rooms'),
      (setup_user_permissions.user_id, 'view_reservations'),
      (setup_user_permissions.user_id, 'edit_reservations'),
      (setup_user_permissions.user_id, 'view_reports'),
      (setup_user_permissions.user_id, 'manage_users');

  ELSIF user_role = 'manager' THEN
    -- Insert manager permissions
    INSERT INTO public.user_permissions (user_id, permission_id)
    VALUES 
      (setup_user_permissions.user_id, 'view_guests'),
      (setup_user_permissions.user_id, 'edit_guests'),
      (setup_user_permissions.user_id, 'view_rooms'),
      (setup_user_permissions.user_id, 'edit_rooms'),
      (setup_user_permissions.user_id, 'view_reservations'),
      (setup_user_permissions.user_id, 'edit_reservations'),
      (setup_user_permissions.user_id, 'view_reports');

  ELSIF user_role = 'staff' THEN
    -- Insert staff permissions
    INSERT INTO public.user_permissions (user_id, permission_id)
    VALUES 
      (setup_user_permissions.user_id, 'view_guests'),
      (setup_user_permissions.user_id, 'view_rooms'),
      (setup_user_permissions.user_id, 'view_reservations');
  END IF;

  RETURN TRUE;
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Error setting up permissions: %', SQLERRM;
    RETURN FALSE;
END;
$$;

-- Grant execute permissions on this function
GRANT EXECUTE ON FUNCTION public.setup_user_permissions(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.setup_user_permissions(UUID, TEXT) TO service_role;

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

-- Create RLS policy for access_requests table
CREATE POLICY access_requests_select_policy ON public.access_requests
  FOR SELECT USING (auth.jwt()->>'role' = 'admin' OR auth.jwt()->>'role' = 'manager');

CREATE POLICY access_requests_update_policy ON public.access_requests
  FOR UPDATE USING (auth.jwt()->>'role' = 'admin' OR auth.jwt()->>'role' = 'manager');

CREATE POLICY access_requests_insert_policy ON public.access_requests
  FOR INSERT WITH CHECK (true); -- Anyone can insert an access request

-- Comment explaining usage
COMMENT ON FUNCTION public.setup_user_permissions IS 
  'Function to set up user permissions without directly accessing auth.users table. 
   This is designed to be called when creating a new user account.'; 