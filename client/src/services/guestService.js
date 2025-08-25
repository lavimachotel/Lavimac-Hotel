import supabase from '../supabaseClient';

/**
 * Service for handling guest-related operations with Supabase
 */

// Test Supabase connection and verify guests table
export const testSupabaseConnection = async () => {
  console.log('Testing Supabase connection...');
  try {
    // First, check if the Supabase URL is reachable at all
    const projectUrl = supabase.supabaseUrl;
    let pingResult = null;
    
    try {
      console.log('Pinging Supabase endpoint:', projectUrl);
      
      // Try a simple fetch with a timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);
      
      const response = await fetch(`${projectUrl}/rest/v1/`, {
        method: 'GET',
        headers: {
          'apikey': supabase.supabaseKey || process.env.REACT_APP_SUPABASE_ANON_KEY || '',
          'Accept': 'application/json'
        },
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      pingResult = {
        success: response.status >= 200 && response.status < 300,
        status: response.status,
        statusText: response.statusText
      };
      
      console.log('Ping result:', pingResult);
    } catch (pingError) {
      console.error('Error pinging Supabase:', pingError);
      
      // Specific handling for "Failed to fetch" error
      if (pingError.message === 'Failed to fetch') {
        return {
          success: false,
          message: 'Connection failed: Failed to fetch',
          error: pingError,
          details: {
            errorType: 'network',
            possibleCauses: [
              'Network connectivity issues - check your internet connection',
              'Supabase project may be paused or in maintenance mode',
              'Firewall or security software may be blocking the connection',
              'The Supabase URL may be incorrect or no longer valid',
              'DNS issues preventing hostname resolution'
            ],
            recommendations: [
              'Verify your internet connection and try again',
              'Check if you can access other websites',
              'Log in to Supabase dashboard and ensure your project is active',
              'Try from a different network or device',
              'Temporarily disable any firewalls or security software'
            ]
          }
        };
      }
      
      pingResult = {
        success: false,
        error: pingError.message
      };
    }
    
    // If basic ping failed and couldn't be reached at all, don't continue with other tests
    if (pingResult && !pingResult.success) {
      return {
        success: false,
        message: `Cannot connect to Supabase API: ${pingResult.error || pingResult.statusText || 'Unknown error'}`,
        connectionSuccessful: false,
        pingResult
      };
    }
    
    // Continue with the regular tests as before...
    
    // First, try a more reliable way to test if we can connect to Supabase
    // Using the system schema instead of a public table that might not exist
    const { error: schemaError } = await supabase
      .from('pg_catalog.pg_namespace')
      .select('nspname')
      .limit(1)
      .single();
    
    // If we get a specific error about permissions, that's actually good - it means we connected
    // but don't have access to system tables (which is normal for most users)
    if (schemaError && schemaError.code === '42501') {
      console.log('Connected to Supabase (permission error on system tables is expected)');
      // Successful connection but expected permission error
    } else if (schemaError && schemaError.code !== 'PGRST116') {
      // Try a different approach - get server version
      const { data, error: versionError } = await supabase.rpc('get_server_version');
      
      if (versionError && versionError.code !== 'PGRST116') {
        // Try direct fetch to test if API is reachable
        try {
          const { status } = await fetch(supabase.supabaseUrl);
          if (status >= 200 && status < 300) {
            console.log('Connected to Supabase API endpoint');
          } else {
            console.error('Failed to connect to Supabase API:', status);
            return {
              success: false,
              message: `Connection failed: HTTP status ${status}`,
              error: { code: status, message: 'API endpoint returned error status' }
            };
          }
        } catch (fetchError) {
          console.error('Failed to connect to Supabase API:', fetchError);
          return {
            success: false,
            message: `Connection failed: ${fetchError.message}`,
            error: fetchError
          };
        }
      }
    }
    
    console.log('Basic connection successful');
    
    // Now check if guests table exists and is accessible
    try {
      const { data, error: guestsError } = await supabase
        .from('guests')
        .select('count')
        .limit(1);
      
      if (guestsError) {
        if (guestsError.code === 'PGRST116' || guestsError.code === '42P01') {
          console.error('Guests table does not exist:', guestsError);
          return {
            success: true,
            message: 'Connected to Supabase, but guests table does not exist. Use the "Create New Table" button to create it.',
            connectionSuccessful: true,
            tableExists: false
          };
        } else {
          console.error('Error accessing guests table:', guestsError);
          return {
            success: true,
            message: `Connected to Supabase, but cannot access guests table: ${guestsError.message}`,
            connectionSuccessful: true,
            tableExists: true,
            accessError: true
          };
        }
      }
      
      return {
        success: true,
        message: 'Successfully connected to Supabase and accessed guests table',
        connectionSuccessful: true,
        tableExists: true,
        data: data
      };
    } catch (e) {
      console.error('Exception checking guests table:', e);
      return {
        success: true,
        message: `Connected to Supabase, but error checking guests table: ${e.message}`,
        connectionSuccessful: true,
        tableCheckError: e
      };
    }
  } catch (e) {
    console.error('Exception testing connection:', e);
    
    // Provide more helpful messages for common errors
    let errorMessage = e.message;
    let details = {};
    
    if (e.message === 'Failed to fetch') {
      errorMessage = 'Network error: Failed to establish connection to Supabase';
      details = {
        errorType: 'network',
        suggestions: [
          'Check your internet connection',
          'Verify the Supabase project is active in your dashboard',
          'Make sure your Supabase URL is correct',
          'Try accessing the Supabase URL in your browser directly',
          'Verify there are no firewall or proxy issues'
        ]
      };
    } else if (e.message.includes('timeout')) {
      errorMessage = 'Connection timeout: Supabase server took too long to respond';
      details = {
        errorType: 'timeout',
        suggestions: [
          'Your network may be slow or unstable',
          'The Supabase server might be under heavy load',
          'Try again later or from a different network'
        ]
      };
    }
    
    return {
      success: false,
      message: `Connection test exception: ${errorMessage}`,
      error: e,
      details: details
    };
  }
};

// Get all guests
export const getGuests = async () => {
  try {
    console.log('Fetching all guests from Supabase');
    
    // First, fetch all guests with basic information
    const { data: guestsData, error } = await supabase
      .from('guests')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('Supabase Error fetching guests:', error);
      throw error;
    }
    
    // Now, fetch room data to get room names
    if (guestsData && guestsData.length > 0) {
      try {
        console.log('Fetching rooms data for guest room name lookup');
        
        // Get all rooms data in one query
        const { data: roomsData, error: roomsError } = await supabase
          .from('rooms')
          .select('*');
        
        if (roomsError) {
          console.warn('Error fetching room data:', roomsError);
        } else if (roomsData && roomsData.length > 0) {
          console.log('Retrieved rooms data:', roomsData);
          
          // Create a map of room id/number to room name for faster lookup
          const roomMap = {};
          roomsData.forEach(room => {
            roomMap[room.id] = room.name || room.room_number;
            
            // Also map the room number as string to the room name
            if (room.id !== undefined && room.id !== null) {
              roomMap[String(room.id)] = room.name || room.room_number;
            }
            
            // Direct room number lookup
            if (room.room_number) {
              roomMap[room.room_number] = room.name || room.room_number;
            }
          });
          
          console.log('Room mapping created:', roomMap);
          
          // Add room_name to each guest based on their room assignment
          guestsData.forEach(guest => {
            if (guest.room) {
              // Try to find the room in our map
              const roomName = roomMap[guest.room];
              
              if (roomName) {
                console.log(`Setting room_name for guest ${guest.name}: ${roomName}`);
                guest.room_name = roomName;
              } else {
                // Direct lookup if mapping fails
                const directRoom = roomsData.find(
                  r => r.id === guest.room || 
                       String(r.id) === String(guest.room) || 
                       r.room_number === guest.room
                );
                
                if (directRoom) {
                  console.log(`Direct lookup for guest ${guest.name} found room: ${directRoom.name || directRoom.room_number}`);
                  guest.room_name = directRoom.name || directRoom.room_number;
                } else {
                  // Just use the room value itself
                  console.log(`Using direct room value for guest ${guest.name}: ${guest.room}`);
                  guest.room_name = guest.room;
                }
              }
            }
          });
        }
      } catch (roomError) {
        console.error('Error processing room data:', roomError);
        // Continue with guests data even if room names couldn't be fetched
      }
    }
    
    // Debug output
    if (guestsData && guestsData.length > 0) {
      console.log('Guest room names after processing:');
      guestsData.forEach(guest => {
        console.log(`Guest ${guest.name}: room=${guest.room}, room_name=${guest.room_name || 'not set'}`);
      });
    }
    
    console.log(`Successfully fetched ${guestsData?.length || 0} guests from Supabase`);
    return { data: guestsData, error: null };
  } catch (error) {
    console.error('Exception fetching guests:', error);
    return { data: null, error };
  }
};

// Get a specific guest by ID
export const getGuestById = async (id) => {
  try {
    // Get guest information
    const { data, error } = await supabase
      .from('guests')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) throw error;
    
    // If the guest has a room assignment, get the room name
    if (data && data.room) {
      try {
        // Get comprehensive room data
        const { data: roomsData, error: roomsError } = await supabase
          .from('rooms')
          .select('*');
        
        if (!roomsError && roomsData && roomsData.length > 0) {
          // Try direct matching
          const matchingRoom = roomsData.find(
            r => r.id === data.room || 
                 String(r.id) === String(data.room) || 
                 r.room_number === data.room
          );
          
          if (matchingRoom) {
            data.room_name = matchingRoom.name || matchingRoom.room_number;
            console.log(`Found room name for guest ${id}: ${data.room_name}`);
          } else {
            // Fallback to using the room value itself
            data.room_name = data.room;
            console.log(`Using room value directly for guest ${id}: ${data.room}`);
          }
        }
      } catch (roomError) {
        console.warn(`Error fetching room name for guest ${id}:`, roomError);
        // Continue without room name, but set it to the room value itself
        data.room_name = data.room;
      }
    }
    
    return { data, error: null };
  } catch (error) {
    console.error(`Error fetching guest with ID ${id}:`, error);
    return { data: null, error };
  }
};

