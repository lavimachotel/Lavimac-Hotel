import React, { createContext, useContext, useReducer, useEffect, useCallback, useRef, useMemo } from 'react';
import supabase from '../supabaseClient';
import { 
  getReservations, 
  createReservation as createReservationService,
  updateReservation as updateReservationService,
  deleteReservation as deleteReservationService
} from '../services/reservationService';

const RoomReservationContext = createContext();

// Enhanced function to check if connection works
async function testDatabaseConnection() {
  console.log('Testing database connection...');
  try {
    // First, test with a simple ping query
    const startTime = Date.now();
    const { data, error, status } = await supabase
      .from('rooms')
      .select('count')
      .limit(1);
    
    const latency = Date.now() - startTime;
    
    if (error) {
      console.error('Database connection test failed:', error, 'HTTP Status:', status);
      console.error('Connection error details:', JSON.stringify(error, null, 2));
      return {
        success: false,
        error,
        status,
        message: `Connection failed: ${error.message || 'Unknown error'}`
      };
    }
    
    console.log(`Database connection test successful! Latency: ${latency}ms`);
    
    // Try to get actual data to ensure permissions are correct
    const { data: roomData, error: roomError } = await supabase
      .from('rooms')
      .select('*')
      .limit(1);
      
    if (roomError) {
      console.warn('Connection works but querying data failed:', roomError);
      return {
        success: true,
        hasData: false,
        error: roomError,
        message: 'Connected but cannot access data. Possible permission issue.'
      };
    }
    
    if (!roomData || !Array.isArray(roomData) || roomData.length === 0) {
      console.warn('Connection works but no room data found');
      return {
        success: true,
        hasData: false,
        message: 'Connected but no room data found. Database might be empty.'
      };
    }
    
    console.log('Successfully retrieved room data');
    return {
      success: true,
      hasData: true,
      latency,
      message: 'Connection successful, data retrieved'
    };
  } catch (err) {
    console.error('Exception testing database connection:', err);
    console.error('Error stack:', err.stack);
    return {
      success: false,
      error: err,
      message: `Connection exception: ${err.message || err}`
    };
  }
}

const initialState = {
  rooms: [],
  reservations: [],
  loading: true,
  error: null,
  revenue: 0,
  isDataFresh: false,
  lastFetchTime: 0
};

function reducer(state, action) {
  switch (action.type) {
    case 'SET_ROOMS':
      return { ...state, rooms: action.payload, isDataFresh: true };
      
    case 'SET_RESERVATIONS':
      return { ...state, reservations: action.payload, isDataFresh: true };
      
    case 'SET_LOADING':
      return { ...state, loading: action.payload };
      
    case 'SET_ERROR':
      return { ...state, error: action.payload };
    
    case 'SET_LAST_FETCH_TIME':
      return { ...state, lastFetchTime: action.payload };
      
    case 'SET_DATA_FRESH':
      return { ...state, isDataFresh: action.payload };
      
    case 'UPDATE_ROOM_STATUS':
      const updatedRooms = state.rooms.map(room => 
        room.id === action.payload.roomId 
          ? { ...room, status: action.payload.status } 
          : room
      );
      return { ...state, rooms: updatedRooms };
      
    case 'ADD_RESERVATION':
      const newReservations = [...state.reservations, action.payload];
      return { ...state, reservations: newReservations };
      
    case 'UPDATE_RESERVATION':
      const updatedReservations = state.reservations.map(reservation => 
        reservation.id === action.payload.id 
          ? { ...reservation, ...action.payload } 
          : reservation
      );
      return { ...state, reservations: updatedReservations };
      
    case 'DELETE_RESERVATION':
      const filteredReservations = state.reservations.filter(reservation => 
        reservation.id !== action.payload
      );
      return { ...state, reservations: filteredReservations };
      
    case 'UPDATE_REVENUE':
      const newRevenue = state.revenue + action.payload;
      return { ...state, revenue: newRevenue };
      
    case 'SET_REVENUE':
      return { ...state, revenue: action.payload };
      
    default:
      return state;
  }
}

// Simple debounce function to prevent multiple rapid calls
const debounce = (func, wait) => {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
};

