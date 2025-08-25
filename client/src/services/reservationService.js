import supabase from '../supabaseClient';

/**
 * Service for handling reservation-related operations with Supabase
 */

// Get all reservations
export const getReservations = async () => {
  try {
    const { data, error } = await supabase
      .from('reservations')
      .select('*') // Select all columns, including guest information
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    
    // Log the data for debugging
    console.log('Fetched reservations data:', data);
    
    return { data, error: null };
  } catch (error) {
    console.error('Error fetching reservations:', error);
    return { data: null, error };
  }
};

// Get a specific reservation by ID
export const getReservationById = async (id) => {
  try {
    const { data, error } = await supabase
      .from('reservations')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) throw error;
    
    return { data, error: null };
  } catch (error) {
    console.error(`Error fetching reservation with ID ${id}:`, error);
    return { data: null, error };
  }
};

// Create a new reservation
export const createReservation = async (reservationData) => {
  try {
    console.log('Creating reservation in Supabase with data:', reservationData);
    
    // Check if required fields are present
    const requiredFields = ['room_id', 'guest_name', 'check_in_date', 'check_out_date', 'status'];
    for (const field of requiredFields) {
      if (!reservationData[field]) {
        console.error(`Missing required field: ${field}`);
        return { data: null, error: `Missing required field: ${field}` };
      }
    }
    
    // Attempt to insert the reservation
    const { data, error, statusText, status } = await supabase
      .from('reservations')
      .insert([reservationData])
      .select();
    
    if (error) {
      console.error('Error creating reservation in Supabase:', error);
      console.error('Error details:', { code: error.code, message: error.message, details: error.details });
      console.error('HTTP status:', status, statusText);
      throw error;
    }
    
    console.log('Reservation created successfully in Supabase:', data);
    return { data: data[0], error: null };
  } catch (error) {
    console.error('Exception creating reservation:', error);
    console.error('Stack trace:', error.stack);
    return { data: null, error };
  }
};

// Update an existing reservation
export const updateReservation = async (id, updates) => {
  try {
    const { data, error } = await supabase
      .from('reservations')
      .update(updates)
      .eq('id', id)
      .select();
    
    if (error) throw error;
    
    return { data: data[0], error: null };
  } catch (error) {
    console.error(`Error updating reservation with ID ${id}:`, error);
    return { data: null, error };
  }
};

// Delete a reservation
export const deleteReservation = async (id) => {
  try {
    // Check if this is a local ID (client-generated)
    if (id.toString().startsWith('local-')) {
      console.log(`Skipping database delete for local ID: ${id}`);
      return { success: true, error: null };
    }
    
    const { error } = await supabase
      .from('reservations')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
    
    return { success: true, error: null };
  } catch (error) {
    console.error(`Error deleting reservation with ID ${id}:`, error);
    return { success: false, error };
  }
};

// Get reservations for a specific room
export const getReservationsByRoom = async (roomNumber) => {
  try {
    const { data, error } = await supabase
      .from('reservations')
      .select('*')
      .eq('room_number', roomNumber)
      .order('check_in_date', { ascending: true });
    
    if (error) throw error;
    
    return { data, error: null };
  } catch (error) {
    console.error(`Error fetching reservations for room ${roomNumber}:`, error);
    return { data: null, error };
  }
};
