# Supabase Security Fixes

## Security Issues Detected

The Supabase database linter has identified several security issues in our database:

### 1. Exposed Auth Users

Two views are exposing sensitive user authentication data to anonymous users:
- `public.staff_credentials_debug`
- `public.auth_debug`

These views are problematic because they expose data from the `auth.users` table, which should never be accessible to unauthenticated users or regular authenticated users.

### 2. Security Definer Views

The following views are using SECURITY DEFINER, which means they execute with the permissions of the view creator rather than the user querying the view:
- `public.staff_credentials_debug`
- `public.auth_debug`
- `public.staff_trainings_view`
- `public.time_entries_view`
- `public.performance_metrics_view`

SECURITY DEFINER views can bypass Row Level Security (RLS) policies and expose data that should be restricted.

## Fix Implementation

The `fix_security_issues.sql` script addresses these issues by:

1. Dropping the debug views that expose auth.users data
2. Creating safer alternatives that don't expose sensitive information
3. Replacing SECURITY DEFINER views with SECURITY INVOKER views (default)
4. Implementing proper Row Level Security (RLS) policies

## How to Apply the Fixes

1. Review the `fix_security_issues.sql` script to ensure it matches your database schema
2. Back up your database before applying any changes
3. Run the script in the Supabase SQL Editor or using the Supabase CLI
4. Verify the changes have fixed the security issues by running the database linter again

## Best Practices for Future Development

1. Never expose the `auth.users` table directly in views accessible to unauthenticated users
2. Avoid using SECURITY DEFINER for views unless absolutely necessary
3. Always implement Row Level Security (RLS) policies on tables
4. Regularly run the Supabase database linter to catch security issues early

## Resources

- [Supabase Database Linter Documentation](https://supabase.com/docs/guides/database/database-linter)
- [Row Level Security in Supabase](https://supabase.com/docs/guides/auth/row-level-security)
- [Security Best Practices for Supabase](https://supabase.com/docs/guides/auth/auth-helpers) 