# Supabase Connection Troubleshooting Guide

If you're experiencing connection issues with Supabase in your Hotel Management System, follow these steps to diagnose and fix the problems.

## Common Errors

### "Cannot read properties of undefined (reading 'startsWith')"

This error occurs when the environment variables for Supabase URL and anon key are not being loaded correctly. To fix this:

1. Make sure your `.env` file is in the correct location (in the `client` directory)
2. Create a `.env.local` file (which has higher priority) with the same variables
3. Make sure the variable names are exactly `REACT_APP_SUPABASE_URL` and `REACT_APP_SUPABASE_ANON_KEY`
4. Restart your development server after making changes to environment variables
5. If using Create React App, remember that environment variables must start with `REACT_APP_`

Example `.env.local` file:
```
REACT_APP_SUPABASE_URL=https://your-project-id.supabase.co
REACT_APP_SUPABASE_ANON_KEY=your-anon-key
```

### "Failed to load resource: net::ERR_NAME_NOT_RESOLVED"

This error occurs when your application is trying to connect to a domain that doesn't exist, typically because you're using placeholder values instead of your actual Supabase URL.

### "Failed to fetch" or "AuthRetryableFetchError: Failed to fetch"

These errors indicate that your application couldn't establish a connection to the Supabase API, often due to incorrect credentials or network issues.

### "ERROR: 42501: permission denied to set parameter "app.jwt_secret""

This error occurs when running the SQL script to create tables. It happens because the default Supabase user doesn't have superuser privileges to set database parameters. To fix this:

1. Remove or comment out the line `ALTER DATABASE postgres SET "app.jwt_secret" TO 'your-jwt-secret';` from your SQL script
2. Configure JWT settings through the Supabase dashboard instead:
   - Go to your Supabase dashboard
   - Navigate to Settings > API
   - Under "JWT Settings", you can configure your JWT expiry time
   - The JWT secret is automatically managed by Supabase

### "ERROR: 42601: only WITH CHECK expression allowed for INSERT"

This error occurs when creating Row Level Security (RLS) policies for INSERT operations. For INSERT policies, Supabase only allows the WITH CHECK clause, not the USING clause. To fix this:

1. For any policy that applies to INSERT operations, remove the USING clause and only keep the WITH CHECK clause:
   ```sql
   -- Incorrect:
   CREATE POLICY "Policy name" ON table_name FOR INSERT TO role USING (condition) WITH CHECK (condition);
   
   -- Correct:
   CREATE POLICY "Policy name" ON table_name FOR INSERT TO role WITH CHECK (condition);
   ```

2. If you're using a policy for ALL operations, split it into separate policies for each operation type:
   ```sql
   -- Instead of:
   CREATE POLICY "Policy name" ON table_name FOR ALL TO role USING (condition) WITH CHECK (condition);
   
   -- Use:
   CREATE POLICY "Policy name for select" ON table_name FOR SELECT TO role USING (condition);
   CREATE POLICY "Policy name for insert" ON table_name FOR INSERT TO role WITH CHECK (condition);
   CREATE POLICY "Policy name for update" ON table_name FOR UPDATE TO role USING (condition) WITH CHECK (condition);
   CREATE POLICY "Policy name for delete" ON table_name FOR DELETE TO role USING (condition);
   ```

### "ERROR: 42710: policy already exists"

This error occurs when you try to create a policy with a name that already exists for the same table. To fix this:

1. Use conditional policy creation with PL/pgSQL to check if the policy already exists before creating it:
   ```sql
   DO $$
   BEGIN
     IF NOT EXISTS (
       SELECT 1 FROM pg_policies 
       WHERE tablename = 'your_table' AND policyname = 'Your policy name'
     ) THEN
       CREATE POLICY "Your policy name" ON your_table FOR SELECT TO authenticated USING (true);
     END IF;
   END
   $$;
   ```

2. Alternatively, you can drop existing policies before creating new ones:
   ```sql
   DROP POLICY IF EXISTS "Your policy name" ON your_table;
   CREATE POLICY "Your policy name" ON your_table FOR SELECT TO authenticated USING (true);
   ```

### "ERROR: 42P17: infinite recursion detected in policy for relation"

