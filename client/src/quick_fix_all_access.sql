-- WARNING: TEMPORARY TESTING SCRIPT ONLY
-- This script opens up full access to the access_requests table
-- This should ONLY be used for debugging and testing, and should be reverted
-- after testing is complete.

-- First, check existing policies
SELECT * FROM pg_policies WHERE tablename = 'access_requests';

-- Drop all existing access request policies
DROP POLICY IF EXISTS "Anyone can submit an access request" ON access_requests;
DROP POLICY IF EXISTS "Managers and admins can view access requests" ON access_requests;
DROP POLICY IF EXISTS "Managers and admins can update access requests" ON access_requests;
DROP POLICY IF EXISTS "Admins can manage access requests" ON access_requests;
DROP POLICY IF EXISTS "Temporary: authenticated users can view all requests" ON access_requests;
DROP POLICY IF EXISTS "Allow all for testing" ON access_requests;

-- Make sure RLS is enabled
ALTER TABLE access_requests ENABLE ROW LEVEL SECURITY;

-- Create a single fully permissive policy for testing
CREATE POLICY "Allow all for testing" 
ON access_requests 
FOR ALL
TO anon, authenticated
USING (true)
WITH CHECK (true);

-- Verify the policy was created
SELECT * FROM pg_policies WHERE tablename = 'access_requests';

-- Check current data
SELECT id, full_name, email, status, request_date 
FROM access_requests 
ORDER BY request_date DESC;

-- IMPORTANT: TO REVERT THIS CHANGE
-- 1. Delete this over-permissive policy
-- 2. Run the proper fix_access_request_policies.sql script instead
-- DROP POLICY "Allow all for testing" ON access_requests; 