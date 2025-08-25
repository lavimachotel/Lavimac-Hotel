/**
 * Test script to create a sample access request
 * 
 * To run this script, add it to your AdminAccessControl.jsx:
 * import '../create_test_request'; // Create test request
 */

import supabase from './supabaseClient';

(async () => {
  console.log('----- TEST ACCESS REQUEST CREATION -----');
  
  try {
    // 0. Check authentication status first
    console.log('Checking authentication status...');
    const { data: authData, error: authError } = await supabase.auth.getSession();
    
    if (authError) {
      console.error('❌ Authentication error:', authError);
      return;
    }
    
    if (!authData.session) {
      console.log('⚠️ Not authenticated. Anonymous access requests might still work if policy allows.');
    } else {
      console.log('✅ User authenticated as:', authData.session.user.email);
      console.log('JWT data:', authData.session);
    }
    
    // 1. Check if we can insert a record
    console.log('Attempting to create a test access request...');
    
    const testRequest = {
      full_name: 'Test User ' + new Date().toISOString().slice(0, 16),
      email: 'test' + Math.floor(Math.random() * 10000) + '@example.com',
      position: 'Test Position',
      department: 'front_desk',
      reason: 'Testing access requests functionality',
      contact_number: '123-456-7890',
      request_date: new Date().toISOString(),
      status: 'pending' // Explicitly set status to ensure correct case
    };
    
    console.log('Request data:', testRequest);
    
    const { data: insertData, error: insertError } = await supabase
      .from('access_requests')
      .insert([testRequest])
      .select();
      
    if (insertError) {
      console.error('❌ Error creating test request:', insertError);
      console.log('⚠️ You need to run the SQL script to fix policies in the Supabase dashboard.');
    } else {
      console.log('✅ Test request created successfully:', insertData);
      
      // 2. Try to retrieve the record we just inserted
      const newRequestId = insertData[0].id;
      console.log('Attempting to retrieve the test request by ID:', newRequestId);
      
      const { data: retrieveData, error: retrieveError } = await supabase
        .from('access_requests')
        .select('*')
        .eq('id', newRequestId)
        .single();
        
      if (retrieveError) {
        console.error('❌ Error retrieving test request:', retrieveError);
        console.log('⚠️ This could be due to RLS policies preventing reading. Run the SQL script.');
      } else {
        console.log('✅ Test request retrieved successfully:', retrieveData);
      }
      
      // 3. Try to retrieve all pending requests
      console.log('Attempting to retrieve all pending requests...');
      
      const { data: pendingData, error: pendingError } = await supabase
        .from('access_requests')
        .select('*')
        .eq('status', 'pending');
        
      if (pendingError) {
        console.error('❌ Error retrieving pending requests:', pendingError);
      } else {
        console.log(`✅ Retrieved ${pendingData.length} pending requests:`, pendingData);
        if (pendingData.length === 0) {
          console.log('⚠️ No pending requests found, even though we just created one!');
          console.log('⚠️ This suggests RLS policies are preventing reading. Run the SQL script.');
        }
      }
    }
  } catch (e) {
    console.error('Unexpected error in test script:', e);
  }
  
  console.log('----- END TEST ACCESS REQUEST CREATION -----');
})(); 