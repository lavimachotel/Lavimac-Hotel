-- Supabase Functions for Diagnostic Tool
-- Copy these functions and execute them in your Supabase SQL Editor

-- A simple function to get the PostgreSQL server version
-- This is useful for connection testing
CREATE OR REPLACE FUNCTION public.get_server_version()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN current_setting('server_version');
END;
$$;

-- Function to list all tables in the public schema
CREATE OR REPLACE FUNCTION public.list_tables()
RETURNS SETOF text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT tablename::text
  FROM pg_tables
  WHERE schemaname = 'public';
END;
$$;

-- Function to check if RLS is enabled for a table
CREATE OR REPLACE FUNCTION public.check_rls_enabled(table_name text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  rls_enabled boolean;
BEGIN
  SELECT relrowsecurity INTO rls_enabled
  FROM pg_class
  WHERE oid = (table_name::regclass)::oid;
  
  RETURN rls_enabled;
END;
$$;

-- Function to list all policies for a table
CREATE OR REPLACE FUNCTION public.list_policies(table_name text)
RETURNS TABLE(policyname text, permissive boolean, cmd text, qual text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.policyname::text,
    p.permissive,
    p.cmd::text,
    pg_get_expr(p.qual, p.polrelid)::text
  FROM pg_policy p
  JOIN pg_class c ON p.polrelid = c.oid
  WHERE c.relname = table_name
  AND c.relnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public');
END;
$$;

-- Function to run SQL queries (admin use only)
-- CAUTION: This is powerful and should be restricted carefully
CREATE OR REPLACE FUNCTION public.run_sql_query(query text)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result JSONB;
BEGIN
  -- This function should have very restricted permissions
  -- Consider using specific, narrow functions instead of this general-purpose one
  
  -- Check if the query is trying to do something unsafe
  IF query ~* 'drop|truncate|delete|update|insert|grant|revoke|alter role|create role|drop role'
  THEN
    RAISE EXCEPTION 'Unsafe SQL operation attempted: %', query;
  END IF;
  
  -- Execute the query and capture results
  EXECUTE 'WITH result AS (' || query || ') SELECT jsonb_agg(row_to_json(result)) FROM result' INTO result;
  
  RETURN COALESCE(result, '[]'::jsonb);
END;
$$;

-- Function to create guests table with fields matching the schema used in GuestContext.js
CREATE OR REPLACE FUNCTION public.create_guests_table()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Create UUID extension if not exists
  CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
  
  -- Drop existing table if requested (CAUTION: this will delete all data)
  -- Uncomment the next line if you want to recreate the table from scratch
  -- DROP TABLE IF EXISTS public.guests;
  
  -- Create the guests table
  CREATE TABLE IF NOT EXISTS public.guests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT,
    email TEXT,
    phone TEXT,
    room TEXT,
    check_in TIMESTAMP WITH TIME ZONE,
    check_out TIMESTAMP WITH TIME ZONE,
    status TEXT DEFAULT 'Checked In',
    first_name TEXT,
    last_name TEXT,
    date_of_birth TEXT,
    gender TEXT,
    nationality TEXT,
    region TEXT,
    address TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
  );

  -- Enable row level security
  ALTER TABLE public.guests ENABLE ROW LEVEL SECURITY;

  -- Create policy for public access
  DROP POLICY IF EXISTS "Allow public access" ON public.guests;
  CREATE POLICY "Allow public access" ON public.guests
    FOR ALL USING (true);
    
  -- Create indexes for faster lookups
  CREATE INDEX IF NOT EXISTS guests_room_idx ON public.guests(room);
  CREATE INDEX IF NOT EXISTS guests_status_idx ON public.guests(status);
  CREATE INDEX IF NOT EXISTS guests_email_idx ON public.guests(email);
END;
$$;

-- Function to fix the guests table if it exists but has different columns
CREATE OR REPLACE FUNCTION public.fix_guests_table()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  col_exists boolean;
  result text := 'Fixes applied: ';
  fix_count int := 0;
BEGIN
  -- Check if the table exists
  IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'guests') THEN
    RETURN 'Guests table does not exist. Use create_guests_table() instead.';
  END IF;
  
  -- Check and add each column that might be missing
  SELECT EXISTS (
    SELECT FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'guests' 
    AND column_name = 'name'
  ) INTO col_exists;
  
  IF NOT col_exists THEN
    ALTER TABLE public.guests ADD COLUMN name TEXT;
    result := result || 'Added name column. ';
    fix_count := fix_count + 1;
  END IF;
  
  -- Check for room column
  SELECT EXISTS (
    SELECT FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'guests' 
    AND column_name = 'room'
  ) INTO col_exists;
  
  IF NOT col_exists THEN
    ALTER TABLE public.guests ADD COLUMN room TEXT;
    result := result || 'Added room column. ';
    fix_count := fix_count + 1;
  END IF;
  
  -- Check for check_in column
  SELECT EXISTS (
    SELECT FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'guests' 
    AND column_name = 'check_in'
  ) INTO col_exists;
  
  IF NOT col_exists THEN
    ALTER TABLE public.guests ADD COLUMN check_in TIMESTAMP WITH TIME ZONE;
    result := result || 'Added check_in column. ';
    fix_count := fix_count + 1;
  END IF;
  
  -- Check for check_out column
  SELECT EXISTS (
    SELECT FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'guests' 
    AND column_name = 'check_out'
  ) INTO col_exists;
  
  IF NOT col_exists THEN
    ALTER TABLE public.guests ADD COLUMN check_out TIMESTAMP WITH TIME ZONE;
    result := result || 'Added check_out column. ';
    fix_count := fix_count + 1;
  END IF;
  
  -- Ensure the proper indexes exist
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'guests_room_idx') THEN
    CREATE INDEX guests_room_idx ON public.guests(room);
    result := result || 'Created room index. ';
    fix_count := fix_count + 1;
  END IF;
  
  -- Ensure RLS is enabled
  IF NOT EXISTS (
    SELECT FROM pg_tables 
    WHERE schemaname = 'public' 
    AND tablename = 'guests' 
    AND rowsecurity = true
  ) THEN
    ALTER TABLE public.guests ENABLE ROW LEVEL SECURITY;
    result := result || 'Enabled RLS. ';
    fix_count := fix_count + 1;
  END IF;
  
  -- Ensure the public access policy exists
  IF NOT EXISTS (
    SELECT FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'guests' 
    AND policyname = 'Allow public access'
  ) THEN
    CREATE POLICY "Allow public access" ON public.guests
      FOR ALL USING (true);
    result := result || 'Created public access policy. ';
    fix_count := fix_count + 1;
  END IF;
  
  IF fix_count = 0 THEN
    RETURN 'No fixes needed - guests table appears to be set up correctly.';
  ELSE
    RETURN result;
  END IF;
END;
$$;

-- Simple function to execute a single SQL statement
-- This is a fallback for when more complex functions fail
CREATE OR REPLACE FUNCTION public.execute_sql(sql text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  EXECUTE sql;
END;
$$;

-- Grant permissions for the functions
GRANT EXECUTE ON FUNCTION public.list_tables() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.check_rls_enabled(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.list_policies(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_guests_table() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.fix_guests_table() TO anon, authenticated;

-- The run_sql_query function should be restricted to admin users only
-- However, for this diagnostic scenario, we're granting access to anonymous users
GRANT EXECUTE ON FUNCTION public.run_sql_query(text) TO anon, authenticated;

-- Grant execute permission to anonymous users for emergency diagnostics
GRANT EXECUTE ON FUNCTION public.execute_sql(text) TO anon, authenticated; 