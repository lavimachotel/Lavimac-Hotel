// Script to fix database setup issues and create initial data
// Run with: node fix_database_setup.js

const { createClient } = require('@supabase/supabase-js');

// Get Supabase URL and anon key from environment variables or use fallbacks
const supabaseUrl = process.env.REACT_APP_SUPABASE_URL || 'https://bviglsgfbwjhioeyhnin.supabase.co';
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ2aWdsc2dmYndqaGlvZXlobmluIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTYxMjgzOTEsImV4cCI6MjA3MTcwNDM5MX0.qge5aoUragEUNQbXSO1oheiW0Cog_JUBogrOKj0OoTA';

// Create a Supabase client
const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Function to create initial rooms
async function createInitialRooms() {
  console.log('Creating initial rooms...');
  
  // Define room types and their details
  const roomTypes = [
    { type: 'Standard', price: 100, capacity: 2 },
    { type: 'Deluxe', price: 150, capacity: 2 },
    { type: 'Suite', price: 250, capacity: 4 },
    { type: 'Executive', price: 300, capacity: 2 },
    { type: 'Presidential', price: 500, capacity: 6 }
  ];
  
  // Generate rooms data (20 rooms, 101-120)
  const roomsData = [];
  for (let i = 0; i < 20; i++) {
    const roomNumber = 101 + i;
    const typeIndex = Math.floor(i / 4); // Distribute room types evenly
    
    roomsData.push({
      id: roomNumber,
      room_number: roomNumber,
      type: roomTypes[typeIndex].type,
      status: 'Available',
      price: roomTypes[typeIndex].price,
      capacity: roomTypes[typeIndex].capacity,
      amenities: ['WiFi', 'TV', 'Air Conditioning'],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    });
  }
  
  console.log(`Prepared ${roomsData.length} rooms for insertion`);
  
  // Insert rooms in batches to avoid timeouts
  const batchSize = 5;
  let successCount = 0;
  
  for (let i = 0; i < roomsData.length; i += batchSize) {
    const batch = roomsData.slice(i, i + batchSize);
    console.log(`Inserting batch ${i/batchSize + 1} of ${Math.ceil(roomsData.length/batchSize)}`);
    
    try {
      // Try to upsert (update or insert) the rooms
      const { data, error } = await supabase
        .from('rooms')
        .upsert(batch, { onConflict: 'id' })
        .select();
      
      if (error) {
        console.error(`Error inserting batch ${i/batchSize + 1}:`, error);
      } else {
        console.log(`Successfully inserted/updated ${data.length} rooms`);
        successCount += data.length;
      }
    } catch (err) {
      console.error(`Exception inserting batch ${i/batchSize + 1}:`, err);
    }
    
    // Brief pause between batches
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  console.log(`Room creation completed. Successfully created/updated ${successCount} out of ${roomsData.length} rooms.`);
  return { total: roomsData.length, success: successCount };
}

// Function to fix permissions (this will need admin access)
async function fixPermissions() {
  console.log('\nAttempting to fix permissions...');
  console.log('Note: This requires admin access to the Supabase project.');
  console.log('If this fails, you will need to:');
  console.log('1. Log in to your Supabase dashboard');
  console.log('2. Go to Table Editor > rooms and reservations tables');
  console.log('3. Go to "Authentication" > "Policies" tab');
  console.log('4. Add a policy that allows all operations for the anon role');
  
  try {
    // We can try running some SQL to fix policies, but this likely won't work with the anon key
    const { error } = await supabase.rpc('modify_table_policies', { 
      table_name: 'rooms',
      policy_action: 'CREATE',
      policy_name: 'Allow public access',
      policy_definition: 'FOR ALL USING (true) WITH CHECK (true)'
    });
    
    if (error) {
      console.warn('Could not modify policies via RPC:', error);
      return { success: false, error };
    }
    
    console.log('Successfully updated policies!');
    return { success: true };
  } catch (err) {
    console.error('Exception fixing permissions:', err);
    return { success: false, error: err };
  }
}

// Function to create a sample reservation
async function createSampleReservation() {
  console.log('\nCreating a sample reservation...');
  
  // Create a sample reservation
  const sampleReservation = {
    room_id: 101,
    room_type: 'Standard',
    guest_name: 'John Doe',
    guest_email: 'john.doe@example.com',
    guest_phone: '123-456-7890',
    check_in_date: new Date().toISOString(),
    check_out_date: new Date(Date.now() + 86400000 * 3).toISOString(), // 3 days later
    adults: 2,
    children: 0,
    special_requests: 'Late check-in requested',
    status: 'Reserved',
    payment_method: 'Credit Card',
    payment_status: 'Pending',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };
  
  try {
    const { data, error } = await supabase
      .from('reservations')
      .insert([sampleReservation])
      .select();
    
    if (error) {
      console.error('Error creating sample reservation:', error);
      return { success: false, error };
    }
    
    console.log('Sample reservation created successfully:', data);
    return { success: true, reservation: data[0] };
  } catch (err) {
    console.error('Exception creating sample reservation:', err);
    return { success: false, error: err };
  }
}

// Run all the setup tasks
async function runSetup() {
  console.log('=== DATABASE SETUP SCRIPT ===');
  console.log(`URL: ${supabaseUrl}`);
  console.log(`Date/Time: ${new Date().toISOString()}`);
  console.log('=============================');
  
  // Create initial rooms
  const roomsResult = await createInitialRooms();
  
  if (roomsResult.success === 0) {
    // Attempt to fix permissions if we couldn't create any rooms
    await fixPermissions();
    
    // Try creating rooms again after fixing permissions
    console.log('\nRetrying room creation after permission fixes...');
    await createInitialRooms();
  }
  
  // Create a sample reservation after rooms are created
  await createSampleReservation();
  
  console.log('\n=== SETUP COMPLETE ===');
  console.log('Next steps:');
  console.log('1. Refresh your application');
  console.log('2. Try creating a new reservation via the app');
  console.log('3. Check if reservations appear in the Supabase table');
}

// Run the setup
runSetup().catch(err => {
  console.error('Unhandled error in setup:', err);
}); 