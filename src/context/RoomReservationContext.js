import React, { createContext, useContext, useReducer, useEffect } from 'react';
import supabase from '../supabaseClient';
import { 
  getReservations, 
  createReservation as createReservationService,
  updateReservation as updateReservationService,
  deleteReservation as deleteReservationService
} from '../services/reservationService';

const RoomReservationContext = createContext();

// Flag to indicate if we're using mock data instead of real database
// Set to true to always use mock data, or false to attempt database operations
const FORCE_MOCK_DATA = false;

// Local storage keys
const STORAGE_KEYS = {
  ROOMS: 'hotel_management_rooms',
  RESERVATIONS: 'hotel_management_reservations',
  MODE: 'hotel_management_data_mode',
  REVENUE: 'hotel_management_revenue'
};

// Helper function to save to local storage
const saveToLocalStorage = (key, data) => {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (error) {
    console.warn(`Failed to save ${key} to local storage:`, error);
  }
};

// Helper function to load from local storage
const loadFromLocalStorage = (key, defaultValue) => {
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : defaultValue;
  } catch (error) {
    console.warn(`Failed to load ${key} from local storage:`, error);
    return defaultValue;
  }
};

// Helper function to check if connection works
async function testDatabaseConnection() {
  try {
    const { data, error, status } = await supabase
      .from('rooms')
      .select('*')
      .limit(1);
    
    if (error) {
      console.warn('Database connection test failed:', error, 'HTTP Status:', status);
      return false;
    }
    
    return true;
  } catch (err) {
    console.warn('Exception testing database connection:', err);
    return false;
  }
}

// Load initial state from local storage if available
const storedUseMockData = loadFromLocalStorage(STORAGE_KEYS.MODE, FORCE_MOCK_DATA);

const initialState = {
  rooms: loadFromLocalStorage(STORAGE_KEYS.ROOMS, []),
  reservations: loadFromLocalStorage(STORAGE_KEYS.RESERVATIONS, []),
  revenue: loadFromLocalStorage(STORAGE_KEYS.REVENUE, 0),
  loading: true,
  error: null,
  useMockData: storedUseMockData // Start with the stored or forced setting
};

function reducer(state, action) {
  let newState;
  
  switch (action.type) {
    case 'SET_ROOMS':
      newState = { ...state, rooms: action.payload };
      saveToLocalStorage(STORAGE_KEYS.ROOMS, action.payload);
      return newState;
      
    case 'SET_RESERVATIONS':
      newState = { ...state, reservations: action.payload };
      if (state.useMockData) {
        saveToLocalStorage(STORAGE_KEYS.RESERVATIONS, action.payload);
      }
      return newState;
      
    case 'SET_LOADING':
      return { ...state, loading: action.payload };
      
    case 'SET_ERROR':
      return { ...state, error: action.payload };
      
    case 'SET_MOCK_DATA_MODE':
      newState = { ...state, useMockData: action.payload };
      saveToLocalStorage(STORAGE_KEYS.MODE, action.payload);
      return newState;
      
    case 'UPDATE_ROOM_STATUS':
      const updatedRooms = state.rooms.map(room => 
        room.id === action.payload.roomId 
          ? { ...room, status: action.payload.status } 
          : room
      );
      saveToLocalStorage(STORAGE_KEYS.ROOMS, updatedRooms);
      return { ...state, rooms: updatedRooms };
      
    case 'ADD_RESERVATION':
      const newReservations = [...state.reservations, action.payload];
      if (state.useMockData) {
        saveToLocalStorage(STORAGE_KEYS.RESERVATIONS, newReservations);
      }
      return { ...state, reservations: newReservations };
      
    case 'UPDATE_RESERVATION':
      const updatedReservations = state.reservations.map(reservation => 
        reservation.id === action.payload.id 
          ? { ...reservation, ...action.payload } 
          : reservation
      );
      if (state.useMockData) {
        saveToLocalStorage(STORAGE_KEYS.RESERVATIONS, updatedReservations);
      }
      return { ...state, reservations: updatedReservations };
      
    case 'DELETE_RESERVATION':
      const filteredReservations = state.reservations.filter(reservation => 
        reservation.id !== action.payload
      );
      if (state.useMockData) {
        saveToLocalStorage(STORAGE_KEYS.RESERVATIONS, filteredReservations);
      }
      return { ...state, reservations: filteredReservations };
      
    case 'UPDATE_REVENUE':
      const newRevenue = state.revenue + action.payload;
      saveToLocalStorage(STORAGE_KEYS.REVENUE, newRevenue);
      return { ...state, revenue: newRevenue };
      
    case 'SET_REVENUE':
      saveToLocalStorage(STORAGE_KEYS.REVENUE, action.payload);
      return { ...state, revenue: action.payload };
      
    default:
      return state;
  }
}

