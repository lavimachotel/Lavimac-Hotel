import React, { useState, useEffect, useContext } from 'react';
import { format } from 'date-fns';
import { useTheme } from '../context/ThemeContext';
import { useGuests } from '../context/GuestContext';
import { useRoomReservation } from '../context/RoomReservationContext';
import Sidebar from './Sidebar';
import Navbar from './Navbar';
import supabase from '../supabaseClient';
import ReservationViewModal from './ReservationViewModal';
import ReservationEditModal from './ReservationEditModal';
import { deleteReservation } from '../services/reservationService';

const ReservationsList = () => {
  const { theme } = useTheme();
  const isDarkMode = theme === 'dark';
  const { 
    reservations, 
    loading, 
    error, 
    cancelReservation, 
    checkInGuest,
    checkOutGuest,
    rooms,
    refreshData,
    updateReservation
  } = useRoomReservation();
  const { addGuestToList } = useGuests();
  const [filteredReservations, setFilteredReservations] = useState([]);
  const [statusFilter, setStatusFilter] = useState('active');
  const [searchTerm, setSearchTerm] = useState('');
  const [showDebug, setShowDebug] = useState(false); // Hidden by default
  
  // Modal states for actions
  const [showRoomAvailabilityModal, setShowRoomAvailabilityModal] = useState(false);
  const [showCancellationModal, setShowCancellationModal] = useState(false);
  const [showGroupBookingModal, setShowGroupBookingModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedCancellation, setSelectedCancellation] = useState(null);
  const [selectedReservation, setSelectedReservation] = useState(null);

  // Add animation state for list items
  const [animatedItems, setAnimatedItems] = useState({});

  // Add toast message state
  const [toastMessage, setToastMessage] = useState(null);

  useEffect(() => {
    // Apply filters to reservations
    let filtered = [...reservations];
    
    // Apply status filter
    if (statusFilter === 'active') {
      // Only show active reservations (Reserved or Confirmed, not Checked In)
      filtered = filtered.filter(res => 
        res.status === 'Reserved' || 
        res.status === 'Confirmed'
      );
    } else if (statusFilter !== 'all') {
      filtered = filtered.filter(res => res.status === statusFilter);
    }
    
    // Apply search term filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(res => 
        (res.guest_name && res.guest_name.toLowerCase().includes(term)) || 
        (res.room_id && res.room_id.toString().includes(term))
      );
    }
    
    // Enhance reservations with room details
    filtered = filtered.map(reservation => {
      // Find the corresponding room
      const room = rooms.find(r => r.id === reservation.room_id);
      
      // Create enhanced reservation with proper field mappings
      const enhancedReservation = {
        ...reservation,
        // Use the correct field for guest name - it might be in different properties
        guest_name: reservation.guestName || reservation.guest_name || 'Unknown Guest',
        // Map email properly
        guest_email: reservation.email || reservation.guest_email || '',
        // Map phone properly
        guest_phone: reservation.phoneNumber || reservation.guest_phone || '',
        // Add room details
        room_number: room ? room.room_number : reservation.room_id,
        room_name: room ? room.name : reservation.room_name,
        room_type: room ? room.type : (reservation.roomType || reservation.room_type || 'Standard'),
        // Map payment properly
        payment_method: reservation.paymentMethod || reservation.payment_method || 'Credit Card',
        payment_status: reservation.payment_status || 'Pending',
        // Ensure dates are properly formatted
        check_in_date: reservation.checkInDate || reservation.check_in_date,
        check_out_date: reservation.checkOutDate || reservation.check_out_date,
      };
      
      return enhancedReservation;
    });
    
    // Sort by check-in date (newest first)
    filtered.sort((a, b) => new Date(b.check_in_date) - new Date(a.check_in_date));
    
    setFilteredReservations(filtered);
    
    // Initialize animation states for new items
    const newAnimatedItems = {};
    filtered.forEach((res, index) => {
      if (!animatedItems[res.id]) {
        // Stagger the animations
        setTimeout(() => {
          setAnimatedItems(prev => ({
            ...prev,
            [res.id]: true
          }));
        }, index * 50);
      } else {
        newAnimatedItems[res.id] = true;
      }
    });
  }, [reservations, statusFilter, searchTerm, rooms]);

  const handleCancelReservation = async (id) => {
    // Confirm before cancellation
    if (!window.confirm("Are you sure you want to cancel this reservation?")) {
      return;
    }
    
    try {
      const result = await cancelReservation(id);
      if (result.success) {
        setToastMessage({
          text: "Reservation cancelled successfully",
          type: "success"
        });
        
        // Update the animation state to fade out the item
        setAnimatedItems(prev => ({
          ...prev,
          [id]: true
        }));
        
        // Remove the reservation from the list after animation
        setTimeout(() => {
          setFilteredReservations(prevReservations => 
            prevReservations.filter(reservation => reservation.id !== id)
          );
        }, 300);
      } else {
        console.error("Error cancelling reservation:", result.error);
        setToastMessage({
          text: `Error cancelling reservation: ${result.error}`,
          type: "error"
        });
      }
    } catch (error) {
      console.error("Exception cancelling reservation:", error);
      setToastMessage({
        text: `Error: ${error.message || "Unknown error occurred"}`,
        type: "error"
      });
    }
  };

  const handleCheckIn = async (reservation) => {
    if (window.confirm(`Check in ${reservation.guest_name}?`)) {
      try {
        // Prepare guest data from reservation
        const guestData = {
          name: reservation.guest_name,
          email: reservation.guest_email || '',
          phone: reservation.guest_phone || '',
          room: reservation.room_id.toString(),
          checkInDate: new Date(),
          checkOutDate: reservation.check_out_date ? new Date(reservation.check_out_date) : new Date(Date.now() + 86400000 * 3),
          status: 'Checked In',
          firstName: reservation.guest_name.split(' ')[0],
          lastName: reservation.guest_name.split(' ').slice(1).join(' ') || '',
          nationality: 'Ghana',
          address: reservation.special_requests || '',
          gender: '',
          region: 'Greater Accra',
          dateOfBirth: new Date('1990-01-01')
        };

        // Step 1: Add the guest to the guest list
        console.log('Adding guest from reservation:', guestData);
        const guestResult = await addGuestToList(guestData);
        
        if (!guestResult || !guestResult.success) {
          console.error('Failed to add guest to guest list:', guestResult?.error || 'Unknown error');
          alert('Warning: Guest check-in succeeded but failed to add to guest directory. Please add manually.');
        } else {
          console.log('Successfully added guest to directory with ID:', guestResult.data?.id);
        }
        
        // Step 2: DELETE the reservation from the database FIRST
        console.log('Deleting reservation:', reservation.id);
        const deleteResult = await deleteReservation(reservation.id);
        if (!deleteResult.success) {
          console.error('Error deleting reservation:', deleteResult.error);
        } else {
          console.log('Reservation successfully deleted after check-in');
        }
        
        // Step 3: DIRECTLY update the room status in Supabase to ensure consistency
        console.log('Directly updating room status to Occupied for room:', reservation.room_id);
        const { error: roomUpdateError } = await supabase
          .from('rooms')
          .update({ 
            status: 'Occupied',
            guest: reservation.guest_name,
            updated_at: new Date().toISOString()
          })
          .eq('id', reservation.room_id);
          
        if (roomUpdateError) {
          console.error('Error updating room status directly:', roomUpdateError);
          alert('Warning: Room status may not be updated correctly. Please check.');
        }
        
        // Step 4: Now use the checkInGuest function (which might have its own logic we want to preserve)
        const roomResult = await checkInGuest(reservation.room_id, {
          name: reservation.guest_name,
          email: reservation.guest_email,
          phone: reservation.guest_phone
        });
        
        if (!roomResult.success) {
          console.error('Error in checkInGuest function:', roomResult.error);
          alert(`Warning: Room status update through checkInGuest failed: ${roomResult.error}`);
        }
        
        // Step 5: Force a refresh of data
        await refreshData();
        
        // Step 6: Update local UI state
        setFilteredReservations(prev => 
          prev.filter(res => res.id !== reservation.id)
        );
        
        // Step 7: Trigger an update for the Dashboard's room status display
        const roomStatusEvent = new CustomEvent('hotelRoomStatusUpdate', {
          detail: { 
            roomId: reservation.room_id, 
            status: 'Occupied',
            forceRefresh: true  // Add a flag to force refresh
          }
        });
        document.dispatchEvent(roomStatusEvent);
        
        // Step 8: Notify that a guest was checked in (for other components that need to update)
        const guestCheckInEvent = new CustomEvent('hotelGuestCheckIn', {
          detail: { 
            guestId: guestResult?.data?.id,
            guestName: reservation.guest_name,
            roomId: reservation.room_id,
            forceRefresh: true  // Add a flag to force refresh
          }
        });
        document.dispatchEvent(guestCheckInEvent);
        
        // Step 9: Update the room status in the occupancy overview
        const updateOccupancyEvent = new CustomEvent('hotelOccupancyUpdate', {
          detail: { 
            roomId: reservation.room_id, 
            status: 'Occupied',
            guestName: reservation.guest_name,
            forceRefresh: true  // Add a flag to force refresh
          }
        });
        document.dispatchEvent(updateOccupancyEvent);
        
        alert('Guest checked in successfully and moved to Guest Directory!');
      } catch (error) {
        console.error('Error during check-in process:', error);
        alert(`Error during check-in: ${error.message || error}`);
      }
    }
  };

  const handleCheckOut = async (reservation) => {
    if (window.confirm(`Check out ${reservation.guest_name}?`)) {
      try {
        // Call the checkOutGuest function from context
        const result = await checkOutGuest(reservation.room_id);
        
        if (result.success) {
          alert('Guest checked out successfully');
        } else {
          alert(`Error checking out guest: ${result.error}`);
        }
      } catch (error) {
        alert(`Error: ${error.message}`);
      }
    }
  };

  // Helper function to safely format dates
  const formatDate = (dateString) => {
    if (!dateString) return 'No date provided';
    try {
      // Handle different date formats
      let date;
      if (typeof dateString === 'string') {
        date = new Date(dateString);
      } else {
        date = dateString;
      }
      
      if (isNaN(date.getTime())) {
        return 'Invalid date';
      }
      
      return format(date, 'MMM d, yyyy');
    } catch (error) {
      console.error('Error formatting date:', error, dateString);
      return String(dateString);
    }
  };

  const getStatusBadgeClass = (status) => {
    if (!status) return 'bg-gray-500';
    
    const baseClasses = 'status-badge';
    
    switch(status.toLowerCase()) {
      case 'confirmed':
        return `${baseClasses} confirmed`;
      case 'reserved':
        return `${baseClasses} reserved`;
      case 'checked in':
        return `${baseClasses} checked-in`;
      case 'checked out':
        return `${baseClasses} checked-out`;
      case 'cancelled':
        return `${baseClasses} cancelled`;
      case 'no-show':
        return `${baseClasses} no-show`;
      default:
        return `${baseClasses} other`;
    }
  };

  const getPaymentStatusBadgeClass = (status) => {
    if (!status) return 'bg-gray-500';
    
    const baseClasses = 'payment-badge';
    
    switch(status.toLowerCase()) {
      case 'paid':
        return `${baseClasses} paid`;
      case 'pending':
        return `${baseClasses} pending`;
      case 'refunded':
        return `${baseClasses} refunded`;
      case 'cancelled':
        return `${baseClasses} cancelled`;
      default:
        return `${baseClasses} other`;
    }
  };

  // Create a RoomAvailabilityModal component
  const RoomAvailabilityModal = ({ isOpen, onClose, rooms, isDarkMode }) => {
    const [dateFilter, setDateFilter] = useState(new Date().toISOString().split('T')[0]);
    const [roomTypeFilter, setRoomTypeFilter] = useState('all');
    
    // Only show available rooms
    const availableRooms = rooms.filter(room => 
      room.status === 'Available' && 
      (roomTypeFilter === 'all' || room.type === roomTypeFilter)
    );
    
    // Get unique room types
    const roomTypes = [...new Set(rooms.map(room => room.type))];
    
    if (!isOpen) return null;
    
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className={`${isDarkMode ? 'bg-gray-800 text-white' : 'bg-white text-gray-800'} rounded-lg p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto`}>
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">Room Availability</h2>
            <button 
              onClick={onClose}
              className={`${isDarkMode ? 'text-gray-300 hover:text-white' : 'text-gray-600 hover:text-gray-800'} text-xl font-bold`}
            >
              ×
            </button>
          </div>
          
          {/* Filters */}
          <div className="flex flex-wrap gap-4 mb-6">
            <div>
              <label className="block text-sm font-medium mb-1">Date</label>
              <input 
                type="date" 
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                className={`rounded border ${isDarkMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-300'} p-2`}
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1">Room Type</label>
              <select 
                value={roomTypeFilter}
                onChange={(e) => setRoomTypeFilter(e.target.value)}
                className={`rounded border ${isDarkMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-300'} p-2`}
              >
                <option value="all">All Types</option>
                {roomTypes.map(type => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
            </div>
          </div>
          
          {/* Room Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {availableRooms.length === 0 ? (
              <div className="col-span-3 py-8 text-center">
                <p className="text-lg">No available rooms match your criteria</p>
                <p className="text-sm mt-2">Try adjusting your filters</p>
              </div>
            ) : (
              availableRooms.map(room => (
                <div 
                  key={room.id}
                  className={`border rounded-lg p-4 ${isDarkMode ? 'bg-gray-700 border-gray-600' : 'bg-gray-50 border-gray-200'}`}
                >
                  <h3 className="font-semibold text-lg">{room.name || `Room ${room.room_number}`}</h3>
                  <div className={`text-sm mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>{room.type}</div>
                  <div className="flex justify-between items-center mb-3">
                    <span className="font-bold text-lg">GH₵{room.price?.toFixed(2) || '0.00'}</span>
                    <span className={`px-2 py-1 text-xs rounded-full ${isDarkMode ? 'bg-green-900 text-green-200' : 'bg-green-100 text-green-800'}`}>
                      Available
                    </span>
                  </div>
                  <ul className={`text-sm mb-4 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                    <li>• Max Capacity: {room.capacity || 2} people</li>
                    <li>• {room.amenities?.includes('wifi') ? 'Wi-Fi Included' : 'No Wi-Fi'}</li>
                    <li>• {room.amenities?.includes('breakfast') ? 'Breakfast Included' : 'No Breakfast'}</li>
                  </ul>
                  <button 
                    className={`w-full py-2 rounded ${isDarkMode ? 'bg-blue-600 hover:bg-blue-700' : 'bg-blue-500 hover:bg-blue-600'} text-white`}
                    onClick={() => {
                      // Navigate to room booking
                      window.location.href = `/rooms?id=${room.id}`;
                    }}
                  >
                    Book Now
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    );
  };

  // Create CancellationModal component
  const CancellationModal = ({ isOpen, onClose, isDarkMode, reservations, onCancelReservation }) => {
    const [selectedReservationId, setSelectedReservationId] = useState(null);
    const [reason, setReason] = useState('');
    const [isRefund, setIsRefund] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    
    const cancelledReservations = reservations.filter(res => res.status === 'Cancelled');
    
    const handleSubmit = async (e) => {
      e.preventDefault();
      if (!selectedReservationId) {
        alert('Please select a reservation to cancel');
        return;
      }
      
      setIsProcessing(true);
      
      try {
        const result = await onCancelReservation(selectedReservationId);
        
        if (result.success) {
          alert('Reservation cancelled successfully');
          // Log cancellation details
          console.log('Cancellation details:', {
            reservationId: selectedReservationId,
            reason,
            refundIssued: isRefund
          });
          onClose();
        } else {
          alert(`Error cancelling reservation: ${result.error}`);
        }
      } catch (error) {
        alert(`Error: ${error.message}`);
      } finally {
        setIsProcessing(false);
      }
    };
    
    if (!isOpen) return null;
    
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className={`${isDarkMode ? 'bg-gray-800 text-white' : 'bg-white text-gray-800'} rounded-lg p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto`}>
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">Manage Cancellations</h2>
            <button 
              onClick={onClose}
              className={`${isDarkMode ? 'text-gray-300 hover:text-white' : 'text-gray-600 hover:text-gray-800'} text-xl font-bold`}
            >
              ×
            </button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Left: Cancellation Form */}
            <div>
              <h3 className="font-medium mb-4">Process New Cancellation</h3>
              <form onSubmit={handleSubmit}>
                <div className="mb-4">
                  <label className="block text-sm font-medium mb-1">Select Reservation</label>
                  <select 
                    value={selectedReservationId || ''}
                    onChange={(e) => setSelectedReservationId(e.target.value)}
                    className={`w-full rounded border ${isDarkMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-300'} p-2`}
                    required
                  >
                    <option value="">-- Select a reservation --</option>
                    {reservations
                      .filter(res => res.status === 'Reserved' || res.status === 'Confirmed')
                      .map(res => (
                        <option key={res.id} value={res.id}>
                          {res.room_name || `Room ${res.room_number || res.room_id}`} - {res.guest_name} ({formatDate(res.check_in_date)})
                        </option>
                      ))
                    }
                  </select>
                </div>
                
                <div className="mb-4">
                  <label className="block text-sm font-medium mb-1">Reason for Cancellation</label>
                  <textarea 
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    className={`w-full rounded border ${isDarkMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-300'} p-2`}
                    rows="3"
                    placeholder="Enter the reason for cancellation"
                    required
                  ></textarea>
                </div>
                
                <div className="mb-4">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={isRefund}
                      onChange={(e) => setIsRefund(e.target.checked)}
                      className="mr-2"
                    />
                    <span>Process Refund</span>
                  </label>
                </div>
                
                <button 
                  type="submit"
                  disabled={isProcessing}
                  className={`w-full py-2 rounded ${
                    isDarkMode 
                      ? 'bg-red-600 hover:bg-red-700 disabled:bg-red-800' 
                      : 'bg-red-500 hover:bg-red-600 disabled:bg-red-300'
                  } text-white`}
                >
                  {isProcessing ? 'Processing...' : 'Cancel Reservation'}
                </button>
              </form>
            </div>
            
            {/* Right: Recent Cancellations */}
            <div>
              <h3 className="font-medium mb-4">Recent Cancellations</h3>
              {cancelledReservations.length === 0 ? (
                <div className="text-center py-4">
                  <p>No recent cancellations</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {cancelledReservations.slice(0, 5).map(res => (
                    <div 
                      key={res.id}
                      className={`p-3 rounded ${isDarkMode ? 'bg-gray-700' : 'bg-gray-100'}`}
                    >
                      <div className="flex justify-between">
                        <div className="font-medium">{res.guest_name}</div>
                        <div className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                          {formatDate(res.updated_at || res.cancelled_at || res.check_in_date)}
                        </div>
                      </div>
                      <div className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                        {res.room_name || `Room ${res.room_number || res.room_id}`} • {formatDate(res.check_in_date)} to {formatDate(res.check_out_date)}
                      </div>
                      {res.cancellation_reason && (
                        <div className="mt-1 text-sm">
                          <span className="font-medium">Reason:</span> {res.cancellation_reason}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };
  
  // Create GroupBookingModal component
  const GroupBookingModal = ({ isOpen, onClose, isDarkMode, rooms }) => {
    const [groupName, setGroupName] = useState('');
    const [checkInDate, setCheckInDate] = useState(new Date().toISOString().split('T')[0]);
    const [checkOutDate, setCheckOutDate] = useState(new Date(Date.now() + 86400000 * 3).toISOString().split('T')[0]);
    const [selectedRooms, setSelectedRooms] = useState([{ type: 'Standard', count: 2 }]);
    const [contactEmail, setContactEmail] = useState('');
    const [contactPhone, setContactPhone] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);
    
    // Get unique room types
    const roomTypes = [...new Set(rooms.map(room => room.type))];
    
    // Calculate available rooms for each type
    const availableRoomsByType = roomTypes.reduce((acc, type) => {
      acc[type] = rooms.filter(room => room.status === 'Available' && room.type === type).length;
      return acc;
    }, {});
    
    // Add another room type selection
    const addRoomType = () => {
      // Find a type that hasn't been selected yet, or use the first type
      const unusedTypes = roomTypes.filter(
        type => !selectedRooms.some(room => room.type === type)
      );
      
      const typeToAdd = unusedTypes.length > 0 ? unusedTypes[0] : roomTypes[0];
      
      setSelectedRooms([...selectedRooms, { type: typeToAdd, count: 1 }]);
    };
    
    // Remove a room type selection
    const removeRoomType = (index) => {
      const newRooms = [...selectedRooms];
      newRooms.splice(index, 1);
      setSelectedRooms(newRooms);
    };
    
    // Update a room selection
    const updateRoomSelection = (index, field, value) => {
      const newRooms = [...selectedRooms];
      newRooms[index][field] = value;
      setSelectedRooms(newRooms);
    };
    
    // Calculate total rooms and cost
    const totalRooms = selectedRooms.reduce((total, room) => total + room.count, 0);
    const totalCost = selectedRooms.reduce((total, room) => {
      const roomPrice = rooms.find(r => r.type === room.type)?.price || 100;
      return total + (room.count * roomPrice);
    }, 0) * Math.max(1, Math.floor((new Date(checkOutDate) - new Date(checkInDate)) / (1000 * 60 * 60 * 24)));
    
    // Check if we have any over-booking situations
    const hasOverbooking = selectedRooms.some(
      room => room.count > (availableRoomsByType[room.type] || 0)
    );
    
    const handleSubmit = async (e) => {
      e.preventDefault();
      
      // Check if there are enough rooms available
      if (hasOverbooking) {
        alert('Error: You have selected more rooms than are available for one or more room types.');
        return;
      }
      
      setIsProcessing(true);
      
      try {
        // Get available rooms for each type
        const roomBookings = [];
        
        // For each room type selected, get the available rooms
        for (const roomSelection of selectedRooms) {
          const availableRooms = rooms
            .filter(room => room.status === 'Available' && room.type === roomSelection.type)
            .slice(0, roomSelection.count);
          
          if (availableRooms.length < roomSelection.count) {
            throw new Error(`Not enough ${roomSelection.type} rooms available`);
          }
          
          // Add each room to our bookings
          for (const room of availableRooms) {
            roomBookings.push({
              room_id: room.id,
              room_type: room.type,
              price: room.price
            });
          }
        }
        
        // Create reservations for each room
        const reservationPromises = roomBookings.map(async (booking, index) => {
          // Create a unique guest name for each room (for tracking purposes)
          const roomNumber = index + 1;
          const guestName = `${groupName} - Room ${roomNumber}`;
          
          // Create the reservation in the database
          const { data, error } = await supabase
            .from('reservations')
            .insert({
              room_id: booking.room_id,
              guest_name: guestName,
              check_in_date: checkInDate,
              check_out_date: checkOutDate,
              status: 'Reserved',
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
              payment_status: 'Pending',
              payment_method: 'Credit Card',
              special_requests: `Part of group booking: ${groupName}`,
              room_type: booking.room_type,
              guest_email: contactEmail,
              guest_phone: contactPhone
            })
            .select();
            
          if (error) {
            throw new Error(`Error creating reservation: ${error.message}`);
          }
          
          return data;
        });
        
        // Wait for all reservations to be created
        await Promise.all(reservationPromises);
        
        // Refresh reservation data
        await refreshData();
        
        // Build a summary of the booking
        const roomSummary = selectedRooms
          .map(room => `${room.count} × ${room.type}`)
          .join(', ');
        
        // Show success message
        alert(`Group booking for ${groupName} created successfully!\n${roomSummary} rooms reserved from ${checkInDate} to ${checkOutDate}`);
        
        // Close the modal
        onClose();
        
      } catch (error) {
        console.error('Error creating group booking:', error);
        alert(`Error creating group booking: ${error.message}`);
      } finally {
        setIsProcessing(false);
      }
    };
    
    if (!isOpen) return null;
    
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className={`${isDarkMode ? 'bg-gray-800 text-white' : 'bg-white text-gray-800'} rounded-lg p-6 w-full max-w-3xl max-h-[90vh] overflow-y-auto`}>
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">Group Booking</h2>
            <button 
              onClick={onClose}
              className={`${isDarkMode ? 'text-gray-300 hover:text-white' : 'text-gray-600 hover:text-gray-800'} text-xl font-bold`}
            >
              ×
            </button>
          </div>
          
          <p className="mb-4">Create a group booking for multiple rooms with the same check-in and check-out dates.</p>
          
          <form onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label htmlFor="groupName" className="block text-sm font-medium mb-1">Group/Company Name</label>
                <input 
                  id="groupName"
                  type="text" 
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                  className={`w-full rounded border ${isDarkMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-300'} p-2`}
                  required
                  placeholder="Enter group or company name"
                />
              </div>
              
              <div>
                <label htmlFor="contactEmail" className="block text-sm font-medium mb-1">Contact Email</label>
                <input 
                  id="contactEmail"
                  type="email" 
                  value={contactEmail}
                  onChange={(e) => setContactEmail(e.target.value)}
                  className={`w-full rounded border ${isDarkMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-300'} p-2`}
                  placeholder="Contact email for the group"
                />
              </div>
              
              <div>
                <label htmlFor="contactPhone" className="block text-sm font-medium mb-1">Contact Phone</label>
                <input 
                  id="contactPhone"
                  type="tel" 
                  value={contactPhone}
                  onChange={(e) => setContactPhone(e.target.value)}
                  className={`w-full rounded border ${isDarkMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-300'} p-2`}
                  placeholder="Contact phone for the group"
                />
              </div>
              
              <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="checkInDate" className="block text-sm font-medium mb-1">Check-In Date</label>
                  <input 
                    id="checkInDate"
                    type="date" 
                    value={checkInDate}
                    onChange={(e) => setCheckInDate(e.target.value)}
                    className={`w-full rounded border ${isDarkMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-300'} p-2`}
                    required
                  />
                </div>
                
                <div>
                  <label htmlFor="checkOutDate" className="block text-sm font-medium mb-1">Check-Out Date</label>
                  <input 
                    id="checkOutDate"
                    type="date" 
                    value={checkOutDate}
                    min={checkInDate}
                    onChange={(e) => setCheckOutDate(e.target.value)}
                    className={`w-full rounded border ${isDarkMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-300'} p-2`}
                    required
                  />
                </div>
              </div>
            </div>
            
            <div className="mb-4">
              <div className="flex justify-between items-center mb-2">
                <h3 className="font-medium">Room Selection</h3>
                <button 
                  type="button" 
                  onClick={addRoomType}
                  disabled={selectedRooms.length >= roomTypes.length}
                  className={`px-2 py-1 rounded text-sm ${
                    selectedRooms.length >= roomTypes.length
                      ? isDarkMode ? 'bg-gray-700 text-gray-500' : 'bg-gray-200 text-gray-400'
                      : isDarkMode ? 'bg-blue-700 hover:bg-blue-600' : 'bg-blue-100 hover:bg-blue-200 text-blue-800'
                  }`}
                >
                  <i className="fas fa-plus mr-1"></i> Add Room Type
                </button>
              </div>
              
              {selectedRooms.map((roomSelection, index) => (
                <div 
                  key={index} 
                  className={`p-3 rounded-lg mb-2 ${isDarkMode ? 'bg-gray-700' : 'bg-gray-100'} flex flex-wrap items-center gap-3`}
                >
                  <div className="flex-1 min-w-[200px]">
                    <label className="block text-sm font-medium mb-1">Room Type</label>
                    <select 
                      value={roomSelection.type}
                      onChange={(e) => updateRoomSelection(index, 'type', e.target.value)}
                      className={`w-full rounded border ${isDarkMode ? 'bg-gray-800 border-gray-600' : 'bg-white border-gray-300'} p-2`}
                    >
                      {roomTypes.map(type => (
                        <option key={type} value={type}>{type}</option>
                      ))}
                    </select>
                  </div>
                  
                  <div className="flex-1 min-w-[150px]">
                    <label className="block text-sm font-medium mb-1">Number of Rooms</label>
                    <div className="flex items-center">
                      <input 
                        type="number" 
                        min="1"
                        value={roomSelection.count}
                        onChange={(e) => updateRoomSelection(index, 'count', parseInt(e.target.value))}
                        className={`w-full rounded-l border-y border-l ${isDarkMode ? 'bg-gray-800 border-gray-600' : 'bg-white border-gray-300'} p-2`}
                      />
                      <div className={`inline-flex border-y border-r rounded-r px-3 items-center ${isDarkMode ? 'bg-gray-600 border-gray-600' : 'bg-gray-50 border-gray-300'}`}>
                        <span className={`text-xs ${
                          roomSelection.count > (availableRoomsByType[roomSelection.type] || 0)
                          ? 'text-red-500 font-bold'
                          : isDarkMode ? 'text-gray-400' : 'text-gray-500'
                        }`}>
                          {availableRoomsByType[roomSelection.type] || 0} available
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  {selectedRooms.length > 1 && (
                    <button 
                      type="button"
                      onClick={() => removeRoomType(index)}
                      className={`p-2 rounded-full ${isDarkMode ? 'text-red-300 hover:bg-red-900' : 'text-red-500 hover:bg-red-100'}`}
                      title="Remove this room type"
                    >
                      <i className="fas fa-times"></i>
                    </button>
                  )}
                </div>
              ))}
            </div>
            
            <div className={`p-4 rounded mb-4 ${isDarkMode ? 'bg-gray-700' : 'bg-gray-100'}`}>
              <h3 className="font-medium mb-2">Summary</h3>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>Group Name:</div>
                <div className="font-medium">{groupName || '-'}</div>
                
                <div>Dates:</div>
                <div className="font-medium">{checkInDate} to {checkOutDate}</div>
                
                <div>Rooms:</div>
                <div className="font-medium">
                  {selectedRooms.map((room, i) => (
                    <div key={i} className={room.count > (availableRoomsByType[room.type] || 0) ? 'text-red-500' : ''}>
                      {room.count} × {room.type}
                    </div>
                  ))}
                  <div className="mt-1 border-t pt-1">Total: {totalRooms} rooms</div>
                </div>
                
                <div>Est. Total:</div>
                <div className="font-medium">
                  GH₵{totalCost.toFixed(2)}
                </div>
              </div>
              
              {hasOverbooking && (
                <div className="mt-3 text-red-500 text-sm border-t border-red-400 pt-2">
                  <i className="fas fa-exclamation-triangle mr-1"></i>
                  Warning: You've selected more rooms than are available for one or more room types.
                </div>
              )}
            </div>
            
            <div className="flex justify-end">
              <button 
                type="button"
                onClick={onClose}
                className={`mr-2 px-4 py-2 rounded ${isDarkMode ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-200 hover:bg-gray-300'}`}
              >
                Cancel
              </button>
              <button 
                type="submit"
                disabled={hasOverbooking || isProcessing}
                className={`px-4 py-2 rounded ${
                  hasOverbooking || isProcessing
                    ? isDarkMode ? 'bg-green-900 opacity-50' : 'bg-green-300 opacity-50'
                    : isDarkMode ? 'bg-green-600 hover:bg-green-700' : 'bg-green-500 hover:bg-green-600'
                } text-white flex items-center justify-center`}
              >
                {isProcessing ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Processing...
                  </>
                ) : (
                  'Create Group Booking'
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  };

  // Handle view reservation
  const handleViewReservation = (reservation) => {
    setSelectedReservation(reservation);
    setShowViewModal(true);
    
    // Log activity
    console.log(`Viewing reservation details for ${reservation.guestName}, Room: ${reservation.roomNumber}`);
  };
  
  // Handle edit reservation
  const handleEditReservation = (reservation) => {
    setSelectedReservation(reservation);
    setShowEditModal(true);
    
    // Log activity
    console.log(`Editing reservation for ${reservation.guestName}, Room: ${reservation.roomNumber}`);
  };
  
  // Handle update reservation
  const handleUpdateReservation = async (updatedReservation) => {
    try {
      // Call the context method to update reservation
      const result = await updateReservation(updatedReservation);
      
      if (result.success) {
        // Refresh the reservations list
        refreshData();
        return Promise.resolve();
      } else {
        return Promise.reject(new Error(result.error || 'Failed to update reservation'));
      }
    } catch (error) {
      console.error('Error updating reservation:', error);
      return Promise.reject(error);
    }
  };

  // Toast message component
  const Toast = ({ message, type, onClose }) => {
    return (
      <div className={`fixed bottom-4 right-4 px-4 py-3 rounded-lg shadow-lg z-50 
        ${type === 'success' ? 'bg-green-600' : 'bg-red-600'} text-white`}>
        <div className="flex items-center">
          <span className="mr-2">
            {type === 'success' ? 
              <i className="fas fa-check-circle"></i> : 
              <i className="fas fa-exclamation-circle"></i>}
          </span>
          <p>{message}</p>
          <button 
            onClick={onClose} 
            className="ml-4 text-white focus:outline-none"
          >
            <i className="fas fa-times"></i>
          </button>
        </div>
      </div>
    );
  };

  // Clear toast after delay
  useEffect(() => {
    if (toastMessage) {
      const timer = setTimeout(() => {
        setToastMessage(null);
      }, 5000);
      
      return () => clearTimeout(timer);
    }
  }, [toastMessage]);

  if (loading) {
    return (
      <div className="reservations-loader">
        <div className="loader-ring"></div>
        <span>Loading reservations data...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="reservations-error">
        <div className="error-container">
          <i className="fas fa-exclamation-triangle error-icon"></i>
          <h3>Error Loading Reservations</h3>
          <p>{error}</p>
          <button 
            className="retry-button"
            onClick={refreshData}
          >
            <i className="fas fa-sync-alt"></i> Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="reservations-list-wrapper">
      {/* Advanced Filter Panel */}
      <div className="filter-panel">
        <div className="search-container">
          <div className="search-input-group">
            <i className="fas fa-search search-icon"></i>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search guest or room..."
              className="search-input"
            />
            {searchTerm && (
              <button 
                onClick={() => setSearchTerm('')}
                className="clear-search"
              >
                <i className="fas fa-times"></i>
              </button>
            )}
          </div>
        </div>
        
        <div className="filter-options">
          <div className="status-filter">
            <button 
              className={`filter-btn ${statusFilter === 'active' ? 'active' : ''}`}
              onClick={() => setStatusFilter('active')}
            >
              <i className="fas fa-clock"></i>
              <span>Active</span>
            </button>
            
            <button 
              className={`filter-btn ${statusFilter === 'Confirmed' ? 'active' : ''}`}
              onClick={() => setStatusFilter('Confirmed')}
            >
              <i className="fas fa-check-circle"></i>
              <span>Confirmed</span>
            </button>
            
            <button 
              className={`filter-btn ${statusFilter === 'Reserved' ? 'active' : ''}`}
              onClick={() => setStatusFilter('Reserved')}
            >
              <i className="fas fa-calendar-check"></i>
              <span>Reserved</span>  
            </button>
            
            <button 
              className={`filter-btn ${statusFilter === 'Checked In' ? 'active' : ''}`}
              onClick={() => setStatusFilter('Checked In')}
            >
              <i className="fas fa-door-open"></i>
              <span>Checked In</span>
            </button>
            
            <button 
              className={`filter-btn ${statusFilter === 'Cancelled' ? 'active' : ''}`}
              onClick={() => setStatusFilter('Cancelled')}
            >
              <i className="fas fa-ban"></i>
              <span>Cancelled</span>
            </button>
            
            <button 
              className={`filter-btn ${statusFilter === 'all' ? 'active' : ''}`}
              onClick={() => setStatusFilter('all')}
            >
              <i className="fas fa-th-list"></i>
              <span>All</span>
            </button>
          </div>
          
          <div className="advanced-actions">
            <button 
              className="action-btn"
              onClick={() => refreshData()}
            >
              <i className="fas fa-sync-alt"></i>
              <span>Refresh</span>
            </button>
          </div>
        </div>
      </div>
      
      {/* Empty State */}
      {!loading && filteredReservations.length === 0 && (
        <div className="empty-reservations">
          <div className="empty-container">
            <i className="fas fa-calendar-times empty-icon"></i>
            <h3>No Reservations Found</h3>
            <p>
              {searchTerm 
                ? `No reservations match "${searchTerm}"`
                : statusFilter === 'all' 
                  ? "There are no reservations in the system"
                  : `No ${statusFilter.toLowerCase()} reservations found`
              }
            </p>
            {(searchTerm || statusFilter !== 'all') && (
              <button 
                className="clear-filters-btn"
                onClick={() => {
                  setSearchTerm('');
                  setStatusFilter('all');
                }}
              >
                <i className="fas fa-filter-circle-xmark"></i>
                Clear Filters
              </button>
            )}
          </div>
        </div>
      )}
      
      {/* Reservations Cards */}
      {!loading && filteredReservations.length > 0 && (
        <div className="reservations-grid">
          {filteredReservations.map((reservation) => (
            <div 
              key={reservation.id} 
              className={`reservation-card ${animatedItems[reservation.id] ? 'animated' : ''}`}
              onClick={() => handleViewReservation(reservation)}
            >
              <div className="card-status-indicator" data-status={reservation.status?.toLowerCase()}></div>
              
              <div className="card-header">
                <div className="guest-info">
                  <h3 className="guest-name">{reservation.guest_name}</h3>
                  <div className="reservation-id">#{reservation.id}</div>
                </div>
                
                <div className={getStatusBadgeClass(reservation.status)}>
                  {reservation.status}
                </div>
              </div>
              
              <div className="card-body">
                <div className="info-row">
                  <div className="info-label">
                    <i className="fas fa-bed"></i>
                    Room
                  </div>
                  <div className="info-value">
                    <span className="room-number">{reservation.room_name || `Room ${reservation.room_number}`}</span>
                    <span className="room-type">{reservation.room_type}</span>
                  </div>
                </div>
                
                <div className="info-row">
                  <div className="info-label">
                    <i className="fas fa-calendar-alt"></i>
                    Dates
                  </div>
                  <div className="info-value dates">
                    <div className="check-in">
                      <span className="date-label">Check-in</span>
                      <span className="date-value">{formatDate(reservation.check_in_date)}</span>
                    </div>
                    <div className="divider"></div>
                    <div className="check-out">
                      <span className="date-label">Check-out</span>
                      <span className="date-value">{formatDate(reservation.check_out_date)}</span>
                    </div>
                  </div>
                </div>
                
                <div className="info-row">
                  <div className="info-label">
                    <i className="fas fa-credit-card"></i>
                    Payment
                  </div>
                  <div className="info-value payment">
                    <span className={getPaymentStatusBadgeClass(reservation.payment_status)}>
                      {reservation.payment_status}
                    </span>
                    <span className="payment-method">{reservation.payment_method}</span>
                  </div>
                </div>
              </div>
              
              <div className="card-actions">
                {reservation.status === 'Reserved' || reservation.status === 'Confirmed' ? (
                  <button 
                    className="action-button check-in"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleCheckIn(reservation);
                    }}
                  >
                    <i className="fas fa-check-circle"></i>
                    Check In
                  </button>
                ) : null}
                
                <button 
                  className="action-button edit"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleEditReservation(reservation);
                  }}
                >
                  <i className="fas fa-edit"></i>
                  Edit
                </button>
                
                <button 
                  className="action-button cancel"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleCancelReservation(reservation.id);
                  }}
                >
                  <i className="fas fa-times-circle"></i>
                  Cancel
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
      
      {/* Modals */}
      <RoomAvailabilityModal 
        isOpen={showRoomAvailabilityModal}
        onClose={() => setShowRoomAvailabilityModal(false)}
        rooms={rooms}
        isDarkMode={isDarkMode}
      />
      
      <CancellationModal 
        isOpen={showCancellationModal}
        onClose={() => setShowCancellationModal(false)}
        reservations={reservations}
        onCancelReservation={handleCancelReservation}
        isDarkMode={isDarkMode}
      />
      
      <GroupBookingModal 
        isOpen={showGroupBookingModal}
        onClose={() => setShowGroupBookingModal(false)}
        rooms={rooms}
        isDarkMode={isDarkMode}
      />
      
      <ReservationViewModal
        isOpen={showViewModal}
        onClose={() => setShowViewModal(false)}
        reservation={selectedReservation}
      />
      
      <ReservationEditModal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        reservation={selectedReservation}
        onUpdate={handleUpdateReservation}
        rooms={rooms}
      />
      
      {/* Toast Message */}
      {toastMessage && (
        <Toast
          message={toastMessage.text}
          type={toastMessage.type}
          onClose={() => setToastMessage(null)}
        />
      )}
    </div>
  );
};

export default ReservationsList;
