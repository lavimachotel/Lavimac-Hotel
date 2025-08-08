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

  -- For now, we'll just make sure the role is set correctly
  -- Later we can add more sophisticated permission assignment

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

-- Comment explaining usage
COMMENT ON FUNCTION public.setup_user_permissions IS 
  'Function to set up user permissions without directly accessing auth.users table. 
   This is designed to be called when creating a new user account.'; 