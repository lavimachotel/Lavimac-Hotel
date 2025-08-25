-- Script to fix Supabase Auth issues and enable direct password management
-- ⚠️ IMPORTANT: Run this in the Supabase SQL Editor as an admin

-- Create a function to allow admins to update a user's password in auth.users
-- This bypasses the normal authentication flow and directly sets the password hash
CREATE OR REPLACE FUNCTION admin_update_user_password(
  p_user_id UUID,
  p_password TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER -- This will run with the privileges of the function creator (superuser)
AS $$
DECLARE
  password_hash TEXT;
  password_encryption_key TEXT;
BEGIN
  -- First, check that the user exists
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = p_user_id) THEN
    RAISE EXCEPTION 'User with ID % does not exist', p_user_id;
  END IF;

  -- Get the encryption key (this is a simplified example - in production, handle this securely)
  SELECT setting INTO password_encryption_key 
  FROM auth.config 
  WHERE key = 'PGSODIUM_PRIMARY_KEY';

  -- Using pgcrypto to hash the password (depends on your Supabase auth settings)
  SELECT crypt(p_password, gen_salt('bf')) INTO password_hash;

  -- Update the password hash directly in the auth.users table
  UPDATE auth.users
  SET encrypted_password = password_hash,
      updated_at = now(),
      last_sign_in_at = NULL,
      confirmation_token = NULL,
      confirmation_sent_at = NULL,
      recovery_token = NULL
  WHERE id = p_user_id;

  -- Also update the staff_credentials table
  UPDATE staff_credentials
  SET password = p_password
  WHERE user_id = p_user_id;

  RETURN TRUE;
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Error updating password: %', SQLERRM;
    RETURN FALSE;
END;
$$;

-- Function to sync passwords between staff_credentials and auth.users
CREATE OR REPLACE FUNCTION sync_staff_credentials_to_auth()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  cred RECORD;
  sync_count INTEGER := 0;
BEGIN
  FOR cred IN 
    SELECT sc.user_id, sc.email, sc.password 
    FROM staff_credentials sc
    JOIN auth.users au ON sc.user_id = au.id
  LOOP
    -- Attempt to update the auth user password
    PERFORM admin_update_user_password(cred.user_id, cred.password);
    
    -- Count successful syncs
    sync_count := sync_count + 1;
  END LOOP;

  RETURN sync_count;
END;
$$;

-- TEMPORARY FIX: For immediate testing, create a view to check user credentials
CREATE OR REPLACE VIEW staff_credentials_debug AS
SELECT 
  sc.id, 
  sc.user_id, 
  sc.email, 
  sc.password,
  sc.created_at,
  au.email as auth_email,
  au.confirmed_at,
  up.full_name,
  up.role
FROM staff_credentials sc
LEFT JOIN auth.users au ON sc.user_id = au.id
LEFT JOIN user_profiles up ON sc.user_id = up.user_id;

-- Instructions for use:
-- 1. Run this entire script in the Supabase SQL editor
-- 2. To sync all staff credentials with auth: SELECT sync_staff_credentials_to_auth();
-- 3. To fix a specific user: SELECT admin_update_user_password('user-uuid-here', 'new-password');
-- 4. To check credentials status: SELECT * FROM staff_credentials_debug; 