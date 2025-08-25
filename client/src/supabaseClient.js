import { createClient } from '@supabase/supabase-js';

// Get Supabase URL and anon key from environment variables
// Provide fallback values to prevent runtime errors
const supabaseUrl = process.env.REACT_APP_SUPABASE_URL || 'https://bviglsgfbwjhioeyhnin.supabase.co';
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ2aWdsc2dmYndqaGlvZXlobmluIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTYxMjgzOTEsImV4cCI6MjA3MTcwNDM5MX0.qge5aoUragEUNQbXSO1oheiW0Cog_JUBogrOKj0OoTA';

// Log environment variable status for debugging
console.log(`REACT_APP_SUPABASE_URL environment variable: ${process.env.REACT_APP_SUPABASE_URL ? 'defined' : 'undefined'}`);
console.log(`REACT_APP_SUPABASE_ANON_KEY environment variable: ${process.env.REACT_APP_SUPABASE_ANON_KEY ? 'defined' : 'undefined'}`);

// Validate environment variables
if (!process.env.REACT_APP_SUPABASE_URL || process.env.REACT_APP_SUPABASE_URL === 'https://bviglsgfbwjhioeyhnin.supabase.co') {
  console.warn(
    'Using fallback Supabase URL. For production, set REACT_APP_SUPABASE_URL in your .env file with your actual Supabase URL.'
  );
}

if (!process.env.REACT_APP_SUPABASE_ANON_KEY || process.env.REACT_APP_SUPABASE_ANON_KEY === 'your-anon-key') {
  console.warn(
    'Using fallback Supabase anon key. For production, set REACT_APP_SUPABASE_ANON_KEY in your .env file with your actual anon key.'
  );
}

// Validate URL format
if (!supabaseUrl.startsWith('http')) {
  console.error('Invalid Supabase URL format. The URL should start with http:// or https://');
}

// Custom fetch with retry logic
const fetchWithRetry = async (url, options, maxRetries = 3, timeout = 60000) => {
  let retries = 0;
  
  while (retries < maxRetries) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);
      
      const response = await fetch(url, {
        ...options,
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      // If the response is ok, return it
      if (response.ok) {
        return response;
      }
      
      // If we get a 5xx error, retry
      if (response.status >= 500) {
        console.warn(`Supabase request failed with status ${response.status}, retrying (${retries + 1}/${maxRetries})...`);
        retries++;
        // Wait before retrying (exponential backoff)
        await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, retries)));
        continue;
      }
      
      // For other errors, just return the response
      return response;
    } catch (error) {
      // If we get a network error or timeout, retry
      if (error.name === 'AbortError' || error.name === 'TypeError' || error.message.includes('network')) {
        console.warn(`Supabase request failed with error: ${error.message}, retrying (${retries + 1}/${maxRetries})...`);
        retries++;
        // Wait before retrying (exponential backoff)
        await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, retries)));
        continue;
      }
      
      // For other errors, throw
      throw error;
    }
  }
  
  // If we've exhausted all retries, throw an error
  throw new Error(`Failed after ${maxRetries} retries`);
};

// Enhanced logging for RLS-related errors
const logRLSError = (error, operation, tableName) => {
  if (error && error.code === '42501') {
    console.error(`RLS Policy Error: Permission denied when performing ${operation} on ${tableName}.`);
    console.error('This is likely due to Row Level Security policies preventing this operation.');
    console.error(`Error details: ${error.message}`);
    console.error(`Recommended fix: Check that the RLS policies for the ${tableName} table allow the current user to perform this operation.`);
    console.error('You may need to run the fix_user_profiles_rls.sql script to fix the policies.');
  } else if (error && error.details && error.details.includes('policy')) {
    console.error(`RLS Policy Error: ${error.message}`);
    console.error(`Error details: ${error.details}`);
    console.error('This is likely due to Row Level Security policies preventing this operation.');
  }
  return error;
};

