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

const GuestsPage = () => {
    const { guestList, addGuestToList, viewGuest, editGuest, deleteGuest } = useGuests();
    const { theme } = useTheme();
    const isDarkMode = theme === 'dark';
    const [isCheckInModalOpen, setIsCheckInModalOpen] = useState(false);
    const [isViewModalOpen, setIsViewModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [selectedGuest, setSelectedGuest] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [recentActivities, setRecentActivities] = useState([]);

    // Load recent activities from localStorage
    useEffect(() => {
        const loadRecentActivities = () => {
            try {
                const activitiesStr = localStorage.getItem('hotelRecentActivities');
                if (activitiesStr) {
                    const activities = JSON.parse(activitiesStr);
                    setRecentActivities(activities);
                } else {
                    // If no activities exist yet, generate some based on guest list
                    if (guestList && guestList.length > 0) {
                        const generatedActivities = guestList.map(guest => ({
                            text: `${guest.name} is in the guest list.`,
                            timestamp: guest.created_at || new Date().toISOString()
                        }));
                        
                        localStorage.setItem('hotelRecentActivities', JSON.stringify(generatedActivities));
                        setRecentActivities(generatedActivities);
                    }
                }
            } catch (err) {
                console.error('Error loading recent activities:', err);
            }
        };
        
        loadRecentActivities();
        
        // Set up a polling interval to check for new activities every 10 seconds
        const interval = setInterval(loadRecentActivities, 10000);
        
        return () => clearInterval(interval);
    }, [guestList]);

    // Add a new activity - can be called from UI actions
    const addActivity = (activity) => {
        try {
            const newActivity = {
                text: activity,
                timestamp: new Date().toISOString()
            };
            
            // Update localStorage
            const activitiesStr = localStorage.getItem('hotelRecentActivities');
            const activities = activitiesStr ? JSON.parse(activitiesStr) : [];
            activities.unshift(newActivity);
            
            // Keep only the 20 most recent
            const updatedActivities = activities.slice(0, 20);
            localStorage.setItem('hotelRecentActivities', JSON.stringify(updatedActivities));
            
            // Update state
            setRecentActivities(updatedActivities);
        } catch (err) {
            console.error('Error adding activity:', err);
        }
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

    const handleEditGuest = (guestId) => {
        const guest = guestList.find(g => g.id === guestId);
        setSelectedGuest(guest);
        setIsEditModalOpen(true);
    };

    const handleDeleteGuest = (guestId) => {
        const guest = guestList.find(g => g.id === guestId);
        setSelectedGuest(guest);
        setIsDeleteModalOpen(true);
    };

    const confirmDeleteGuest = () => {
        if (selectedGuest) {
            deleteGuest(selectedGuest.id);
            setIsDeleteModalOpen(false);
            setSelectedGuest(null);
        }
    };

    const handleCheckIn = (guestId) => {
        const guest = guestList.find(g => g.id === guestId);
        if (guest) {
            addActivity(`${guest.name} checked into Room ${guest.room}`);
            setIsCheckInModalOpen(false);
        }
    };

    const handleCheckOut = (guestId) => {
        const guest = guestList.find(g => g.id === guestId);
        if (guest) {
            addActivity(`${guest.name} checked out from Room ${guest.room}`);
            setIsCheckInModalOpen(false);
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
            return dateObj.toLocaleDateString('en-US', {
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
        <div className={`flex h-screen ${isDarkMode ? 'bg-black text-white' : 'bg-white text-gray-800'}`}>
            <Sidebar activeLink="Guests" />
            <div className="flex-1 overflow-auto">
                <Navbar title="Guest Management" />
                
                <div className="p-6">
                    <div className="grid grid-cols-1 gap-6 mb-6">
                        <div className={`${isDarkMode ? 'bg-gray-800' : 'bg-gray-100'} p-6 rounded-lg shadow-sm`}>
                            <div className="flex justify-between items-center mb-4">
                                <h3 className={`text-lg font-semibold ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>Guest Directory</h3>
                                <div className="flex space-x-2">
                                    <div className="relative">
                                        <input 
                                            type="text" 
                                            placeholder="Search guests..." 
                                            className={`px-4 py-2 rounded ${
                                                isDarkMode 
                                                    ? 'bg-gray-700 border-gray-600 text-white focus:ring-blue-500' 
                                                    : 'bg-white border-gray-300 text-gray-800 focus:ring-blue-400'
                                            } border focus:outline-none focus:ring-2`}
                                            value={searchTerm}
                                            onChange={(e) => setSearchTerm(e.target.value)}
                                        />
                                        {searchTerm && (
                                            <button 
                                                className={`absolute right-3 top-1/2 transform -translate-y-1/2 ${isDarkMode ? 'text-gray-400 hover:text-white' : 'text-gray-500 hover:text-gray-700'}`}
                                                onClick={() => setSearchTerm('')}
                                            >
                                                ×
                                            </button>
                                        )}
                                    </div>
                                    <button 
                                        className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600"
                                        onClick={() => setIsCheckInModalOpen(true)}
                                    >
                                        Add Guest
                                    </button>
                                </div>
                            </div>
                            
                            <div className="overflow-x-auto">
                                <table className="min-w-full">
                                    <thead>
                                        <tr className={`${isDarkMode ? 'bg-gray-700' : 'bg-gray-200'}`}>
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
                                    <tbody className={`${isDarkMode ? 'bg-gray-800 divide-y divide-gray-700' : 'bg-white divide-y divide-gray-200'}`}>
                                        {filteredGuests.map((guest) => (
                                            <tr key={guest.id}>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className="flex items-center">
                                                        <div className={`h-10 w-10 rounded-full ${isDarkMode ? 'bg-gray-600' : 'bg-gray-300'} flex items-center justify-center ${isDarkMode ? 'text-white' : 'text-gray-800'} font-medium`}>
                                                            {guest.name.split(' ').map(n => n[0]).join('')}
                                                        </div>
                                                        <div className="ml-4">
                                                            <div className={`text-sm font-medium ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>{guest.name}</div>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className={`px-6 py-4 whitespace-nowrap ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>{guest.email || '-'}</td>
                                                <td className={`px-6 py-4 whitespace-nowrap ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>{guest.phone || '-'}</td>
                                                <td className={`px-6 py-4 whitespace-nowrap ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>{guest.room || '-'}</td>
                                                <td className={`px-6 py-4 whitespace-nowrap ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>{formatDate(guest.checkIn)}</td>
                                                <td className={`px-6 py-4 whitespace-nowrap ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>{formatDate(guest.checkOut)}</td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <span className={`px-2 py-1 text-xs rounded ${
                                                        guest.status === 'Checked In' ? 'bg-blue-200 text-blue-800' : 
                                                        guest.status === 'Checked Out' ? 'bg-gray-200 text-gray-800' : 
                                                        guest.status === 'Reserved' ? 'bg-green-200 text-green-800' : 
                                                        'bg-yellow-200 text-yellow-800'
                                                    }`}>
                                                        {guest.status}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm">
                                                    <button 
                                                        className="text-blue-400 hover:text-blue-300 mr-3"
                                                        onClick={() => handleViewGuest(guest.id)}
                                                    >
                                                        View
                                                    </button>
                                                    <button 
                                                        className="text-green-400 hover:text-green-300 mr-3"
                                                        onClick={() => handleEditGuest(guest.id)}
                                                    >
                                                        Edit
                                                    </button>
                                                    <button 
                                                        className="text-red-400 hover:text-red-300"
                                                        onClick={() => handleDeleteGuest(guest.id)}
                                                    >
                                                        Delete
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className={`${isDarkMode ? 'bg-gray-800' : 'bg-gray-100'} p-6 rounded-lg shadow-sm`}>
                            <h3 className={`text-lg font-semibold ${isDarkMode ? 'text-white' : 'text-gray-800'} mb-4`}>Recent Activity</h3>
                            {recentActivities.length === 0 ? (
                                <p className={`text-center py-4 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                                    No recent activities
                                </p>
                            ) : (
                                <div className="space-y-4">
                                    {recentActivities.map((activity, index) => (
                                        <div key={index} className={`p-3 rounded-lg ${isDarkMode ? 'bg-gray-700' : 'bg-gray-200'}`}>
                                            <div className="flex justify-between">
                                                <span className={`${isDarkMode ? 'text-white' : 'text-gray-800'}`}>{activity.text}</span>
                                                <span className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                                                    {formatRelativeTime(activity.timestamp)}
                                                </span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                        
                        <div className={`${isDarkMode ? 'bg-gray-800' : 'bg-gray-100'} p-6 rounded-lg shadow-sm`}>
                            <h3 className={`text-lg font-semibold ${isDarkMode ? 'text-white' : 'text-gray-800'} mb-4`}>Guest Preferences</h3>
                            <div className="space-y-4">
                                {filteredGuests.filter(guest => guest.preferences && guest.preferences.length > 0).map((guest) => (
                                    <div key={guest.id} className={`${isDarkMode ? 'bg-gray-700' : 'bg-gray-200'} p-4 rounded-lg`}>
                                        <div className="flex justify-between items-center">
                                            <div>
                                                <h4 className={`font-medium ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>{guest.name}</h4>
                                                <p className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>Room {guest.room || 'Not Assigned'}</p>
                                            </div>
                                            <div className="flex flex-wrap justify-end gap-2">
                                                {guest.preferences && guest.preferences.map((preference, index) => (
                                                    <span key={index} className={`px-2 py-1 text-xs rounded ${
                                                        preference.type === 'Late Check-out' ? 'bg-blue-100 text-blue-800' : 
                                                        preference.type === 'Vegan Meals' ? 'bg-green-100 text-green-800' : 
                                                        preference.type === 'High Floor' ? 'bg-yellow-100 text-yellow-800' : 
                                                        preference.type === 'No Disturbance' ? 'bg-red-100 text-red-800' : 
                                                        'bg-gray-100 text-gray-800'
                                                    }`}>
                                                        {preference.type || preference}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                ))}

                                {filteredGuests.filter(guest => !guest.preferences || guest.preferences.length === 0).length === filteredGuests.length && (
                                    <p className={`text-center py-4 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                                        No guest preferences available
                                    </p>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            
            {/* Modals */}
            <CheckInModal 
                isOpen={isCheckInModalOpen} 
                onClose={() => setIsCheckInModalOpen(false)} 
                onAddGuest={addGuestToList}
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
                        onUpdateGuest={(guestId, updatedData) => {
                            editGuest(guestId, updatedData);
                            setIsEditModalOpen(false);
                        }}
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
