import React, { useState, useEffect } from 'react';
import { useRoomReservation } from '../context/RoomReservationContext';
import { useModals } from '../context/ModalContext';
import { useTheme } from '../context/ThemeContext';
import DashboardLayout from './DashboardLayout';
import Card from './ui/Card';
import Button from './ui/Button';
import CheckInModal from './CheckInModal';
import RoomTooltip from './RoomTooltip';
import RoomContextMenu from './RoomContextMenu';

const RoomsPage = () => {
  const { theme } = useTheme();
  const isDarkMode = theme === 'dark';
  const { rooms, loading, error, updateRoomStatus, checkInGuest, checkOutGuest, createReservation, refreshData } = useRoomReservation();
  const { modals, openModal, closeModal, registerModal } = useModals();
  
  const [hoveredRoom, setHoveredRoom] = useState(null);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });
  const [selectedRoomId, setSelectedRoomId] = useState(null);
  const [activeFilter, setActiveFilter] = useState('all');
  const [activeBlockFilter, setActiveBlockFilter] = useState('all');
  
  // Context menu state
  const [contextMenuVisible, setContextMenuVisible] = useState(false);
  const [contextMenuPosition, setContextMenuPosition] = useState({ x: 0, y: 0 });
  const [contextMenuRoom, setContextMenuRoom] = useState(null);
  
  // Register modals if they don't exist yet
  useEffect(() => {
    if (!modals.hasOwnProperty('checkIn')) {
      registerModal('checkIn');
    }
  }, [modals, registerModal]);

  // Force refresh room data when component mounts (only once)
  useEffect(() => {
    if (!rooms || rooms.length === 0) {
      console.log('RoomsPage: No rooms found, refreshing data...');
      refreshData(true);
    }
  }, []); // Empty dependency array to run only once

  // Room statistics with defensive coding
  const totalRooms = Array.isArray(rooms) ? rooms.length : 0;
  const availableRooms = Array.isArray(rooms) ? rooms.filter(room => room && room.status === 'Available').length : 0;
  const occupiedRooms = Array.isArray(rooms) ? rooms.filter(room => room && room.status === 'Occupied').length : 0;
  const reservedRooms = Array.isArray(rooms) ? rooms.filter(room => room && room.status === 'Reserved').length : 0;
  const maintenanceRooms = Array.isArray(rooms) ? rooms.filter(room => room && room.status === 'Maintenance').length : 0;

  // Get unique blocks for filtering
  const availableBlocks = React.useMemo(() => {
    if (!rooms || rooms.length === 0) return [];
    const blocks = [...new Set(rooms.map(room => room.block || 'Main Block'))];
    return blocks.sort();
  }, [rooms]);

  // Filter rooms based on active filter
  const filteredRooms = React.useMemo(() => {
    if (!rooms || rooms.length === 0) {
      return [];
    }
    
    let filtered = [...rooms];
    
    // Apply status filter
    if (activeFilter !== 'all') {
      filtered = filtered.filter(room => room.status.toLowerCase() === activeFilter);
    }
    
    // Apply block filter
    if (activeBlockFilter !== 'all') {
      filtered = filtered.filter(room => (room.block || 'Main Block') === activeBlockFilter);
    }
    
    // Sort rooms by block first, then by room number
    filtered = filtered.sort((a, b) => {
      const blockA = a.block || 'Main Block';
      const blockB = b.block || 'Main Block';
      
      if (blockA !== blockB) {
        return blockA.localeCompare(blockB);
      }
      
      // Extract numeric part from room number for proper sorting
      const numA = parseInt(a.room_number.toString().replace(/\D/g, ''));
      const numB = parseInt(b.room_number.toString().replace(/\D/g, ''));
      return numA - numB;
    });
    
    return filtered;
  }, [rooms, activeFilter, activeBlockFilter]);

  // Function to handle check-in
  const handleCheckIn = (roomId) => {
    setSelectedRoomId(roomId);
    // Using the old modal system for now - we can refactor as a separate task
    // openModal('checkIn', { roomId });
    setIsCheckInModalOpen(true);
  };

  // Function to handle checkout
  const handleCheckOut = (roomId) => {
    checkOutGuest(roomId);
  };

  // Function to set room to maintenance
  const handleSetMaintenance = (roomId) => {
    updateRoomStatus(roomId, 'Maintenance');
  };

  // Function to mark room as available
  const handleSetAvailable = (roomId) => {
    updateRoomStatus(roomId, 'Available');
  };

  // Function to reserve a room
  const handleReserveRoom = (roomId) => {
    setSelectedRoomId(roomId);
    // Using the old modal system for now - we can refactor as a separate task
    setIsCheckInModalOpen(true);
  };

  // Function to process check-in with guest details
  const processCheckIn = (roomId, guestName, checkInDate, checkOutDate) => {
    const guestData = { name: guestName };
    const dates = { checkIn: checkInDate, checkOut: checkOutDate };
    checkInGuest(roomId, guestData, dates);
  };

  // Function to process reservation
  const processReservation = (roomId, guestName, checkInDate, checkOutDate) => {
    const guestData = { name: guestName };
    const dates = { checkIn: checkInDate, checkOut: checkOutDate };
    createReservation(roomId, guestData, dates);
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

  // State for the CheckInModal - to be migrated to ModalContext in a future update
  const [isCheckInModalOpen, setIsCheckInModalOpen] = useState(false);

  return (
    <DashboardLayout activeLink="Rooms" title="Rooms Management">
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
          {/* Status Filters */}
          <div className="mb-4">
            <p className={`text-xs uppercase tracking-wider mb-3 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Filter by Status</p>
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
            variant={activeFilter === 'occupied' ? 'info' : 'secondary'}
            onClick={() => setActiveFilter('occupied')}
              size="sm"
              className={`${activeFilter === 'occupied' ? '' : 'opacity-80'}`}
          >
              <span className="flex items-center">
                <span className={`w-2 h-2 rounded-full ${isDarkMode ? 'bg-red-400' : 'bg-red-500'} mr-2`}></span>
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
                <span className={`w-2 h-2 rounded-full ${isDarkMode ? 'bg-blue-400' : 'bg-blue-500'} mr-2`}></span>
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
                <span className={`w-2 h-2 rounded-full ${isDarkMode ? 'bg-amber-400' : 'bg-amber-500'} mr-2`}></span>
            Maintenance
              </span>
          </Button>
            </div>
          </div>

          {/* Block Filters */}
          {availableBlocks.length > 1 && (
            <div>
              <p className={`text-xs uppercase tracking-wider mb-3 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Filter by Block/Building</p>
              <div className="flex flex-wrap gap-3">
                <Button
                  variant={activeBlockFilter === 'all' ? 'primary' : 'secondary'}
                  onClick={() => setActiveBlockFilter('all')}
                  size="sm"
                  className={`${activeBlockFilter === 'all' ? '' : 'opacity-80'}`}
                >
                  All Blocks
                </Button>
                {availableBlocks.map((block) => (
                  <Button
                    key={block}
                    variant={activeBlockFilter === block ? 'info' : 'secondary'}
                    onClick={() => setActiveBlockFilter(block)}
                    size="sm"
                    className={`${activeBlockFilter === block ? '' : 'opacity-80'}`}
                  >
                    <span className="flex items-center">
                      <span className="mr-2">🏢</span>
                      {block}
                    </span>
                  </Button>
                ))}
              </div>
            </div>
          )}
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
          </div>
        ) : filteredRooms.length === 0 ? (
          <div className="text-center p-8 text-gray-500">
            <p>No rooms to display. Please check your filter settings or refresh the page.</p>
          </div>
        ) : (
          <>
            <div className={`mt-3 text-sm text-center ${isDarkMode ? 'text-gray-400' : 'text-gray-600'} mb-4`}>
              Click on a room for quick actions • Right-click for all options
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 mt-6">
              {filteredRooms.map((room) => {
                // Display actual room price from database
                const priceDisplay = `GH₵${room.price || 0}`;
                
                // Determine room status UI class
                const getRoomStatusClass = (status) => {
                  if (status === 'Available') {
                    return isDarkMode 
                      ? 'bg-green-900/30 border-green-800 hover:border-green-700' 
                      : 'bg-green-50 border-green-200 hover:border-green-300';
                  } else if (status === 'Occupied') {
                    return isDarkMode 
                      ? 'bg-red-900/30 border-red-800 hover:border-red-700' 
                      : 'bg-red-50 border-red-200 hover:border-red-300';
                  } else if (status === 'Reserved') {
                    return isDarkMode 
                      ? 'bg-blue-900/30 border-blue-800 hover:border-blue-700' 
                      : 'bg-blue-50 border-blue-200 hover:border-blue-300';
                  } else {
                    return isDarkMode 
                      ? 'bg-yellow-900/30 border-yellow-800 hover:border-yellow-700' 
                      : 'bg-yellow-50 border-yellow-200 hover:border-yellow-300';
                  }
                };
                
                // Determine room status indicator color
                const getRoomStatusIndicator = (status) => {
                  if (status === 'Available') return isDarkMode ? 'bg-green-500' : 'bg-green-600';
                  if (status === 'Occupied') return isDarkMode ? 'bg-red-500' : 'bg-red-600';
                  if (status === 'Reserved') return isDarkMode ? 'bg-blue-500' : 'bg-blue-600';
                  return isDarkMode ? 'bg-amber-500' : 'bg-amber-600';
                };
                
              return (
                <div
                  key={room.id}
                    className={`relative p-4 rounded-xl cursor-pointer hover:shadow-lg transition-all duration-300 border backdrop-blur-sm h-28 flex flex-col justify-between ${getRoomStatusClass(room.status)}`}
                    onClick={() => handleCheckIn(room.id)}
                  onMouseOver={(e) => handleMouseOver(e, room)}
                  onMouseOut={handleMouseOut}
                  onContextMenu={(e) => handleContextMenu(e, room)}
                >
                    <div className={`absolute ${getRoomStatusIndicator(room.status)} w-3 h-3 rounded-full bottom-3 right-3`}></div>
                    
                    <div className="flex justify-between items-start w-full">
                      <div className="flex flex-col items-start">
                        <span className={`text-xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>
                          {room.name || `Room ${room.room_number}`}
                        </span>
                        <span className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                          {room.type}
                        </span>
                      </div>
                      <div className={`font-semibold ${isDarkMode ? 'text-emerald-400' : 'text-emerald-600'}`}>
                        {priceDisplay}
                      </div>
                    </div>
                    
                    {room.guest && (
                      <div className={`flex items-center mt-2 px-2 py-1 rounded-md ${isDarkMode ? 'bg-slate-700/50' : 'bg-gray-100'}`}>
                        <i className={`fas fa-user text-xs mr-2 ${isDarkMode ? 'text-blue-400' : 'text-blue-500'}`}></i>
                        <span className="text-xs truncate max-w-full">
                          {room.guest}
                        </span>
                      </div>
                    )}
                    
                    {!room.guest && room.status !== 'Available' && (
                      <div className={`flex items-center mt-2 px-2 py-1 rounded-md ${isDarkMode ? 'bg-slate-700/50' : 'bg-gray-100'}`}>
                        <i className={`fas fa-${room.status === 'Reserved' ? 'calendar-check' : 'tools'} text-xs mr-2 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}></i>
                        <span className="text-xs truncate max-w-full">
                    {room.status}
                  </span>
                      </div>
                    )}
                </div>
              );
            })}
          </div>
          </>
        )}
      </Card>

      {/* Room tooltip */}
      {hoveredRoom && (
        <RoomTooltip 
          room={hoveredRoom} 
          position={tooltipPosition}
          isDarkMode={isDarkMode}
        />
      )}
      
      {/* Room context menu */}
      {contextMenuVisible && contextMenuRoom && (
        <RoomContextMenu
          room={contextMenuRoom}
          position={contextMenuPosition}
          onClose={closeContextMenu}
          onCheckIn={() => handleCheckIn(contextMenuRoom.id)}
          onCheckOut={() => handleCheckOut(contextMenuRoom.id)}
          onSetMaintenance={() => handleSetMaintenance(contextMenuRoom.id)}
          onSetAvailable={() => handleSetAvailable(contextMenuRoom.id)}
          onReserve={() => handleReserveRoom(contextMenuRoom.id)}
          isDarkMode={isDarkMode}
        />
      )}
      
      {/* Check-in modal */}
      <CheckInModal
        isOpen={isCheckInModalOpen}
        onClose={() => setIsCheckInModalOpen(false)}
        onAddGuest={(guest) => {
          console.log('Guest added from RoomsPage:', guest);
          // You can add additional room-specific logic here if needed
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
        roomId={selectedRoomId}
      />
    </DashboardLayout>
  );
};

export default RoomsPage;
