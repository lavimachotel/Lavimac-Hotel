import React, { createContext, useContext, useState, useEffect } from 'react';
import { useRoomReservation } from './RoomReservationContext';

const ReservationContext = createContext();

export const ReservationProvider = ({ children }) => {
  const { reservations, loading: reservationsLoading, error: reservationsError } = useRoomReservation();
  const [filteredReservations, setFilteredReservations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    setLoading(reservationsLoading);
    setError(reservationsError);
    setFilteredReservations(reservations || []);
  }, [reservations, reservationsLoading, reservationsError]);

  // Filter reservations by date range
  const filterReservationsByDate = (startDate, endDate) => {
    if (!reservations) return [];
    
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    return reservations.filter(reservation => {
      const checkInDate = new Date(reservation.check_in_date);
      const checkOutDate = new Date(reservation.check_out_date);
      
      // Return reservations that overlap with the date range
      return (checkInDate <= end && checkOutDate >= start);
    });
  };

  // Get active reservations (current and future)
  const getActiveReservations = () => {
    if (!reservations) return [];
    
    const now = new Date();
    
    return reservations.filter(reservation => {
      const checkOutDate = new Date(reservation.check_out_date);
      return checkOutDate >= now;
    });
  };

  // Calculate revenue in a date range
  const calculateRevenue = (startDate, endDate) => {
    const filteredReservations = filterReservationsByDate(startDate, endDate);
    
    return filteredReservations.reduce((total, reservation) => {
      const price = parseFloat(reservation.room_price || 0);
      return total + price;
    }, 0);
  };

  // Calculate average daily rate in a date range
  const calculateAverageDailyRate = (startDate, endDate) => {
    const filteredReservations = filterReservationsByDate(startDate, endDate);
    if (filteredReservations.length === 0) return 0;
    
    const totalRevenue = calculateRevenue(startDate, endDate);
    return totalRevenue / filteredReservations.length;
  };

  const value = {
    reservations,
    loading,
    error,
    filterReservationsByDate,
    getActiveReservations,
    calculateRevenue,
    calculateAverageDailyRate
  };

  return (
    <ReservationContext.Provider value={value}>
      {children}
    </ReservationContext.Provider>
  );
};

export const useReservations = () => {
  const context = useContext(ReservationContext);
  if (context === undefined) {
    throw new Error('useReservations must be used within a ReservationProvider');
  }
  return context;
}; 