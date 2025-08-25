import React, { useState, useEffect } from 'react';
import { useRoomReservation } from '../context/RoomReservationContext';
import useOfflineRooms from '../hooks/useOfflineRooms';
import { useModals } from '../context/ModalContext';
import { useTheme } from '../context/ThemeContext';
import DashboardLayout from './DashboardLayout';
import Card from './ui/Card';
import Button from './ui/Button';
import CheckInModal from './CheckInModal';
import RoomTooltip from './RoomTooltip';
import RoomContextMenu from './RoomContextMenu';

const OfflineEnabledRoomsPage = () => {
  const { theme } = useTheme();
  const isDarkMode = theme === 'dark';
  
  // Online room management (Supabase)
  const { 
    rooms: onlineRooms, 
    loading: onlineLoading, 
    error: onlineError, 
    updateRoomStatus: onlineUpdateRoomStatus,
    checkInGuest: onlineCheckInGuest,
    checkOutGuest: onlineCheckOutGuest,
    createReservation: onlineCreateReservation
  } = useRoomReservation();
  
  // Offline room management (Local Database)
  const { 
    rooms: offlineRooms, 
    loading: offlineLoading, 
    error: offlineError,
    isInitialized: offlineInitialized,
    updateRoomStatus: offlineUpdateRoomStatus,
    checkInGuest: offlineCheckInGuest,
    checkOutGuest: offlineCheckOutGuest,
    createReservation: offlineCreateReservation
  } = useOfflineRooms();
  
  const { modals, openModal, closeModal, registerModal } = useModals();
  
  // State for managing online/offline mode
  const [isOfflineMode, setIsOfflineMode] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState('online');
  
  // Component state
  const [hoveredRoom, setHoveredRoom] = useState(null);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });
  const [selectedRoomId, setSelectedRoomId] = useState(null);
  const [activeFilter, setActiveFilter] = useState('all');
  const [isCheckInModalOpen, setIsCheckInModalOpen] = useState(false);
  
  // Context menu state
  const [contextMenuVisible, setContextMenuVisible] = useState(false);
  const [contextMenuPosition, setContextMenuPosition] = useState({ x: 0, y: 0 });
  const [contextMenuRoom, setContextMenuRoom] = useState(null);
  
  // Monitor online/offline status
  useEffect(() => {
    const handleOnline = () => {
      setConnectionStatus('online');
      console.log('Connection restored - online mode available');
    };
    
    const handleOffline = () => {
      setConnectionStatus('offline');
      setIsOfflineMode(true);
      console.log('Connection lost - switching to offline mode');
    };
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    // Initial connection check
    setConnectionStatus(navigator.onLine ? 'online' : 'offline');
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);
  
  // Auto-fallback to offline if online fails
  useEffect(() => {
    if (connectionStatus === 'online' && onlineError && offlineInitialized) {
      console.log('Online mode failed, falling back to offline mode');
      setIsOfflineMode(true);
    }
  }, [onlineError, offlineInitialized, connectionStatus]);
  
  // Register modals
  useEffect(() => {
    if (!modals.hasOwnProperty('checkIn')) {
      registerModal('checkIn');
    }
  }, [modals, registerModal]);

  // Determine which data source to use
  const useOfflineData = isOfflineMode || connectionStatus === 'offline' || onlineError;
  const rooms = useOfflineData ? offlineRooms : onlineRooms;
  const loading = useOfflineData ? offlineLoading : onlineLoading;
  const error = useOfflineData ? offlineError : onlineError;
  
  // Determine which functions to use
  const updateRoomStatus = useOfflineData ? offlineUpdateRoomStatus : onlineUpdateRoomStatus;
  const checkInGuest = useOfflineData ? offlineCheckInGuest : onlineCheckInGuest;
  const checkOutGuest = useOfflineData ? offlineCheckOutGuest : onlineCheckOutGuest;
  const createReservation = useOfflineData ? offlineCreateReservation : onlineCreateReservation;

  // Room statistics
  const totalRooms = Array.isArray(rooms) ? rooms.length : 0;
  const availableRooms = Array.isArray(rooms) ? rooms.filter(room => room && room.status === 'Available').length : 0;
  const occupiedRooms = Array.isArray(rooms) ? rooms.filter(room => room && room.status === 'Occupied').length : 0;
  const reservedRooms = Array.isArray(rooms) ? rooms.filter(room => room && room.status === 'Reserved').length : 0;
  const maintenanceRooms = Array.isArray(rooms) ? rooms.filter(room => room && room.status === 'Maintenance').length : 0;

  // Filter rooms
  const filteredRooms = React.useMemo(() => {
    if (!rooms || rooms.length === 0) {
      return [];
    }
    
    let filtered = [...rooms];
    filtered = filtered.filter(room => room && room.id >= 101 && room.id <= 109);
    filtered = filtered.sort((a, b) => a.id - b.id);
    
    if (activeFilter !== 'all') {
      filtered = filtered.filter(room => room.status.toLowerCase() === activeFilter);
    }
    
    return filtered;
  }, [rooms, activeFilter]);

  // Event handlers
  const handleCheckIn = (roomId) => {
    setSelectedRoomId(roomId);
    setIsCheckInModalOpen(true);
  };

  const handleCheckOut = async (roomId) => {
    try {
      await checkOutGuest(roomId);
    } catch (err) {
      console.error('Check out failed:', err);
    }
  };

  const handleSetMaintenance = async (roomId) => {
    try {
      await updateRoomStatus(roomId, 'Maintenance');
    } catch (err) {
      console.error('Status update failed:', err);
    }
  };

  const handleSetAvailable = async (roomId) => {
    try {
      await updateRoomStatus(roomId, 'Available');
    } catch (err) {
      console.error('Status update failed:', err);
    }
  };

  const handleReserveRoom = (roomId) => {
    setSelectedRoomId(roomId);
    setIsCheckInModalOpen(true);
  };

  const processCheckIn = async (roomId, guestName, checkInDate, checkOutDate) => {
    try {
      const guestData = { name: guestName };
      const dates = { checkIn: checkInDate, checkOut: checkOutDate };
      await checkInGuest(roomId, guestData, dates);
      setIsCheckInModalOpen(false);
    } catch (err) {
      console.error('Check in failed:', err);
    }
  };

  const processReservation = async (roomId, guestName, checkInDate, checkOutDate) => {
    try {
      const guestData = { name: guestName };
      const dates = { checkIn: checkInDate, checkOut: checkOutDate };
      await createReservation(roomId, guestData, dates);
      setIsCheckInModalOpen(false);
    } catch (err) {
      console.error('Reservation failed:', err);
    }
  };

  const handleContextMenu = (e, room) => {
    e.preventDefault();
    setContextMenuVisible(true);
    setContextMenuPosition({ x: e.clientX, y: e.clientY });
    setContextMenuRoom(room);
  };

  const closeContextMenu = () => {
    setContextMenuVisible(false);
  };

  const handleMouseOver = (e, room) => {
    setHoveredRoom(room);
    setTooltipPosition({ x: e.clientX, y: e.clientY });
  };

  const handleMouseOut = () => {
    setHoveredRoom(null);
  };

  const toggleOfflineMode = () => {
    setIsOfflineMode(!isOfflineMode);
  };

  // Status indicator component
  const StatusIndicator = () => (
    <div className="flex items-center space-x-3 mb-4">
      <div className={`flex items-center space-x-2 px-3 py-2 rounded-lg ${
        useOfflineData 
          ? (isDarkMode ? 'bg-amber-900' : 'bg-amber-100') 
          : (isDarkMode ? 'bg-green-900' : 'bg-green-100')
      }`}>
        <div className={`w-2 h-2 rounded-full ${
          useOfflineData ? 'bg-amber-500' : 'bg-green-500'
        }`}></div>
        <span className={`text-sm font-medium ${
          useOfflineData 
            ? (isDarkMode ? 'text-amber-200' : 'text-amber-800')
            : (isDarkMode ? 'text-green-200' : 'text-green-800')
        }`}>
          {useOfflineData ? 'Offline Mode' : 'Online Mode'}
        </span>
      </div>
      
      {connectionStatus === 'online' && (
        <Button
          variant={isOfflineMode ? 'primary' : 'secondary'}
          size="sm"
          onClick={toggleOfflineMode}
        >
          {isOfflineMode ? 'Switch to Online' : 'Switch to Offline'}
        </Button>
      )}
    </div>
  );

  return (
    <DashboardLayout activeLink="Rooms" title="Rooms Management">
      <StatusIndicator />
      
      {/* Room statistics cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card title="Total Rooms" className="text-center overflow-hidden relative">
          <div className={`absolute top-0 left-0 w-full h-1 ${isDarkMode ? 'bg-gradient-to-r from-blue-500 to-purple-600' : 'bg-gradient-to-r from-blue-400 to-purple-500'}`}></div>
          <p className={`text-4xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-800'} my-2`}>{totalRooms}</p>
          <p className={`text-xs uppercase tracking-wider ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Room inventory</p>
        </Card>
        
        <Card title="Available" className="text-center overflow-hidden relative">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-green-400 to-emerald-500"></div>
          <p className={`text-4xl font-bold ${isDarkMode ? 'text-green-400' : 'text-green-500'} my-2`}>{availableRooms}</p>
          <p className={`text-xs uppercase tracking-wider ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Ready to book</p>
        </Card>
        
        <Card title="Occupied" className="text-center overflow-hidden relative">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-400 to-indigo-500"></div>
          <p className={`text-4xl font-bold ${isDarkMode ? 'text-blue-400' : 'text-blue-500'} my-2`}>{occupiedRooms}</p>
          <p className={`text-xs uppercase tracking-wider ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Currently in use</p>
        </Card>
        
        <Card title="Reserved" className="text-center overflow-hidden relative">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-amber-400 to-yellow-500"></div>
          <p className={`text-4xl font-bold ${isDarkMode ? 'text-yellow-400' : 'text-yellow-500'} my-2`}>{reservedRooms}</p>
          <p className={`text-xs uppercase tracking-wider ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Upcoming stays</p>
        </Card>
      </div>

      {/* Room filters */}
      <Card className="mb-6 overflow-hidden relative">
        <div className={`absolute top-0 left-0 w-full h-1 ${isDarkMode ? 'bg-gradient-to-r from-gray-700 to-gray-600' : 'bg-gradient-to-r from-gray-300 to-gray-200'}`}></div>
        <div className="p-1">
          <p className={`text-xs uppercase tracking-wider mb-3 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Filter rooms by status</p>
          <div className="flex flex-wrap gap-3">
            <Button
              variant={activeFilter === 'all' ? 'primary' : 'secondary'}
              onClick={() => setActiveFilter('all')}
              size="sm"
            >
              All Rooms
            </Button>
            <Button
              variant={activeFilter === 'available' ? 'success' : 'secondary'}
              onClick={() => setActiveFilter('available')}
              size="sm"
            >
              <span className="flex items-center">
                <span className={`w-2 h-2 rounded-full ${isDarkMode ? 'bg-green-400' : 'bg-green-500'} mr-2`}></span>
                Available
              </span>
            </Button>
            <Button
              variant={activeFilter === 'occupied' ? 'primary' : 'secondary'}
              onClick={() => setActiveFilter('occupied')}
              size="sm"
            >
              <span className="flex items-center">
                <span className={`w-2 h-2 rounded-full ${isDarkMode ? 'bg-blue-400' : 'bg-blue-500'} mr-2`}></span>
                Occupied
              </span>
            </Button>
            <Button
              variant={activeFilter === 'reserved' ? 'warning' : 'secondary'}
              onClick={() => setActiveFilter('reserved')}
              size="sm"
            >
              <span className="flex items-center">
                <span className={`w-2 h-2 rounded-full ${isDarkMode ? 'bg-yellow-400' : 'bg-yellow-500'} mr-2`}></span>
                Reserved
              </span>
            </Button>
            <Button
              variant={activeFilter === 'maintenance' ? 'danger' : 'secondary'}
              onClick={() => setActiveFilter('maintenance')}
              size="sm"
            >
              <span className="flex items-center">
                <span className={`w-2 h-2 rounded-full ${isDarkMode ? 'bg-amber-400' : 'bg-amber-500'} mr-2`}></span>
                Maintenance
              </span>
            </Button>
          </div>
        </div>
      </Card>

      {/* Rooms grid */}
      <Card title="Room Overview">
        {loading ? (
          <div className="text-center p-8">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <p className="mt-2">Loading rooms...</p>
          </div>
        ) : error ? (
          <div className="text-center p-8 text-red-500">
            <p>Error loading rooms: {error}</p>
            {!useOfflineData && offlineInitialized && (
              <Button onClick={() => setIsOfflineMode(true)} className="mt-4">
                Switch to Offline Mode
              </Button>
            )}
          </div>
        ) : filteredRooms.length === 0 ? (
          <div className="text-center p-8 text-gray-500">
            <p>No rooms to display. Please check your filter settings.</p>
          </div>
        ) : (
          <>
            <div className={`mt-3 text-sm text-center ${isDarkMode ? 'text-gray-400' : 'text-gray-600'} mb-4`}>
              Click on a room for quick actions • Right-click for all options
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 mt-6">
              {filteredRooms.map((room) => {
                const priceDisplay = 
                  room.type === 'Standard' ? 'GH₵400' :
                  room.type === 'Superior' ? 'GH₵700' :
                  room.type === 'Executive' ? 'GH₵1,250' :
                  `GH₵${room.price || 0}`;

                return (
                  <div
                    key={room.id}
                    className={`p-4 rounded-lg border-2 cursor-pointer transition-all duration-200 ${
                      room.status === 'Available' ? 'border-green-300 bg-green-50 hover:bg-green-100' :
                      room.status === 'Occupied' ? 'border-blue-300 bg-blue-50 hover:bg-blue-100' :
                      room.status === 'Reserved' ? 'border-yellow-300 bg-yellow-50 hover:bg-yellow-100' :
                      'border-red-300 bg-red-50 hover:bg-red-100'
                    }`}
                    onClick={() => handleCheckIn(room.id)}
                    onContextMenu={(e) => handleContextMenu(e, room)}
                    onMouseOver={(e) => handleMouseOver(e, room)}
                    onMouseOut={handleMouseOut}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="font-bold text-lg">{room.name || `Room ${room.room_number}`}</h3>
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        room.status === 'Available' ? 'bg-green-200 text-green-800' :
                        room.status === 'Occupied' ? 'bg-blue-200 text-blue-800' :
                        room.status === 'Reserved' ? 'bg-yellow-200 text-yellow-800' :
                        'bg-red-200 text-red-800'
                      }`}>
                        {room.status}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 mb-1">Type: {room.type}</p>
                    <p className="text-sm text-gray-600 mb-2">Price: {priceDisplay}/night</p>
                    <p className="text-sm text-gray-600">Capacity: {room.capacity} guests</p>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </Card>

      {/* Check-in Modal */}
      {isCheckInModalOpen && (
        <CheckInModal
          isOpen={isCheckInModalOpen}
          onClose={() => setIsCheckInModalOpen(false)}
          roomId={selectedRoomId}
          onSubmit={processCheckIn}
          onReservation={processReservation}
        />
      )}

      {/* Tooltip */}
      {hoveredRoom && (
        <RoomTooltip
          room={hoveredRoom}
          position={tooltipPosition}
        />
      )}

      {/* Context Menu */}
      {contextMenuVisible && (
        <RoomContextMenu
          room={contextMenuRoom}
          position={contextMenuPosition}
          onClose={closeContextMenu}
          onCheckIn={handleCheckIn}
          onCheckOut={handleCheckOut}
          onSetMaintenance={handleSetMaintenance}
          onSetAvailable={handleSetAvailable}
          onReserve={handleReserveRoom}
        />
      )}
    </DashboardLayout>
  );
};

export default OfflineEnabledRoomsPage; 