export const RoomReservationProvider = ({ children }) => {
  const [state, dispatch] = useReducer(reducer, initialState);
  
  // Load initial data
  useEffect(() => {
    async function loadData() {
      dispatch({ type: 'SET_LOADING', payload: true });
      
      try {
        // Check if we already have rooms from local storage
        const hasStoredRooms = state.rooms && state.rooms.length > 0;
        
        // Check database connection
        const dbConnected = await testDatabaseConnection();
        const useMockData = FORCE_MOCK_DATA || !dbConnected;
        
        console.log(`Using ${useMockData ? 'mock' : 'database'} data for rooms and reservations`);
        console.log(`Has stored rooms: ${hasStoredRooms ? 'yes' : 'no'}`);
        dispatch({ type: 'SET_MOCK_DATA_MODE', payload: useMockData });
        
        if (useMockData) {
          // Use mock data
          if (!hasStoredRooms) {
            console.log('Creating new mock rooms');
            
            // Create mock rooms
            const mockRooms = Array.from({ length: 20 }, (_, i) => ({
              id: 101 + i,
              room_number: 101 + i,
              type: i < 10 ? 'Standard' : i < 15 ? 'Deluxe' : i < 18 ? 'Suite' : 'Presidential',
              status: 'Available',
              price: i < 10 ? 120 : i < 15 ? 180 : i < 18 ? 300 : 500,
              capacity: i < 10 ? 2 : i < 15 ? 2 : i < 18 ? 4 : 6,
              amenities: ['WiFi', 'TV', 'AC'],
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            }));
            
            dispatch({ type: 'SET_ROOMS', payload: mockRooms });
          } else {
            console.log('Using rooms from local storage');
          }
          
          // Load reservations from local storage if available
          const storedReservations = loadFromLocalStorage(STORAGE_KEYS.RESERVATIONS, []);
          if (storedReservations.length > 0) {
            console.log(`Loaded ${storedReservations.length} reservations from local storage`);
            dispatch({ type: 'SET_RESERVATIONS', payload: storedReservations });
          } else {
            dispatch({ type: 'SET_RESERVATIONS', payload: [] });
          }
        } else {
          // Try to load rooms from Supabase
          const { data: roomsData, error: roomsError } = await supabase
            .from('rooms')
            .select('*');
          
          if (roomsError || !roomsData || roomsData.length === 0) {
            console.warn('Error loading rooms from database:', roomsError?.message || 'No rooms found');
            dispatch({ type: 'SET_ERROR', payload: 'Failed to load rooms from database' });
            
            // Fall back to mock rooms
            const mockRooms = Array.from({ length: 20 }, (_, i) => ({
              id: 101 + i,
              room_number: 101 + i,
              type: i < 10 ? 'Standard' : 'Deluxe',
              status: 'Available',
              price: i < 10 ? 120 : 180,
              capacity: i < 10 ? 2 : 4,
              amenities: ['WiFi', 'TV', 'AC'],
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            }));
            
            dispatch({ type: 'SET_ROOMS', payload: mockRooms });
          } else {
            dispatch({ type: 'SET_ROOMS', payload: roomsData });
          }
          
          // Try to load reservations
          try {
            const { data: reservationsData, error: reservationsError } = await getReservations();
            
            if (reservationsError) {
              console.warn('Error loading reservations, using empty array:', reservationsError);
              dispatch({ type: 'SET_RESERVATIONS', payload: [] });
            } else {
              dispatch({ type: 'SET_RESERVATIONS', payload: reservationsData || [] });
            }
          } catch (resError) {
            console.warn('Exception loading reservations, using empty array:', resError);
            dispatch({ type: 'SET_RESERVATIONS', payload: [] });
          }
        }
      } catch (error) {
        console.error('Error loading room and reservation data:', error);
        dispatch({ type: 'SET_ERROR', payload: error.message });
        
        // Provide mock data as fallback
        const mockRooms = Array.from({ length: 20 }, (_, i) => ({
          id: 101 + i,
          room_number: 101 + i,
          type: i < 10 ? 'Standard' : 'Deluxe',
          status: 'Available',
          price: i < 10 ? 120 : 180,
          capacity: i < 10 ? 2 : 4,
          amenities: ['WiFi', 'TV', 'AC'],
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }));
        
        dispatch({ type: 'SET_ROOMS', payload: mockRooms });
        dispatch({ type: 'SET_RESERVATIONS', payload: [] });
      } finally {
        dispatch({ type: 'SET_LOADING', payload: false });
      }
    }
    
    loadData();
    
    // Setup real-time subscriptions only if not using mock data
    let roomsSubscription;
    let reservationsSubscription;
    
    if (!FORCE_MOCK_DATA) {
      roomsSubscription = supabase
        .channel('rooms-channel')
        .on('postgres_changes', { 
          event: 'UPDATE', 
          schema: 'public', 
          table: 'rooms' 
        }, payload => {
          dispatch({ 
            type: 'UPDATE_ROOM_STATUS', 
            payload: { roomId: payload.new.id, status: payload.new.status } 
          });
        })
        .subscribe();
        
      reservationsSubscription = supabase
        .channel('reservations-channel')
        .on('postgres_changes', { 
          event: 'INSERT', 
          schema: 'public', 
          table: 'reservations' 
        }, payload => {
          dispatch({ type: 'ADD_RESERVATION', payload: payload.new });
        })
        .on('postgres_changes', { 
          event: 'UPDATE', 
          schema: 'public', 
          table: 'reservations' 
        }, payload => {
          dispatch({ type: 'UPDATE_RESERVATION', payload: payload.new });
        })
        .on('postgres_changes', { 
          event: 'DELETE', 
          schema: 'public', 
          table: 'reservations' 
        }, payload => {
          dispatch({ type: 'DELETE_RESERVATION', payload: payload.old.id });
        })
        .subscribe();
    }
    
    return () => {
      if (roomsSubscription) supabase.removeChannel(roomsSubscription);
      if (reservationsSubscription) supabase.removeChannel(reservationsSubscription);
    };
  }, []);
  
  // Room operations
  const updateRoomStatus = async (roomId, status) => {
    try {
      console.log(`Updating room status: Room ID=${roomId}, Status=${status}`);
      
      // Normalize the room ID to ensure it's a proper number
      let normalizedRoomId = roomId;
      if (typeof roomId === 'string') {
        normalizedRoomId = parseInt(roomId, 10);
        if (isNaN(normalizedRoomId)) {
          console.error(`Invalid room ID format: ${roomId}`);
          return { success: false, error: 'Invalid room ID format' };
        }
      }
      
      console.log(`Normalized Room ID: ${normalizedRoomId}`);
      
      // First update local state so UI is responsive
      dispatch({ 
        type: 'UPDATE_ROOM_STATUS', 
        payload: { roomId: normalizedRoomId, status } 
      });

      // Save to local storage
      if (state.useMockData) {
        console.log('Using mock data - saving to localStorage');
        
        // Update the room in localStorage too
        const updatedRooms = state.rooms.map(room => 
          room.id === normalizedRoomId ? { ...room, status } : room
        );
        
        localStorage.setItem(STORAGE_KEYS.ROOMS, JSON.stringify(updatedRooms));
        
        return { success: true };
      }

      // Try to update the room status in Supabase
      console.log(`Sending update to Supabase: Room ID=${normalizedRoomId}, Status=${status}`);
      const { data, error } = await supabase
        .from('rooms')
        .update({ status, updated_at: new Date().toISOString() })
        .eq('id', normalizedRoomId)
        .select();
      
      if (error) {
        console.error('Supabase error updating room status:', error);
        return handleDatabaseError('updateRoomStatus', error);
      }
      
      console.log('Room status updated successfully in database:', data);
      return { success: true, data };
    } catch (error) {
      console.error('Error updating room status:', error);
      return { success: false, error: error.message };
    }
  };
  
  // Guest check-in operation
  const checkInGuest = async (roomId, guestData) => {
    try {
      // First update local state
      dispatch({ 
        type: 'UPDATE_ROOM_STATUS', 
        payload: { roomId, status: 'Occupied' } 
      });
      
      // Create a new reservation with Checked In status
      const reservationData = {
        room_id: roomId,
        guest_name: guestData.name,
        guest_email: guestData.email,
        guest_phone: guestData.phone,
        check_in_date: new Date().toISOString(),
        check_out_date: guestData.checkOutDate || new Date(Date.now() + 86400000 * 3).toISOString(), // Default: 3 days
        status: 'Checked In',
        room_type: state.rooms.find(r => r.id === roomId)?.type || 'Standard',
        special_requests: guestData.specialRequests || '',
        payment_method: 'Credit Card',
        payment_status: 'Pending',
        adults: 2,
        children: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      
      // Generate a temporary ID for the reservation
      const tempId = 'local-' + Date.now();
      const newReservation = { id: tempId, ...reservationData };
      
      // Update local state with new reservation
      dispatch({ type: 'ADD_RESERVATION', payload: newReservation });
      
      // If using mock data, don't try to update database
      if (state.useMockData) {
        console.log('Using mock data - skipping database operations for check-in');
        return { success: true, data: newReservation };
      }
      
      // Try to update in database
      try {
        // Update room status in database
        const roomUpdateResult = await supabase
          .from('rooms')
          .update({ status: 'Occupied', updated_at: new Date().toISOString() })
          .eq('id', roomId);
        
        if (roomUpdateResult.error) {
          return handleDatabaseError('checkInGuest - room update', roomUpdateResult.error);
        }
        
        // Create reservation in database
        const { data, error } = await createReservationService(reservationData);
        
        if (error) {
          return handleDatabaseError('checkInGuest - reservation creation', error);
        }
        
        // Update the local reservation with the real ID from the database
        dispatch({ type: 'UPDATE_RESERVATION', payload: { ...newReservation, id: data.id } });
        
        return { success: true, data };
      } catch (dbError) {
        return handleDatabaseError('checkInGuest', dbError);
      }
    } catch (error) {
      console.error('Error checking in guest:', error);
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
        
        // If using mock data, don't try to update database
        if (state.useMockData) {
          console.log('Using mock data - skipping database operations for check-out');
          return { success: true };
        }
        
        // Try to update in database
        try {
          // Update room status in database
          const roomUpdateResult = await supabase
            .from('rooms')
            .update({ status: 'Available', updated_at: new Date().toISOString() })
            .eq('id', roomId);
          
          if (roomUpdateResult.error) {
            return handleDatabaseError('checkOutGuest - room update', roomUpdateResult.error);
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
            return handleDatabaseError('checkOutGuest - reservation update', error);
          }
        } catch (dbError) {
          return handleDatabaseError('checkOutGuest', dbError);
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
      
      // Check if we're using mock data
      console.log('Using mock data mode:', state.useMockData);
      
      if (state.useMockData) {
        console.log('Using mock data - skipping database updates');
        return { success: true, data: newReservation, isMock: true };
      }
      
      // Try to update in database
      try {
        // Update room status in database
        console.log('Updating room status in Supabase:', { roomId, status: 'Reserved' });
        const roomUpdateResult = await supabase
          .from('rooms')
          .update({ status: 'Reserved', updated_at: new Date().toISOString() })
          .eq('id', roomId);
        
        if (roomUpdateResult.error) {
          console.error('Error updating room status in Supabase:', roomUpdateResult.error);
          return handleDatabaseError('createReservation - room update', roomUpdateResult.error);
        }
        
        // Create reservation in database
        console.log('Sending reservation data to createReservationService:', reservationData);
        const { data, error } = await createReservationService(reservationData);
        
        if (error) {
          console.error('Error returned from createReservationService:', error);
          return handleDatabaseError('createReservation - reservation creation', error);
        }
        
        console.log('Reservation successfully created in Supabase:', data);
        
        // Update the local reservation with the real ID
        dispatch({ type: 'UPDATE_RESERVATION', payload: { ...newReservation, id: data.id } });
        
        return { success: true, data };
      } catch (dbError) {
        console.error('Exception during database operations:', dbError);
        return handleDatabaseError('createReservation', dbError);
      }
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
      if (!reservation) throw new Error(`Reservation with ID ${reservationId} not found`);
      
      // Update local state first
      dispatch({ 
        type: 'UPDATE_ROOM_STATUS', 
        payload: { roomId: reservation.room_id, status: 'Available' } 
      });
      
      dispatch({ type: 'DELETE_RESERVATION', payload: reservationId });
      
      // If using mock data, don't try to update database
      if (state.useMockData) {
        console.log('Using mock data - skipping database operations for cancellation');
        return { success: true };
      }
      
      // Try to update in database
      try {
        // Update room status in database
        const roomUpdateResult = await supabase
          .from('rooms')
          .update({ status: 'Available', updated_at: new Date().toISOString() })
          .eq('id', reservation.room_id);
        
        if (roomUpdateResult.error) {
          return handleDatabaseError('cancelReservation - room update', roomUpdateResult.error);
        }
        
        // Delete the reservation from database
        const { error } = await deleteReservationService(reservationId);
        
        if (error) {
          return handleDatabaseError('cancelReservation - reservation delete', error);
        }
      } catch (dbError) {
        return handleDatabaseError('cancelReservation', dbError);
      }
      
      return { success: true };
    } catch (error) {
      console.error('Error canceling reservation:', error);
      return { success: false, error: error.message };
    }
  };
  
  // Helper function to handle Supabase RLS errors
  const handleDatabaseError = (operation, error) => {
    console.warn(`Database error in ${operation}:`, error);
    
    // If this is an RLS error, switch to mock data mode
    if (error.code === '42501') {
      console.warn('Row-level security policy violation detected. Switching to mock data mode.');
      dispatch({ type: 'SET_MOCK_DATA_MODE', payload: true });
    }
    
    return { 
      success: true, 
      warning: true, 
      message: 'Operation completed in UI but database update failed. Data will persist in this session only.',
      error 
    };
  };
  
  // Clear all local data (for testing)
  const clearLocalData = () => {
    localStorage.removeItem(STORAGE_KEYS.ROOMS);
    localStorage.removeItem(STORAGE_KEYS.RESERVATIONS);
    localStorage.removeItem(STORAGE_KEYS.MODE);
    
    // Reload with fresh data
    window.location.reload();
  };
  
  // Get filtered rooms
  const getRooms = (filters = {}) => {
    let filteredRooms = [...state.rooms];
    
    if (filters.status) {
      filteredRooms = filteredRooms.filter(room => room.status === filters.status);
    }
    
    if (filters.type) {
      filteredRooms = filteredRooms.filter(room => room.type === filters.type);
    }
    
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
  
  // Refresh all data
  const refreshData = async () => {
    dispatch({ type: 'SET_LOADING', payload: true });
    
    try {
      // If using mock data, don't try to refresh from database
      if (state.useMockData) {
        console.log('Using mock data - skipping database refresh');
        dispatch({ type: 'SET_LOADING', payload: false });
        return { success: true };
      }
      
      // Try to fetch updated room data
      const { data: roomsData, error: roomsError } = await supabase
        .from('rooms')
        .select('*');
      
      if (!roomsError && roomsData) {
        dispatch({ type: 'SET_ROOMS', payload: roomsData });
      } else {
        console.warn('Error refreshing rooms data:', roomsError);
        // Keep existing room data
      }
      
      // Try to fetch updated reservation data
      try {
        const { data: reservationsData, error: reservationsError } = await getReservations();
        
        if (!reservationsError && reservationsData) {
          dispatch({ type: 'SET_RESERVATIONS', payload: reservationsData });
        } else {
          console.warn('Error refreshing reservations data:', reservationsError);
          // Keep existing reservation data
        }
      } catch (resError) {
        console.warn('Exception refreshing reservations:', resError);
        // Keep existing reservation data
      }
    } catch (error) {
      console.error('Error refreshing data:', error);
      dispatch({ type: 'SET_ERROR', payload: error });
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
    
    return { success: true };
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
  
  return (
    <RoomReservationContext.Provider 
      value={{ 
        ...state, 
        updateRoomStatus,
        checkInGuest,
        checkOutGuest,
        createReservation,
        cancelReservation,
        handleDatabaseError,
        getRooms,
        getRoomById,
        getReservationById,
        getReservationsForRoom,
        getActiveReservationForRoom,
        refreshData,
        clearLocalData,
        updateRevenueStats
      }}
    >
      {children}
    </RoomReservationContext.Provider>
  );
};

export const useRoomReservation = () => useContext(RoomReservationContext); 