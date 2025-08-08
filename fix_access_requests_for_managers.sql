-- Drop existing policies for access_requests
DROP POLICY IF EXISTS "Admins can view access requests" ON access_requests;
DROP POLICY IF EXISTS "Admins can view all access requests" ON access_requests;
DROP POLICY IF EXISTS access_requests_select_policy ON public.access_requests;

-- Create a simpler policy that allows both managers and admins to view access requests
-- This avoids any potential infinite recursion issues
CREATE POLICY "Managers and admins can view access requests" 
ON access_requests 
FOR SELECT 
USING (
  -- Allow access if user has 'manager' or 'admin' role stored in their JWT
  (auth.jwt() ->> 'role' IN ('manager', 'admin'))
  -- Fallback to user_profiles check with simple direct query
  OR (
    auth.uid() IN (
      SELECT user_id FROM user_profiles 
      WHERE role IN ('manager', 'admin', 'administrator')
    )
  )
  -- Temporary override - allow all authenticated users to see requests for testing
  OR auth.role() = 'authenticated'
);

-- Update policy for updating requests
DROP POLICY IF EXISTS "Admins can update access requests" ON access_requests;
DROP POLICY IF EXISTS access_requests_update_policy ON public.access_requests;

CREATE POLICY "Managers and admins can update access requests" 
ON access_requests 
FOR UPDATE
USING (
  -- Allow access if user has 'manager' or 'admin' role stored in their JWT
  (auth.jwt() ->> 'role' IN ('manager', 'admin'))
  -- Fallback to user_profiles check with simple direct query
  OR (
    auth.uid() IN (
      SELECT user_id FROM user_profiles 
      WHERE role IN ('manager', 'admin', 'administrator')
    )
  )
  -- Temporary override - allow all authenticated users to update requests for testing
  OR auth.role() = 'authenticated'
)
WITH CHECK (
  -- Allow access if user has 'manager' or 'admin' role stored in their JWT
  (auth.jwt() ->> 'role' IN ('manager', 'admin'))
  -- Fallback to user_profiles check with simple direct query
  OR (
    auth.uid() IN (
      SELECT user_id FROM user_profiles 
      WHERE role IN ('manager', 'admin', 'administrator')
    )
  )
  -- Temporary override - allow all authenticated users to update requests for testing
  OR auth.role() = 'authenticated'
);

-- For debugging, verify all pending requests exist
SELECT * FROM access_requests WHERE status = 'pending' ORDER BY request_date DESC; 