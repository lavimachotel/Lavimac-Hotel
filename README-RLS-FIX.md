# Fixing Supabase Row-Level Security (RLS) Issues

This README file provides instructions on how to fix the Row-Level Security (RLS) issues that are causing the following errors in your application:

```
Failed to load resource: the server responded with a status of 401 ()
Supabase authentication error: Unauthorized (401). Session may have expired or credentials may be invalid.
No session found, continuing as anonymous user
Error saving invoice: Object
Error creating invoice: Error: Failed to insert invoice: new row violates row-level security policy for table "invoices"
```

## What's Happening?

Your application is encountering two main issues:

1. **Authentication Error (401)**: Your Supabase session has either expired or is invalid.
2. **Row-Level Security Violation**: The application doesn't have permission to insert data into the `invoices` table due to Supabase's RLS policies.

## Step 1: Run the SQL Script to Fix RLS Policies

We've created a SQL script (`fix_invoice_rls.sql`) that will:
- Enable RLS on the invoices and invoice_items tables
- Remove any existing restrictive policies
- Create new open policies that allow both authenticated and anonymous access
- Grant necessary permissions to the anon and authenticated roles

Follow these steps to run the script:

1. Log in to your Supabase dashboard at [https://app.supabase.com/](https://app.supabase.com/)
2. Select your project
3. Go to the SQL Editor (in the left sidebar)
4. Create a "New Query"
5. Copy the entire contents of the `fix_invoice_rls.sql` file and paste it into the SQL Editor
6. Click "Run" to execute the script
7. You should see the results showing that the policies were successfully created

## Step 2: Verify the Changes

After running the script, you can verify that the policies were created by running this SQL query in the SQL Editor:

```sql
SELECT
  tablename,
  policyname
FROM
  pg_policies
WHERE
  schemaname = 'public' AND
  tablename IN ('invoices', 'invoice_items');
```

You should see 8 policies listed (4 for each table):
- Invoices viewable by anyone
- Invoices insertable by anyone
- Invoices updatable by anyone
- Invoices deletable by anyone
- Invoice items viewable by anyone
- Invoice items insertable by anyone
- Invoice items updatable by anyone
- Invoice items deletable by anyone

## Step 3: Restart Your Application

After applying the RLS fixes:

1. Stop your application if it's running
2. Start it again with `npm start`
3. The invoices should now be created successfully and stored in the database

## Security Considerations

**Important**: These RLS settings allow anonymous access to your invoice tables, which means anyone with your Supabase URL and anon key can access, modify, or delete your invoice data. This approach is fine for development but in a production environment, you should:

1. Implement proper authentication in your application
2. Update the RLS policies to restrict access based on user authentication
3. Consider using JWT claims or user IDs to limit users to only viewing their own data

For a more secure implementation, modify the policies to include conditions like:
```sql
CREATE POLICY "Invoices viewable by authenticated users only"
ON public.invoices
FOR SELECT
USING (auth.role() = 'authenticated');
```

## Further Troubleshooting

If you're still experiencing issues after applying these fixes, check:

1. Your Supabase URL and anon key in the `.env` file
2. Network connectivity to the Supabase API
3. The Supabase console logs for any other errors
4. Browser console for client-side errors 