import React, { useState, useEffect } from 'react';
import { useOfflineRoomReservation } from '../context/OfflineRoomReservationContext';
import { useModals } from '../context/ModalContext';
import { useTheme } from '../context/ThemeContext';
import OfflineDashboardLayout from './OfflineDashboardLayout';
import Card from './ui/Card';
import Button from './ui/Button';
import OfflineCheckInModal from './OfflineCheckInModal';
import OfflineRoomTooltip from './OfflineRoomTooltip';
import OfflineRoomContextMenu from './OfflineRoomContextMenu';
import useOfflineDatabase from '../hooks/useOfflineDatabase';

const OfflineRoomsPage = () => {
  const { theme } = useTheme();
  const isDarkMode = theme === 'dark';
  const { modals, openModal, closeModal, registerModal } = useModals();
  
  const [hoveredRoom, setHoveredRoom] = useState(null);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });
  const [selectedRoomId, setSelectedRoomId] = useState(null);
  const [activeFilter, setActiveFilter] = useState('all');
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  // Context menu state
  const [contextMenuVisible, setContextMenuVisible] = useState(false);
  const [contextMenuPosition, setContextMenuPosition] = useState({ x: 0, y: 0 });
  const [contextMenuRoom, setContextMenuRoom] = useState(null);
  
  // State for the CheckInModal
  const [isCheckInModalOpen, setIsCheckInModalOpen] = useState(false);

  // Use offline database hook
  const {
    isInitialized,
    getRooms,
    updateRoomStatus,
    checkInGuest,
    checkOutGuest,
    createReservation
  } = useOfflineDatabase();
  
  // Register modals if they don't exist yet
  useEffect(() => {
    if (!modals.hasOwnProperty('checkIn')) {
      registerModal('checkIn');
    }
  }, [modals, registerModal]);

  // Load rooms when component mounts or database is initialized
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

  // Room statistics with defensive coding
  const totalRooms = Array.isArray(rooms) ? rooms.length : 0;
  const availableRooms = Array.isArray(rooms) ? rooms.filter(room => room && room.status === 'Available').length : 0;
  const occupiedRooms = Array.isArray(rooms) ? rooms.filter(room => room && room.status === 'Occupied').length : 0;
  const reservedRooms = Array.isArray(rooms) ? rooms.filter(room => room && room.status === 'Reserved').length : 0;
  const maintenanceRooms = Array.isArray(rooms) ? rooms.filter(room => room && room.status === 'Maintenance').length : 0;

  // Filter rooms based on active filter
  const filteredRooms = React.useMemo(() => {
    if (!rooms || rooms.length === 0) {
      return [];
    }
    
    let filtered = [...rooms];
    
    // Filter by room IDs from 101 to 109 which are our 9 rooms
    filtered = filtered.filter(room => room && room.id >= 101 && room.id <= 109);
    
    // Sort rooms by ID
    filtered = filtered.sort((a, b) => a.id - b.id);
    
    // Apply status filter
    if (activeFilter !== 'all') {
      filtered = filtered.filter(room => room.status.toLowerCase() === activeFilter);
    }
    
    return filtered;
  }, [rooms, activeFilter]);

  // Function to handle check-in
  const handleCheckIn = async (roomId, guestName, checkInDate, checkOutDate) => {
    try {
      await updateRoomStatus(roomId, 'Occupied', {
        guestName,
        checkInDate,
        checkOutDate
      });
      
      // Reload rooms
      await loadRooms();
      setIsCheckInModalOpen(false);
      setSelectedRoomId(null);
    } catch (err) {
      console.error('Error checking in guest:', err);
      setError('Failed to check in guest');
    }
  };

  // Function to handle checkout
  const handleCheckOut = async (roomId) => {
    try {
      await updateRoomStatus(roomId, 'Available');
      await loadRooms();
    } catch (err) {
      console.error('Error checking out guest:', err);
      setError('Failed to check out guest');
    }
  };

  // Function to set room to maintenance
  const handleSetMaintenance = async (roomId) => {
    try {
      await updateRoomStatus(roomId, 'Maintenance');
      await loadRooms();
    } catch (err) {
      console.error('Error setting room to maintenance:', err);
      setError('Failed to set room to maintenance');
    }
  };

  // Function to mark room as available
  const handleSetAvailable = async (roomId) => {
    try {
      await updateRoomStatus(roomId, 'Available');
      await loadRooms();
    } catch (err) {
      console.error('Error setting room to available:', err);
      setError('Failed to set room as available');
    }
  };

  // Function to reserve a room
  const handleReserveRoom = (roomId) => {
    setSelectedRoomId(roomId);
    setIsCheckInModalOpen(true);
  };

  // Function to process reservation
  const processReservation = async (roomId, guestName, checkInDate, checkOutDate) => {
    try {
      await updateRoomStatus(roomId, 'Reserved', {
        guestName,
        checkInDate,
        checkOutDate
      });
      await loadRooms();
    } catch (err) {
      console.error('Error creating reservation:', err);
      setError('Failed to create reservation');
    }
  };

  // Function to handle context menu
  const handleContextMenu = (e, room) => {
    e.preventDefault();
    setContextMenuVisible(true);
    setContextMenuPosition({ x: e.clientX, y: e.clientY });
    setContextMenuRoom(room);
  };

  // Function to close context menu
  const closeContextMenu = () => {
    setContextMenuVisible(false);
  };

  // Handle mouse over for tooltip
  const handleMouseOver = (e, room) => {
    setHoveredRoom(room);
    setTooltipPosition({ x: e.clientX, y: e.clientY });
  };

  // Handle mouse out for tooltip
  const handleMouseOut = () => {
    setHoveredRoom(null);
  };

  // Handle room click
  const handleRoomClick = (room) => {
    if (room.status === 'Available') {
      setSelectedRoomId(room.id);
      setIsCheckInModalOpen(true);
    }
  };

  // Handle context menu actions
  const handleContextMenuAction = (action, roomId) => {
    switch (action) {
      case 'checkin':
        setSelectedRoomId(roomId);
        setIsCheckInModalOpen(true);
        break;
      case 'checkout':
        handleCheckOut(roomId);
        break;
      case 'maintenance':
        handleSetMaintenance(roomId);
        break;
      case 'available':
        handleSetAvailable(roomId);
        break;
      case 'reserve':
        handleReserveRoom(roomId);
        break;
      default:
        break;
    }
    closeContextMenu();
  };

  // Get room status class
  const getRoomStatusClass = (status) => {
    switch (status) {
      case 'Available':
        return isDarkMode ? 'bg-green-600/20 text-green-400 border-green-500/30' : 'bg-green-50 text-green-600 border-green-200';
      case 'Occupied':
        return isDarkMode ? 'bg-blue-600/20 text-blue-400 border-blue-500/30' : 'bg-blue-50 text-blue-600 border-blue-200';
      case 'Reserved':
        return isDarkMode ? 'bg-yellow-600/20 text-yellow-400 border-yellow-500/30' : 'bg-yellow-50 text-yellow-600 border-yellow-200';
      case 'Maintenance':
        return isDarkMode ? 'bg-red-600/20 text-red-400 border-red-500/30' : 'bg-red-50 text-red-600 border-red-200';
      case 'Cleaning':
        return isDarkMode ? 'bg-purple-600/20 text-purple-400 border-purple-500/30' : 'bg-purple-50 text-purple-600 border-purple-200';
      default:
        return isDarkMode ? 'bg-gray-600/20 text-gray-400 border-gray-500/30' : 'bg-gray-50 text-gray-600 border-gray-200';
    }
  };

  // Get room status indicator
  const getRoomStatusIndicator = (status) => {
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

  if (!isInitialized) {
    return (
      <OfflineDashboardLayout activeLink="Rooms" title="Rooms Management - Offline Mode">
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
            <p className="mt-4 text-gray-600">Initializing Offline Database...</p>
          </div>
        </div>
      </OfflineDashboardLayout>
    );
  }

  if (loading) {
    return (
      <OfflineDashboardLayout activeLink="Rooms" title="Rooms Management - Offline Mode">
        <div className="flex items-center justify-center min-h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
            <p className="mt-2 text-gray-600">Loading rooms...</p>
          </div>
        </div>
      </OfflineDashboardLayout>
    );
  }

  return (
    <OfflineDashboardLayout activeLink="Rooms" title="Rooms Management - Offline Mode">
      {/* Offline Mode Banner */}
      <div className="mb-6 bg-gradient-to-r from-green-500 to-emerald-600 text-white p-4 rounded-lg shadow-lg">
        <div className="flex items-center">
          <i className="fas fa-wifi-slash mr-3 text-xl"></i>
          <div>
            <h3 className="font-bold">Offline Mode Active</h3>
            <p className="text-sm opacity-90">All room operations are stored locally. Changes will sync when you're back online.</p>
          </div>
        </div>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="mb-6 bg-red-500 text-white p-4 rounded-lg shadow-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <i className="fas fa-exclamation-circle mr-3"></i>
              <span>{error}</span>
            </div>
            <button 
              onClick={() => setError(null)}
              className="text-white hover:text-gray-200"
            >
              <i className="fas fa-times"></i>
            </button>
          </div>
        </div>
      )}

      {/* Room statistics cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card 
          title="Total Rooms" 
          className="text-center overflow-hidden relative"
        >
          <div className={`absolute top-0 left-0 w-full h-1 ${isDarkMode ? 'bg-gradient-to-r from-blue-500 to-purple-600' : 'bg-gradient-to-r from-blue-400 to-purple-500'}`}></div>
          <p className={`text-4xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-800'} my-2`}>{totalRooms}</p>
          <p className={`text-xs uppercase tracking-wider ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Room inventory</p>
        </Card>
        
        <Card 
          title="Available" 
          className="text-center overflow-hidden relative"
        >
          <div className={`absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-green-400 to-emerald-500`}></div>
          <p className={`text-4xl font-bold ${isDarkMode ? 'text-green-400' : 'text-green-500'} my-2`}>{availableRooms}</p>
          <p className={`text-xs uppercase tracking-wider ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Ready to book</p>
        </Card>
        
        <Card 
          title="Occupied" 
          className="text-center overflow-hidden relative"
        >
          <div className={`absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-400 to-indigo-500`}></div>
          <p className={`text-4xl font-bold ${isDarkMode ? 'text-blue-400' : 'text-blue-500'} my-2`}>{occupiedRooms}</p>
          <p className={`text-xs uppercase tracking-wider ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Currently in use</p>
        </Card>
        
        <Card 
          title="Reserved" 
          className="text-center overflow-hidden relative"
        >
          <div className={`absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-amber-400 to-yellow-500`}></div>
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
              className={`${activeFilter === 'all' ? '' : 'opacity-80'}`}
            >
              All Rooms
            </Button>
            <Button
              variant={activeFilter === 'available' ? 'success' : 'secondary'}
              onClick={() => setActiveFilter('available')}
              size="sm"
              className={`${activeFilter === 'available' ? '' : 'opacity-80'}`}
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
              className={`${activeFilter === 'occupied' ? '' : 'opacity-80'}`}
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
              className={`${activeFilter === 'reserved' ? '' : 'opacity-80'}`}
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
              className={`${activeFilter === 'maintenance' ? '' : 'opacity-80'}`}
            >
              <span className="flex items-center">
                <span className={`w-2 h-2 rounded-full ${isDarkMode ? 'bg-red-400' : 'bg-red-500'} mr-2`}></span>
                Maintenance
              </span>
            </Button>
          </div>
        </div>
      </Card>

      {/* Room grid */}
      <Card className="overflow-hidden relative">
        <div className={`absolute top-0 left-0 w-full h-1 ${isDarkMode ? 'bg-gradient-to-r from-gray-700 to-gray-600' : 'bg-gradient-to-r from-gray-300 to-gray-200'}`}></div>
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className={`text-xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
              {activeFilter === 'all' ? 'All Rooms' : `${activeFilter.charAt(0).toUpperCase() + activeFilter.slice(1)} Rooms`}
              <span className={`ml-2 text-sm font-normal ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                ({filteredRooms.length} rooms)
              </span>
            </h2>
            <Button
              variant="primary"
              onClick={loadRooms}
              size="sm"
              disabled={loading}
            >
              <i className="fas fa-sync-alt mr-2"></i>
              Refresh
            </Button>
          </div>

          {filteredRooms.length === 0 ? (
            <div className="text-center py-12">
              <div className={`text-6xl mb-4 ${isDarkMode ? 'text-gray-600' : 'text-gray-400'}`}>
                🏨
              </div>
              <h3 className={`text-xl font-semibold mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                No rooms found
              </h3>
              <p className={`${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                {activeFilter === 'all' 
                  ? 'No rooms are available in the system.' 
                  : `No rooms with status "${activeFilter}" found.`
                }
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {filteredRooms.map((room) => (
                <div
                  key={room.id}
                  className={`${getRoomStatusClass(room.status)} border-2 rounded-xl p-6 cursor-pointer transition-all duration-300 hover:scale-105 hover:shadow-lg transform`}
                  onClick={() => handleRoomClick(room)}
                  onContextMenu={(e) => handleContextMenu(e, room)}
                  onMouseEnter={(e) => handleMouseOver(e, room)}
                  onMouseLeave={handleMouseOut}
                >
                  <div className="text-center">
                    <div className="text-4xl mb-3">{getRoomStatusIndicator(room.status)}</div>
                    <h3 className="text-xl font-bold mb-2">Room {room.id}</h3>
                    <p className="text-sm opacity-80 mb-2">{room.type}</p>
                    <div className={`inline-block px-3 py-1 rounded-full text-xs font-medium mb-3 ${getRoomStatusClass(room.status)}`}>
                      {room.status}
                    </div>
                    {room.guest_name && (
                      <div className="mt-3 pt-3 border-t border-current border-opacity-20">
                        <p className="text-sm font-medium">👤 {room.guest_name}</p>
                        {room.check_in_date && (
                          <p className="text-xs opacity-70 mt-1">
                            Since: {new Date(room.check_in_date).toLocaleDateString()}
                          </p>
                        )}
                      </div>
                    )}
                    <div className="mt-3 text-xs opacity-60">
                      ${room.price_per_night}/night
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </Card>

      {/* Modals */}
      <OfflineCheckInModal
        isOpen={isCheckInModalOpen}
        onClose={() => {
          setIsCheckInModalOpen(false);
          setSelectedRoomId(null);
        }}
        onCheckIn={handleCheckIn}
        roomId={selectedRoomId}
      />

      {/* Tooltip */}
      {hoveredRoom && (
        <OfflineRoomTooltip
          room={hoveredRoom}
          position={tooltipPosition}
          isDarkMode={isDarkMode}
        />
      )}

      {/* Context Menu */}
      {contextMenuVisible && contextMenuRoom && (
        <OfflineRoomContextMenu
          room={contextMenuRoom}
          position={contextMenuPosition}
          onAction={handleContextMenuAction}
          onClose={closeContextMenu}
          isDarkMode={isDarkMode}
        />
      )}
    </OfflineDashboardLayout>
  );
};

export default OfflineRoomsPage; 