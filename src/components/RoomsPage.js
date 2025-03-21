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
  const { rooms, loading, error, updateRoomStatus, checkInGuest, checkOutGuest, createReservation } = useRoomReservation();
  const { modals, openModal, closeModal, registerModal } = useModals();
  
  const [hoveredRoom, setHoveredRoom] = useState(null);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });
  const [selectedRoomId, setSelectedRoomId] = useState(null);
  const [activeFilter, setActiveFilter] = useState('all');
  
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

  // Room statistics
  const totalRooms = rooms.length;
  const availableRooms = rooms.filter(room => room.status === 'Available').length;
  const occupiedRooms = rooms.filter(room => room.status === 'Occupied').length;
  const reservedRooms = rooms.filter(room => room.status === 'Reserved').length;
  const maintenanceRooms = rooms.filter(room => room.status === 'Maintenance').length;

  // Filter rooms based on active filter
  const filteredRooms = React.useMemo(() => {
    let filtered = [...rooms];
    
    // Filter by room ID from 101 to 120
    filtered = filtered.filter(room => room.id >= 101 && room.id <= 120);
    
    // Sort rooms by ID
    filtered = filtered.sort((a, b) => a.id - b.id);
    
    // Apply status filter
    if (activeFilter !== 'all') {
      filtered = filtered.filter(room => room.status.toLowerCase() === activeFilter);
    }
    
    return filtered;
  }, [rooms, activeFilter]);

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
          className="text-center"
        >
          <p className="text-3xl font-bold">{totalRooms}</p>
        </Card>
        
        <Card 
          title="Available" 
          className="text-center"
        >
          <p className="text-3xl font-bold text-green-500">{availableRooms}</p>
        </Card>
        
        <Card 
          title="Occupied" 
          className="text-center"
        >
          <p className="text-3xl font-bold text-blue-500">{occupiedRooms}</p>
        </Card>
        
        <Card 
          title="Reserved" 
          className="text-center"
        >
          <p className="text-3xl font-bold text-yellow-500">{reservedRooms}</p>
        </Card>
      </div>

      {/* Room filters */}
      <Card className="mb-6">
        <div className="flex flex-wrap gap-2">
          <Button
            variant={activeFilter === 'all' ? 'primary' : 'secondary'}
            onClick={() => setActiveFilter('all')}
          >
            All Rooms
          </Button>
          <Button
            variant={activeFilter === 'available' ? 'success' : 'secondary'}
            onClick={() => setActiveFilter('available')}
          >
            Available
          </Button>
          <Button
            variant={activeFilter === 'occupied' ? 'info' : 'secondary'}
            onClick={() => setActiveFilter('occupied')}
          >
            Occupied
          </Button>
          <Button
            variant={activeFilter === 'reserved' ? 'warning' : 'secondary'}
            onClick={() => setActiveFilter('reserved')}
          >
            Reserved
          </Button>
          <Button
            variant={activeFilter === 'maintenance' ? 'danger' : 'secondary'}
            onClick={() => setActiveFilter('maintenance')}
          >
            Maintenance
          </Button>
        </div>
      </Card>

      {/* Rooms grid */}
      <Card title="Room Status">
        {loading ? (
          <div className="text-center p-8">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <p className="mt-2">Loading rooms...</p>
          </div>
        ) : error ? (
          <div className="text-center p-8 text-red-500">
            <p>Error loading rooms: {error}</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 p-4">
            {filteredRooms.map(room => {
              // Get the status color - matching Dashboard colors
              const statusColor = 
                room.status === 'Available' ? 'bg-green-900 text-white' : 
                room.status === 'Occupied' ? 'bg-red-900 text-white' :
                room.status === 'Reserved' ? 'bg-blue-900 text-white' : 
                'bg-yellow-500 text-white';
                
              return (
                <div
                  key={room.id}
                  className={`p-4 rounded-lg text-center cursor-pointer shadow hover:shadow-md transition-shadow ${statusColor}`}
                  onMouseOver={(e) => handleMouseOver(e, room)}
                  onMouseOut={handleMouseOut}
                  onContextMenu={(e) => handleContextMenu(e, room)}
                >
                  <h3 className="text-xl font-bold mb-1">Room {room.id}</h3>
                  <p className={`text-sm mb-2 text-white`}>
                    {room.type}
                  </p>
                  <span className={`px-2 py-1 text-xs rounded-full bg-opacity-30 bg-white text-white`}>
                    {room.status}
                  </span>
                </div>
              );
            })}
          </div>
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
