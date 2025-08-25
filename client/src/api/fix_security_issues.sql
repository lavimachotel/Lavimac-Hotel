-- Fix Security Issues in Database Views
-- This script addresses two main security concerns:
-- 1. Removing views that expose auth.users table to anon/authenticated roles
-- 2. Replacing SECURITY DEFINER views with safer alternatives

-- 1. Drop the problematic debug views that expose auth.users data
DROP VIEW IF EXISTS public.staff_credentials_debug;
DROP VIEW IF EXISTS public.auth_debug;

-- 2. Create safer alternatives with restricted access
-- Create a safer version of staff_credentials_debug that doesn't expose auth.users
CREATE OR REPLACE VIEW public.staff_credentials_safe AS
SELECT 
  sc.id, 
  sc.user_id, 
  sc.email,
  sc.created_at,
  up.full_name,
  up.role
FROM staff_credentials sc
LEFT JOIN user_profiles up ON sc.user_id = up.user_id;

-- Restrict access to the new view to authenticated users only
GRANT SELECT ON public.staff_credentials_safe TO authenticated;
REVOKE SELECT ON public.staff_credentials_safe FROM anon;

-- 3. Fix SECURITY DEFINER views
-- Drop the SECURITY DEFINER views
DROP VIEW IF EXISTS public.staff_trainings_view;
DROP VIEW IF EXISTS public.time_entries_view;
DROP VIEW IF EXISTS public.performance_metrics_view;

-- Create safer alternatives using SECURITY INVOKER (default)
-- Example for time_entries_view (adjust the actual query based on your schema)
CREATE OR REPLACE VIEW public.time_entries_view AS
SELECT 
  te.id,
  te.staff_id,
  te.entry_date,
  te.entry_time,
  te.entry_type,
  te.notes
FROM time_entries te
WHERE 
  -- Add appropriate row-level security here
  (auth.uid() = te.staff_id) OR 
  (EXISTS (
    SELECT 1 FROM user_profiles up 
    WHERE up.user_id = auth.uid() AND up.role IN ('admin', 'manager')
  ));

-- Grant appropriate access to the new views
GRANT SELECT ON public.time_entries_view TO authenticated;
REVOKE SELECT ON public.time_entries_view FROM anon;

-- Add appropriate RLS policies to base tables if not already present
ALTER TABLE time_entries ENABLE ROW LEVEL SECURITY;

-- Example RLS policy for time_entries:
CREATE POLICY time_entries_select_policy 
  ON time_entries
  FOR SELECT 
  TO authenticated
  USING (
    -- Staff can see their own entries
    auth.uid() = staff_id OR
    -- Managers and admins can see all entries
    EXISTS (
      SELECT 1 FROM user_profiles up 
      WHERE up.user_id = auth.uid() AND up.role IN ('admin', 'manager')
    )
  );

-- IMPORTANT: Review these changes carefully before applying them to production!
-- This script is based on linter errors and may need adaptation to your specific schema. 