import React, { createContext, useContext, useState, useEffect } from 'react';
import useOfflineDatabase from '../hooks/useOfflineDatabase';

const OfflineRoomReservationContext = createContext();

export const useOfflineRoomReservation = () => {
  const context = useContext(OfflineRoomReservationContext);
  if (!context) {
    throw new Error('useOfflineRoomReservation must be used within an OfflineRoomReservationProvider');
  }
  return context;
};

export const OfflineRoomReservationProvider = ({ children }) => {
  const [rooms, setRooms] = useState([]);
  const [reservations, setReservations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [revenue, setRevenue] = useState({ total: 0, dates: [], values: [] });
  const [isShiftActive, setIsShiftActive] = useState(false);

  const {
    isInitialized,
    getRooms,
    updateRoomStatus,
    getReservations,
    createReservation,
    updateReservation,
    deleteReservation,
    getRevenue
  } = useOfflineDatabase();

  // Load initial data when database is ready
  useEffect(() => {
    if (isInitialized) {
      loadRooms();
      loadReservations();
      loadRevenue();
    }
  }, [isInitialized]);

  const loadRooms = async () => {
    try {
      setLoading(true);
      const roomsData = await getRooms();
      setRooms(roomsData);
      setError(null);
    } catch (err) {
      console.error('Error loading rooms:', err);
      setError('Failed to load rooms');
    } finally {
      setLoading(false);
    }
  };

  const loadReservations = async () => {
    try {
      const reservationsData = await getReservations();
      setReservations(reservationsData);
    } catch (err) {
      console.error('Error loading reservations:', err);
      setError('Failed to load reservations');
    }
  };

  const loadRevenue = async () => {
    try {
      const revenueData = await getRevenue();
      setRevenue(revenueData);
    } catch (err) {
      console.error('Error loading revenue:', err);
    }
  };

  const checkInGuest = async (roomId, guestData, dates) => {
    try {
      setLoading(true);
      
      // Update room status to occupied
      await updateRoomStatus(roomId, 'Occupied', {
        guestName: guestData.name,
        checkInDate: dates.checkIn,
        checkOutDate: dates.checkOut
      });

      // Create a reservation record
      const reservationData = {
        room_id: roomId,
        guest_name: guestData.name,
        check_in_date: dates.checkIn,
        check_out_date: dates.checkOut,
        status: 'confirmed',
        total_amount: 0 // Will be calculated based on room rate and duration
      };

      await createReservation(reservationData);

      // Reload data
      await Promise.all([loadRooms(), loadReservations(), loadRevenue()]);
      
      setError(null);
      return { success: true };
    } catch (err) {
      console.error('Error checking in guest:', err);
      setError('Failed to check in guest');
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  };

  const checkOutGuest = async (roomId) => {
    try {
      setLoading(true);
      
      // Update room status to available
      await updateRoomStatus(roomId, 'Available');

      // Update any active reservations for this room
      const activeReservations = reservations.filter(
        res => res.room_id === roomId && res.status === 'confirmed'
      );

      for (const reservation of activeReservations) {
        await updateReservation(reservation.id, { status: 'completed' });
      }

      // Reload data
      await Promise.all([loadRooms(), loadReservations(), loadRevenue()]);
      
      setError(null);
      return { success: true };
    } catch (err) {
      console.error('Error checking out guest:', err);
      setError('Failed to check out guest');
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  };

  const makeReservation = async (reservationData) => {
    try {
      setLoading(true);
      
      // Create reservation
      await createReservation(reservationData);

      // Update room status to reserved if the check-in is today or future
      const checkInDate = new Date(reservationData.check_in_date);
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      if (checkInDate >= today) {
        await updateRoomStatus(reservationData.room_id, 'Reserved', {
          guestName: reservationData.guest_name,
          checkInDate: reservationData.check_in_date,
          checkOutDate: reservationData.check_out_date
        });
      }

      // Reload data
      await Promise.all([loadRooms(), loadReservations(), loadRevenue()]);
      
      setError(null);
      return { success: true };
    } catch (err) {
      console.error('Error making reservation:', err);
      setError('Failed to make reservation');
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  };

  const cancelReservation = async (reservationId) => {
    try {
      setLoading(true);
      
      // Find the reservation
      const reservation = reservations.find(res => res.id === reservationId);
      if (!reservation) {
        throw new Error('Reservation not found');
      }

      // Update reservation status to cancelled
      await updateReservation(reservationId, { status: 'cancelled' });

      // If room is reserved, make it available
      const room = rooms.find(r => r.id === reservation.room_id);
      if (room && room.status === 'Reserved') {
        await updateRoomStatus(reservation.room_id, 'Available');
      }

      // Reload data
      await Promise.all([loadRooms(), loadReservations(), loadRevenue()]);
      
      setError(null);
      return { success: true };
    } catch (err) {
      console.error('Error cancelling reservation:', err);
      setError('Failed to cancel reservation');
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  };

  const updateRoomStatusOnly = async (roomId, status, metadata = {}) => {
    try {
      setLoading(true);
      
      await updateRoomStatus(roomId, status, metadata);
      await loadRooms();
      
      setError(null);
      return { success: true };
    } catch (err) {
      console.error('Error updating room status:', err);
      setError('Failed to update room status');
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  };

  const getRoomById = (roomId) => {
    return rooms.find(room => room.id === parseInt(roomId));
  };

  const getReservationById = (reservationId) => {
    return reservations.find(res => res.id === parseInt(reservationId));
  };

  const getReservationsByRoom = (roomId) => {
    return reservations.filter(res => res.room_id === parseInt(roomId));
  };

  const getReservationsByDate = (date) => {
    const targetDate = new Date(date).toISOString().split('T')[0];
    return reservations.filter(res => 
      res.check_in_date <= targetDate && res.check_out_date >= targetDate
    );
  };

  const startShift = () => {
    setIsShiftActive(true);
    localStorage.setItem('offlineShiftActive', 'true');
  };

  const endShift = () => {
    setIsShiftActive(false);
    localStorage.removeItem('offlineShiftActive');
  };

  // Check for active shift on load
  useEffect(() => {
    const shiftActive = localStorage.getItem('offlineShiftActive');
    setIsShiftActive(!!shiftActive);
  }, []);

  const value = {
    // Data
    rooms,
    reservations,
    revenue,
    loading,
    error,
    isShiftActive,

    // Room operations
    getRooms: loadRooms,
    updateRoomStatus: updateRoomStatusOnly,
    getRoomById,

    // Guest operations
    checkInGuest,
    checkOutGuest,

    // Reservation operations
    createReservation: makeReservation,
    updateReservation,
    deleteReservation,
    cancelReservation,
    getReservationById,
    getReservationsByRoom,
    getReservationsByDate,

    // Shift operations
    startShift,
    endShift,

    // Utility
    refreshData: () => Promise.all([loadRooms(), loadReservations(), loadRevenue()]),
    clearError: () => setError(null)
  };

  return (
    <OfflineRoomReservationContext.Provider value={value}>
      {children}
    </OfflineRoomReservationContext.Provider>
  );
}; 