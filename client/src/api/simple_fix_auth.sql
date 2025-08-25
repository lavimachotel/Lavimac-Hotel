-- SIMPLIFIED Script to fix Supabase Auth issues
-- Run this in the Supabase SQL Editor as an admin

-- Create a function to directly update auth.users passwords
CREATE OR REPLACE FUNCTION admin_reset_user_password(
  user_email TEXT,
  new_password TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  target_user_id UUID;
  password_hash TEXT;
BEGIN
  -- Find the user ID
  SELECT id INTO target_user_id 
  FROM auth.users 
  WHERE email = user_email;

  IF target_user_id IS NULL THEN
    RAISE EXCEPTION 'User with email % not found', user_email;
  END IF;
  
  -- Generate password hash using pgcrypto
  SELECT encode(digest(new_password || target_user_id::text, 'sha256'), 'hex') INTO password_hash;
  
  -- Update the user's password
  UPDATE auth.users
  SET 
    encrypted_password = password_hash,
    updated_at = now(),
    email_confirmed_at = now(), -- Force email confirmation
    confirmation_token = NULL,
    confirmation_sent_at = NULL,
    recovery_token = NULL
  WHERE id = target_user_id;
  
  -- Also update in staff_credentials table
  UPDATE staff_credentials
  SET password = new_password
  WHERE user_id = target_user_id;
  
  RETURN FOUND;
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Error: %', SQLERRM;
    RETURN FALSE;
END;
$$;

-- Function to confirm all users in auth.users
CREATE OR REPLACE FUNCTION confirm_all_users()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  count_updated INTEGER;
BEGIN
  UPDATE auth.users
  SET 
    email_confirmed_at = COALESCE(email_confirmed_at, now()),
    confirmation_token = NULL,
    confirmation_sent_at = NULL
  WHERE email_confirmed_at IS NULL;

  GET DIAGNOSTICS count_updated = ROW_COUNT;
  RETURN count_updated;
END;
$$;

-- Simplified view for debugging
CREATE OR REPLACE VIEW auth_debug AS
SELECT 
  u.id,
  u.email,
  u.confirmed_at,
  u.email_confirmed_at,
  u.last_sign_in_at,
  u.created_at,
  u.updated_at,
  sc.password as staff_password
FROM auth.users u
LEFT JOIN staff_credentials sc ON u.id = sc.user_id;

-- AUTO-CONFIRM new users (Optional - only do this if you want to skip email verification)
ALTER TABLE auth.users ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.auto_confirm_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE auth.users
  SET email_confirmed_at = now()
  WHERE id = NEW.id AND email_confirmed_at IS NULL;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS confirm_new_user ON auth.users;
CREATE TRIGGER confirm_new_user
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.auto_confirm_user();

-- Instructions:
-- 1. Run this entire script
-- 2. To confirm all existing users: SELECT confirm_all_users();
-- 3. To reset a user's password: SELECT admin_reset_user_password('user@example.com', 'newpassword123');
-- 4. To check status: SELECT * FROM auth_debug;

-- For immediate testing, run:
SELECT confirm_all_users() as users_confirmed; 