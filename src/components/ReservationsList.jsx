import React, { useState, useEffect } from 'react';
import { useRoomReservation } from '../context/RoomReservationContext';
import { format } from 'date-fns';
import { useTheme } from '../context/ThemeContext';
import { useGuests } from '../context/GuestContext';
import Sidebar from './Sidebar';
import Navbar from './Navbar';
import supabase from '../supabaseClient';
import ReservationViewModal from './ReservationViewModal';
import ReservationEditModal from './ReservationEditModal';

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
  }, [reservations, statusFilter, searchTerm, rooms]);

  const handleCancelReservation = async (id) => {
    if (window.confirm('Are you sure you want to cancel this reservation?')) {
      const result = await cancelReservation(id);
      if (result.success) {
        alert('Reservation cancelled successfully');
      } else {
        alert(`Error cancelling reservation: ${result.error}`);
      }
    }
  };

  const handleCheckIn = async (reservation) => {
    if (window.confirm(`Check in ${reservation.guest_name}?`)) {
      try {
        // Check if the room exists and is available
        const room = rooms.find(r => r.id === reservation.room_id);
        if (!room) {
          alert(`Error: Room ${reservation.room_id} not found.`);
          return;
        }
        
        if (room.status === 'Occupied') {
          alert(`Error: Room ${reservation.room_id} is already occupied.`);
          return;
        }
        
        if (room.status === 'Maintenance') {
          alert(`Error: Room ${reservation.room_id} is under maintenance.`);
          return;
        }
        
        // First convert reservation data to guest data format
        const guestData = {
          name: reservation.guest_name,
          firstName: reservation.guest_name.split(' ')[0],
          lastName: reservation.guest_name.split(' ').slice(1).join(' '),
          email: reservation.guest_email || '',
          phone: reservation.guest_phone || '',
          room: reservation.room_id.toString(),
          checkIn: new Date(reservation.check_in_date),
          checkOut: new Date(reservation.check_out_date),
          status: 'Checked In',
          nationality: 'Ghana', // Default values
          address: reservation.special_requests || '',
          gender: '', // Default empty values for required fields
          region: 'Greater Accra',
          dateOfBirth: new Date('1990-01-01') // Default date
        };

        // Add the guest to the guest list
        console.log('Adding guest from reservation:', guestData);
        await addGuestToList(guestData);
        
        // Update room status to Occupied
        const roomResult = await checkInGuest(reservation.room_id, {
          name: reservation.guest_name,
          email: reservation.guest_email,
          phone: reservation.guest_phone
        });
        
        if (roomResult.success) {
          // Update the reservation status to 'Checked In'
          // This would normally be handled by checkInGuest, but we ensure it's updated
          const { data, error } = await supabase
            .from('reservations')
            .update({ status: 'Checked In' })
            .eq('id', reservation.id);
            
          if (error) {
            console.error('Error updating reservation status:', error);
          }
          
          // Remove the checked-in reservation from the filtered list if using the 'active' filter
          if (statusFilter === 'active') {
            setFilteredReservations(prev => 
              prev.filter(res => res.id !== reservation.id)
            );
          } else {
            // Otherwise just update its status
            setFilteredReservations(prev => 
              prev.map(res => 
                res.id === reservation.id 
                  ? {...res, status: 'Checked In'} 
                  : res
              )
            );
          }
          
          alert('Guest checked in successfully and moved to Guest Directory!');
        } else {
          alert(`Error updating room status: ${roomResult.error}`);
        }
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
        // If the date is a simple date string with just the date part
        if (dateString.length <= 10) {
          date = new Date(`${dateString}T00:00:00`);
        } else {
          date = new Date(dateString);
        }
      } else {
        date = new Date(dateString);
      }
      
      if (isNaN(date.getTime())) {
        throw new Error('Invalid date');
      }
      
      return format(date, 'MMM dd, yyyy');
    } catch (error) {
      console.error('Date formatting error:', error, dateString);
      return 'Invalid date';
    }
  };

  const getStatusBadgeClass = (status) => {
    switch (status) {
      case 'Reserved':
      case 'Confirmed':
        return isDarkMode 
          ? 'bg-blue-900 text-blue-200' 
          : 'bg-blue-100 text-blue-800';
      case 'Checked In':
        return isDarkMode 
          ? 'bg-green-900 text-green-200' 
          : 'bg-green-100 text-green-800';
      case 'Checked Out':
        return isDarkMode 
          ? 'bg-gray-700 text-gray-300' 
          : 'bg-gray-200 text-gray-800';
      case 'Cancelled':
        return isDarkMode 
          ? 'bg-red-900 text-red-200' 
          : 'bg-red-100 text-red-800';
      default:
        return isDarkMode 
          ? 'bg-gray-700 text-gray-300' 
          : 'bg-gray-200 text-gray-800';
    }
  };

  const getPaymentStatusBadgeClass = (status) => {
    switch (status) {
      case 'Paid':
        return isDarkMode 
          ? 'bg-green-900 text-green-200' 
          : 'bg-green-100 text-green-800';
      case 'Pending':
        return isDarkMode 
          ? 'bg-yellow-900 text-yellow-200' 
          : 'bg-yellow-100 text-yellow-800';
      case 'Refunded':
        return isDarkMode 
          ? 'bg-purple-900 text-purple-200' 
          : 'bg-purple-100 text-purple-800';
      default:
        return isDarkMode 
          ? 'bg-gray-700 text-gray-300' 
          : 'bg-gray-200 text-gray-800';
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
                  <h3 className="font-semibold text-lg">Room {room.room_number || room.id}</h3>
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
                          Room {res.room_id} - {res.guest_name} ({formatDate(res.check_in_date)})
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
                        Room {res.room_id} • {formatDate(res.check_in_date)} to {formatDate(res.check_out_date)}
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
                <label className="block text-sm font-medium mb-1">Group/Company Name</label>
                <input 
                  type="text" 
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                  className={`w-full rounded border ${isDarkMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-300'} p-2`}
                  required
                  placeholder="Enter group or company name"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">Contact Email</label>
                <input 
                  type="email" 
                  value={contactEmail}
                  onChange={(e) => setContactEmail(e.target.value)}
                  className={`w-full rounded border ${isDarkMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-300'} p-2`}
                  placeholder="Contact email for the group"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">Contact Phone</label>
                <input 
                  type="tel" 
                  value={contactPhone}
                  onChange={(e) => setContactPhone(e.target.value)}
                  className={`w-full rounded border ${isDarkMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-300'} p-2`}
                  placeholder="Contact phone for the group"
                />
              </div>
              
              <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Check-In Date</label>
                  <input 
                    type="date" 
                    value={checkInDate}
                    onChange={(e) => setCheckInDate(e.target.value)}
                    className={`w-full rounded border ${isDarkMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-300'} p-2`}
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-1">Check-Out Date</label>
                  <input 
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

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
        <strong className="font-bold">Error!</strong>
        <span className="block sm:inline"> {error}</span>
      </div>
    );
  }

  return (
    <div className={`flex gap-6`}>
      {/* Current Reservations Container (Main Content) */}
      <div className={`flex-1 p-4 ${isDarkMode ? 'bg-gray-800 text-white' : 'bg-white text-gray-800'} rounded-lg shadow`}>
        <div className="mb-4">
          <h2 className="text-2xl font-semibold">Current Reservations</h2>
        </div>
        <p className={`mb-4 text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
          Showing active reservations that haven't been checked in yet. Use the filter to view different statuses.
        </p>
        
        {/* Filters */}
        <div className="flex flex-col md:flex-row justify-between mb-6 gap-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div>
              <label htmlFor="statusFilter" className="block text-sm font-medium mb-1">Status</label>
              <select
                id="statusFilter"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className={`rounded-md border ${isDarkMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-300'} p-2 w-full md:w-40`}
              >
                <option value="active">Active Reservations</option>
                <option value="all">All Statuses</option>
                <option value="Reserved">Reserved</option>
                <option value="Confirmed">Confirmed</option>
                <option value="Checked In">Checked In</option>
                <option value="Checked Out">Checked Out</option>
                <option value="Cancelled">Cancelled</option>
              </select>
            </div>
          </div>
          
          <div className="w-full md:w-1/3">
            <label htmlFor="searchTerm" className="block text-sm font-medium mb-1">Search</label>
            <div className="relative">
              <input
                id="searchTerm"
                type="text"
                placeholder="Search by guest name or room number"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className={`rounded-md border ${isDarkMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-300'} p-2 pl-8 w-full`}
              />
              <i className={`fas fa-search absolute left-3 top-1/2 transform -translate-y-1/2 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}></i>
            </div>
          </div>
        </div>
        
        {/* Reservations List */}
        {filteredReservations.length === 0 ? (
          <div className={`text-center py-8 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
            <p className="text-xl">No reservations found</p>
            <p className="mt-2">Try adjusting your filters or create a new reservation</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className={`min-w-full ${isDarkMode ? 'text-gray-200' : 'text-gray-700'}`}>
              <thead className={isDarkMode ? 'bg-gray-700' : 'bg-gray-100'}>
                <tr>
                  <th className="px-4 py-3 text-left">Room Number</th>
                  <th className="px-4 py-3 text-left">Guest Name</th>
                  <th className="px-4 py-3 text-left">Check-In</th>
                  <th className="px-4 py-3 text-left">Check-Out</th>
                  <th className="px-4 py-3 text-left">Payment</th>
                  <th className="px-4 py-3 text-left">Status</th>
                  <th className="px-4 py-3 text-left">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredReservations.map((reservation) => (
                  <tr 
                    key={reservation.id} 
                    className={isDarkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-50'}
                  >
                    <td className="px-4 py-3">
                      <div className="font-medium">Room {reservation.room_number || reservation.room_id}</div>
                      <div className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>{reservation.room_type}</div>
                    </td>
                    
                    <td className="px-4 py-3">
                      <div className="font-medium">{reservation.guest_name}</div>
                      {reservation.guest_email && (
                        <div className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>{reservation.guest_email}</div>
                      )}
                    </td>
                    
                    <td className="px-4 py-3">{formatDate(reservation.check_in_date)}</td>
                    <td className="px-4 py-3">{formatDate(reservation.check_out_date)}</td>
                    
                    <td className="px-4 py-3">
                      <div className="font-medium">{reservation.payment_method || 'Not specified'}</div>
                      <div className="mt-1">
                        <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getPaymentStatusBadgeClass(reservation.payment_status || 'Pending')}`}>
                          {reservation.payment_status || 'Pending'}
                        </span>
                      </div>
                    </td>
                    
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusBadgeClass(reservation.status)}`}>
                        {reservation.status}
                      </span>
                    </td>
                    
                    <td className={`border-t ${isDarkMode ? 'border-gray-700' : 'border-gray-200'} px-4 py-3`}>
                      <div className="flex justify-center space-x-1">
                        {(reservation.status === 'Confirmed' || reservation.status === 'Reserved') && (
                          <button
                            onClick={() => handleCheckIn(reservation)}
                            className="text-blue-400 hover:text-blue-600 p-1 rounded-full hover:bg-blue-100 dark:hover:bg-blue-900"
                            title="Check In"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                          </button>
                        )}
                        {reservation.status === 'Checked In' && (
                          <button
                            onClick={() => handleCheckOut(reservation)}
                            className="text-green-400 hover:text-green-600 p-1 rounded-full hover:bg-green-100 dark:hover:bg-green-900"
                            title="Check Out"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                            </svg>
                          </button>
                        )}
                        <button
                          onClick={() => handleViewReservation(reservation)}
                          className="text-indigo-400 hover:text-indigo-600 p-1 rounded-full hover:bg-indigo-100 dark:hover:bg-indigo-900"
                          title="View Details"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => handleEditReservation(reservation)}
                          className="text-yellow-400 hover:text-yellow-600 p-1 rounded-full hover:bg-yellow-100 dark:hover:bg-yellow-900"
                          title="Edit"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                        {(reservation.status === 'Confirmed' || reservation.status === 'Reserved') && (
                          <button
                            onClick={() => handleCancelReservation(reservation.id)}
                            className="text-red-400 hover:text-red-600 p-1 rounded-full hover:bg-red-100 dark:hover:bg-red-900"
                            title="Cancel"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      
      {/* Quick Actions Container (Right Sidebar) */}
      <div className="w-80 flex flex-col gap-4">
        {/* Main Quick Actions Card */}
        <div className={`p-5 ${isDarkMode ? 'bg-gray-800 text-white' : 'bg-white text-gray-800'} rounded-lg shadow`}>
          <div className="flex items-center mb-5">
            <div className={`p-2 rounded-lg ${isDarkMode ? 'bg-blue-900' : 'bg-blue-100'} mr-3`}>
              <i className={`fas fa-bolt text-lg ${isDarkMode ? 'text-blue-300' : 'text-blue-600'}`}></i>
            </div>
            <h2 className="text-xl font-semibold">Quick Actions</h2>
          </div>
          
          <div className="flex flex-col gap-3">
            <div 
              className={`p-4 rounded-lg border transition-all duration-200 ${isDarkMode ? 'bg-gray-700 border-gray-600 hover:bg-gray-650' : 'bg-gray-50 border-gray-200 hover:bg-gray-100'} hover:shadow-md transform hover:-translate-y-1 cursor-pointer`}
              onClick={() => setShowRoomAvailabilityModal(true)}
            >
              <div className="flex items-center">
                <div className={`p-3 rounded-full mr-3 ${isDarkMode ? 'bg-blue-900' : 'bg-blue-100'}`}>
                  <i className={`fas fa-door-open ${isDarkMode ? 'text-blue-300' : 'text-blue-600'}`}></i>
                </div>
                <div>
                  <h4 className="font-medium">Check Room Availability</h4>
                  <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>View available rooms and rates</p>
                </div>
              </div>
            </div>
            
            <div 
              className={`p-4 rounded-lg border transition-all duration-200 ${isDarkMode ? 'bg-gray-700 border-gray-600 hover:bg-gray-650' : 'bg-gray-50 border-gray-200 hover:bg-gray-100'} hover:shadow-md transform hover:-translate-y-1 cursor-pointer`}
              onClick={() => setShowCancellationModal(true)}
            >
              <div className="flex items-center">
                <div className={`p-3 rounded-full mr-3 ${isDarkMode ? 'bg-red-900' : 'bg-red-100'}`}>
                  <i className={`fas fa-ban ${isDarkMode ? 'text-red-300' : 'text-red-600'}`}></i>
                </div>
                <div>
                  <h4 className="font-medium">Manage Cancellations</h4>
                  <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Process refunds and updates</p>
                </div>
              </div>
            </div>
            
            <div 
              className={`p-4 rounded-lg border transition-all duration-200 ${isDarkMode ? 'bg-gray-700 border-gray-600 hover:bg-gray-650' : 'bg-gray-50 border-gray-200 hover:bg-gray-100'} hover:shadow-md transform hover:-translate-y-1 cursor-pointer`}
              onClick={() => setShowGroupBookingModal(true)}
            >
              <div className="flex items-center">
                <div className={`p-3 rounded-full mr-3 ${isDarkMode ? 'bg-green-900' : 'bg-green-100'}`}>
                  <i className={`fas fa-users ${isDarkMode ? 'text-green-300' : 'text-green-600'}`}></i>
                </div>
                <div>
                  <h4 className="font-medium">Group Bookings</h4>
                  <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Handle multiple room reservations</p>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Stats Card */}
        <div className={`p-5 ${isDarkMode ? 'bg-gray-800 text-white' : 'bg-white text-gray-800'} rounded-lg shadow`}>
          <h3 className="text-lg font-semibold mb-4">Reservation Stats</h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className={`${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>Today's Check-ins</span>
              <span className="font-bold">
                {reservations.filter(r => 
                  r.status === 'Confirmed' && 
                  new Date(r.check_in_date).toDateString() === new Date().toDateString()
                ).length}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className={`${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>Pending Confirmations</span>
              <span className="font-bold">
                {reservations.filter(r => r.status === 'Reserved').length}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className={`${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>Recent Cancellations</span>
              <span className="font-bold">
                {reservations.filter(r => r.status === 'Cancelled').length}
              </span>
            </div>
          </div>
        </div>
      </div>
      
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
        onUpdateReservation={handleUpdateReservation}
      />
    </div>
  );
};

export default ReservationsList;
