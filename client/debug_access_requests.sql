-- Debugging script for access requests not appearing in admin panel

-- 1. Check if access_requests table exists and has records
SELECT EXISTS (
  SELECT FROM information_schema.tables 
  WHERE table_name = 'access_requests'
) AS access_requests_table_exists;

-- 2. Count all records in access_requests table
SELECT COUNT(*) AS total_access_requests FROM access_requests;

-- 3. Check status values in access_requests table
SELECT status, COUNT(*) FROM access_requests GROUP BY status;

-- 4. Check if request_date column exists
SELECT EXISTS (
  SELECT FROM information_schema.columns 
  WHERE table_name = 'access_requests' AND column_name = 'request_date'
) AS request_date_column_exists;

-- 5. Check if created_at column exists
SELECT EXISTS (
  SELECT FROM information_schema.columns 
  WHERE table_name = 'access_requests' AND column_name = 'created_at'
) AS created_at_column_exists;

-- 6. Check for null request_date values
SELECT COUNT(*) AS null_request_dates FROM access_requests WHERE request_date IS NULL;

-- 7. Update any null request_date values (safely)
DO $$
DECLARE
  created_at_exists BOOLEAN;
BEGIN
  -- Check if created_at column exists
  SELECT EXISTS (
    SELECT FROM information_schema.columns 
    WHERE table_name = 'access_requests' AND column_name = 'created_at'
  ) INTO created_at_exists;
  
  -- Update based on whether created_at exists
  IF created_at_exists THEN
    EXECUTE 'UPDATE access_requests SET request_date = created_at WHERE request_date IS NULL';
  ELSE
    EXECUTE 'UPDATE access_requests SET request_date = NOW() WHERE request_date IS NULL';
  END IF;
END $$;

-- 8. Check RLS policies for access_requests table
SELECT * FROM pg_policies WHERE tablename = 'access_requests';

-- 9. Check if current user has admin role
SELECT 
  auth.uid() AS current_user_id,
  (SELECT role FROM user_profiles WHERE user_id = auth.uid()) AS user_role,
  is_admin_by_role() AS is_admin_function_result;

-- 10. Fix any pending requests with incorrect status format
UPDATE access_requests SET status = 'pending' WHERE status = 'Pending' OR status = 'PENDING';

-- 11. Show all pending requests that should appear in the admin panel
SELECT * FROM access_requests WHERE status = 'pending' ORDER BY request_date DESC;

-- 12. Check if the admin can view all access requests policy is working
SELECT * FROM access_requests 
WHERE EXISTS (
  SELECT 1 FROM user_profiles up
  WHERE up.user_id = auth.uid() AND up.role = 'admin'
);

-- 13. Recreate the admin view policy with a simpler condition
DROP POLICY IF EXISTS "Admins can view all access requests" ON access_requests;
CREATE POLICY "Admins can view all access requests"
  ON access_requests FOR SELECT
  TO authenticated
  USING (
    (SELECT role FROM user_profiles WHERE user_id = auth.uid()) = 'admin'
  ); 