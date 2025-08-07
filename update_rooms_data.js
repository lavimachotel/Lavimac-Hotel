// Script to update the rooms data in the database
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client
const supabaseUrl = process.env.REACT_APP_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.REACT_APP_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials. Make sure REACT_APP_SUPABASE_URL and REACT_APP_SUPABASE_ANON_KEY are set in .env file');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function updateRooms() {
  console.log('Updating rooms data...');

  try {
    // First, check if we need to add a "name" column to the rooms table
    console.log('Checking if the name column exists...');
    try {
      // Use raw SQL to check if name column exists
      const { data, error } = await supabase
        .from('rooms')
        .select('name')
        .limit(1);
      
      if (error && error.message && error.message.includes('column "name" does not exist')) {
        console.log('Name column does not exist. Adding it...');
        // Use raw SQL to add the column
        await supabase.rpc('execute_sql', {
          sql: 'ALTER TABLE public.rooms ADD COLUMN IF NOT EXISTS name TEXT'
        });
        console.log('Added name column');
      } else {
        console.log('Name column already exists');
      }
    } catch (err) {
      console.error('Error checking/adding name column:', err);
    }
    
    // Delete all existing rooms
    const { error: deleteError } = await supabase
      .from('rooms')
      .delete()
      .neq('id', 0); // Delete all rooms
    
    if (deleteError) {
      console.error('Error deleting existing rooms:', deleteError);
      return;
    }
    
    console.log('Deleted existing rooms');
    
    // New room data based on the specified requirements
    const roomsData = [
      // Standard Rooms - 400 Ghana Cedis
      {
        id: 101,
        room_number: 101,
        name: 'Mint',
        type: 'Standard',
        status: 'Available',
        price: 400,
        capacity: 2,
        amenities: ['WiFi', 'TV', 'AC']
      },
      {
        id: 102,
        room_number: 102,
        name: 'Cinnamon',
        type: 'Standard',
        status: 'Available',
        price: 400,
        capacity: 2,
        amenities: ['WiFi', 'TV', 'AC']
      },
      {
        id: 103,
        room_number: 103,
        name: 'Basil',
        type: 'Standard',
        status: 'Available',
        price: 400,
        capacity: 2,
        amenities: ['WiFi', 'TV', 'AC']
      },
      // Superior Rooms - 700 Ghana Cedis
      {
        id: 104,
        room_number: 104,
        name: 'Licorice',
        type: 'Superior',
        status: 'Available',
        price: 700,
        capacity: 3,
        amenities: ['WiFi', 'TV', 'AC', 'Mini Bar']
      },
      {
        id: 105,
        room_number: 105,
        name: 'Marigold',
        type: 'Superior',
        status: 'Available',
        price: 700,
        capacity: 3,
        amenities: ['WiFi', 'TV', 'AC', 'Mini Bar']
      },
      {
        id: 106,
        room_number: 106,
        name: 'Lotus',
        type: 'Superior',
        status: 'Available',
        price: 700,
        capacity: 3,
        amenities: ['WiFi', 'TV', 'AC', 'Mini Bar']
      },
      {
        id: 107,
        room_number: 107,
        name: 'Jasmine',
        type: 'Superior',
        status: 'Available',
        price: 700,
        capacity: 3,
        amenities: ['WiFi', 'TV', 'AC', 'Mini Bar']
      },
      {
        id: 108,
        room_number: 108,
        name: 'Private',
        type: 'Superior',
        status: 'Available',
        price: 700,
        capacity: 3,
        amenities: ['WiFi', 'TV', 'AC', 'Mini Bar']
      },
      // Executive Room - 1250 Ghana Cedis
      {
        id: 109,
        room_number: 109,
        name: 'Chamomile',
        type: 'Executive',
        status: 'Available',
        price: 1250,
        capacity: 4,
        amenities: ['WiFi', 'TV', 'AC', 'Mini Bar', 'Jacuzzi', 'Room Service']
      }
    ];
    
    // Insert new room data
    console.log('Inserting new room data...');
    const { data, error: insertError } = await supabase
      .from('rooms')
      .insert(roomsData)
      .select();
    
    if (insertError) {
      console.error('Error inserting new rooms:', insertError);
      return;
    }
    
    console.log(`Successfully inserted ${data.length} rooms`);
    console.log('Room data updated successfully!');
  } catch (error) {
    console.error('An unexpected error occurred:', error);
  }
}

// Run the update function
updateRooms()
  .then(() => {
    console.log('Room update process completed');
    process.exit(0);
  })
  .catch(err => {
    console.error('Failed to update rooms:', err);
    process.exit(1);
  }); 