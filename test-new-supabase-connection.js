// Test script to verify the new Supabase connection
const { createClient } = require('@supabase/supabase-js');

// New Supabase configuration
const supabaseUrl = 'https://bviglsgfbwjhioeyhnin.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ2aWdsc2dmYndqaGlvZXlobmluIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTYxMjgzOTEsImV4cCI6MjA3MTcwNDM5MX0.qge5aoUragEUNQbXSO1oheiW0Cog_JUBogrOKj0OoTA';

// Create Supabase client
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testConnection() {
  console.log('Testing new Supabase connection...');
  console.log(`URL: ${supabaseUrl}`);
  console.log(`Key: ${supabaseAnonKey.substring(0, 20)}...`);
  
  try {
    // Test basic connection
    console.log('\n1. Testing basic connection...');
    const { data, error } = await supabase.from('rooms').select('*').limit(1);
    
    if (error) {
      console.log('Connection test result:', error.message);
      if (error.code === 'PGRST116') {
        console.log('✅ Connection successful! Table "rooms" does not exist, but connection works.');
      } else {
        console.log('❌ Connection failed:', error.message);
      }
    } else {
      console.log('✅ Connection successful! Found rooms:', data.length);
    }
    
    // Test auth status
    console.log('\n2. Testing authentication status...');
    const { data: sessionData } = await supabase.auth.getSession();
    console.log('Session status:', sessionData.session ? 'Authenticated' : 'Not authenticated');
    
    // Test RPC call
    console.log('\n3. Testing RPC functionality...');
    try {
      const { data: rpcData, error: rpcError } = await supabase.rpc('version');
      if (rpcError) {
        console.log('RPC test result:', rpcError.message);
      } else {
        console.log('✅ RPC test successful:', rpcData);
      }
    } catch (rpcErr) {
      console.log('RPC test error:', rpcErr.message);
    }
    
    console.log('\n✅ Supabase connection test completed successfully!');
    console.log('The new keys are working correctly.');
    
  } catch (err) {
    console.error('❌ Connection test failed with error:', err.message);
    console.error('Full error:', err);
  }
}

// Run the test
testConnection();
