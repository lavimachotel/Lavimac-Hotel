-- Drop all existing policies for access_requests first
DROP POLICY IF EXISTS "Admins can view access requests" ON access_requests;
DROP POLICY IF EXISTS "Admins can view all access requests" ON access_requests;
DROP POLICY IF EXISTS "Managers and admins can view access requests" ON access_requests;
DROP POLICY IF EXISTS "Managers and admins can update access requests" ON access_requests;
DROP POLICY IF EXISTS "Public can insert access requests" ON access_requests;
DROP POLICY IF EXISTS access_requests_select_policy ON public.access_requests;
DROP POLICY IF EXISTS access_requests_update_policy ON public.access_requests;
DROP POLICY IF EXISTS access_requests_insert_policy ON public.access_requests;

-- Create a simple policy for testing that allows ALL authenticated users to view ALL access requests
CREATE POLICY "Temporary allow all view access" ON access_requests
  FOR SELECT USING (auth.role() = 'authenticated');

-- Create a simple policy for testing that allows ALL authenticated users to update access requests
CREATE POLICY "Temporary allow all update access" ON access_requests
  FOR UPDATE USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- Ensure anyone can submit access requests
CREATE POLICY "Anyone can submit access requests" ON access_requests
  FOR INSERT WITH CHECK (true);

-- Make sure row level security is enabled
ALTER TABLE access_requests ENABLE ROW LEVEL SECURITY;

-- For testing, check what requests exist
SELECT * FROM access_requests;

-- For debugging, check all policies on the access_requests table
SELECT * FROM pg_policies WHERE tablename = 'access_requests'; 