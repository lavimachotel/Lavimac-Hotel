import { useState, useEffect } from 'react';
import databaseService from '../database/DatabaseService.js';

const useOfflineRooms = () => {
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isInitialized, setIsInitialized] = useState(false);

  // Initialize database and load rooms
  useEffect(() => {
    initializeDatabase();
  }, []);

  const initializeDatabase = async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('Initializing offline database...');
      await databaseService.initialize();
      setIsInitialized(true);
      
      console.log('Loading rooms from offline database...');
      await loadRooms();
    } catch (err) {
      console.error('Failed to initialize offline database:', err);
      setError('Failed to initialize offline database');
      setLoading(false);
    }
  };

  const loadRooms = async () => {
    try {
      setLoading(true);
      const roomsRepo = databaseService.getRepository('rooms');
      const roomsData = await roomsRepo.getAllRooms();
      
      console.log(`Loaded ${roomsData.length} rooms from offline database`);
      setRooms(roomsData);
      setError(null);
    } catch (err) {
      console.error('Failed to load rooms:', err);
      setError('Failed to load rooms');
    } finally {
      setLoading(false);
    }
  };

  const updateRoomStatus = async (roomId, newStatus) => {
    try {
      const roomsRepo = databaseService.getRepository('rooms');
      
      // Update in database
      await roomsRepo.updateRoomStatus(roomId, newStatus);
      
      // Update local state
      setRooms(prevRooms => 
        prevRooms.map(room => 
          room.id === roomId ? { ...room, status: newStatus } : room
        )
      );
      
      console.log(`Updated room ${roomId} status to ${newStatus}`);
      return { success: true };
    } catch (err) {
      console.error('Failed to update room status:', err);
      setError('Failed to update room status');
      return { success: false, error: err.message };
    }
  };

  const checkInGuest = async (roomId, guestData, dates) => {
    try {
      const roomsRepo = databaseService.getRepository('rooms');
      const guestsRepo = databaseService.getRepository('guests');
      
      // Create guest record
      const guest = {
        ...guestData,
        room: roomId,
        check_in: dates.checkIn,
        check_out: dates.checkOut,
        status: 'Checked In'
      };
      
      await guestsRepo.create(guest);
      
      // Update room status
      await updateRoomStatus(roomId, 'Occupied');
      
      console.log(`Checked in guest ${guestData.name} to room ${roomId}`);
      return { success: true };
    } catch (err) {
      console.error('Failed to check in guest:', err);
      setError('Failed to check in guest');
      return { success: false, error: err.message };
    }
  };

  const checkOutGuest = async (roomId) => {
    try {
      const guestsRepo = databaseService.getRepository('guests');
      
      // Find and update guest record
      const guests = await guestsRepo.findAll({ room: roomId, status: 'Checked In' });
      if (guests.length > 0) {
        await guestsRepo.update(guests[0].id, { 
          status: 'Checked Out',
          check_out: new Date().toISOString()
        });
      }
      
      // Update room status
      await updateRoomStatus(roomId, 'Available');
      
      console.log(`Checked out guest from room ${roomId}`);
      return { success: true };
    } catch (err) {
      console.error('Failed to check out guest:', err);
      setError('Failed to check out guest');
      return { success: false, error: err.message };
    }
  };

  const createReservation = async (roomId, guestData, dates) => {
    try {
      const reservationsRepo = databaseService.getRepository('reservations');
      
      // Create reservation record
      const reservation = {
        room_id: roomId,
        guest_name: guestData.name,
        check_in: dates.checkIn,
        check_out: dates.checkOut,
        status: 'Reserved'
      };
      
      await reservationsRepo.create(reservation);
      
      // Update room status
      await updateRoomStatus(roomId, 'Reserved');
      
      console.log(`Created reservation for ${guestData.name} in room ${roomId}`);
      return { success: true };
    } catch (err) {
      console.error('Failed to create reservation:', err);
      setError('Failed to create reservation');
      return { success: false, error: err.message };
    }
  };

  const getRoom = async (roomId) => {
    try {
      const roomsRepo = databaseService.getRepository('rooms');
      const room = await roomsRepo.findById(roomId);
      return room;
    } catch (err) {
      console.error('Failed to get room:', err);
      return null;
    }
  };

  const refreshRooms = async () => {
    await loadRooms();
  };

  return {
    rooms,
    loading,
    error,
    isInitialized,
    updateRoomStatus,
    checkInGuest,
    checkOutGuest,
    createReservation,
    getRoom,
    refreshRooms,
    initializeDatabase
  };
};

export default useOfflineRooms; 