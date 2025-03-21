// Script to apply Row-Level Security (RLS) fixes directly to your Supabase database
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

// Get Supabase credentials from environment or provide your own here
const supabaseUrl = process.env.REACT_APP_SUPABASE_URL || 'your-supabase-url';
const supabaseKey = process.env.REACT_APP_SUPABASE_SERVICE_KEY || process.env.REACT_APP_SUPABASE_ANON_KEY || 'your-supabase-key';

// Create Supabase client with service role key (if available) or anon key
const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: false }
});

console.log(`Connecting to Supabase at ${supabaseUrl}`);

// SQL statements to fix RLS policies
const rlsFixSQL = `
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
`;

// Function to execute SQL with any available RPC function
const executeSql = async (sql) => {
  // List of possible RPC function names for SQL execution in different Supabase setups
  const possibleFunctions = ['exec_sql', 'execute_sql', 'run_sql', 'sql'];
  
  let lastError = null;
  
  // Try each possible function name
  for (const funcName of possibleFunctions) {
    try {
      console.log(`Trying to execute SQL using RPC function: ${funcName}`);
      const { data, error } = await supabase.rpc(funcName, { sql });
      
      if (!error) {
        console.log(`Successfully executed SQL using ${funcName}`);
        return { data, error: null, functionUsed: funcName };
      }
      lastError = error;
    } catch (err) {
      lastError = err;
      // Continue trying other function names
    }
  }
  
  // If direct RPC calls fail, try using REST API to execute SQL (if your Supabase has pg_net extension)
  try {
    console.log('Trying to execute SQL using REST API...');
    const { data, error } = await supabase
      .from('execute_sql')
      .insert({ query: sql })
      .select();
      
    if (!error) {
      console.log('Successfully executed SQL using REST API');
      return { data, error: null, functionUsed: 'rest_api' };
    }
  } catch (err) {
    // Ignore and continue
  }
  
  // Direct REST API call to Postgres as a last resort
  try {
    console.log('Trying direct SQL execution via Postgres REST endpoint...');
    const response = await fetch(`${supabaseUrl}/rest/v1/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${supabaseKey}`,
        'apikey': supabaseKey,
        'Prefer': 'tx=commit'
      },
      body: JSON.stringify({ query: sql })
    });
    
    if (response.ok) {
      const data = await response.json();
      console.log('Successfully executed SQL using direct REST endpoint');
      return { data, error: null, functionUsed: 'direct_rest' };
    }
  } catch (err) {
    // Ignore and continue to next method
  }
  
  // If all methods fail, return the last error
  console.error('All SQL execution methods failed');
  return { data: null, error: lastError || new Error('All SQL execution methods failed'), functionUsed: null };
};

// Function to run each SQL statement separately
const runRLSFixes = async () => {
  try {
    console.log('Starting RLS policy fixes...');
    
    // Split the SQL into individual statements
    const statements = rlsFixSQL
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt && !stmt.startsWith('--'));
      
    console.log(`Found ${statements.length} SQL statements to execute`);
    
    // Track successful SQL function to reuse
    let successfulFunction = null;
    
    // Execute each statement
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      try {
        console.log(`Executing statement ${i+1}/${statements.length}...`);
        
        // If we've already found a working function, use it directly
        let result;
        if (successfulFunction) {
          result = await supabase.rpc(successfulFunction, { sql: statement });
        } else {
          // Otherwise try all possible functions
          result = await executeSql(statement);
          if (!result.error && result.functionUsed) {
            successfulFunction = result.functionUsed;
            console.log(`Found working SQL execution function: ${successfulFunction}`);
          }
        }
        
        if (result.error) {
          console.error(`Error executing statement ${i+1}:`, result.error);
          // Continue with next statement despite errors
        } else {
          console.log(`Statement ${i+1} executed successfully`);
        }
      } catch (stmtErr) {
        console.error(`Exception executing statement ${i+1}:`, stmtErr);
        // Continue with next statement despite errors
      }
    }
    
    // Verify the tables exist using the discovered function
    console.log('Checking if invoice tables exist...');
    const verifyTablesSQL = `SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename IN ('invoices', 'invoice_items')`;
    
    const tablesResult = successfulFunction 
      ? await supabase.rpc(successfulFunction, { sql: verifyTablesSQL }) 
      : await executeSql(verifyTablesSQL);
    
    if (tablesResult.error) {
      console.error('Error verifying tables:', tablesResult.error);
    } else {
      console.log('Tables found:', tablesResult.data);
    }
    
    // Verify the policies exist
    console.log('Checking if RLS policies were created...');
    const verifyPoliciesSQL = `SELECT tablename, policyname FROM pg_policies WHERE schemaname = 'public' AND tablename IN ('invoices', 'invoice_items')`;
    
    const policiesResult = successfulFunction 
      ? await supabase.rpc(successfulFunction, { sql: verifyPoliciesSQL }) 
      : await executeSql(verifyPoliciesSQL);
    
    if (policiesResult.error) {
      console.error('Error verifying policies:', policiesResult.error);
    } else {
      console.log('Policies found:', policiesResult.data);
    }
    
    // If we couldn't execute the statements programmatically, provide the SQL to run manually
    if (!successfulFunction) {
      console.log('\n\n========== MANUAL EXECUTION REQUIRED ==========');
      console.log('We could not execute the SQL statements programmatically.');
      console.log('Please copy the following SQL and run it in your Supabase SQL Editor:');
      console.log('\n' + rlsFixSQL + '\n');
      console.log('=================================================\n\n');
    } else {
      console.log('RLS policy fixes completed!');
      console.log('You can now restart your application and try creating invoices again.');
    }
    
  } catch (err) {
    console.error('Unexpected error applying RLS fixes:', err);
    
    // Provide manual SQL as fallback
    console.log('\n\n========== MANUAL EXECUTION REQUIRED ==========');
    console.log('An error occurred during automatic execution. Please copy the following SQL and run it in your Supabase SQL Editor:');
    console.log('\n' + rlsFixSQL + '\n');
    console.log('=================================================\n\n');
  }
};

// Run the fix
runRLSFixes(); 