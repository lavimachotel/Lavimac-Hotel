// Script to check database setup and table existence
// Run this with: node check_database_setup.js

const { createClient } = require('@supabase/supabase-js');

// Get Supabase URL and anon key from environment variables or use fallbacks
const supabaseUrl = process.env.REACT_APP_SUPABASE_URL || 'https://bviglsgfbwjhioeyhnin.supabase.co';
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ2aWdsc2dmYndqaGlvZXlobmluIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTYxMjgzOTEsImV4cCI6MjA3MTcwNDM5MX0.qge5aoUragEUNQbXSO1oheiW0Cog_JUBogrOKj0OoTA';

// Create a Supabase client
const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Function to check table existence and structure
async function checkTable(tableName) {
  console.log(`\nChecking table: ${tableName}`);
  
  try {
    // Try to query table information
    const { data, error } = await supabase
      .from('information_schema.columns')
      .select('column_name, data_type, is_nullable')
      .eq('table_name', tableName)
      .eq('table_schema', 'public');
    
    if (error) {
      console.error(`Error checking table ${tableName}:`, error);
      return { exists: false, columns: [] };
    }
    
    if (!data || data.length === 0) {
      console.log(`⚠️ Table ${tableName} does not exist`);
      return { exists: false, columns: [] };
    }
    
    console.log(`✅ Table ${tableName} exists with ${data.length} columns`);
    console.log('Columns:');
    data.forEach(col => {
      console.log(`  - ${col.column_name} (${col.data_type}, ${col.is_nullable === 'YES' ? 'nullable' : 'not nullable'})`);
    });
    
    // Try to count rows
    const { data: countData, error: countError } = await supabase
      .from(tableName)
      .select('*', { count: 'exact', head: true });
    
    if (countError) {
      console.error(`Error counting rows in ${tableName}:`, countError);
    } else {
      console.log(`Total rows in ${tableName}: ${countData.count || 0}`);
    }
    
    return { exists: true, columns: data };
  } catch (err) {
    console.error(`Exception checking table ${tableName}:`, err);
    return { exists: false, columns: [] };
  }
}

// Function to test row insertion
async function testInsert(tableName, testData) {
  console.log(`\nTesting insertion into ${tableName}`);
  
  try {
    // Add a test_ prefix to identify test records
    const testRecord = {
      ...testData,
      _test_id: `test_${Date.now()}`
    };
    
    console.log('Inserting test record:', testRecord);
    
    const { data, error } = await supabase
      .from(tableName)
      .insert([testRecord])
      .select();
    
    if (error) {
      console.error(`❌ Error inserting into ${tableName}:`, error);
      return { success: false, error };
    }
    
    console.log(`✅ Successfully inserted test record into ${tableName}:`, data);
    
    // Clean up test data
    try {
      const { error: deleteError } = await supabase
        .from(tableName)
        .delete()
        .eq('_test_id', testRecord._test_id);
      
      if (deleteError) {
        console.warn(`Warning: Could not delete test record:`, deleteError);
      } else {
        console.log('Test record deleted successfully');
      }
    } catch (cleanupErr) {
      console.warn('Warning: Exception during test cleanup:', cleanupErr);
    }
    
    return { success: true, data };
  } catch (err) {
    console.error(`Exception testing insertion into ${tableName}:`, err);
    return { success: false, error: err };
  }
}

// Check database connection
async function checkConnection() {
  console.log('Checking Supabase connection...');
  
  try {
    const { data, error } = await supabase.auth.getSession();
    
    if (error) {
      console.error('❌ Connection error:', error);
      return false;
    }
    
    console.log('✅ Successfully connected to Supabase');
    console.log(`Session info: ${data.session ? 'Authenticated session found' : 'No active session'}`);
    
    return true;
  } catch (err) {
    console.error('❌ Exception checking connection:', err);
    return false;
  }
}

// Run all checks
async function runDiagnostics() {
  console.log('=== SUPABASE DATABASE DIAGNOSTICS ===');
  console.log(`URL: ${supabaseUrl}`);
  console.log(`Date/Time: ${new Date().toISOString()}`);
  console.log('=====================================');
  
  const connected = await checkConnection();
  if (!connected) {
    console.error('Cannot proceed with diagnostics due to connection error');
    return;
  }
  
  // Check main tables
  const roomsCheck = await checkTable('rooms');
  const reservationsCheck = await checkTable('reservations');
  
  // Test inserting records if tables exist
  if (roomsCheck.exists) {
    await testInsert('rooms', {
      id: 9999,
      room_number: 9999,
      type: 'Test Room',
      status: 'Available',
      price: 100,
      capacity: 2,
      amenities: ['Test'],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    });
  }
  
  if (reservationsCheck.exists) {
    await testInsert('reservations', {
      room_id: 101, // Using a likely existing room ID
      room_type: 'Test',
      guest_name: 'Test Guest',
      guest_email: 'test@example.com',
      guest_phone: '123-456-7890',
      check_in_date: new Date().toISOString(),
      check_out_date: new Date(Date.now() + 86400000).toISOString(), // Tomorrow
      status: 'Reserved',
      payment_method: 'Test',
      payment_status: 'Pending',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    });
  }
  
  console.log('\n=== DIAGNOSTICS COMPLETE ===');
}

// Run diagnostics
runDiagnostics().catch(err => {
  console.error('Unhandled error in diagnostics:', err);
}); 