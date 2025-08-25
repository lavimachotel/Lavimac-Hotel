-- Fix for access_requests table
-- This script adds the request_date column if it doesn't exist

-- Check if request_date column exists and add it if it doesn't
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'access_requests'
        AND column_name = 'request_date'
    ) THEN
        ALTER TABLE access_requests ADD COLUMN request_date TIMESTAMP WITH TIME ZONE DEFAULT NOW();
        
        -- Update existing records to have a request_date
        UPDATE access_requests SET request_date = created_at WHERE request_date IS NULL;
    END IF;
END
$$;

-- Fix for infinite recursion in policies
-- Drop and recreate the function to check admin status
CREATE OR REPLACE FUNCTION is_admin_by_role()
RETURNS BOOLEAN AS $$
DECLARE
  user_role TEXT;
BEGIN
  SELECT role INTO user_role FROM user_profiles
  WHERE user_id = auth.uid()
  LIMIT 1;
  
  RETURN user_role = 'admin';
EXCEPTION
  WHEN OTHERS THEN
    RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop and recreate policies for access_requests
DROP POLICY IF EXISTS "Admins can view all access requests" ON access_requests;
CREATE POLICY "Admins can view all access requests"
  ON access_requests FOR SELECT
  TO authenticated
  USING (is_admin_by_role());

DROP POLICY IF EXISTS "Admins can update access requests" ON access_requests;
CREATE POLICY "Admins can update access requests"
  ON access_requests FOR UPDATE
  TO authenticated
  USING (is_admin_by_role())
  WITH CHECK (is_admin_by_role());

-- Drop and recreate policies for permissions
DROP POLICY IF EXISTS "Admins can insert permissions" ON permissions;
CREATE POLICY "Admins can insert permissions"
  ON permissions FOR INSERT
  TO authenticated
  WITH CHECK (is_admin_by_role());

DROP POLICY IF EXISTS "Admins can update permissions" ON permissions;
CREATE POLICY "Admins can update permissions"
  ON permissions FOR UPDATE
  TO authenticated
  USING (is_admin_by_role())
  WITH CHECK (is_admin_by_role());

DROP POLICY IF EXISTS "Admins can delete permissions" ON permissions;
CREATE POLICY "Admins can delete permissions"
  ON permissions FOR DELETE
  TO authenticated
  USING (is_admin_by_role());

-- Drop and recreate policies for user_permissions
DROP POLICY IF EXISTS "Admins can view all permissions" ON user_permissions;
CREATE POLICY "Admins can view all permissions"
  ON user_permissions FOR SELECT
  TO authenticated
  USING (is_admin_by_role());

DROP POLICY IF EXISTS "Admins can insert user permissions" ON user_permissions;
CREATE POLICY "Admins can insert user permissions"
  ON user_permissions FOR INSERT
  TO authenticated
  WITH CHECK (is_admin_by_role());

DROP POLICY IF EXISTS "Admins can update user permissions" ON user_permissions;
CREATE POLICY "Admins can update user permissions"
  ON user_permissions FOR UPDATE
  TO authenticated
  USING (is_admin_by_role())
  WITH CHECK (is_admin_by_role());

DROP POLICY IF EXISTS "Admins can delete user permissions" ON user_permissions;
CREATE POLICY "Admins can delete user permissions"
  ON user_permissions FOR DELETE
  TO authenticated
  USING (is_admin_by_role()); 