import { useState, useEffect, useCallback } from 'react';
import offlineDatabaseService from '../services/OfflineDatabaseService';

/**
 * React Hook for Offline Database
 * Provides easy access to offline database functionality
 */
export const useOfflineDatabase = () => {
  const [isInitialized, setIsInitialized] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  // Initialize database on first use
  const initialize = useCallback(async () => {
    if (isInitialized) return true;

    setIsLoading(true);
    setError(null);

    try {
      await offlineDatabaseService.initialize();
      setIsInitialized(true);
      return true;
    } catch (err) {
      setError(err.message);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [isInitialized]);

  // Auto-initialize on mount
  useEffect(() => {
    initialize();
  }, [initialize]);

  // Get all rooms
  const getRooms = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const rooms = await offlineDatabaseService.getRooms();
      return rooms;
    } catch (err) {
      setError(err.message);
      return [];
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Get rooms by status
  const getRoomsByStatus = useCallback(async (status) => {
    setIsLoading(true);
    setError(null);

    try {
      const rooms = await offlineDatabaseService.getRoomsByStatus(status);
      return rooms;
    } catch (err) {
      setError(err.message);
      return [];
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Update room status
  const updateRoomStatus = useCallback(async (roomId, status) => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await offlineDatabaseService.updateRoomStatus(roomId, status);
      return result;
    } catch (err) {
      setError(err.message);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Get room by number
  const getRoomByNumber = useCallback(async (roomNumber) => {
    setIsLoading(true);
    setError(null);

    try {
      const room = await offlineDatabaseService.getRoomByNumber(roomNumber);
      return room;
    } catch (err) {
      setError(err.message);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Create guest
  const createGuest = useCallback(async (guestData) => {
    setIsLoading(true);
    setError(null);

    try {
      const guestId = await offlineDatabaseService.createGuest(guestData);
      return guestId;
    } catch (err) {
      setError(err.message);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Create reservation
  const createReservation = useCallback(async (reservationData) => {
    setIsLoading(true);
    setError(null);

    try {
      const reservationId = await offlineDatabaseService.createReservation(reservationData);
      return reservationId;
    } catch (err) {
      setError(err.message);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Get user by email
  const getUserByEmail = useCallback(async (email) => {
    setError(null);

    try {
      const user = await offlineDatabaseService.getUserByEmail(email);
      return user;
    } catch (err) {
      setError(err.message);
      return null;
    }
  }, []);

  // Create user
  const createUser = useCallback(async (userData) => {
    setError(null);

    try {
      const userId = await offlineDatabaseService.createUser(userData);
      return userId;
    } catch (err) {
      setError(err.message);
      return null;
    }
  }, []);

  // Get database statistics
  const getStats = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const stats = await offlineDatabaseService.getStats();
      return stats;
    } catch (err) {
      setError(err.message);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    // State
    isInitialized,
    isLoading,
    error,
    
    // Methods
    initialize,
    getRooms,
    getRoomsByStatus,
    updateRoomStatus,
    getRoomByNumber,
    createGuest,
    createReservation,
    getUserByEmail,
    createUser,
    getStats,
    
    // Utility
    clearError: () => setError(null),
    isReady: () => isInitialized && !isLoading
  };
};

export default useOfflineDatabase; 