import React, { useState, useEffect, useRef, useContext, useMemo, useCallback } from 'react';
import * as echarts from 'echarts';
import '@fortawesome/fontawesome-free/css/all.min.css';
import { useNavigate } from 'react-router-dom';
import OverviewWidget from './OverviewWidget';
import OfflineCheckInModal from './OfflineCheckInModal';
import { useOfflineGuests } from '../context/OfflineGuestContext';
import { useOfflineUser } from '../context/OfflineUserContext';
import OfflineNavbar from './OfflineNavbar';
import OfflineSidebar from './OfflineSidebar';
import { useTheme } from '../context/ThemeContext';
import OfflineRoomTooltip from './OfflineRoomTooltip';
import OfflineRoomContextMenu from './OfflineRoomContextMenu';
import { useOfflineRoomReservation } from '../context/OfflineRoomReservationContext';
import { format, isToday, parseISO } from 'date-fns';
import '../styles/Dashboard.css';
import useOfflineDatabase from '../hooks/useOfflineDatabase';

// Room Check-in Modal Component
const OfflineRoomCheckInModal = ({ isOpen, onClose, onCheckIn, roomId }) => {
  const { theme } = useTheme();
  const isDarkMode = theme === 'dark';
  const [guestName, setGuestName] = useState('');
  const [checkInDate, setCheckInDate] = useState(new Date().toISOString().split('T')[0]);
  
  // Calculate default checkout date (1 day from check-in by default)
  const defaultCheckOut = new Date();
  defaultCheckOut.setDate(defaultCheckOut.getDate() + 1);
  const [checkOutDate, setCheckOutDate] = useState(defaultCheckOut.toISOString().split('T')[0]);
  
  if (!isOpen) return null;
  
  const handleSubmit = (e) => {
    e.preventDefault();
    onCheckIn(roomId, guestName, checkInDate, checkOutDate);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className={`${isDarkMode ? 'bg-gray-800 text-white' : 'bg-white text-gray-800'} rounded-lg p-6 w-full max-w-md`}>
        <h2 className="text-xl font-semibold mb-4">Check In - Room {roomId}</h2>
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block mb-2 text-sm font-medium">Guest Name</label>
            <input 
              type="text" 
              value={guestName} 
              onChange={(e) => setGuestName(e.target.value)} 
              className={`w-full p-2 rounded border ${isDarkMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-300'}`}
              placeholder="Enter guest name"
              required
            />
          </div>
          <div className="mb-4">
            <label className="block mb-2 text-sm font-medium">Check-in Date</label>
            <input 
              type="date" 
              value={checkInDate} 
              onChange={(e) => setCheckInDate(e.target.value)} 
              className={`w-full p-2 rounded border ${isDarkMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-300'}`}
              required
            />
          </div>
          <div className="mb-4">
            <label className="block mb-2 text-sm font-medium">Check-out Date</label>
            <input 
              type="date" 
              value={checkOutDate} 
              onChange={(e) => setCheckOutDate(e.target.value)} 
              className={`w-full p-2 rounded border ${isDarkMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-300'}`}
              required
            />
          </div>
          <div className="flex justify-end space-x-2">
            <button 
              type="button" 
              onClick={onClose}
              className={`px-4 py-2 rounded ${isDarkMode ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-200 hover:bg-gray-300'}`}
            >
              Cancel
            </button>
            <button 
              type="submit" 
              className="px-4 py-2 rounded bg-blue-500 text-white hover:bg-blue-600"
            >
              Check In
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const OfflineDashboard = () => {
  const { theme } = useTheme();
  const isDarkMode = theme === 'dark';
  const { getRooms, revenue, updateRoomStatus } = useOfflineRoomReservation();
  const { guestList } = useOfflineGuests();
  const navigate = useNavigate();
  const dashboardRef = useRef(null);
  const revenueChartRef = useRef(null);
  const taskChartRef = useRef(null);
  const occRateChartRef = useRef(null);
  const [tasks, setTasks] = useState([]);
  const [totalGuests, setTotalGuests] = useState(0);
  const [rooms, setRooms] = useState([]);
  const [reservations, setReservations] = useState([]);
  const [checkIns, setCheckIns] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(false);
  const [revenueData, setRevenueData] = useState({ dates: [], values: [] });
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [stats, setStats] = useState({
    availableRooms: 0,
    occupiedRooms: 0,
    reservedRooms: 0,
    totalRevenue: 0,
  });
  const [menuPosition, setMenuPosition] = useState({ x: 0, y: 0 });
  const [showContextMenu, setShowContextMenu] = useState(false);
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [isCheckInModalOpen, setIsCheckInModalOpen] = useState(false);
  const [hoveredRoom, setHoveredRoom] = useState(null);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });
  const [showTooltip, setShowTooltip] = useState(false);
  const [todaysCheckIns, setTodaysCheckIns] = useState([]);
  const [recentReservations, setRecentReservations] = useState([]);
  const [restaurantStats, setRestaurantStats] = useState({
    totalRevenue: 0,
    totalOrders: 0,
    avgOrderValue: 0,
    popularItems: []
  });
  const [restaurantDateRange, setRestaurantDateRange] = useState('all');

  // Use offline database hook
  const {
    isInitialized,
    getRooms: getOfflineRooms,
    updateRoomStatus: updateOfflineRoomStatus,
    getStats: getOfflineStats,
    getTasks: getOfflineTasks,
    getReservations: getOfflineReservations,
    getRevenue: getOfflineRevenue
  } = useOfflineDatabase();

  // Stats calculation with defensive coding
  const totalRooms = rooms?.length || 0;
  const availableRooms = rooms?.filter(room => room.status === 'Available').length || 0;
  const occupiedRooms = rooms?.filter(room => room.status === 'Occupied').length || 0;
  const reservedRooms = rooms?.filter(room => room.status === 'Reserved').length || 0;
  const maintenanceRooms = rooms?.filter(room => room.status === 'Maintenance').length || 0;
  const cleaningRooms = rooms?.filter(room => room.status === 'Cleaning').length || 0;
  
  // Calculate occupancy rate including both occupied and reserved rooms
  const occupancyRate = totalRooms > 0 
    ? Math.round(((occupiedRooms + reservedRooms) / totalRooms) * 100) 
    : 0;

  // Calculate total guests (occupied + reserved rooms) with defensive coding
  const calculateTotalGuests = () => {
    if (Array.isArray(rooms)) {
      const totalGuests = rooms.filter(room => room && room.guest).length;
      setTotalGuests(totalGuests);
    }
  };

  // Dynamic notifications
  const [notificationCount, setNotificationCount] = useState(0);

  // Fetch data from offline database
  useEffect(() => {
    if (isInitialized) {
      fetchRoomData();
      fetchTasks();
      fetchReservations();
      fetchRevenue();
    }
  }, [isInitialized]);

  const fetchRoomData = async () => {
    try {
      const roomsData = await getOfflineRooms();
      setRooms(roomsData);
      calculateTotalGuests();
    } catch (error) {
      console.error('Error fetching rooms:', error);
    }
  };

  const fetchTasks = async () => {
    try {
      const tasksData = await getOfflineTasks();
      setTasks(tasksData.filter(task => task.status === 'Pending').slice(0, 5));
    } catch (error) {
      console.error('Error fetching tasks:', error);
    }
  };

  const fetchReservations = async () => {
    try {
      const reservationsData = await getOfflineReservations();
      setReservations(reservationsData);
      setRecentReservations(reservationsData.slice(0, 5));
      
      // Filter today's check-ins
      const today = new Date().toISOString().split('T')[0];
      const todayCheckIns = reservationsData.filter(res => 
        res.check_in_date === today && res.status === 'confirmed'
      );
      setTodaysCheckIns(todayCheckIns);
    } catch (error) {
      console.error('Error fetching reservations:', error);
    }
  };

  const fetchRevenue = async () => {
    try {
      const revenueData = await getOfflineRevenue();
      setTotalRevenue(revenueData.total || 0);
      setRevenueData({
        dates: revenueData.dates || [],
        values: revenueData.values || []
      });
    } catch (error) {
      console.error('Error fetching revenue:', error);
    }
  };

  // Handle check-in
  const handleCheckIn = async (roomId, guestName, checkInDate, checkOutDate) => {
    try {
      // In offline mode, we'll update the room status and create a guest record
      await updateOfflineRoomStatus(roomId, 'Occupied', {
        guestName,
        checkInDate,
        checkOutDate
      });
      
      // Refresh room data
      await fetchRoomData();
      setIsCheckInModalOpen(false);
    } catch (error) {
      console.error('Error checking in guest:', error);
    }
  };

  const handleCheckOut = async (roomId) => {
    try {
      await updateOfflineRoomStatus(roomId, 'Available');
      await fetchRoomData();
    } catch (error) {
      console.error('Error checking out guest:', error);
    }
  };

  const handleSetMaintenance = async (roomId) => {
    try {
      await updateOfflineRoomStatus(roomId, 'Maintenance');
      await fetchRoomData();
    } catch (error) {
      console.error('Error setting room to maintenance:', error);
    }
  };

  const markRoomAsAvailable = async (roomId) => {
    try {
      await updateOfflineRoomStatus(roomId, 'Available');
      await fetchRoomData();
    } catch (error) {
      console.error('Error marking room as available:', error);
    }
  };

  const handleReserveRoom = (roomId) => {
    setSelectedRoom({ id: roomId });
    setIsCheckInModalOpen(true);
  };

  const handleContextMenu = (e, room) => {
    e.preventDefault();
    setMenuPosition({ x: e.clientX, y: e.clientY });
    setSelectedRoom(room);
    setShowContextMenu(true);
  };

  const closeContextMenu = () => {
    setShowContextMenu(false);
  };

  const convertReservedToOccupied = async (roomId) => {
    try {
      await updateOfflineRoomStatus(roomId, 'Occupied');
      await fetchRoomData();
    } catch (error) {
      console.error('Error converting reservation to occupied:', error);
    }
  };

  const getRoomStatusClass = (status, isDark = true) => {
    switch (status) {
      case 'Available':
        return isDark ? 'bg-green-600/20 text-green-400 border-green-500/30' : 'bg-green-50 text-green-600 border-green-200';
      case 'Occupied':
        return isDark ? 'bg-blue-600/20 text-blue-400 border-blue-500/30' : 'bg-blue-50 text-blue-600 border-blue-200';
      case 'Reserved':
        return isDark ? 'bg-yellow-600/20 text-yellow-400 border-yellow-500/30' : 'bg-yellow-50 text-yellow-600 border-yellow-200';
      case 'Maintenance':
        return isDark ? 'bg-red-600/20 text-red-400 border-red-500/30' : 'bg-red-50 text-red-600 border-red-200';
      case 'Cleaning':
        return isDark ? 'bg-purple-600/20 text-purple-400 border-purple-500/30' : 'bg-purple-50 text-purple-600 border-purple-200';
      default:
        return isDark ? 'bg-gray-600/20 text-gray-400 border-gray-500/30' : 'bg-gray-50 text-gray-600 border-gray-200';
    }
  };

  const getTaskStatusClass = (status, isDark = true) => {
    switch (status) {
      case 'Completed':
        return isDark ? 'bg-green-600/20 text-green-400' : 'bg-green-50 text-green-600';
      case 'In Progress':
        return isDark ? 'bg-blue-600/20 text-blue-400' : 'bg-blue-50 text-blue-600';
      case 'Pending':
        return isDark ? 'bg-yellow-600/20 text-yellow-400' : 'bg-yellow-50 text-yellow-600';
      default:
        return isDark ? 'bg-gray-600/20 text-gray-400' : 'bg-gray-50 text-gray-600';
    }
  };

  const getReservationStatusClass = (status, isDark = true) => {
    switch (status) {
      case 'confirmed':
        return isDark ? 'bg-green-600/20 text-green-400' : 'bg-green-50 text-green-600';
      case 'pending':
        return isDark ? 'bg-yellow-600/20 text-yellow-400' : 'bg-yellow-50 text-yellow-600';
      case 'cancelled':
        return isDark ? 'bg-red-600/20 text-red-400' : 'bg-red-50 text-red-600';
      default:
        return isDark ? 'bg-gray-600/20 text-gray-400' : 'bg-gray-50 text-gray-600';
    }
  };

  const getRoomStatusIndicator = (status, isDark = true) => {
    switch (status) {
      case 'Available':
        return '🟢';
      case 'Occupied':
        return '🔵';
      case 'Reserved':
        return '🟡';
      case 'Maintenance':
        return '🔴';
      case 'Cleaning':
        return '🟣';
      default:
        return '⚪';
    }
  };

  const handleRoomClick = (e, room) => {
    if (room.status === 'Available') {
      setSelectedRoom(room);
      setIsCheckInModalOpen(true);
    }
  };

  const handleRoomMouseEnter = (e, room) => {
    setHoveredRoom(room);
    setTooltipPosition({ x: e.clientX, y: e.clientY });
    setShowTooltip(true);
  };

  const handleRoomMouseLeave = () => {
    setShowTooltip(false);
    setHoveredRoom(null);
  };

  const handleRoomContextMenu = (e, room) => {
    e.preventDefault();
    handleContextMenu(e, room);
  };

  const handleContextMenuAction = (action, roomId) => {
    switch (action) {
      case 'checkin':
        setSelectedRoom({ id: roomId });
        setIsCheckInModalOpen(true);
        break;
      case 'checkout':
        handleCheckOut(roomId);
        break;
      case 'maintenance':
        handleSetMaintenance(roomId);
        break;
      case 'available':
        markRoomAsAvailable(roomId);
        break;
      case 'convert':
        convertReservedToOccupied(roomId);
        break;
      default:
        break;
    }
    closeContextMenu();
  };

  const openCheckInModal = (roomId) => {
    setSelectedRoom({ id: roomId });
    setIsCheckInModalOpen(true);
  };

  const handleCheckInClick = (checkIn) => {
    navigate('/guests', { state: { highlightGuest: checkIn.guest_id } });
  };

  const handleReservationClick = (reservation) => {
    navigate('/reservations', { state: { highlightReservation: reservation.id } });
  };

  const formatDuration = (minutes) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  };

  const formatDate = (dateString) => {
    try {
      return format(parseISO(dateString), 'MMM dd, yyyy');
    } catch {
      return dateString;
    }
  };

  const formatTimeAgo = (timestamp) => {
    const now = new Date();
    const time = new Date(timestamp);
    const diffMs = now - time;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${diffDays}d ago`;
  };

  // Initialize ECharts
  useEffect(() => {
    if (!isInitialized) return;

    // Revenue Chart
    if (revenueChartRef.current) {
      const revenueChart = echarts.init(revenueChartRef.current);
      const revenueOption = {
        backgroundColor: 'transparent',
        grid: {
          left: '3%',
          right: '4%',
          bottom: '3%',
          containLabel: true
        },
        xAxis: {
          type: 'category',
          data: revenueData.dates,
          axisLine: { lineStyle: { color: isDarkMode ? '#4B5563' : '#E5E7EB' } },
          axisLabel: { color: isDarkMode ? '#9CA3AF' : '#6B7280' }
        },
        yAxis: {
          type: 'value',
          axisLine: { lineStyle: { color: isDarkMode ? '#4B5563' : '#E5E7EB' } },
          axisLabel: { color: isDarkMode ? '#9CA3AF' : '#6B7280' },
          splitLine: { lineStyle: { color: isDarkMode ? '#374151' : '#F3F4F6' } }
        },
        series: [{
          data: revenueData.values,
          type: 'line',
          smooth: true,
          lineStyle: { color: '#3B82F6', width: 3 },
          areaStyle: {
            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
              { offset: 0, color: 'rgba(59, 130, 246, 0.3)' },
              { offset: 1, color: 'rgba(59, 130, 246, 0.1)' }
            ])
          }
        }]
      };
      revenueChart.setOption(revenueOption);

      const handleResize = () => revenueChart.resize();
      window.addEventListener('resize', handleResize);
      return () => window.removeEventListener('resize', handleResize);
    }

    // Task Chart
    if (taskChartRef.current) {
      const taskChart = echarts.init(taskChartRef.current);
      const taskStatusCounts = tasks.reduce((acc, task) => {
        acc[task.status] = (acc[task.status] || 0) + 1;
        return acc;
      }, {});

      const taskOption = {
        backgroundColor: 'transparent',
        series: [{
          type: 'pie',
          radius: ['40%', '70%'],
          data: Object.entries(taskStatusCounts).map(([status, count]) => ({
            value: count,
            name: status,
            itemStyle: {
              color: status === 'Completed' ? '#10B981' : 
                     status === 'In Progress' ? '#3B82F6' : '#F59E0B'
            }
          })),
          label: {
            color: isDarkMode ? '#E5E7EB' : '#374151'
          }
        }]
      };
      taskChart.setOption(taskOption);

      const handleResize = () => taskChart.resize();
      window.addEventListener('resize', handleResize);
      return () => window.removeEventListener('resize', handleResize);
    }

    // Occupancy Rate Chart
    if (occRateChartRef.current) {
      const occChart = echarts.init(occRateChartRef.current);
      const occOption = {
        backgroundColor: 'transparent',
        series: [{
          type: 'gauge',
          radius: '90%',
          data: [{ value: occupancyRate, name: 'Occupancy' }],
          detail: {
            valueAnimation: true,
            formatter: '{value}%',
            color: isDarkMode ? '#E5E7EB' : '#374151'
          },
          axisLine: {
            lineStyle: {
              width: 20,
              color: [
                [0.3, '#FF4444'],
                [0.7, '#FFAA00'],
                [1, '#00AA00']
              ]
            }
          }
        }]
      };
      occChart.setOption(occOption);

      const handleResize = () => occChart.resize();
      window.addEventListener('resize', handleResize);
      return () => window.removeEventListener('resize', handleResize);
    }
  }, [isInitialized, revenueData, tasks, occupancyRate, isDarkMode]);

  const renderOverviewSection = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      <div className={`${isDarkMode ? 'bg-gray-800/50' : 'bg-white/80'} backdrop-blur-sm rounded-xl border ${isDarkMode ? 'border-gray-700/50' : 'border-gray-200/50'} p-6 shadow-lg hover:shadow-xl transition-all duration-300`}>
        <div className="flex items-center justify-between">
          <div>
            <p className={`text-sm font-medium ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Total Rooms</p>
            <p className={`text-3xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{totalRooms}</p>
          </div>
          <div className={`p-3 rounded-full ${isDarkMode ? 'bg-blue-500/20' : 'bg-blue-100'}`}>
            <i className={`fas fa-bed text-xl ${isDarkMode ? 'text-blue-400' : 'text-blue-600'}`}></i>
          </div>
        </div>
      </div>

      <div className={`${isDarkMode ? 'bg-gray-800/50' : 'bg-white/80'} backdrop-blur-sm rounded-xl border ${isDarkMode ? 'border-gray-700/50' : 'border-gray-200/50'} p-6 shadow-lg hover:shadow-xl transition-all duration-300`}>
        <div className="flex items-center justify-between">
          <div>
            <p className={`text-sm font-medium ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Available</p>
            <p className={`text-3xl font-bold ${isDarkMode ? 'text-green-400' : 'text-green-600'}`}>{availableRooms}</p>
          </div>
          <div className={`p-3 rounded-full ${isDarkMode ? 'bg-green-500/20' : 'bg-green-100'}`}>
            <i className={`fas fa-check-circle text-xl ${isDarkMode ? 'text-green-400' : 'text-green-600'}`}></i>
          </div>
        </div>
      </div>

      <div className={`${isDarkMode ? 'bg-gray-800/50' : 'bg-white/80'} backdrop-blur-sm rounded-xl border ${isDarkMode ? 'border-gray-700/50' : 'border-gray-200/50'} p-6 shadow-lg hover:shadow-xl transition-all duration-300`}>
        <div className="flex items-center justify-between">
          <div>
            <p className={`text-sm font-medium ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Occupied</p>
            <p className={`text-3xl font-bold ${isDarkMode ? 'text-blue-400' : 'text-blue-600'}`}>{occupiedRooms}</p>
          </div>
          <div className={`p-3 rounded-full ${isDarkMode ? 'bg-blue-500/20' : 'bg-blue-100'}`}>
            <i className={`fas fa-user text-xl ${isDarkMode ? 'text-blue-400' : 'text-blue-600'}`}></i>
          </div>
        </div>
      </div>

      <div className={`${isDarkMode ? 'bg-gray-800/50' : 'bg-white/80'} backdrop-blur-sm rounded-xl border ${isDarkMode ? 'border-gray-700/50' : 'border-gray-200/50'} p-6 shadow-lg hover:shadow-xl transition-all duration-300`}>
        <div className="flex items-center justify-between">
          <div>
            <p className={`text-sm font-medium ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Revenue</p>
            <p className={`text-3xl font-bold ${isDarkMode ? 'text-yellow-400' : 'text-yellow-600'}`}>${totalRevenue.toLocaleString()}</p>
          </div>
          <div className={`p-3 rounded-full ${isDarkMode ? 'bg-yellow-500/20' : 'bg-yellow-100'}`}>
            <i className={`fas fa-dollar-sign text-xl ${isDarkMode ? 'text-yellow-400' : 'text-yellow-600'}`}></i>
          </div>
        </div>
      </div>
    </div>
  );

  if (!isInitialized) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Initializing Offline Database...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${isDarkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
      <OfflineNavbar title="Dashboard - Offline Mode" />
      <div className="flex">
        <OfflineSidebar activeLink="Dashboard" />
        <main className="flex-1 ml-64 p-8">
          {/* Offline Mode Banner */}
          <div className="mb-6 bg-gradient-to-r from-green-500 to-emerald-600 text-white p-4 rounded-lg shadow-lg">
            <div className="flex items-center">
              <i className="fas fa-wifi-slash mr-3 text-xl"></i>
              <div>
                <h3 className="font-bold">Offline Mode Active</h3>
                <p className="text-sm opacity-90">All data is stored locally. Changes will sync when you're back online.</p>
              </div>
            </div>
          </div>

          {renderOverviewSection()}

          {/* Room Grid */}
          <div className={`${isDarkMode ? 'bg-gray-800/50' : 'bg-white/80'} backdrop-blur-sm rounded-xl border ${isDarkMode ? 'border-gray-700/50' : 'border-gray-200/50'} p-6 shadow-lg mb-8`}>
            <h2 className={`text-xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'} mb-6`}>Room Status</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
              {rooms.map((room) => (
                <div
                  key={room.id}
                  className={`${getRoomStatusClass(room.status, isDarkMode)} border rounded-lg p-4 cursor-pointer transition-all duration-200 hover:scale-105 hover:shadow-lg`}
                  onClick={(e) => handleRoomClick(e, room)}
                  onContextMenu={(e) => handleRoomContextMenu(e, room)}
                  onMouseEnter={(e) => handleRoomMouseEnter(e, room)}
                  onMouseLeave={handleRoomMouseLeave}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-bold">Room {room.id}</span>
                    <span className="text-lg">{getRoomStatusIndicator(room.status)}</span>
                  </div>
                  <div className="text-sm opacity-80">
                    <p>{room.type}</p>
                    <p className="font-medium">{room.status}</p>
                    {room.guest && <p className="truncate">👤 {room.guest}</p>}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
            {/* Revenue Chart */}
            <div className={`${isDarkMode ? 'bg-gray-800/50' : 'bg-white/80'} backdrop-blur-sm rounded-xl border ${isDarkMode ? 'border-gray-700/50' : 'border-gray-200/50'} p-6 shadow-lg`}>
              <h3 className={`text-lg font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'} mb-4`}>Revenue Trend</h3>
              <div ref={revenueChartRef} style={{ height: '200px' }}></div>
            </div>

            {/* Task Distribution Chart */}
            <div className={`${isDarkMode ? 'bg-gray-800/50' : 'bg-white/80'} backdrop-blur-sm rounded-xl border ${isDarkMode ? 'border-gray-700/50' : 'border-gray-200/50'} p-6 shadow-lg`}>
              <h3 className={`text-lg font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'} mb-4`}>Task Status</h3>
              <div ref={taskChartRef} style={{ height: '200px' }}></div>
            </div>

            {/* Occupancy Rate Gauge */}
            <div className={`${isDarkMode ? 'bg-gray-800/50' : 'bg-white/80'} backdrop-blur-sm rounded-xl border ${isDarkMode ? 'border-gray-700/50' : 'border-gray-200/50'} p-6 shadow-lg`}>
              <h3 className={`text-lg font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'} mb-4`}>Occupancy Rate</h3>
              <div ref={occRateChartRef} style={{ height: '200px' }}></div>
            </div>
          </div>

          {/* Recent Activity */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Today's Check-ins */}
            <div className={`${isDarkMode ? 'bg-gray-800/50' : 'bg-white/80'} backdrop-blur-sm rounded-xl border ${isDarkMode ? 'border-gray-700/50' : 'border-gray-200/50'} p-6 shadow-lg`}>
              <h3 className={`text-lg font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'} mb-4`}>Today's Check-ins</h3>
              <div className="space-y-3">
                {todaysCheckIns.length > 0 ? (
                  todaysCheckIns.map((checkIn) => (
                    <div key={checkIn.id} className={`p-3 rounded-lg ${isDarkMode ? 'bg-gray-700/50' : 'bg-gray-50'} cursor-pointer hover:bg-opacity-80 transition-colors`} onClick={() => handleCheckInClick(checkIn)}>
                      <div className="flex justify-between items-center">
                        <div>
                          <p className={`font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{checkIn.guest_name}</p>
                          <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Room {checkIn.room_id}</p>
                        </div>
                        <span className={`px-2 py-1 rounded text-xs ${getReservationStatusClass(checkIn.status, isDarkMode)}`}>
                          {checkIn.status}
                        </span>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className={`text-center ${isDarkMode ? 'text-gray-400' : 'text-gray-600'} py-4`}>No check-ins today</p>
                )}
              </div>
            </div>

            {/* Recent Reservations */}
            <div className={`${isDarkMode ? 'bg-gray-800/50' : 'bg-white/80'} backdrop-blur-sm rounded-xl border ${isDarkMode ? 'border-gray-700/50' : 'border-gray-200/50'} p-6 shadow-lg`}>
              <h3 className={`text-lg font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'} mb-4`}>Recent Reservations</h3>
              <div className="space-y-3">
                {recentReservations.length > 0 ? (
                  recentReservations.map((reservation) => (
                    <div key={reservation.id} className={`p-3 rounded-lg ${isDarkMode ? 'bg-gray-700/50' : 'bg-gray-50'} cursor-pointer hover:bg-opacity-80 transition-colors`} onClick={() => handleReservationClick(reservation)}>
                      <div className="flex justify-between items-center">
                        <div>
                          <p className={`font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{reservation.guest_name}</p>
                          <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Room {reservation.room_id} • {formatDate(reservation.check_in_date)}</p>
                        </div>
                        <span className={`px-2 py-1 rounded text-xs ${getReservationStatusClass(reservation.status, isDarkMode)}`}>
                          {reservation.status}
                        </span>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className={`text-center ${isDarkMode ? 'text-gray-400' : 'text-gray-600'} py-4`}>No recent reservations</p>
                )}
              </div>
            </div>
          </div>
        </main>
      </div>

      {/* Modals */}
      <OfflineRoomCheckInModal
        isOpen={isCheckInModalOpen}
        onClose={() => setIsCheckInModalOpen(false)}
        onCheckIn={handleCheckIn}
        roomId={selectedRoom?.id}
      />

      {showTooltip && hoveredRoom && (
        <OfflineRoomTooltip
          room={hoveredRoom}
          position={tooltipPosition}
          isDarkMode={isDarkMode}
        />
      )}

      {showContextMenu && selectedRoom && (
        <OfflineRoomContextMenu
          room={selectedRoom}
          position={menuPosition}
          onAction={handleContextMenuAction}
          onClose={closeContextMenu}
          isDarkMode={isDarkMode}
        />
      )}
    </div>
  );
};

export default OfflineDashboard; 