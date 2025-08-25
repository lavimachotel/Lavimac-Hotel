import React from 'react';
import { useTheme } from '../context/ThemeContext';

const GuestViewModal = ({ isOpen, onClose, guest }) => {
  const { theme } = useTheme();
  const isDarkMode = theme === 'dark';

  if (!isOpen || !guest) return null;

  // Helper function to format dates
  const formatDate = (date) => {
    if (!date) return '-';
    if (date instanceof Date) {
      return date.toLocaleDateString();
    }
    return date;
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className={`${isDarkMode ? 'bg-gray-800 text-white' : 'bg-white text-gray-800'} rounded-lg p-6 w-full max-w-md`}>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">Guest Details</h2>
          <button 
            onClick={onClose}
            className={`${isDarkMode ? 'text-gray-300 hover:text-white' : 'text-gray-600 hover:text-gray-800'} text-xl font-bold`}
          >
            ×
          </button>
        </div>
        
        <div className="mb-6 flex items-center">
          <div className={`h-16 w-16 rounded-full ${isDarkMode ? 'bg-gray-600' : 'bg-gray-300'} flex items-center justify-center ${isDarkMode ? 'text-white' : 'text-gray-800'} text-xl font-medium mr-4`}>
            {guest.name.split(' ').map(n => n[0]).join('')}
          </div>
          <div>
            <h3 className="text-lg font-semibold">{guest.name}</h3>
            <p className={`${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              <span className={`px-2 py-1 text-xs rounded ${
                guest.status === 'Checked In' ? 'bg-blue-200 text-blue-800' : 
                guest.status === 'Checked Out' ? 'bg-gray-200 text-gray-800' : 
                guest.status === 'Reserved' ? 'bg-green-200 text-green-800' : 
                'bg-yellow-200 text-yellow-800'
              }`}>
                {guest.status}
              </span>
            </p>
          </div>
        </div>
        
        <div className="space-y-3">
          <div className="grid grid-cols-3 gap-2">
            <div className={`${isDarkMode ? 'text-gray-400' : 'text-gray-600'} text-sm`}>Email:</div>
            <div className="col-span-2">{guest.email || '-'}</div>
          </div>
          
          <div className="grid grid-cols-3 gap-2">
            <div className={`${isDarkMode ? 'text-gray-400' : 'text-gray-600'} text-sm`}>Phone:</div>
            <div className="col-span-2">{guest.phone || '-'}</div>
          </div>
          
          <div className="grid grid-cols-3 gap-2">
            <div className={`${isDarkMode ? 'text-gray-400' : 'text-gray-600'} text-sm`}>Room:</div>
            <div className="col-span-2">{guest.room_name || '-'}</div>
          </div>
          
          <div className="grid grid-cols-3 gap-2">
            <div className={`${isDarkMode ? 'text-gray-400' : 'text-gray-600'} text-sm`}>Check In:</div>
            <div className="col-span-2">{formatDate(guest.checkIn)}</div>
          </div>
          
          <div className="grid grid-cols-3 gap-2">
            <div className={`${isDarkMode ? 'text-gray-400' : 'text-gray-600'} text-sm`}>Check Out:</div>
            <div className="col-span-2">{formatDate(guest.checkOut)}</div>
          </div>
          
          {guest.notes && (
            <div className="mt-4">
              <div className={`${isDarkMode ? 'text-gray-400' : 'text-gray-600'} text-sm mb-1`}>Notes:</div>
              <div className={`${isDarkMode ? 'bg-gray-700' : 'bg-gray-100'} p-3 rounded`}>{guest.notes}</div>
            </div>
          )}
        </div>
        
        <div className="mt-6 flex justify-end">
          <button 
            onClick={onClose}
            className={`px-4 py-2 rounded ${isDarkMode ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-200 hover:bg-gray-300'}`}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default GuestViewModal; 