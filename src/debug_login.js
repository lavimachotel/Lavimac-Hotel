import supabase from './supabaseClient';

/**
 * Debug function to check if a user exists in Supabase Auth and staff_credentials
 * Run this in browser console: debugLoginIssue('email@example.com')
 */
window.debugLoginIssue = async (email) => {
  if (!email) {
    console.error('Please provide an email to check');
    return;
  }

  console.log(`🔍 Debugging login issues for email: ${email}`);
  console.log('════════════════════════════════════════');
  
  try {
    // Step 1: Check if the email exists in staff_credentials
    console.log('Checking staff_credentials table...');
    const { data: credData, error: credError } = await supabase
      .from('staff_credentials')
      .select('*')
      .eq('email', email);
      
    if (credError) {
      console.error('Error checking staff_credentials:', credError);
    } else {
      console.log(`Found ${credData?.length || 0} records in staff_credentials:`, credData);
    }

    // Step 2: Try to get the user ID from user_profiles
    console.log('\nChecking user_profiles table...');
    const { data: profileData, error: profileError } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('email', email)
      .maybeSingle();
      
    if (profileError) {
      console.error('Error checking user_profiles:', profileError);
    } else if (profileData) {
      console.log('Found user profile:', profileData);
    } else {
      console.log('No matching user profile found');
    }

    // Step 3: Check for pending access requests
    console.log('\nChecking access_requests table...');
    const { data: requestData, error: requestError } = await supabase
      .from('access_requests')
      .select('*')
      .eq('email', email)
      .maybeSingle();
      
    if (requestError) {
      console.error('Error checking access_requests:', requestError);
    } else if (requestData) {
      console.log('Found access request:', requestData);
    } else {
      console.log('No matching access request found');
    }

    // Step 4: Check if admin account can be used
    console.log('\nTesting admin login functionality...');
    try {
      const adminResult = await fetch('/api/debug/admin-check-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      }).then(r => r.json());
      
      console.log('Admin check result:', adminResult);
    } catch (adminErr) {
      console.log('Admin check not available:', adminErr);
    }

    // Step 5: Test direct password login
    console.log('\nTo test login, run in the console:');
    console.log(`testLogin('${email}', 'your-password-here');`);
    
    // Step 6: Try direct RPC function if available
    console.log('\nTo reset password using RPC function, run:');
    console.log(`resetUserPassword('${email}', 'new-password-here');`);
    
  } catch (err) {
    console.error('Error during debug:', err);
  }
  
  console.log('════════════════════════════════════════');
  console.log('Debug complete! Check the logs above for clues.');
};

/**
 * Test login function that can be called from the browser console
 */
window.testLogin = async (email, password) => {
  if (!email || !password) {
    console.error('Please provide both email and password');
    return;
  }
  
  console.log(`Attempting login with ${email}...`);
  
  try {
    // Try directly with Supabase Auth
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    
    if (error) {
      console.error('Login failed:', error);
      
      // Check if the user exists in staff_credentials
      const { data: credData } = await supabase
        .from('staff_credentials')
        .select('*')
        .eq('email', email)
        .maybeSingle();
        
      if (credData) {
        console.log('Found credentials in staff_credentials but login failed.');
        console.log('This suggests the password in Supabase Auth differs from staff_credentials table.');
      }
    } else {
      console.log('Login successful!', data);
      console.log('User ID:', data.user.id);
      console.log('Session:', data.session);
    }
  } catch (err) {
    console.error('Unexpected error during login test:', err);
  }
};

/**
 * Reset a user's password via RPC function
 * Requires the SQL script to be executed first
 */
window.resetUserPassword = async (email, newPassword) => {
  if (!email || !newPassword) {
    console.error('Please provide both email and new password');
    return;
  }
  
  console.log(`Attempting to reset password for ${email}...`);
  
  try {
    // First, find the user ID
    const { data: userData, error: userError } = await supabase
      .from('staff_credentials') 
      .select('user_id')
      .eq('email', email)
      .maybeSingle();
      
    if (userError || !userData) {
      console.error('Could not find user:', userError || 'No user found');
      return;
    }
    
    const userId = userData.user_id;
    console.log(`Found user ID: ${userId}`);
    
    // Call the RPC function to reset password
    const { data, error } = await supabase.rpc(
      'admin_update_user_password',
      { p_user_id: userId, p_password: newPassword }
    );
    
    if (error) {
      console.error('Password reset failed:', error);
      console.log('Make sure you ran the SQL script in the Supabase SQL Editor!');
    } else {
      console.log('Password reset successful!', data);
      console.log(`You can now log in with ${email} and your new password.`);
    }
  } catch (err) {
    console.error('Unexpected error during password reset:', err);
  }
};

/**
 * Direct synchronization function to fix all passwords
 */
window.syncAllPasswords = async () => {
  console.log('Attempting to sync all passwords between staff_credentials and auth...');
  
  try {
    const { data, error } = await supabase.rpc('sync_staff_credentials_to_auth');
    
    if (error) {
      console.error('Sync failed:', error);
      console.log('Make sure you ran the SQL script in the Supabase SQL Editor!');
    } else {
      console.log(`Successfully synced ${data} user passwords!`);
      console.log('You should now be able to log in with staff credentials.');
    }
  } catch (err) {
    console.error('Unexpected error during sync:', err);
  }
};

// Auto-execute to register the debug functions
console.log('Debug login utils loaded. To debug login issues, open the browser console and run:');
console.log('debugLoginIssue("email@example.com")');
console.log('Or to sync all passwords: syncAllPasswords()'); 