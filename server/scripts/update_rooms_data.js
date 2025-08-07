import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Supabase configuration
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

// Initialize Supabase client
const supabase = createClient(supabaseUrl, supabaseKey);

console.log('Initializing rooms data update script...');

async function updateRoomsData() {
  try {
    console.log('Starting rooms data update process...');

    // Check if the 'rooms' table exists
    const { data: tableExists, error: tableError } = await supabase
      .from('rooms')
      .select('id')
      .limit(1);

    if (tableError && tableError.code === '42P01') {
      console.log('Table "rooms" does not exist. Creating table...');
      
      // Create the rooms table
      const createTableQuery = `
        CREATE TABLE rooms (
          id SERIAL PRIMARY KEY,
          room_number VARCHAR(50) NOT NULL,
          name VARCHAR(100),
          type VARCHAR(50) NOT NULL,
          status VARCHAR(50) NOT NULL DEFAULT 'Available',
          price NUMERIC(10, 2) NOT NULL,
          capacity INTEGER NOT NULL DEFAULT 2,
          amenities TEXT[],
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
      `;
      
      const { error: createError } = await supabase.rpc('execute_sql', { query: createTableQuery });
      
      if (createError) {
        console.error('Error creating rooms table:', createError);
        return;
      }
      
      console.log('Successfully created rooms table');
    }

    // Now check if there are any existing rooms
    const { data: existingRooms, error: countError } = await supabase
      .from('rooms')
      .select('*');

    if (countError) {
      console.error('Error checking existing rooms:', countError);
      return;
    }

    console.log(`Found ${existingRooms?.length || 0} existing rooms`);

    // Only insert new rooms if none exist
    if (!existingRooms || existingRooms.length === 0) {
      console.log('No rooms found. Inserting default rooms...');
      
      // Standard Rooms - 500 Ghana Cedis
      const roomsData = [
        {
          room_number: 'Mint',
          name: 'Mint',
          type: 'Standard',
          status: 'Available',
          price: 500,
          capacity: 2,
          amenities: ['WiFi', 'TV', 'AC']
        },
        {
          room_number: 'Cinnamon',
          name: 'Cinnamon',
          type: 'Standard',
          status: 'Available',
          price: 500,
          capacity: 2,
          amenities: ['WiFi', 'TV', 'AC']
        },
        {
          room_number: 'Basil',
          name: 'Basil',
          type: 'Standard',
          status: 'Available',
          price: 500,
          capacity: 2,
          amenities: ['WiFi', 'TV', 'AC']
        },
        // Superior Rooms - 750 Ghana Cedis
        {
          room_number: 'Licorice',
          name: 'Licorice',
          type: 'Superior',
          status: 'Available',
          price: 750,
          capacity: 3,
          amenities: ['WiFi', 'TV', 'AC', 'Mini Bar']
        },
        {
          room_number: 'Marigold',
          name: 'Marigold',
          type: 'Superior',
          status: 'Available',
          price: 750,
          capacity: 3,
          amenities: ['WiFi', 'TV', 'AC', 'Mini Bar']
        },
        {
          room_number: 'Lotus',
          name: 'Lotus',
          type: 'Superior',
          status: 'Available',
          price: 750,
          capacity: 3,
          amenities: ['WiFi', 'TV', 'AC', 'Mini Bar']
        },
        {
          room_number: 'Jasmine',
          name: 'Jasmine',
          type: 'Superior',
          status: 'Available',
          price: 750,
          capacity: 3,
          amenities: ['WiFi', 'TV', 'AC', 'Mini Bar']
        },
        {
          room_number: 'Private',
          name: 'Private',
          type: 'Superior',
          status: 'Available',
          price: 750,
          capacity: 3,
          amenities: ['WiFi', 'TV', 'AC', 'Mini Bar']
        },
        // Executive Room - 1250 Ghana Cedis
        {
          room_number: 'Chamomile',
          name: 'Chamomile',
          type: 'Executive',
          status: 'Available',
          price: 1250,
          capacity: 4,
          amenities: ['WiFi', 'TV', 'AC', 'Mini Bar', 'Jacuzzi', 'Room Service']
        }
      ];

      // Insert the room data
      const { data: insertedRooms, error: insertError } = await supabase
        .from('rooms')
        .insert(roomsData)
        .select();

      if (insertError) {
        console.error('Error inserting rooms:', insertError);
        return;
      }

      console.log(`Successfully inserted ${insertedRooms.length} rooms`);
      
      // Log the first room as a sample
      if (insertedRooms && insertedRooms.length > 0) {
        console.log('Sample of inserted room data:', insertedRooms[0]);
      }
    } else {
      console.log('Rooms already exist in the database. No new rooms inserted.');
      
      // Log a sample of the existing rooms
      if (existingRooms && existingRooms.length > 0) {
        console.log('Sample of existing room data:', existingRooms[0]);
      }
    }

    console.log('Room data update completed successfully.');
  } catch (error) {
    console.error('Unexpected error during room data update:', error);
  }
}

// Run the update function
updateRoomsData(); 