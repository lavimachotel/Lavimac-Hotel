/*
 * Debug script for access requests issue
 * 
 * Add this code to a new file in the client/src directory and import it
 * at the top of your AdminAccessControl.jsx file:
 * 
 * import '../debug_requests'; // Debug access requests
 */

import supabase from './supabaseClient';

// Self-executing async function
(async () => {
  console.log('----- ACCESS REQUESTS DEBUG -----');
  
  // 1. Check authentication status
  console.log('1. Checking authentication status...');
  const { data: authData, error: authError } = await supabase.auth.getSession();
  console.log('Auth data:', authData);
  if (authError) console.error('Auth error:', authError);
  
  // 2. Try to get user role from JWT
  const jwt = authData?.session?.access_token;
  if (jwt) {
    try {
      // JWT is base64 encoded in 3 parts: header.payload.signature
      const payload = jwt.split('.')[1];
      const decodedPayload = JSON.parse(atob(payload));
      console.log('JWT payload:', decodedPayload);
      console.log('User role from JWT:', decodedPayload?.role);
    } catch (e) {
      console.error('Error decoding JWT:', e);
    }
  }
  
  // 3. Get count of all tables
  console.log('2. Checking table counts...');
  
  try {
    // Fixed count query - using the correct PostgREST syntax
    const { count: profileCount, error: profileError } = await supabase
      .from('user_profiles')
      .select('*', { count: 'exact', head: true });
    
    console.log('user_profiles count:', profileCount);
    if (profileError) console.error('Error counting user_profiles:', profileError);
    
    const { count: requestCount, error: requestError } = await supabase
      .from('access_requests')
      .select('*', { count: 'exact', head: true });
    
    console.log('access_requests count:', requestCount);
    if (requestError) console.error('Error counting access_requests:', requestError);
    
    // 4. Try to get all access requests regardless of status
    console.log('3. Fetching all access requests...');
    const { data: allRequests, error: allRequestsError } = await supabase
      .from('access_requests')
      .select('*');
    
    if (allRequestsError) {
      console.error('Error fetching all requests:', allRequestsError);
    } else {
      console.log(`Found ${allRequests?.length || 0} total access requests:`);
      console.log(allRequests);
      
      // 5. Check status distribution
      const statusCounts = {};
      allRequests?.forEach(req => {
        statusCounts[req.status] = (statusCounts[req.status] || 0) + 1;
      });
      console.log('Status distribution:', statusCounts);
    }
    
    // 6. Try to get specifically pending requests
    console.log('4. Fetching specifically pending requests...');
    const { data: pendingRequests, error: pendingError } = await supabase
      .from('access_requests')
      .select('*')
      .eq('status', 'pending');
    
    if (pendingError) {
      console.error('Error fetching pending requests:', pendingError);
    } else {
      console.log(`Found ${pendingRequests?.length || 0} pending requests:`);
      console.log(pendingRequests);
    }
  } catch (e) {
    console.error('Unexpected error in debug script:', e);
  }
  
  console.log('----- END DEBUG -----');
})(); 