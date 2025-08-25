import React, { useState } from 'react';
import { useTheme } from '../context/ThemeContext';

const OfflineCheckInModal = ({ isOpen, onClose, onCheckIn, roomId }) => {
  const { theme } = useTheme();
  const isDarkMode = theme === 'dark';
  const [guestName, setGuestName] = useState('');
  const [checkInDate, setCheckInDate] = useState(new Date().toISOString().split('T')[0]);
  
  // Calculate default checkout date (1 day from check-in by default)
  const defaultCheckOut = new Date();
  defaultCheckOut.setDate(defaultCheckOut.getDate() + 1);
  const [checkOutDate, setCheckOutDate] = useState(defaultCheckOut.toISOString().split('T')[0]);
  
  if (!isOpen) return null;
  
  const handleSubmit = (e) => {
    e.preventDefault();
    onCheckIn(roomId, guestName, checkInDate, checkOutDate);
    onClose();
    // Reset form
    setGuestName('');
    setCheckInDate(new Date().toISOString().split('T')[0]);
    setCheckOutDate(defaultCheckOut.toISOString().split('T')[0]);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className={`${isDarkMode ? 'bg-gray-800 text-white' : 'bg-white text-gray-800'} rounded-lg p-6 w-full max-w-md shadow-xl`}>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">Check In - Room {roomId}</h2>
          <div className={`px-2 py-1 text-xs rounded ${isDarkMode ? 'bg-green-800 text-green-200' : 'bg-green-100 text-green-800'}`}>
            OFFLINE
          </div>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block mb-2 text-sm font-medium">Guest Name</label>
            <input 
              type="text" 
              value={guestName} 
              onChange={(e) => setGuestName(e.target.value)} 
              className={`w-full p-3 rounded border ${isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'} focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
              placeholder="Enter guest name"
              required
            />
          </div>
          <div className="mb-4">
            <label className="block mb-2 text-sm font-medium">Check-in Date</label>
            <input 
              type="date" 
              value={checkInDate} 
              onChange={(e) => setCheckInDate(e.target.value)} 
              className={`w-full p-3 rounded border ${isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'} focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
              required
            />
          </div>
          <div className="mb-6">
            <label className="block mb-2 text-sm font-medium">Check-out Date</label>
            <input 
              type="date" 
              value={checkOutDate} 
              onChange={(e) => setCheckOutDate(e.target.value)} 
              className={`w-full p-3 rounded border ${isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'} focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
              required
            />
          </div>
          <div className="flex justify-end space-x-3">
            <button 
              type="button" 
              onClick={onClose}
              className={`px-4 py-2 rounded transition-colors ${isDarkMode ? 'bg-gray-700 hover:bg-gray-600 text-gray-300' : 'bg-gray-200 hover:bg-gray-300 text-gray-700'}`}
            >
              Cancel
            </button>
            <button 
              type="submit" 
              className="px-4 py-2 rounded bg-blue-500 text-white hover:bg-blue-600 transition-colors"
            >
              Check In
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default OfflineCheckInModal; 