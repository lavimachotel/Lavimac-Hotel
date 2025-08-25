import supabase from '../supabaseClient';

/**
 * Creates the guests table in Supabase if it doesn't exist
 * @returns {Promise<Object>} Result of the table creation operation
 */
export const createGuestsTable = async () => {
  console.log('Setting up guests table...');
  
  try {
    // First check if the table already exists
    const { count, error: checkError } = await supabase
      .from('guests')
      .select('*', { count: 'exact', head: true });
    
    if (!checkError) {
      console.log('Guests table already exists');
      return {
        success: true,
        message: 'Guests table already exists, no action taken',
        alreadyExists: true
      };
    }
    
    // If the error is not about missing table, something else is wrong
    if (checkError.code !== 'PGRST116' && checkError.code !== '42P01') {
      return {
        success: false,
        message: `Error checking guests table: ${checkError.message}`,
        error: checkError
      };
    }
    
    console.log('Creating guests table...');
    
    // Try to call an RPC function for table creation if it exists
    try {
      const { error: rpcError } = await supabase.rpc('create_guests_table');
      
      if (!rpcError) {
        console.log('Guests table created successfully via RPC');
        return {
          success: true,
          message: 'Successfully created guests table',
          method: 'rpc'
        };
      }
      
      // If RPC failed, try direct SQL (will only work with sufficient privileges)
      console.log('RPC failed, attempting SQL creation...');
    } catch (rpcEx) {
      console.log('RPC exception, attempting SQL creation...', rpcEx);
    }
    
    // SQL to create the guests table with fields matching the fields used in GuestContext.js
    const createTableSQL = `
      CREATE TABLE IF NOT EXISTS public.guests (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        name TEXT,
        email TEXT,
        phone TEXT,
        room TEXT,
        check_in TIMESTAMP WITH TIME ZONE,
        check_out TIMESTAMP WITH TIME ZONE,
        status TEXT DEFAULT 'Checked In',
        first_name TEXT,
        last_name TEXT,
        date_of_birth TEXT,
        gender TEXT,
        nationality TEXT,
        region TEXT,
        address TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
      );

      -- Enable row level security
      ALTER TABLE public.guests ENABLE ROW LEVEL SECURITY;

      -- Create policy for public access (you may want to restrict this in production)
      CREATE POLICY "Allow public access" ON public.guests
        FOR ALL USING (true);
        
      -- Create indexes for faster lookups
      CREATE INDEX IF NOT EXISTS guests_room_idx ON public.guests(room);
      CREATE INDEX IF NOT EXISTS guests_status_idx ON public.guests(status);
      CREATE INDEX IF NOT EXISTS guests_email_idx ON public.guests(email);
    `;
    
    // Execute the SQL (note: requires sufficient privileges)
    const { error: sqlError } = await supabase.rpc('run_sql_query', { 
      query: createTableSQL 
    });
    
    if (sqlError) {
      console.error('SQL table creation failed:', sqlError);
      
      // Try a more direct approach as a fallback if RPC fails
      try {
        console.log('Attempting direct table creation without RPC...');
        const { error: directError } = await supabase.from('guests').insert({
          name: 'Test Guest',
          email: 'test@example.com',
          phone: '123-456-7890',
          room: '101',
          check_in: new Date().toISOString(),
          check_out: new Date(Date.now() + 86400000).toISOString(),
          status: 'Checked In',
          first_name: 'Test',
          last_name: 'Guest',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });
        
        if (directError) {
          // Try the super simple fallback method
          console.log('Attempting ultra-simple fallback table creation...');
          return await createBasicGuestsTable();
        }
        
        console.log('Successfully created test entry, table should now exist');
        return {
          success: true,
          message: 'Successfully initialized guests table with a test entry',
          method: 'direct_insert'
        };
      } catch (directError) {
        console.error('Direct table creation also failed:', directError);
        // Try the super simple fallback method
        return await createBasicGuestsTable();
      }
    }
    
    console.log('Guests table created successfully via SQL');
    return {
      success: true,
      message: 'Successfully created guests table',
      method: 'sql'
    };
    
  } catch (error) {
    console.error('Exception creating guests table:', error);
    // Try the super simple fallback method
    return await createBasicGuestsTable();
  }
};

/**
 * A fallback method to create a very basic guests table when all else fails
 * This method uses multiple separate statements instead of a complex SQL script
 */
