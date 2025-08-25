-- Script to create a table for storing staff login credentials
-- Run this in Supabase SQL Editor

-- Create table for storing staff credentials
CREATE TABLE IF NOT EXISTS staff_credentials (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  password TEXT NOT NULL, -- Store a note that this is a temporary password
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  is_used BOOLEAN DEFAULT false,
  UNIQUE(user_id)
);

-- Enable Row Level Security
ALTER TABLE staff_credentials ENABLE ROW LEVEL SECURITY;

-- Drop any existing policies
DROP POLICY IF EXISTS "Users can view only their own credentials" ON staff_credentials;
DROP POLICY IF EXISTS "Admins can manage all credentials" ON staff_credentials;

-- Create policy for staff to view only their own credentials
CREATE POLICY "Users can view only their own credentials"
ON staff_credentials
FOR SELECT
TO authenticated
USING (
  user_id = auth.uid()
);

-- Create policy for admins to manage all credentials
CREATE POLICY "Admins can manage all credentials"
ON staff_credentials
FOR ALL
TO authenticated
USING (
  (auth.jwt() ->> 'role') = 'admin'
)
WITH CHECK (
  (auth.jwt() ->> 'role') = 'admin'
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS staff_credentials_user_id_idx ON staff_credentials(user_id);

-- Create function to store credentials securely during account creation
CREATE OR REPLACE FUNCTION store_staff_credentials(
  p_user_id UUID,
  p_email TEXT,
  p_password TEXT
) RETURNS BOOLEAN AS $$
BEGIN
  -- Delete any existing credentials for this user
  DELETE FROM staff_credentials WHERE user_id = p_user_id;
  
  -- Insert new credentials
  INSERT INTO staff_credentials (user_id, email, password)
  VALUES (p_user_id, p_email, p_password);
  
  RETURN TRUE;
EXCEPTION
  WHEN OTHERS THEN
    RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER; 