import React, { createContext, useContext, useState, useEffect } from 'react';
import useOfflineDatabase from '../hooks/useOfflineDatabase';

const OfflineRoomContext = createContext();

export const useOfflineRoom = () => {
  const context = useContext(OfflineRoomContext);
  if (!context) {
    throw new Error('useOfflineRoom must be used within an OfflineRoomProvider');
  }
  return context;
};

export const OfflineRoomProvider = ({ children }) => {
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const { isInitialized, getRooms } = useOfflineDatabase();

  useEffect(() => {
    if (isInitialized) {
      loadRooms();
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

  const value = {
    rooms,
    loading,
    error,
    refreshRooms: loadRooms,
    clearError: () => setError(null)
  };

  return (
    <OfflineRoomContext.Provider value={value}>
      {children}
    </OfflineRoomContext.Provider>
  );
}; 