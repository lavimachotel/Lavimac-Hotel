-- Helper functions for diagnosing and fixing access request issues

-- Function to get policies for a table
CREATE OR REPLACE FUNCTION create_get_policies_function()
RETURNS void AS $$
BEGIN
  CREATE OR REPLACE FUNCTION get_policies_for_table(table_name text)
  RETURNS json AS $$
  DECLARE
    result json;
  BEGIN
    SELECT json_agg(row_to_json(p))
    INTO result
    FROM pg_policies p
    WHERE p.tablename = table_name;
    
    RETURN result;
  END;
  $$ LANGUAGE plpgsql SECURITY DEFINER;
END;
$$ LANGUAGE plpgsql;

-- Function to create all helper functions
CREATE OR REPLACE FUNCTION create_helper_functions()
RETURNS void AS $$
BEGIN
  -- Function to fix null request_dates
  CREATE OR REPLACE FUNCTION fix_request_dates()
  RETURNS void AS $$
  DECLARE
    column_exists BOOLEAN;
  BEGIN
    -- Add request_date column if it doesn't exist
    BEGIN
      ALTER TABLE access_requests ADD COLUMN request_date TIMESTAMP WITH TIME ZONE DEFAULT NOW();
    EXCEPTION
      WHEN duplicate_column THEN
        NULL; -- Column already exists, do nothing
    END;
    
    -- Check if created_at column exists
    SELECT EXISTS (
      SELECT FROM information_schema.columns 
      WHERE table_name = 'access_requests' AND column_name = 'created_at'
    ) INTO column_exists;
    
    -- Update null request_dates with created_at if it exists, otherwise use current timestamp
    IF column_exists THEN
      UPDATE access_requests SET request_date = created_at WHERE request_date IS NULL;
    ELSE
      UPDATE access_requests SET request_date = NOW() WHERE request_date IS NULL;
    END IF;
  END;
  $$ LANGUAGE plpgsql SECURITY DEFINER;
  
  -- Function to normalize status values
  CREATE OR REPLACE FUNCTION normalize_status_values()
  RETURNS void AS $$
  BEGIN
    -- Convert all variations of 'pending' to lowercase 'pending'
    UPDATE access_requests 
    SET status = 'pending' 
    WHERE status IN ('Pending', 'PENDING', 'pending ') OR status IS NULL;
    
    -- Convert all variations of 'approved' to lowercase 'approved'
    UPDATE access_requests 
    SET status = 'approved' 
    WHERE status IN ('Approved', 'APPROVED', 'approved ');
    
    -- Convert all variations of 'rejected' to lowercase 'rejected'
    UPDATE access_requests 
    SET status = 'rejected' 
    WHERE status IN ('Rejected', 'REJECTED', 'rejected ');
  END;
  $$ LANGUAGE plpgsql SECURITY DEFINER;
  
  -- Function to recreate access request policies
  CREATE OR REPLACE FUNCTION recreate_access_request_policies()
  RETURNS void AS $$
  BEGIN
    -- Drop existing policies
    DROP POLICY IF EXISTS "Admins can view all access requests" ON access_requests;
    DROP POLICY IF EXISTS "Admins can update access requests" ON access_requests;
    
    -- Create a simpler admin check function
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
  END;
  $$ LANGUAGE plpgsql SECURITY DEFINER;
END;
$$ LANGUAGE plpgsql; 