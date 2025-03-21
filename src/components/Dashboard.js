import React, { useState, useEffect, useRef } from 'react';
import * as echarts from 'echarts';
import '@fortawesome/fontawesome-free/css/all.min.css';
import { useNavigate } from 'react-router-dom';
import OverviewWidget from './OverviewWidget';
import CheckInModal from './CheckInModal';
import { useGuests } from '../context/GuestContext';
import { useUser } from '../context/UserContext';
import Navbar from './Navbar';
import Sidebar from './Sidebar';
import { useTheme } from '../context/ThemeContext';
import RoomTooltip from './RoomTooltip';
import RoomContextMenu from './RoomContextMenu';
import { useRoomReservation } from '../context/RoomReservationContext';
import supabase from '../supabaseClient';
import { format, isToday, parseISO } from 'date-fns';

// Room Check-in Modal Component
const RoomCheckInModal = ({ isOpen, onClose, onCheckIn, roomId }) => {
  const { theme } = useTheme();
  const isDarkMode = theme === 'dark';
  const [guestName, setGuestName] = useState('');
  const [checkInDate, setCheckInDate] = useState(new Date().toISOString().split('T')[0]);
  
  // Calculate default checkout date (3 days from now)
  const defaultCheckOut = new Date();
  defaultCheckOut.setDate(defaultCheckOut.getDate() + 3);
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

const Dashboard = () => {
  const { theme } = useTheme();
  const isDarkMode = theme === 'dark';
  const navigate = useNavigate();
  const [selectedRoomId, setSelectedRoomId] = useState(null);
  const [isRoomCheckInModalOpen, setIsRoomCheckInModalOpen] = useState(false);
  const [isCheckInModalOpen, setIsCheckInModalOpen] = useState(false);
  const [hoveredRoom, setHoveredRoom] = useState(null);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });
  const [showTooltip, setShowTooltip] = useState(false);
  const [showContextMenu, setShowContextMenu] = useState(false);
  const [contextMenuPosition, setContextMenuPosition] = useState({ x: 0, y: 0 });
  const [selectedRoom, setSelectedRoom] = useState(null);
  const chartDomRef = useRef(null);
  const chartInstance = useRef(null);
  const [totalRevenue, setTotalRevenue] = useState(0);

  const { guestList } = useGuests();
  const { rooms, reservations, updateRoomStatus, loading, revenue } = useRoomReservation();

  // Stats calculation
  const totalRooms = rooms.length;
  const availableRooms = rooms.filter(room => room.status === 'Available').length;
  const occupiedRooms = rooms.filter(room => room.status === 'Occupied').length;
  const reservedRooms = rooms.filter(room => room.status === 'Reserved').length;
  const maintenanceRooms = rooms.filter(room => room.status === 'Maintenance').length;
  const occupancyRate = Math.round((occupiedRooms / totalRooms) * 100);
  
  // Calculate total guests (occupied + reserved rooms)
  const totalGuests = rooms.filter(room => room.guest).length;
  
  // Calculate total money made (assuming all occupied rooms have been paid for)
  const totalMoneyMade = rooms
    .filter(room => room.status === 'Occupied')
    .reduce((total, room) => {
      // Calculate number of days between check-in and check-out
      if (room.checkIn && room.checkOut) {
        const checkInDate = new Date(room.checkIn);
        const checkOutDate = new Date(room.checkOut);
        const diffTime = Math.abs(checkOutDate - checkInDate);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        // Calculate price based on room type and days
        return total + (room.price * diffDays);
      }
      return total;
    }, 0);

  // Updated checkIns state to pull from guest data
  const [checkIns, setCheckIns] = useState([]);
  
  // Dynamic tasks
  const [tasks, setTasks] = useState([]);
  
  // Dynamic notifications
  const [notifications, setNotifications] = useState([]);
  
  // Stats counters
  const [stats, setStats] = useState({
    availableRooms: 0,
    occupiedRooms: 0,
    reservedRooms: 0,
    totalRevenue: 0,
  });

  // Fetch total revenue from invoices (Matching Reports page implementation)
  const fetchTotalRevenue = async () => {
    try {
      // Fetch data from invoices table
      let { data: invoicesData, error: invoicesError } = await supabase
        .from('invoices')
        .select('*')
        .eq('status', 'Paid');
      
      if (invoicesError) {
        console.error('Error fetching invoices data:', invoicesError);
        return 0;
      }
      
      // Calculate total from paid invoices
      const total = invoicesData.reduce((sum, invoice) => {
        return sum + (parseFloat(invoice.amount) || 0);
      }, 0);
      
      setTotalRevenue(total);
      return total;
    } catch (error) {
      console.error('Error calculating revenue:', error);
      return 0;
    }
  };

  // Update revenue on component mount and when relevant data changes
  useEffect(() => {
    fetchTotalRevenue();
  }, []);

  // Update Today's Check-ins from Guest data
  useEffect(() => {
    if (guestList && guestList.length > 0) {
      // Filter guests that are checking in today or already checked in recently
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const todaysCheckIns = guestList
        .filter(guest => {
          // Check if there's a checkIn date
          if (!guest.checkIn && !guest.check_in) return false;
          
          // Get the check in date in proper format
          const checkInDate = guest.checkIn || guest.check_in;
          
          // Parse the date in various formats
          let parsedDate;
          try {
            if (checkInDate instanceof Date) {
              parsedDate = checkInDate;
            } else if (typeof checkInDate === 'string') {
              parsedDate = parseISO(checkInDate);
            }
            
            // Check if the check-in date is today
            if (parsedDate && isToday(parsedDate)) {
              return true;
            }
            
            // Also include guests that checked in within the last 24 hours
            const yesterday = new Date(today);
            yesterday.setDate(yesterday.getDate() - 1);
            return parsedDate >= yesterday;
          } catch (err) {
            console.error("Error parsing check-in date:", err);
            return false;
          }
        })
        .map(guest => {
          // Get room details
          const roomId = guest.room_id || guest.room;
          const room = rooms.find(r => r.id === roomId || r.id === parseInt(roomId, 10));
          
          // Format arrival date/time
          let arrivalTime = guest.checkIn || guest.check_in || new Date();
          try {
            if (typeof arrivalTime === 'string') {
              arrivalTime = parseISO(arrivalTime);
            }
            arrivalTime = format(arrivalTime, 'MMM dd, yyyy, HH:mm');
          } catch (err) {
            arrivalTime = "Today";
          }
          
          // Determine status
          const status = guest.status === 'Checked In' ? 'Arrived' : 'Pending';
          
          // Get guest preferences if any
          const preferences = guest.preferences || [];
          
          return {
            id: guest.id,
            guest: guest.name || guest.guest_name,
            room: roomId || 'Not Assigned',
            roomType: room ? room.type : 'Standard',
            arrival: arrivalTime,
            status,
            preferences
          };
        });
      
      // Add reservations that are due for check-in today but not checked in yet
      const todaysReservations = reservations
        .filter(reservation => {
          // Skip if guest is already checked in
          if (todaysCheckIns.some(checkIn => checkIn.id === reservation.guest_id)) {
            return false;
          }
          
          // Check if there's a checkIn date
          if (!reservation.check_in_date) return false;
          
          try {
            const reservationDate = parseISO(reservation.check_in_date);
            return isToday(reservationDate);
          } catch (err) {
            return false;
          }
        })
        .map(reservation => {
          return {
            id: reservation.guest_id,
            guest: reservation.guest_name,
            room: reservation.room,
            roomType: "Reserved",
            arrival: "Expected Today",
            status: "Expected",
            preferences: []
          };
        });
        
      // Combine both lists and sort by status (Pending first, then Arrived)
      const combinedCheckIns = [...todaysReservations, ...todaysCheckIns];
      combinedCheckIns.sort((a, b) => {
        // Sort by status first (Expected, then Pending, then Arrived)
        if (a.status === 'Expected' && b.status !== 'Expected') return -1;
        if (a.status === 'Pending' && b.status === 'Arrived') return -1;
        if (a.status === 'Arrived' && b.status === 'Pending') return 1;
        // If status is the same, sort by arrival time (most recent first)
        return -1; // Default to showing newest first
      });
      
      setCheckIns(combinedCheckIns);
    }
  }, [guestList, reservations, rooms]);

  // Update stats when rooms change
  useEffect(() => {
    const availableRooms = rooms.filter(room => room.status === 'Available').length;
    const occupiedRooms = rooms.filter(room => room.status === 'Occupied').length;
    const reservedRooms = rooms.filter(room => room.status === 'Reserved').length;
    const totalRevenue = rooms.filter(room => room.status === 'Occupied').reduce((acc, room) => acc + room.price, 0);

    setStats({
      availableRooms,
      occupiedRooms,
      reservedRooms,
      totalRevenue,
    });
  }, [rooms]);

  // Fetch tasks from Supabase or localStorage
  useEffect(() => {
    const fetchTasks = async () => {
      try {
        // Try to fetch tasks from Supabase
        const { data, error } = await supabase
          .from('tasks')
          .select('*')
          .eq('status', 'Pending')
          .order('priority', { ascending: false })
          .limit(5);
          
        if (error) {
          console.error('Error fetching tasks:', error);
          
          // Fallback to localStorage
          const localTasksStr = localStorage.getItem('hotelTasks');
          if (localTasksStr) {
            const localTasks = JSON.parse(localTasksStr);
            setTasks(localTasks.filter(task => task.status === 'Pending').slice(0, 5));
          }
        } else if (data) {
          setTasks(data);
        }
      } catch (err) {
        console.error('Unexpected error fetching tasks:', err);
        
        // Fallback to localStorage
        const localTasksStr = localStorage.getItem('hotelTasks');
        if (localTasksStr) {
          const localTasks = JSON.parse(localTasksStr);
          setTasks(localTasks.filter(task => task.status === 'Pending').slice(0, 5));
        }
      }
    };
    
    fetchTasks();
  }, []);
  
  // Fetch notifications from localStorage
  useEffect(() => {
    const notificationsStr = localStorage.getItem('hotelNotifications');
    if (notificationsStr) {
      try {
        const notificationsData = JSON.parse(notificationsStr);
        setNotifications(notificationsData.slice(0, 5)); // Display only the 5 most recent
      } catch (e) {
        console.error('Error parsing notifications:', e);
      }
    }
  }, []);

  // Function to handle check-in
  const handleCheckIn = (roomId) => {
    setSelectedRoomId(roomId);
    setIsCheckInModalOpen(true);
  };

  // Function to process check-in with guest details
  const processCheckIn = (roomId, guestName, checkInDate, checkOutDate) => {
    const guestData = { name: guestName };
    const dates = { checkIn: checkInDate, checkOut: checkOutDate };
    updateRoomStatus(roomId, 'Occupied');
  };

  // Function to handle checkout
  const handleCheckOut = (roomId) => {
    updateRoomStatus(roomId, 'Available');
  };

  // Function to set room to maintenance
  const handleSetMaintenance = (roomId) => {
    updateRoomStatus(roomId, 'Maintenance');
  };

  // Function to reserve a room
  const handleReserveRoom = (roomId) => {
    setSelectedRoomId(roomId);
    setIsRoomCheckInModalOpen(true);
  };

  // Function to process reservation
  const processReservation = (roomId, guestName, checkInDate, checkOutDate) => {
    const guestData = { name: guestName };
    const dates = { checkIn: checkInDate, checkOut: checkOutDate };
    updateRoomStatus(roomId, 'Occupied');
  };

  // Function to handle context menu
  const handleContextMenu = (e, room) => {
    e.preventDefault();
    setShowContextMenu(true);
    setContextMenuPosition({ x: e.clientX, y: e.clientY });
    setSelectedRoom(room);
  };

  // Function to close context menu
  const closeContextMenu = () => {
    setShowContextMenu(false);
  };

  // Function to convert reserved room to occupied
  const convertReservedToOccupied = (roomId) => {
    const room = rooms.find(r => r.id === roomId);
    if (room && room.status === 'Reserved') {
      const guestData = { name: room.guest };
      const dates = { checkIn: room.checkIn, checkOut: room.checkOut };
      updateRoomStatus(roomId, 'Occupied');
    }
  };

  // Function to mark room as available
  const markRoomAsAvailable = (roomId) => {
    updateRoomStatus(roomId, 'Available');
  };

  // Function to calculate daily revenue for the past week
  const calculateDailyRevenue = async () => {
    const daysOfWeek = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const today = new Date();
    const dayOfWeek = today.getDay(); // 0 = Sunday, 1 = Monday, etc.
    const revenueData = Array(7).fill(0);
    
    try {
      // Fetch paid invoices from Supabase
      let { data: invoicesData, error: invoicesError } = await supabase
        .from('invoices')
        .select('*')
        .eq('status', 'Paid');
      
      if (invoicesError) {
        console.error('Error fetching invoices data:', invoicesError);
        return revenueData;
      }
      
      // If we have invoices data
      if (invoicesData && invoicesData.length > 0) {
        // Calculate revenue for each day of the past week
        for (let i = 0; i < 7; i++) {
          const targetDate = new Date();
          // Calculate the date for this day of the week
          // We need to adjust because getDay() returns 0 for Sunday, but our array starts with Monday
          const daysToSubtract = (dayOfWeek + 6 - i) % 7;
          targetDate.setDate(today.getDate() - daysToSubtract);
          
          const targetDateStr = targetDate.toISOString().split('T')[0];
          
          // Find all invoices paid on this date
          const dayInvoices = invoicesData.filter(invoice => {
            if (!invoice.created_at) return false;
            
            const invoiceDate = parseISO(invoice.created_at);
            const invoiceDateStr = format(invoiceDate, 'yyyy-MM-dd');
            
            return invoiceDateStr === targetDateStr;
          });
          
          // Calculate revenue for this day
          let dailyRevenue = dayInvoices.reduce((sum, invoice) => {
            return sum + (parseFloat(invoice.amount) || 0);
          }, 0);
          
          // Convert to thousands for display (e.g., 1000 -> 1k)
          revenueData[i] = parseFloat((dailyRevenue / 1000).toFixed(1));
        }
      } else {
        // If no real data, generate some realistic sample data
        // Start with a base value and add some randomness
        const baseValue = 5; // Base revenue in thousands
        for (let i = 0; i < 7; i++) {
          revenueData[i] = baseValue + Math.floor(Math.random() * 10);
        }
      }
      
      return revenueData;
    } catch (error) {
      console.error('Error calculating daily revenue:', error);
      return revenueData;
    }
  };

  useEffect(() => {
    // Initialize Revenue Chart
    const initRevenueChart = async () => {
      const chartDom = document.getElementById('revenueChart');
      if (chartDom) {
        // First check if there's already a chart instance and dispose it
        const existingChart = echarts.getInstanceByDom(chartDom);
        if (existingChart) {
          existingChart.dispose();
        }
        
        // Create a new chart instance
        const myChart = echarts.init(chartDom);
        
        // Calculate real revenue data
        const revenueData = await calculateDailyRevenue();
        
        const option = {
          tooltip: {
            trigger: 'axis',
            axisPointer: {
              type: 'shadow'
            },
            formatter: function(params) {
              return `GH₵${params[0].value}k`;
            }
          },
          grid: {
            left: '3%',
            right: '4%',
            bottom: '3%',
            containLabel: true
          },
          xAxis: {
            type: 'category',
            data: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
            axisLine: {
              lineStyle: {
                color: isDarkMode ? '#555' : '#ddd'
              }
            },
            axisLabel: {
              color: isDarkMode ? '#ccc' : '#666'
            }
          },
          yAxis: {
            type: 'value',
            axisLabel: {
              formatter: 'GH₵{value}k',
              color: isDarkMode ? '#ccc' : '#666'
            },
            splitLine: {
              lineStyle: {
                color: isDarkMode ? '#333' : '#eee'
              }
            }
          },
          series: [
            {
              data: revenueData,
              type: 'bar',
              itemStyle: {
                color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                  { offset: 0, color: '#83bff6' },
                  { offset: 0.5, color: '#188df0' },
                  { offset: 1, color: '#188df0' }
                ])
              },
              emphasis: {
                itemStyle: {
                  color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                    { offset: 0, color: '#2378f7' },
                    { offset: 0.7, color: '#2378f7' },
                    { offset: 1, color: '#83bff6' }
                  ])
                }
              }
            }
          ]
        };
        
        myChart.setOption(option);
        chartInstance.current = myChart;
      }
    };
    
    initRevenueChart();
    
    // Cleanup on unmount
    return () => {
      if (chartInstance.current) {
        chartInstance.current.dispose();
        chartInstance.current = null;
      }
    };
  }, [isDarkMode, reservations, rooms]);

  // Overview Section
  const renderOverviewSection = () => {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
        <OverviewWidget
          title="Occupancy Rate"
          value={`${occupancyRate}%`}
          icon="fa-bed"
          color="text-blue-500"
          trend={occupancyRate > 70 ? 'up' : 'down'}
          trendValue="+5.2%"
          trendText="from last month"
          isDarkMode={isDarkMode}
        />
        <OverviewWidget
          title="Available Rooms"
          value={availableRooms}
          icon="fa-door-open"
          color="text-green-500"
          trend="flat"
          trendValue="0"
          trendText="no change"
          isDarkMode={isDarkMode}
        />
        <OverviewWidget
          title="Guests"
          value={guestList?.length || 0}
          icon="fa-users"
          color="text-yellow-500"
          trend="up"
          trendValue="+2"
          trendText="new guests"
          isDarkMode={isDarkMode}
        />
        <OverviewWidget
          title="Revenue"
          value={`GH₵${revenue.toLocaleString()}`}
          icon="fa-dollar-sign"
          color="text-green-500"
          trend="up"
          trendValue="+12.5%"
          trendText="from last month"
          isDarkMode={isDarkMode}
        />
      </div>
    );
  };

  // Format duration for display
  const formatDuration = (minutes) => {
    if (!minutes) return 'N/A';
    
    if (minutes < 60) {
      return `${minutes} min`;
    } else {
      const hours = Math.floor(minutes / 60);
      const remainingMinutes = minutes % 60;
      return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`;
    }
  };

  const formatTimeAgo = (timestamp) => {
    if (!timestamp) return null;
    
    try {
      const now = new Date();
      const date = new Date(timestamp);
      const diffInMinutes = Math.floor((now - date) / (1000 * 60));
      
      if (diffInMinutes < 1) return 'Just now';
      if (diffInMinutes < 60) return `${diffInMinutes} min ago`;
      if (diffInMinutes < 1440) {
        const hours = Math.floor(diffInMinutes / 60);
        return `${hours} hour${hours > 1 ? 's' : ''} ago`;
      }
      
      const days = Math.floor(diffInMinutes / 1440);
      return `${days} day${days > 1 ? 's' : ''} ago`;
    } catch (e) {
      console.error('Error formatting time:', e);
      return null;
    }
  };

  return (
    <div className={`flex h-screen ${isDarkMode ? 'bg-black text-white' : 'bg-white text-gray-800'}`}>
      <Sidebar activeLink="Dashboard" />
      <div className="flex-1 overflow-auto">
        <div className={`${isDarkMode ? 'bg-black' : 'bg-white'} p-8`}>
          <div className="max-w-[1440px] mx-auto">
            {/* Header */}
            <Navbar title="Dashboard" />

            {/* Key Statistics */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
              <div className="bg-gradient-to-br from-blue-500 to-blue-700 rounded-xl p-6 shadow-lg flex flex-col items-center justify-center text-white">
                <div className="bg-blue-600 bg-opacity-30 p-3 rounded-full mb-3">
                  <i className="fas fa-money-bill-wave text-2xl"></i>
                </div>
                <span className="text-sm text-blue-100">Total Revenue</span>
                <span className="text-3xl font-bold mt-1">GH₵{totalRevenue.toLocaleString()}</span>
                <span className="text-xs text-blue-200 mt-1">From all paid bills</span>
              </div>
              <div className="bg-gradient-to-br from-purple-500 to-purple-700 rounded-xl p-6 shadow-lg flex flex-col items-center justify-center text-white">
                <div className="bg-purple-600 bg-opacity-30 p-3 rounded-full mb-3">
                  <i className="fas fa-users text-2xl"></i>
                </div>
                <span className="text-sm text-purple-100">Total Guests</span>
                <span className="text-3xl font-bold mt-1">{guestList?.length || 0}</span>
                <span className="text-xs text-purple-200 mt-1">Currently staying or reserved</span>
              </div>
              <div className="bg-gradient-to-br from-green-500 to-green-700 rounded-xl p-6 shadow-lg flex flex-col items-center justify-center text-white">
                <div className="bg-green-600 bg-opacity-30 p-3 rounded-full mb-3">
                  <i className="fas fa-door-open text-2xl"></i>
                </div>
                <span className="text-sm text-green-100">Available Rooms</span>
                <span className="text-3xl font-bold mt-1">{availableRooms}</span>
                <span className="text-xs text-green-200 mt-1">Ready for booking</span>
              </div>
              <div className="bg-gradient-to-br from-amber-500 to-amber-700 rounded-xl p-6 shadow-lg flex flex-col items-center justify-center text-white">
                <div className="bg-amber-600 bg-opacity-30 p-3 rounded-full mb-3">
                  <i className="fas fa-chart-pie text-2xl"></i>
                </div>
                <span className="text-sm text-amber-100">Occupancy Rate</span>
                <span className="text-3xl font-bold mt-1">{occupancyRate}%</span>
                <span className="text-xs text-amber-200 mt-1">Current occupancy</span>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <button onClick={() => navigate('/reservations')} className="bg-blue-500 text-white rounded-lg p-4 hover:bg-blue-600 flex items-center justify-center space-x-2">
                <i className="fas fa-plus"></i>
                <span>Add New Reservation</span>
              </button>
              <button onClick={() => navigate('/billing')} className="bg-green-500 text-white rounded-lg p-4 hover:bg-green-600 flex items-center justify-center space-x-2">
                <i className="fas fa-file-invoice-dollar"></i>
                <span>Create Invoice</span>
              </button>
              <button onClick={() => navigate('/guests')} className="bg-yellow-500 text-white rounded-lg p-4 hover:bg-yellow-600 flex items-center justify-center space-x-2">
                <i className="fas fa-user-plus"></i>
                <span>Add Guest</span>
              </button>
            </div>

            {/* Main Content */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
              {/* Left Column */}
              <div className="space-y-6">
                {/* Occupancy Overview */}
                <div className={`${isDarkMode ? 'bg-gray-800' : 'bg-gray-100'} rounded-xl p-6 shadow-sm`}>
                  <h3 className={`text-xl font-semibold ${isDarkMode ? 'text-white' : 'text-gray-800'} mb-4`}>Occupancy Overview</h3>
                  <div className="grid grid-cols-5 gap-2">
                    {rooms
                      .filter(room => room.id >= 101 && room.id <= 120)
                      .sort((a, b) => a.id - b.id)
                      .map((room) => {
                        // Get the status color
                        const statusColor = 
                          room.status === 'Available' ? 'bg-green-900 text-white' : 
                          room.status === 'Occupied' ? 'bg-red-900 text-white' :
                          room.status === 'Reserved' ? 'bg-blue-900 text-white' : 
                          'bg-yellow-500 text-white';
                        
                        return (
                          <div
                            key={room.id}
                            className={`p-2 rounded text-center cursor-pointer hover:opacity-80 ${statusColor}`}
                            onClick={() => {
                              if (room.status === 'Available') {
                                handleCheckIn(room.id);
                              } else if (room.status === 'Occupied') {
                                handleCheckOut(room.id);
                              } else if (room.status === 'Reserved') {
                                convertReservedToOccupied(room.id);
                              } else if (room.status === 'Maintenance') {
                                markRoomAsAvailable(room.id);
                              }
                            }}
                            onContextMenu={(e) => handleContextMenu(e, room)}
                            onMouseOver={(e) => {
                              setHoveredRoom(room);
                              setTooltipPosition({ x: e.clientX, y: e.clientY });
                            }}
                            onMouseOut={() => setHoveredRoom(null)}
                          >
                            {room.room_number || room.id}
                          </div>
                        );
                      })}
                  </div>
                  <RoomTooltip 
                    room={hoveredRoom} 
                    visible={hoveredRoom !== null} 
                    position={tooltipPosition} 
                  />
                  <div className="flex items-center gap-4 mt-4">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-green-500 rounded"></div>
                      <span className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Available</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-red-500 rounded"></div>
                      <span className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Occupied</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-blue-500 rounded"></div>
                      <span className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Reserved</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-yellow-500 rounded"></div>
                      <span className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Maintenance</span>
                    </div>
                  </div>
                  <div className="mt-2 text-sm text-center text-gray-500">
                    Click on a room to perform default action. Right-click for all options.
                  </div>
                </div>

                {/* Today's Check-ins */}
                <div className={`${isDarkMode ? 'bg-gray-800' : 'bg-gray-100'} rounded-xl p-6 shadow-sm`}>
                  <h3 className={`text-xl font-semibold ${isDarkMode ? 'text-white' : 'text-gray-800'} mb-4`}>Today's Check-ins</h3>
                  <div className="space-y-4">
                    {checkIns.length === 0 ? (
                      <div className="text-center py-4">
                        <p className={`${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>No check-ins today.</p>
                      </div>
                    ) : (
                      checkIns.map((checkIn, index) => (
                        <div key={index} className={`p-4 ${isDarkMode ? 'bg-gray-900' : 'bg-gray-200'} rounded-lg`}>
                          <div className="flex items-center justify-between mb-2">
                            <h4 className={`font-semibold ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>
                              {checkIn.room ? `Room ${checkIn.room}` : 'Room Not Assigned'} - {checkIn.guest}
                            </h4>
                            <span className={`px-3 py-1 rounded-full text-sm ${
                              checkIn.status === 'Arrived' ? 'bg-green-100 text-green-800' : 
                              checkIn.status === 'Expected' ? 'bg-blue-100 text-blue-800' :
                              'bg-yellow-100 text-yellow-800'
                            }`}>
                              {checkIn.status}
                            </span>
                          </div>
                          <p className={`${isDarkMode ? 'text-gray-400' : 'text-gray-600'} text-sm`}>
                            {checkIn.roomType} • Arrival: {checkIn.arrival}
                          </p>
                          
                          {/* Show preferences if any */}
                          {checkIn.preferences && checkIn.preferences.length > 0 && (
                            <div className="mt-2">
                              <div className="flex flex-wrap gap-2">
                                {checkIn.preferences.map((pref, i) => (
                                  <span key={i} className={`inline-block px-2 py-1 text-xs rounded ${
                                    pref.type === 'Late Check-out' ? 'bg-blue-100 text-blue-800' : 
                                    pref.type === 'Vegan Meals' ? 'bg-green-100 text-green-800' : 
                                    pref.type === 'High Floor' ? 'bg-yellow-100 text-yellow-800' : 
                                    pref.type === 'No Disturbance' ? 'bg-red-100 text-red-800' : 
                                    'bg-gray-100 text-gray-800'
                                  }`}>
                                    {pref.type || pref}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>

              {/* Middle Column */}
              <div className="space-y-6">
                {/* Revenue Analytics */}
                <div className={`${isDarkMode ? 'bg-gray-800' : 'bg-gray-100'} rounded-xl p-6 shadow-sm`}>
                  <h3 className={`text-xl font-semibold ${isDarkMode ? 'text-white' : 'text-gray-800'} mb-4`}>Revenue Analytics</h3>
                  <div id="revenueChart" className="w-full h-[300px]"></div>
                </div>

                {/* Housekeeping Tasks */}
                <div className={`${isDarkMode ? 'bg-gray-800' : 'bg-gray-100'} rounded-xl p-6 shadow-sm`}>
                  <h3 className={`text-xl font-semibold ${isDarkMode ? 'text-white' : 'text-gray-800'} mb-4`}>Housekeeping Tasks</h3>
                  {tasks.length === 0 ? (
                    <div className="text-center py-4">
                      <p className={`${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>No pending tasks.</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {tasks.map((task, index) => (
                        <div key={task.id || index} className={`flex items-center gap-4 p-4 ${isDarkMode ? 'bg-gray-900' : 'bg-gray-200'} rounded-lg`}>
                          <input type="checkbox" className="w-5 h-5 rounded text-blue-600" />
                          <div className="flex-1">
                            <h4 className={`font-semibold ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>
                              {task.room}: {task.description}
                            </h4>
                            <p className={`${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                              Priority: <span className={`px-2 py-0.5 text-xs rounded ${
                                task.priority === 'High' ? 'bg-red-100 text-red-800' :
                                task.priority === 'Medium' ? 'bg-yellow-100 text-yellow-800' : 
                                'bg-green-100 text-green-800'
                              }`}>{task.priority}</span>
                              {task.assignee && ` • Assignee: ${task.assignee}`}
                            </p>
                          </div>
                          <span className={`${isDarkMode ? 'text-gray-500' : 'text-gray-600'}`}>{formatDuration(task.duration)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                  <div className="mt-4 text-center">
                    <a href="#/tasks" className="text-blue-500 hover:text-blue-600">View All Tasks</a>
                  </div>
                </div>
              </div>

              {/* Right Column */}
              <div className="space-y-6">
                {/* Recent Notifications */}
                <div className={`${isDarkMode ? 'bg-gray-800' : 'bg-gray-100'} rounded-xl p-6 shadow-sm`}>
                  <h3 className={`text-xl font-semibold ${isDarkMode ? 'text-white' : 'text-gray-800'} mb-4`}>Recent Notifications</h3>
                  {notifications.length === 0 ? (
                    <div className="text-center py-4">
                      <p className={`${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>No notifications.</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {notifications.map((notification, index) => (
                        <div key={notification.timestamp || index} className={`p-4 rounded-lg ${
                          notification.type === 'error' 
                            ? isDarkMode ? 'bg-red-900 bg-opacity-30' : 'bg-red-100' 
                            : notification.type === 'info' 
                              ? isDarkMode ? 'bg-blue-900 bg-opacity-30' : 'bg-blue-100'
                              : isDarkMode ? 'bg-green-900 bg-opacity-30' : 'bg-green-100'
                        }`}>
                          <div className="flex items-start gap-4">
                            <div className={`p-2 rounded-full ${
                              notification.type === 'error' ? 'bg-red-100 text-red-600' :
                              notification.type === 'info' ? 'bg-blue-100 text-blue-600' : 'bg-green-100 text-green-600'
                            }`}>
                              <i className={`fas ${
                                notification.type === 'error' ? 'fa-exclamation-circle' :
                                notification.type === 'info' ? 'fa-info-circle' : 'fa-check-circle'
                              }`}></i>
                            </div>
                            <div className="flex-1">
                              <h4 className={`font-semibold ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>{notification.title}</h4>
                              <p className={`${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>{notification.message}</p>
                              <p className={`text-sm ${isDarkMode ? 'text-gray-500' : 'text-gray-500'} mt-1`}>
                                {formatTimeAgo(notification.timestamp) || notification.time}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <CheckInModal 
        isOpen={isCheckInModalOpen} 
        onClose={() => setIsCheckInModalOpen(false)}
        onAddGuest={(guest) => {
          console.log('Guest added from Dashboard:', guest);
          // You can add additional dashboard-specific logic here if needed
          if (guest.room && selectedRoomId) {
            // Process check-in or reservation based on dates
            const today = new Date().toISOString().split('T')[0];
            if (guest.checkIn === today) {
              processCheckIn(selectedRoomId, guest.name, guest.checkIn, guest.checkOut);
            } else {
              processReservation(selectedRoomId, guest.name, guest.checkIn, guest.checkOut);
            }
          }
        }}
      />
      <RoomCheckInModal 
        isOpen={isRoomCheckInModalOpen}
        onClose={() => setIsRoomCheckInModalOpen(false)}
        onCheckIn={(roomId, guestName, checkInDate, checkOutDate) => {
          // If the check-in date is today, process as check-in
          const today = new Date().toISOString().split('T')[0];
          if (checkInDate === today) {
            processCheckIn(roomId, guestName, checkInDate, checkOutDate);
          } else {
            // Otherwise, process as reservation
            processReservation(roomId, guestName, checkInDate, checkOutDate);
          }
        }}
        roomId={selectedRoomId}
      />
      
      {/* Context Menu */}
      {selectedRoom && (
        <div 
          className="fixed z-50 shadow-lg rounded-lg overflow-hidden" 
          style={{ left: contextMenuPosition.x, top: contextMenuPosition.y }}
        >
          <RoomContextMenu 
            room={selectedRoom} 
            onClose={closeContextMenu}
            onCheckIn={() => handleCheckIn(selectedRoom.id)}
            onCheckOut={() => handleCheckOut(selectedRoom.id)}
            onSetMaintenance={() => handleSetMaintenance(selectedRoom.id)}
            onSetAvailable={() => markRoomAsAvailable(selectedRoom.id)}
            onReserve={() => handleReserveRoom(selectedRoom.id)}
            isDarkMode={isDarkMode}
          />
        </div>
      )}
    </div>
  );
};

export default Dashboard;