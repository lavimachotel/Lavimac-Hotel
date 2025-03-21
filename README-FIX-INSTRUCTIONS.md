# How to Fix Supabase Row-Level Security (RLS) Issues

You're seeing the following errors because your application doesn't have proper permissions to access the `invoices` and `invoice_items` tables in your Supabase database:

```
Failed to load resource: the server responded with a status of 401 ()
Supabase authentication error: Unauthorized (401). Session may have expired or credentials may be invalid.
No session found, continuing as anonymous user
Error saving invoice: Object
Error creating invoice: Error: Failed to insert invoice: new row violates row-level security policy for table "invoices"
```

We've created tools to solve this issue. You have two options:

## Option 1: Run the Fix Script (Easy)

1. Make sure you have Node.js installed
2. Open a terminal or command prompt
3. Navigate to your project root directory
4. Install the required dependency:
   ```
   npm install @supabase/supabase-js dotenv
   ```
5. Run the fix script:
   ```
   node runRLSFix.js
   ```
6. The script will try to automatically apply the RLS (Row-Level Security) fixes to your Supabase database
7. If successful, restart your application and try creating invoices again

## Option 2: Run the SQL Manually (More Reliable)

If the script doesn't work (which can happen due to different Supabase configurations), you can run the SQL directly:

1. Log in to your Supabase dashboard at [https://app.supabase.com/](https://app.supabase.com/)
2. Select your project
3. Go to the SQL Editor (in the left sidebar)
4. Create a "New Query"
5. Copy the entire contents below and paste it into the SQL Editor:

```sql
-- First, make sure RLS is enabled on both tables
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoice_items ENABLE ROW LEVEL SECURITY;

-- Remove any existing policies that might be causing issues
DROP POLICY IF EXISTS "Invoices viewable by authenticated users" ON public.invoices;
DROP POLICY IF EXISTS "Invoices insertable by authenticated users" ON public.invoices;
DROP POLICY IF EXISTS "Invoices updatable by authenticated users" ON public.invoices;
DROP POLICY IF EXISTS "Invoices deletable by authenticated users" ON public.invoices;

DROP POLICY IF EXISTS "Invoice items viewable by authenticated users" ON public.invoice_items;
DROP POLICY IF EXISTS "Invoice items insertable by authenticated users" ON public.invoice_items;
DROP POLICY IF EXISTS "Invoice items updatable by authenticated users" ON public.invoice_items;
DROP POLICY IF EXISTS "Invoice items deletable by authenticated users" ON public.invoice_items;

-- Create new open policies that allow both authenticated and anonymous access

-- INVOICE TABLE POLICIES
CREATE POLICY "Invoices viewable by anyone" 
ON public.invoices 
FOR SELECT 
USING (true);

CREATE POLICY "Invoices insertable by anyone" 
ON public.invoices 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Invoices updatable by anyone" 
ON public.invoices 
FOR UPDATE 
USING (true);

CREATE POLICY "Invoices deletable by anyone" 
ON public.invoices 
FOR DELETE 
USING (true);

-- INVOICE ITEMS TABLE POLICIES
CREATE POLICY "Invoice items viewable by anyone" 
ON public.invoice_items 
FOR SELECT 
USING (true);

CREATE POLICY "Invoice items insertable by anyone" 
ON public.invoice_items 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Invoice items updatable by anyone" 
ON public.invoice_items 
FOR UPDATE 
USING (true);

CREATE POLICY "Invoice items deletable by anyone" 
ON public.invoice_items 
FOR DELETE 
USING (true);

-- Grant access to anon and authenticated roles
GRANT ALL ON public.invoices TO anon, authenticated;
GRANT ALL ON public.invoice_items TO anon, authenticated;
GRANT USAGE ON SEQUENCE public.invoices_id_seq TO anon, authenticated;
GRANT USAGE ON SEQUENCE public.invoice_items_id_seq TO anon, authenticated;
```

6. Click "Run" to execute the SQL script
7. Restart your application and try creating invoices again

## What This Fix Does

The fix creates Row-Level Security (RLS) policies that allow both anonymous and authenticated users to:
- Read invoices and invoice items
- Create new invoices and invoice items
- Update existing invoices and invoice items
- Delete invoices and invoice items

## Security Considerations

**Important**: These RLS settings allow anonymous access to your invoice tables, which is fine for development but not recommended for production. For a production environment, you should implement proper authentication and restrict RLS policies to authenticated users.

## Need More Help?

If you're still encountering issues after applying these fixes, see the more detailed troubleshooting guide in `README-RLS-FIX.md`. 