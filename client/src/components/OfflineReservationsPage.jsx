import React, { useEffect, useState } from 'react';
import OfflineSidebar from './OfflineSidebar';
import OfflineNavbar from './OfflineNavbar';
import { useTheme } from '../context/ThemeContext';
import { useOfflineReservation } from '../context/OfflineReservationContext';
import { useOfflineRoomReservation } from '../context/OfflineRoomReservationContext';
import { FaCalendarCheck, FaPlus, FaEye, FaEdit, FaTrash, FaCalendar, FaUser, FaBed, FaClock } from 'react-icons/fa';
import { toast } from 'react-hot-toast';
import Card from './ui/Card';
import '../styles/Reservations.css';

const OfflineReservationsPage = () => {
  const { theme } = useTheme();
  const isDarkMode = theme === 'dark';
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedReservation, setSelectedReservation] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  
  const { reservations, loading, createReservation, updateReservation, deleteReservation } = useOfflineReservation();
  const { getRooms } = useOfflineRoomReservation();
  const [rooms, setRooms] = useState([]);

  // Load rooms when component mounts
  useEffect(() => {
    const loadRooms = async () => {
      try {
        const roomsData = await getRooms();
        setRooms(roomsData || []);
      } catch (error) {
        console.error('Error loading rooms:', error);
      }
    };
    loadRooms();
  }, [getRooms]);

  // Helper function to format dates
  const formatDate = (date) => {
    if (!date) return '-';
    
    try {
      let dateObj;
      if (date instanceof Date) {
        dateObj = date;
      } else if (typeof date === 'string') {
        dateObj = new Date(date);
      } else {
        return '-';
      }
      
      if (isNaN(dateObj.getTime())) {
        return '-';
      }
      
      return dateObj.toLocaleDateString('en-GB', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch (error) {
      console.error('Error formatting date:', error);
      return '-';
    }
  };

  // Helper function to get room name by ID
  const getRoomNameById = (roomId) => {
    const room = rooms.find(r => r.id === roomId);
    return room ? room.name : `Room ${roomId}`;
  };

  // Filter reservations based on search term and status
  const filteredReservations = reservations ? reservations.filter(reservation => {
    const matchesSearch = !searchTerm || 
      reservation.guestName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      reservation.guestEmail?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      getRoomNameById(reservation.roomId)?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || reservation.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  }) : [];

  // Stats calculations
  const totalReservations = filteredReservations.length;
  const confirmedReservations = filteredReservations.filter(r => r.status === 'confirmed').length;
  const checkedInReservations = filteredReservations.filter(r => r.status === 'checked_in').length;
  const cancelledReservations = filteredReservations.filter(r => r.status === 'cancelled').length;

  // Handle add reservation
  const handleAddReservation = async (reservationData) => {
    try {
      await createReservation(reservationData);
      setIsModalOpen(false);
      toast.success('Reservation created successfully');
    } catch (error) {
      console.error('Error creating reservation:', error);
      toast.error('Failed to create reservation');
    }
  };

  // Handle view reservation
  const handleViewReservation = (reservation) => {
    setSelectedReservation(reservation);
    setIsViewModalOpen(true);
  };

  // Handle edit reservation
  const handleEditReservation = (reservation) => {
    setSelectedReservation(reservation);
    setIsEditModalOpen(true);
  };

  // Handle edit submission
  const handleEditSubmit = async (reservationId, updatedData) => {
    try {
      await updateReservation(reservationId, updatedData);
      setIsEditModalOpen(false);
      setSelectedReservation(null);
      toast.success('Reservation updated successfully');
    } catch (error) {
      console.error('Error updating reservation:', error);
      toast.error('Failed to update reservation');
    }
  };

  // Handle delete reservation
  const handleDeleteReservation = (reservation) => {
    setSelectedReservation(reservation);
    setIsDeleteModalOpen(true);
  };

  // Confirm delete reservation
  const confirmDeleteReservation = async () => {
    if (selectedReservation) {
      try {
        await deleteReservation(selectedReservation.id);
        setIsDeleteModalOpen(false);
        setSelectedReservation(null);
        toast.success('Reservation deleted successfully');
      } catch (error) {
        console.error('Error deleting reservation:', error);
        toast.error('Failed to delete reservation');
      }
    }
  };

  // Get status color
  const getStatusColor = (status) => {
    switch (status) {
      case 'confirmed':
        return isDarkMode ? 'bg-blue-900/30 text-blue-300 border-blue-700/50' : 'bg-blue-100 text-blue-800 border-blue-200';
      case 'checked_in':
        return isDarkMode ? 'bg-green-900/30 text-green-300 border-green-700/50' : 'bg-green-100 text-green-800 border-green-200';
      case 'checked_out':
        return isDarkMode ? 'bg-gray-900/30 text-gray-300 border-gray-700/50' : 'bg-gray-100 text-gray-800 border-gray-200';
      case 'cancelled':
        return isDarkMode ? 'bg-red-900/30 text-red-300 border-red-700/50' : 'bg-red-100 text-red-800 border-red-200';
      default:
        return isDarkMode ? 'bg-gray-900/30 text-gray-300 border-gray-700/50' : 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  if (loading) {
    return (
      <div className={`flex h-screen ${isDarkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
        <OfflineSidebar activeLink="Reservations" />
        <div className="flex-1 overflow-auto">
          <OfflineNavbar title="Reservations Management" />
          <div className="p-6 flex items-center justify-center">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500 mx-auto mb-4"></div>
              <p className={`${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>Loading reservations...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`reservations-container ${isDarkMode ? 'dark-mode' : 'light-mode'}`}>  
      <OfflineSidebar activeLink="Reservations" />
      
      <div className="flex-1 overflow-auto">
        <OfflineNavbar title="Reservations Management" />
        
        <div className="p-6 space-y-6">
          {/* Stats cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card className="text-center overflow-hidden relative">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 to-indigo-600"></div>
              <div className="flex items-center justify-center">
                <div className={`flex items-center justify-center w-12 h-12 rounded-full ${isDarkMode ? 'bg-blue-900/30' : 'bg-blue-100'} mb-3`}>
                  <FaCalendarCheck className={`${isDarkMode ? 'text-blue-400' : 'text-blue-600'} text-xl`} />
                </div>
              </div>
              <p className={`text-3xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>{totalReservations}</p>
              <p className={`text-xs uppercase tracking-wider ${isDarkMode ? 'text-gray-400' : 'text-gray-500'} mt-1`}>Total Reservations</p>
            </Card>
            
            <Card className="text-center overflow-hidden relative">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-green-500 to-emerald-600"></div>
              <div className="flex items-center justify-center">
                <div className={`flex items-center justify-center w-12 h-12 rounded-full ${isDarkMode ? 'bg-green-900/30' : 'bg-green-100'} mb-3`}>
                  <FaCalendar className={`${isDarkMode ? 'text-green-400' : 'text-green-600'} text-xl`} />
                </div>
              </div>
              <p className={`text-3xl font-bold ${isDarkMode ? 'text-green-400' : 'text-green-600'}`}>{confirmedReservations}</p>
              <p className={`text-xs uppercase tracking-wider ${isDarkMode ? 'text-gray-400' : 'text-gray-500'} mt-1`}>Confirmed</p>
            </Card>
            
            <Card className="text-center overflow-hidden relative">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 to-cyan-600"></div>
              <div className="flex items-center justify-center">
                <div className={`flex items-center justify-center w-12 h-12 rounded-full ${isDarkMode ? 'bg-blue-900/30' : 'bg-blue-100'} mb-3`}>
                  <FaBed className={`${isDarkMode ? 'text-blue-400' : 'text-blue-600'} text-xl`} />
                </div>
              </div>
              <p className={`text-3xl font-bold ${isDarkMode ? 'text-blue-400' : 'text-blue-600'}`}>{checkedInReservations}</p>
              <p className={`text-xs uppercase tracking-wider ${isDarkMode ? 'text-gray-400' : 'text-gray-500'} mt-1`}>Checked In</p>
            </Card>
            
            <Card className="text-center overflow-hidden relative">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-red-500 to-pink-600"></div>
              <div className="flex items-center justify-center">
                <div className={`flex items-center justify-center w-12 h-12 rounded-full ${isDarkMode ? 'bg-red-900/30' : 'bg-red-100'} mb-3`}>
                  <FaClock className={`${isDarkMode ? 'text-red-400' : 'text-red-600'} text-xl`} />
                </div>
              </div>
              <p className={`text-3xl font-bold ${isDarkMode ? 'text-red-400' : 'text-red-600'}`}>{cancelledReservations}</p>
              <p className={`text-xs uppercase tracking-wider ${isDarkMode ? 'text-gray-400' : 'text-gray-500'} mt-1`}>Cancelled</p>
            </Card>
          </div>

          {/* Reservations table */}
          <Card title="Reservations" className="overflow-hidden">
            <div className="flex justify-between items-center mb-6 px-6 pt-2 space-x-4">
              {/* Search input */}
              <div className={`flex-1 max-w-md px-3 py-2 rounded-full ${isDarkMode ? 'bg-gray-800/70 text-gray-300 border-gray-700/50' : 'bg-gray-100/80 text-gray-600 border-gray-200/50'} border flex items-center`}>
                <FaCalendar className="text-gray-400 mr-2" />
                <input 
                  type="text" 
                  placeholder="Search by guest name, email or room..." 
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
              
              {/* Status filter */}
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className={`px-3 py-2 rounded-lg border ${isDarkMode ? 'bg-gray-800 text-gray-300 border-gray-700' : 'bg-white text-gray-700 border-gray-300'}`}
              >
                <option value="all">All Status</option>
                <option value="confirmed">Confirmed</option>
                <option value="checked_in">Checked In</option>
                <option value="checked_out">Checked Out</option>
                <option value="cancelled">Cancelled</option>
              </select>
              
              {/* Add reservation button */}
              <button 
                className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-4 py-2 rounded-lg shadow-md hover:shadow-lg transform hover:scale-105 transition-all duration-200 flex items-center"
                onClick={() => setIsModalOpen(true)}
              >
                <FaPlus className="mr-2" />
                New Reservation
              </button>
            </div>
            
            <div className="overflow-x-auto px-2">
              <table className="min-w-full">
                <thead>
                  <tr className={`border-b ${isDarkMode ? 'border-gray-700/50' : 'border-gray-200/70'}`}>
                    <th className={`px-6 py-3 text-left text-xs font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-600'} uppercase tracking-wider`}>Guest</th>
                    <th className={`px-6 py-3 text-left text-xs font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-600'} uppercase tracking-wider`}>Room</th>
                    <th className={`px-6 py-3 text-left text-xs font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-600'} uppercase tracking-wider`}>Check In</th>
                    <th className={`px-6 py-3 text-left text-xs font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-600'} uppercase tracking-wider`}>Check Out</th>
                    <th className={`px-6 py-3 text-left text-xs font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-600'} uppercase tracking-wider`}>Status</th>
                    <th className={`px-6 py-3 text-left text-xs font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-600'} uppercase tracking-wider`}>Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200/10">
                  {filteredReservations.length === 0 ? (
                    <tr>
                      <td colSpan="6" className="px-6 py-8 text-center">
                        <p className={`${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                          {searchTerm || statusFilter !== 'all' ? 'No reservations found matching your criteria' : 'No reservations available'}
                        </p>
                      </td>
                    </tr>
                  ) : (
                    filteredReservations.map((reservation) => (
                      <tr key={reservation.id} className={`${isDarkMode ? 'hover:bg-gray-800/50' : 'hover:bg-gray-50'} transition-colors duration-150`}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className={`h-10 w-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-medium shadow-md`}>
                              {reservation.guestName ? reservation.guestName.split(' ').map(n => n[0]).join('') : 'G'}
                            </div>
                            <div className="ml-4">
                              <div className={`text-sm font-medium ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>{reservation.guestName || 'Unknown'}</div>
                              <div className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>{reservation.guestEmail || 'No email'}</div>
                            </div>
                          </div>
                        </td>
                        <td className={`px-6 py-4 whitespace-nowrap text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                          <span className={`px-2 py-1 rounded-full text-xs ${isDarkMode ? 'bg-blue-900/30 text-blue-300 border border-blue-700/50' : 'bg-blue-100 text-blue-800 border border-blue-200'}`}>
                            {getRoomNameById(reservation.roomId)}
                          </span>
                        </td>
                        <td className={`px-6 py-4 whitespace-nowrap text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                          {formatDate(reservation.checkInDate)}
                        </td>
                        <td className={`px-6 py-4 whitespace-nowrap text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                          {formatDate(reservation.checkOutDate)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 py-1 text-xs rounded-full border ${getStatusColor(reservation.status)}`}>
                            {reservation.status ? reservation.status.replace('_', ' ').toUpperCase() : 'UNKNOWN'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex space-x-2">
                            <button 
                              className={`p-1.5 rounded-full ${isDarkMode ? 'bg-blue-900/30 text-blue-400 hover:text-blue-300 hover:bg-blue-800/50' : 'bg-blue-100/80 text-blue-600 hover:text-blue-700 hover:bg-blue-200/70'} transition-colors`}
                              onClick={() => handleViewReservation(reservation)}
                              title="View"
                            >
                              <FaEye size={14} />
                            </button>
                            <button 
                              className={`p-1.5 rounded-full ${isDarkMode ? 'bg-green-900/30 text-green-400 hover:text-green-300 hover:bg-green-800/50' : 'bg-green-100/80 text-green-600 hover:text-green-700 hover:bg-green-200/70'} transition-colors`}
                              onClick={() => handleEditReservation(reservation)}
                              title="Edit"
                            >
                              <FaEdit size={14} />
                            </button>
                            <button 
                              className={`p-1.5 rounded-full ${isDarkMode ? 'bg-red-900/30 text-red-400 hover:text-red-300 hover:bg-red-800/50' : 'bg-red-100/80 text-red-600 hover:text-red-700 hover:bg-red-200/70'} transition-colors`}
                              onClick={() => handleDeleteReservation(reservation)}
                              title="Delete"
                            >
                              <FaTrash size={14} />
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
        </div>
      </div>
      
      {/* Simple modals for now - will be enhanced later */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className={`${isDarkMode ? 'bg-gray-800' : 'bg-white'} rounded-lg p-6 max-w-md w-full`}>
            <h3 className={`text-lg font-bold mb-4 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>New Reservation</h3>
            <p className={`${isDarkMode ? 'text-gray-300' : 'text-gray-600'} mb-4`}>
              Full reservation form will be implemented in the next phase.
            </p>
            <div className="flex justify-end space-x-2">
              <button
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
      
      {isViewModalOpen && selectedReservation && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className={`${isDarkMode ? 'bg-gray-800' : 'bg-white'} rounded-lg p-6 max-w-md w-full max-h-96 overflow-y-auto`}>
            <h3 className={`text-lg font-bold mb-4 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Reservation Details</h3>
            <div className="space-y-2">
              <p><strong>Guest:</strong> {selectedReservation.guestName}</p>
              <p><strong>Email:</strong> {selectedReservation.guestEmail || 'N/A'}</p>
              <p><strong>Room:</strong> {getRoomNameById(selectedReservation.roomId)}</p>
              <p><strong>Check In:</strong> {formatDate(selectedReservation.checkInDate)}</p>
              <p><strong>Check Out:</strong> {formatDate(selectedReservation.checkOutDate)}</p>
              <p><strong>Status:</strong> {selectedReservation.status?.replace('_', ' ')}</p>
            </div>
            <div className="flex justify-end mt-4">
              <button
                onClick={() => setIsViewModalOpen(false)}
                className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
      
      {isEditModalOpen && selectedReservation && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className={`${isDarkMode ? 'bg-gray-800' : 'bg-white'} rounded-lg p-6 max-w-md w-full`}>
            <h3 className={`text-lg font-bold mb-4 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Edit Reservation</h3>
            <p className={`${isDarkMode ? 'text-gray-300' : 'text-gray-600'} mb-4`}>
              Full edit functionality will be implemented in the next phase.
            </p>
            <div className="flex justify-end space-x-2">
              <button
                onClick={() => setIsEditModalOpen(false)}
                className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
      
      {isDeleteModalOpen && selectedReservation && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className={`${isDarkMode ? 'bg-gray-800' : 'bg-white'} rounded-lg p-6 max-w-md w-full`}>
            <h3 className={`text-lg font-bold mb-4 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Delete Reservation</h3>
            <p className={`${isDarkMode ? 'text-gray-300' : 'text-gray-600'} mb-4`}>
              Are you sure you want to delete this reservation for {selectedReservation.guestName}? This action cannot be undone.
            </p>
            <div className="flex justify-end space-x-2">
              <button
                onClick={() => setIsDeleteModalOpen(false)}
                className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
              >
                Cancel
              </button>
              <button
                onClick={confirmDeleteReservation}
                className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default React.memo(OfflineReservationsPage); 