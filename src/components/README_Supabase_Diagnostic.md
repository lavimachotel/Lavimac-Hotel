# Supabase Diagnostic Tool

This component provides a way to diagnose and troubleshoot Supabase connectivity and database schema issues in the Hotel Management application.

## Features

1. **Connection Testing**: Tests the basic connectivity to your Supabase instance.
2. **Database Diagnosis**: Checks for the existence of database tables, RLS settings, and security policies.
3. **Table Setup**: Creates or recreates the guests table with the correct schema if it doesn't exist.

## Usage

### Accessing the Tool

1. Log in as an administrator (users with the 'admin' or 'administrator' role)
2. Navigate to "Supabase Tools" in the sidebar
3. The tool will be available at the `/supabase-diagnostic` route

### Running Tests

1. **Test Connection**: Click the "Test Connection" button to check if the application can connect to Supabase.
2. **Run Diagnosis**: Click the "Run Diagnosis" button to get a detailed report on database tables, RLS settings, and policies.
3. **Setup Guests Table**: Click the "Setup Guests Table" button to create or recreate the guests table if it doesn't exist or has issues.

### Debugging with the Tool

If you're experiencing issues with guest data persistence:

1. First check the connection test to ensure basic connectivity is working
2. Run the diagnosis to see if the guests table exists and has the correct permissions
3. If the guests table doesn't exist or has incorrect settings, use the setup feature to create it

## How it Works

The diagnostic tool uses various methods to check and fix Supabase-related issues:

- It attempts to connect to Supabase using your configured credentials
- It checks for the existence of the guests table
- It verifies Row Level Security (RLS) settings and policies
- It can create the proper table schema with appropriate indexes and RLS policies

## Required Permissions

The following server-side functions should be defined in your Supabase instance for full functionality:

- `list_tables`: Lists all tables in the public schema
- `check_rls_enabled`: Checks if RLS is enabled for a specific table
- `list_policies`: Lists all policies for a specific table
- `run_sql_query`: Executes a SQL query (admin only)

## Implementation Notes

- The tool includes fallback mechanisms if certain RPC functions are not available
- All operations are performed securely through the Supabase client
- Failed operations include detailed error messages to aid in troubleshooting

## Troubleshooting

If you encounter issues with the diagnostic tool:

1. Check your `.env` file to ensure Supabase credentials are correct
2. Restart your development server after making changes to environment variables
3. Check browser console logs for detailed error messages
4. Ensure your Supabase user has sufficient permissions for the required operations 