export const createBasicGuestsTable = async () => {
  console.log('Attempting ultra-simple fallback table creation...');
  
  try {
    // Create basic table with minimal fields - separate statements have better chance of success
    const steps = [
      // Step 1: Create the simplest possible version of the table
      {
        name: 'Create basic table',
        fn: async () => {
          const { error } = await supabase.rpc('execute_sql', { 
            sql: `CREATE TABLE IF NOT EXISTS guests (
              id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
              name TEXT,
              email TEXT,
              room TEXT,
              created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
            );`
          });
          return { error };
        }
      },
      
      // Step 2: Add a test record to ensure it exists
      {
        name: 'Add test record',
        fn: async () => {
          const { error } = await supabase.from('guests').insert({
            name: 'Emergency Test Guest',
            email: 'emergency@test.com',
            room: '999',
            created_at: new Date().toISOString()
          });
          return { error };
        }
      },
      
      // Step 3: Enable RLS with a simple policy
      {
        name: 'Enable RLS',
        fn: async () => {
          const { error } = await supabase.rpc('execute_sql', { 
            sql: `ALTER TABLE IF EXISTS guests ENABLE ROW LEVEL SECURITY;`
          });
          return { error };
        }
      },
      
      // Step 4: Create a simple policy
      {
        name: 'Create policy',
        fn: async () => {
          const { error } = await supabase.rpc('execute_sql', { 
            sql: `CREATE POLICY IF NOT EXISTS "Public guests access" 
                  ON guests FOR ALL USING (true);`
          });
          return { error };
        }
      }
    ];
    
    // Execute each step and track results
    const results = [];
    let failedStep = null;
    
    for (const step of steps) {
      console.log(`Executing step: ${step.name}`);
      const result = await step.fn();
      
      if (result.error) {
        console.error(`Failed at step "${step.name}":`, result.error);
        failedStep = { step: step.name, error: result.error };
        // Continue anyway, some steps might succeed
      }
      
      results.push({ step: step.name, success: !result.error });
    }
    
    if (failedStep) {
      // If any step failed, attempt one final direct insert
      try {
        const { data, error } = await supabase.from('guests').upsert({
          id: '00000000-0000-0000-0000-000000000000',
          name: 'Last Resort Test',
          email: 'last.resort@test.com',
          room: '000'
        });
        
        if (!error) {
          console.log('Last resort direct insert succeeded');
        }
      } catch (e) {
        console.error('Last resort insert also failed:', e);
      }
      
      return {
        success: false,
        message: `Fallback table creation partially failed at step "${failedStep.step}"`,
        error: failedStep.error,
        results: results
      };
    }
    
    return {
      success: true,
      message: 'Successfully created basic guests table using fallback method',
      method: 'basic_fallback',
      results: results
    };
    
  } catch (error) {
    console.error('Exception in fallback table creation:', error);
    return {
      success: false,
      message: `Exception in fallback table creation: ${error.message}`,
      error: error
    };
  }
};

/**
 * Diagnoses database connection and setup issues
 * @returns {Promise<Object>} Diagnostic information about the database
 */
export const diagnoseDatabase = async () => {
  console.log('Running database diagnostics...');
  
  try {
    // Check connection using a more reliable method
    let connectionStatus = 'unknown';
    
    try {
      // Try system catalog access (will give permission error but that's fine)
      const { error: schemaError } = await supabase
        .from('pg_catalog.pg_namespace')
        .select('nspname')
        .limit(1)
        .single();
      
      // If we get a specific error about permissions, that's actually good
      if (schemaError && schemaError.code === '42501') {
        connectionStatus = 'connected';
      } else if (schemaError && schemaError.code !== 'PGRST116') {
        // Try a different approach - direct fetch
        try {
          const { status } = await fetch(supabase.supabaseUrl);
          connectionStatus = (status >= 200 && status < 300) ? 'connected' : 'failed';
        } catch {
          connectionStatus = 'failed';
        }
      } else {
        connectionStatus = 'connected';
      }
    } catch (e) {
      console.error('Connection test error:', e);
      connectionStatus = 'failed';
    }
    
    if (connectionStatus === 'failed') {
      return {
        success: false,
        message: 'Failed to connect to Supabase database',
        connectionStatus
      };
    }
    
    // List tables in public schema
    let tables = [];
    let hasGuestsTable = false;
    
    try {
      const { data: tablesData, error: tablesError } = await supabase
        .rpc('list_tables');
      
      if (!tablesError && tablesData) {
        tables = tablesData;
        hasGuestsTable = tables.includes('guests');
      }
    } catch (e) {
      console.error('Error listing tables:', e);
    }
    
    // Check RLS settings for guests table
    let rlsEnabled = null;
    let policies = [];
    
    if (hasGuestsTable) {
      try {
        // Check RLS status
        const { data: rlsData, error: rlsError } = await supabase
          .rpc('check_rls_enabled', { table_name: 'guests' });
        
        if (!rlsError && rlsData !== null) {
          rlsEnabled = rlsData;
        }
        
        // Get policies
        const { data: policiesData, error: policiesError } = await supabase
          .rpc('list_policies', { table_name: 'guests' });
        
        if (!policiesError && policiesData) {
          policies = policiesData;
        }
      } catch (e) {
        console.error('Error checking RLS:', e);
      }
    }
    
    return {
      success: true,
      message: 'Database diagnosis completed',
      connectionStatus,
      tables,
      hasGuestsTable,
      rlsEnabled,
      policies
    };
    
  } catch (error) {
    console.error('Database diagnosis exception:', error);
    return {
      success: false,
      message: `Database diagnosis failed: ${error.message}`,
      error
    };
  }
};

