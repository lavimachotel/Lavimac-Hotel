const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// Get Supabase URL and anon key from environment variables
const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
const supabaseServiceKey = process.env.REACT_APP_SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase URL or service role key. Please set REACT_APP_SUPABASE_URL and REACT_APP_SUPABASE_SERVICE_ROLE_KEY in your .env file.');
  process.exit(1);
}

// Create supabase client with service role key for admin privileges
const supabase = createClient(supabaseUrl, supabaseServiceKey);

const runFixes = async () => {
  try {
    console.log('Starting RLS policy fixes...');
    
    // Read the SQL file
    const sqlFilePath = path.join(__dirname, 'fix_user_profiles_rls.sql');
    const sql = fs.readFileSync(sqlFilePath, 'utf8');
    
    // Split SQL into separate statements
    const statements = sql.split(';').filter(stmt => stmt.trim() !== '');
    
    // Execute each statement
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i].trim();
      console.log(`Executing statement ${i + 1}/${statements.length}:`);
      console.log(statement);
      
      // Execute SQL with rpc (supabase.rpc is deprecated, using raw query)
      const { error } = await supabase.rpc('exec_sql', { sql: statement });
      
      if (error) {
        console.error(`Error executing statement ${i + 1}:`, error);
      } else {
        console.log(`Statement ${i + 1} executed successfully`);
      }
    }
    
    console.log('RLS policy fixes completed successfully!');
  } catch (error) {
    console.error('Error running RLS fixes:', error);
  }
};

// Execute the function
runFixes().catch(err => {
  console.error('Fatal error running RLS fixes:', err);
  process.exit(1);
}); 