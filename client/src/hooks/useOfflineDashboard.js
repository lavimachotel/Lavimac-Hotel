import { useState, useEffect } from 'react';
import databaseService from '../database/DatabaseService.js';

const useOfflineDashboard = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isInitialized, setIsInitialized] = useState(false);
  
  // Dashboard data state - matching online Dashboard exactly
  const [rooms, setRooms] = useState([]);
  const [guests, setGuests] = useState([]);
  const [reservations, setReservations] = useState([]);
  const [checkIns, setCheckIns] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [revenueData, setRevenueData] = useState({ dates: [], values: [] });
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [todaysCheckIns, setTodaysCheckIns] = useState([]);
  const [recentReservations, setRecentReservations] = useState([]);
  const [restaurantStats, setRestaurantStats] = useState({
    totalRevenue: 0,
    totalOrders: 0,
    avgOrderValue: 0,
    popularItems: []
  });

  // Initialize database and load all dashboard data
  useEffect(() => {
    initializeDashboard();
  }, []);

  const initializeDashboard = async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('Initializing offline dashboard...');
      await databaseService.initialize();
      setIsInitialized(true);
      
      console.log('Loading dashboard data from offline database...');
      await loadAllDashboardData();
    } catch (err) {
      console.error('Failed to initialize offline dashboard:', err);
      setError('Failed to initialize offline dashboard');
    } finally {
      setLoading(false);
    }
  };

  const loadAllDashboardData = async () => {
    try {
      await Promise.all([
        loadRooms(),
        loadGuests(),
        loadReservations(),
        loadTasks(),
        loadRevenueData(),
        loadRestaurantStats()
      ]);
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
      setError('Failed to load dashboard data');
    }
  };

  const loadRooms = async () => {
    try {
      const roomsRepo = databaseService.getRepository('rooms');
      const roomsData = await roomsRepo.getAllRooms();
      setRooms(roomsData);
    } catch (err) {
      console.error('Failed to load rooms:', err);
    }
  };

  const loadGuests = async () => {
    try {
      const guestsRepo = databaseService.getRepository('guests');
      const guestsData = await guestsRepo.findAll();
      setGuests(guestsData);
      
      // Calculate today's check-ins
      const today = new Date().toISOString().split('T')[0];
      const todayCheckIns = guestsData.filter(guest => 
        guest.check_in && guest.check_in.startsWith(today) && guest.status === 'Checked In'
      );
      setTodaysCheckIns(todayCheckIns);
    } catch (err) {
      console.error('Failed to load guests:', err);
    }
  };

  const loadReservations = async () => {
    try {
      const reservationsRepo = databaseService.getRepository('reservations');
      const reservationsData = await reservationsRepo.findAll();
      setReservations(reservationsData);
      
      // Get recent reservations (last 5)
      const recent = reservationsData
        .sort((a, b) => new Date(b.created_at || b.check_in) - new Date(a.created_at || a.check_in))
        .slice(0, 5);
      setRecentReservations(recent);
    } catch (err) {
      console.error('Failed to load reservations:', err);
    }
  };

  const loadTasks = async () => {
    try {
      const tasksRepo = databaseService.getRepository('tasks');
      const tasksData = await tasksRepo.findAll({ status: 'Pending' });
      setTasks(tasksData.slice(0, 5)); // Top 5 pending tasks
    } catch (err) {
      console.error('Failed to load tasks:', err);
      // Set sample tasks for demonstration
      setTasks([
        {
          id: 1,
          title: 'Clean Room 101',
          room: '101',
          room_name: 'Mint',
          assigned_to: 'Housekeeper',
          status: 'Pending',
          priority: 'High'
        },
        {
          id: 2,
          title: 'Maintenance Room 105',
          room: '105',
          room_name: 'Licorice',
          assigned_to: 'Maintenance',
          status: 'Pending',
          priority: 'Medium'
        }
      ]);
    }
  };

  const loadRevenueData = async () => {
    try {
      const reservationsRepo = databaseService.getRepository('reservations');
      const allReservations = await reservationsRepo.findAll();
      
      // Calculate revenue from completed reservations
      const completedReservations = allReservations.filter(r => r.status === 'Completed');
      const total = completedReservations.reduce((sum, reservation) => {
        return sum + (reservation.total_amount || 0);
      }, 0);
      
      setTotalRevenue(total);
      
      // Generate sample revenue chart data (last 7 days)
      const dates = [];
      const values = [];
      for (let i = 6; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        dates.push(date.toISOString().split('T')[0]);
        values.push(Math.random() * 1000 + 500); // Sample data
      }
      
      setRevenueData({ dates, values });
    } catch (err) {
      console.error('Failed to load revenue data:', err);
      setTotalRevenue(0);
    }
  };

  const loadRestaurantStats = async () => {
    try {
      // Set sample restaurant stats (in real implementation, this would come from restaurant orders table)
      setRestaurantStats({
        totalRevenue: 2450.75,
        totalOrders: 45,
        avgOrderValue: 54.46,
        popularItems: [
          { name: 'Jollof Rice', count: 12 },
          { name: 'Grilled Chicken', count: 8 },
          { name: 'Banku & Tilapia', count: 6 }
        ]
      });
    } catch (err) {
      console.error('Failed to load restaurant stats:', err);
    }
  };

  // Room management functions - matching online Dashboard exactly
  const updateRoomStatus = async (roomId, newStatus) => {
    try {
      const roomsRepo = databaseService.getRepository('rooms');
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
      const guestsRepo = databaseService.getRepository('guests');
      const roomsRepo = databaseService.getRepository('rooms');
      
      // Create guest record
      const guest = {
        ...guestData,
        room: roomId,
        check_in: dates.checkIn,
        check_out: dates.checkOut,
        status: 'Checked In',
        created_at: new Date().toISOString()
      };
      
      await guestsRepo.create(guest);
      
      // Update room status and guest info
      await roomsRepo.updateRoom(roomId, { 
        status: 'Occupied',
        guest: guestData.name
      });
      
      // Refresh data
      await loadRooms();
      await loadGuests();
      
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
      const roomsRepo = databaseService.getRepository('rooms');
      
      // Find and update guest record
      const currentGuests = await guestsRepo.findAll({ room: roomId, status: 'Checked In' });
      if (currentGuests.length > 0) {
        await guestsRepo.update(currentGuests[0].id, { 
          status: 'Checked Out',
          check_out: new Date().toISOString()
        });
      }
      
      // Update room status and clear guest
      await roomsRepo.updateRoom(roomId, { 
        status: 'Available',
        guest: null
      });
      
      // Refresh data
      await loadRooms();
      await loadGuests();
      
      console.log(`Checked out guest from room ${roomId}`);
      return { success: true };
    } catch (err) {
      console.error('Failed to check out guest:', err);
      setError('Failed to check out guest');
      return { success: false, error: err.message };
    }
  };

  const setMaintenanceMode = async (roomId) => {
    return await updateRoomStatus(roomId, 'Maintenance');
  };

  const setAvailable = async (roomId) => {
    return await updateRoomStatus(roomId, 'Available');
  };

  const createReservation = async (roomId, guestData, dates) => {
    try {
      const reservationsRepo = databaseService.getRepository('reservations');
      const roomsRepo = databaseService.getRepository('rooms');
      
      // Create reservation record
      const reservation = {
        room_id: roomId,
        guest_name: guestData.name,
        check_in: dates.checkIn,
        check_out: dates.checkOut,
        status: 'Reserved',
        created_at: new Date().toISOString()
      };
      
      await reservationsRepo.create(reservation);
      
      // Update room status
      await roomsRepo.updateRoom(roomId, { 
        status: 'Reserved',
        guest: guestData.name
      });
      
      // Refresh data
      await loadRooms();
      await loadReservations();
      
      console.log(`Created reservation for ${guestData.name} in room ${roomId}`);
      return { success: true };
    } catch (err) {
      console.error('Failed to create reservation:', err);
      setError('Failed to create reservation');
      return { success: false, error: err.message };
    }
  };

  // Statistics calculations - matching online Dashboard exactly
  const stats = {
    totalRooms: rooms.length,
    availableRooms: rooms.filter(room => room.status === 'Available').length,
    occupiedRooms: rooms.filter(room => room.status === 'Occupied').length,
    reservedRooms: rooms.filter(room => room.status === 'Reserved').length,
    maintenanceRooms: rooms.filter(room => room.status === 'Maintenance').length,
    totalGuests: guests.filter(guest => guest.status === 'Checked In').length,
    totalRevenue,
    occupancyRate: rooms.length > 0 
      ? Math.round(((rooms.filter(room => room.status === 'Occupied').length + rooms.filter(room => room.status === 'Reserved').length) / rooms.length) * 100) 
      : 0
  };

  const refreshDashboard = async () => {
    await loadAllDashboardData();
  };

  return {
    // State
    loading,
    error,
    isInitialized,
    
    // Data - exactly matching online Dashboard
    rooms,
    guests,
    reservations,
    checkIns,
    tasks,
    revenueData,
    totalRevenue,
    todaysCheckIns,
    recentReservations,
    restaurantStats,
    stats,
    
    // Functions - exactly matching online Dashboard
    updateRoomStatus,
    checkInGuest,
    checkOutGuest,
    setMaintenanceMode,
    setAvailable,
    createReservation,
    refreshDashboard,
    initializeDashboard
  };
};

export default useOfflineDashboard; 