This error occurs when a Row Level Security (RLS) policy references itself directly or indirectly, creating an infinite loop. This commonly happens when:

1. A policy for a table checks if a user is an admin by querying the same table
2. Policies reference each other in a circular manner

To fix this:

1. Create a separate function to check admin status without causing recursion:
   ```sql
   CREATE OR REPLACE FUNCTION is_admin_by_role()
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
   ```

2. Use table aliases in your policy conditions to avoid self-reference:
   ```sql
   -- Instead of:
   USING (
     EXISTS (
       SELECT 1 FROM user_profiles
       WHERE user_profiles.user_id = auth.uid()
       AND user_profiles.role = 'admin'
     )
   )
   
   -- Use:
   USING (
     EXISTS (
       SELECT 1 FROM user_profiles up
       WHERE up.user_id = auth.uid()
       AND up.role = 'admin'
     )
   )
   ```

3. Drop and recreate all policies to ensure they're consistent:
   ```sql
   DROP POLICY IF EXISTS "Policy name" ON table_name;
   CREATE POLICY "Policy name" ON table_name FOR SELECT TO authenticated USING (is_admin_by_role());
   ```

## Troubleshooting Steps

### 1. Check Your Environment Variables

Make sure your `.env` file in the `client` directory contains the correct Supabase URL and anon key:

```
REACT_APP_SUPABASE_URL=https://your-actual-project-id.supabase.co
REACT_APP_SUPABASE_ANON_KEY=your-actual-anon-key
```

### 2. Verify Your Supabase Project is Active

1. Go to [https://app.supabase.com](https://app.supabase.com) and sign in
2. Select your project
3. Check that your project is active (not paused or in maintenance mode)

### 3. Restart Your Development Server

After updating your environment variables, you need to restart your development server:

```bash
# Stop your current server (Ctrl+C)
# Then restart it
npm start
```

### 4. Check Browser Console for Specific Errors

Open your browser's developer tools (F12 or right-click > Inspect) and check the Console tab for specific error messages that might provide more details about the connection issue.

### 5. Test Your Supabase Connection

You can test your Supabase connection by visiting the `/setup` route in your application, which uses the `SupabaseSetup` component to check your connection status.

### 6. Clear Browser Cache and Cookies

Sometimes, cached authentication data can cause issues. Try clearing your browser cache and cookies, then reload the application.

### 7. Check Network Connectivity

Ensure that your computer has a stable internet connection and that there are no firewall or network restrictions blocking access to Supabase.

## Advanced Troubleshooting

### Check for CORS Issues

If you're seeing CORS-related errors in your console, make sure your Supabase project has the correct CORS configuration:

1. Go to your Supabase dashboard
2. Navigate to Project Settings > API
3. Under "CORS", ensure that your application's domain is listed (or use `*` for development)

### Inspect Network Requests

In your browser's developer tools, go to the Network tab and look for requests to your Supabase domain. Check the request and response details for any specific error messages.

### Verify JWT Token Expiration

If you're getting authentication errors after being logged in for a while, your JWT token might have expired. Check your Supabase authentication settings:

1. Go to your Supabase dashboard
2. Navigate to Authentication > Settings
3. Under "JWT Settings", check the expiry time and consider increasing it if needed

## SQL Script Errors

### "ERROR: relation already exists"

This error occurs when you try to create a table that already exists. You can safely ignore this error, or modify your SQL script to use `CREATE TABLE IF NOT EXISTS` instead of just `CREATE TABLE`.

### "ERROR: permission denied for schema public"

This error might occur if your Supabase project has restricted permissions on the public schema. To fix this:

1. Go to your Supabase dashboard
2. Navigate to SQL Editor
3. Run the following SQL to grant permissions: `GRANT ALL ON SCHEMA public TO postgres, anon, authenticated, service_role;`

## Still Having Issues?

If you've tried all these steps and are still experiencing connection issues, please:

1. Check the [Supabase documentation](https://supabase.com/docs)
2. Visit the [Supabase GitHub repository](https://github.com/supabase/supabase) for known issues
3. Join the [Supabase Discord community](https://discord.supabase.com) for community support 