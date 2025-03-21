const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
const fetch = require('node-fetch');

// Use the same credentials as in the client app
const supabaseUrl = 'https://vdaxvoyowsjkyvjpperm.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZkYXh2b3lvd3Nqa3l2anBwZXJtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDIxNjQwMTEsImV4cCI6MjA1Nzc0MDAxMX0.Ex17J4uwp-rXIiQSPbi8iTDNyxk9oKtHZBW6roilkTk';

console.log(`Connecting to Supabase at ${supabaseUrl}`);

// Create Supabase client
const supabase = createClient(supabaseUrl, supabaseKey);

// Function to run SQL directly using the REST API
async function executeSql(sql) {
  try {
    const response = await fetch(`${supabaseUrl}/rest/v1/rpc/execute_sql`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`
      },
      body: JSON.stringify({ query: sql })
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      return { error: errorData };
    }
    
    return { data: await response.json() };
  } catch (error) {
    return { error };
  }
}

async function createInvoiceTables() {
  try {
    console.log('Reading SQL file...');
    // Read the SQL file
    const sqlFilePath = path.join(__dirname, 'create_invoice_tables.sql');
    const sqlQuery = fs.readFileSync(sqlFilePath, 'utf8');

    // Split the SQL into individual statements
    const statements = sqlQuery.split(';').filter(stmt => stmt.trim().length > 0);

    console.log(`Found ${statements.length} SQL statements to execute`);

    // Execute each statement
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i].trim();
      if (statement) {
        console.log(`Executing statement ${i + 1}/${statements.length}...`);
        const { error } = await executeSql(statement + ';');
        
        if (error) {
          console.error(`Error executing statement ${i + 1}:`, error);
        } else {
          console.log(`Statement ${i + 1} executed successfully`);
        }
      }
    }

    console.log('Database tables created successfully!');
    
    // Test query to verify tables were created
    console.log('Testing database connection and tables...');
    
    // Query to directly list tables in public schema
    const listTablesQuery = `
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
        AND table_name IN ('invoices', 'invoice_items', 'invoice_payments')
    `;
    
    const { data: tablesResult, error: tablesError } = await executeSql(listTablesQuery);
      
    if (tablesError) {
      console.error('Error getting table list:', tablesError);
    } else {
      console.log('Tables found in the database:', tablesResult);
      
      if (tablesResult && tablesResult.length > 0) {
        console.log('Success! The following tables were created:');
        tablesResult.forEach(row => console.log(`- ${row.table_name}`));
      } else {
        console.warn('No tables were found. Check SQL execution logs above for errors.');
      }
    }
    
  } catch (error) {
    console.error('Error creating invoice tables:', error);
  }
}

// Execute the function
createInvoiceTables()
  .then(() => console.log('Script execution completed'))
  .catch(err => console.error('Script execution failed:', err));

// Instructions to run this script:
// Run: node create_invoice_tables.js 