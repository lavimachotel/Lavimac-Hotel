import React, { useState, useEffect } from 'react';
import Sidebar from './Sidebar';
import Navbar from './Navbar';
import CheckInModal from './CheckInModal';
import GuestViewModal from './GuestViewModal';
import GuestEditModal from './GuestEditModal';
import DeleteConfirmationModal from './DeleteConfirmationModal';
import { useGuests } from '../context/GuestContext';
import { useTheme } from '../context/ThemeContext';
import { format, formatDistance } from 'date-fns';
import { FaEye, FaEdit, FaTrash, FaSignOutAlt, FaSearch, FaUserPlus, FaUserCheck, FaUserClock } from 'react-icons/fa';
import { useRoomReservation } from '../context/RoomReservationContext';
import { toast } from 'react-hot-toast';
import Card from './ui/Card';

const GuestsPage = () => {
    const { guestList, addGuestToList, viewGuest, editGuest, deleteGuest } = useGuests();
    const { theme } = useTheme();
    const isDarkMode = theme === 'dark';
    const { updateRoomStatus, getRooms, getReservations } = useRoomReservation();
    const [isCheckInModalOpen, setIsCheckInModalOpen] = useState(false);
    const [isViewModalOpen, setIsViewModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [selectedGuest, setSelectedGuest] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [recentActivities, setRecentActivities] = useState([]);

    // Notification function to update dashboard
    const addDashboardNotification = (notification) => {
        try {
            console.log('Notification:', notification);
            
            // Also dispatch occupancy update event to refresh room status displays
            const rooms = getRooms();
            if (rooms) {
                const occupancyEvent = new CustomEvent('hotelOccupancyUpdate', {
                  detail: { rooms: rooms }
                });
                document.dispatchEvent(occupancyEvent);
            }
        } catch (err) {
            console.error('Error adding dashboard notification:', err);
        }
    };

    // Initialize recent activities
    useEffect(() => {
        setRecentActivities([]);
    }, []);

    // Add a new activity - can be called from UI actions
    const addActivity = (activity) => {
        try {
            const newActivity = {
                text: activity,
                timestamp: new Date().toISOString()
            };
            
            // Update state
            setRecentActivities(prev => [newActivity, ...prev].slice(0, 20));
            
            // Also add to dashboard notifications for important activities
            if (activity.includes('checked in') || activity.includes('checked out')) {
                addDashboardNotification({
                    type: 'guest_update',
                    title: 'Guest Update',
                    message: activity,
                    time: new Date().toISOString()
                });
            }
        } catch (err) {
            console.error('Error adding activity:', err);
        }
    };

    // Original addGuestToList wrapper to add notifications and updates
    const handleAddGuest = (guestData) => {
        const addedGuest = addGuestToList(guestData);
        
        // Add notification to dashboard
        if (addedGuest) {
            // Add to activities
            addActivity(`New guest ${guestData.name} added${guestData.room_name ? ` to ${guestData.room_name}` : ''}`);
            
            // Add dashboard notification
            addDashboardNotification({
                type: 'new_guest',
                title: 'New Guest',
                message: `${guestData.name} has been added${guestData.room_name ? ` to ${guestData.room_name}` : ''}.`,
                time: new Date().toISOString()
            });
            
            // Update room status if room is assigned
            if (guestData.room) {
                updateRoomStatus(guestData.room, 'Occupied');
                
                // Show toast notification
                toast.success(`Guest ${guestData.name} added to ${guestData.room_name || ''}`);
            }
            
            // Trigger an event to update room status grid on dashboard
            const rooms = getRooms();
            if (rooms) {
                const occupancyEvent = new CustomEvent('hotelOccupancyUpdate', {
                  detail: { rooms: rooms }
                });
                document.dispatchEvent(occupancyEvent);
            }
        }
        
        return addedGuest;
    };

    // Override the original editGuest function to add notifications
    const handleEditGuest = (guestId) => {
        const guest = guestList.find(g => g.id === guestId);
        setSelectedGuest(guest);
        setIsEditModalOpen(true);
    };
    
    // Function to handle edit submission from the modal
    const handleEditSubmit = (guestId, updatedData) => {
        const originalGuest = guestList.find(g => g.id === guestId);
        const updatedGuest = editGuest(guestId, updatedData);
        
        // Check if room has changed
        if (originalGuest && updatedGuest && originalGuest.room !== updatedGuest.room) {
            // If the original room exists, mark it as available
            if (originalGuest.room) {
                updateRoomStatus(originalGuest.room, 'Available');
            }
            
            // If new room exists, mark it as occupied
            if (updatedGuest.room) {
                updateRoomStatus(updatedGuest.room, 'Occupied');
            }
            
            // Add activity
            addActivity(`Guest ${updatedGuest.name} moved from ${originalGuest.room_name || 'None'} to ${updatedGuest.room_name || 'None'}`);
        } else {
            // Regular guest information update
            addActivity(`Updated guest information for ${updatedGuest.name}`);
        }
        
        // Add dashboard notification
        addDashboardNotification({
            type: 'guest_update',
            title: 'Guest Updated',
            message: `${updatedGuest.name}'s information has been updated.`,
            time: new Date().toISOString()
        });
        
        // Trigger an event to update room status grid on dashboard
        const rooms = getRooms();
        if (rooms) {
            const occupancyEvent = new CustomEvent('hotelOccupancyUpdate', {
                detail: { rooms: rooms }
            });
            document.dispatchEvent(occupancyEvent);
        }
        
        setIsEditModalOpen(false);
        setSelectedGuest(null);
    };

    const handleViewGuest = (guestId) => {
        const guest = guestList.find(g => g.id === guestId);
        setSelectedGuest(guest);
        setIsViewModalOpen(true);
        
        // Add to activity log
        if (guest) {
            addActivity(`Viewed guest details for ${guest.name}`);
        }
    };

    const handleDeleteGuest = (guestId) => {
        const guest = guestList.find(g => g.id === guestId);
        setSelectedGuest(guest);
        setIsDeleteModalOpen(true);
    };

    const confirmDeleteGuest = () => {
        if (selectedGuest) {
            // If guest had a room, update room status to Available
            if (selectedGuest.room) {
                updateRoomStatus(selectedGuest.room, 'Available');
            }
            
            // Delete the guest
            deleteGuest(selectedGuest.id);
            
            // Add activity
            addActivity(`Removed guest ${selectedGuest.name} from system`);
            
            // Add dashboard notification
            addDashboardNotification({
                type: 'guest_removed',
                title: 'Guest Removed',
                message: `${selectedGuest.name} has been removed from the system.`,
                time: new Date().toISOString()
            });
            
            // Trigger an event to update room status grid on dashboard
            const rooms = getRooms();
            if (rooms) {
                const occupancyEvent = new CustomEvent('hotelOccupancyUpdate', {
                    detail: { rooms: rooms }
                });
                document.dispatchEvent(occupancyEvent);
            }
            
            setIsDeleteModalOpen(false);
            setSelectedGuest(null);
        }
    };

    const handleCheckIn = (guestId) => {
        const guest = guestList.find(g => g.id === guestId);
        if (guest) {
            // Update guest status to Checked In
            const updatedData = { status: 'Checked In' };
            editGuest(guestId, updatedData);
            
            // Update room status to Occupied
            if (guest.room) {
                updateRoomStatus(guest.room, 'Occupied');
            }
            
            addActivity(`${guest.name} checked into ${guest.room_name}`);
            
            // Add dashboard notification
            addDashboardNotification({
                type: 'guest_checkin',
                title: 'Guest Check-in',
                message: `${guest.name} has checked into ${guest.room_name}.`,
                time: new Date().toISOString()
            });
            
            // Trigger an event to update room status grid on dashboard
            const rooms = getRooms();
            if (rooms) {
                const occupancyEvent = new CustomEvent('hotelOccupancyUpdate', {
                    detail: { rooms: rooms }
                });
                document.dispatchEvent(occupancyEvent);
            }
            
            setIsCheckInModalOpen(false);
        }
    };

    const handleCheckOut = (guestId) => {
        const guest = guestList.find(g => g.id === guestId);
        if (guest) {
            // Update guest status to Checked Out
            const updatedData = { status: 'Checked Out' };
            editGuest(guestId, updatedData);
            
            // Update room status to Available in RoomReservationContext
            if (guest.room) {
                updateRoomStatus(guest.room, 'Available');
            }
            
            addActivity(`${guest.name} checked out from ${guest.room_name}`);
            
            // Add dashboard notification
            addDashboardNotification({
                type: 'guest_checkout',
                title: 'Guest Check-out',
                message: `${guest.name} has checked out from ${guest.room_name}.`,
                time: new Date().toISOString()
            });
            
            // Trigger an event to update room status grid on dashboard
            const rooms = getRooms();
            if (rooms) {
                const occupancyEvent = new CustomEvent('hotelOccupancyUpdate', {
                    detail: { rooms: rooms }
                });
                document.dispatchEvent(occupancyEvent);
            }
        }
    };

    const filteredGuests = guestList ? guestList.filter(guest => 
        guest.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (guest.email && guest.email.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (guest.phone && guest.phone.includes(searchTerm))
    ) : [];

    // Helper function to format dates
    const formatDate = (date) => {
        if (!date) return '-';
        
        try {
            // Handle different date formats
            let dateObj;
            
            if (date instanceof Date) {
                dateObj = date;
            } else if (typeof date === 'string') {
                // Try to parse the date string
                dateObj = new Date(date);
            } else {
                return '-';
            }
            
            // Check if date is valid
            if (isNaN(dateObj.getTime())) {
                console.warn('Invalid date format:', date);
                return '-';
            }
            
            // Return formatted date
            return dateObj.toLocaleDateString('en-GB', {
                year: 'numeric',
                month: 'short',
                day: 'numeric'
            });
        } catch (error) {
            console.error('Error formatting date:', error, date);
            return '-';
        }
    };

    // Helper function to format relative time (e.g., "2 hours ago")
    const formatRelativeTime = (timestamp) => {
        if (!timestamp) return '';
        
        try {
            const date = new Date(timestamp);
            return formatDistance(date, new Date(), { addSuffix: true });
        } catch (err) {
            console.error('Error formatting relative time:', err);
            return '';
        }
    };

    return (
        <div className={`flex h-screen ${isDarkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
            <Sidebar activeLink="Guests" />
            <div className="flex-1 overflow-auto">
                <Navbar title="Guest Management" />
                
                <div className="p-6 space-y-6">
                    {/* Stats cards */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <Card 
                            className="text-center overflow-hidden relative"
                        >
                            <div className={`absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 to-indigo-600`}></div>
                            <div className="flex items-center justify-center">
                                <div className={`flex items-center justify-center w-12 h-12 rounded-full ${isDarkMode ? 'bg-blue-900/30' : 'bg-blue-100'} mb-3`}>
                                    <FaUserCheck className={`${isDarkMode ? 'text-blue-400' : 'text-blue-600'} text-xl`} />
                                </div>
                            </div>
                            <p className={`text-3xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>{filteredGuests.length}</p>
                            <p className={`text-xs uppercase tracking-wider ${isDarkMode ? 'text-gray-400' : 'text-gray-500'} mt-1`}>Total Guests</p>
                        </Card>
                        
                        <Card 
                            className="text-center overflow-hidden relative"
                        >
                            <div className={`absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-green-500 to-emerald-600`}></div>
                            <div className="flex items-center justify-center">
                                <div className={`flex items-center justify-center w-12 h-12 rounded-full ${isDarkMode ? 'bg-green-900/30' : 'bg-green-100'} mb-3`}>
                                    <FaUserCheck className={`${isDarkMode ? 'text-green-400' : 'text-green-600'} text-xl`} />
                                </div>
                            </div>
                            <p className={`text-3xl font-bold ${isDarkMode ? 'text-green-400' : 'text-green-600'}`}>
                                {filteredGuests.filter(guest => guest.status === 'Checked In').length}
                            </p>
                            <p className={`text-xs uppercase tracking-wider ${isDarkMode ? 'text-gray-400' : 'text-gray-500'} mt-1`}>Checked In</p>
                        </Card>
                        
                        <Card 
                            className="text-center overflow-hidden relative"
                        >
                            <div className={`absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-red-500 to-pink-600`}></div>
                            <div className="flex items-center justify-center">
                                <div className={`flex items-center justify-center w-12 h-12 rounded-full ${isDarkMode ? 'bg-red-900/30' : 'bg-red-100'} mb-3`}>
                                    <FaSignOutAlt className={`${isDarkMode ? 'text-red-400' : 'text-red-600'} text-xl`} />
                                </div>
                            </div>
                            <p className={`text-3xl font-bold ${isDarkMode ? 'text-red-400' : 'text-red-600'}`}>
                                {filteredGuests.filter(guest => guest.status === 'Checked Out').length}
                            </p>
                            <p className={`text-xs uppercase tracking-wider ${isDarkMode ? 'text-gray-400' : 'text-gray-500'} mt-1`}>Checked Out</p>
                        </Card>
                        
                        <Card 
                            className="text-center overflow-hidden relative"
                        >
                            <div className={`absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-amber-500 to-yellow-600`}></div>
                            <div className="flex items-center justify-center">
                                <div className={`flex items-center justify-center w-12 h-12 rounded-full ${isDarkMode ? 'bg-amber-900/30' : 'bg-amber-100'} mb-3`}>
                                    <FaUserClock className={`${isDarkMode ? 'text-amber-400' : 'text-amber-600'} text-xl`} />
                                </div>
                            </div>
                            <p className={`text-3xl font-bold ${isDarkMode ? 'text-amber-400' : 'text-amber-600'}`}>
                                {filteredGuests.filter(guest => guest.status === 'Reserved').length}
                            </p>
                            <p className={`text-xs uppercase tracking-wider ${isDarkMode ? 'text-gray-400' : 'text-gray-500'} mt-1`}>Reserved</p>
                        </Card>
                    </div>

                    {/* Guest Directory */}
                    <Card title="Guest Directory" className="overflow-hidden">
                        <div className="flex justify-between items-center mb-6 px-6 pt-2">
                            <div className={`relative flex-1 max-w-md px-3 py-2 rounded-full ${isDarkMode ? 'bg-gray-800/70 text-gray-300 border-gray-700/50' : 'bg-gray-100/80 text-gray-600 border-gray-200/50'} border flex items-center`}>
                                <FaSearch className="text-gray-400 mr-2" />
                                        <input 
                                            type="text" 
                                    placeholder="Search by name, email or phone..." 
                                    className={`bg-transparent border-none outline-none w-full text-sm ${isDarkMode ? 'placeholder-gray-500' : 'placeholder-gray-400'}`}
                                            value={searchTerm}
                                            onChange={(e) => setSearchTerm(e.target.value)}
                                        />
                                        {searchTerm && (
                                            <button 
                                        className={`ml-2 ${isDarkMode ? 'text-gray-400 hover:text-white' : 'text-gray-500 hover:text-gray-700'}`}
                                                onClick={() => setSearchTerm('')}
                                            >
                                                ×
                                            </button>
                                        )}
                                    </div>
                                    <button 
                                className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-4 py-2 rounded-lg shadow-md hover:shadow-lg transform hover:scale-105 transition-all duration-200 ml-4 flex items-center"
                                        onClick={() => setIsCheckInModalOpen(true)}
                                    >
                                <FaUserPlus className="mr-2" />
                                        Add Guest
                                    </button>
                            </div>
                            
                        <div className="overflow-x-auto px-2">
                                <table className="min-w-full">
                                    <thead>
                                    <tr className={`border-b ${isDarkMode ? 'border-gray-700/50' : 'border-gray-200/70'}`}>
                                            <th className={`px-6 py-3 text-left text-xs font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-600'} uppercase tracking-wider`}>Name</th>
                                            <th className={`px-6 py-3 text-left text-xs font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-600'} uppercase tracking-wider`}>Email</th>
                                            <th className={`px-6 py-3 text-left text-xs font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-600'} uppercase tracking-wider`}>Phone</th>
                                            <th className={`px-6 py-3 text-left text-xs font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-600'} uppercase tracking-wider`}>Room</th>
                                            <th className={`px-6 py-3 text-left text-xs font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-600'} uppercase tracking-wider`}>Check In</th>
                                            <th className={`px-6 py-3 text-left text-xs font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-600'} uppercase tracking-wider`}>Check Out</th>
                                            <th className={`px-6 py-3 text-left text-xs font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-600'} uppercase tracking-wider`}>Status</th>
                                            <th className={`px-6 py-3 text-left text-xs font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-600'} uppercase tracking-wider`}>Actions</th>
                                        </tr>
                                    </thead>
                                <tbody className="divide-y divide-gray-200/10">
                                    {filteredGuests.length === 0 ? (
                                        <tr>
                                            <td colSpan="8" className="px-6 py-8 text-center">
                                                <p className={`${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>No guests found matching your search</p>
                                            </td>
                                        </tr>
                                    ) : (
                                        filteredGuests.map((guest) => (
                                            <tr key={guest.id} className={`${isDarkMode ? 'hover:bg-gray-800/50' : 'hover:bg-gray-50'} transition-colors duration-150`}>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className="flex items-center">
                                                        <div className={`h-10 w-10 rounded-full bg-gradient-to-br ${
                                                            guest.status === 'Checked In' ? 'from-blue-500 to-indigo-600' :
                                                            guest.status === 'Checked Out' ? 'from-gray-500 to-gray-600' :
                                                            guest.status === 'Reserved' ? 'from-amber-500 to-yellow-600' :
                                                            'from-purple-500 to-pink-600'
                                                        } flex items-center justify-center text-white font-medium shadow-md`}>
                                                            {guest.name.split(' ').map(n => n[0]).join('')}
                                                        </div>
                                                        <div className="ml-4">
                                                            <div className={`text-sm font-medium ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>{guest.name}</div>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className={`px-6 py-4 whitespace-nowrap text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>{guest.email || '-'}</td>
                                                <td className={`px-6 py-4 whitespace-nowrap text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>{guest.phone || '-'}</td>
                                                <td className={`px-6 py-4 whitespace-nowrap text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                                                    {guest.room ? (
                                                        <span className={`px-2 py-1 rounded-full text-xs ${isDarkMode ? 'bg-blue-900/30 text-blue-300 border border-blue-700/50' : 'bg-blue-100 text-blue-800 border border-blue-200'}`}>
                                                            {guest.room_name || '—'}
                                                        </span>
                                                    ) : '-'}
                                                </td>
                                                <td className={`px-6 py-4 whitespace-nowrap text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                                                    {formatDate(guest.checkIn || guest.check_in)}
                                                </td>
                                                <td className={`px-6 py-4 whitespace-nowrap text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                                                    {formatDate(guest.checkOut || guest.check_out)}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <span className={`px-2 py-1 text-xs rounded-full border ${
                                                        guest.status === 'Checked In' 
                                                            ? isDarkMode 
                                                                ? 'bg-green-900/30 text-green-300 border-green-700/50' 
                                                                : 'bg-green-100 text-green-800 border-green-200' 
                                                            : guest.status === 'Checked Out' 
                                                                ? isDarkMode 
                                                                    ? 'bg-red-900/30 text-red-300 border-red-700/50' 
                                                                    : 'bg-red-100 text-red-800 border-red-200' 
                                                                : guest.status === 'Reserved' 
                                                                    ? isDarkMode 
                                                                        ? 'bg-amber-900/30 text-amber-300 border-amber-700/50' 
                                                                        : 'bg-amber-100 text-amber-800 border-amber-200' 
                                                                    : isDarkMode 
                                                                        ? 'bg-gray-900/30 text-gray-300 border-gray-700/50' 
                                                                        : 'bg-gray-100 text-gray-800 border-gray-200'
                                                    }`}>
                                                        {guest.status}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className="flex space-x-2">
                                                    <button 
                                                            className={`p-1.5 rounded-full ${isDarkMode ? 'bg-blue-900/30 text-blue-400 hover:text-blue-300 hover:bg-blue-800/50' : 'bg-blue-100/80 text-blue-600 hover:text-blue-700 hover:bg-blue-200/70'} transition-colors`}
                                                        onClick={() => handleViewGuest(guest.id)}
                                                        title="View"
                                                    >
                                                            <FaEye size={14} />
                                                    </button>
                                                    <button 
                                                            className={`p-1.5 rounded-full ${isDarkMode ? 'bg-green-900/30 text-green-400 hover:text-green-300 hover:bg-green-800/50' : 'bg-green-100/80 text-green-600 hover:text-green-700 hover:bg-green-200/70'} transition-colors`}
                                                        onClick={() => handleEditGuest(guest.id)}
                                                        title="Edit"
                                                    >
                                                            <FaEdit size={14} />
                                                    </button>
                                                    <button 
                                                            className={`p-1.5 rounded-full ${isDarkMode ? 'bg-red-900/30 text-red-400 hover:text-red-300 hover:bg-red-800/50' : 'bg-red-100/80 text-red-600 hover:text-red-700 hover:bg-red-200/70'} transition-colors`}
                                                        onClick={() => handleDeleteGuest(guest.id)}
                                                        title="Delete"
                                                    >
                                                            <FaTrash size={14} />
                                                    </button>
                                                    <button 
                                                            className={`p-1.5 rounded-full ${
                                                                guest.status === 'Checked Out'
                                                                    ? isDarkMode 
                                                                        ? 'bg-gray-800/50 text-gray-500 cursor-not-allowed' 
                                                                        : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                                                    : isDarkMode 
                                                                        ? 'bg-amber-900/30 text-amber-400 hover:text-amber-300 hover:bg-amber-800/50' 
                                                                        : 'bg-amber-100/80 text-amber-600 hover:text-amber-700 hover:bg-amber-200/70'
                                                            } transition-colors`}
                                                            onClick={() => guest.status !== 'Checked Out' && handleCheckOut(guest.id)}
                                                        title="Check Out"
                                                        disabled={guest.status === 'Checked Out'}
                                                    >
                                                            <FaSignOutAlt size={14} />
                                                    </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                    </tbody>
                                </table>
                        </div>
                    </Card>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <Card title="Recent Activity" className="overflow-hidden">
                            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-purple-500 to-indigo-600"></div>
                            
                            {recentActivities.length === 0 ? (
                                <div className={`text-center py-8 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                                    <p>No recent activities</p>
                                </div>
                            ) : (
                                <div className="space-y-3 px-4 py-2 max-h-96 overflow-y-auto">
                                    {recentActivities.map((activity, index) => (
                                        <div 
                                            key={index} 
                                            className={`p-3 rounded-lg border ${isDarkMode ? 'bg-gray-800/50 border-gray-700/50' : 'bg-gray-50 border-gray-200/50'} transition-all duration-200 hover:shadow-md`}
                                        >
                                            <div className="flex justify-between">
                                                <span className={`text-sm ${isDarkMode ? 'text-gray-200' : 'text-gray-700'}`}>{activity.text}</span>
                                                <span className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                                                    {formatRelativeTime(activity.timestamp)}
                                                </span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </Card>
                        
                        <Card title="Guest Preferences" className="overflow-hidden">
                            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-cyan-500 to-blue-600"></div>
                            
                            <div className="px-4 py-2 max-h-96 overflow-y-auto">
                                {filteredGuests.filter(guest => guest.preferences && guest.preferences.length > 0).length === 0 ? (
                                    <div className={`text-center py-8 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                                        <p>No guest preferences available</p>
                                    </div>
                                ) : (
                                    <div className="space-y-3">
                                {filteredGuests.filter(guest => guest.preferences && guest.preferences.length > 0).map((guest) => (
                                            <div 
                                                key={guest.id} 
                                                className={`p-4 rounded-lg border backdrop-blur-sm ${isDarkMode ? 'border-gray-700/40 bg-gray-800/50' : 'border-gray-200/60 bg-white/50'} transition-all hover:shadow-md`}
                                            >
                                        <div className="flex justify-between items-center">
                                                    <div className="flex items-center">
                                                        <div className={`h-8 w-8 rounded-full bg-gradient-to-br ${
                                                            guest.status === 'Checked In' ? 'from-blue-500 to-indigo-600' :
                                                            guest.status === 'Checked Out' ? 'from-gray-500 to-gray-600' :
                                                            guest.status === 'Reserved' ? 'from-amber-500 to-yellow-600' :
                                                            'from-purple-500 to-pink-600'
                                                        } flex items-center justify-center text-white font-medium text-xs`}>
                                                            {guest.name.split(' ').map(n => n[0]).join('')}
                                                        </div>
                                                        <div className="ml-3">
                                                            <h4 className={`font-medium text-sm ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>{guest.name}</h4>
                                                            <p className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                                                                {guest.room_name || 'Not Assigned'}
                                                            </p>
                                                        </div>
                                            </div>
                                                    <div className="flex flex-wrap justify-end gap-2 mt-2">
                                                {guest.preferences && guest.preferences.map((preference, index) => (
                                                            <span 
                                                                key={index} 
                                                                className={`px-2 py-1 text-xs rounded-full border ${
                                                                    preference.type === 'Late Check-out' || preference === 'Late Check-out'
                                                                        ? isDarkMode
                                                                            ? 'bg-blue-900/20 text-blue-300 border-blue-700/40'
                                                                            : 'bg-blue-50 text-blue-700 border-blue-200'
                                                                        : preference.type === 'Vegan Meals' || preference === 'Vegan Meals'
                                                                            ? isDarkMode
                                                                                ? 'bg-green-900/20 text-green-300 border-green-700/40'
                                                                                : 'bg-green-50 text-green-700 border-green-200'
                                                                            : preference.type === 'High Floor' || preference === 'High Floor'
                                                                                ? isDarkMode
                                                                                    ? 'bg-amber-900/20 text-amber-300 border-amber-700/40'
                                                                                    : 'bg-amber-50 text-amber-700 border-amber-200'
                                                                                : preference.type === 'No Disturbance' || preference === 'No Disturbance'
                                                                                    ? isDarkMode
                                                                                        ? 'bg-red-900/20 text-red-300 border-red-700/40'
                                                                                        : 'bg-red-50 text-red-700 border-red-200'
                                                                                    : isDarkMode
                                                                                        ? 'bg-gray-800 text-gray-300 border-gray-700'
                                                                                        : 'bg-gray-100 text-gray-700 border-gray-200'
                                                                }`}
                                                            >
                                                        {preference.type || preference}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                                    </div>
                                )}
                            </div>
                        </Card>
                    </div>
                </div>
            </div>
            
            {/* Modals */}
            <CheckInModal 
                isOpen={isCheckInModalOpen} 
                onClose={() => setIsCheckInModalOpen(false)} 
                onAddGuest={handleAddGuest}
            />
            
            {selectedGuest && (
                <>
                    <GuestViewModal 
                        isOpen={isViewModalOpen} 
                        onClose={() => setIsViewModalOpen(false)} 
                        guest={selectedGuest} 
                    />
                    
                    <GuestEditModal 
                        isOpen={isEditModalOpen} 
                        onClose={() => setIsEditModalOpen(false)} 
                        guest={selectedGuest}
                        onUpdateGuest={handleEditSubmit}
                    />
                </>
            )}
            
            <DeleteConfirmationModal 
                isOpen={isDeleteModalOpen}
                onClose={() => setIsDeleteModalOpen(false)}
                onConfirm={confirmDeleteGuest}
                title="Delete Guest"
                message={`Are you sure you want to delete ${selectedGuest?.name}? This action cannot be undone.`}
            />
        </div>
    );
};

export default GuestsPage;
