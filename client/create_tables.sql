-- Hotel Management System Database Setup Script
-- This script creates all the necessary tables and sets up Row Level Security (RLS) policies

-- NOTE: The JWT secret should be configured in the Supabase dashboard:
-- 1. Go to your Supabase project dashboard
-- 2. Navigate to Settings > API
-- 3. Under "JWT Settings", you can configure your JWT expiry time
-- 4. The JWT secret is automatically managed by Supabase

-- Create access_requests table
CREATE TABLE IF NOT EXISTS access_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  position TEXT NOT NULL,
  department TEXT NOT NULL,
  reason TEXT NOT NULL,
  contact_number TEXT,
  status TEXT DEFAULT 'pending',
  processed_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  request_date TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create permissions table
CREATE TABLE IF NOT EXISTS permissions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create user_profiles table
CREATE TABLE IF NOT EXISTS user_profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) NOT NULL UNIQUE,
  full_name TEXT NOT NULL,
  position TEXT,
  department TEXT,
  contact_number TEXT,
  role TEXT DEFAULT 'user',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create user_permissions table
CREATE TABLE IF NOT EXISTS user_permissions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  permission_id UUID REFERENCES permissions(id) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, permission_id)
);

-- Insert default permissions
INSERT INTO permissions (name, description) VALUES
  ('manage_users', 'Create, update, and delete user accounts'),
  ('manage_rooms', 'Create, update, and delete room information'),
  ('manage_reservations', 'Create, update, and delete reservations'),
  ('manage_guests', 'Create, update, and delete guest information'),
  ('manage_billing', 'Create, update, and delete billing information'),
  ('manage_services', 'Create, update, and delete hotel services'),
  ('manage_tasks', 'Create, update, and delete tasks'),
  ('view_reports', 'View hotel reports and analytics'),
  ('manage_settings', 'Update hotel settings')
ON CONFLICT (name) DO NOTHING;

-- Enable Row Level Security
ALTER TABLE access_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_permissions ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if needed (uncomment if you want to recreate policies)
DROP POLICY IF EXISTS "Anyone can create access requests" ON access_requests;
DROP POLICY IF EXISTS "Users can view their own access requests" ON access_requests;
DROP POLICY IF EXISTS "Admins can view all access requests" ON access_requests;
DROP POLICY IF EXISTS "Admins can update access requests" ON access_requests;

DROP POLICY IF EXISTS "Permissions are viewable by all authenticated users" ON permissions;
DROP POLICY IF EXISTS "Admins can insert permissions" ON permissions;
DROP POLICY IF EXISTS "Admins can update permissions" ON permissions;
DROP POLICY IF EXISTS "Admins can delete permissions" ON permissions;

DROP POLICY IF EXISTS "Users can view their own profile" ON user_profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON user_profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON user_profiles;
DROP POLICY IF EXISTS "Admins can insert profiles" ON user_profiles;
DROP POLICY IF EXISTS "Admins can delete profiles" ON user_profiles;

DROP POLICY IF EXISTS "Users can view their own permissions" ON user_permissions;
DROP POLICY IF EXISTS "Admins can view all permissions" ON user_permissions;
DROP POLICY IF EXISTS "Admins can insert user permissions" ON user_permissions;
DROP POLICY IF EXISTS "Admins can update user permissions" ON user_permissions;
DROP POLICY IF EXISTS "Admins can delete user permissions" ON user_permissions;

-- Create a function to check if a user is an admin without causing recursion
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

-- Create RLS policies for access_requests
CREATE POLICY "Anyone can create access requests"
  ON access_requests FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Users can view their own access requests"
  ON access_requests FOR SELECT
  TO authenticated
  USING (email = auth.jwt() ->> 'email');

CREATE POLICY "Admins can view all access requests"
  ON access_requests FOR SELECT
  TO authenticated
  USING (is_admin_by_role());

CREATE POLICY "Admins can update access requests"
  ON access_requests FOR UPDATE
  TO authenticated
  USING (is_admin_by_role())
  WITH CHECK (is_admin_by_role());

-- Create RLS policies for permissions
CREATE POLICY "Permissions are viewable by all authenticated users"
  ON permissions FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can insert permissions"
  ON permissions FOR INSERT
  TO authenticated
  WITH CHECK (is_admin_by_role());

CREATE POLICY "Admins can update permissions"
  ON permissions FOR UPDATE
  TO authenticated
  USING (is_admin_by_role())
  WITH CHECK (is_admin_by_role());

CREATE POLICY "Admins can delete permissions"
  ON permissions FOR DELETE
  TO authenticated
  USING (is_admin_by_role());

-- Create RLS policies for user_profiles
CREATE POLICY "Users can view their own profile"
  ON user_profiles FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Admins can view all profiles"
  ON user_profiles FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.user_id = auth.uid() AND up.role = 'admin'
    )
  );

CREATE POLICY "Users can update their own profile"
  ON user_profiles FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Admins can insert profiles"
  ON user_profiles FOR INSERT
  TO authenticated
  WITH CHECK (
    (
      EXISTS (
        SELECT 1 FROM user_profiles up
        WHERE up.user_id = auth.uid() AND up.role = 'admin'
      )
    )
    OR
    -- Allow users to create their own profile during signup
    user_id = auth.uid()
  );

CREATE POLICY "Admins can delete profiles"
  ON user_profiles FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.user_id = auth.uid() AND up.role = 'admin'
    )
  );

-- Create RLS policies for user_permissions
CREATE POLICY "Users can view their own permissions"
  ON user_permissions FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Admins can view all permissions"
  ON user_permissions FOR SELECT
  TO authenticated
  USING (is_admin_by_role());

CREATE POLICY "Admins can insert user permissions"
  ON user_permissions FOR INSERT
  TO authenticated
  WITH CHECK (is_admin_by_role());

CREATE POLICY "Admins can update user permissions"
  ON user_permissions FOR UPDATE
  TO authenticated
  USING (is_admin_by_role())
  WITH CHECK (is_admin_by_role());

CREATE POLICY "Admins can delete user permissions"
  ON user_permissions FOR DELETE
  TO authenticated
  USING (is_admin_by_role());

-- Create function to check if user is admin
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM user_profiles
    WHERE user_profiles.user_id = auth.uid()
    AND user_profiles.role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER; 