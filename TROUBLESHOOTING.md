# Troubleshooting Guide for Hotel Management System

This document provides solutions for common issues you might encounter while setting up and using the Hotel Management System.

## Table of Contents
1. [Database Connection Issues](#database-connection-issues)
2. [Authentication Problems](#authentication-problems)
3. [Access Request Issues](#access-request-issues)
4. [Row Level Security (RLS) Errors](#row-level-security-rls-errors)
5. [Environment Variable Problems](#environment-variable-problems)

## Database Connection Issues

### Invalid URL Error
**Error:** `Invalid URL: undefined`

**Solution:**
1. Check that your `.env` file exists in the `client` directory
2. Ensure it contains the correct Supabase URL and anon key:
   ```
   REACT_APP_SUPABASE_URL=https://your-project-id.supabase.co
   REACT_APP_SUPABASE_ANON_KEY=your-anon-key
   ```
3. Restart your development server

### Permission Denied Errors
**Error:** `Error: Permission denied for table access_requests`

**Solution:**
1. Check that Row Level Security (RLS) policies are correctly set up
2. Verify that your user has the appropriate role (admin)
3. Run the SQL script in `fix_access_requests_table.sql` to recreate policies

## Authentication Problems

### User Not Authenticated
**Error:** `User not authenticated` or `User session not found`

**Solution:**
1. Make sure you're logged in
2. Check if your session has expired (try logging out and back in)
3. Verify that your Supabase project has authentication enabled

## Access Request Issues

### Access Requests Not Appearing in Admin Panel
**Problem:** Submitted access requests don't appear in the admin access control panel

**Solution:**
1. Navigate to `/test-access-requests` in your application
2. Click "Run Tests" to diagnose the issue
3. Click "Create Helper Functions" to create necessary SQL functions
4. Click "Fix Common Issues" to apply fixes

### Column "created_at" Does Not Exist Error
**Error:** `ERROR: 42703: column "created_at" does not exist`

**Solution:**
1. Go to your Supabase dashboard
2. Navigate to the SQL Editor
3. Create a new query
4. Paste and run the contents of `fix_access_requests_table.sql`
   - This script will add both `created_at` and `request_date` columns if they don't exist
   - It will also normalize status values and recreate RLS policies

## Row Level Security (RLS) Errors

### Infinite Recursion Detected
**Error:** `ERROR: infinite recursion detected in policy for relation "user_profiles"`

**Solution:**
1. Go to your Supabase dashboard
2. Navigate to the SQL Editor
3. Create a new query
4. Run the following SQL:
   ```sql
   -- Create a non-recursive admin check function
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
   ```

## Environment Variable Problems

### Environment Variables Not Loading
**Problem:** Application can't access environment variables

**Solution:**
1. Make sure your `.env` file is in the correct location (root of the `client` directory)
2. Ensure environment variable names start with `REACT_APP_` (for React applications)
3. Restart your development server after making changes to the `.env` file
4. Check that you're not using quotes around values in your `.env` file 