// Create a custom Supabase client with error handling
const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  },
  global: {
    // Add hooks for logging errors
    fetch: (...args) => {
      // Extract request information for better error logging
      const url = args[0];
      const method = args[1]?.method || 'GET';
      let tableName = 'unknown';
      
      // Try to extract table name from URL
      try {
        const urlObj = new URL(url);
        const pathParts = urlObj.pathname.split('/');
        if (pathParts.includes('rest') && pathParts.includes('v1')) {
          const restIndex = pathParts.indexOf('rest');
          if (restIndex >= 0 && restIndex + 2 < pathParts.length) {
            tableName = pathParts[restIndex + 2];
          }
        }
      } catch (e) {
        // Ignore URL parsing errors
      }
      
      return fetch(...args).then(async response => {
        // Log auth errors
        if (response.status === 401) {
          console.warn('Supabase authentication error: Unauthorized (401). Session may have expired or credentials may be invalid.');
          
          // Try to get current session and refresh token if needed
          const { data: sessionData } = await supabase.auth.getSession();
          if (sessionData?.session) {
            console.log('Session exists, attempting to refresh token...');
            const { data, error } = await supabase.auth.refreshSession();
            if (error) {
              console.error('Error refreshing session token:', error);
            } else if (data) {
              console.log('Successfully refreshed session token');
              // Retry the request with new token
              const newHeaders = new Headers(args[1]?.headers || {});
              newHeaders.set('Authorization', `Bearer ${data.session.access_token}`);
              
              const newOptions = {
                ...args[1],
                headers: newHeaders
              };
              
              // Return a new request with the updated token
              return fetch(args[0], newOptions);
            }
          } else {
            console.log('No session found, continuing as anonymous user');
          }
        }
        // Log permission errors in more detail
        if (response.status === 403) {
          console.warn(`Supabase permission error: Forbidden (403) when ${method} on ${tableName}. This may be due to Row Level Security policies.`);
          
          // Clone and read the response for error details
          const clonedResponse = response.clone();
          try {
            const errorData = await clonedResponse.json();
            if (errorData.error) {
              logRLSError(errorData, method, tableName);
            }
          } catch (e) {
            // Ignore JSON parsing errors
          }
        }
        
        return response;
      });
    }
  }
});

// Add RLS error logging to specific methods without breaking the API
const originalFrom = supabase.from;
supabase.from = function(tableName) {
  const queryBuilder = originalFrom.call(this, tableName);
  
  // Save the original methods
  const originalInsert = queryBuilder.insert;
  const originalUpdate = queryBuilder.update;
  
  // Override insert method with logging
  queryBuilder.insert = function(data, options) {
    const result = originalInsert.call(this, data, options);
    
    // Add error logging to the promise chain
    const originalThen = result.then;
    result.then = function(onFulfilled, onRejected) {
      return originalThen.call(this, onFulfilled, 
        (error) => {
          if (error) {
            logRLSError(error, 'INSERT', tableName);
          }
          if (onRejected) return onRejected(error);
          return Promise.reject(error);
        }
      );
    };
    
    return result;
  };
  
  // Override update method with logging
  queryBuilder.update = function(data, options) {
    const result = originalUpdate.call(this, data, options);
    
    // Add error logging to the promise chain
    const originalThen = result.then;
    result.then = function(onFulfilled, onRejected) {
      return originalThen.call(this, onFulfilled, 
        (error) => {
          if (error) {
            logRLSError(error, 'UPDATE', tableName);
          }
          if (onRejected) return onRejected(error);
          return Promise.reject(error);
        }
      );
    };
    
    return result;
  };
  
  return queryBuilder;
};

// Log auth state changes for debugging
supabase.auth.onAuthStateChange((event, session) => {
  console.log(`Supabase auth state changed: ${event}`, session ? 'User is logged in' : 'No user logged in');
});

// Add a simple health check function to test connection
export const checkSupabaseConnection = async () => {
  try {
    // A simple query to check if Supabase is reachable
    const startTime = Date.now();
    const { data, error } = await supabase.from('health_check').select('*').limit(1);
    const endTime = Date.now();
    
    if (error && error.code !== 'PGRST116') {
      console.error('Supabase connection health check failed:', error);
      return { success: false, message: error.message, latency: endTime - startTime };
    }
    
    console.log(`Supabase connection health check successful. Latency: ${endTime - startTime}ms`);
    return { success: true, latency: endTime - startTime };
  } catch (err) {
    console.error('Supabase connection test failed with exception:', err);
    return { success: false, message: err.message };
  }
};

