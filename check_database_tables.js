// Script to check database tables directly
// Run this with: node check_database_tables.js

const { createClient } = require('@supabase/supabase-js');

// Get Supabase URL and anon key from environment variables or use fallbacks
const supabaseUrl = process.env.REACT_APP_SUPABASE_URL || 'https://bviglsgfbwjhioeyhnin.supabase.co';
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ2aWdsc2dmYndqaGlvZXlobmluIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTYxMjgzOTEsImV4cCI6MjA3MTcwNDM5MX0.qge5aoUragEUNQbXSO1oheiW0Cog_JUBogrOKj0OoTA';

// Create a Supabase client
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkTable(tableName) {
  console.log(`\nChecking table: ${tableName}`);
  
  try {
    // Try to query the table
    const { data, error, status } = await supabase
      .from(tableName)
      .select('*')
      .limit(1);
    
    if (error) {
      console.error(`❌ Error querying table ${tableName}:`, error);
      console.error(`   HTTP Status: ${status}`);
      return { exists: false, data: null, error };
    }
    
    console.log(`✅ Table ${tableName} exists and is accessible`);
    
    // Try to count rows
    const { count, error: countError } = await supabase
      .from(tableName)
      .select('*', { count: 'exact', head: true });
    
    if (countError) {
      console.warn(`⚠️ Error counting rows in ${tableName}:`, countError);
    } else {
      console.log(`Total rows in ${tableName}: ${count || 0}`);
    }
    
    return { exists: true, data, count };
  } catch (err) {
    console.error(`❌ Exception checking table ${tableName}:`, err);
    return { exists: false, data: null, error: err };
  }
}

async function testInsertReservation() {
  console.log('\nTesting reservation insertion...');
  
  // Create test reservation data
  const testReservation = {
    room_id: 101, // Use an existing room ID
    room_type: 'Standard',
    guest_name: 'Test Guest',
    guest_email: 'test@example.com',
    guest_phone: '123-456-7890',
    check_in_date: new Date().toISOString(),
    check_out_date: new Date(Date.now() + 86400000).toISOString(), // Tomorrow
    status: 'Reserved',
    payment_method: 'Credit Card',
    payment_status: 'Pending'
  };
  
  try {
    console.log('Attempting to insert test reservation:', testReservation);
    
    const { data, error, status } = await supabase
      .from('reservations')
      .insert([testReservation])
      .select();
    
    if (error) {
      console.error('❌ Error inserting reservation:', error);
      console.error(`   HTTP Status: ${status}`);
      return { success: false, error };
    }
    
    console.log('✅ Test reservation inserted successfully:', data);
    
    // Clean up the test data
    if (data && data[0] && data[0].id) {
      const { error: deleteError } = await supabase
        .from('reservations')
        .delete()
        .eq('id', data[0].id);
      
      if (deleteError) {
        console.warn('⚠️ Could not delete test reservation:', deleteError);
      } else {
        console.log('✅ Test reservation deleted successfully');
      }
    }
    
    return { success: true, data };
  } catch (err) {
    console.error('❌ Exception during reservation insertion test:', err);
    return { success: false, error: err };
  }
}

async function testInsertRoom() {
  console.log('\nTesting room insertion...');
  
  // Create test room data
  const testRoom = {
    id: 9999,
    room_number: 9999,
    type: 'Test Room',
    status: 'Available',
    price: 150.00,
    capacity: 2,
    amenities: ['WiFi', 'TV', 'Air Conditioning']
  };
  
  try {
    console.log('Attempting to insert test room:', testRoom);
    
    const { data, error, status } = await supabase
      .from('rooms')
      .insert([testRoom])
      .select();
    
    if (error) {
      console.error('❌ Error inserting room:', error);
      console.error(`   HTTP Status: ${status}`);
      return { success: false, error };
    }
    
    console.log('✅ Test room inserted successfully:', data);
    
    // Clean up the test data
    const { error: deleteError } = await supabase
      .from('rooms')
      .delete()
      .eq('id', testRoom.id);
    
    if (deleteError) {
      console.warn('⚠️ Could not delete test room:', deleteError);
    } else {
      console.log('✅ Test room deleted successfully');
    }
    
    return { success: true, data };
  } catch (err) {
    console.error('❌ Exception during room insertion test:', err);
    return { success: false, error: err };
  }
}

async function runTests() {
  console.log('=== SUPABASE DATABASE TABLE TESTS ===');
  console.log(`URL: ${supabaseUrl}`);
  console.log(`Date/Time: ${new Date().toISOString()}`);
  console.log('======================================');
  
  // Check for tables
  const roomsCheck = await checkTable('rooms');
  const reservationsCheck = await checkTable('reservations');
  
  // Test insertions if tables exist
  if (roomsCheck.exists) {
    await testInsertRoom();
  } else {
    console.log('⚠️ Skipping room insertion test because table does not exist');
  }
  
  if (reservationsCheck.exists) {
    await testInsertReservation();
  } else {
    console.log('⚠️ Skipping reservation insertion test because table does not exist');
  }
  
  console.log('\n=== TESTS COMPLETE ===');
}

// Run all tests
runTests().catch(err => {
  console.error('Unhandled error in tests:', err);
}); 