/**
 * Fixes the guests table schema if it exists but has incorrect columns
 * @returns {Promise<Object>} Result of the operation
 */
export const fixGuestsTable = async () => {
  console.log('Attempting to fix guests table schema...');
  
  try {
    // Try to call the fix_guests_table RPC function
    const { data, error } = await supabase.rpc('fix_guests_table');
    
    if (error) {
      console.error('Error fixing guests table:', error);
      return {
        success: false,
        message: `Failed to fix guests table: ${error.message}`,
        error: error
      };
    }
    
    console.log('Successfully fixed guests table schema:', data);
    return {
      success: true,
      message: data || 'Guests table fixed successfully',
      result: data
    };
  } catch (error) {
    console.error('Exception fixing guests table:', error);
    return {
      success: false,
      message: `Exception fixing guests table: ${error.message}`,
      error: error
    };
  }
};

/**
 * Checks if the Supabase project is active by attempting various API calls
 * @returns {Promise<Object>} Object containing status information about the Supabase project
 */
export const checkSupabaseProjectStatus = async () => {
  console.log('Checking Supabase project status...');
  const projectUrl = supabase.supabaseUrl;
  const apiKey = supabase.supabaseKey || process.env.REACT_APP_SUPABASE_ANON_KEY;
  
  if (!projectUrl) {
    return {
      success: false,
      message: 'No Supabase URL configured',
      active: false
    };
  }
  
  // Results object to track all check results
  const results = {
    pingApi: null,
    getVersion: null,
    auth: null,
    storage: null
  };
  
  // 1. Basic REST API endpoint check (most reliable)
  try {
    console.log('Testing basic REST API endpoint...');
    const baseApiEndpoint = `${projectUrl}/rest/v1/`;
    
    const response = await fetch(baseApiEndpoint, {
      method: 'GET',
      headers: {
        'apikey': apiKey,
        'Accept': 'application/json'
      }
    });
    
    results.pingApi = {
      success: response.status >= 200 && response.status < 300,
      status: response.status,
      statusText: response.statusText
    };
    
    // Try to parse the response as JSON
    try {
      const data = await response.json();
      results.pingApi.data = data;
    } catch (e) {
      // Response wasn't JSON, but that's not necessarily an error
      results.pingApi.parseError = e.message;
    }
  } catch (error) {
    console.error('Error checking REST API endpoint:', error);
    results.pingApi = {
      success: false,
      error: error.message
    };
  }
  
  // 2. Try to get version (requires RPC)
  try {
    console.log('Testing version RPC...');
    const { data, error } = await supabase.rpc('get_server_version');
    
    results.getVersion = {
      success: !error,
      version: data,
      error: error ? error.message : null
    };
  } catch (error) {
    console.error('Error checking version:', error);
    results.getVersion = {
      success: false,
      error: error.message
    };
  }
  
  // 3. Check if auth service is running
  try {
    console.log('Testing auth service...');
    
    // Just checking if the auth endpoint responds, not trying to authenticate
    const authEndpoint = `${projectUrl}/auth/v1/`;
    const response = await fetch(authEndpoint, {
      method: 'GET',
      headers: {
        'apikey': apiKey,
        'Accept': 'application/json'
      }
    });
    
    results.auth = {
      success: response.status !== 404, // Any response except 404 suggests the service exists
      status: response.status,
      statusText: response.statusText
    };
  } catch (error) {
    console.error('Error checking auth service:', error);
    results.auth = {
      success: false,
      error: error.message
    };
  }
  
  // Determine overall project status based on results
  const isActive = results.pingApi?.success || results.getVersion?.success || results.auth?.success;
  
  return {
    success: true,
    message: isActive 
      ? 'Supabase project appears to be active' 
      : 'Supabase project appears to be inactive or inaccessible',
    active: isActive,
    results: results,
    projectUrl: projectUrl
  };
};

export default {
  createGuestsTable,
  diagnoseDatabase,
  fixGuestsTable,
  checkSupabaseProjectStatus
}; 