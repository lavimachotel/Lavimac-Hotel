import supabase from '../supabaseClient';

/**
 * Utility function to check if Supabase is properly configured
 * @returns {Promise<Object>} - Result of the check
 */
export const checkSupabaseConnection = async () => {
  try {
    // Try to get the current session
    const { data, error } = await supabase.auth.getSession();
    
    if (error && error.message.includes('Failed to fetch')) {
      return { 
        success: false, 
        error: 'Could not connect to Supabase. Please check your URL and API key.',
        details: error.message
      };
    }
    
    return { success: true, message: 'Successfully connected to Supabase' };
  } catch (error) {
    return { 
      success: false, 
      error: 'Error checking Supabase connection',
      details: error.message
    };
  }
};

/**
 * Utility function to check if required tables exist
 * @returns {Promise<Object>} - Result of the check
 */
export const checkRequiredTables = async () => {
  try {
    const tables = [
      'access_requests',
      'permissions',
      'user_profiles',
      'user_permissions'
    ];
    
    const results = {};
    let allTablesExist = true;
    
    for (const table of tables) {
      // Try to select a single row from each table
      const { error } = await supabase
        .from(table)
        .select('*')
        .limit(1);
      
      if (error && error.code === '42P01') {
        results[table] = { exists: false, error: 'Table does not exist' };
        allTablesExist = false;
      } else if (error) {
        results[table] = { exists: false, error: error.message };
        allTablesExist = false;
      } else {
        results[table] = { exists: true };
      }
    }
    
    return { 
      success: allTablesExist, 
      message: allTablesExist ? 'All required tables exist' : 'Some tables are missing',
      tables: results
    };
  } catch (error) {
    return { 
      success: false, 
      error: 'Error checking required tables',
      details: error.message
    };
  }
};

/**
 * Utility function to create an admin user
 * @param {Object} userData - Admin user data
 * @returns {Promise<Object>} - Result of the operation
 */
export const createAdminUser = async (userData) => {
  try {
    // Create user with admin role
    const { data, error } = await supabase.auth.signUp({
      email: userData.email,
      password: userData.password,
    });
    
    if (error) throw error;
    
    // Set user role to admin
    const { error: profileError } = await supabase
      .from('user_profiles')
      .insert([
        {
          user_id: data.user.id,
          full_name: userData.fullName || 'Admin User',
          role: 'admin',
          position: 'Administrator',
          department: 'management'
        }
      ]);
    
    if (profileError) throw profileError;
    
    return { 
      success: true, 
      message: 'Admin user created successfully',
      user: data.user
    };
  } catch (error) {
    return { 
      success: false, 
      error: 'Error creating admin user',
      details: error.message
    };
  }
};

/**
 * Utility function to run the database setup script
 * @param {string} sqlScript - SQL script to run
 * @returns {Promise<Object>} - Result of the operation
 */
export const runDatabaseSetup = async (sqlScript) => {
  try {
    // This requires admin privileges
    const { error } = await supabase.rpc('exec_sql', { sql: sqlScript });
    
    if (error) throw error;
    
    return { 
      success: true, 
      message: 'Database setup completed successfully'
    };
  } catch (error) {
    return { 
      success: false, 
      error: 'Error running database setup',
      details: error.message
    };
  }
}; 