-- SQL Script to fix RLS policies for access_requests table
-- Run this in Supabase SQL Editor

-- First, check existing policies
SELECT * FROM pg_policies WHERE tablename = 'access_requests';

-- Drop existing problematic policies (if any exist)
DROP POLICY IF EXISTS "Anyone can submit an access request" ON access_requests;
DROP POLICY IF EXISTS "Managers and admins can view access requests" ON access_requests;
DROP POLICY IF EXISTS "Admins can manage access requests" ON access_requests;
DROP POLICY IF EXISTS "Allow all for authenticated users" ON access_requests;

-- Enable Row Level Security
ALTER TABLE access_requests ENABLE ROW LEVEL SECURITY;

-- Create policy for submitting access requests (anyone can submit)
CREATE POLICY "Anyone can submit an access request" 
ON access_requests 
FOR INSERT 
TO anon, authenticated  -- Allow both anonymous and authenticated users
WITH CHECK (true);  -- Allow all insert operations

-- Create policy for reading access requests (managers and admins only)
CREATE POLICY "Managers and admins can view access requests" 
ON access_requests 
FOR SELECT 
TO authenticated
USING (
  (auth.jwt() ->> 'role') IN ('manager', 'admin')
);

-- Create policy for updating access requests (managers and admins only)
CREATE POLICY "Managers and admins can update access requests" 
ON access_requests 
FOR UPDATE 
TO authenticated
USING (
  (auth.jwt() ->> 'role') IN ('manager', 'admin')
) 
WITH CHECK (
  (auth.jwt() ->> 'role') IN ('manager', 'admin')
);

-- For testing/debugging: allow all authenticated users to read access requests
-- Remove this policy once everything is working
CREATE POLICY "Temporary: authenticated users can view all requests" 
ON access_requests 
FOR SELECT 
TO authenticated
USING (true);

-- Verify the new policies
SELECT * FROM pg_policies WHERE tablename = 'access_requests';

-- Verify the existing data in the table
SELECT id, full_name, email, status, request_date FROM access_requests ORDER BY request_date DESC; 