// Create a new guest
export const createGuest = async (guestData) => {
  try {
    console.log('Attempting to create guest in Supabase:', guestData);
    
    const { data, error } = await supabase
      .from('guests')
      .insert([guestData])
      .select();
    
    if (error) {
      console.error('Supabase Error creating guest:', error);
      throw error;
    }
    
    console.log('Guest created successfully in Supabase:', data);
    return { data: data[0], error: null };
  } catch (error) {
    console.error('Exception creating guest:', error);
    return { data: null, error };
  }
};

// Update an existing guest
export const updateGuest = async (id, updates) => {
  try {
    const { data, error } = await supabase
      .from('guests')
      .update(updates)
      .eq('id', id)
      .select();
    
    if (error) throw error;
    
    return { data: data[0], error: null };
  } catch (error) {
    console.error(`Error updating guest with ID ${id}:`, error);
    return { data: null, error };
  }
};

// Delete a guest
export const deleteGuest = async (id) => {
  try {
    const { error } = await supabase
      .from('guests')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
    
    return { success: true, error: null };
  } catch (error) {
    console.error(`Error deleting guest with ID ${id}:`, error);
    return { success: false, error };
  }
};

// Get guests for a specific room
export const getGuestsByRoom = async (roomNumber) => {
  try {
    // Get guests for the room
    const { data, error } = await supabase
      .from('guests')
      .select('*')
      .eq('room', roomNumber)
      .order('check_in', { ascending: true });
    
    if (error) throw error;
    
    // Get the room name
    if (data && data.length > 0) {
      try {
        const { data: roomsData, error: roomsError } = await supabase
          .from('rooms')
          .select('*');
        
        if (!roomsError && roomsData && roomsData.length > 0) {
          // Find the matching room
          const matchingRoom = roomsData.find(
            r => r.id === roomNumber || 
                 String(r.id) === String(roomNumber) || 
                 r.room_number === roomNumber
          );
          
          if (matchingRoom) {
            // Add room_name to all guests from this room
            const roomName = matchingRoom.name || matchingRoom.room_number;
            console.log(`Found room name for room ${roomNumber}: ${roomName}`);
            
            // Update all guests
            data.forEach(guest => {
              guest.room_name = roomName;
            });
          } else {
            // Fallback to using the room number itself
            console.log(`Using room number directly for ${roomNumber}`);
            data.forEach(guest => {
              guest.room_name = String(roomNumber);
            });
          }
        }
      } catch (roomError) {
        console.warn(`Error fetching room name for room ${roomNumber}:`, roomError);
        // Continue without room names, but set them to the room number
        data.forEach(guest => {
          guest.room_name = String(roomNumber);
        });
      }
    }
    
    return { data, error: null };
  } catch (error) {
    console.error(`Error fetching guests for room ${roomNumber}:`, error);
    return { data: null, error };
  }
}; 