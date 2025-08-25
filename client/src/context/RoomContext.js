import React, { createContext, useContext, useState, useEffect } from 'react';
import { useRoomReservation } from './RoomReservationContext';

const RoomContext = createContext();

export const RoomProvider = ({ children }) => {
  const { rooms, loading: roomsLoading, error: roomsError, getReservedRoomIds } = useRoomReservation();
  const [filteredRooms, setFilteredRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [roomTypes, setRoomTypes] = useState([]);

  useEffect(() => {
    setLoading(roomsLoading);
    setError(roomsError);
    setFilteredRooms(rooms || []);
    
    // Extract unique room types
    if (rooms && rooms.length > 0) {
      const types = [...new Set(rooms.map(room => room.type))];
      setRoomTypes(types);
    }
  }, [rooms, roomsLoading, roomsError]);

  // Get available rooms for a date range
  const getAvailableRooms = (startDate, endDate) => {
    if (!rooms) return [];
    
    // Get reserved room IDs for the date range
    const reservedRoomIds = getReservedRoomIds ? getReservedRoomIds(startDate, endDate) : [];
    
    // Filter out reserved rooms
    return rooms.filter(room => !reservedRoomIds.includes(room.id) && room.status === 'available');
  };

  // Filter rooms by type
  const filterRoomsByType = (type) => {
    if (!rooms) return [];
    if (!type || type === 'all') return rooms;
    
    return rooms.filter(room => room.type === type);
  };

  // Filter rooms by status
  const filterRoomsByStatus = (status) => {
    if (!rooms) return [];
    if (!status || status === 'all') return rooms;
    
    return rooms.filter(room => room.status === status);
  };

  // Calculate occupancy rate
  const calculateOccupancyRate = () => {
    if (!rooms || rooms.length === 0) return 0;
    
    const occupiedRooms = rooms.filter(room => room.status === 'occupied');
    return (occupiedRooms.length / rooms.length) * 100;
  };

  const value = {
    rooms,
    loading,
    error,
    roomTypes,
    getAvailableRooms,
    filterRoomsByType,
    filterRoomsByStatus,
    calculateOccupancyRate
  };

  return (
    <RoomContext.Provider value={value}>
      {children}
    </RoomContext.Provider>
  );
};

export const useRooms = () => {
  const context = useContext(RoomContext);
  if (context === undefined) {
    throw new Error('useRooms must be used within a RoomProvider');
  }
  return context;
}; 