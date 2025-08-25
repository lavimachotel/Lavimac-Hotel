import React, { createContext, useContext, useState, useEffect } from 'react';
import useOfflineDatabase from '../hooks/useOfflineDatabase';

const OfflineReservationContext = createContext();

export const useOfflineReservation = () => {
  const context = useContext(OfflineReservationContext);
  if (!context) {
    throw new Error('useOfflineReservation must be used within an OfflineReservationProvider');
  }
  return context;
};

export const OfflineReservationProvider = ({ children }) => {
  const [reservations, setReservations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const { isInitialized, getReservations } = useOfflineDatabase();

  useEffect(() => {
    if (isInitialized) {
      loadReservations();
    }
  }, [isInitialized]);

  const loadReservations = async () => {
    try {
      setLoading(true);
      const reservationsData = await getReservations();
      setReservations(reservationsData);
      setError(null);
    } catch (err) {
      console.error('Error loading reservations:', err);
      setError('Failed to load reservations');
    } finally {
      setLoading(false);
    }
  };

  const value = {
    reservations,
    loading,
    error,
    refreshReservations: loadReservations,
    clearError: () => setError(null)
  };

  return (
    <OfflineReservationContext.Provider value={value}>
      {children}
    </OfflineReservationContext.Provider>
  );
}; 