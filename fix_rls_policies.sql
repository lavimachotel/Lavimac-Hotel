-- Drop existing policies on the access_requests table
DROP POLICY IF EXISTS "Anyone can insert access requests" ON access_requests;
DROP POLICY IF EXISTS "Admins can view access requests" ON access_requests;
DROP POLICY IF EXISTS "Admins can update access requests" ON access_requests;

-- Create correct policies for access_requests table
CREATE POLICY "Anyone can insert access requests" 
ON access_requests 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Admins can view access requests" 
ON access_requests 
FOR SELECT 
USING (auth.uid() IN (
  SELECT user_id FROM user_profiles WHERE role IN ('admin', 'administrator')
));

CREATE POLICY "Admins can update access requests" 
ON access_requests 
FOR UPDATE 
USING (auth.uid() IN (
  SELECT user_id FROM user_profiles WHERE role IN ('admin', 'administrator')
));

-- Drop existing policies on the user_profiles table
DROP POLICY IF EXISTS "Users can view their own profiles" ON user_profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON user_profiles;
DROP POLICY IF EXISTS "Admins can insert profiles" ON user_profiles;
DROP POLICY IF EXISTS "Users can update their own profiles" ON user_profiles;
DROP POLICY IF EXISTS "Admins can update any profile" ON user_profiles;

-- Create correct policies for user_profiles table
CREATE POLICY "Users can view their own profiles" 
ON user_profiles 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all profiles" 
ON user_profiles 
FOR SELECT 
USING (auth.uid() IN (
  SELECT user_id FROM user_profiles WHERE role IN ('admin', 'administrator')
));

CREATE POLICY "Admins can insert profiles" 
ON user_profiles 
FOR INSERT 
WITH CHECK (auth.uid() IN (
  SELECT user_id FROM user_profiles WHERE role IN ('admin', 'administrator')
));

CREATE POLICY "Users can update their own profiles" 
ON user_profiles 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Admins can update any profile" 
ON user_profiles 
FOR UPDATE 
USING (auth.uid() IN (
  SELECT user_id FROM user_profiles WHERE role IN ('admin', 'administrator')
));

-- Drop existing policies on the user_permissions table
DROP POLICY IF EXISTS "Users can view their own permissions" ON user_permissions;
DROP POLICY IF EXISTS "Admins can view all permissions" ON user_permissions;
DROP POLICY IF EXISTS "Admins can insert permissions" ON user_permissions;
DROP POLICY IF EXISTS "Admins can update permissions" ON user_permissions;

-- Create correct policies for user_permissions table
CREATE POLICY "Users can view their own permissions" 
ON user_permissions 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all permissions" 
ON user_permissions 
FOR SELECT 
USING (auth.uid() IN (
  SELECT user_id FROM user_profiles WHERE role IN ('admin', 'administrator')
));

CREATE POLICY "Admins can insert permissions" 
ON user_permissions 
FOR INSERT 
WITH CHECK (auth.uid() IN (
  SELECT user_id FROM user_profiles WHERE role IN ('admin', 'administrator')
));

CREATE POLICY "Admins can update permissions" 
ON user_permissions 
FOR UPDATE 
USING (auth.uid() IN (
  SELECT user_id FROM user_profiles WHERE role IN ('admin', 'administrator')
));

-- Special policy for initial access request
CREATE POLICY "Public can insert access requests" 
ON access_requests 
FOR INSERT 
WITH CHECK (true); 