// Add this utility function
const formatError = (error) => {
  if (!error) return null;
  
  if (typeof error === 'string') return error;
  
  if (typeof error === 'object') {
    // For Supabase error objects
    if (error.message) {
      return error.message;
    }
    
    // Try to extract a meaningful message
    try {
      return JSON.stringify(error);
    } catch (e) {
      return 'Unknown error occurred';
    }
  }
  
  return String(error);
};

export const RoomReservationProvider = ({ children }) => {
  const [state, dispatch] = useReducer(reducer, initialState);
  const isLoadingRef = useRef(false);
  const fetchTimeoutRef = useRef(null);
  const prefetchTriggeredRef = useRef(false);
  
  // Enhanced refreshData to better handle room data
  const refreshData = useCallback(async (forceRefresh = false) => {
    console.log('refreshData called with forceRefresh:', forceRefresh);
    console.log('Current state - isDataFresh:', state.isDataFresh, 'rooms count:', state.rooms.length, 'reservations count:', state.reservations.length);
    
    // If data is fresh and no force refresh, return immediately
    if (state.isDataFresh && !forceRefresh) {
      console.log('Data is fresh, skipping refresh');
      return;
    }
    
    const now = Date.now();
    
    // Set loading state
    dispatch({ type: 'SET_LOADING', payload: true });
    console.log('Setting loading state to true');
    
    try {
      await fetchRoomsFromSupabase();
    } catch (error) {
      console.error('Error during refresh:', error);
      dispatch({ type: 'SET_ERROR', payload: formatError(error) });
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
      dispatch({ type: 'SET_LAST_FETCH_TIME', payload: now });
    }
  }, [state.isDataFresh, state.rooms.length, state.reservations.length]);
  
  // Modified getRooms function
  const fetchRoomsFromSupabase = async () => {
    try {
      console.log('Fetching rooms from Supabase...');
      
      // First check if connection to Supabase is working
      try {
        const { data: connectionTest, error: connectionError } = await supabase
          .from('rooms')
          .select('count')
          .limit(1);
          
        if (connectionError) {
          console.error('Supabase connection test failed:', connectionError);
          throw new Error(`Connection to Supabase failed: ${connectionError.message}`);
        }
        
        console.log('Supabase connection test successful');
      } catch (connectionTestError) {
        console.error('Error testing Supabase connection:', connectionTestError);
      }
      
      // Now fetch the actual room data
      const { data, error } = await supabase
        .from('rooms')
        .select('*')
        .order('id');
      
      if (error) {
        console.error('Error fetching rooms:', error);
        console.error('Error details:', JSON.stringify(error, null, 2));
        throw error;
      }
      
      if (!data || !Array.isArray(data)) {
        console.error('Invalid room data received:', data);
        return { data: [], error: new Error('Invalid room data format received') };
      }
      
      console.log(`Successfully fetched ${data.length} rooms`);
      
      // Log a sample of the data (first room) for debugging
      if (data.length > 0) {
        console.log('Sample room data:', JSON.stringify(data[0], null, 2));
      }
      
      return { data, error: null };
    } catch (error) {
      console.error('Exception fetching rooms:', error);
      console.error('Error stack:', error.stack);
      return { data: [], error };
    }
  };
  
  // Room operations
  const checkInGuest = async (roomId, guestData) => {
    try {
      // First update local state
      dispatch({ 
        type: 'UPDATE_ROOM_STATUS', 
        payload: { roomId, status: 'Occupied' } 
      });
      
      // Update room status in database
      const roomUpdateResult = await supabase
        .from('rooms')
        .update({ 
          status: 'Occupied', 
          guest: guestData.name,
          updated_at: new Date().toISOString() 
        })
        .eq('id', roomId);
      
      if (roomUpdateResult.error) {
        throw roomUpdateResult.error;
      }
      
      return { success: true };
    } catch (error) {
      console.error('Error during check-in:', error);
      return { success: false, error: error.message };
    }
  };
  
  // Guest check-out operation
  const checkOutGuest = async (roomId) => {
    try {
      // Update local state first
      dispatch({ 
        type: 'UPDATE_ROOM_STATUS', 
        payload: { roomId, status: 'Available' } 
      });
      
      // Find the active reservation for this room
      const activeReservation = state.reservations.find(
        res => res.room_id === roomId && res.status === 'Checked In'
      );
      
      if (activeReservation) {
        // Update local state
        const updatedReservation = {
          ...activeReservation,
          status: 'Checked Out',
          updated_at: new Date().toISOString()
        };
        
        dispatch({ 
          type: 'UPDATE_RESERVATION', 
          payload: updatedReservation
        });
        
        // Update room status in database
        const roomUpdateResult = await supabase
          .from('rooms')
          .update({ status: 'Available', updated_at: new Date().toISOString() })
          .eq('id', roomId);
        
        if (roomUpdateResult.error) {
          throw roomUpdateResult.error;
        }
        
        // Update reservation in database
        const { error } = await updateReservationService(
          activeReservation.id, 
          { 
            status: 'Checked Out',
            updated_at: new Date().toISOString()
          }
        );
        
        if (error) {
          throw error;
        }
      }
      
      return { success: true };
    } catch (error) {
      console.error('Error checking out guest:', error);
      return { success: false, error: error.message };
    }
  };
  
  // Create a reservation without check-in
  const createReservation = async (roomId, reservationDetails) => {
    try {
      // Log the incoming reservation details for debugging
      console.log('Creating reservation with details:', reservationDetails);
      console.log('Room ID:', roomId);
      
      // Update local state for room status
      dispatch({ 
        type: 'UPDATE_ROOM_STATUS', 
        payload: { roomId, status: 'Reserved' } 
      });
      
      // Prepare reservation data with consistent field names for database
      const reservationData = {
        room_id: roomId,
        guest_name: reservationDetails.guestName || '',
        guest_email: reservationDetails.email || '',
        guest_phone: reservationDetails.phoneNumber || '',
        check_in_date: reservationDetails.checkInDate || new Date().toISOString(),
        check_out_date: reservationDetails.checkOutDate || new Date().toISOString(),
        status: 'Reserved',
        special_requests: reservationDetails.specialRequests || '',
        payment_method: reservationDetails.paymentMethod || 'Credit Card',
        payment_status: 'Pending',
        adults: reservationDetails.adults || 1,
        children: reservationDetails.children || 0,
        room_type: reservationDetails.roomType || state.rooms.find(r => r.id === roomId)?.type || 'Standard',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      
      // Generate a local temporary ID
      const tempId = 'local-' + Date.now();
      const newReservation = { id: tempId, ...reservationData };
      
      // Log the processed reservation data
      console.log('Processed reservation data for Supabase:', reservationData);
      
      // Update local state with new reservation
      dispatch({ type: 'ADD_RESERVATION', payload: newReservation });
      
      // Update room status in database
      console.log('Updating room status in Supabase:', { roomId, status: 'Reserved' });
      const roomUpdateResult = await supabase
        .from('rooms')
        .update({ status: 'Reserved', updated_at: new Date().toISOString() })
        .eq('id', roomId);
      
      if (roomUpdateResult.error) {
        console.error('Error updating room status in Supabase:', roomUpdateResult.error);
        throw roomUpdateResult.error;
      }
      
      // Create reservation in database
      console.log('Sending reservation data to createReservationService:', reservationData);
      const { data, error } = await createReservationService(reservationData);
      
      if (error) {
        console.error('Error returned from createReservationService:', error);
        throw error;
      }
      
      console.log('Reservation successfully created in Supabase:', data);
      
      // Update the local reservation with the real ID
      dispatch({ type: 'UPDATE_RESERVATION', payload: { ...newReservation, id: data.id } });
      
      return { success: true, data };
    } catch (error) {
      console.error('Error creating reservation:', error);
      console.error('Error stack:', error.stack);
      return { success: false, error: error.message };
    }
  };
  
  // Cancel a reservation
  const cancelReservation = async (reservationId) => {
    try {
      // Find the reservation
      const reservation = state.reservations.find(r => r.id === reservationId);
      if (!reservation) {
        return { 
          success: false, 
          error: `Reservation with ID ${reservationId} not found` 
        };
      }

      const roomNumber = reservation.room_id;

      // Update room status in database
      const roomUpdateResult = await supabase
        .from('rooms')
        .update({ status: 'Available', updated_at: new Date().toISOString() })
        .eq('id', roomNumber);
      
      if (roomUpdateResult.error) {
        console.error('Error updating room status:', roomUpdateResult.error);
        throw roomUpdateResult.error;
      }
      
      // Delete the reservation from database
      const { error } = await deleteReservationService(reservationId);
      
      if (error) {
        console.error('Error deleting reservation:', error);
        throw error;
      }
      
      // Update local state after successful database operations
      dispatch({ 
        type: 'UPDATE_ROOM_STATUS', 
        payload: { roomId: roomNumber, status: 'Available' } 
      });
      
      dispatch({ type: 'DELETE_RESERVATION', payload: reservationId });
      
      return { success: true };
    } catch (error) {
      console.error('Error canceling reservation:', error);
      return { 
        success: false, 
        error: formatError(error) || 'Unknown error occurred' 
      };
    }
  };
  
  // Update a reservation
  const updateReservation = async (reservationData) => {
    try {
      // Update local state first
      dispatch({ 
        type: 'UPDATE_RESERVATION', 
        payload: reservationData
      });
      
      // Update reservation status in database
      const { error } = await updateReservationService(
        reservationData.id, 
        {
          guest_name: reservationData.guestName,
          guest_email: reservationData.email,
          guest_phone: reservationData.phoneNumber,
          room_type: reservationData.roomType,
          room_number: reservationData.roomNumber,
          check_in_date: reservationData.checkInDate,
          check_out_date: reservationData.checkOutDate,
          adults: reservationData.adults,
          children: reservationData.children,
          special_requests: reservationData.specialRequests,
          payment_method: reservationData.paymentMethod,
          status: reservationData.status,
          updated_at: new Date().toISOString()
        }
      );
      
      if (error) {
        throw error;
      }
      
      return { success: true };
    } catch (error) {
      console.error('Error updating reservation:', error);
      return { success: false, error: error.message };
    }
  };
  

  
  // Get all rooms with improved error handling
  const getRooms = (filterBy = null, sortBy = null) => {
    console.log('getRooms called with filters:', filterBy, 'sort:', sortBy);
    
    // Safety check - if rooms is not an array, log error and return empty array
    if (!state.rooms) {
      console.error('state.rooms is undefined or null');
      return [];
    }
    
    if (!Array.isArray(state.rooms)) {
      console.error('state.rooms is not an array:', typeof state.rooms, state.rooms);
      return [];
    }
    
    // Create a safe copy of the rooms array, filtering out any invalid room objects
    let filteredRooms = state.rooms
      .filter(room => room && typeof room === 'object')
      .map(room => ({ ...room })); // Create a shallow copy of each room
    
    console.log(`Starting with ${filteredRooms.length} valid rooms`);
    
    // Apply filters if provided
    if (filterBy) {
      // Filter by status
      if (filterBy.status) {
        filteredRooms = filteredRooms.filter(room => room.status === filterBy.status);
        console.log(`After status filter (${filterBy.status}): ${filteredRooms.length} rooms`);
      }
      
      // Filter by type
      if (filterBy.type) {
        filteredRooms = filteredRooms.filter(room => room.type === filterBy.type);
        console.log(`After type filter (${filterBy.type}): ${filteredRooms.length} rooms`);
      }
      
      // Filter by search term
      if (filterBy.searchTerm) {
        const searchLower = filterBy.searchTerm.toLowerCase();
        filteredRooms = filteredRooms.filter(room => {
          // Safely check each field
          const roomNumber = room.room_number ? String(room.room_number).toLowerCase() : '';
          const name = room.name ? String(room.name).toLowerCase() : '';
          const type = room.type ? String(room.type).toLowerCase() : '';
          
          return roomNumber.includes(searchLower) || 
                 name.includes(searchLower) || 
                 type.includes(searchLower);
        });
        console.log(`After search filter (${filterBy.searchTerm}): ${filteredRooms.length} rooms`);
      }
    }
    
    // Apply sorting if provided
    if (sortBy && sortBy.field) {
      try {
        filteredRooms.sort((a, b) => {
          // Safely get values, defaulting to empty string or 0
          let aValue = a[sortBy.field];
          let bValue = b[sortBy.field];
          
          // Handle missing values
          if (aValue === undefined || aValue === null) aValue = '';
          if (bValue === undefined || bValue === null) bValue = '';
          
          // Sort strings and numbers differently
          if (typeof aValue === 'string' || typeof bValue === 'string') {
            // Convert both to strings for consistent comparison
            aValue = String(aValue);
            bValue = String(bValue);
            
            return sortBy.direction === 'asc' 
              ? aValue.localeCompare(bValue) 
              : bValue.localeCompare(aValue);
          } else {
            // Numeric sort
            return sortBy.direction === 'asc' 
              ? aValue - bValue 
              : bValue - aValue;
          }
        });
        console.log(`Sorted rooms by ${sortBy.field} (${sortBy.direction})`);
      } catch (error) {
        console.error('Error sorting rooms:', error);
        // Continue with unsorted rooms if there's an error
      }
    }
    
    console.log(`Returning ${filteredRooms.length} rooms after filtering and sorting`);
    return filteredRooms;
  };
  
  // Get room by id
  const getRoomById = (roomId) => {
    return state.rooms.find(room => room.id === roomId);
  };
  
  // Get reservation by id
  const getReservationById = (reservationId) => {
    return state.reservations.find(res => res.id === reservationId);
  };
  
  // Get reservations for a room
  const getReservationsForRoom = (roomId) => {
    return state.reservations.filter(res => res.room_id === roomId);
  };
  
  // Get active reservation for a room
  const getActiveReservationForRoom = (roomId) => {
    return state.reservations.find(
      res => res.room_id === roomId && 
      (res.status === 'Reserved' || res.status === 'Checked In')
    );
  };
  
  // Update revenue stats
  const updateRevenueStats = (amount, reset = false) => {
    if (reset) {
      // If reset is true, set revenue directly to the amount
      dispatch({ type: 'SET_REVENUE', payload: amount });
    } else {
      // Otherwise add to existing revenue
      dispatch({ type: 'UPDATE_REVENUE', payload: amount });
    }
  };
  
  // Load initial data and set up real-time subscriptions
  useEffect(() => {
    refreshData();
    
    // Set up real-time subscription
    try {
      const roomsSubscription = supabase
        .channel('rooms-channel')
        .on('postgres_changes', { 
          event: '*', 
          schema: 'public', 
          table: 'rooms' 
        }, () => {
          console.log('Room data changed, refreshing...');
          refreshData();
        })
        .subscribe();
        
      const reservationsSubscription = supabase
        .channel('reservations-channel')
        .on('postgres_changes', { 
          event: '*', 
          schema: 'public', 
          table: 'reservations' 
        }, () => {
          console.log('Reservation data changed, refreshing...');
          refreshData();
        })
        .subscribe();
    
    return () => {
        supabase.removeChannel(roomsSubscription);
        supabase.removeChannel(reservationsSubscription);
      };
    } catch (err) {
      console.error('Error setting up real-time subscriptions:', err);
    }
  }, [refreshData]);

  // Create a memoized value object to prevent unnecessary re-renders
  const value = useMemo(() => ({
    rooms: state.rooms,
    reservations: state.reservations,
    loading: state.loading,
    error: state.error,
    revenue: state.revenue,
    refreshData,
    checkInGuest,
    checkOutGuest,
    createReservation,
    cancelReservation,
    updateReservation,
    getRooms,
    getRoomById,
    getReservationById,
    getReservationsForRoom,
    getActiveReservationForRoom,
    updateRevenueStats,
    testDatabaseConnection
  }), [
    state.rooms,
    state.reservations,
    state.loading,
    state.error,
    state.revenue,
    refreshData,
    checkInGuest,
    checkOutGuest,
    createReservation,
    cancelReservation,
    updateReservation,
    getRooms,
    getRoomById,
    getReservationById,
    getReservationsForRoom,
    getActiveReservationForRoom,
    updateRevenueStats
  ]);

  return (
    <RoomReservationContext.Provider value={value}>
      {children}
    </RoomReservationContext.Provider>
  );
};

export const useRoomReservation = () => useContext(RoomReservationContext);