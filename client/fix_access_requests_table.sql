-- Script to analyze and fix the access_requests table structure

-- 1. Check the current structure of the access_requests table
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'access_requests'
ORDER BY ordinal_position;

-- 2. Check if the table has any records
SELECT COUNT(*) AS total_records FROM access_requests;

-- 3. Add request_date column if it doesn't exist
DO $$
BEGIN
  BEGIN
    ALTER TABLE access_requests ADD COLUMN request_date TIMESTAMP WITH TIME ZONE DEFAULT NOW();
    RAISE NOTICE 'Added request_date column';
  EXCEPTION
    WHEN duplicate_column THEN
      RAISE NOTICE 'request_date column already exists';
  END;
END $$;

-- 4. Add created_at column if it doesn't exist
DO $$
BEGIN
  BEGIN
    ALTER TABLE access_requests ADD COLUMN created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
    RAISE NOTICE 'Added created_at column';
  EXCEPTION
    WHEN duplicate_column THEN
      RAISE NOTICE 'created_at column already exists';
  END;
END $$;

-- 5. Update any null request_date values with NOW()
UPDATE access_requests SET request_date = NOW() WHERE request_date IS NULL;

-- 6. Update any null created_at values with NOW()
UPDATE access_requests SET created_at = NOW() WHERE created_at IS NULL;

-- 7. Normalize status values
UPDATE access_requests 
SET status = 'pending' 
WHERE status IN ('Pending', 'PENDING', 'pending ') OR status IS NULL;

UPDATE access_requests 
SET status = 'approved' 
WHERE status IN ('Approved', 'APPROVED', 'approved ');

UPDATE access_requests 
SET status = 'rejected' 
WHERE status IN ('Rejected', 'REJECTED', 'rejected ');

-- 8. Check the updated structure
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'access_requests'
ORDER BY ordinal_position;

-- 9. Show a sample of the data
SELECT * FROM access_requests LIMIT 5;

-- 10. Recreate RLS policies for access_requests
-- First, create a simple admin check function if it doesn't exist
CREATE OR REPLACE FUNCTION is_admin_simple()
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

-- Drop existing policies
DROP POLICY IF EXISTS "Admins can view all access requests" ON access_requests;
DROP POLICY IF EXISTS "Admins can update access requests" ON access_requests;

-- Create new policies with simpler conditions
CREATE POLICY "Admins can view all access requests"
  ON access_requests FOR SELECT
  TO authenticated
  USING (is_admin_simple());

CREATE POLICY "Admins can update access requests"
  ON access_requests FOR UPDATE
  TO authenticated
  USING (is_admin_simple())
  WITH CHECK (is_admin_simple());

-- 11. Enable RLS on the table if not already enabled
ALTER TABLE access_requests ENABLE ROW LEVEL SECURITY;

-- 12. Show all pending requests that should appear in the admin panel
SELECT * FROM access_requests WHERE status = 'pending' ORDER BY request_date DESC; 