import React from 'react';
import { format } from 'date-fns';
import { useTheme } from '../context/ThemeContext';

const ReservationViewModal = ({ isOpen, onClose, reservation }) => {
  const { theme } = useTheme();
  const isDarkMode = theme === 'dark';

  if (!isOpen || !reservation) return null;

  // Format date for display
  const formatDateDisplay = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      return format(new Date(dateString), 'MMM dd, yyyy');
    } catch (error) {
      console.error("Error formatting date:", error);
      return dateString;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className={`relative w-full max-w-2xl mx-auto rounded-lg shadow-xl ${isDarkMode ? 'bg-gray-800 text-white' : 'bg-white text-gray-800'}`}>
        {/* Header */}
        <div className={`flex justify-between items-center p-4 border-b ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`}>
          <h2 className="text-xl font-semibold">Reservation Details</h2>
          <button 
            onClick={onClose}
            className={`${isDarkMode ? 'text-gray-400 hover:text-gray-200' : 'text-gray-600 hover:text-gray-800'} text-xl font-bold`}
          >
            ×
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <h3 className={`font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>Guest Information</h3>
              <div className="mt-2 space-y-2">
                <p><span className="font-medium">Name:</span> {reservation.guestName}</p>
                <p><span className="font-medium">Email:</span> {reservation.email}</p>
                <p><span className="font-medium">Phone:</span> {reservation.phoneNumber}</p>
              </div>
            </div>
            <div>
              <h3 className={`font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>Reservation Details</h3>
              <div className="mt-2 space-y-2">
                <p><span className="font-medium">Room:</span> {reservation.room_name || reservation.roomName || `Room ${reservation.roomNumber || reservation.room_number || reservation.room_id}`}</p>
                <p><span className="font-medium">Room Type:</span> {reservation.roomType}</p>
                <p>
                  <span className="font-medium">Status:</span>
                  <span className={`ml-2 px-2 py-0.5 text-xs rounded-full ${
                    reservation.status === 'Confirmed' ? 'bg-green-100 text-green-800' :
                    reservation.status === 'Checked In' ? 'bg-blue-100 text-blue-800' :
                    reservation.status === 'Checked Out' ? 'bg-gray-100 text-gray-800' :
                    reservation.status === 'Cancelled' ? 'bg-red-100 text-red-800' :
                    'bg-yellow-100 text-yellow-800'
                  }`}>
                    {reservation.status}
                  </span>
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <h3 className={`font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>Stay Information</h3>
              <div className="mt-2 space-y-2">
                <p><span className="font-medium">Check-in:</span> {formatDateDisplay(reservation.checkInDate)}</p>
                <p><span className="font-medium">Check-out:</span> {formatDateDisplay(reservation.checkOutDate)}</p>
                <p><span className="font-medium">Guests:</span> {reservation.adults} Adults, {reservation.children} Children</p>
              </div>
            </div>
            <div>
              <h3 className={`font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>Payment Information</h3>
              <div className="mt-2 space-y-2">
                <p><span className="font-medium">Payment Method:</span> {reservation.paymentMethod}</p>
                {reservation.paymentStatus && (
                  <p><span className="font-medium">Payment Status:</span> {reservation.paymentStatus}</p>
                )}
              </div>
            </div>
          </div>

          {reservation.specialRequests && (
            <div className="mb-4">
              <h3 className={`font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>Special Requests</h3>
              <p className="mt-2 p-3 rounded bg-opacity-50 ${isDarkMode ? 'bg-gray-700' : 'bg-gray-100'}">
                {reservation.specialRequests}
              </p>
            </div>
          )}

          <div className="flex justify-end mt-6">
            <button
              onClick={onClose}
              className={`px-4 py-2 rounded ${isDarkMode ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-200 hover:bg-gray-300'}`}
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReservationViewModal; 