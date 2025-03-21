const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Supabase connection details
const supabaseUrl = 'https://vdaxvoyowsjkyvjpperm.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZkYXh2b3lvd3Nqa3l2anBwZXJtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDIxNjQwMTEsImV4cCI6MjA1Nzc0MDAxMX0.Ex17J4uwp-rXIiQSPbi8iTDNyxk9oKtHZBW6roilkTk';

// Initialize Supabase client
const supabase = createClient(supabaseUrl, supabaseKey);

async function fixInvoicesTable() {
  console.log('=== INVOICES TABLE FIX SCRIPT ===');
  console.log(`URL: ${supabaseUrl}`);
  console.log(`Time: ${new Date().toISOString()}`);
  console.log('===============================');

  try {
    // First, check if the table exists
    console.log('Checking if invoices table exists...');
    const { data: tableExists, error: tableError } = await supabase
      .from('invoices')
      .select('id')
      .limit(1)
      .maybeSingle();

    if (tableError && tableError.code === '42P01') {
      console.log('Invoices table does not exist yet, creating it...');
    } else {
      console.log('Invoices table exists. Will modify as needed.');
    }

    // First, drop the trigger if it exists
    console.log('1. Dropping existing trigger...');
    await supabase.rpc('exec_sql', {
      sql: 'DROP TRIGGER IF EXISTS update_invoices_updated_at ON public.invoices;'
    });

    // Create the function for updating the updated_at column
    console.log('2. Creating or replacing update_updated_at_column function...');
    await supabase.rpc('exec_sql', {
      sql: `
      CREATE OR REPLACE FUNCTION update_updated_at_column()
      RETURNS TRIGGER AS $$
      BEGIN
         NEW.updated_at = NOW();
         RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
      `
    });

    // Create the table if it doesn't exist
    console.log('3. Creating invoices table if it doesn\'t exist...');
    await supabase.rpc('exec_sql', {
      sql: `
      CREATE TABLE IF NOT EXISTS public.invoices (
        id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
        guest_name TEXT NOT NULL,
        room_number TEXT NOT NULL,
        check_in_date DATE NOT NULL,
        check_out_date DATE NOT NULL,
        amount DECIMAL(10,2) NOT NULL,
        status TEXT NOT NULL CHECK (status IN ('Paid', 'Pending', 'Refunded', 'Overdue')),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        room_type TEXT,
        nights INTEGER,
        room_rate DECIMAL(10,2)
      );
      `
    });

    // Create indexes
    console.log('4. Creating indexes...');
    await supabase.rpc('exec_sql', {
      sql: `
      CREATE INDEX IF NOT EXISTS invoices_guest_name_idx ON public.invoices(guest_name);
      CREATE INDEX IF NOT EXISTS invoices_room_number_idx ON public.invoices(room_number);
      CREATE INDEX IF NOT EXISTS invoices_status_idx ON public.invoices(status);
      `
    });

    // Enable RLS
    console.log('5. Enabling Row Level Security...');
    await supabase.rpc('exec_sql', {
      sql: `
      ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
      `
    });

    // Create RLS policies
    console.log('6. Creating RLS policies...');
    await supabase.rpc('exec_sql', {
      sql: `
      DROP POLICY IF EXISTS "Allow anonymous full access to invoices" ON public.invoices;
      CREATE POLICY "Allow anonymous full access to invoices"
        ON public.invoices
        FOR ALL
        TO anon
        USING (true)
        WITH CHECK (true);
      
      DROP POLICY IF EXISTS "Allow authenticated users full access to invoices" ON public.invoices;
      CREATE POLICY "Allow authenticated users full access to invoices"
        ON public.invoices
        FOR ALL
        TO authenticated
        USING (true)
        WITH CHECK (true);
      `
    });

    // Create the trigger
    console.log('7. Creating trigger...');
    await supabase.rpc('exec_sql', {
      sql: `
      CREATE TRIGGER update_invoices_updated_at
      BEFORE UPDATE ON public.invoices
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
      `
    });

    // Enable Realtime
    console.log('8. Enabling Realtime...');
    await supabase.rpc('exec_sql', {
      sql: `
      BEGIN;
        DROP PUBLICATION IF EXISTS supabase_realtime;
        CREATE PUBLICATION supabase_realtime;
      END;
      ALTER PUBLICATION supabase_realtime ADD TABLE public.invoices;
      `
    });

    // Grant privileges
    console.log('9. Granting privileges...');
    await supabase.rpc('exec_sql', {
      sql: `
      GRANT ALL ON public.invoices TO authenticated;
      GRANT ALL ON public.invoices TO anon;
      GRANT USAGE, SELECT ON SEQUENCE public.invoices_id_seq TO authenticated;
      GRANT USAGE, SELECT ON SEQUENCE public.invoices_id_seq TO anon;
      `
    });

    // Test insert
    console.log('10. Testing insertion with a sample invoice...');
    const { data: insertResult, error: insertError } = await supabase
      .from('invoices')
      .insert({
        guest_name: 'Test Guest',
        room_number: '101',
        check_in_date: new Date().toISOString().split('T')[0],
        check_out_date: new Date(Date.now() + 86400000 * 3).toISOString().split('T')[0], // 3 days later
        amount: 1250.00,
        status: 'Paid',
        room_type: 'Deluxe',
        nights: 3,
        room_rate: 416.67
      })
      .select();

    if (insertError) {
      console.error('Error inserting test invoice:', insertError);
    } else {
      console.log('Successfully inserted test invoice:', insertResult);
      console.log('Invoice table is now set up correctly!');
    }

    console.log('=== SCRIPT COMPLETED ===');

  } catch (error) {
    console.error('Error executing script:', error);
  }
}

// Run the function
fixInvoicesTable(); 