// Test access to a specific table
export const testTableAccess = async (tableName, operation = 'select') => {
  try {
    let result;
    const startTime = Date.now();
    
    switch (operation) {
      case 'select':
        result = await supabase.from(tableName).select('*').limit(1);
        break;
      case 'insert':
        // Create a test row with a unique ID that we can easily delete
        const testId = `test_${Date.now()}`;
        result = await supabase.from(tableName).insert({
          id: testId,
          test_field: 'This is a test entry',
          created_at: new Date().toISOString()
        });
        // If successful, delete the test row
        if (!result.error) {
          await supabase.from(tableName).delete().eq('id', testId);
        }
        break;
      case 'update':
        result = await supabase.from(tableName)
          .update({ updated_at: new Date().toISOString() })
          .eq('id', 'non_existent_id'); // Should fail softly if no rows match
        break;
      case 'delete':
        result = await supabase.from(tableName)
          .delete()
          .eq('id', 'non_existent_id'); // Should fail softly if no rows match
        break;
      default:
        return { success: false, message: `Unknown operation: ${operation}` };
    }
    
    const endTime = Date.now();
    
    if (result.error) {
      console.error(`Supabase ${operation} test on ${tableName} failed:`, result.error);
      return { 
        success: false, 
        message: result.error.message,
        code: result.error.code,
        details: result.error.details,
        operation,
        tableName,
        latency: endTime - startTime 
      };
    }
    
    console.log(`Supabase ${operation} test on ${tableName} successful. Latency: ${endTime - startTime}ms`);
    return { 
      success: true, 
      data: result.data, 
      operation,
      tableName,
      latency: endTime - startTime 
    };
  } catch (err) {
    console.error(`Supabase ${operation} test on ${tableName} failed with exception:`, err);
    return { success: false, message: err.message, operation, tableName };
  }
};

// Utility to diagnose RLS issues
export const diagnoseRLSIssues = async () => {
  const tables = ['rooms', 'reservations', 'users', 'health_check'];
  const operations = ['select', 'insert', 'update', 'delete'];
  const results = {};
  
  console.log('Starting Supabase RLS diagnosis...');
  console.log(`Auth status: ${supabase.auth.getSession() ? 'Authenticated' : 'Not authenticated'}`);
  
  for (const table of tables) {
    results[table] = {};
    for (const operation of operations) {
      console.log(`Testing ${operation} on ${table}...`);
      results[table][operation] = await testTableAccess(table, operation);
    }
  }
  
  console.log('RLS diagnosis complete:', results);
  return results;
};

// Log Supabase client initialization
console.log(`Supabase client initialized with URL: ${supabaseUrl}`);

/**
 * Lists all tables in the public schema
 */
export const listTables = async () => {
  // This function will be implemented as an RPC on the server
  // For now, we'll simulate it client-side by querying pg_tables
  try {
    const { data, error } = await supabase.rpc('list_tables');
    
    if (error) {
      // Fallback if RPC doesn't exist: query using PostgreSQL system catalog
      console.log('RPC list_tables not available, using fallback');
      const { data: fallbackData, error: fallbackError } = await supabase
        .from('_rpc')
        .select('*')
        .eq('name', 'list_tables')
        .limit(1);
      
      if (fallbackError || !fallbackData || fallbackData.length === 0) {
        console.error('Unable to list tables:', error);
        return [];
      }
    }
    
    return data || [];
  } catch (error) {
    console.error('Exception listing tables:', error);
    return [];
  }
};

/**
 * Checks if row-level security is enabled on a table
 * @param {string} tableName - The name of the table to check
 */
export const checkRLSEnabled = async (tableName) => {
  try {
    const { data, error } = await supabase.rpc('check_rls_enabled', { table_name: tableName });
    
    if (error) {
      console.error('Unable to check RLS:', error);
      return null;
    }
    
    return data;
  } catch (error) {
    console.error('Exception checking RLS:', error);
    return null;
  }
};

/**
 * Lists all policies for a specific table
 * @param {string} tableName - The name of the table to check
 */
export const listPolicies = async (tableName) => {
  try {
    const { data, error } = await supabase.rpc('list_policies', { table_name: tableName });
    
    if (error) {
      console.error('Unable to list policies:', error);
      return [];
    }
    
    return data || [];
  } catch (error) {
    console.error('Exception listing policies:', error);
    return [];
  }
};

/**
 * Executes a SQL query (admin only)
 * @param {string} query - The SQL query to execute
 */
export const runSQLQuery = async (query) => {
  try {
    const { data, error } = await supabase.rpc('run_sql_query', { query });
    
    if (error) {
      console.error('Unable to run SQL query:', error);
      return { success: false, error };
    }
    
    return { success: true, data };
  } catch (error) {
    console.error('Exception running SQL query:', error);
    return { success: false, error };
  }
};

export default supabase;